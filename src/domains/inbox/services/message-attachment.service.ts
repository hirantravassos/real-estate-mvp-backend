import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import dayjs from "dayjs";
import * as path from "path";
import { Repository } from "typeorm";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { CustomerService } from "../../customers/services/customer.service";
import { DealService } from "../../deals/services/deal.service";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import { isPropertySaleDocumentCategory } from "../../properties/constants/property-sale-documents.constant";
import { PropertyMediaService } from "../../properties/services/property-media.service";
import { PropertyService } from "../../properties/services/property.service";
import { User } from "../../users/entities/user.entity";
import { MessageAttachmentSaveDto } from "../dtos/inbox.dto";
import { Message } from "../entities/message.entity";
import {
  MessageAttachmentTarget,
  MessageMediaStatus,
  MessageType,
} from "../enums/inbox.enum";

/** Message kinds whose file is worth keeping in a record. */
const SAVABLE_MESSAGE_TYPES = new Set<MessageType>([
  MessageType.IMAGE,
  MessageType.VIDEO,
  MessageType.DOCUMENT,
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
};

const DEFAULT_NAME_BY_TYPE: Partial<Record<MessageType, string>> = {
  [MessageType.IMAGE]: "Foto do WhatsApp",
  [MessageType.VIDEO]: "Vídeo do WhatsApp",
  [MessageType.DOCUMENT]: "Documento do WhatsApp",
};

export interface MessageAttachmentSaved {
  target: MessageAttachmentTarget;
  recordId: string;
  checklistItemId: string | null;
  displayName: string;
}

/**
 * Keeps a photo, video or file that arrived in a chat in the customer
 * record, the property documents or gallery, or a sale checklist item.
 * The file is copied, so it stays there even if the chat is gone.
 */
@Injectable()
export class MessageAttachmentService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly storageService: StorageService,
    private readonly documentService: DocumentService,
    private readonly customerService: CustomerService,
    private readonly propertyService: PropertyService,
    private readonly propertyMediaService: PropertyMediaService,
    private readonly dealService: DealService,
  ) {}

  async save(
    user: User,
    messageId: string,
    dto: MessageAttachmentSaveDto,
  ): Promise<MessageAttachmentSaved> {
    const message = await this.findSavableOrThrow(user.id, messageId);
    const mimeType = baseMimeType(message.mimeType);
    const fileName = buildFileName(message, mimeType, dto.displayName);

    if (
      message.type === MessageType.VIDEO &&
      dto.target !== MessageAttachmentTarget.PROPERTY_MEDIA
    ) {
      throw new BadRequestException(
        "Vídeos só podem ir para a galeria de um imóvel.",
      );
    }
    if (
      dto.category &&
      (dto.target !== MessageAttachmentTarget.PROPERTY_DOCUMENT ||
        !isPropertySaleDocumentCategory(dto.category))
    ) {
      throw new BadRequestException("Tipo de documento desconhecido.");
    }

    await this.assertRecordExists(user, dto);

    const buffer = await this.storageService.downloadObject(
      message.s3Key as string,
    );
    const file = { buffer, fileName, mimeType };

    switch (dto.target) {
      case MessageAttachmentTarget.CUSTOMER:
        await this.documentService.uploadBuffer(
          user.id,
          DocumentOwnerType.CUSTOMER,
          dto.recordId,
          "customers",
          file,
        );
        break;
      case MessageAttachmentTarget.PROPERTY_DOCUMENT:
        await this.documentService.uploadBuffer(
          user.id,
          DocumentOwnerType.PROPERTY,
          dto.recordId,
          "properties",
          file,
          dto.category || null,
        );
        break;
      case MessageAttachmentTarget.PROPERTY_MEDIA:
        await this.propertyMediaService.addFromBuffer(
          user.id,
          dto.recordId,
          file,
        );
        break;
      case MessageAttachmentTarget.DEAL_ITEM:
        await this.dealService.saveChecklistFile(
          user,
          dto.recordId,
          dto.checklistItemId as string,
          file,
        );
        break;
    }

    return {
      target: dto.target,
      recordId: dto.recordId,
      checklistItemId: dto.checklistItemId ?? null,
      displayName: fileName,
    };
  }

  /** Checks the record belongs to the broker before any file is copied. */
  private async assertRecordExists(user: User, dto: MessageAttachmentSaveDto) {
    try {
      if (dto.target === MessageAttachmentTarget.CUSTOMER) {
        await this.customerService.findOne(user, dto.recordId);
      } else if (dto.target !== MessageAttachmentTarget.DEAL_ITEM) {
        await this.propertyService.findOne(user, dto.recordId);
      }
    } catch {
      throw new NotFoundException(
        dto.target === MessageAttachmentTarget.CUSTOMER
          ? "Cliente não encontrado."
          : "Imóvel não encontrado.",
      );
    }
  }

  private async findSavableOrThrow(userId: string, messageId: string) {
    const message = await this.messageRepository
      .createQueryBuilder("message")
      .addSelect("message.s3Key")
      .where("message.id = :messageId", { messageId })
      .andWhere("message.userId = :userId", { userId })
      .getOne();

    if (!message) throw new NotFoundException("Mensagem não encontrada.");
    if (!SAVABLE_MESSAGE_TYPES.has(message.type)) {
      throw new BadRequestException(
        "Só fotos, vídeos e documentos podem ser guardados.",
      );
    }
    if (message.mediaStatus !== MessageMediaStatus.READY || !message.s3Key) {
      throw new BadRequestException(
        "O arquivo ainda não chegou. Tente de novo em instantes.",
      );
    }
    return message;
  }
}

const baseMimeType = (mimeType: string | null) =>
  (mimeType ?? "application/octet-stream").split(";")[0].trim().toLowerCase();

/** The name the broker typed, or the one from WhatsApp, always with an extension. */
const buildFileName = (
  message: Message,
  mimeType: string,
  requestedName?: string | null,
) => {
  const original = message.fileName?.trim() || null;
  const extension =
    (original ? path.extname(original) : "") ||
    EXTENSION_BY_MIME_TYPE[mimeType] ||
    "";
  const name =
    requestedName?.trim() ||
    original ||
    `${DEFAULT_NAME_BY_TYPE[message.type] ?? "Arquivo do WhatsApp"} ${dayjs(message.sentAt).format("DD-MM-YYYY HH.mm")}`;
  const withExtension =
    extension && path.extname(name).toLowerCase() !== extension.toLowerCase()
      ? `${name}${extension}`
      : name;
  return withExtension.substring(0, 255);
};
