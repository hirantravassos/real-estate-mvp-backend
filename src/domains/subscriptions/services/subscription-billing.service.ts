import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { appConfig } from "../../../config/app.config";
import {
  MercadoPagoPayment,
  MercadoPagoService,
} from "../../../infrastructure/payments/services/mercado-pago.service";
import { CreditTransactionKind } from "../../credits/entities/credit-transaction.entity";
import { CreditPurchaseService } from "../../credits/services/credit-purchase.service";
import { CreditWalletService } from "../../credits/services/credit-wallet.service";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { User } from "../../users/entities/user.entity";
import { SubscriptionPlan } from "../constants/subscription-plans.constant";
import { SubscriptionCardDto } from "../dtos/subscription.dto";
import { SubscriptionPayment } from "../entities/subscription-payment.entity";
import { Subscription } from "../entities/subscription.entity";
import {
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionPlanKey,
} from "../enums/subscription.enum";
import {
  addOneMonth,
  hasAccess,
  nextPeriodStart,
} from "../helpers/subscription-period.helper";
import {
  cardUpdatedMail,
  PaymentReceivedMailInput,
  paymentFailedMail,
  paymentReceivedMail,
  planChangedMail,
  subscriptionCanceledMail,
  subscriptionConfirmedMail,
  subscriptionThanksMail,
} from "../mails/subscription.mails";
import { SubscriptionMapper } from "../mappers/subscription.mapper";
import { SubscriptionService } from "./subscription.service";

const PROVIDER = "mercado_pago";
const PIX_EXPIRATION_MINUTES = 30;
/** A Pix month of the plan, the reference Mercado Pago gives back. */
const PIX_REFERENCE_PREFIX = "subscription-payment:";
/** The monthly card charge of a subscription. */
const CARD_REFERENCE_PREFIX = "subscription:";
/** Card charges are read back from Mercado Pago at most this often. */
const CARD_SYNC_INTERVAL_MILLISECONDS = 10 * 60_000;
/** Below this, the first card charge happens right away. */
const MINIMUM_CARD_START_DELAY_MILLISECONDS = 30 * 60_000;
const AMOUNT_TOLERANCE_IN_BRL = 0.009;
const FAILED_PAYMENT_STATUSES = new Set([
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
]);

const formatDate = (date: Date) => dayjs(date).format("DD/MM/YYYY");

/** Before these, paying opens a new subscription instead of renewing one. */
const NEW_SUBSCRIPTION_STATUSES = new Set([
  SubscriptionAccessStatus.TRIALING,
  SubscriptionAccessStatus.EXPIRED,
]);

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly applicationConfiguration: ConfigType<typeof appConfig>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPayment)
    private readonly paymentRepository: Repository<SubscriptionPayment>,
    private readonly subscriptionService: SubscriptionService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly walletService: CreditWalletService,
    private readonly creditPurchaseService: CreditPurchaseService,
    private readonly dataSource: DataSource,
    private readonly brokerMailService: BrokerMailService,
  ) {}

  publicPlans() {
    return {
      trialDays: this.subscriptionService.trialDays,
      trialCredits: this.subscriptionService.trialCredits,
      graceDays: this.subscriptionService.graceDays,
      plans: this.subscriptionService.plans,
    };
  }

  async summary(user: User) {
    let subscription = await this.subscriptionService.findOrCreate(user.id);

    await this.syncCardCharges(subscription).catch((error: unknown) =>
      this.logger.warn(
        `Card charges of subscription ${subscription.id} not synced: ${String(error)}`,
      ),
    );
    subscription = await this.subscriptionRepository.findOneByOrFail({
      id: subscription.id,
    });

    const now = new Date();
    const status = this.subscriptionService.statusOf(subscription, now);
    const cardActive = this.subscriptionService.isCardActive(subscription);
    const renewalOpensAt = subscription.paidThrough
      ? dayjs(subscription.paidThrough)
          .subtract(this.subscriptionService.renewalWindowDays, "day")
          .toDate()
      : null;

    return {
      status,
      hasAccess: !this.subscriptionService.billingEnabled || hasAccess(status),
      billingEnabled: this.subscriptionService.billingEnabled,
      trialDays: this.subscriptionService.trialDays,
      trialCredits: this.subscriptionService.trialCredits,
      graceDays: this.subscriptionService.graceDays,
      trialEndsAt: subscription.trialEndsAt,
      paidThrough: subscription.paidThrough,
      graceEndsAt:
        status === SubscriptionAccessStatus.PAST_DUE
          ? this.subscriptionService.graceEndOf(subscription)
          : null,
      canceledAt: subscription.canceledAt,
      plan: await this.subscriptionService.effectivePlan(subscription, now),
      nextPlanKey: subscription.planKey,
      paymentMethod: subscription.paymentMethod,
      card: {
        active: cardActive,
        nextChargeAt: cardActive
          ? (subscription.paidThrough ??
            this.subscriptionService.timelineOf(subscription)
              .firstCardChargeDueAt)
          : null,
      },
      pix: {
        renewalAvailable:
          (!cardActive || status === SubscriptionAccessStatus.PAST_DUE) &&
          (!renewalOpensAt || renewalOpensAt <= now),
        renewalOpensAt,
      },
      lastPaymentFailedAt: subscription.lastPaymentFailedAt,
      lastPaymentFailureReason: subscription.lastPaymentFailureReason,
      paymentsEnabled: this.mercadoPagoService.isConfigured,
      cardPaymentsEnabled: this.mercadoPagoService.cardPaymentsEnabled,
      mercadoPagoPublicKey: this.mercadoPagoService.publicKey,
      usage: await this.subscriptionService.usage(user.id),
    };
  }

  async findPayments(user: User) {
    const payments = await this.paymentRepository.find({
      where: {
        userId: user.id,
        status: In([
          SubscriptionPaymentStatus.PAID,
          SubscriptionPaymentStatus.PENDING,
        ]),
      },
      order: { createdAt: "DESC" },
      take: 24,
    });
    return payments.map((payment) => ({
      ...SubscriptionMapper.toPaymentDto(payment),
      pixCode: null,
    }));
  }

  /** One month of the plan by Pix. The broker renews by hand every month. */
  async createPixPayment(user: User, planKey: SubscriptionPlanKey) {
    this.assertPaymentsEnabled();
    const plan = this.subscriptionService.findPlan(planKey);
    const subscription = await this.subscriptionService.findOrCreate(user.id);

    // A failing card can be settled with Pix during the grace days, the card
    // charge is stopped once the Pix lands. Otherwise it would charge twice.
    if (
      this.subscriptionService.isCardActive(subscription) &&
      this.subscriptionService.statusOf(subscription) !==
        SubscriptionAccessStatus.PAST_DUE
    ) {
      throw new BadRequestException(
        "Sua assinatura é cobrada no cartão todo mês. Para pagar com Pix, cancele a cobrança no cartão primeiro.",
      );
    }

    if (subscription.paidThrough) {
      const opensAt = dayjs(subscription.paidThrough).subtract(
        this.subscriptionService.renewalWindowDays,
        "day",
      );
      if (opensAt.isAfter(dayjs())) {
        throw new BadRequestException(
          `Seu plano já está pago até ${formatDate(subscription.paidThrough)}. A renovação abre em ${opensAt.format("DD/MM/YYYY")}.`,
        );
      }
    }

    const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60_000);
    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        userId: user.id,
        subscriptionId: subscription.id,
        planKey: plan.key,
        method: SubscriptionPaymentMethod.PIX,
        status: SubscriptionPaymentStatus.PENDING,
        amountInBrl: plan.priceInBrl.toFixed(2),
        credits: plan.monthlyCredits,
        provider: PROVIDER,
        expiresAt,
      }),
    );

    try {
      const providerPayment = await this.mercadoPagoService.createPixPayment({
        reference: `${PIX_REFERENCE_PREFIX}${payment.id}`,
        amountInBrl: plan.priceInBrl,
        description: `BrokerIn plano ${plan.name}, 1 mês`,
        payerEmail: user.email,
        expiresAt,
      });

      const transactionData =
        providerPayment.point_of_interaction?.transaction_data;
      payment.providerPaymentId = String(providerPayment.id);
      payment.pixCode = transactionData?.qr_code ?? null;
      payment.pixQrCodeBase64 = transactionData?.qr_code_base64 ?? null;
      await this.paymentRepository.save(payment);
    } catch (error) {
      payment.status = SubscriptionPaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
      throw error;
    }

    if (subscription.planKey !== plan.key) {
      await this.subscriptionRepository.update(subscription.id, {
        planKey: plan.key,
      });
    }

    return SubscriptionMapper.toPaymentDto(payment);
  }

  /** Also asks Mercado Pago, so the Pix settles even if a webhook is lost. */
  async findPayment(user: User, id: string) {
    const payment = await this.findWithQrCode(id, user.id);
    if (!payment) throw new NotFoundException("Pagamento não encontrado.");

    if (
      payment.status === SubscriptionPaymentStatus.PENDING &&
      payment.providerPaymentId
    ) {
      const providerPayment = await this.mercadoPagoService
        .findPayment(payment.providerPaymentId)
        .catch(() => null);
      if (providerPayment) await this.settlePixPayment(providerPayment);
      const refreshed = await this.findWithQrCode(id, user.id);
      return SubscriptionMapper.toPaymentDto(refreshed ?? payment);
    }

    return SubscriptionMapper.toPaymentDto(payment);
  }

  /**
   * Monthly charge on the card through Mercado Pago. The first charge waits
   * for the end of the trial or of the month already paid, so nothing is
   * paid twice. A new card replaces the old charge only once it is accepted.
   */
  async subscribeWithCard(user: User, dto: SubscriptionCardDto) {
    if (!this.mercadoPagoService.cardPaymentsEnabled) {
      throw new ServiceUnavailableException(
        "O pagamento com cartão ainda não está disponível.",
      );
    }

    const plan = this.subscriptionService.findPlan(dto.planKey);
    const subscription = await this.subscriptionService.findOrCreate(user.id);
    const previousPreapprovalId = this.subscriptionService.isCardActive(
      subscription,
    )
      ? subscription.providerPreapprovalId
      : null;

    const now = new Date();
    const periodStart = nextPeriodStart(
      subscription,
      now,
      this.subscriptionService.graceDays,
    );
    const startDate =
      periodStart.getTime() - now.getTime() >=
      MINIMUM_CARD_START_DELAY_MILLISECONDS
        ? periodStart
        : null;

    const preapproval = await this.mercadoPagoService.createCardSubscription({
      reference: `${CARD_REFERENCE_PREFIX}${subscription.id}`,
      reason: `BrokerIn plano ${plan.name}`,
      amountInBrl: plan.priceInBrl,
      payerEmail: dto.payerEmail,
      cardToken: dto.cardToken,
      startDate,
      backUrl: `${this.applicationConfiguration.frontendUrl}/assinatura`,
    });

    if (
      preapproval.status !== "authorized" &&
      preapproval.status !== "pending"
    ) {
      throw new BadRequestException(
        "O cartão não foi aceito. Confira os dados ou use outro cartão.",
      );
    }

    await this.subscriptionRepository.update(subscription.id, {
      planKey: plan.key,
      paymentMethod: SubscriptionPaymentMethod.CARD,
      cardPriceInBrl: plan.priceInBrl.toFixed(2),
      providerPreapprovalId: preapproval.id,
      providerPreapprovalStatus: preapproval.status,
      cardSubscribedAt: now,
      canceledAt: null,
      lastPaymentFailedAt: null,
      lastPaymentFailureReason: null,
      lastSyncedAt: null,
    });

    if (previousPreapprovalId && previousPreapprovalId !== preapproval.id) {
      await this.mercadoPagoService
        .cancelCardSubscription(previousPreapprovalId)
        .catch((error: unknown) =>
          this.logger.error(
            `Old card charge ${previousPreapprovalId} not cancelled: ${String(error)}`,
          ),
        );
    }

    if (previousPreapprovalId) {
      this.brokerMailService.notify(user, (context) =>
        cardUpdatedMail(context, { plan, nextChargeAt: startDate }),
      );
    } else {
      this.brokerMailService.notify(user, (context) => [
        subscriptionConfirmedMail(context, {
          plan,
          method: SubscriptionPaymentMethod.CARD,
          amountInBrl: plan.priceInBrl,
          firstChargeAt: startDate,
        }),
        subscriptionThanksMail(context, plan),
      ]);
    }

    this.subscriptionService.invalidate(user.id);
    return this.summary(user);
  }

  /** Plan of the next month. The month already paid keeps its plan. */
  async changePlan(user: User, planKey: SubscriptionPlanKey) {
    const plan = this.subscriptionService.findPlan(planKey);
    const subscription = await this.subscriptionService.findOrCreate(user.id);
    const cardActive = this.subscriptionService.isCardActive(subscription);

    if (cardActive && subscription.providerPreapprovalId) {
      await this.mercadoPagoService.updateCardSubscriptionAmount(
        subscription.providerPreapprovalId,
        plan.priceInBrl,
        `BrokerIn plano ${plan.name}`,
      );
      await this.subscriptionRepository.update(subscription.id, {
        planKey: plan.key,
        cardPriceInBrl: plan.priceInBrl.toFixed(2),
      });
    } else {
      await this.subscriptionRepository.update(subscription.id, {
        planKey: plan.key,
      });
    }

    // Only a running subscription has a next month to change, picking a
    // plan during the trial is not worth a mail.
    if (
      subscription.planKey !== plan.key &&
      (cardActive || subscription.paidThrough)
    ) {
      const effectiveFrom = cardActive
        ? (subscription.paidThrough ??
          this.subscriptionService.timelineOf(subscription)
            .firstCardChargeDueAt)
        : subscription.paidThrough;
      this.brokerMailService.notify(user, (context) =>
        planChangedMail(context, { plan, effectiveFrom }),
      );
    }

    this.subscriptionService.invalidate(user.id);
    return this.summary(user);
  }

  /** Stops the renewal. The month already paid runs to its end. */
  async cancel(user: User) {
    const subscription = await this.subscriptionService.findOrCreate(user.id);
    const cardActive = this.subscriptionService.isCardActive(subscription);

    if (!cardActive && !subscription.paidThrough) {
      throw new BadRequestException("Não há assinatura paga para cancelar.");
    }

    if (cardActive && subscription.providerPreapprovalId) {
      await this.mercadoPagoService.cancelCardSubscription(
        subscription.providerPreapprovalId,
      );
    }

    await this.subscriptionRepository.update(subscription.id, {
      canceledAt: new Date(),
      providerPreapprovalStatus: cardActive
        ? "cancelled"
        : subscription.providerPreapprovalStatus,
    });

    const plan = await this.subscriptionService.effectivePlan(subscription);
    const accessUntil =
      subscription.paidThrough ??
      (cardActive ? subscription.trialEndsAt : null);
    this.brokerMailService.notify(user, (context) =>
      subscriptionCanceledMail(context, { planName: plan.name, accessUntil }),
    );

    this.subscriptionService.invalidate(user.id);
    return this.summary(user);
  }

  /** Webhook "payment": a Pix of the plan, a card month or a credit pack. */
  async handlePaymentNotification(paymentId: string) {
    const payment = await this.mercadoPagoService.findPayment(paymentId);
    const reference = payment.external_reference ?? "";

    if (reference.startsWith(PIX_REFERENCE_PREFIX)) {
      await this.settlePixPayment(payment);
      return;
    }

    if (reference.startsWith(CARD_REFERENCE_PREFIX)) {
      const subscription = await this.subscriptionRepository.findOneBy({
        id: reference.substring(CARD_REFERENCE_PREFIX.length),
      });
      if (subscription) await this.handleCardPayment(subscription, payment);
      return;
    }

    await this.creditPurchaseService.settle(payment);
  }

  /** Webhook "subscription_preapproval": the card charge changed status. */
  async handlePreapprovalNotification(preapprovalId: string) {
    const preapproval =
      await this.mercadoPagoService.findCardSubscription(preapprovalId);
    const subscription = await this.subscriptionRepository.findOneBy({
      providerPreapprovalId: preapproval.id,
    });
    if (!subscription) return;

    const stoppedByProvider =
      (preapproval.status === "cancelled" || preapproval.status === "paused") &&
      !subscription.canceledAt &&
      subscription.providerPreapprovalStatus !== preapproval.status;
    const stoppedReason =
      "A cobrança no cartão foi interrompida pelo Mercado Pago. Cadastre outro cartão ou pague com Pix.";

    await this.subscriptionRepository.update(subscription.id, {
      providerPreapprovalStatus: preapproval.status,
      ...(stoppedByProvider
        ? {
            lastPaymentFailedAt: new Date(),
            lastPaymentFailureReason: stoppedReason,
          }
        : {}),
    });
    if (stoppedByProvider) {
      this.notifyFirstFailure(subscription, stoppedReason);
    }
    this.subscriptionService.invalidate(subscription.userId);
  }

  /** Webhook "subscription_authorized_payment": one monthly card charge. */
  async handleAuthorizedPaymentNotification(authorizedPaymentId: string) {
    const authorizedPayment =
      await this.mercadoPagoService.findAuthorizedPayment(authorizedPaymentId);
    const subscription = await this.findSubscriptionOfPreapproval(
      authorizedPayment.preapproval_id,
    );
    if (!subscription) return;

    const paymentId = authorizedPayment.payment?.id;
    if (!paymentId) {
      if (authorizedPayment.status === "recycling") {
        await this.recordCardFailure(
          subscription,
          "A cobrança do cartão não passou, o Mercado Pago vai tentar de novo nos próximos dias.",
        );
      }
      return;
    }

    // The payment itself is the source of truth, read straight from the API.
    const payment = await this.mercadoPagoService.findPayment(
      String(paymentId),
    );
    await this.handleCardPayment(subscription, payment);
  }

  private async handleCardPayment(
    subscription: Subscription,
    payment: MercadoPagoPayment,
  ) {
    if (payment.status === "approved") {
      await this.settleCardPayment(subscription.id, payment);
      return;
    }

    if (FAILED_PAYMENT_STATUSES.has(payment.status)) {
      const alreadySettled = await this.paymentRepository.existsBy({
        provider: PROVIDER,
        providerPaymentId: String(payment.id),
      });
      if (!alreadySettled) {
        await this.recordCardFailure(
          subscription,
          "A cobrança do cartão foi recusada. Cadastre outro cartão ou pague com Pix.",
        );
      }
    }
  }

  private async recordCardFailure(subscription: Subscription, reason: string) {
    await this.subscriptionRepository.update(subscription.id, {
      lastPaymentFailedAt: new Date(),
      lastPaymentFailureReason: reason,
    });
    this.notifyFirstFailure(subscription, reason);
    this.subscriptionService.invalidate(subscription.userId);
  }

  /**
   * Mercado Pago retries a refused card for days and resends its webhooks,
   * the broker hears about it once: the failure mark is cleared on payment.
   */
  private notifyFirstFailure(subscription: Subscription, reason: string) {
    if (subscription.lastPaymentFailedAt) return;
    const graceEndsAt = this.subscriptionService.graceEndOf(subscription);
    this.brokerMailService.notify(subscription.userId, (context) =>
      paymentFailedMail(context, { reason, graceEndsAt }),
    );
  }

  /** One paid card month: extends the access and adds the plan credits, once. */
  private async settleCardPayment(
    subscriptionId: string,
    payment: MercadoPagoPayment,
  ) {
    const owner = await this.subscriptionRepository.findOneBy({
      id: subscriptionId,
    });
    if (!owner) return;
    await this.walletService.findOrCreate(owner.userId);
    let receipt: PaymentReceivedMailInput | null = null;

    await this.dataSource.transaction(async (manager) => {
      const subscription = await manager.findOne(Subscription, {
        where: { id: subscriptionId },
        lock: { mode: "pessimistic_write" },
      });
      if (!subscription) return;

      const alreadySettled = await manager.existsBy(SubscriptionPayment, {
        provider: PROVIDER,
        providerPaymentId: String(payment.id),
      });
      if (alreadySettled) return;

      if (payment.currency_id && payment.currency_id !== "BRL") {
        this.logger.error(
          `Card payment ${payment.id} in ${payment.currency_id}, not settled`,
        );
        return;
      }

      const plan = this.planForCardAmount(
        subscription,
        payment.transaction_amount,
      );
      if (!plan) {
        this.logger.error(
          `Card payment ${payment.id} of ${payment.transaction_amount} matches no plan of subscription ${subscription.id}`,
        );
        return;
      }

      receipt = await this.grantPaidMonth(manager, subscription, {
        plan,
        method: SubscriptionPaymentMethod.CARD,
        amountInBrl: payment.transaction_amount,
        credits: plan.monthlyCredits,
        providerPaymentId: String(payment.id),
      });
    });

    // Sent after the commit and only by the call that settled the charge, so
    // a resent webhook never mails the receipt twice.
    const settledReceipt = receipt as PaymentReceivedMailInput | null;
    if (settledReceipt) {
      this.brokerMailService.notify(owner.userId, (context) =>
        paymentReceivedMail(context, settledReceipt),
      );
    }
    this.subscriptionService.invalidate(owner.userId);
  }

  /** Settles a Pix of the plan, inside the same lock as its row. */
  private async settlePixPayment(payment: MercadoPagoPayment) {
    const reference = payment.external_reference ?? "";
    if (!reference.startsWith(PIX_REFERENCE_PREFIX)) return;
    const subscriptionPaymentId = reference.substring(
      PIX_REFERENCE_PREFIX.length,
    );

    const pending = await this.paymentRepository.findOneBy({
      id: subscriptionPaymentId,
    });
    if (!pending) return;
    await this.walletService.findOrCreate(pending.userId);
    let paid = false;
    let receipt: PaymentReceivedMailInput | null = null;
    let opensSubscription = false;

    await this.dataSource.transaction(async (manager) => {
      const subscriptionPayment = await manager.findOne(SubscriptionPayment, {
        where: { id: subscriptionPaymentId },
        lock: { mode: "pessimistic_write" },
      });

      if (
        !subscriptionPayment ||
        subscriptionPayment.status !== SubscriptionPaymentStatus.PENDING ||
        subscriptionPayment.providerPaymentId !== String(payment.id)
      ) {
        return;
      }

      if (payment.status === "approved") {
        if (
          Math.abs(
            payment.transaction_amount -
              Number(subscriptionPayment.amountInBrl),
          ) > AMOUNT_TOLERANCE_IN_BRL
        ) {
          this.logger.error(
            `Pix ${payment.id} amount ${payment.transaction_amount} differs from subscription payment ${subscriptionPayment.id}`,
          );
          return;
        }

        const subscription = await manager.findOne(Subscription, {
          where: { id: subscriptionPayment.subscriptionId },
          lock: { mode: "pessimistic_write" },
        });
        if (!subscription) return;

        opensSubscription = NEW_SUBSCRIPTION_STATUSES.has(
          this.subscriptionService.statusOf(subscription),
        );
        receipt = await this.grantPaidMonth(manager, subscription, {
          plan: this.subscriptionService.findPlan(subscriptionPayment.planKey),
          method: SubscriptionPaymentMethod.PIX,
          amountInBrl: Number(subscriptionPayment.amountInBrl),
          credits: subscriptionPayment.credits,
          providerPaymentId: subscriptionPayment.providerPaymentId,
          existing: subscriptionPayment,
        });
        paid = true;
        return;
      }

      if (FAILED_PAYMENT_STATUSES.has(payment.status)) {
        subscriptionPayment.status = SubscriptionPaymentStatus.FAILED;
        await manager.save(subscriptionPayment);
        return;
      }

      if (
        subscriptionPayment.expiresAt &&
        subscriptionPayment.expiresAt.getTime() < Date.now() - 60_000
      ) {
        subscriptionPayment.status = SubscriptionPaymentStatus.EXPIRED;
        await manager.save(subscriptionPayment);
      }
    });

    if (paid) await this.stopCardAfterPix(pending.subscriptionId);
    const settledReceipt = receipt as PaymentReceivedMailInput | null;
    if (settledReceipt)
      this.notifyPixPaid(pending.userId, settledReceipt, opensSubscription);
    this.subscriptionService.invalidate(pending.userId);
  }

  /** A first Pix opens the subscription, the next ones renew it. */
  private notifyPixPaid(
    userId: string,
    receipt: PaymentReceivedMailInput,
    opensSubscription: boolean,
  ) {
    if (!opensSubscription) {
      this.brokerMailService.notify(userId, (context) =>
        paymentReceivedMail(context, receipt),
      );
      return;
    }
    this.brokerMailService.notify(userId, (context) => [
      subscriptionConfirmedMail(context, {
        plan: receipt.plan,
        method: SubscriptionPaymentMethod.PIX,
        amountInBrl: receipt.amountInBrl,
        paidThrough: receipt.periodEnd,
      }),
      subscriptionThanksMail(context, receipt.plan),
    ]);
  }

  /** The broker settled with Pix, the failing card must not charge again. */
  private async stopCardAfterPix(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOneBy({
      id: subscriptionId,
    });
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
      await this.subscriptionRepository.update(subscription.id, {
        providerPreapprovalStatus: "cancelled",
      });
    } catch (error) {
      this.logger.error(
        `Card charge ${subscription.providerPreapprovalId} not stopped after Pix: ${String(error)}`,
      );
    }
  }

  /** Runs inside the caller's transaction, with the subscription row locked. */
  private async grantPaidMonth(
    manager: EntityManager,
    subscription: Subscription,
    charge: {
      plan: SubscriptionPlan;
      method: SubscriptionPaymentMethod;
      amountInBrl: number;
      credits: number;
      providerPaymentId: string | null;
      existing?: SubscriptionPayment;
    },
  ): Promise<PaymentReceivedMailInput> {
    const now = new Date();
    const periodStart = nextPeriodStart(
      subscription,
      now,
      this.subscriptionService.graceDays,
    );
    const periodEnd = addOneMonth(periodStart);

    const payment =
      charge.existing ??
      manager.create(SubscriptionPayment, {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planKey: charge.plan.key,
        method: charge.method,
        amountInBrl: charge.amountInBrl.toFixed(2),
        credits: charge.credits,
        provider: PROVIDER,
        providerPaymentId: charge.providerPaymentId,
      });
    payment.status = SubscriptionPaymentStatus.PAID;
    payment.paidAt = now;
    payment.periodStart = periodStart;
    payment.periodEnd = periodEnd;
    await manager.save(payment);

    subscription.paidThrough = periodEnd;
    subscription.paymentMethod = charge.method;
    subscription.lastPaymentFailedAt = null;
    subscription.lastPaymentFailureReason = null;
    if (charge.method === SubscriptionPaymentMethod.PIX) {
      // A Pix payment means the broker wants to keep going.
      subscription.canceledAt = null;
    }
    await manager.save(subscription);

    if (charge.credits > 0) {
      await this.walletService.applyChange(manager, subscription.userId, {
        kind: CreditTransactionKind.SUBSCRIPTION,
        amount: charge.credits,
        description: `Créditos do plano ${charge.plan.name}, de ${formatDate(periodStart)} a ${formatDate(periodEnd)}`,
        referenceId: payment.id,
      });
    }

    return {
      plan: charge.plan,
      method: charge.method,
      amountInBrl: charge.amountInBrl,
      credits: charge.credits,
      periodStart,
      periodEnd,
    };
  }

  /**
   * The card is charged what was agreed with Mercado Pago. After a plan
   * change the amount tells which plan the month paid for.
   */
  private planForCardAmount(subscription: Subscription, amountInBrl: number) {
    const matches = (price: number) =>
      Math.abs(price - amountInBrl) <= AMOUNT_TOLERANCE_IN_BRL;

    if (
      subscription.planKey &&
      subscription.cardPriceInBrl &&
      matches(Number(subscription.cardPriceInBrl))
    ) {
      return this.subscriptionService.findPlan(subscription.planKey);
    }

    return (
      this.subscriptionService.plans.find((plan) => matches(plan.priceInBrl)) ??
      [...this.subscriptionService.plans]
        .reverse()
        .find(
          (plan) => plan.priceInBrl <= amountInBrl + AMOUNT_TOLERANCE_IN_BRL,
        ) ??
      null
    );
  }

  private async findSubscriptionOfPreapproval(preapprovalId: string) {
    const current = await this.subscriptionRepository.findOneBy({
      providerPreapprovalId: preapprovalId,
    });
    if (current) return current;

    // A late charge of a card that was replaced still belongs to the broker.
    const preapproval = await this.mercadoPagoService
      .findCardSubscription(preapprovalId)
      .catch(() => null);
    const reference = preapproval?.external_reference ?? "";
    if (!reference.startsWith(CARD_REFERENCE_PREFIX)) return null;
    return this.subscriptionRepository.findOneBy({
      id: reference.substring(CARD_REFERENCE_PREFIX.length),
    });
  }

  /** Reads the card charges back, so a lost webhook never blocks a paying broker. */
  private async syncCardCharges(subscription: Subscription) {
    if (!subscription.providerPreapprovalId) return;
    if (!this.mercadoPagoService.isConfigured) return;

    const now = Date.now();
    if (
      subscription.lastSyncedAt &&
      now - subscription.lastSyncedAt.getTime() <
        CARD_SYNC_INTERVAL_MILLISECONDS
    ) {
      return;
    }
    const chargeDue =
      !subscription.paidThrough ||
      subscription.paidThrough.getTime() - now < 2 * 24 * 60 * 60 * 1000;
    if (!chargeDue) return;

    await this.subscriptionRepository.update(subscription.id, {
      lastSyncedAt: new Date(now),
    });

    const preapproval = await this.mercadoPagoService.findCardSubscription(
      subscription.providerPreapprovalId,
    );
    if (preapproval.status !== subscription.providerPreapprovalStatus) {
      await this.handlePreapprovalNotification(preapproval.id);
    }

    const payments = await this.mercadoPagoService.searchPayments(
      `${CARD_REFERENCE_PREFIX}${subscription.id}`,
    );
    for (const payment of payments) {
      if (payment.status === "approved") {
        await this.settleCardPayment(subscription.id, payment);
      }
    }
  }

  private assertPaymentsEnabled() {
    if (!this.mercadoPagoService.isConfigured) {
      throw new ServiceUnavailableException(
        "Os pagamentos ainda não estão disponíveis.",
      );
    }
  }

  private findWithQrCode(id: string, userId: string) {
    return this.paymentRepository
      .createQueryBuilder("payment")
      .addSelect("payment.pixQrCodeBase64")
      .where("payment.id = :id", { id })
      .andWhere("payment.userId = :userId", { userId })
      .getOne();
  }
}
