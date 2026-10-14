import {
  customerAddressOf,
  isFromPortal,
} from "../../properties/helpers/customer-safe.helper";
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import {
  Between,
  Brackets,
  FindOptionsWhere,
  In,
  Like,
  Repository,
} from "typeorm";
import { appConfig } from "../../../config/app.config";
import { CustomerComment } from "../../customers/entities/customer-comments.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { DealChecklistItem } from "../../deals/entities/deal-checklist-item.entity";
import { Deal } from "../../deals/entities/deal.entity";
import {
  Document,
  DocumentOwnerType,
} from "../../documents/entities/document.entity";
import { Conversation } from "../../inbox/entities/conversation.entity";
import { Message } from "../../inbox/entities/message.entity";
import {
  MessageDirection,
  MessageMediaStatus,
  MessageType,
} from "../../inbox/enums/inbox.enum";
import {
  DEAL_STAGE_LABELS,
  DealParty,
  DealStatus,
} from "../../deals/enums/deal.enum";
import {
  formatBrl,
  KIND_LABEL,
} from "../../inbox/helpers/property-pitch.helper";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import {
  PropertyMedia,
  PropertyMediaType,
} from "../../properties/entities/property-media.entity";
import { Property } from "../../properties/entities/property.entity";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import { Visit } from "../../visits/entities/visit.entity";
import { AssistantToolName } from "../constants/assistant-tools.constant";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { AssistantDocumentService } from "./assistant-document.service";
import {
  AssistantPaidActionService,
  PaidActionDraft,
} from "./assistant-paid-action.service";
import {
  AssistantAction,
  AssistantActionPayload,
  AssistantAttachment,
  DealDocumentLink,
} from "../entities/assistant-action.entity";
import { AssistantReference } from "../entities/assistant-message.entity";
import {
  AssistantActionKind,
  AssistantActionStatus,
  AssistantReferenceType,
} from "../enums/assistant.enum";
import {
  DEFAULT_TIMEZONE,
  FILE_MESSAGE_TYPES,
  formatDay,
  formatWhen,
  inTimezone,
  shorten,
  transcriptOf,
} from "../helpers/assistant-format.helper";
import {
  CustomerWarmth,
  customerWarmthOf,
  WARMTH_LABEL,
} from "../helpers/customer-warmth.helper";
import {
  booleanOf,
  limitOf,
  numberOf,
  propertyTitleOf,
  requireId,
  textOf,
  ToolArguments,
} from "../helpers/tool-arguments.helper";

/** What one question gathered while the tools ran. */
export interface AssistantToolContext {
  actionIds: string[];
  references: Map<string, AssistantReference>;
}

const CONVERSATION_MESSAGES = 25;
const CONVERSATION_FILES = 40;
const DEAL_DOCUMENTS_PER_PROPOSAL = 20;
const DEAL_PARTIES = new Set<string>(Object.values(DealParty));
const FILE_KIND_LABEL: Partial<Record<MessageType, string>> = {
  [MessageType.IMAGE]: "foto",
  [MessageType.VIDEO]: "vídeo",
  [MessageType.DOCUMENT]: "documento",
};
const CUSTOMER_MESSAGES = 15;
const MAXIMUM_VISIT_RANGE_DAYS = 92;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const WARMTH_VALUES = new Set<CustomerWarmth>([
  "new",
  "hot",
  "warm",
  "cooling",
  "cold",
]);

const describeSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Runs the tools the assistant calls. Every query is limited to the broker
 * asking, and the tools that change something only prepare an action for
 * the broker to confirm.
 */
@Injectable()
export class AssistantToolService {
  private readonly logger = new Logger(AssistantToolService.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly applicationConfiguration: ConfigType<typeof appConfig>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerComment)
    private readonly commentRepository: Repository<CustomerComment>,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(AssistantAction)
    private readonly actionRepository: Repository<AssistantAction>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(PropertyMedia)
    private readonly mediaRepository: Repository<PropertyMedia>,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(DealChecklistItem)
    private readonly checklistRepository: Repository<DealChecklistItem>,
    private readonly documentService: AssistantDocumentService,
    private readonly storageService: StorageService,
    private readonly paidActionService: AssistantPaidActionService,
  ) {}

  get timezone() {
    return this.applicationConfiguration.timezone || DEFAULT_TIMEZONE;
  }

  /** Never throws: errors go back to the model so it can explain or retry. */
  async run(
    user: User,
    name: string,
    argumentsJson: string,
    context: AssistantToolContext,
  ): Promise<unknown> {
    let parameters: ToolArguments;
    try {
      parameters = JSON.parse(argumentsJson) as ToolArguments;
    } catch {
      return { error: "Argumentos inválidos." };
    }

    try {
      return await this.dispatch(
        user,
        name as AssistantToolName,
        parameters,
        context,
      );
    } catch (error) {
      if (error instanceof HttpException) return { error: error.message };
      this.logger.error(`Assistant tool ${name} failed: ${String(error)}`);
      return { error: "Não consegui consultar isso agora." };
    }
  }

  private async dispatch(
    user: User,
    name: AssistantToolName,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    switch (name) {
      case "list_stages":
        return this.listStages(user);
      case "search_customers":
        return this.searchCustomers(user, parameters, context);
      case "get_customer":
        return this.getCustomer(user, parameters, context);
      case "list_visits":
        return this.listVisits(user, parameters, context);
      case "search_properties":
        return this.searchProperties(user, parameters, context);
      case "search_conversations":
        return this.searchConversations(user, parameters, context);
      case "get_conversation":
        return this.getConversation(user, parameters, context);
      case "list_files":
        return this.listFiles(user, parameters);
      case "list_conversation_files":
        return this.listConversationFiles(user, parameters, context);
      case "list_deals":
        return this.listDeals(user, parameters);
      case "propose_deal_documents":
        return this.proposeDealDocuments(user, parameters, context);
      case "generate_document":
        return this.generateDocument(user, parameters, context);
      case "propose_whatsapp_message":
        return this.proposeWhatsappMessage(user, parameters, context);
      case "propose_visit":
        return this.proposeVisit(user, parameters, context);
      case "propose_customer_note":
        return this.proposeCustomerNote(user, parameters, context);
      case "propose_stage_change":
        return this.proposeStageChange(user, parameters, context);
      case "propose_lost_status":
        return this.proposeLostStatus(user, parameters, context);
      case "list_whatsapp_contacts":
        return this.paidActionService.listWhatsappContacts(
          user,
          parameters,
          this.timezone,
        );
      case "list_certificates":
        return this.paidActionService.listCertificates(
          user,
          parameters,
          this.timezone,
        );
      case "propose_property_hunt":
        return this.proposeDraft(
          user,
          context,
          await this.paidActionService.prepareHunt(user, parameters),
        );
      case "propose_owner_search":
        return this.proposeDraft(
          user,
          context,
          await this.paidActionService.prepareOwnerSearch(user, parameters),
        );
      case "propose_contact_import":
        return this.proposeDraft(
          user,
          context,
          await this.paidActionService.prepareContactImport(user, parameters),
        );
      case "propose_certificate_lookup":
        return this.proposeDraft(
          user,
          context,
          await this.paidActionService.prepareCertificateLookup(
            user,
            parameters,
          ),
        );
      default:
        throw new BadRequestException(
          `Ferramenta desconhecida: ${String(name)}.`,
        );
    }
  }

  private async listStages(user: User) {
    const stages = await this.kanbanRepository.find({
      where: { userId: user.id, active: true },
      order: { order: "ASC" },
    });
    return {
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
      })),
    };
  }

  private async searchCustomers(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const where: FindOptionsWhere<Customer> = { userId: user.id, active: true };
    if (!booleanOf(parameters.includeLost)) where.lost = false;
    const stageId = textOf(parameters.stageId);
    if (stageId) where.kanban = { id: requireId(stageId, "etapa") };

    const search = textOf(parameters.search);
    const searchDigits = search?.replace(/\D/g, "") ?? "";
    const customers = await this.customerRepository.find({
      where: search
        ? [
            { ...where, name: Like(`%${search}%`) },
            ...(searchDigits.length >= 3
              ? [{ ...where, phone: Like(`%${searchDigits}%`) }]
              : []),
          ]
        : where,
      relations: { kanban: true, comments: true, visits: true },
    });

    const conversations = customers.length
      ? await this.conversationRepository.find({
          where: {
            userId: user.id,
            customerId: In(customers.map((customer) => customer.id)),
            active: true,
          },
        })
      : [];
    const conversationByCustomer = new Map(
      conversations.map((conversation) => [
        conversation.customerId,
        conversation,
      ]),
    );

    const warmthFilter = Array.isArray(parameters.warmth)
      ? new Set(
          parameters.warmth.filter((value): value is CustomerWarmth =>
            WARMTH_VALUES.has(value as CustomerWarmth),
          ),
        )
      : null;
    const waitingForReply = booleanOf(parameters.waitingForReply);
    const minimumBudget = numberOf(parameters.minimumBudget);
    const maximumBudget = numberOf(parameters.maximumBudget);

    const rows = customers
      .map((customer) => {
        const notes = (customer.comments ?? []).filter(
          (note) => note.active !== false,
        );
        const insight = customerWarmthOf({
          createdAt: customer.createdAt,
          notes,
          visits: customer.visits ?? [],
        });
        return {
          customer,
          notes,
          insight,
          conversation: conversationByCustomer.get(customer.id) ?? null,
        };
      })
      .filter((row) => {
        if (warmthFilter?.size && !warmthFilter.has(row.insight.warmth)) {
          return false;
        }
        const clientSpokeLast =
          row.conversation?.lastMessageDirection === MessageDirection.INBOUND;
        if (waitingForReply === true && !clientSpokeLast) return false;
        if (waitingForReply === false && clientSpokeLast) return false;
        const budget = Number(row.customer.budget);
        if (minimumBudget !== null && !(budget >= minimumBudget)) return false;
        if (maximumBudget !== null && !(budget <= maximumBudget)) return false;
        return true;
      })
      .sort(
        (first, second) =>
          (first.insight.daysSinceActivity ?? Infinity) -
          (second.insight.daysSinceActivity ?? Infinity),
      );

    const shown = rows.slice(0, limitOf(parameters.limit, 15, 30));
    shown.forEach((row) =>
      this.remember(context, {
        type: AssistantReferenceType.CUSTOMER,
        id: row.customer.id,
        label: row.customer.name,
      }),
    );

    return {
      total: rows.length,
      customers: shown.map(({ customer, notes, insight, conversation }) => {
        const lastNote = [...notes].sort(
          (first, second) =>
            second.createdAt.getTime() - first.createdAt.getTime(),
        )[0];
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          stage: customer.kanban?.name ?? null,
          budget: formatBrl(customer.budget),
          lost: customer.lost,
          warmth: WARMTH_LABEL[insight.warmth],
          daysWithoutActivity: insight.daysSinceActivity,
          nextVisit: insight.nextVisit
            ? formatWhen(insight.nextVisit.startsAt, this.timezone)
            : null,
          lastNote: lastNote
            ? {
                date: formatDay(lastNote.createdAt, this.timezone),
                text: shorten(lastNote.comment, 160),
              }
            : null,
          whatsapp: conversation
            ? {
                conversationId: conversation.id,
                lastMessageAt: conversation.lastMessageAt
                  ? formatWhen(conversation.lastMessageAt, this.timezone)
                  : null,
                lastMessageFrom:
                  conversation.lastMessageDirection === MessageDirection.INBOUND
                    ? "cliente"
                    : conversation.lastMessageDirection
                      ? "corretor"
                      : null,
              }
            : null,
        };
      }),
    };
  }

  private async getCustomer(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const customer = await this.findCustomer(
      user,
      requireId(parameters.customerId, "cliente"),
    );
    const [notes, visits, conversation] = await Promise.all([
      this.commentRepository.find({
        where: { customer: { id: customer.id }, active: true },
        order: { createdAt: "DESC" },
        take: 10,
      }),
      this.visitRepository.find({
        where: { userId: user.id, customerId: customer.id },
        relations: { property: true },
        order: { startsAt: "DESC" },
      }),
      this.conversationRepository.findOne({
        where: { userId: user.id, customerId: customer.id, active: true },
      }),
    ]);

    const messages = conversation
      ? await this.messageRepository.find({
          where: { conversationId: conversation.id, userId: user.id },
          order: { sentAt: "DESC" },
          take: CUSTOMER_MESSAGES,
        })
      : [];

    const insight = customerWarmthOf({
      createdAt: customer.createdAt,
      notes,
      visits,
    });
    const now = new Date();

    this.remember(context, {
      type: AssistantReferenceType.CUSTOMER,
      id: customer.id,
      label: customer.name,
    });

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      stage: customer.kanban?.name ?? null,
      budget: formatBrl(customer.budget),
      lost: customer.lost,
      warmth: WARMTH_LABEL[insight.warmth],
      daysWithoutActivity: insight.daysSinceActivity,
      notes: notes.map((note) => ({
        date: formatDay(note.createdAt, this.timezone),
        text: shorten(note.comment, 400),
      })),
      upcomingVisits: visits
        .filter((visit) => visit.endsAt > now)
        .reverse()
        .map((visit) => this.describeVisit(visit)),
      pastVisits: visits
        .filter((visit) => visit.endsAt <= now)
        .slice(0, 3)
        .map((visit) => this.describeVisit(visit)),
      whatsapp: conversation
        ? {
            conversationId: conversation.id,
            messages: transcriptOf(messages, this.timezone),
          }
        : null,
    };
  }

  private async listVisits(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const from = textOf(parameters.from);
    const to = textOf(parameters.to);
    if (!from || !to || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      throw new BadRequestException("Use datas no formato AAAA-MM-DD.");
    }

    const start = dayjs.tz(from, this.timezone).startOf("day");
    const end = dayjs.tz(to, this.timezone).endOf("day");
    if (end.isBefore(start)) {
      throw new BadRequestException("A data final vem antes da inicial.");
    }
    if (end.diff(start, "day") > MAXIMUM_VISIT_RANGE_DAYS) {
      throw new BadRequestException("Peça no máximo três meses por vez.");
    }

    const visits = await this.visitRepository.find({
      where: {
        userId: user.id,
        startsAt: Between(start.toDate(), end.toDate()),
      },
      relations: { customer: true, property: true },
      order: { startsAt: "ASC" },
    });

    visits.forEach((visit) =>
      this.remember(context, {
        type: AssistantReferenceType.CUSTOMER,
        id: visit.customerId,
        label: visit.customer.name,
      }),
    );

    return {
      from: formatDay(start.toDate(), this.timezone),
      to: formatDay(end.toDate(), this.timezone),
      total: visits.length,
      visits: visits.map((visit) => ({
        ...this.describeVisit(visit),
        customer: { id: visit.customerId, name: visit.customer.name },
      })),
    };
  }

  private async searchProperties(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const query = this.propertyRepository
      .createQueryBuilder("property")
      .where("property.userId = :userId", { userId: user.id })
      .andWhere("property.active = :active", { active: true });

    const search = textOf(parameters.search);
    if (search) {
      query.andWhere(
        "(property.address LIKE :search OR property.address2 LIKE :search OR property.alias LIKE :search)",
        { search: `%${search}%` },
      );
    }

    const kind = textOf(parameters.kind);
    if (kind && Object.values<string>(PropertyKindEnum).includes(kind)) {
      query.andWhere("property.kind = :kind", { kind });
    }

    const numericFilters: [unknown, string, string][] = [
      [
        parameters.minimumBedrooms,
        "property.infoBedrooms >=",
        "minimumBedrooms",
      ],
      [
        parameters.maximumBedrooms,
        "property.infoBedrooms <=",
        "maximumBedrooms",
      ],
      [parameters.minimumPrice, "property.price >=", "minimumPrice"],
      [parameters.maximumPrice, "property.price <=", "maximumPrice"],
      [
        parameters.minimumSquareMeters,
        "property.infoSquareMeters >=",
        "minimumSquareMeters",
      ],
      [
        parameters.minimumParkingSpaces,
        "property.infoParkingSpaceUnits >=",
        "minimumParkingSpaces",
      ],
    ];
    numericFilters.forEach(([value, condition, parameterName]) => {
      const number = numberOf(value);
      if (number !== null) {
        query.andWhere(`${condition} :${parameterName}`, {
          [parameterName]: number,
        });
      }
    });

    const [properties, total] = await query
      .orderBy("property.price", "ASC")
      .take(limitOf(parameters.limit, 10, 20))
      .getManyAndCount();

    properties.forEach((property) =>
      this.remember(context, {
        type: AssistantReferenceType.PROPERTY,
        id: property.id,
        label: propertyTitleOf(property),
      }),
    );

    return {
      total,
      properties: properties.map((property) => ({
        id: property.id,
        title: propertyTitleOf(property),
        kind: property.kind ? KIND_LABEL[property.kind] : null,
        address: customerAddressOf(property),
        ...(isFromPortal(property)
          ? {
              privacy:
                "Garimpado em portal: endereço completo, link do anúncio e contato do anunciante são só do corretor. Nunca envie ao cliente.",
            }
          : {}),
        price: formatBrl(property.price),
        bedrooms: property.infoBedrooms,
        suites: property.infoSuiteBedrooms,
        bathrooms: property.infoBathrooms,
        squareMeters: property.infoSquareMeters
          ? Number(property.infoSquareMeters)
          : null,
        parkingSpaces: property.infoParkingSpaceUnits,
        condominiumFee: formatBrl(property.infoMaintenanceFee),
        publicLink: this.publicLinkOf(property.id),
      })),
    };
  }

  private async searchConversations(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const keywords = (
      Array.isArray(parameters.keywords) ? parameters.keywords : []
    )
      .map((keyword) => textOf(keyword))
      .filter((keyword): keyword is string => Boolean(keyword))
      .filter((keyword) => keyword.length >= 2)
      .slice(0, 12);
    if (!keywords.length) {
      throw new BadRequestException("Informe ao menos uma palavra.");
    }

    const days = limitOf(parameters.days, 30, 180);
    const messages = await this.messageRepository
      .createQueryBuilder("message")
      .innerJoinAndSelect("message.conversation", "conversation")
      .leftJoinAndSelect("conversation.customer", "customer")
      .where("message.userId = :userId", { userId: user.id })
      .andWhere("message.direction = :direction", {
        direction: MessageDirection.INBOUND,
      })
      .andWhere("message.sentAt >= :since", {
        since: dayjs().subtract(days, "day").toDate(),
      })
      .andWhere("conversation.active = :active", { active: true })
      .andWhere("conversation.hidden = :hidden", { hidden: false })
      .andWhere(
        new Brackets((builder) => {
          keywords.forEach((keyword, index) => {
            builder.orWhere(`message.body LIKE :keyword${index}`, {
              [`keyword${index}`]: `%${keyword}%`,
            });
          });
        }),
      )
      .orderBy("message.sentAt", "DESC")
      .limit(120)
      .getMany();

    const byConversation = new Map<
      string,
      { conversation: Conversation; matches: Message[] }
    >();
    messages.forEach((message) => {
      const group = byConversation.get(message.conversationId) ?? {
        conversation: message.conversation,
        matches: [],
      };
      group.matches.push(message);
      byConversation.set(message.conversationId, group);
    });

    const groups = [...byConversation.values()].slice(0, 20);
    groups.forEach(({ conversation }) =>
      this.remember(context, this.conversationReference(conversation)),
    );

    return {
      total: byConversation.size,
      conversations: groups.map(({ conversation, matches }) => ({
        conversationId: conversation.id,
        customerId: conversation.customerId,
        name: this.conversationName(conversation),
        lastMessageFrom:
          conversation.lastMessageDirection === MessageDirection.INBOUND
            ? "cliente"
            : "corretor",
        matches: matches.slice(0, 3).map((message) => ({
          date: formatWhen(message.sentAt, this.timezone),
          text: shorten(message.body, 240),
        })),
      })),
    };
  }

  private async getConversation(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const conversation = await this.findConversation(
      user,
      requireId(parameters.conversationId, "conversa"),
    );
    const messages = await this.messageRepository.find({
      where: { conversationId: conversation.id, userId: user.id },
      order: { sentAt: "DESC" },
      take: CONVERSATION_MESSAGES,
    });

    this.remember(context, this.conversationReference(conversation));

    return {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      name: this.conversationName(conversation),
      messages: transcriptOf(messages, this.timezone),
    };
  }

  /** Files of a chat, so the model can name them and keep them somewhere. */
  private async listConversationFiles(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const conversationId = textOf(parameters.conversationId);
    const customerId = textOf(parameters.customerId);
    let conversation: Conversation;
    if (conversationId) {
      conversation = await this.findConversation(
        user,
        requireId(conversationId, "conversa"),
      );
    } else if (customerId) {
      const customer = await this.findCustomer(
        user,
        requireId(customerId, "cliente"),
      );
      const found = await this.conversationRepository.findOne({
        where: { userId: user.id, customerId: customer.id, active: true },
        relations: { customer: true },
      });
      if (!found) {
        throw new NotFoundException("Esse cliente não tem conversa.");
      }
      conversation = found;
    } else {
      throw new BadRequestException("Informe a conversa ou o cliente.");
    }

    const days = limitOf(parameters.days, 90, 365);
    const messages = await this.messageRepository.find({
      where: {
        conversationId: conversation.id,
        userId: user.id,
        type: In([...FILE_MESSAGE_TYPES]),
        sentAt: Between(dayjs().subtract(days, "day").toDate(), new Date()),
      },
      order: { sentAt: "DESC" },
      take: CONVERSATION_FILES,
    });

    this.remember(context, this.conversationReference(conversation));

    return {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      name: this.conversationName(conversation),
      files: messages.map((message) => ({
        messageId: message.id,
        kind: FILE_KIND_LABEL[message.type] ?? "arquivo",
        fileName: message.fileName?.trim() || null,
        caption: message.body ? shorten(message.body, 200) : null,
        mimeType: message.mimeType,
        size:
          message.sizeBytes === null
            ? null
            : describeSize(Number(message.sizeBytes)),
        sentBy:
          message.direction === MessageDirection.INBOUND
            ? "contato"
            : "corretor",
        date: formatWhen(message.sentAt, this.timezone),
        available: message.mediaStatus === MessageMediaStatus.READY,
      })),
    };
  }

  /** Sales with their paperwork checklist, to know where each file goes. */
  private async listDeals(user: User, parameters: ToolArguments) {
    const customerId = textOf(parameters.customerId);
    const includeClosed = booleanOf(parameters.includeClosed) ?? false;
    const where: FindOptionsWhere<Deal> = { userId: user.id, active: true };
    if (customerId) where.customerId = requireId(customerId, "cliente");
    if (!includeClosed) where.status = DealStatus.OPEN;

    const deals = await this.dealRepository.find({
      where,
      relations: { customer: true, property: true, participants: true },
      order: { updatedAt: "DESC" },
      take: 10,
    });
    const items = deals.length
      ? await this.checklistRepository.find({
          where: { dealId: In(deals.map((deal) => deal.id)), active: true },
          order: { sortOrder: "ASC" },
        })
      : [];
    const files = await this.documentsOf(
      user,
      DocumentOwnerType.DEAL_ITEM,
      items.map((item) => item.id),
    );
    const filesByItem = new Map<string, number>();
    files.forEach((file) =>
      filesByItem.set(file.ownerId, (filesByItem.get(file.ownerId) ?? 0) + 1),
    );

    return {
      deals: deals.map((deal) => ({
        dealId: deal.id,
        title: this.dealTitleOf(deal),
        customerId: deal.customerId,
        stage: DEAL_STAGE_LABELS[deal.stage],
        status: deal.status,
        people: (deal.participants ?? [])
          .filter((participant) => participant.active)
          .map((participant) => ({
            participantId: participant.id,
            role: participant.role,
            name: participant.name,
          })),
        checklist: items
          .filter((item) => item.dealId === deal.id)
          .map((item) => ({
            checklistItemId: item.id,
            title: item.title,
            party: item.party,
            person:
              (deal.participants ?? []).find(
                (participant) =>
                  participant.active && participant.id === item.participantId,
              )?.name ?? null,
            status: item.status,
            files: filesByItem.get(item.id) ?? 0,
          })),
      })),
    };
  }

  /**
   * Prepares keeping chat files in the sale checklist. Every file and item
   * is checked now, so the card the broker confirms is the real outcome.
   */
  private async proposeDealDocuments(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const deal = await this.dealRepository.findOne({
      where: {
        id: requireId(parameters.dealId, "venda"),
        userId: user.id,
        active: true,
      },
      relations: { customer: true, property: true, participants: true },
    });
    if (!deal) throw new NotFoundException("Venda não encontrada.");
    if (deal.status !== DealStatus.OPEN) {
      throw new BadRequestException("Esta venda está encerrada.");
    }

    const requested = (Array.isArray(parameters.files) ? parameters.files : [])
      .filter(
        (file): file is ToolArguments => typeof file === "object" && !!file,
      )
      .slice(0, DEAL_DOCUMENTS_PER_PROPOSAL);
    if (!requested.length) {
      throw new BadRequestException("Informe ao menos um arquivo.");
    }

    const items = await this.checklistRepository.find({
      where: { dealId: deal.id, active: true },
    });
    const itemsById = new Map(items.map((item) => [item.id, item]));

    const links: DealDocumentLink[] = [];
    const seenMessages = new Set<string>();
    for (const file of requested) {
      const messageId = requireId(file.messageId, "arquivo");
      if (seenMessages.has(messageId)) continue;
      seenMessages.add(messageId);

      const message = await this.messageRepository.findOne({
        where: { id: messageId, userId: user.id },
      });
      if (!message || !FILE_MESSAGE_TYPES.has(message.type)) {
        throw new NotFoundException(`Arquivo ${messageId} não encontrado.`);
      }
      if (message.type === MessageType.VIDEO) {
        throw new BadRequestException(
          "Vídeos não entram nos documentos da venda.",
        );
      }
      if (message.mediaStatus !== MessageMediaStatus.READY) {
        throw new BadRequestException(
          `O arquivo ${message.fileName ?? messageId} ainda não foi baixado do WhatsApp.`,
        );
      }
      const fileName =
        message.fileName?.trim() ||
        `${FILE_KIND_LABEL[message.type] ?? "arquivo"} de ${formatDay(message.sentAt, this.timezone)}`;

      const checklistItemId = textOf(file.checklistItemId);
      if (checklistItemId) {
        const item = itemsById.get(checklistItemId);
        if (!item) {
          throw new NotFoundException(
            `Item ${checklistItemId} não é desta venda.`,
          );
        }
        links.push({
          messageId,
          fileName,
          checklistItemId: item.id,
          checklistItemTitle: item.title,
          newItemParty: null,
        });
        continue;
      }

      const newItemTitle = textOf(file.newItemTitle);
      const newItemParty = textOf(file.newItemParty);
      if (!newItemTitle || !newItemParty || !DEAL_PARTIES.has(newItemParty)) {
        throw new BadRequestException(
          "Para um item novo informe newItemTitle e newItemParty.",
        );
      }
      const participantId = textOf(file.newItemParticipantId);
      const participant = participantId
        ? (deal.participants ?? []).find(
            (person) => person.active && person.id === participantId,
          )
        : null;
      if (participantId && !participant) {
        throw new NotFoundException(
          `Pessoa ${participantId} não é desta venda.`,
        );
      }
      links.push({
        messageId,
        fileName,
        checklistItemId: null,
        checklistItemTitle: newItemTitle.substring(0, 255),
        newItemParty: participant
          ? (participant.role as string as DealParty)
          : (newItemParty as DealParty),
        newItemParticipantId: participant?.id ?? null,
      });
    }

    const dealTitle = this.dealTitleOf(deal);
    return this.propose(
      user,
      context,
      AssistantActionKind.LINK_DEAL_DOCUMENTS,
      links.length === 1
        ? `Guardar "${links[0].fileName}" na venda de ${dealTitle}`
        : `Guardar ${links.length} arquivos na venda de ${dealTitle}`,
      { dealId: deal.id, dealTitle, files: links },
    );
  }

  private dealTitleOf(deal: Deal) {
    return [
      deal.customer?.name,
      deal.property ? propertyTitleOf(deal.property) : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  private async listFiles(user: User, parameters: ToolArguments) {
    const customerId = textOf(parameters.customerId);
    const propertyId = textOf(parameters.propertyId);

    if (propertyId) {
      const property = await this.propertyRepository.findOneBy({
        id: requireId(propertyId, "imóvel"),
        userId: user.id,
        active: true,
      });
      if (!property) throw new NotFoundException("Imóvel não encontrado.");
      const [documents, media] = await Promise.all([
        this.documentsOf(user, DocumentOwnerType.PROPERTY, [property.id]),
        this.mediaRepository.find({
          where: {
            propertyId: property.id,
            userId: user.id,
            active: true,
            visibleToCustomer: true,
          },
          order: { isCover: "DESC", sortOrder: "ASC" },
        }),
      ]);
      return {
        property: propertyTitleOf(property),
        documents: documents.map((document) => this.describeFile(document)),
        photosAndVideos: media.map((item) => ({
          type: "property_media",
          id: item.id,
          name: item.displayName,
          kind: item.type === PropertyMediaType.VIDEO ? "vídeo" : "foto",
          cover: item.isCover,
          size: describeSize(Number(item.sizeBytes)),
        })),
      };
    }

    if (customerId) {
      const customer = await this.findCustomer(
        user,
        requireId(customerId, "cliente"),
      );
      const deals = await this.dealRepository.find({
        where: { customerId: customer.id, userId: user.id, active: true },
      });
      const dealIds = deals.map((deal) => deal.id);
      const items = dealIds.length
        ? await this.checklistRepository.find({
            where: { dealId: In(dealIds), active: true },
          })
        : [];
      const itemTitles = new Map(items.map((item) => [item.id, item.title]));
      const [own, dealFiles, itemFiles] = await Promise.all([
        this.documentsOf(user, DocumentOwnerType.CUSTOMER, [customer.id]),
        this.documentsOf(user, DocumentOwnerType.DEAL, dealIds),
        this.documentsOf(user, DocumentOwnerType.DEAL_ITEM, [
          ...itemTitles.keys(),
        ]),
      ]);
      return {
        customer: customer.name,
        documents: own.map((document) => this.describeFile(document)),
        saleDocuments: [
          ...dealFiles.map((document) => ({
            ...this.describeFile(document),
            about: "contrato e papéis da venda",
          })),
          ...itemFiles.map((document) => ({
            ...this.describeFile(document),
            about: itemTitles.get(document.ownerId) ?? "documento da venda",
          })),
        ],
      };
    }

    const recent = await this.documentRepository.find({
      where: {
        userId: user.id,
        ownerType: DocumentOwnerType.ASSISTANT,
        active: true,
      },
      order: { createdAt: "DESC" },
      take: 20,
    });
    return {
      recentFiles: recent.map((document) => this.describeFile(document)),
    };
  }

  private async generateDocument(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const customerId = textOf(parameters.customerId);
    const propertyId = textOf(parameters.propertyId);
    const { document, savedTo } = await this.documentService.generate(
      user,
      {
        title: textOf(parameters.title) ?? "",
        subtitle: textOf(parameters.subtitle),
        fileName: textOf(parameters.fileName),
        format: parameters.format === "docx" ? "docx" : "pdf",
        customerId: customerId ? requireId(customerId, "cliente") : null,
        propertyId: propertyId ? requireId(propertyId, "imóvel") : null,
        blocks: Array.isArray(parameters.blocks) ? parameters.blocks : [],
      },
      this.timezone,
    );

    this.remember(context, {
      type: AssistantReferenceType.DOCUMENT,
      id: document.id,
      label: document.displayName,
    });
    return {
      attachment: { type: "document", id: document.id },
      fileName: document.displayName,
      size: describeSize(Number(document.sizeBytes)),
      savedTo: savedTo ?? "arquivos do assistente",
      note: "O corretor já pode baixar o arquivo pelo chat.",
    };
  }

  private async proposeWhatsappMessage(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const text = textOf(parameters.text) ?? "";
    if (text.length > 4000) {
      throw new BadRequestException("Mensagem longa demais.");
    }
    const attachments = await this.resolveAttachments(
      user,
      parameters.attachments,
    );
    if (!text && !attachments.length) {
      throw new BadRequestException("A mensagem está vazia.");
    }

    const recipient = await this.recipientOf(user, parameters);
    const withFiles = attachments.length
      ? ` com ${attachments.length === 1 ? "1 anexo" : `${attachments.length} anexos`}`
      : "";
    return this.propose(
      user,
      context,
      AssistantActionKind.SEND_MESSAGE,
      `Enviar WhatsApp para ${recipient.recipientName}${withFiles}`,
      { ...recipient, text, attachments },
    );
  }

  private async recipientOf(user: User, parameters: ToolArguments) {
    const conversationId = textOf(parameters.conversationId);
    const customerId = textOf(parameters.customerId);

    if (conversationId) {
      const conversation = await this.findConversation(
        user,
        requireId(conversationId, "conversa"),
      );
      return {
        conversationId: conversation.id,
        customerId: conversation.customerId,
        recipientName: this.conversationName(conversation),
      };
    }

    if (customerId) {
      const customer = await this.findCustomer(
        user,
        requireId(customerId, "cliente"),
      );
      return {
        conversationId: null,
        customerId: customer.id,
        recipientName: customer.name,
      };
    }

    throw new BadRequestException("Informe o cliente ou a conversa.");
  }

  /** Checks every file belongs to the broker and fits on WhatsApp. */
  private async resolveAttachments(
    user: User,
    value: unknown,
  ): Promise<AssistantAttachment[]> {
    const requested = (Array.isArray(value) ? value : []) as {
      type?: unknown;
      id?: unknown;
    }[];
    if (requested.length > 10) {
      throw new BadRequestException("Envie no máximo 10 anexos por vez.");
    }

    const attachments: AssistantAttachment[] = [];
    for (const item of requested) {
      const id = requireId(item?.id, "anexo");
      if (item?.type === "property_media") {
        const media = await this.mediaRepository.findOneBy({
          id,
          userId: user.id,
          active: true,
        });
        if (!media) {
          throw new NotFoundException("Foto ou vídeo não encontrado.");
        }
        if (!media.visibleToCustomer) {
          throw new BadRequestException(
            "Essa foto está escondida do cliente pelo corretor.",
          );
        }
        // Too big to show inline still goes as a file, up to its limit.
        this.storageService.validateInboxUpload(
          "application/octet-stream",
          Number(media.sizeBytes),
        );
        attachments.push({
          source: "property_media",
          id: media.id,
          fileName: media.displayName,
          mimeType: media.mimeType,
          sizeBytes: Number(media.sizeBytes),
        });
        continue;
      }

      const document = await this.documentRepository.findOneBy({
        id,
        userId: user.id,
        active: true,
      });
      if (!document) throw new NotFoundException("Arquivo não encontrado.");
      this.storageService.validateInboxUpload(
        document.mimeType,
        Number(document.sizeBytes),
      );
      attachments.push({
        source: "document",
        id: document.id,
        fileName: document.displayName,
        mimeType: document.mimeType,
        sizeBytes: Number(document.sizeBytes),
      });
    }
    return attachments;
  }

  private documentsOf(
    user: User,
    ownerType: DocumentOwnerType,
    ownerIds: string[],
  ) {
    if (!ownerIds.length) return Promise.resolve([]);
    return this.documentRepository.find({
      where: {
        userId: user.id,
        ownerType,
        ownerId: In(ownerIds),
        active: true,
      },
      order: { createdAt: "DESC" },
    });
  }

  private describeFile(document: Document) {
    return {
      type: "document",
      id: document.id,
      name: document.displayName,
      mimeType: document.mimeType,
      size: describeSize(Number(document.sizeBytes)),
      date: formatDay(document.createdAt, this.timezone),
    };
  }

  private async proposeVisit(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const customer = await this.findCustomer(
      user,
      requireId(parameters.customerId, "cliente"),
    );

    const startsAtText = textOf(parameters.startsAt);
    if (!startsAtText || !DATE_TIME_PATTERN.test(startsAtText)) {
      throw new BadRequestException(
        "Use o início no formato AAAA-MM-DDTHH:mm.",
      );
    }
    const startsAt = dayjs.tz(startsAtText, this.timezone);
    if (!startsAt.isValid() || startsAt.isBefore(dayjs())) {
      throw new BadRequestException("A visita precisa ser no futuro.");
    }
    const durationMinutes = Math.min(
      Math.max(Math.round(numberOf(parameters.durationMinutes) ?? 60), 15),
      480,
    );

    const propertyId = textOf(parameters.propertyId);
    const property = propertyId
      ? await this.propertyRepository.findOneBy({
          id: requireId(propertyId, "imóvel"),
          userId: user.id,
          active: true,
        })
      : null;
    if (propertyId && !property) {
      throw new NotFoundException("Imóvel não encontrado.");
    }

    const address =
      textOf(parameters.address) ??
      (property
        ? [property.address, property.address2].filter(Boolean).join(", ")
        : null);
    if (!address) {
      throw new BadRequestException(
        "Preciso do endereço ou do imóvel da visita.",
      );
    }

    return this.propose(
      user,
      context,
      AssistantActionKind.SCHEDULE_VISIT,
      `Agendar visita com ${customer.name}, ${inTimezone(startsAt.toDate(), this.timezone).format("ddd DD/MM [às] HH:mm")}`,
      {
        customerId: customer.id,
        customerName: customer.name,
        propertyId: property?.id ?? null,
        address: address.substring(0, 1000),
        startsAt: startsAt.toISOString(),
        endsAt: startsAt.add(durationMinutes, "minute").toISOString(),
        notes: textOf(parameters.notes),
      },
    );
  }

  private async proposeCustomerNote(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const customer = await this.findCustomer(
      user,
      requireId(parameters.customerId, "cliente"),
    );
    const note = textOf(parameters.note);
    if (!note) throw new BadRequestException("A anotação está vazia.");

    return this.propose(
      user,
      context,
      AssistantActionKind.ADD_NOTE,
      `Anotar na ficha de ${customer.name}`,
      {
        customerId: customer.id,
        customerName: customer.name,
        note: note.substring(0, 2000),
      },
    );
  }

  private async proposeStageChange(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const customer = await this.findCustomer(
      user,
      requireId(parameters.customerId, "cliente"),
    );
    const stage = await this.kanbanRepository.findOneBy({
      id: requireId(parameters.stageId, "etapa"),
      userId: user.id,
      active: true,
    });
    if (!stage) throw new NotFoundException("Etapa não encontrada.");

    return this.propose(
      user,
      context,
      AssistantActionKind.MOVE_STAGE,
      `Mover ${customer.name} para ${stage.name}`,
      {
        customerId: customer.id,
        customerName: customer.name,
        stageId: stage.id,
        stageName: stage.name,
      },
    );
  }

  private async proposeLostStatus(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const customer = await this.findCustomer(
      user,
      requireId(parameters.customerId, "cliente"),
    );
    const lost = booleanOf(parameters.lost) ?? true;

    return this.propose(
      user,
      context,
      AssistantActionKind.MARK_LOST,
      lost
        ? `Marcar ${customer.name} como perdido`
        : `Trazer ${customer.name} de volta`,
      { customerId: customer.id, customerName: customer.name, lost },
    );
  }

  private async propose(
    user: User,
    context: AssistantToolContext,
    kind: AssistantActionKind,
    title: string,
    payload: AssistantActionPayload,
  ) {
    const action = await this.actionRepository.save(
      this.actionRepository.create({
        userId: user.id,
        kind,
        status: AssistantActionStatus.PENDING,
        title: title.substring(0, 255),
        payload,
      }),
    );
    context.actionIds.push(action.id);
    return {
      actionId: action.id,
      status: "aguardando confirmação do corretor",
      title: action.title,
    };
  }

  /** A paid action: the model learns the price to tell the broker. */
  private async proposeDraft(
    user: User,
    context: AssistantToolContext,
    draft: PaidActionDraft,
  ) {
    const proposal = await this.propose(
      user,
      context,
      draft.kind,
      draft.title,
      draft.payload,
    );
    const { estimatedCredits } = draft.payload as { estimatedCredits: number };
    return {
      ...proposal,
      estimatedCredits,
      status: estimatedCredits
        ? `aguardando o corretor confirmar o custo de ${estimatedCredits} créditos`
        : proposal.status,
    };
  }

  private async findCustomer(user: User, id: string) {
    const customer = await this.customerRepository.findOne({
      where: { id, userId: user.id, active: true },
      relations: { kanban: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");
    return customer;
  }

  private async findConversation(user: User, id: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id, userId: user.id, active: true },
      relations: { customer: true },
    });
    if (!conversation) throw new NotFoundException("Conversa não encontrada.");
    return conversation;
  }

  private describeVisit(visit: Visit) {
    return {
      id: visit.id,
      when: formatWhen(visit.startsAt, this.timezone),
      endsAt: inTimezone(visit.endsAt, this.timezone).format("HH:mm"),
      address: visit.address,
      property: visit.property ? propertyTitleOf(visit.property) : null,
      notes: visit.notes ? shorten(visit.notes, 200) : null,
    };
  }

  private publicLinkOf(propertyId: string) {
    return `${this.applicationConfiguration.frontendUrl}/p/${propertyId}`;
  }

  private conversationName(conversation: Conversation) {
    return (
      conversation.customer?.name ??
      conversation.contactName ??
      `+${conversation.phone}`
    );
  }

  private conversationReference(
    conversation: Conversation,
  ): AssistantReference {
    return conversation.customerId
      ? {
          type: AssistantReferenceType.CUSTOMER,
          id: conversation.customerId,
          label: this.conversationName(conversation),
        }
      : {
          type: AssistantReferenceType.CONVERSATION,
          id: conversation.id,
          label: this.conversationName(conversation),
        };
  }

  private remember(
    context: AssistantToolContext,
    reference: AssistantReference,
  ) {
    context.references.set(`${reference.type}:${reference.id}`, reference);
  }
}
