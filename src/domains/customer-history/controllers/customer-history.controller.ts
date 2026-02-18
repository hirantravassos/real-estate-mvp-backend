import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RecordHistoryUseCase, ListHistoryUseCase } from '../use-cases';
import { CustomerActionType } from '../entities';
import { CustomerHistoryResponseDto } from '../dtos';

interface CreateHistoryEntryDto {
  readonly actionType: CustomerActionType;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

@Controller('customers/:customerId/history')
export class CustomerHistoryController {
  constructor(
    private readonly recordHistory: RecordHistoryUseCase,
    private readonly listHistory: ListHistoryUseCase,
  ) { }

  @Get()
  async list(
    @Param('customerId') customerId: string,
  ): Promise<CustomerHistoryResponseDto[]> {
    return this.listHistory.execute(customerId);
  }

  @Post()
  async create(
    @Param('customerId') customerId: string,
    @Body() dto: CreateHistoryEntryDto,
  ): Promise<CustomerHistoryResponseDto> {
    return this.recordHistory.execute(
      customerId,
      dto.actionType,
      dto.description,
      dto.metadata,
    );
  }
}
