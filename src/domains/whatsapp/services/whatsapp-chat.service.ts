import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import WhatsappClientService from "./whatsapp-client.service";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, ILike, Repository } from "typeorm";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { WhatsappStatusService } from "./whatsapp-status.service";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { ValidateBoolean } from "../../../shared/decorators/validation/boolean.decorator";

export class WhatsappChatSendMessageDto {
  @IsString()
  message: string;
}

export class WhatsappChatFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search: string | null;

  @IsOptional()
  @IsUUID()
  kanban: string | null;

  @IsOptional()
  @ValidateBoolean({})
  unread: boolean | null;

  @IsOptional()
  @ValidateBoolean({})
  ignored: boolean | null;
}

@Injectable()
export class WhatsappChatService {
  private logger = new Logger(WhatsappChatService.name, { timestamp: true });

  constructor(
    private readonly whatsappStatusService: WhatsappStatusService,
    private readonly whatsappClientService: WhatsappClientService,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAll(user: User, dto: WhatsappChatFilterDto) {
    void this.whatsappStatusService.clearUpdateStatus(user);

    const [data, total] = await this.whatsappChatRepository.findAndCount({
      where: this.getWhereClause(user, dto),
      relations: {
        customer: {
          kanban: true,
        },
      },
      order: {
        lastSentAt: dto.sortOrder || "DESC",
      },
      skip: dto.skip,
      take: dto.limit,
    });

    const chats = WhatsappChatMapper.toDtoList(data);

    return PaginationMapper.toDto([chats, total], dto);
  }

  async findOne(user: User, chatId: string, limit = 20) {
    void this.whatsappStatusService.clearUpdateStatus(user);

    const client = await this.whatsappClientService.getClientOrThrow(user);
    const chatClient = await client
      .getChatById(chatId)
      .catch((err: unknown) => {
        const errorDetails = err instanceof Error ? err.stack : String(err);
        this.logger.error(
          `[findOne.getChatById] Failed to get chat: ${chatId}`,
          {
            error: errorDetails,
            userId: user.id,
          },
        );
        throw new ForbiddenException(
          `Chat ${chatId} not found or inaccessible for this user`,
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

    // if (!contact) {
    //   console.warn("[WhatsappChat.findOne] Contact not found for this chat");
    //   throw new NotFoundException("Contact not found for this chat");
    // }

    if (!chat) {
      throw new NotFoundException("Chat not found for user");
    }

    const profile = await contact?.getProfilePicUrl().catch(() => null);

    void this.markAsRead(user, chatId);

    return WhatsappChatMapper.toDto(
      { ...chatClient, contact, profile },
      chat,
      messages,
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

  async sendMessage(
    user: User,
    chatId: string,
    dto: WhatsappChatSendMessageDto,
  ) {
    const client = await this.whatsappClientService.getClientOrThrow(user);

    const [chat, isAuthorized] = await Promise.all([
      client.getChatById(chatId).catch(() => null),
      this.whatsappChatRepository.exists({
        where: { id: chatId, user: { id: user.id } },
      }),
    ]);

    if (!chat) {
      console.warn("[WhatsappChat.sendMessage]: ChatId not found", {
        chatId,
        dto,
        user,
      });
      throw new NotFoundException("Chat not found");
    }

    if (!isAuthorized) {
      console.warn(
        "[WhatsappChat.sendMessage]: ChatId not found for this user",
        { chatId, dto, user },
      );
      throw new ForbiddenException("Chat doesn't belong to this user");
    }

    await chat.sendMessage(dto.message);
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

  async refreshAll(user: User) {
    const client = await this.whatsappClientService.getClientOrThrow(user);
    void this.whatsappClientService.syncAllChats(user.id, client);
  }

  async reactivate(user: User, id: string) {
    await this.whatsappChatRepository.update(
      { id, user: { id: user.id } },
      { ignored: false },
    );
  }

  private getWhereClause(
    user: User,
    dto: WhatsappChatFilterDto,
  ): FindOptionsWhere<WhatsappChat> | FindOptionsWhere<WhatsappChat>[] {
    const baseWhere: FindOptionsWhere<WhatsappChat> = {
      user: { id: user.id },
      ignored: dto.ignored ?? false,
    };

    let where:
      | FindOptionsWhere<WhatsappChat>
      | FindOptionsWhere<WhatsappChat>[] = baseWhere;

    if (dto.kanban) {
      baseWhere.customer = { kanban: { id: dto.kanban } };
    }

    if (dto.unread !== null && dto.unread !== undefined) {
      baseWhere.unread = dto.unread;
    }

    if (dto.search) {
      where = [
        { ...baseWhere, name: ILike(`%${dto.search}%`) },
        { ...baseWhere, phone: ILike(`%${dto.search}%`) },
      ];
    }

    return where;
  }
}
