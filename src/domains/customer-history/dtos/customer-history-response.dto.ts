import { CustomerActionType } from '../entities';

export class CustomerHistoryResponseDto {
    readonly id!: string;
    readonly customerId!: string;
    readonly actionType!: CustomerActionType;
    readonly description!: string;
    readonly metadata!: Record<string, unknown> | null;
    readonly createdAt!: string;
}
