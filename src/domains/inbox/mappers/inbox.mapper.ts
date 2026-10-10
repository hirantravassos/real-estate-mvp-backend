import { Conversation } from "../entities/conversation.entity";
import { Message } from "../entities/message.entity";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";

export class InboxMapper {
  static toConnectionDto(
    entity: WhatsappConnection | null,
    configured: boolean,
  ) {
    return {
      configured,
      status: entity?.status ?? "disconnected",
      phone: entity?.phone ?? null,
      profileName: entity?.profileName ?? null,
      profilePictureUrl: entity?.profilePictureUrl ?? null,
      qrCode: entity?.qrCode ?? null,
      pairingCode: entity?.pairingCode ?? null,
      qrCodeUpdatedAt: entity?.qrCodeUpdatedAt ?? null,
      connectedAt: entity?.connectedAt ?? null,
    };
  }

  static toConversationDto(entity: Conversation) {
    return {
      id: entity.id,
      phone: entity.phone,
      contactName: entity.contactName,
      profilePictureUrl: entity.profilePictureUrl,
      lastMessagePreview: entity.lastMessagePreview,
      lastMessageAt: entity.lastMessageAt,
      lastMessageDirection: entity.lastMessageDirection,
      unreadCount: entity.unreadCount,
      archived: entity.archived,
      customer: entity.customer
        ? {
            id: entity.customer.id,
            name: entity.customer.name,
            phone: entity.customer.phone,
            budget: entity.customer.budget,
            avatar: entity.customer.avatar ?? null,
          }
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toMessageDto(entity: Message, mediaUrl: string | null) {
    return {
      id: entity.id,
      conversationId: entity.conversationId,
      externalId: entity.externalId,
      direction: entity.direction,
      type: entity.type,
      status: entity.status,
      body: entity.body,
      mediaStatus: entity.mediaStatus,
      mediaUrl,
      mimeType: entity.mimeType,
      fileName: entity.fileName,
      sizeBytes: entity.sizeBytes === null ? null : Number(entity.sizeBytes),
      durationSeconds: entity.durationSeconds,
      thumbnailBase64: entity.thumbnailBase64,
      location: entity.location,
      quotedExternalId: entity.quotedExternalId,
      aiGenerated: entity.aiGenerated,
      presentationId: entity.presentationId,
      propertyId: entity.propertyId,
      errorMessage: entity.errorMessage,
      sentAt: entity.sentAt,
      createdAt: entity.createdAt,
    };
  }
}

export type MessageDto = ReturnType<typeof InboxMapper.toMessageDto>;
