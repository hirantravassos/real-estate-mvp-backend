import { Customer } from "../entities/customer.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { CustomerComment } from "../entities/customer-comments.entity";
import { CustomerCreateDto } from "../services/customer.service";

export class CustomerMapper {
  static toEntity(dto: CustomerCreateDto, id?: string) {
    const entity = new Customer();
    const commentEntity = new CustomerComment();
    const kanbanEntity = new Kanban();
    entity.name = dto.name;
    entity.phone = dto.phone;
    if (dto?.kanbanId) {
      kanbanEntity.id = dto.kanbanId;
      entity.kanban = kanbanEntity;
    }
    if (dto?.comment) {
      commentEntity.comment = dto.comment;
      entity.comments = [commentEntity];
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
}
