import { Visit } from '../entities';
import {
    CreateVisitDto,
    UpdateVisitDto,
    VisitResponseDto,
} from '../dtos';

export class VisitMapper {
    static toEntity(userId: string, dto: CreateVisitDto): Partial<Visit> {
        return {
            userId,
            customerId: dto.customerId,
            title: dto.title,
            description: dto.description || null,
            location: dto.location,
            scheduledAt: new Date(dto.scheduledAt),
            endAt: new Date(dto.endAt),
        };
    }

    static updateEntity(visit: Visit, dto: UpdateVisitDto): Visit {
        if (dto.title !== undefined) visit.title = dto.title;
        if (dto.description !== undefined) visit.description = dto.description;
        if (dto.location !== undefined) visit.location = dto.location;
        if (dto.scheduledAt !== undefined)
            visit.scheduledAt = new Date(dto.scheduledAt);
        if (dto.endAt !== undefined) visit.endAt = new Date(dto.endAt);
        return visit;
    }

    static toResponseDto(visit: Visit): VisitResponseDto {
        return {
            id: visit.id,
            customerId: visit.customerId,
            title: visit.title,
            description: visit.description,
            location: visit.location,
            scheduledAt: visit.scheduledAt.toISOString(),
            endAt: visit.endAt.toISOString(),
            createdAt: visit.createdAt.toISOString(),
        };
    }
}
