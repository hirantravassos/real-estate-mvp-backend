import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerCommentService } from "../../customers/services/customer-comment.service";
import { CustomerService } from "../../customers/services/customer.service";
import { MessageStatus } from "../../inbox/enums/inbox.enum";
import { ConversationService } from "../../inbox/services/conversation.service";
import { MessageService } from "../../inbox/services/message.service";
import { WhatsappConnectionService } from "../../inbox/services/whatsapp-connection.service";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { User } from "../../users/entities/user.entity";
import { VisitService } from "../../visits/services/visit.service";
import { AssistantActionConfirmDto } from "../dtos/assistant.dto";
import {
  AddNotePayload,
  AssistantAction,
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
    if (!payload.text.trim()) {
      throw new BadRequestException("A mensagem está vazia.");
    }
    await this.connectionService.requireConnected(user.id);

    const conversationId =
      payload.conversationId ??
      (
        await this.conversationService.openForCustomer(
          user,
          payload.customerId ?? "",
        )
      ).id;

    const message = await this.messageService.sendText(
      user,
      conversationId,
      payload.text,
      { aiGenerated: true },
    );
    if (message.status === MessageStatus.FAILED) {
      throw new ConflictException(
        message.errorMessage ?? "O WhatsApp não aceitou a mensagem.",
      );
    }
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
