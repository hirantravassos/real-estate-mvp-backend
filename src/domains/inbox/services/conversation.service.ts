import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Like, Repository } from "typeorm";
import { EvolutionApiService } from "../../../infrastructure/evolution/services/evolution-api.service";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { User } from "../../users/entities/user.entity";
import { CustomerMapper } from "../../customers/mappers/customer.mapper";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { PhotoAvatarService } from "../../avatars/services/photo-avatar.service";
import {
  ConversationCustomerCreateDto,
  ConversationFilterDto,
  ConversationUpdateDto,
} from "../dtos/inbox.dto";
import { Conversation } from "../entities/conversation.entity";
import { Message } from "../entities/message.entity";
import { MessageDirection, MessageStatus } from "../enums/inbox.enum";
import {
  numberFromJid,
  onlyDigits,
  phoneMatchingKey,
  toCustomerPhone,
  toWhatsappNumber,
} from "../helpers/whatsapp-phone.helper";
import { previewOf } from "../helpers/evolution-message.parser";
import { InboxMapper } from "../mappers/inbox.mapper";
import { WhatsappConnectionService } from "./whatsapp-connection.service";

const WHATSAPP_USER_SUFFIX = "@s.whatsapp.net";

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    private readonly customerRepository: CustomerRepository,
    private readonly connectionService: WhatsappConnectionService,
    private readonly evolutionApiService: EvolutionApiService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly photoAvatarService: PhotoAvatarService,
  ) {}

  async findAll(user: User, filter: ConversationFilterDto) {
    const query = this.conversationRepository
      .createQueryBuilder("conversation")
      .leftJoinAndSelect("conversation.customer", "customer")
      .where("conversation.userId = :userId", { userId: user.id })
      .andWhere("conversation.active = :active", { active: true });

    if (filter.hidden) {
      query.andWhere("conversation.hidden = :hidden", { hidden: true });
    } else {
      query
        .andWhere("conversation.hidden = :hidden", { hidden: false })
        .andWhere("conversation.archived = :archived", {
          archived: filter.archived ?? false,
        });
    }

    if (filter.unreadOnly) {
      query.andWhere("conversation.unreadCount > 0");
    }

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;
      query.andWhere(
        new Brackets((where) => {
          where
            .where("conversation.contactName LIKE :search", { search })
            .orWhere("conversation.phone LIKE :search", { search })
            .orWhere("customer.name LIKE :search", { search });
        }),
      );
    }

    const [data, total] = await query
      .orderBy("conversation.lastMessageAt", "DESC")
      .addOrderBy("conversation.createdAt", "DESC")
      .skip(filter.skip)
      .take(filter.limit)
      .getManyAndCount();

    return PaginationMapper.toDto(
      [data.map((item) => InboxMapper.toConversationDto(item)), total],
      filter,
    );
  }

  async unreadSummary(user: User) {
    const result = await this.conversationRepository
      .createQueryBuilder("conversation")
      .select("COUNT(conversation.id)", "conversations")
      .addSelect("COALESCE(SUM(conversation.unreadCount), 0)", "messages")
      .where("conversation.userId = :userId", { userId: user.id })
      .andWhere("conversation.active = :active", { active: true })
      .andWhere("conversation.archived = :archived", { archived: false })
      .andWhere("conversation.hidden = :hidden", { hidden: false })
      .andWhere("conversation.unreadCount > 0")
      .getRawOne<{ conversations: string; messages: string }>();

    return {
      conversations: Number(result?.conversations ?? 0),
      messages: Number(result?.messages ?? 0),
    };
  }

  async findOne(user: User, id: string) {
    return InboxMapper.toConversationDto(await this.findEntity(user.id, id));
  }

  async findEntity(userId: string, id: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id, userId, active: true },
      relations: { customer: true },
    });
    if (!conversation) throw new NotFoundException("Conversa não encontrada.");
    return conversation;
  }

  /** The customer's chat, created on the spot when it does not exist yet. */
  async openForCustomer(user: User, customerId: string) {
    const customer = await this.customerRepository.findOneBy({
      id: customerId,
      userId: user.id,
      active: true,
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");

    const existing = await this.conversationRepository.findOne({
      where: { userId: user.id, customerId, active: true },
      relations: { customer: true },
    });
    if (existing) return InboxMapper.toConversationDto(existing);

    const number = toWhatsappNumber(customer.phone);
    const conversation = await this.findOrCreateByJid(
      user.id,
      `${number}${WHATSAPP_USER_SUFFIX}`,
      customer.name,
    );
    if (!conversation.customerId) {
      conversation.customerId = customer.id;
      conversation.customer = customer;
      await this.conversationRepository.save(conversation);
    }
    return InboxMapper.toConversationDto(conversation);
  }

  /**
   * Finds the chat of a WhatsApp contact. A chat opened from a customer may
   * hold the number in another form (with or without the ninth digit), so it
   * is matched by area code and last digits before creating a new one.
   */
  async findOrCreateByJid(
    userId: string,
    remoteJid: string,
    contactName?: string | null,
  ): Promise<Conversation> {
    const found = await this.conversationRepository.findOne({
      where: { userId, remoteJid },
      relations: { customer: true },
    });
    if (found) {
      if (!found.active || (contactName && !found.contactName)) {
        found.active = true;
        found.contactName = found.contactName ?? contactName ?? null;
        await this.conversationRepository.update(found.id, {
          active: true,
          contactName: found.contactName,
        });
      }
      return found;
    }

    const phone = numberFromJid(remoteJid);
    const matchingKey = phoneMatchingKey(phone);
    const lastDigits = phone.substring(phone.length - 8);

    const sameNumber = (
      await this.conversationRepository.find({
        where: { userId, phone: Like(`%${lastDigits}`) },
        relations: { customer: true },
      })
    ).find(
      (conversation) => phoneMatchingKey(conversation.phone) === matchingKey,
    );

    if (sameNumber) {
      sameNumber.remoteJid = remoteJid;
      sameNumber.phone = phone;
      sameNumber.active = true;
      return this.conversationRepository.save(sameNumber);
    }

    const customer = (
      await this.customerRepository.find({
        where: { userId, active: true, phone: Like(`%${lastDigits}`) },
      })
    ).find((candidate) => phoneMatchingKey(candidate.phone) === matchingKey);

    try {
      const created = await this.conversationRepository.save(
        this.conversationRepository.create({
          userId,
          remoteJid,
          phone,
          contactName: contactName ?? null,
          customerId: customer?.id ?? null,
          unreadCount: 0,
        }),
      );
      created.customer = customer ?? null;
      void this.refreshProfilePicture(created);
      return created;
    } catch {
      // Two webhooks for the same new contact at once, the other one created it.
      return this.findOrCreateByJid(userId, remoteJid, contactName);
    }
  }

  async update(user: User, id: string, dto: ConversationUpdateDto) {
    const conversation = await this.findEntity(user.id, id);

    if (dto.archived !== undefined) conversation.archived = dto.archived;
    if (dto.hidden !== undefined) conversation.hidden = dto.hidden;

    if (dto.customerId !== undefined) {
      if (dto.customerId === null) {
        conversation.customerId = null;
        conversation.customer = null;
      } else {
        const customer = await this.customerRepository.findOneBy({
          id: dto.customerId,
          userId: user.id,
          active: true,
        });
        if (!customer) throw new NotFoundException("Cliente não encontrado.");
        conversation.customerId = customer.id;
        conversation.customer = customer;
      }
    }

    await this.conversationRepository.save(conversation);
    return this.emitUpdated(conversation);
  }

  /**
   * Turns the contact of a chat into a customer and links them. When the
   * number is already a customer, the chat is just linked, never duplicated.
   */
  async saveAsCustomer(
    user: User,
    id: string,
    dto: ConversationCustomerCreateDto,
  ) {
    const conversation = await this.findEntity(user.id, id);
    const phone =
      toCustomerPhone(conversation.phone) ?? onlyDigits(conversation.phone);
    const key = phoneMatchingKey(phone);
    const lastDigits = phone.substring(phone.length - 8);

    const sameNumber = await this.customerRepository.find({
      where: { userId: user.id, phone: Like(`%${lastDigits}`) },
    });
    const existing = sameNumber.find(
      (customer) => customer.active && phoneMatchingKey(customer.phone) === key,
    );

    let customer = existing ?? null;
    let created = false;

    if (!customer) {
      const kanban = dto.kanbanId
        ? await this.kanbanRepository.findOneBy({
            id: dto.kanbanId,
            userId: user.id,
            active: true,
          })
        : null;
      const removed = sameNumber.find(
        (candidate) => !candidate.active && candidate.phone === phone,
      );

      if (removed) {
        await this.customerRepository.update(removed.id, {
          active: true,
          lost: false,
          name: dto.name.trim(),
          kanban: kanban ?? null,
          budget: dto.budget ? Number(dto.budget).toFixed(2) : removed.budget,
        });
        customer = await this.customerRepository.findOneByOrFail({
          id: removed.id,
        });
      } else {
        const entity = CustomerMapper.toEntity({
          name: dto.name.trim(),
          phone,
          kanbanId: kanban?.id ?? null,
          budget: dto.budget ? Number(dto.budget).toFixed(2) : null,
          comment: dto.note?.trim() || null,
        });
        entity.user = user;
        customer = await this.customerRepository.save(entity);
      }
      created = true;
    }

    conversation.customerId = customer.id;
    conversation.customer = customer;
    await this.conversationRepository.update(conversation.id, {
      customerId: customer.id,
    });

    if (created && dto.avatarFromPhoto) {
      const connection = await this.connectionService
        .requireConnected(user.id)
        .catch(() => null);
      if (connection) {
        void this.photoAvatarService
          .applyFromWhatsapp(user.id, connection.instanceName, [
            { customerId: customer.id, name: customer.name, phone },
          ])
          .then((updated) => {
            if (updated) void this.emitFresh(conversation);
          })
          .catch(() => undefined);
      }
    }

    return {
      conversation: this.emitUpdated(conversation),
      customer: { id: customer.id, name: customer.name },
      created,
    };
  }

  async markAsRead(user: User, id: string) {
    const conversation = await this.findEntity(user.id, id);

    const unread = await this.messageRepository.find({
      where: {
        conversationId: conversation.id,
        userId: user.id,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.RECEIVED,
      },
      select: { id: true, externalId: true },
    });

    if (unread.length) {
      await this.messageRepository.update(
        {
          conversationId: conversation.id,
          direction: MessageDirection.INBOUND,
          status: MessageStatus.RECEIVED,
        },
        { status: MessageStatus.READ },
      );

      const connection = await this.connectionService
        .requireConnected(user.id)
        .catch(() => null);
      if (connection) {
        void this.evolutionApiService.markAsRead(
          connection.instanceName,
          unread
            .filter((message) => message.externalId)
            .map((message) => ({
              remoteJid: conversation.remoteJid,
              fromMe: false,
              id: message.externalId as string,
            })),
        );
      }
    }

    if (conversation.unreadCount !== 0) {
      conversation.unreadCount = 0;
      await this.conversationRepository.update(conversation.id, {
        unreadCount: 0,
      });
      this.emitUpdated(conversation);
    }

    return InboxMapper.toConversationDto(conversation);
  }

  async remove(user: User, id: string) {
    const conversation = await this.findEntity(user.id, id);
    await this.conversationRepository.update(conversation.id, {
      active: false,
    });
  }

  /**
   * Moves the chat to the top with the newest message. Webhooks arrive in
   * parallel, so the counters are changed in the database, not in memory.
   */
  async registerMessage(conversation: Conversation, message: Message) {
    await this.moveToTop(conversation, message);

    if (message.direction === MessageDirection.INBOUND) {
      await this.conversationRepository
        .createQueryBuilder()
        .update(Conversation)
        .set({ unreadCount: () => "unreadCount + 1", archived: false })
        .where("id = :id", { id: conversation.id })
        .execute();
    }

    await this.emitFresh(conversation);
  }

  /** Old messages brought from the phone: they move the chat, but are not unread. */
  async registerHistory(conversation: Conversation, newest: Message) {
    await this.moveToTop(conversation, newest);
    await this.emitFresh(conversation);
  }

  private async moveToTop(conversation: Conversation, message: Message) {
    await this.conversationRepository
      .createQueryBuilder()
      .update(Conversation)
      .set({
        lastMessageAt: message.sentAt,
        lastMessagePreview: previewOf(message.type, message.body),
        lastMessageDirection: message.direction,
      })
      .where("id = :id", { id: conversation.id })
      .andWhere("(lastMessageAt IS NULL OR lastMessageAt <= :sentAt)", {
        sentAt: message.sentAt,
      })
      .execute();
  }

  private async emitFresh(conversation: Conversation) {
    const fresh = await this.conversationRepository.findOne({
      where: { id: conversation.id },
      relations: { customer: true },
    });
    if (!fresh) return;
    Object.assign(conversation, fresh);
    this.emitUpdated(fresh);
  }

  emitUpdated(conversation: Conversation) {
    const dto = InboxMapper.toConversationDto(conversation);
    this.realtimeGateway.emitToUser(
      conversation.userId,
      "conversation.updated",
      dto,
    );
    return dto;
  }

  private async refreshProfilePicture(conversation: Conversation) {
    const connection = await this.connectionService
      .requireConnected(conversation.userId)
      .catch(() => null);
    if (!connection) return;

    const url = await this.evolutionApiService.fetchProfilePicture(
      connection.instanceName,
      conversation.phone,
    );
    if (!url) return;

    conversation.profilePictureUrl = url;
    await this.conversationRepository.update(conversation.id, {
      profilePictureUrl: url,
    });
    this.emitUpdated(conversation);
  }
}
