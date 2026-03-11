import { ForbiddenException, Injectable } from "@nestjs/common";
import { WhatsappHostService } from "./whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import {
  WAWebCustomMessageDto,
  WhatsappChatMapper,
} from "../mappers/whatsapp-chat.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import WAWebJS from "whatsapp-web.js";

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

    const [contact, messages] = await Promise.all([
      chat.getContact(),
      chat.fetchMessages({ limit: 50 }),
    ]);

    const [messageWithMedia, profile] = await Promise.all([
      Promise.all(
        messages?.map((message) => this.syncMessageWithMedia(message)),
      ),
      contact.getProfilePicUrl().catch(() => null),
    ]);

    void client.sendSeen(foundChat.id);

    return WhatsappChatMapper.toDto(
      { ...chat, contact, profile },
      messageWithMedia,
      foundChat?.customer,
    );
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

  private async syncMessageWithMedia(
    message: WAWebJS.Message,
  ): Promise<WAWebCustomMessageDto> {
    if (!message.hasMedia) {
      return { ...message, media: null };
    }

    const timeoutPromise: Promise<null> = new Promise((resolve) =>
      setTimeout(() => resolve(null), 5000),
    );

    try {
      const media = await Promise.race<WAWebJS.MessageMedia | null>([
        message.downloadMedia(),
        timeoutPromise,
      ]);

      return { ...message, media };
    } catch (error) {
      console.warn("Error downloading media:", error);
      return { ...message, media: null };
    }
  }
}
