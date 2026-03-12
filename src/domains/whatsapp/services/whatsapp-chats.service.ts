import { ForbiddenException, Injectable } from "@nestjs/common";
import { WhatsappHostService } from "./whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";

@Injectable()
export class WhatsappChatsService {
  constructor(
    private readonly whatsappHostService: WhatsappHostService,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAll(user: User, pagination: PaginationRequestDto) {
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

  async findAllUnread(user: User) {
    const data = await this.whatsappChatRepository.find({
      where: [
        {
          user: { id: user.id },
          customer: { ignored: false },
          ignored: false,
          unread: true,
        },
        {
          user: { id: user.id },
          customer: IsNull(),
          ignored: false,
          unread: true,
        },
      ],
    });

    return data?.length;
  }

  async findOne(user: User, chatId: string) {
    const foundChat = await this.whatsappChatRepository.findOne({
      where: {
        user: { id: user.id },
        id: chatId,
      },
      relations: {
        customer: {
          kanban: true,
        },
      },
    });

    if (!foundChat) {
      throw new ForbiddenException("Chat not found for this user");
    }

    const client = await this.whatsappHostService.getClientOrThrow(user);
    const chat = await client.getChatById(foundChat.id);

    const limit = 40;
    const [contact, messages] = await Promise.all([
      chat.getContact(),
      chat.fetchMessages({ limit }),
    ]);

    const profile = await contact.getProfilePicUrl().catch(() => null);

    void this.markAsRead(user, foundChat.id);

    return WhatsappChatMapper.toDto(
      { ...chat, contact, profile },
      messages,
      foundChat?.customer,
    );
  }

  async findMessageMedia(user: User, messageId: string) {
    const client = await this.whatsappHostService
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

    const client = await this.whatsappHostService
      .getClientOrThrow(user)
      .catch(() => {
        return null;
      });

    if (!client) return;

    await client.sendSeen(chatId);
  }
}
