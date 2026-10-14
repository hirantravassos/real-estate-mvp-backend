import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EvolutionApiService } from "../../../infrastructure/evolution/services/evolution-api.service";
import {
  EvolutionChat,
  EvolutionContact,
} from "../../../infrastructure/evolution/types/evolution.type";
import { GooglePeopleService } from "../../../infrastructure/google/services/google-people.service";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerMapper } from "../../customers/mappers/customer.mapper";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { Conversation } from "../../inbox/entities/conversation.entity";
import {
  parseEvolutionMessage,
  previewOf,
} from "../../inbox/helpers/evolution-message.parser";
import {
  isPersonalJid,
  onlyDigits,
  phoneMatchingKey,
  toCustomerPhone,
} from "../../inbox/helpers/whatsapp-phone.helper";
import { ConversationService } from "../../inbox/services/conversation.service";
import {
  HistoryImportJob,
  MessageService,
} from "../../inbox/services/message.service";
import { WhatsappConnectionService } from "../../inbox/services/whatsapp-connection.service";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import {
  PhotoAvatarJob,
  PhotoAvatarService,
} from "../../avatars/services/photo-avatar.service";
import { User } from "../../users/entities/user.entity";
import {
  ContactAddDto,
  ContactImportDto,
  ContactSource,
} from "../dtos/contact-import.dto";

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

interface WhatsappSnapshot {
  contacts: EvolutionContact[];
  chats: EvolutionChat[];
  expiresAt: number;
}

/** How long a read of the phone serves the searches. */
const WHATSAPP_SNAPSHOT_MILLISECONDS = 5 * 60 * 1000;
/** Brokers whose phone read stays in memory, the oldest leaves first. */
const WHATSAPP_SNAPSHOT_USERS = 200;
const DIRECTORY_RESULTS = 20;
const MINIMUM_SEARCH_LENGTH = 2;

const emptySnapshot = (): WhatsappSnapshot => ({
  contacts: [],
  chats: [],
  expiresAt: 0,
});

/** Lowercase and without accents, so "joao" finds "João". */
const searchableText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const candidateNames = (candidate: ContactCandidate) =>
  [candidate.name, candidate.customerName]
    .filter((name): name is string => Boolean(name))
    .map(searchableText);

const candidateMatches = (
  candidate: ContactCandidate,
  term: string,
  digits: string,
) => {
  if (
    term.length >= MINIMUM_SEARCH_LENGTH &&
    candidateNames(candidate).some((name) => name.includes(term))
  ) {
    return true;
  }
  if (digits.length < 3) return false;
  return (
    candidate.phone.includes(digits) || `55${candidate.phone}`.includes(digits)
  );
};

const nameStartsWith = (candidate: ContactCandidate, term: string) =>
  Boolean(term) &&
  candidateNames(candidate).some((name) => name.startsWith(term));

const BRAZIL_JID_PREFIX = "55";
const WHATSAPP_USER_SUFFIX = "@s.whatsapp.net";

@Injectable()
export class ContactImportService {
  private readonly logger = new Logger(ContactImportService.name);
  /** The last read of each broker's phone, so searches stay fast. */
  private readonly whatsappSnapshots = new Map<string, WhatsappSnapshot>();

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
    private readonly photoAvatarService: PhotoAvatarService,
  ) {}

  /** Every contact and chat of the connected WhatsApp, chats first. */
  async whatsappCandidates(user: User) {
    const connection = await this.connectionService.requireConnected(user.id);
    const snapshot = await this.loadWhatsappSnapshot(
      user.id,
      connection.instanceName,
    );
    const candidates = await this.collectWhatsappCandidates(
      user.id,
      toCustomerPhone(connection.phone),
      snapshot,
    );
    return this.withCustomers(user.id, candidates);
  }

  /**
   * Finds people by name or number among the WhatsApp contacts and the chats
   * already open in the inbox, saved as customers or not, so the broker can
   * pick anyone they talk to without importing the whole list first.
   */
  async searchDirectory(user: User, search: string) {
    const term = searchableText(search.trim());
    const digits = onlyDigits(search);
    if (term.length < MINIMUM_SEARCH_LENGTH && digits.length < 3) return [];

    const connection = await this.connectionService
      .requireConnected(user.id)
      .catch(() => null);
    const snapshot = connection
      ? await this.cachedWhatsappSnapshot(user.id, connection.instanceName)
      : emptySnapshot();
    const candidates = await this.collectWhatsappCandidates(
      user.id,
      toCustomerPhone(connection?.phone),
      snapshot,
    );

    const matches = candidates.filter((candidate) =>
      candidateMatches(candidate, term, digits),
    );
    const sorted = await this.withCustomers(user.id, matches);
    return sorted
      .sort(
        (first, second) =>
          Number(nameStartsWith(second, term)) -
          Number(nameStartsWith(first, term)),
      )
      .slice(0, DIRECTORY_RESULTS);
  }

  /**
   * Saves one contact as a customer right from a search. A number already in
   * the base returns that customer instead of a duplicate.
   */
  async addContact(user: User, dto: ContactAddDto) {
    const phone = toCustomerPhone(dto.phone);
    if (!phone) throw new BadRequestException("Número de WhatsApp inválido.");
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Informe o nome do contato.");

    const key = phoneMatchingKey(phone);
    const known = (await this.activeCustomers(user.id)).find(
      (customer) => phoneMatchingKey(customer.phone) === key,
    );
    if (known) {
      return CustomerMapper.toDto(
        await this.customerRepository.findOneByOrFail({
          id: known.id,
          userId: user.id,
          active: true,
        }),
      );
    }

    const entity = CustomerMapper.toEntity({
      name,
      phone,
      kanbanId: null,
      comment: null,
      roles: dto.role ? [dto.role] : undefined,
    });
    entity.user = user;
    const customer =
      (await this.restoreRemoved(user.id, entity)) ??
      (await this.customerRepository.save(entity));

    const connection = await this.connectionService
      .requireConnected(user.id)
      .catch(() => null);
    if (connection) {
      await this.linkConversation(user.id, customer, null, false).catch(
        (error: unknown) => {
          this.logger.warn(`Chat link failed: ${String(error)}`);
        },
      );
    }
    this.forgetWhatsappSnapshot(user.id);

    return CustomerMapper.toDto(customer);
  }

  /** The contacts and chats of the phone, merged with the inbox chats. */
  private async collectWhatsappCandidates(
    userId: string,
    ownPhone: string | null,
    snapshot: WhatsappSnapshot,
  ) {
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

    for (const chat of snapshot.chats) {
      const candidate = this.fromChat(chat);
      if (candidate) add(candidate);
    }

    for (const contact of snapshot.contacts) {
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
      where: { userId, active: true },
    });
    for (const conversation of conversations) {
      const phone = toCustomerPhone(conversation.phone);
      if (!phone) continue;
      add({
        ...emptyCandidate(phone, "whatsapp"),
        name: conversation.contactName?.trim() || null,
        chatJid: conversation.remoteJid,
        hasHistory: Boolean(conversation.lastMessageAt),
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview,
        profilePictureUrl: conversation.profilePictureUrl,
      });
      const added = candidates.get(phoneMatchingKey(phone));
      if (!added) continue;
      // The name saved in the inbox wins over a missing push name.
      added.name = added.name ?? (conversation.contactName?.trim() || null);
      if (conversation.hidden) added.hiddenInInbox = true;
    }

    return [...candidates.values()];
  }

  /** Reads the phone again and keeps the result for the searches after it. */
  private async loadWhatsappSnapshot(userId: string, instanceName: string) {
    const [contacts, chats] = await Promise.all([
      this.evolutionApiService.findContacts(instanceName).catch(() => []),
      this.evolutionApiService.findChats(instanceName).catch(() => []),
    ]);
    const snapshot: WhatsappSnapshot = {
      contacts,
      chats,
      expiresAt: Date.now() + WHATSAPP_SNAPSHOT_MILLISECONDS,
    };
    this.whatsappSnapshots.delete(userId);
    this.whatsappSnapshots.set(userId, snapshot);
    while (this.whatsappSnapshots.size > WHATSAPP_SNAPSHOT_USERS) {
      const [oldestUserId] = [...this.whatsappSnapshots.keys()];
      this.whatsappSnapshots.delete(oldestUserId);
    }
    return snapshot;
  }

  /** Each keystroke of a search must not read the whole phone again. */
  private async cachedWhatsappSnapshot(userId: string, instanceName: string) {
    const cached = this.whatsappSnapshots.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached;
    return this.loadWhatsappSnapshot(userId, instanceName);
  }

  private forgetWhatsappSnapshot(userId: string) {
    this.whatsappSnapshots.delete(userId);
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
    const historyJobs: HistoryImportJob[] = [];
    const photoJobs: PhotoAvatarJob[] = [];

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
      if (dto.avatarFromPhoto) {
        photoJobs.push({ customerId: customer.id, name: customer.name, phone });
      }

      if (connection) {
        const conversation = await this.linkConversation(
          user.id,
          customer,
          item.chatJid ?? null,
          dto.importHistory,
        );
        if (conversation && dto.importHistory && item.chatJid) {
          historyJobs.push({
            conversation,
            chatJids: [item.chatJid, conversation.remoteJid],
          });
        }
      }
    }

    if (connection && historyJobs.length) {
      void this.messageService
        .importHistories(connection, historyJobs)
        .catch((error: unknown) => {
          this.logger.warn(`History import failed: ${String(error)}`);
        });
    }
    if (connection && photoJobs.length) {
      void this.photoAvatarService
        .applyFromWhatsapp(user.id, connection.instanceName, photoJobs)
        .catch((error: unknown) => {
          this.logger.warn(`Photo avatars failed: ${String(error)}`);
        });
    }

    return {
      created: created.length,
      customers: created,
      skipped,
      historyQueued: historyJobs.length,
      photosQueued: connection ? photoJobs.length : 0,
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
