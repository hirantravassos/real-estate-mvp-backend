import { CustomerHistoryEntry } from '../entities';
import { CustomerHistoryResponseDto } from '../dtos';

export class CustomerHistoryMapper {
    static toResponseDto(
        entry: CustomerHistoryEntry,
    ): CustomerHistoryResponseDto {
        return {
            id: entry.id,
            customerId: entry.customerId,
            actionType: entry.actionType,
            description: entry.description,
            metadata: entry.metadata,
            createdAt: entry.createdAt.toISOString(),
        };
    }
}
