import { Customer } from "../entities/customer.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { CustomerComment } from "../entities/customer-comments.entity";
import { CustomerCreateDto } from "../services/customer.service";
import { Visit } from "../../visits/entities/visit.entity";
import { WhatsappChatMapper } from "../../whatsapp/mappers/whatsapp-chat.mapper";
import { WhatsappChat } from "../../whatsapp/entities/whatsapp-chat.entity";

export class CustomerMapper {
  static toEntity(dto: CustomerCreateDto, id?: string) {
    const entity = new Customer();
    const commentEntity = new CustomerComment();
    const kanbanEntity = new Kanban();
    entity.name = dto.name;
    entity.phone = dto.phone.replaceAll(/\D/g, "");
    if (dto?.kanbanId) {
      kanbanEntity.id = dto.kanbanId;
      entity.kanban = kanbanEntity;
    }
    if (dto?.comment) {
      commentEntity.comment = dto.comment;
      entity.comments = [commentEntity];
    }
    if (dto?.budget) {
      entity.budget = dto.budget;
    }
    if (id) entity.id = id;
    return entity;
  }

  static toDto(entity: Customer) {
    return {
      id: entity.id,
      name: entity.name,
      phone: entity.phone,
      kanban: entity.kanban,
      comments: this.toComments(entity.comments),
      visits: this.toVisit(entity.visits),
      chat: this.toChat(entity?.chat),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      active: entity.active,
    };
  }

  static toListDto(entities: Customer[]) {
    return entities.map((entity) => {
      return {
        id: entity.id,
        name: entity.name,
        phone: entity.phone,
        kanban: this.toKanban(entity.kanban),
        comments: this.toComments(entity.comments),
        visits: this.toVisit(entity.visits),
      };
    });
  }

  private static toKanban(kanban: Kanban | null) {
    if (!kanban) return null;

    return {
      id: kanban.id,
      name: kanban.name,
      description: kanban.description,
    };
  }

  private static toComments(comments: CustomerComment[]) {
    return comments?.map((comment) => {
      return {
        id: comment.id,
        comment: comment.comment,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
    });
  }

  private static toVisit(visits: Visit[]) {
    return visits?.map((visit) => {
      return {
        id: visit.id,
        address: visit.address,
        reference: visit.reference,
        startsAt: visit.startsAt,
        endsAt: visit.endsAt,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
      };
    });
  }

  private static toChat(chat: WhatsappChat | null) {
    if (!chat) return null;
    return WhatsappChatMapper.toDtoList([chat])?.[0];
  }
}
