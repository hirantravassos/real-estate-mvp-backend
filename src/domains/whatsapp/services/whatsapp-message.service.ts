import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";

interface UpsertMessageData {
  readonly messageId: string;
  readonly whatsappId: string;
  readonly sentAt: string;
  readonly content: string;
  readonly type: WhatsappMessageTypeEnum;
  readonly me: boolean;
}

@Injectable()
export class WhatsappMessageService {
  constructor(
    private readonly messageRepository: WhatsappMessageRepository,
    private readonly contactRepository: WhatsappContactRepository,
  ) {}

  async findAll(user: User, whatsappId: string) {
    return this.messageRepository.find({
      where: {
        userId: user.id,
        whatsappId,
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

  async upsertMessage(user: User, data: UpsertMessageData): Promise<void> {
    if (!data.whatsappId || !data.messageId) return;

    await this.messageRepository.upsert(
      {
        user,
        messageId: data.messageId,
        whatsappId: data.whatsappId,
        sentAt: data.sentAt,
        content: data.content,
        type: data.type,
        me: data.me,
      },
      ["whatsappId", "userId", "messageId"],
    );
  }
}
