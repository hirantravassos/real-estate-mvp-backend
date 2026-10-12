import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EvolutionApiService } from "../../../infrastructure/evolution/services/evolution-api.service";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { User } from "../../users/entities/user.entity";
import { Conversation } from "../entities/conversation.entity";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";
import {
  isPersonalJid,
  phoneMatchingKey,
  toCustomerPhone,
  toWhatsappNumber,
} from "../helpers/whatsapp-phone.helper";
import { ConversationService } from "./conversation.service";
import { HistoryImportJob, MessageService } from "./message.service";
import { WhatsappConnectionService } from "./whatsapp-connection.service";

const WHATSAPP_USER_SUFFIX = "@s.whatsapp.net";

/**
 * Brings the messages already on the phone into the inbox, for the inbox
 * chats and for every customer with a WhatsApp chat. Personal chats with no
 * customer stay out. Safe to repeat: no message is ever copied twice.
 */
@Injectable()
export class InboxSyncService {
  private readonly logger = new Logger(InboxSyncService.name);
  /** Brokers with a sync running, a second click waits for the first. */
  private readonly running = new Set<string>();

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly customerRepository: CustomerRepository,
    private readonly connectionService: WhatsappConnectionService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly evolutionApiService: EvolutionApiService,
  ) {}

  async sync(user: User) {
    const connection = await this.connectionService.requireConnected(user.id);
    if (this.running.has(user.id)) {
      return { conversations: 0, alreadyRunning: true };
    }

    this.running.add(user.id);
    try {
      const jobs = await this.jobsOf(connection);
      void this.messageService
        .importHistories(connection, jobs)
        .then((saved) => {
          this.logger.log(
            `Inbox sync of ${user.id}: ${jobs.length} chats, ${saved} messages`,
          );
        })
        .catch((error: unknown) => {
          this.logger.warn(`Inbox sync of ${user.id} failed: ${String(error)}`);
        })
        .finally(() => this.running.delete(user.id));
      return { conversations: jobs.length, alreadyRunning: false };
    } catch (error) {
      this.running.delete(user.id);
      throw error;
    }
  }

  /** Every inbox chat, plus a new one for each customer with a chat on the phone. */
  private async jobsOf(connection: WhatsappConnection) {
    const chats = await this.evolutionApiService.findChats(
      connection.instanceName,
    );

    // The same person may be stored under the number and under the WhatsApp id (LID).
    const jidsByKey = new Map<string, Set<string>>();
    for (const chat of chats) {
      const jid = chat.remoteJid ?? chat.id;
      if (!jid || jid.endsWith("@g.us") || jid.endsWith("@broadcast")) {
        continue;
      }
      const phoneJid = [
        jid,
        chat.lastMessage?.key?.remoteJidAlt,
        chat.lastMessage?.key?.senderPn,
      ].find((candidate) => isPersonalJid(candidate));
      const phone = toCustomerPhone(phoneJid);
      if (!phone) continue;

      const key = phoneMatchingKey(phone);
      const jids = jidsByKey.get(key) ?? new Set<string>();
      jids.add(jid);
      if (phoneJid) jids.add(phoneJid);
      jidsByKey.set(key, jids);
    }

    const conversations = await this.conversationRepository.find({
      where: { userId: connection.userId, active: true },
    });
    const conversationKeys = new Set(
      conversations.map((conversation) => phoneMatchingKey(conversation.phone)),
    );

    const customers = await this.customerRepository.find({
      where: { userId: connection.userId, active: true },
      select: { id: true, name: true, phone: true },
    });
    for (const customer of customers) {
      const key = phoneMatchingKey(customer.phone);
      if (conversationKeys.has(key) || !jidsByKey.has(key)) continue;

      const phoneJid =
        [...(jidsByKey.get(key) ?? [])].find((jid) => isPersonalJid(jid)) ??
        `${toWhatsappNumber(customer.phone)}${WHATSAPP_USER_SUFFIX}`;
      const conversation = await this.conversationService.findOrCreateByJid(
        connection.userId,
        phoneJid,
        customer.name,
      );
      if (!conversation.customerId) {
        conversation.customerId = customer.id;
        await this.conversationRepository.update(conversation.id, {
          customerId: customer.id,
        });
      }
      conversationKeys.add(key);
      conversations.push(conversation);
    }

    return conversations
      .filter((conversation) =>
        jidsByKey.has(phoneMatchingKey(conversation.phone)),
      )
      .map<HistoryImportJob>((conversation) => ({
        conversation,
        chatJids: [
          conversation.remoteJid,
          ...(jidsByKey.get(phoneMatchingKey(conversation.phone)) ?? []),
        ],
      }));
  }
}
