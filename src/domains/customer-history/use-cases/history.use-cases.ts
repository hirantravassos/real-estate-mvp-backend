import { Injectable } from '@nestjs/common';
import { CustomerHistoryRepository } from '../repositories';
import { CustomerActionType } from '../entities';
import { CustomerHistoryResponseDto } from '../dtos';
import { CustomerHistoryMapper } from '../mappers';

@Injectable()
export class RecordHistoryUseCase {
  constructor(private readonly historyRepository: CustomerHistoryRepository) { }

  async execute(
    customerId: string,
    actionType: CustomerActionType,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<CustomerHistoryResponseDto> {
    const entry = await this.historyRepository.create(
      customerId,
      actionType,
      description,
      metadata,
    );
    return CustomerHistoryMapper.toResponseDto(entry);
  }
}

@Injectable()
export class ListHistoryUseCase {
  constructor(private readonly historyRepository: CustomerHistoryRepository) { }

  async execute(customerId: string): Promise<CustomerHistoryResponseDto[]> {
    const history = await this.historyRepository.findByCustomerId(customerId);
    return history.map(CustomerHistoryMapper.toResponseDto);
  }
}
