import { BadRequestException, Injectable, NotFoundException, } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { proto, WAMessage } from "@whiskeysockets/baileys";
import dayjs from "dayjs";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { CreateWhatsappMessageDto } from "../dtos/create-whatsapp-message.dto";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import IMessage = proto.IMessage;
import IHistorySyncMsg = proto.IHistorySyncMsg;

@Injectable()
export class WhatsappMessageService {
  constructor(
    private readonly messageRepository: WhatsappMessageRepository,
    private readonly contactRepository: WhatsappContactRepository,
  ) {}

  async findAll(user: User, whatsappId: string) {
    return this.messageRepository.find({
      where: {
        user: { id: user.id },
        whatsappId,
      },
      order: {
        sentAt: "DESC",
      },
    });
  }

  async findAllByPhone(user: User, phone: string) {
    const chat = await this.contactRepository
      .findOneOrFail({
        where: { user: { id: user.id }, phoneNumber: phone },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp contact not found");
      });

    const whatsappId = chat.whatsappId;

    return this.messageRepository.find({
      where: {
        user: { id: user.id },
        whatsappId: whatsappId,
        me: false,
      },
      order: {
        sentAt: "DESC",
      },
      take: 100,
    });
  }

  async saveWAMessage(user: User, message: WAMessage) {
    const whatsappId = message?.key?.remoteJid;
    const messageId = message?.key?.id as string;
    const sentAt = message?.messageTimestamp
      ? dayjs.unix(message.messageTimestamp as number).toDate()
      : new Date();
    const content = message?.message?.conversation ?? "";
    const type = this.getMessageType(message?.message);
    const me = !!message?.key?.fromMe;

    if (!whatsappId) return;
    if (!messageId) return;

    return this.save({
      user,
      messageId,
      whatsappId,
      sentAt: sentAt?.toISOString(),
      content,
      type,
      me,
    });
  }

  async saveHistorySyncMessage(user: User, message: IHistorySyncMsg) {
    const whatsappId = message?.message?.key?.remoteJid;
    const messageId = message?.message?.key?.id as string;
    const sentAt = message?.message?.messageTimestamp
      ? dayjs.unix(message?.message.messageTimestamp as number).toDate()
      : new Date();
    const content = message?.message?.message?.conversation ?? "";
    const type = this.getMessageType(message?.message?.message);
    const me = !!message?.message?.key?.fromMe;

    if (!whatsappId) throw new BadRequestException("whatsappId is required");
    if (!messageId) throw new BadRequestException("messageId is required");

    return this.save({
      user,
      messageId,
      whatsappId,
      sentAt: sentAt?.toISOString(),
      content,
      type,
      me,
    });
  }

  private save(message: CreateWhatsappMessageDto) {
    return this.messageRepository.upsert(message, [
      "whatsappId",
      "user",
      "messageId",
    ]);
  }

  private getMessageType(
    message: IMessage | null | undefined,
  ): WhatsappMessageTypeEnum {
    if (message?.conversation) return WhatsappMessageTypeEnum.TEXT;
    if (message?.imageMessage) return WhatsappMessageTypeEnum.IMAGE;
    if (message?.videoMessage) return WhatsappMessageTypeEnum.VIDEO;
    if (message?.invoiceMessage) return WhatsappMessageTypeEnum.VOICE;
    if (message?.audioMessage) return WhatsappMessageTypeEnum.AUDIO;
    if (message?.documentMessage) return WhatsappMessageTypeEnum.DOCUMENT;
    if (message?.stickerMessage) return WhatsappMessageTypeEnum.STICKER;
    if (message?.locationMessage) return WhatsappMessageTypeEnum.LOCATION;
    if (message?.eventMessage) return WhatsappMessageTypeEnum.EVENT;
    if (message?.protocolMessage) return WhatsappMessageTypeEnum.PROTOCOL;
    if (message?.templateMessage) return WhatsappMessageTypeEnum.TEMPLATE;

    if (message) {
      console.warn("message set as unknown: ", { message });
    }

    return WhatsappMessageTypeEnum.UNKNOWN;
  }
}
