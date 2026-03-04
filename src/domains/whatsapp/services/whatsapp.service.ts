import { Injectable, NotFoundException } from "@nestjs/common";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { User } from "../../users/entities/user.entity";
import { WhatsappSocketService } from "./whatsapp-socket.service";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { WhatsappMessageService } from "./whatsapp-message.service";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { In } from "typeorm";

@Injectable()
export class WhatsappService {
  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    private readonly chatRepository: WhatsappChatRepository,
    private readonly messageRepository: WhatsappMessageRepository,
    private readonly socketService: WhatsappSocketService,
    private readonly messageService: WhatsappMessageService,
  ) {}

  async connect(user: User) {
    const found = await this.sessionRepository.findOneBy({
      user: { id: user.id },
    });

    if (found) {
      await this.sessionRepository.delete({ id: found.id });
    }

    const newSession = await this.sessionRepository.save({
      user,
    });

    await this.socketService.start(newSession.id, user);

    return await this.findStatus(user);
  }

  async disconnect(user: User) {
    const found = await this.sessionRepository
      .findOneByOrFail({
        user: { id: user.id },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp session not found");
      });
    await this.sessionRepository.delete({ id: found.id });
    return found;
  }

  async findStatus(user: User) {
    return this.sessionRepository
      .findOneByOrFail({ user: { id: user.id } })
      .catch(async () => {
        await this.connect(user);
        throw new NotFoundException("Whatsapp session not found");
      });
  }

  async findAllChats(user: User) {
    const userId = user.id;

    // 1. Get the latest message sentAt for each whatsappId
    const latestMessages = this.messageRepository
      .createQueryBuilder("msg")
      .select("msg.whatsappId", "whatsappId")
      .addSelect("MAX(msg.sentAt)", "latestMessage")
      .where("msg.user.id = :userId", { userId })
      .groupBy("msg.whatsappId");

    // 2. Join chats with the subquery to order them
    return await this.chatRepository
      .createQueryBuilder("chat")
      .innerJoin(
        `(${latestMessages.getQuery()})`,
        "latest_msg",
        "latest_msg.whatsappId = chat.whatsappId",
      )
      .setParameters(latestMessages.getParameters())
      .leftJoinAndSelect("chat.contact", "contact")
      .where("chat.user.id = :userId", { userId })
      .orderBy("latest_msg.latestMessage", "DESC")
      .getMany();
  }

  async findAllMessages(user: User, whatsappId: string) {
    const chat = await this.chatRepository.findOne({
      where: { whatsappId, user: { id: user.id } },
      relations: {
        contact: true,
      },
    });

    const messages = await this.messageRepository.find({
      where: {
        user: { id: user.id },
        whatsappId,
      },
      order: {
        sentAt: "DESC",
      },
      take: 1000,
    });

    return {
      ...chat,
      messages,
    };
  }
}
