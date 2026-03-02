import { CustomerCreateDto } from "../dtos/customer-create.dto";
import { Customer } from "../entities/customer.entity";
import { Kanban } from "../../kanbans/entities/kanban.entity";

export class CustomerMapper {
  static toEntity(dto: CustomerCreateDto, id?: string) {
    const entity = new Customer();
    entity.name = dto.name;
    entity.phone = dto.phone;
    if (id) entity.id = id;
    return entity;
  }

  static toDto(entity: Customer) {
    return {
      id: entity.id,
      name: entity.name,
      phone: entity.phone,
      kanban: entity.kanban,
    };
  }

  static toListDto(entities: Customer[]) {
    return entities.map((entity) => {
      return {
        id: entity.id,
        name: entity.name,
        phone: entity.phone,
        kanban: this.toKanban(entity.kanban),
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
}
