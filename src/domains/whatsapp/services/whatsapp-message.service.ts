import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { WhatsappMessage } from "../entities/whatsapp-message.entity";

export class WhatsappMessageCreateDto {
  messageId: string;
  whatsappId: string;
  sentAt: string;
  content: string;
  type: WhatsappMessageTypeEnum;
  me: boolean;
}

@Injectable()
export class WhatsappMessageService {
  constructor(
    private readonly messageRepository: WhatsappMessageRepository,
    private readonly contactRepository: WhatsappContactRepository,
  ) {}

  async findAll(
    userId: string,
    whatsappId: string,
  ): Promise<WhatsappMessage[]> {
    return this.messageRepository.find({
      where: {
        userId: userId,
        whatsappId: whatsappId,
      },
      order: {
        sentAt: "DESC",
      },
    });
  }

  async findAllByPhone(user: User, phone: string) {
    const contact = await this.contactRepository
      .findOneOrFail({
        where: { userId: user.id, phoneNumber: phone },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp contact not found");
      });

    return this.messageRepository.find({
      where: {
        userId: user.id,
        whatsappId: contact.whatsappId,
      },
      order: {
        sentAt: "DESC",
      },
      take: 100,
    });
  }

  async findOneByMessageId(user: User, messageId: string) {
    return this.messageRepository.findOneBy({
      userId: user.id,
      messageId,
    });
  }

  async save(user: User, dto: WhatsappMessageCreateDto): Promise<void> {
    if (!dto.whatsappId || !dto.messageId) return;

    await this.messageRepository.upsert(
      {
        user,
        messageId: dto.messageId,
        whatsappId: dto.whatsappId,
        sentAt: dto.sentAt,
        content: dto.content,
        type: dto.type,
        me: dto.me,
      },
      ["whatsappId", "userId", "messageId"],
    );
  }
}
