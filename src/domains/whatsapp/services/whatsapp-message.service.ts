import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { proto, WAMessage } from "@whiskeysockets/baileys";
import dayjs from "dayjs";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";
import { CreateWhatsappMessageDto } from "../dtos/create-whatsapp-message.dto";
import IMessage = proto.IMessage;
import IHistorySyncMsg = proto.IHistorySyncMsg;

@Injectable()
export class WhatsappMessageService {
  constructor(private readonly messageRepository: WhatsappMessageRepository) {}

  async saveWAMessage(user: User, message: WAMessage) {
    const whatsappId = message?.key?.remoteJid;
    const messageId = message?.key?.id as string;
    const sentAt = message?.messageTimestamp
      ? dayjs.unix(message.messageTimestamp as number).toDate()
      : new Date();
    const content = message?.message?.conversation ?? "";
    const type = this.getMessageType(message?.message) as string;
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
    const type = this.getMessageType(message?.message?.message) as string;
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

  private getMessageType(message: IMessage | null | undefined) {
    if (!message) {
      return "unknown";
    }
    if (message.conversation) {
      return "text";
    }
    if (message.imageMessage) {
      return "image";
    }
    if (message.videoMessage) {
      return "video";
    }
    if (message.audioMessage) {
      return "audio";
    }
    if (message.documentMessage) {
      return "document";
    }
    if (message.stickerMessage) {
      return "sticker";
    }
    if (message.locationMessage) {
      return "location";
    }
    if (message.eventMessage) {
      return "event";
    }
  }
}
