import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { Kanban } from "../entities/kanban.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerComment } from "../../customers/entities/customer-comments.entity";

export class KanbanMapper {
  static toEntity(dto: KanbanCreateDto, id?: string) {
    const entity = new Kanban();
    entity.name = dto.name;
    entity.description = dto.description === "" ? null : dto.description;
    if (id) entity.id = id;
    return entity;
  }

  static toDto(entity: Kanban) {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
    };
  }

  static toListDto(entities: Kanban[]) {
    return entities.map((entity) => {
      return {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        order: entity.order,
        customers: this.toCustomerDto(entity.customers), // TODO: cannot keep, too much data
      };
    });
  }

  private static toCustomerDto(customers: Customer[]) {
    return customers.map((entity) => {
      return {
        id: entity.id,
        name: entity.name,
        phone: entity.phone,
        comments: this.toCustomerCommentDto(entity.comments),
      };
    });
  }

  private static toCustomerCommentDto(entities: CustomerComment[]) {
    return entities?.map((entity) => {
      return {
        id: entity.id,
        comment: entity.comment,
      };
    });
  }
}
