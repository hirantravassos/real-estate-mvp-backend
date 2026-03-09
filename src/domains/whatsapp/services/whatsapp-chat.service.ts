import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { User } from "../../users/entities/user.entity";
import { WhatsappSocketService } from "./whatsapp-socket.service";
import { WhatsappGateway } from "../gateways/whatsapp.gateway";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { CustomerService } from "../../customers/services/customer.service";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";

export interface WhatsappChatCreateDto {
  unread: boolean;
  phone: string;
  lastSentAt?: string | null;
}

@Injectable()
export class WhatsappChatService {
  constructor(
    @Inject(forwardRef(() => WhatsappSocketService))
    private readonly socketService: WhatsappSocketService,
    @Inject(forwardRef(() => WhatsappGateway))
    private readonly gateway: WhatsappGateway,
    private readonly chatRepository: WhatsappChatRepository,
    private readonly messageService: WhatsappMessageService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customerService: CustomerService,
  ) { }

  async findAll(user: User) {
    const userId = user.id;

    return await this.chatRepository
      .createQueryBuilder("chat")
      .innerJoinAndMapOne(
        "chat.customer",
        Customer,
        "customer",
        "customer.phone = chat.phone AND customer.userId = chat.userId",
      )
      .addSelect(
        "CASE WHEN chat.lastSentAt IS NULL THEN 1 ELSE 0 END",
        "lastSentAtIsNull",
      )
      .where("chat.userId = :userId", { userId })
      .orderBy("lastSentAtIsNull", "ASC")
      .addOrderBy("chat.lastSentAt", "DESC")
      .take(100)
      .getMany();
  }

  async findOne(user: User, whatsappId: string) {
    const chat = await this.chatRepository.findOne({
      where: { whatsappId, userId: user.id },
    });

    if (!chat) {
      throw new NotFoundException("Whatsapp chat not found");
    }

    const customer = await this.customerService
      .findOneByPhone(user, chat?.phone)
      .catch(() => {
        return null;
      });

    const messages = await this.messageService.findAll(user.id, whatsappId);

    if (!customer) return;

    return {
      ...chat,
      customer,
      messages,
    };
  }

  async findOneByPhone(user: User, phone: string) {
    const chat = await this.chatRepository.findOne({
      where: { phone, userId: user.id },
    });

    if (!chat) {
      throw new NotFoundException("Whatsapp chat not found");
    }

    const customer = await this.customerService
      .findOneByPhone(user, chat?.phone)
      .catch(() => {
        return null;
      });

    const messages = await this.messageService.findAll(
      user.id,
      chat.whatsappId,
    );

    if (!customer) return;

    return {
      ...chat,
      customer,
      messages,
    };
  }

  async save(
    user: User,
    whatsappId: string,
    dto: WhatsappChatCreateDto,
  ): Promise<void> {
    const entity = new WhatsappChat();

    entity.unread = dto.unread;
    entity.phone = dto.phone;
    entity.whatsappId = whatsappId;
    entity.userId = user.id;
    entity.lastSentAt = await this.getLastSentAt(
      user,
      whatsappId,
      dto.lastSentAt,
    );

    await this.chatRepository.upsert(entity, ["whatsappId", "userId"]);
    void this.gateway.emitChatsUpdate(user);
    void this.gateway.emitChatUpdate(user, whatsappId);
    void this.gateway.emitNotificationCountUpdate(user);
  }

  async markChatAsSeen(user: User, whatsappId: string) {
    const socket = await this.socketService.getSocketByUserOrFail(user?.id);
    const messages = await this.messageService.findAll(user.id, whatsappId);

    console.log("marked as Seen", messages);

    const keys = messages?.map((message) => ({
      remoteJid: whatsappId,
      id: message.messageId,
    }));

    if (keys?.length > 0) {
      await socket.readMessages(keys);
    }

    await this.chatRepository.update(
      { userId: user.id, whatsappId },
      { unread: false },
    );

    void this.gateway.emitNotificationCountUpdate(user);

    return messages;
  }

  async sendTextMessage(user: User, whatsappId: string, content: string) {
    const chat = await this.chatRepository.findOne({
      where: { whatsappId, userId: user.id },
    });

    if (!chat) {
      throw new NotFoundException("Whatsapp chat not found");
    }

    const socket = await this.socketService.getSocketByUserOrFail(user?.id);

    const result = await socket.sendMessage(whatsappId, {
      text: content,
    });

    const messageId =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (result as any)?.key?.id ?? new Date().getTime().toString();

    await this.messageService.save(user, {
      messageId,
      whatsappId,
      sentAt: new Date().toISOString(),
      content,
      type: WhatsappMessageTypeEnum.TEXT,
      me: true,
    });

    await this.save(user, whatsappId, {
      unread: false,
      phone: chat.phone,
      lastSentAt: new Date().toISOString(),
    });

    return {
      success: true,
      messageId,
    };
  }

  private async getLastSentAt(
    user: User,
    whatsappId: string,
    lastSentAt?: string | null,
  ): Promise<string | null> {
    const existingChat = await this.chatRepository.findOne({
      where: {
        whatsappId: whatsappId,
        user: { id: user.id },
      },
    });

    const existingTimestamp = existingChat?.lastSentAt;

    if (!lastSentAt) return existingTimestamp ?? null;

    if (!existingTimestamp || lastSentAt > existingTimestamp) {
      return lastSentAt;
    }

    return lastSentAt;
  }
}
