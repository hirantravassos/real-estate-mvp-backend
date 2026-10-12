import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { Between, Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { Deal } from "../../deals/entities/deal.entity";
import { DEAL_STAGE_LABELS, DealStatus } from "../../deals/enums/deal.enum";
import { Conversation } from "../../inbox/entities/conversation.entity";
import { Message } from "../../inbox/entities/message.entity";
import { MessageDirection } from "../../inbox/enums/inbox.enum";
import { formatBrl } from "../../inbox/helpers/property-pitch.helper";
import { User } from "../../users/entities/user.entity";
import { Visit } from "../../visits/entities/visit.entity";
import {
  inTimezone,
  shorten,
} from "../../assistant/helpers/assistant-format.helper";
import {
  CustomerWarmth,
  CustomerWarmthResult,
  customerWarmthOf,
  WARMTH_LABEL,
} from "../../assistant/helpers/customer-warmth.helper";
import { propertyTitleOf } from "../../assistant/helpers/tool-arguments.helper";
import { DailyBriefingCustomer } from "../entities/daily-briefing.entity";
import { BRIEFING_TIMEZONE } from "../helpers/briefing-schedule.helper";

const WAITING_CONVERSATIONS = 12;
const HOT_CUSTOMERS = 10;
const RECOVERY_CANDIDATES = 15;
const RECENTLY_LOST = 6;
const RECENTLY_LOST_DAYS = 90;
const OPEN_DEALS = 10;
const UPCOMING_VISIT_DAYS = 7;

/** What the AI reads about the broker's day, and who it may point to. */
export interface DailyBriefingSnapshot {
  input: string;
  /** Short references like "c3" the AI answers with, and who they are. */
  people: Map<string, DailyBriefingCustomer>;
  /** Nothing to talk about yet: no customers nor conversations. */
  empty: boolean;
}

interface CustomerRow {
  customer: Customer;
  insight: CustomerWarmthResult;
  lastNote: { createdAt: Date; comment: string } | null;
  conversation: Conversation | null;
}

/**
 * Gathers the broker's base in one text: numbers, the agenda, who waits for
 * an answer, who is cooling down and the open sales.
 */
@Injectable()
export class DailyBriefingSnapshotService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
  ) {}

  async build(user: User): Promise<DailyBriefingSnapshot> {
    const now = dayjs().tz(BRIEFING_TIMEZONE);
    const yesterdayStart = now.subtract(1, "day").startOf("day");
    const yesterdayEnd = now.subtract(1, "day").endOf("day");

    const [customers, conversations, visits, deals, yesterdayMessages] =
      await Promise.all([
        this.customerRepository.find({
          where: { userId: user.id, active: true },
          relations: { kanban: true, comments: true, visits: true },
        }),
        this.conversationRepository.find({
          where: { userId: user.id, active: true, hidden: false },
          order: { lastMessageAt: "DESC" },
        }),
        this.visitRepository.find({
          where: {
            userId: user.id,
            startsAt: Between(
              yesterdayStart.toDate(),
              now.add(UPCOMING_VISIT_DAYS, "day").endOf("day").toDate(),
            ),
          },
          relations: { customer: true, property: true },
          order: { startsAt: "ASC" },
        }),
        this.dealRepository.find({
          where: { userId: user.id, status: DealStatus.OPEN, active: true },
          relations: { customer: true, property: true },
          order: { updatedAt: "ASC" },
        }),
        this.messageRepository.find({
          select: { id: true, direction: true },
          where: {
            userId: user.id,
            sentAt: Between(yesterdayStart.toDate(), yesterdayEnd.toDate()),
          },
        }),
      ]);

    const people = new Map<string, DailyBriefingCustomer>();
    const referenceById = new Map<string, string>();
    const referenceOf = (key: string, person: DailyBriefingCustomer) => {
      const existing = referenceById.get(key);
      if (existing) return existing;
      const reference = `c${people.size + 1}`;
      people.set(reference, person);
      referenceById.set(key, reference);
      return reference;
    };

    const conversationByCustomer = new Map(
      conversations
        .filter((conversation) => conversation.customerId)
        .map((conversation) => [conversation.customerId!, conversation]),
    );
    const customerById = new Map(
      customers.map((customer) => [customer.id, customer]),
    );

    const rows: CustomerRow[] = customers.map((customer) => {
      const notes = (customer.comments ?? []).filter(
        (note) => note.active !== false,
      );
      const lastNote =
        [...notes].sort(
          (first, second) =>
            second.createdAt.getTime() - first.createdAt.getTime(),
        )[0] ?? null;
      return {
        customer,
        insight: customerWarmthOf(
          {
            createdAt: customer.createdAt,
            notes,
            visits: customer.visits ?? [],
          },
          dayjs(),
        ),
        lastNote,
        conversation: conversationByCustomer.get(customer.id) ?? null,
      };
    });

    const customerReference = (row: CustomerRow) =>
      referenceOf(row.customer.id, {
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
        conversationId: row.conversation?.id ?? null,
      });

    const describeCustomer = (row: CustomerRow) => {
      const { customer, insight, lastNote, conversation } = row;
      return [
        `[${customerReference(row)}] ${customer.name}`,
        customer.kanban?.name ? `etapa ${customer.kanban.name}` : null,
        customer.budget ? `orçamento ${formatBrl(customer.budget)}` : null,
        insight.daysSinceActivity === null
          ? null
          : `${insight.daysSinceActivity} dia(s) sem atividade`,
        lastNote
          ? `última anotação (${this.day(lastNote.createdAt)}): "${shorten(lastNote.comment, 160)}"`
          : "sem anotações",
        conversation?.lastMessageAt
          ? `último WhatsApp (${this.day(conversation.lastMessageAt)}, ${this.authorOf(conversation)}): "${shorten(conversation.lastMessagePreview, 120)}"`
          : "sem conversa no WhatsApp",
      ]
        .filter(Boolean)
        .join(" · ");
    };

    const openRows = rows.filter((row) => !row.customer.lost);
    const warmthCount = (warmth: CustomerWarmth) =>
      openRows.filter((row) => row.insight.warmth === warmth).length;

    const byRecentActivity = (first: CustomerRow, second: CustomerRow) =>
      (first.insight.daysSinceActivity ?? Infinity) -
      (second.insight.daysSinceActivity ?? Infinity);

    const hot = openRows
      .filter((row) => ["hot", "new"].includes(row.insight.warmth))
      .sort(byRecentActivity)
      .slice(0, HOT_CUSTOMERS);

    // The warmest of the cold ones first: still remember the broker.
    const recoveryCandidates = openRows
      .filter((row) => ["cooling", "cold"].includes(row.insight.warmth))
      .sort(byRecentActivity)
      .slice(0, RECOVERY_CANDIDATES);

    const recentlyLost = rows
      .filter(
        (row) =>
          row.customer.lost &&
          now.diff(dayjs(row.customer.updatedAt), "day") <= RECENTLY_LOST_DAYS,
      )
      .sort(
        (first, second) =>
          second.customer.updatedAt.getTime() -
          first.customer.updatedAt.getTime(),
      )
      .slice(0, RECENTLY_LOST);

    const waiting = conversations
      .filter(
        (conversation) =>
          conversation.lastMessageDirection === MessageDirection.INBOUND &&
          conversation.lastMessageAt &&
          !conversation.archived,
      )
      .slice(0, WAITING_CONVERSATIONS)
      .map((conversation) => {
        const customer = conversation.customerId
          ? customerById.get(conversation.customerId)
          : undefined;
        const name =
          customer?.name ??
          conversation.contactName ??
          `+${conversation.phone}`;
        const reference = referenceOf(customer?.id ?? conversation.id, {
          id: customer?.id ?? null,
          name,
          phone: customer?.phone ?? null,
          conversationId: conversation.id,
        });
        const hours = now.diff(dayjs(conversation.lastMessageAt), "hour");
        return [
          `[${reference}] ${name}`,
          customer ? null : "contato ainda não salvo como cliente",
          hours < 24 ? `há ${hours}h` : `há ${Math.floor(hours / 24)} dia(s)`,
          `"${shorten(conversation.lastMessagePreview, 140)}"`,
        ]
          .filter(Boolean)
          .join(" · ");
      });

    const stageCounts = new Map<string, number>();
    openRows.forEach((row) => {
      const stage = row.customer.kanban?.name ?? "Sem etapa";
      stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    });

    const todayKey = now.format("YYYY-MM-DD");
    const visitLine = (visit: Visit) =>
      [
        inTimezone(visit.startsAt, BRIEFING_TIMEZONE).format("ddd DD/MM HH:mm"),
        visit.customer?.name ?? "cliente",
        visit.property ? propertyTitleOf(visit.property) : visit.address,
      ]
        .filter(Boolean)
        .join(" · ");
    const visitDay = (visit: Visit) =>
      inTimezone(visit.startsAt, BRIEFING_TIMEZONE).format("YYYY-MM-DD");
    const yesterdayVisits = visits.filter(
      (visit) => visitDay(visit) < todayKey,
    );
    const todayVisits = visits.filter((visit) => visitDay(visit) === todayKey);
    const upcomingVisits = visits.filter((visit) => visitDay(visit) > todayKey);

    const yesterdayNotes = rows.reduce(
      (total, row) =>
        total +
        (row.customer.comments ?? []).filter(
          (note) =>
            note.active !== false &&
            !dayjs(note.createdAt).isBefore(yesterdayStart) &&
            !dayjs(note.createdAt).isAfter(yesterdayEnd),
        ).length,
      0,
    );
    const received = yesterdayMessages.filter(
      (message) => message.direction === MessageDirection.INBOUND,
    ).length;
    const sent = yesterdayMessages.length - received;
    const newThisWeek = rows.filter(
      (row) => now.diff(dayjs(row.customer.createdAt), "day") < 7,
    ).length;
    const unread = conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    );

    const dealLines = deals.slice(0, OPEN_DEALS).map((deal) => {
      const reference = deal.customer
        ? referenceOf(deal.customer.id, {
            id: deal.customer.id,
            name: deal.customer.name,
            phone: deal.customer.phone,
            conversationId:
              conversationByCustomer.get(deal.customer.id)?.id ?? null,
          })
        : null;
      return [
        reference ? `[${reference}] ${deal.customer.name}` : "Cliente",
        DEAL_STAGE_LABELS[deal.stage],
        deal.property ? propertyTitleOf(deal.property) : null,
        deal.offerAmount ? `proposta ${formatBrl(deal.offerAmount)}` : null,
        `sem mudança há ${now.diff(dayjs(deal.updatedAt), "day")} dia(s)`,
      ]
        .filter(Boolean)
        .join(" · ");
    });

    const section = (title: string, lines: string[], empty: string) =>
      `${title}:\n${lines.length ? lines.map((line) => `- ${line}`).join("\n") : `- ${empty}`}`;

    const input = [
      `Hoje é ${now.locale("pt-br").format("dddd, DD/MM/YYYY")}. Corretor: ${user.name}.`,
      section(
        "Números da carteira",
        [
          `Clientes ativos: ${openRows.length} (novos ${warmthCount("new")}, quentes ${warmthCount("hot")}, mornos ${warmthCount("warm")}, esfriando ${warmthCount("cooling")}, frios ${warmthCount("cold")})`,
          `Marcados como perdidos: ${rows.length - openRows.length}`,
          `Clientes cadastrados nos últimos 7 dias: ${newThisWeek}`,
          `Conversas esperando resposta do corretor: ${waiting.length}, mensagens não lidas: ${unread}`,
          `Negociações abertas: ${deals.length}`,
        ],
        "",
      ),
      section(
        "Clientes por etapa do funil",
        [...stageCounts.entries()].map(
          ([stage, count]) => `${stage}: ${count}`,
        ),
        "nenhum cliente ativo",
      ),
      section(
        "Ontem",
        [
          `${yesterdayNotes} anotação(ões) em clientes`,
          `${received} mensagem(ns) recebida(s) e ${sent} enviada(s) no WhatsApp`,
          `${yesterdayVisits.length} visita(s)`,
        ],
        "",
      ),
      section("Visitas de hoje", todayVisits.map(visitLine), "nenhuma"),
      section(
        `Visitas dos próximos ${UPCOMING_VISIT_DAYS} dias`,
        upcomingVisits.map(visitLine),
        "nenhuma",
      ),
      section(
        "Esperando resposta do corretor (o cliente falou por último)",
        waiting,
        "ninguém",
      ),
      section(
        `Clientes quentes ou novos (${WARMTH_LABEL.hot.toLowerCase()} = atividade nos últimos 2 dias ou visita marcada)`,
        hot.map(describeCustomer),
        "nenhum",
      ),
      section(
        "Clientes esfriando ou frios (candidatos a recuperação)",
        recoveryCandidates.map(describeCustomer),
        "nenhum",
      ),
      section(
        `Perdidos nos últimos ${RECENTLY_LOST_DAYS} dias`,
        recentlyLost.map(describeCustomer),
        "nenhum",
      ),
      section("Negociações abertas", dealLines, "nenhuma"),
    ].join("\n\n");

    return {
      input,
      people,
      empty: customers.length === 0 && conversations.length === 0,
    };
  }

  private day(date: Date) {
    return inTimezone(date, BRIEFING_TIMEZONE).format("DD/MM");
  }

  private authorOf(conversation: Conversation) {
    return conversation.lastMessageDirection === MessageDirection.INBOUND
      ? "cliente"
      : "corretor";
  }
}
