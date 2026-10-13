import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import {
  DataSource,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { subscriptionsConfig } from "../../../config/subscriptions.config";
import { MercadoPagoService } from "../../../infrastructure/payments/services/mercado-pago.service";
import { CreditTransactionKind } from "../../credits/entities/credit-transaction.entity";
import { CreditWalletService } from "../../credits/services/credit-wallet.service";
import { Customer } from "../../customers/entities/customer.entity";
import { Deal } from "../../deals/entities/deal.entity";
import { DealStatus } from "../../deals/enums/deal.enum";
import { Property } from "../../properties/entities/property.entity";
import { PropertyHunt } from "../../property-hunts/entities/property-hunt.entity";
import {
  buildSubscriptionPlans,
  SubscriptionPlan,
  TRIAL_PLAN_KEY,
} from "../constants/subscription-plans.constant";
import { SubscriptionPayment } from "../entities/subscription-payment.entity";
import { Subscription } from "../entities/subscription.entity";
import {
  PlanLimitResource,
  SubscriptionAccessStatus,
  SubscriptionPaymentStatus,
  SubscriptionPlanKey,
} from "../enums/subscription.enum";
import {
  graceEndsAt,
  hasAccess,
  resolveAccessStatus,
  SubscriptionTimeline,
} from "../helpers/subscription-period.helper";

/** Access is checked on every request, a short memory spares the database. */
const ACCESS_CACHE_MILLISECONDS = 30_000;

const ACTIVE_PREAPPROVAL_STATUSES = new Set(["authorized", "pending"]);

const LIMIT_LABELS: Record<PlanLimitResource, string> = {
  [PlanLimitResource.CUSTOMERS]: "clientes",
  [PlanLimitResource.PROPERTIES]: "imóveis",
  [PlanLimitResource.OPEN_DEALS]: "negociações abertas",
  [PlanLimitResource.PROPERTY_HUNTS_PER_MONTH]: "caças de imóveis no mês",
};

export interface AccessSnapshot {
  status: SubscriptionAccessStatus;
  plan: SubscriptionPlan;
}

export type PlanUsage = Record<PlanLimitResource, number>;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  readonly plans: SubscriptionPlan[];
  private readonly accessCache = new Map<
    string,
    { expiresAt: number; snapshot: AccessSnapshot }
  >();

  constructor(
    @Inject(subscriptionsConfig.KEY)
    private readonly configuration: ConfigType<typeof subscriptionsConfig>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPayment)
    private readonly paymentRepository: Repository<SubscriptionPayment>,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly walletService: CreditWalletService,
    private readonly dataSource: DataSource,
  ) {
    this.plans = buildSubscriptionPlans(configuration);
    if (!this.billingEnabled) {
      this.logger.warn(
        "MERCADO_PAGO_ACCESS_TOKEN is empty: billing is off, nobody is blocked nor limited by plan until it is set",
      );
    }
  }

  /**
   * Without Mercado Pago nobody could pay, so the subscription never closes
   * the app nor limits anything: the platform works as before billing.
   */
  get billingEnabled() {
    return this.mercadoPagoService.isConfigured;
  }

  get trialDays() {
    return this.configuration.trialDays;
  }

  get trialCredits() {
    return this.configuration.trialCredits;
  }

  get graceDays() {
    return this.configuration.graceDays;
  }

  get renewalWindowDays() {
    return this.configuration.renewalWindowDays;
  }

  findPlan(key: SubscriptionPlanKey) {
    const plan = this.plans.find((candidate) => candidate.key === key);
    if (!plan) throw new Error(`Unknown plan ${key}`);
    return plan;
  }

  /**
   * The first visit of an account starts its free trial with the gift
   * credits. Both go in one transaction: a second request racing on the
   * unique userId rolls back, so the gift is given once.
   */
  async findOrCreate(userId: string) {
    const existing = await this.subscriptionRepository.findOneBy({ userId });
    if (existing) return existing;

    const trialCredits = this.configuration.trialCredits;
    if (trialCredits > 0) await this.walletService.findOrCreate(userId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const subscription = await manager.save(
          manager.create(Subscription, {
            userId,
            trialEndsAt: dayjs()
              .add(this.configuration.trialDays, "day")
              .toDate(),
          }),
        );
        if (trialCredits > 0) {
          await this.walletService.applyChange(manager, userId, {
            kind: CreditTransactionKind.BONUS,
            amount: trialCredits,
            description: `Presente do teste grátis: ${trialCredits} créditos de IA`,
            referenceId: subscription.id,
          });
        }
        return subscription;
      });
    } catch {
      // Another request created it at the same time.
      return this.subscriptionRepository.findOneByOrFail({ userId });
    }
  }

  isCardActive(subscription: Subscription) {
    return Boolean(
      subscription.providerPreapprovalId &&
      subscription.providerPreapprovalStatus &&
      ACTIVE_PREAPPROVAL_STATUSES.has(subscription.providerPreapprovalStatus),
    );
  }

  timelineOf(subscription: Subscription): SubscriptionTimeline {
    const cardActive = this.isCardActive(subscription);
    return {
      trialEndsAt: subscription.trialEndsAt,
      paidThrough: subscription.paidThrough,
      canceledAt: subscription.canceledAt,
      firstCardChargeDueAt:
        cardActive && !subscription.paidThrough && subscription.cardSubscribedAt
          ? new Date(
              Math.max(
                subscription.trialEndsAt.getTime(),
                subscription.cardSubscribedAt.getTime(),
              ),
            )
          : null,
    };
  }

  statusOf(subscription: Subscription, now = new Date()) {
    return resolveAccessStatus(
      this.timelineOf(subscription),
      now,
      this.configuration.graceDays,
    );
  }

  graceEndOf(subscription: Subscription) {
    return graceEndsAt(
      this.timelineOf(subscription),
      this.configuration.graceDays,
    );
  }

  /** The plan in force: the paid month running now, or the last one paid. */
  async effectivePlan(subscription: Subscription, now = new Date()) {
    const status = this.statusOf(subscription, now);

    const covering = await this.paymentRepository.findOne({
      where: {
        userId: subscription.userId,
        status: SubscriptionPaymentStatus.PAID,
        periodStart: LessThanOrEqual(now),
        periodEnd: MoreThan(now),
      },
      order: { periodEnd: "DESC" },
    });
    if (covering) return this.findPlan(covering.planKey);

    if (
      status === SubscriptionAccessStatus.TRIALING &&
      !subscription.paidThrough
    ) {
      return this.findPlan(TRIAL_PLAN_KEY);
    }

    const latestPaid = await this.paymentRepository.findOne({
      where: {
        userId: subscription.userId,
        status: SubscriptionPaymentStatus.PAID,
      },
      order: { periodEnd: "DESC" },
    });
    if (latestPaid) return this.findPlan(latestPaid.planKey);

    return this.findPlan(subscription.planKey ?? TRIAL_PLAN_KEY);
  }

  async snapshot(userId: string): Promise<AccessSnapshot> {
    const cached = this.accessCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

    const subscription = await this.findOrCreate(userId);
    const snapshot = {
      status: this.statusOf(subscription),
      plan: await this.effectivePlan(subscription),
    };
    this.accessCache.set(userId, {
      expiresAt: Date.now() + ACCESS_CACHE_MILLISECONDS,
      snapshot,
    });
    return snapshot;
  }

  /** Whether the broker may use the app now, for work done in background. */
  async isActive(userId: string) {
    if (!this.billingEnabled) return true;
    return hasAccess((await this.snapshot(userId)).status);
  }

  invalidate(userId: string) {
    this.accessCache.delete(userId);
  }

  /**
   * 402 with code subscription_inactive closes the app until the broker pays,
   * 403 with code plan_limit_reached refuses one more record over the plan.
   */
  async assertAccess(
    userId: string,
    limit: { resource: PlanLimitResource; adding: number } | null,
  ) {
    if (!this.billingEnabled) return;

    const snapshot = await this.snapshot(userId);

    if (!hasAccess(snapshot.status)) {
      throw new HttpException(
        {
          message:
            "Sua assinatura não está ativa. Escolha um plano para continuar usando a plataforma, seus dados estão guardados.",
          code: "subscription_inactive",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (!limit) return;

    const maximum = snapshot.plan.limits[limit.resource];
    if (maximum === null) return;

    const used = await this.countUsage(userId, limit.resource);
    if (used + limit.adding <= maximum) return;

    const message =
      maximum === 0
        ? `Esse recurso não faz parte do plano ${snapshot.plan.name}. Troque de plano para usar.`
        : `Seu plano ${snapshot.plan.name} permite até ${maximum.toLocaleString("pt-BR")} ${LIMIT_LABELS[limit.resource]} e você já tem ${used.toLocaleString("pt-BR")}. Troque de plano para continuar.`;

    throw new ForbiddenException({
      message,
      code: "plan_limit_reached",
      resource: limit.resource,
      limit: maximum,
      used,
    });
  }

  async usage(userId: string): Promise<PlanUsage> {
    const resources = Object.values(PlanLimitResource);
    const counts = await Promise.all(
      resources.map((resource) => this.countUsage(userId, resource)),
    );
    return Object.fromEntries(
      resources.map((resource, index) => [resource, counts[index]]),
    ) as PlanUsage;
  }

  private countUsage(userId: string, resource: PlanLimitResource) {
    switch (resource) {
      case PlanLimitResource.CUSTOMERS:
        return this.dataSource
          .getRepository(Customer)
          .countBy({ userId, active: true });
      case PlanLimitResource.PROPERTIES:
        return this.dataSource
          .getRepository(Property)
          .countBy({ userId, active: true });
      case PlanLimitResource.OPEN_DEALS:
        return this.dataSource
          .getRepository(Deal)
          .countBy({ userId, active: true, status: DealStatus.OPEN });
      case PlanLimitResource.PROPERTY_HUNTS_PER_MONTH:
        return this.dataSource.getRepository(PropertyHunt).countBy({
          userId,
          createdAt: MoreThanOrEqual(dayjs().startOf("month").toDate()),
        });
    }
  }
}
