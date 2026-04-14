import { Visit } from "../entities/visit.entity";
import { Customer } from "../../customers/entities/customer.entity";

export interface VisitResponseDto {
  id: string;
  customer: VisitResponseCustomerDto | null;
  address: string;
  reference: string | null;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  createdAt: Date;
}

export interface VisitResponseCustomerDto {
  id: string;
  name: string;
  phone: string;
}

export class VisitMapper {
  static toDto(entity: Visit): VisitResponseDto {
    return {
      id: entity.id,
      customer: this.toCustomer(entity.customer),
      address: entity.address,
      reference: entity.reference,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      notes: entity.notes ?? null,
      createdAt: entity.createdAt,
    };
  }

  static toListDto(entities: Visit[]) {
    return entities.map((visit) => {
      return {
        id: visit.id,
        customer: this.toCustomer(visit.customer),
        address: visit.address,
        reference: visit.reference,
        startsAt: visit.startsAt,
        endsAt: visit.endsAt,
        notes: visit.notes ?? null,
        createdAt: visit.createdAt,
      };
    });
  }

  static toCustomer(entity?: Customer): VisitResponseCustomerDto | null {
    if (!entity) return null;

    return {
      id: entity.id,
      name: entity.name,
      phone: entity.phone,
    };
  }
}
