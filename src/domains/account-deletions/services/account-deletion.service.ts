import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { DataSource, EntityManager, In, Not } from "typeorm";
import { announceSessionsEnded } from "../../../shared/utils/session-events.util";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { MercadoPagoService } from "../../../infrastructure/payments/services/mercado-pago.service";
import { AssistantAction } from "../../assistant/entities/assistant-action.entity";
import { AssistantChat } from "../../assistant/entities/assistant-chat.entity";
import { AssistantMessage } from "../../assistant/entities/assistant-message.entity";
import {
  CreditTransaction,
  CreditTransactionKind,
} from "../../credits/entities/credit-transaction.entity";
import { CreditPurchase } from "../../credits/entities/credit-purchase.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { DailyBriefing } from "../../daily-briefings/entities/daily-briefing.entity";
import { Deal } from "../../deals/entities/deal.entity";
import { PropertyDocumentLookup } from "../../document-lookups/entities/property-document-lookup.entity";
import { PropertyLegalProfile } from "../../document-lookups/entities/property-legal-profile.entity";
import { Document } from "../../documents/entities/document.entity";
import { Conversation } from "../../inbox/entities/conversation.entity";
import { Message } from "../../inbox/entities/message.entity";
import { WhatsappConnection } from "../../inbox/entities/whatsapp-connection.entity";
import { WhatsappConnectionService } from "../../inbox/services/whatsapp-connection.service";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { PropertyContact } from "../../properties/entities/property-contact.entity";
import { PropertyMedia } from "../../properties/entities/property-media.entity";
import { Property } from "../../properties/entities/property.entity";
import { ListingShortcut } from "../../property-hunts/entities/listing-shortcut.entity";
import { PropertyHunt } from "../../property-hunts/entities/property-hunt.entity";
import { PropertyMatch } from "../../property-hunts/entities/property-match.entity";
import { SubscriptionPayment } from "../../subscriptions/entities/subscription-payment.entity";
import { Subscription } from "../../subscriptions/entities/subscription.entity";
import { SubscriptionService } from "../../subscriptions/services/subscription.service";
import { User } from "../../users/entities/user.entity";
import { Visit } from "../../visits/entities/visit.entity";
import {
  ANONYMOUS_NAME,
  anonymousEmail,
  deletedGoogleIdOf,
} from "../helpers/deleted-account.helper";
import { ACCOUNT_DELETION_CONFIRMATION } from "../dtos/account-deletion.dto";
import {
  AccountDeletionReason,
  accountDeletedMail,
} from "../mails/account-deletion.mails";

/**
 * Everything the broker registered about other people. It is erased for
 * good: anonymizing only the broker would still leave customers, owners and
 * signers identifiable. Children first, the foreign keys cascade the rest.
 */
const THIRD_PARTY_ENTITIES = [
  Message,
  Conversation,
  WhatsappConnection,
  AssistantAction,
  AssistantMessage,
  AssistantChat,
  DailyBriefing,
  PropertyDocumentLookup,
  PropertyLegalProfile,
  ListingShortcut,
  PropertyMatch,
  PropertyHunt,
  Visit,
  Deal,
  Document,
  PropertyMedia,
  PropertyContact,
  Property,
  Customer,
  Kanban,
] as const;

/** Credit lines whose text names nobody, the others are reworded. */
const NEUTRAL_CREDIT_KINDS = [
  CreditTransactionKind.SUBSCRIPTION,
  CreditTransactionKind.PURCHASE,
];

/**
 * Deletes the broker's account. The broker row stays, unidentifiable, so the
 * payments the tax law asks to keep and the usage figures still add up.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly subscriptionService: SubscriptionService,
    private readonly whatsappConnectionService: WhatsappConnectionService,
    private readonly brokerMailService: BrokerMailService,
  ) {}

  async deleteAccount(
    user: User,
    confirmation: string,
    reason = AccountDeletionReason.REQUESTED,
  ): Promise<void> {
    if (confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
      throw new BadRequestException(
        `Digite ${ACCOUNT_DELETION_CONFIRMATION} para confirmar a exclusão da conta`,
      );
    }

    // The address is erased below, the confirmation goes to the one kept here.
    const recipient = { id: user.id, email: user.email, name: user.name };

    // A card left running would keep charging a person we can no longer reach.
    await this.stopCardCharges(user.id);
    await this.dropWhatsappInstance(user);

    await this.dataSource.transaction(async (manager) => {
      for (const entity of THIRD_PARTY_ENTITIES) {
        await manager.delete(entity, { userId: user.id });
      }
      await this.anonymizeKeptRecords(manager, user.id);
      await this.anonymizeUser(manager, user);
    });

    this.subscriptionService.invalidate(user.id);
    announceSessionsEnded(user.id);
    await this.deleteFiles(user.id);
    this.logger.log(`Account ${user.id} deleted and anonymized`);
    this.brokerMailService.notify(recipient, (context) =>
      accountDeletedMail(context, reason),
    );
  }

  private async stopCardCharges(userId: string) {
    const subscription = await this.dataSource
      .getRepository(Subscription)
      .findOneBy({ userId });
    if (
      !subscription?.providerPreapprovalId ||
      !this.subscriptionService.isCardActive(subscription)
    ) {
      return;
    }

    try {
      await this.mercadoPagoService.cancelCardSubscription(
        subscription.providerPreapprovalId,
      );
    } catch (error) {
      this.logger.error(
        `Card subscription of ${userId} could not be cancelled: ${String(error)}`,
      );
      throw new BadGatewayException(
        "Não conseguimos cancelar a cobrança no cartão agora. Nada foi apagado, tente de novo em alguns minutos.",
      );
    }

    await this.dataSource.getRepository(Subscription).update(subscription.id, {
      canceledAt: new Date(),
      providerPreapprovalStatus: "cancelled",
    });
  }

  private async dropWhatsappInstance(user: User) {
    try {
      await this.whatsappConnectionService.disconnect(user);
    } catch (error) {
      // The connection row goes away below, so its webhook stops matching.
      this.logger.warn(
        `WhatsApp instance of ${user.id} not removed: ${String(error)}`,
      );
    }
  }

  private async anonymizeKeptRecords(manager: EntityManager, userId: string) {
    await manager.update(
      CreditTransaction,
      { userId, kind: Not(In(NEUTRAL_CREDIT_KINDS)) },
      { description: "Registro anonimizado", referenceId: null },
    );
    await manager.update(
      SubscriptionPayment,
      { userId },
      { pixCode: null, pixQrCodeBase64: null },
    );
    await manager.update(
      CreditPurchase,
      { userId },
      { pixCode: null, pixQrCodeBase64: null },
    );
    await manager.update(
      Subscription,
      { userId },
      { lastPaymentFailureReason: null },
    );
  }

  private async anonymizeUser(manager: EntityManager, user: User) {
    await manager.update(User, user.id, {
      active: false,
      email: anonymousEmail(),
      name: ANONYMOUS_NAME,
      googleId: user.googleId ? deletedGoogleIdOf(user.googleId) : "",
      profileImage: null,
      avatar: null,
      slug: null,
      city: null,
      phone: null,
      creci: null,
      bio: null,
      workingCities: null,
      salesNiches: null,
      targetClienteles: null,
      aiMemory: null,
      termsAcceptedIp: null,
      termsAcceptedUserAgent: null,
    });
  }

  /** After the commit: a failed file stays orphaned, never half a database. */
  private async deleteFiles(userId: string) {
    for (const prefix of this.storageService.userS3KeyPrefixes(userId)) {
      try {
        await this.storageService.deletePrefix(prefix);
      } catch (error) {
        this.logger.error(
          `Files under ${prefix} were not deleted, remove them by hand: ${String(error)}`,
        );
      }
    }
  }
}
