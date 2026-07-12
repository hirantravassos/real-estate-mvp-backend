import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { Kanban } from "../entities/kanban.entity";
import { Contact } from "../../contacts/entities/contact.entity";

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
        contacts: this.toContactDto(entity.contacts), // TODO: cannot keep, too much data
      };
    });
  }

  private static toContactDto(customers: Contact[]) {
    return customers.map((entity) => {
      return {
        id: entity.id,
        name: entity.name,
        phone: entity.phone,
      };
    });
  }
}
