import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { portalsConfig } from "../../../config/portals.config";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { CreditWalletService } from "../../credits/services/credit-wallet.service";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerCommentService } from "../../customers/services/customer-comment.service";
import { ConversationService } from "../../inbox/services/conversation.service";
import { User } from "../../users/entities/user.entity";
import {
  PORTAL_KEYS,
  PORTAL_SEARCH_ENABLED,
} from "../constants/portals.constant";
import {
  PropertyHuntCreateDto,
  PropertyHuntFilterDto,
} from "../dtos/property-hunt.dto";
import { PropertyHunt } from "../entities/property-hunt.entity";
import {
  PortalProgressStatus,
  PropertyHuntOrigin,
  PropertyHuntStatus,
} from "../enums/property-hunt.enum";
import { PropertyHuntMapper } from "../mappers/property-hunt.mapper";
import { HuntAiService, sanitizeCriteria } from "./hunt-ai.service";
import { PortalBrowserService } from "./portal-browser.service";
import { PropertyHuntRunnerService } from "./property-hunt-runner.service";

/** Analyses a hunt must afford before it starts, so it does not stop at once. */
const MINIMUM_LISTINGS_AFFORDED = 3;

@Injectable()
export class PropertyHuntService {
  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
    @InjectRepository(PropertyHunt)
    private readonly huntRepository: Repository<PropertyHunt>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly huntAiService: HuntAiService,
    private readonly runner: PropertyHuntRunnerService,
    private readonly browserService: PortalBrowserService,
    private readonly pricingService: CreditPricingService,
    private readonly walletService: CreditWalletService,
    private readonly conversationService: ConversationService,
    private readonly customerCommentService: CustomerCommentService,
  ) {}

  /** What a hunt costs, shown before the broker starts one. */
  estimate() {
    return {
      browserReady: this.browserService.isAvailable,
      listingsPerPortal: this.configuration.listingsPerPortal,
      pricePerListing: this.huntAiService.pricePerListing,
      interpretPrice: this.pricingService.featurePrice("hunt_criteria"),
      conversationPrice: this.pricingService.featurePrice("hunt_conversation"),
      portalSearchEnabled: PORTAL_SEARCH_ENABLED,
      portals: PORTAL_SEARCH_ENABLED ? PORTAL_KEYS : [],
    };
  }

  interpret(user: User, request: string) {
    return this.huntAiService.interpretRequest(user, request);
  }

  async interpretConversation(user: User, conversationId: string) {
    const conversation = await this.conversationService.findEntity(
      user.id,
      conversationId,
    );
    return this.huntAiService.interpretConversation(user, conversation);
  }

  async create(user: User, dto: PropertyHuntCreateDto) {
    // While the portal search is off, a hunt only looks in the catalog.
    const portals = PORTAL_SEARCH_ENABLED ? [...new Set(dto.portals)] : [];
    if (!portals.length && !dto.includeCatalog) {
      throw new BadRequestException(
        PORTAL_SEARCH_ENABLED
          ? "Escolha pelo menos um portal ou a sua carteira."
          : "A busca nos portais chega em breve. Por enquanto, a caça procura na sua carteira.",
      );
    }
    if (portals.length) {
      await this.walletService.ensureBalance(
        user.id,
        this.huntAiService.pricePerListing * MINIMUM_LISTINGS_AFFORDED,
      );
    }

    let conversationCustomerId: string | null = null;
    if (dto.conversationId) {
      const conversation = await this.conversationService.findEntity(
        user.id,
        dto.conversationId,
      );
      conversationCustomerId = conversation.customerId;
    }

    const customerId = dto.customerId ?? conversationCustomerId;
    const customer = customerId
      ? await this.customerRepository.findOneBy({
          id: customerId,
          userId: user.id,
          active: true,
        })
      : null;
    if (customerId && !customer) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    const hunt = await this.huntRepository.save(
      this.huntRepository.create({
        userId: user.id,
        customerId: customer?.id ?? null,
        conversationId: dto.conversationId ?? null,
        origin: dto.conversationId
          ? PropertyHuntOrigin.CONVERSATION
          : customer
            ? PropertyHuntOrigin.CUSTOMER
            : PropertyHuntOrigin.MANUAL,
        request: dto.request,
        headline: dto.headline?.trim() || null,
        summary: dto.summary?.trim() || null,
        criteria: sanitizeCriteria(dto.criteria),
        portals,
        includeCatalog: dto.includeCatalog,
        status: PropertyHuntStatus.QUEUED,
        progress: portals.map((portal) => ({
          portal,
          status: PortalProgressStatus.WAITING,
          authenticated: false,
          found: 0,
          analyzed: 0,
          reused: 0,
          matched: 0,
          message: null,
        })),
        catalogMatches: 0,
        portalMatches: 0,
        creditsCharged: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      }),
    );

    if (customer && dto.summary?.trim() && dto.saveSummaryAsNote) {
      await this.customerCommentService
        .save(user, customer.id, {
          comment: `🔎 Perfil para a caça de imóveis (IA):\n${dto.summary.trim()}`,
        })
        .catch(() => undefined);
    }

    this.runner.enqueue(hunt.id);
    hunt.customer = customer;
    return PropertyHuntMapper.toHuntDto(hunt);
  }

  async findAll(user: User, filter: PropertyHuntFilterDto) {
    const [hunts, total] = await this.huntRepository.findAndCount({
      where: {
        userId: user.id,
        active: true,
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
      },
      relations: { customer: true },
      order: { createdAt: "DESC" },
      skip: filter.skip,
      take: filter.limit,
    });
    return PaginationMapper.toDto(
      [hunts.map((hunt) => PropertyHuntMapper.toHuntDto(hunt)), total],
      filter,
    );
  }

  async findOne(user: User, id: string) {
    const hunt = await this.findEntity(user.id, id);
    return {
      ...PropertyHuntMapper.toHuntDto(hunt),
      queuePosition: this.runner.positionOf(hunt.id),
    };
  }

  async cancel(user: User, id: string) {
    const hunt = await this.findEntity(user.id, id);
    const { wasRunning } = this.runner.cancel(hunt.id);
    if (!wasRunning && hunt.status === PropertyHuntStatus.QUEUED) {
      hunt.status = PropertyHuntStatus.CANCELLED;
      hunt.finishedAt = new Date();
      await this.huntRepository.save(hunt);
    }
    return PropertyHuntMapper.toHuntDto(hunt);
  }

  async remove(user: User, id: string) {
    const hunt = await this.findEntity(user.id, id);
    this.runner.cancel(hunt.id);
    await this.huntRepository.update({ id: hunt.id }, { active: false });
  }

  private async findEntity(userId: string, id: string) {
    const hunt = await this.huntRepository.findOne({
      where: { id, userId, active: true },
      relations: { customer: true },
    });
    if (!hunt) throw new NotFoundException("Busca não encontrada.");
    return hunt;
  }
}
