import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EvolutionApiService } from "../../../infrastructure/evolution/services/evolution-api.service";
import { EvolutionChat } from "../../../infrastructure/evolution/types/evolution.type";
import { GooglePeopleService } from "../../../infrastructure/google/services/google-people.service";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerMapper } from "../../customers/mappers/customer.mapper";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { Conversation } from "../../inbox/entities/conversation.entity";
import { WhatsappConnection } from "../../inbox/entities/whatsapp-connection.entity";
import {
  parseEvolutionMessage,
  previewOf,
} from "../../inbox/helpers/evolution-message.parser";
import {
  isPersonalJid,
  phoneMatchingKey,
  toCustomerPhone,
} from "../../inbox/helpers/whatsapp-phone.helper";
import { ConversationService } from "../../inbox/services/conversation.service";
import { MessageService } from "../../inbox/services/message.service";
import { WhatsappConnectionService } from "../../inbox/services/whatsapp-connection.service";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { User } from "../../users/entities/user.entity";
import { ContactImportDto, ContactSource } from "../dtos/contact-import.dto";

export interface ContactCandidate {
  /** Area code and number, as a customer keeps it. */
  phone: string;
  name: string | null;
  source: ContactSource;
  /** The WhatsApp chat, present when there are messages to read. */
  chatJid: string | null;
  hasHistory: boolean;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  profilePictureUrl: string | null;
  customerId: string | null;
  customerName: string | null;
  /** The broker hid this chat from the inbox, a strong hint it is personal. */
  hiddenInInbox: boolean;
}

export type SkipReason = "invalid_phone" | "already_customer" | "failed";

interface HistoryJob {
  conversation: Conversation;
  chatJid: string;
}

const BRAZIL_JID_PREFIX = "55";
const WHATSAPP_USER_SUFFIX = "@s.whatsapp.net";

@Injectable()
export class ContactImportService {
  private readonly logger = new Logger(ContactImportService.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly connectionService: WhatsappConnectionService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly evolutionApiService: EvolutionApiService,
    private readonly googlePeopleService: GooglePeopleService,
  ) {}

  /** Every contact and chat of the connected WhatsApp, chats first. */
  async whatsappCandidates(user: User) {
    const connection = await this.connectionService.requireConnected(user.id);
    const ownPhone = toCustomerPhone(connection.phone);

    const [contacts, chats] = await Promise.all([
      this.evolutionApiService
        .findContacts(connection.instanceName)
        .catch(() => []),
      this.evolutionApiService
        .findChats(connection.instanceName)
        .catch(() => []),
    ]);

    const candidates = new Map<string, ContactCandidate>();
    const add = (candidate: ContactCandidate) => {
      if (candidate.phone === ownPhone) return;
      const key = phoneMatchingKey(candidate.phone);
      const existing = candidates.get(key);
      if (!existing) {
        candidates.set(key, candidate);
        return;
      }
      existing.name = existing.name ?? candidate.name;
      existing.profilePictureUrl =
        existing.profilePictureUrl ?? candidate.profilePictureUrl;
      if (!existing.hasHistory && candidate.hasHistory) {
        existing.hasHistory = true;
        existing.chatJid = candidate.chatJid;
        existing.lastMessageAt = candidate.lastMessageAt;
        existing.lastMessagePreview = candidate.lastMessagePreview;
      }
    };

    for (const chat of chats) {
      const candidate = this.fromChat(chat);
      if (candidate) add(candidate);
    }

    for (const contact of contacts) {
      const jid = contact.remoteJid ?? contact.id;
      if (!isPersonalJid(jid)) continue;
      const phone = toCustomerPhone(jid);
      if (!phone) continue;
      add({
        ...emptyCandidate(phone, "whatsapp"),
        name: contact.pushName?.trim() || null,
        profilePictureUrl: contact.profilePicUrl ?? null,
      });
    }

    const conversations = await this.conversationRepository.find({
      where: { userId: user.id, active: true },
    });
    for (const conversation of conversations) {
      const phone = toCustomerPhone(conversation.phone);
      if (!phone) continue;
      add({
        ...emptyCandidate(phone, "whatsapp"),
        name: conversation.contactName,
        chatJid: conversation.remoteJid,
        hasHistory: Boolean(conversation.lastMessageAt),
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview,
        profilePictureUrl: conversation.profilePictureUrl,
      });
      const added = candidates.get(phoneMatchingKey(phone));
      if (added && conversation.hidden) added.hiddenInInbox = true;
    }

    return this.withCustomers(user.id, [...candidates.values()]);
  }

  /** The broker's Google contacts, marked with the WhatsApp chats they have. */
  async googleCandidates(user: User, accessToken: string) {
    const contacts = await this.googlePeopleService.listContacts(accessToken);

    const chatsByKey = new Map<string, ContactCandidate>();
    const connection = await this.connectionService
      .requireConnected(user.id)
      .catch(() => null);
    if (connection) {
      const chats = await this.evolutionApiService
        .findChats(connection.instanceName)
        .catch(() => []);
      for (const chat of chats) {
        const candidate = this.fromChat(chat);
        if (candidate)
          chatsByKey.set(phoneMatchingKey(candidate.phone), candidate);
      }
    }

    const candidates = new Map<string, ContactCandidate>();
    for (const contact of contacts) {
      for (const rawPhone of contact.phones) {
        const phone = toCustomerPhone(rawPhone);
        if (!phone) continue;
        const key = phoneMatchingKey(phone);
        if (candidates.has(key)) continue;
        const chat = chatsByKey.get(key);
        candidates.set(key, {
          ...emptyCandidate(phone, "google"),
          name: contact.name,
          chatJid: chat?.chatJid ?? null,
          hasHistory: chat?.hasHistory ?? false,
          lastMessageAt: chat?.lastMessageAt ?? null,
          lastMessagePreview: chat?.lastMessagePreview ?? null,
          profilePictureUrl: chat?.profilePictureUrl ?? null,
        });
      }
    }

    return this.withCustomers(user.id, [...candidates.values()]);
  }

  /**
   * Saves the chosen contacts as customers. Numbers already in the base are
   * skipped, never duplicated. With the WhatsApp connected, the chat is linked
   * to the new customer and, when asked, the messages so far come along.
   */
  async importContacts(user: User, dto: ContactImportDto) {
    const kanbanIds = new Set(
      (
        await this.kanbanRepository.find({
          where: { userId: user.id, active: true },
          select: { id: true },
        })
      ).map((kanban) => kanban.id),
    );
    const validKanban = (id: string | null | undefined) =>
      id && kanbanIds.has(id) ? id : null;

    const knownKeys = new Set(
      (await this.activeCustomers(user.id)).map((customer) =>
        phoneMatchingKey(customer.phone),
      ),
    );

    const connection = await this.connectionService
      .requireConnected(user.id)
      .catch(() => null);

    const created: { id: string; name: string; phone: string }[] = [];
    const skipped: { phone: string; name: string; reason: SkipReason }[] = [];
    const historyJobs: HistoryJob[] = [];

    for (const item of dto.contacts) {
      const name = item.name.trim();
      const phone = toCustomerPhone(item.phone);
      if (!phone) {
        skipped.push({ phone: item.phone, name, reason: "invalid_phone" });
        continue;
      }
      const key = phoneMatchingKey(phone);
      if (knownKeys.has(key)) {
        skipped.push({ phone, name, reason: "already_customer" });
        continue;
      }

      let customer: Customer;
      try {
        const entity = CustomerMapper.toEntity({
          name,
          phone,
          kanbanId: validKanban(item.kanbanId) ?? validKanban(dto.kanbanId),
          budget: item.budget ? Number(item.budget).toFixed(2) : null,
          comment: item.note?.trim() || null,
        });
        entity.user = user;
        customer =
          (await this.restoreRemoved(user.id, entity)) ??
          (await this.customerRepository.save(entity));
      } catch (error) {
        this.logger.warn(`Contact import failed: ${String(error)}`);
        skipped.push({ phone, name, reason: "failed" });
        continue;
      }

      knownKeys.add(key);
      created.push({ id: customer.id, name: customer.name, phone });

      if (connection) {
        const conversation = await this.linkConversation(
          user.id,
          customer,
          item.chatJid ?? null,
          dto.importHistory,
        );
        if (conversation && dto.importHistory && item.chatJid) {
          historyJobs.push({ conversation, chatJid: item.chatJid });
        }
      }
    }

    if (connection && historyJobs.length) {
      void this.importHistories(connection, historyJobs);
    }

    return {
      created: created.length,
      customers: created,
      skipped,
      historyQueued: historyJobs.length,
    };
  }

  /** A customer removed before comes back instead of clashing with the same number. */
  private async restoreRemoved(userId: string, entity: Customer) {
    const removed = await this.customerRepository.findOne({
      where: { userId, phone: entity.phone, active: false },
    });
    if (!removed) return null;
    await this.customerRepository.update(removed.id, {
      active: true,
      lost: false,
      name: entity.name,
      budget: entity.budget ?? removed.budget,
      kanban: entity.kanban ?? null,
    });
    return this.customerRepository.findOneByOrFail({ id: removed.id });
  }

  /**
   * Ties the customer to the chat with the same number. A new chat is opened
   * only when its history is coming, so the inbox does not fill with empty chats.
   */
  private async linkConversation(
    userId: string,
    customer: Customer,
    chatJid: string | null,
    createWhenMissing: boolean,
  ) {
    const key = phoneMatchingKey(customer.phone);
    const lastDigits = customer.phone.substring(customer.phone.length - 8);
    const existing = (
      await this.conversationRepository
        .createQueryBuilder("conversation")
        .where("conversation.userId = :userId", { userId })
        .andWhere("conversation.phone LIKE :phone", {
          phone: `%${lastDigits}`,
        })
        .getMany()
    ).find((conversation) => phoneMatchingKey(conversation.phone) === key);

    if (existing) {
      if (!existing.customerId) {
        existing.customerId = customer.id;
        await this.conversationRepository.update(existing.id, {
          customerId: customer.id,
        });
        existing.customer = customer;
        this.conversationService.emitUpdated(existing);
      }
      return existing;
    }

    if (!createWhenMissing || !chatJid) return null;

    const jid = isPersonalJid(chatJid)
      ? chatJid
      : `${BRAZIL_JID_PREFIX}${customer.phone}${WHATSAPP_USER_SUFFIX}`;
    const conversation = await this.conversationService.findOrCreateByJid(
      userId,
      jid,
      customer.name,
    );
    if (!conversation.customerId) {
      conversation.customerId = customer.id;
      conversation.customer = customer;
      await this.conversationRepository.update(conversation.id, {
        customerId: customer.id,
      });
    }
    return conversation;
  }

  /** One chat at a time in the background, the phone is not flooded. */
  private async importHistories(
    connection: WhatsappConnection,
    jobs: HistoryJob[],
  ) {
    for (const job of jobs) {
      await this.messageService
        .importHistory(connection, job.conversation, job.chatJid)
        .catch((error: unknown) => {
          this.logger.warn(
            `History import of ${job.chatJid} failed: ${String(error)}`,
          );
        });
    }
  }

  private fromChat(chat: EvolutionChat): ContactCandidate | null {
    const jid = chat.remoteJid ?? chat.id;
    if (!jid || jid.endsWith("@g.us") || jid.endsWith("@broadcast")) {
      return null;
    }

    const lastMessage = chat.lastMessage ?? null;
    const phoneJid = [
      jid,
      lastMessage?.key?.remoteJidAlt,
      lastMessage?.key?.senderPn,
    ].find((candidate) => isPersonalJid(candidate));
    const phone = toCustomerPhone(phoneJid);
    if (!phone) return null;

    const parsed = lastMessage ? parseEvolutionMessage(lastMessage) : null;
    const timestamp = Number(lastMessage?.messageTimestamp);
    const lastMessageAt =
      Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp * 1000)
        : chat.updatedAt
          ? new Date(chat.updatedAt)
          : null;

    return {
      ...emptyCandidate(phone, "whatsapp"),
      name:
        chat.name?.trim() ||
        chat.pushName?.trim() ||
        (lastMessage && !lastMessage.key?.fromMe
          ? lastMessage.pushName?.trim()
          : null) ||
        null,
      chatJid: jid,
      hasHistory: true,
      lastMessageAt,
      lastMessagePreview: parsed ? previewOf(parsed.type, parsed.body) : null,
      profilePictureUrl: chat.profilePicUrl ?? null,
    };
  }

  private activeCustomers(userId: string) {
    return this.customerRepository.find({
      where: { userId, active: true },
      select: { id: true, name: true, phone: true },
    });
  }

  private async withCustomers(userId: string, candidates: ContactCandidate[]) {
    const customersByKey = new Map(
      (await this.activeCustomers(userId)).map((customer) => [
        phoneMatchingKey(customer.phone),
        customer,
      ]),
    );

    for (const candidate of candidates) {
      const customer = customersByKey.get(phoneMatchingKey(candidate.phone));
      candidate.customerId = customer?.id ?? null;
      candidate.customerName = customer?.name ?? null;
    }

    return candidates.sort((first, second) => {
      if (first.hasHistory !== second.hasHistory) {
        return first.hasHistory ? -1 : 1;
      }
      const firstTime = first.lastMessageAt?.getTime() ?? 0;
      const secondTime = second.lastMessageAt?.getTime() ?? 0;
      if (firstTime !== secondTime) return secondTime - firstTime;
      return (first.name ?? "~").localeCompare(second.name ?? "~", "pt-BR");
    });
  }
}

const emptyCandidate = (
  phone: string,
  source: ContactSource,
): ContactCandidate => ({
  phone,
  name: null,
  source,
  chatJid: null,
  hasHistory: false,
  lastMessageAt: null,
  lastMessagePreview: null,
  profilePictureUrl: null,
  customerId: null,
  customerName: null,
  hiddenInInbox: false,
});
