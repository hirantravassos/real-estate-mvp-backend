import { Visit } from "../entities/visit.entity";

export class VisitMapper {
    static toDto(entity: Visit) {
        if (!entity) return null;

        return {
            id: entity.id,
            customerId: entity.customer?.id,
            customerName: entity.customer?.name,
            customerPhone: entity.customer?.phone,
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
}
