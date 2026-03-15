import { Visit } from "../entities/visit.entity";
import { Customer } from "../../customers/entities/customer.entity";

export class VisitMapper {
  static toDto(entity: Visit) {
    if (!entity) return null;

    return {
      id: entity.id,
      customer: this.toCustomer(entity.customer),
      address: entity.address,
      reference: entity.reference,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      createdAt: entity.createdAt,
    };
  }

  static toListDto(entities: Visit[]) {
    return entities.map((e) => this.toDto(e));
  }

  static toCustomer(entity: Customer) {
    return {
      id: entity.id,
      name: entity.name,
      phone: entity.phone,
    };
  }
}
