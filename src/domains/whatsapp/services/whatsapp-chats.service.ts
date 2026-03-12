import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WhatsappClientService } from "./whatsapp-client.service";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { WhatsappStatusService } from "./whatsapp-status.service";

@Injectable()
export class WhatsappChatsService {
  constructor(
    private readonly whatsappStatusService: WhatsappStatusService,
    private readonly whatsappClientService: WhatsappClientService,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAll(user: User, pagination: PaginationRequestDto) {
    void this.whatsappStatusService.clearUpdateStatus(user);

    const [data, total] = await this.whatsappChatRepository.findAndCount({
      where: { user: { id: user.id }, ignored: false },
      relations: {
        customer: {
          kanban: true,
        },
      },
      order: {
        lastSentAt: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    const chats = WhatsappChatMapper.toDtoList(data);

    return PaginationMapper.toDto([chats, total], pagination);
  }

  async findAllUnread(user: User, pagination: PaginationRequestDto) {
    void this.whatsappStatusService.clearUpdateStatus(user);

    const [data, total] = await this.whatsappChatRepository.findAndCount({
      where: { user: { id: user.id }, ignored: false, unread: true },
      relations: {
        customer: {
          kanban: true,
        },
      },
      order: {
        lastSentAt: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    const chats = WhatsappChatMapper.toDtoList(data);

    return PaginationMapper.toDto([chats, total], pagination);
  }

  async findOne(user: User, chatId: string, limit = 30) {
    void this.whatsappStatusService.clearUpdateStatus(user);

    const client = await this.whatsappClientService.getClientOrThrow(user);
    const chatClient = await client.getChatById(chatId).catch(() => {
      throw new ForbiddenException(
        "[findOne.findOne] Chat not found for this user",
      );
    });

    await this.whatsappClientService.syncChat(chatClient, user);

    const [contact, messages, chat] = await Promise.all([
      chatClient.getContact().catch(() => null),
      chatClient.fetchMessages({ limit }).catch(() => []),
      this.whatsappChatRepository.findOne({
        where: {
          user: { id: user.id },
          id: chatId,
        },
        relations: {
          customer: {
            kanban: true,
          },
        },
      }),
    ]);

    if (!contact) {
      console.warn("[WhatsappChat.findOne] Contact not found for this chat");
      throw new NotFoundException("Contact not found for this chat");
    }

    const profile = await contact.getProfilePicUrl().catch(() => null);

    void this.markAsRead(user, chatId);

    return WhatsappChatMapper.toDto(
      { ...chatClient, contact, profile },
      messages,
      chat?.customer,
    );
  }

  async findMessageMedia(user: User, messageId: string) {
    const client = await this.whatsappClientService
      .getClientOrThrow(user)
      .catch(() => {
        return null;
      });

    if (!client) return null;

    const message = await client.getMessageById(messageId);

    if (!message || !message.hasMedia) {
      return null;
    }

    const media = await message.downloadMedia();

    return {
      data: media.data,
      mimetype: media.mimetype,
      filename: media.filename,
      filesize: media.filesize,
    };
  }

  async ignore(user: User, chatId: string) {
    await this.whatsappChatRepository.update(
      {
        user: { id: user.id },
        id: chatId,
      },
      {
        ignored: true,
      },
    );
  }

  async markAsRead(user: User, chatId: string) {
    await this.whatsappChatRepository.update(
      {
        user: { id: user.id },
        id: chatId,
      },
      {
        unread: false,
      },
    );

    const client = await this.whatsappClientService
      .getClientOrThrow(user)
      .catch(() => {
        return null;
      });

    if (!client) return;

    await client.sendSeen(chatId);
  }
}
