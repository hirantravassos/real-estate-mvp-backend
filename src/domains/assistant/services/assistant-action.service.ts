import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as path from "path";
import { Repository } from "typeorm";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerCommentService } from "../../customers/services/customer-comment.service";
import { CustomerService } from "../../customers/services/customer.service";
import { Conversation } from "../../inbox/entities/conversation.entity";
import { MessageStatus } from "../../inbox/enums/inbox.enum";
import { ConversationService } from "../../inbox/services/conversation.service";
import {
  MessageService,
  OutboundMediaRequest,
} from "../../inbox/services/message.service";
import { WhatsappConnectionService } from "../../inbox/services/whatsapp-connection.service";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { DocumentService } from "../../documents/services/document.service";
import { PropertyMedia } from "../../properties/entities/property-media.entity";
import { User } from "../../users/entities/user.entity";
import { VisitService } from "../../visits/services/visit.service";
import { AssistantActionConfirmDto } from "../dtos/assistant.dto";
import {
  AddNotePayload,
  AssistantAction,
  AssistantAttachment,
  MarkLostPayload,
  MoveStagePayload,
  ScheduleVisitPayload,
  SendMessagePayload,
} from "../entities/assistant-action.entity";
import {
  AssistantActionKind,
  AssistantActionStatus,
} from "../enums/assistant.enum";
import { AssistantMapper } from "../mappers/assistant.mapper";

const MAXIMUM_WHATSAPP_IMAGE_BYTES = 16 * 1024 * 1024;
const MAXIMUM_WHATSAPP_VIDEO_BYTES = 64 * 1024 * 1024;
const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * WhatsApp shows small photos and mp4 videos inline. Anything else, or
 * bigger, goes as a file so it still arrives.
 */
const sendsAsFile = (mimeType: string, sizeBytes: number) => {
  const baseType = mimeType.split(";")[0].trim().toLowerCase();
  if (baseType.startsWith("image/")) {
    return (
      !PHOTO_TYPES.has(baseType) || sizeBytes > MAXIMUM_WHATSAPP_IMAGE_BYTES
    );
  }
  if (baseType.startsWith("video/")) {
    return baseType !== "video/mp4" || sizeBytes > MAXIMUM_WHATSAPP_VIDEO_BYTES;
  }
  return false;
};

const fileNameWithExtension = (fileName: string, s3Key: string) => {
  const extension = path.extname(s3Key);
  return !extension || fileName.toLowerCase().endsWith(extension)
    ? fileName
    : `${fileName}${extension}`;
};

/** How long a confirm waits for WhatsApp before answering "on its way". */
const DELIVERY_WAIT_MILLISECONDS = 90_000;

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Carries out what the assistant prepared, once the broker confirms it. */
@Injectable()
export class AssistantActionService {
  private readonly logger = new Logger(AssistantActionService.name);

  constructor(
    @InjectRepository(AssistantAction)
    private readonly actionRepository: Repository<AssistantAction>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    @InjectRepository(PropertyMedia)
    private readonly mediaRepository: Repository<PropertyMedia>,
    private readonly documentService: DocumentService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly connectionService: WhatsappConnectionService,
    private readonly visitService: VisitService,
    private readonly customerService: CustomerService,
    private readonly customerCommentService: CustomerCommentService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async confirm(user: User, actionId: string, dto: AssistantActionConfirmDto) {
    const action = await this.findEntity(user, actionId);

    if (dto.text !== undefined) {
      if (action.kind !== AssistantActionKind.SEND_MESSAGE) {
        throw new BadRequestException("Só mensagens podem ser editadas.");
      }
      action.payload = {
        ...(action.payload as SendMessagePayload),
        text: dto.text.trim(),
      };
    }

    // Only one request wins, so a double tap never sends twice.
    const claimed = await this.actionRepository.update(
      {
        id: action.id,
        userId: user.id,
        status: AssistantActionStatus.PENDING,
      },
      { status: AssistantActionStatus.RUNNING, payload: action.payload },
    );
    if (!claimed.affected) {
      throw new ConflictException("Essa ação já foi resolvida.");
    }

    try {
      await this.execute(user, action);
      action.status = AssistantActionStatus.DONE;
      action.errorMessage = null;
    } catch (error) {
      action.status = AssistantActionStatus.FAILED;
      action.errorMessage = (
        error instanceof HttpException
          ? error.message
          : "Não consegui concluir essa ação."
      ).substring(0, 255);
      if (!(error instanceof HttpException)) {
        this.logger.error(
          `Assistant action ${action.id} failed: ${String(error)}`,
        );
      }
    }

    action.executedAt = new Date();
    await this.actionRepository.update(action.id, {
      status: action.status,
      errorMessage: action.errorMessage,
      executedAt: action.executedAt,
    });
    return AssistantMapper.toActionDto(action);
  }

  async cancel(user: User, actionId: string) {
    const action = await this.findEntity(user, actionId);
    const cancelled = await this.actionRepository.update(
      {
        id: action.id,
        userId: user.id,
        status: AssistantActionStatus.PENDING,
      },
      { status: AssistantActionStatus.CANCELLED },
    );
    if (!cancelled.affected) {
      throw new ConflictException("Essa ação já foi resolvida.");
    }
    action.status = AssistantActionStatus.CANCELLED;
    return AssistantMapper.toActionDto(action);
  }

  private async execute(user: User, action: AssistantAction) {
    switch (action.kind) {
      case AssistantActionKind.SEND_MESSAGE:
        return this.sendMessage(user, action.payload as SendMessagePayload);
      case AssistantActionKind.SCHEDULE_VISIT:
        await this.scheduleVisit(user, action.payload as ScheduleVisitPayload);
        break;
      case AssistantActionKind.ADD_NOTE: {
        const payload = action.payload as AddNotePayload;
        await this.customerCommentService.save(user, payload.customerId, {
          comment: payload.note,
        });
        break;
      }
      case AssistantActionKind.MOVE_STAGE:
        await this.moveStage(user, action.payload as MoveStagePayload);
        break;
      case AssistantActionKind.MARK_LOST: {
        const payload = action.payload as MarkLostPayload;
        if (payload.lost) {
          await this.customerService.markAsLost(user, payload.customerId);
        } else {
          await this.customerService.markAsVisible(user, payload.customerId);
        }
        break;
      }
    }
    this.realtimeGateway.emitToUser(user.id, "customers.updated", {});
  }

  private async sendMessage(user: User, payload: SendMessagePayload) {
    const text = payload.text.trim();
    const attachments = payload.attachments ?? [];
    if (!text && !attachments.length) {
      throw new BadRequestException("A mensagem está vazia.");
    }
    await this.connectionService.requireConnected(user.id);
    // Every file is checked before anything goes out, so a missing one
    // never leaves the customer with half of what was promised.
    const files = await this.filesToSend(user, attachments);

    const conversationId =
      payload.conversationId ??
      (
        await this.conversationService.openForCustomer(
          user,
          payload.customerId ?? "",
        )
      ).id;
    const conversation = await this.conversationService.findEntity(
      user.id,
      conversationId,
    );

    // Waits for WhatsApp to take each message, so "done" means it really
    // went. A long queue of files keeps going after the wait.
    const deliveries = this.deliverInOrder(conversation, text, files);
    deliveries.catch(() => undefined);
    const outcome = await Promise.race([
      deliveries,
      sleep(DELIVERY_WAIT_MILLISECONDS).then(() => null),
    ]);
    if (!outcome) return;

    const failed = outcome.filter(
      (result) => result.status === MessageStatus.FAILED,
    );
    if (failed.length) {
      throw new ConflictException(
        `O WhatsApp não aceitou ${failed
          .map(
            (result) =>
              `${result.name} (${result.errorMessage ?? "sem motivo informado"})`,
          )
          .join("; ")}`.substring(0, 255),
      );
    }
  }

  /** Text first, then the files, one after the other in the chat queue. */
  private async deliverInOrder(
    conversation: Conversation,
    text: string,
    files: OutboundMediaRequest[],
  ) {
    const results: {
      name: string;
      status: MessageStatus;
      errorMessage: string | null;
    }[] = [];

    if (text) {
      const message = await this.messageService.sendTextTo(conversation, text, {
        aiGenerated: true,
      });
      results.push({
        name: "o texto",
        status: message.status,
        errorMessage: message.errorMessage,
      });
      // Files without the text that explains them make no sense.
      if (message.status === MessageStatus.FAILED) return results;
    }

    for (const file of files) {
      const message = await this.messageService.sendMediaTo(
        conversation,
        file,
        {},
      );
      results.push({
        name: file.fileName,
        status: message.status,
        errorMessage: message.errorMessage,
      });
    }
    return results;
  }

  private async filesToSend(
    user: User,
    attachments: AssistantAttachment[],
  ): Promise<OutboundMediaRequest[]> {
    if (!attachments.length) return [];

    const documentIds = attachments
      .filter((attachment) => attachment.source === "document")
      .map((attachment) => attachment.id);
    const mediaIds = attachments
      .filter((attachment) => attachment.source === "property_media")
      .map((attachment) => attachment.id);

    const [documents, media] = await Promise.all([
      this.documentService.findManyWithKeys(user.id, documentIds),
      mediaIds.length
        ? this.mediaRepository
            .createQueryBuilder("media")
            .addSelect("media.s3Key")
            .where("media.id IN (:...mediaIds)", { mediaIds })
            .andWhere("media.userId = :userId", { userId: user.id })
            .andWhere("media.active = :active", { active: true })
            .andWhere("media.visibleToCustomer = :visible", { visible: true })
            .getMany()
        : Promise.resolve([]),
    ]);
    const keys = new Map<string, string>([
      ...documents.map((document): [string, string] => [
        `document:${document.id}`,
        document.s3Key,
      ]),
      ...media.map((item): [string, string] => [
        `property_media:${item.id}`,
        item.s3Key,
      ]),
    ]);

    return attachments.map((attachment) => {
      const s3Key = keys.get(`${attachment.source}:${attachment.id}`);
      if (!s3Key) {
        throw new NotFoundException(
          `O arquivo ${attachment.fileName} não existe mais.`,
        );
      }
      return {
        s3Key,
        mimeType: attachment.mimeType,
        fileName: fileNameWithExtension(attachment.fileName, s3Key),
        sizeBytes: attachment.sizeBytes,
        forceDocument: sendsAsFile(attachment.mimeType, attachment.sizeBytes),
      };
    });
  }

  private async scheduleVisit(user: User, payload: ScheduleVisitPayload) {
    await this.visitService.save(user, {
      customerId: payload.customerId,
      address: payload.address,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      notes: payload.notes ?? undefined,
      propertyId: payload.propertyId ?? undefined,
    });
  }

  private async moveStage(user: User, payload: MoveStagePayload) {
    const [customer, stage] = await Promise.all([
      this.customerRepository.findOneBy({
        id: payload.customerId,
        userId: user.id,
        active: true,
      }),
      this.kanbanRepository.findOneBy({
        id: payload.stageId,
        userId: user.id,
        active: true,
      }),
    ]);
    if (!customer) throw new NotFoundException("Cliente não encontrado.");
    if (!stage) throw new NotFoundException("Etapa não encontrada.");

    await this.customerRepository.update(
      { id: customer.id, userId: user.id },
      { kanban: { id: stage.id } },
    );
  }

  private async findEntity(user: User, actionId: string) {
    const action = await this.actionRepository.findOneBy({
      id: actionId,
      userId: user.id,
    });
    if (!action) throw new NotFoundException("Ação não encontrada.");
    return action;
  }
}
