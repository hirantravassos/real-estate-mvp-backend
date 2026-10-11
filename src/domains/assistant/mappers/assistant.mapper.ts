import { AssistantAction } from "../entities/assistant-action.entity";
import { AssistantMessage } from "../entities/assistant-message.entity";

export class AssistantMapper {
  static toActionDto(entity: AssistantAction) {
    return {
      id: entity.id,
      kind: entity.kind,
      status: entity.status,
      title: entity.title,
      payload: entity.payload,
      errorMessage: entity.errorMessage,
      executedAt: entity.executedAt,
      createdAt: entity.createdAt,
    };
  }

  static toMessageDto(entity: AssistantMessage, actions: AssistantAction[]) {
    return {
      id: entity.id,
      role: entity.role,
      content: entity.content,
      fromVoice: entity.fromVoice,
      creditsCharged: entity.creditsCharged,
      references: entity.references ?? [],
      actions: actions.map((action) => AssistantMapper.toActionDto(action)),
      sentAt: entity.sentAt,
    };
  }
}

export type AssistantActionDto = ReturnType<typeof AssistantMapper.toActionDto>;
export type AssistantMessageDto = ReturnType<
  typeof AssistantMapper.toMessageDto
>;
