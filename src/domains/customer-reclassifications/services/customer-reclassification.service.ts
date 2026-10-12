import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import { FindOptionsWhere, In, IsNull, Not, Repository } from "typeorm";
import {
  customerWarmthOf,
  CustomerWarmth,
} from "../../assistant/helpers/customer-warmth.helper";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerComment } from "../../customers/entities/customer-comments.entity";
import { CustomerCommentRepository } from "../../customers/repositories/customer-comment.repository";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { CustomerService } from "../../customers/services/customer.service";
import { Deal } from "../../deals/entities/deal.entity";
import { DealStatus } from "../../deals/enums/deal.enum";
import { Conversation } from "../../inbox/entities/conversation.entity";
import { MessageDirection } from "../../inbox/enums/inbox.enum";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { User } from "../../users/entities/user.entity";
import {
  ReclassificationApplyDto,
  ReclassificationDecisionDto,
} from "../dtos/customer-reclassification.dto";
import {
  isReclassificationNote,
  RECLASSIFICATION_NOTE_PREFIX,
  ReclassificationFacts,
} from "../helpers/reclassification-rule.helper";

/** Everything the reclassification knows about one customer. */
export interface CustomerProfile {
  customer: Customer;
  conversationId: string | null;
  lastMessageAt: Date | null;
  lastMessageDirection: MessageDirection | null;
  warmth: CustomerWarmth;
  /** Last message, note, past visit or the sign up date. */
  lastContactAt: Date;
  /** There is a message, a note or a visit to read. */
  readable: boolean;
  facts: ReclassificationFacts;
}

export type SkipReason = "not_found" | "protected" | "invalid_stage" | "failed";

export interface ReclassificationApplyResult {
  moved: number;
  lost: number;
  deleted: number;
  skipped: { customerId: string; name: string | null; reason: SkipReason }[];
}

const COMMENT_DETAILS_LIMIT = 1300;

/**
 * Reviews the funnel: lists the customers that can be reclassified and
 * applies what the broker confirmed, writing the reason on each history.
 */
@Injectable()
export class CustomerReclassificationService {
  private readonly logger = new Logger(CustomerReclassificationService.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly customerCommentRepository: CustomerCommentRepository,
    private readonly customerService: CustomerService,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
  ) {}

  /** Customers still in the funnel, the most recent contact first. */
  async candidates(user: User) {
    const profiles = await this.profilesOf(user.id);
    return profiles
      .sort(
        (first, second) =>
          second.lastContactAt.getTime() - first.lastContactAt.getTime(),
      )
      .map((profile) => ({
        id: profile.customer.id,
        name: profile.customer.name,
        phone: profile.customer.phone,
        avatar: profile.customer.avatar ?? null,
        kanban: profile.customer.kanban
          ? {
              id: profile.customer.kanban.id,
              name: profile.customer.kanban.name,
              order: profile.customer.kanban.order,
            }
          : null,
        warmth: profile.warmth,
        lastContactAt: profile.lastContactAt,
        lastMessageAt: profile.lastMessageAt,
        daysSinceContact: profile.facts.daysSinceContact,
        notesCount: profile.customer.comments.length,
        hasOpenDeal: profile.facts.hasOpenDeal,
        hasUpcomingVisit: profile.facts.hasUpcomingVisit,
        readable: profile.readable,
        createdAt: profile.customer.createdAt,
      }));
  }

  /** Active customers out of the lost list, with their chat, notes and deals. */
  async profilesOf(
    userId: string,
    customerIds?: string[],
  ): Promise<CustomerProfile[]> {
    const where: FindOptionsWhere<Customer> = {
      userId,
      active: true,
      lost: false,
    };
    if (customerIds) where.id = In(customerIds);

    const customers = await this.customerRepository.find({
      where,
      relations: { kanban: true, comments: true, visits: true },
    });
    if (!customers.length) return [];

    const ids = customers.map((customer) => customer.id);
    const [conversations, openDeals] = await Promise.all([
      this.conversationRepository.find({
        where: {
          userId,
          active: true,
          customerId: customerIds ? In(ids) : Not(IsNull()),
        },
        select: {
          id: true,
          customerId: true,
          lastMessageAt: true,
          lastMessageDirection: true,
        },
      }),
      this.dealRepository.find({
        where: {
          userId,
          active: true,
          status: DealStatus.OPEN,
          customerId: customerIds ? In(ids) : undefined,
        },
        select: { id: true, customerId: true },
      }),
    ]);

    const latestConversation = new Map<string, Conversation>();
    for (const conversation of conversations) {
      if (!conversation.customerId) continue;
      const current = latestConversation.get(conversation.customerId);
      if (
        !current ||
        (conversation.lastMessageAt?.getTime() ?? 0) >
          (current.lastMessageAt?.getTime() ?? 0)
      ) {
        latestConversation.set(conversation.customerId, conversation);
      }
    }
    const withOpenDeal = new Set(openDeals.map((deal) => deal.customerId));

    const now = dayjs();
    return customers.map((customer) => {
      customer.comments = (customer.comments ?? []).filter(
        (comment) => comment.active,
      );
      customer.visits = customer.visits ?? [];
      const conversation = latestConversation.get(customer.id) ?? null;
      // A reclassification note is not a contact with the customer.
      const warmth = customerWarmthOf(
        {
          createdAt: customer.createdAt,
          notes: customer.comments.filter(
            (comment) => !isReclassificationNote(comment.comment),
          ),
          visits: customer.visits,
        },
        now,
      );
      const lastMessageAt = conversation?.lastMessageAt ?? null;
      const lastContactAt = [
        warmth.lastActivityAt,
        lastMessageAt,
        customer.createdAt,
      ]
        .filter((date): date is Date => Boolean(date))
        .reduce((latest, date) => (date > latest ? date : latest));
      const readable = Boolean(
        lastMessageAt || customer.comments.length || customer.visits.length,
      );

      return {
        customer,
        conversationId: conversation?.id ?? null,
        lastMessageAt,
        lastMessageDirection: conversation?.lastMessageDirection ?? null,
        warmth: warmth.warmth,
        lastContactAt,
        readable,
        facts: {
          customerId: customer.id,
          currentKanbanId: customer.kanban?.id ?? null,
          hasOpenDeal: withOpenDeal.has(customer.id),
          hasUpcomingVisit: Boolean(warmth.nextVisit),
          daysSinceContact: now
            .startOf("day")
            .diff(dayjs(lastContactAt).startOf("day"), "day"),
          daysSinceCreated: now.diff(dayjs(customer.createdAt), "day"),
        },
      };
    });
  }

  /** Applies what the broker confirmed, one customer at a time. */
  async apply(
    user: User,
    dto: ReclassificationApplyDto,
  ): Promise<ReclassificationApplyResult> {
    const profiles = new Map(
      (
        await this.profilesOf(
          user.id,
          dto.decisions.map((decision) => decision.customerId),
        )
      ).map((profile) => [profile.customer.id, profile]),
    );
    const stages = new Map(
      (
        await this.kanbanRepository.find({
          where: { userId: user.id, active: true },
          select: { id: true, name: true },
        })
      ).map((stage) => [stage.id, stage]),
    );

    const result: ReclassificationApplyResult = {
      moved: 0,
      lost: 0,
      deleted: 0,
      skipped: [],
    };
    const handled = new Set<string>();

    for (const decision of dto.decisions) {
      if (handled.has(decision.customerId)) continue;
      handled.add(decision.customerId);

      const profile = profiles.get(decision.customerId);
      const skip = (reason: SkipReason) =>
        result.skipped.push({
          customerId: decision.customerId,
          name: profile?.customer.name ?? null,
          reason,
        });

      if (!profile) {
        skip("not_found");
        continue;
      }
      const isRemoval = decision.action !== "move";
      if (
        isRemoval &&
        (profile.facts.hasOpenDeal || profile.facts.hasUpcomingVisit)
      ) {
        skip("protected");
        continue;
      }
      const stage = decision.kanbanId ? stages.get(decision.kanbanId) : null;
      if (decision.action === "move" && !stage) {
        skip("invalid_stage");
        continue;
      }

      try {
        await this.applyOne(user, profile.customer, decision, stage ?? null);
        if (decision.action === "move") result.moved++;
        else if (decision.action === "lost") result.lost++;
        else result.deleted++;
      } catch (error) {
        this.logger.warn(
          `Reclassification of customer ${decision.customerId} failed: ${String(error)}`,
        );
        skip("failed");
      }
    }

    return result;
  }

  private async applyOne(
    user: User,
    customer: Customer,
    decision: ReclassificationDecisionDto,
    stage: Pick<Kanban, "id" | "name"> | null,
  ) {
    const details = [
      decision.reason?.trim() && `Motivo: ${decision.reason.trim()}`,
      decision.summary?.trim() && `Resumo: ${decision.summary.trim()}`,
    ]
      .filter(Boolean)
      .join("\n")
      .substring(0, COMMENT_DETAILS_LIMIT);
    const currentStage = customer.kanban?.name;

    if (decision.action === "move" && stage) {
      await this.customerRepository.update(
        { id: customer.id, userId: user.id },
        { kanban: { id: stage.id } },
      );
      await this.addComment(
        customer,
        currentStage
          ? `${RECLASSIFICATION_NOTE_PREFIX}: de "${currentStage}" para "${stage.name}".`
          : `${RECLASSIFICATION_NOTE_PREFIX}: entrou na etapa "${stage.name}".`,
        details,
      );
      return;
    }

    if (decision.action === "lost") {
      await this.addComment(
        customer,
        currentStage
          ? `${RECLASSIFICATION_NOTE_PREFIX}: marcado como perdido, estava em "${currentStage}".`
          : `${RECLASSIFICATION_NOTE_PREFIX}: marcado como perdido.`,
        details,
      );
      await this.customerService.markAsLost(user, customer.id);
      return;
    }

    // Deleting keeps the record hidden, like the delete button, so the
    // note stays with it.
    await this.addComment(
      customer,
      `${RECLASSIFICATION_NOTE_PREFIX}: cliente apagado.`,
      details,
    );
    await this.customerService.remove(user, customer.id);
  }

  private async addComment(
    customer: Customer,
    headline: string,
    details: string,
  ) {
    await this.customerCommentRepository.save(
      this.customerCommentRepository.create({
        customer: { id: customer.id } as Customer,
        comment: details ? `${headline}\n${details}` : headline,
      } as Partial<CustomerComment>),
    );
  }
}
