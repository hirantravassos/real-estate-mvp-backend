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
import { Conversation } from "../../inbox/entities/conversation.entity";
import { Message } from "../../inbox/entities/message.entity";
import { MessageDirection } from "../../inbox/enums/inbox.enum";
import {
  formatBrl,
  KIND_LABEL,
} from "../../inbox/helpers/property-pitch.helper";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { Property } from "../../properties/entities/property.entity";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import { Visit } from "../../visits/entities/visit.entity";
import { AssistantToolName } from "../constants/assistant-tools.constant";
import {
  AssistantAction,
  AssistantActionPayload,
} from "../entities/assistant-action.entity";
import { AssistantReference } from "../entities/assistant-message.entity";
import {
  AssistantActionKind,
  AssistantActionStatus,
  AssistantReferenceType,
} from "../enums/assistant.enum";
import {
  DEFAULT_TIMEZONE,
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

/** What one question gathered while the tools ran. */
export interface AssistantToolContext {
  actionIds: string[];
  references: Map<string, AssistantReference>;
}

type ToolArguments = Record<string, unknown>;

const CONVERSATION_MESSAGES = 25;
const CUSTOMER_MESSAGES = 15;
const MAXIMUM_VISIT_RANGE_DAYS = 92;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const WARMTH_VALUES = new Set<CustomerWarmth>([
  "new",
  "hot",
  "warm",
  "cooling",
  "cold",
]);

const textOf = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const numberOf = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const booleanOf = (value: unknown) =>
  typeof value === "boolean" ? value : null;

const limitOf = (value: unknown, fallback: number, maximum: number) =>
  Math.min(Math.max(Math.round(numberOf(value) ?? fallback), 1), maximum);

const requireId = (value: unknown, label: string) => {
  const id = textOf(value);
  if (!id || !UUID_PATTERN.test(id)) {
    throw new BadRequestException(`Id de ${label} inválido.`);
  }
  return id;
};

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

  private dispatch(
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
        label: this.propertyTitle(property),
      }),
    );

    return {
      total,
      properties: properties.map((property) => ({
        id: property.id,
        title: this.propertyTitle(property),
        kind: property.kind ? KIND_LABEL[property.kind] : null,
        address: [property.address, property.address2]
          .filter(Boolean)
          .join(", "),
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

  private async proposeWhatsappMessage(
    user: User,
    parameters: ToolArguments,
    context: AssistantToolContext,
  ) {
    const text = textOf(parameters.text);
    if (!text) throw new BadRequestException("A mensagem está vazia.");
    if (text.length > 4000) {
      throw new BadRequestException("Mensagem longa demais.");
    }

    const conversationId = textOf(parameters.conversationId);
    const customerId = textOf(parameters.customerId);

    if (conversationId) {
      const conversation = await this.findConversation(
        user,
        requireId(conversationId, "conversa"),
      );
      const recipientName = this.conversationName(conversation);
      return this.propose(
        user,
        context,
        AssistantActionKind.SEND_MESSAGE,
        `Enviar WhatsApp para ${recipientName}`,
        {
          conversationId: conversation.id,
          customerId: conversation.customerId,
          recipientName,
          text,
        },
      );
    }

    if (customerId) {
      const customer = await this.findCustomer(
        user,
        requireId(customerId, "cliente"),
      );
      return this.propose(
        user,
        context,
        AssistantActionKind.SEND_MESSAGE,
        `Enviar WhatsApp para ${customer.name}`,
        {
          conversationId: null,
          customerId: customer.id,
          recipientName: customer.name,
          text,
        },
      );
    }

    throw new BadRequestException("Informe o cliente ou a conversa.");
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
      property: visit.property ? this.propertyTitle(visit.property) : null,
      notes: visit.notes ? shorten(visit.notes, 200) : null,
    };
  }

  private propertyTitle(property: Property) {
    return (
      property.alias ??
      [property.kind ? KIND_LABEL[property.kind] : "Imóvel", property.address]
        .filter(Boolean)
        .join(" em ")
        .substring(0, 120)
    );
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
