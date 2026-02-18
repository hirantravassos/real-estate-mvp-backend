import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CustomerHistoryEntry,
  CustomerActionType,
} from '../entities/customer-history-entry.entity';

@Injectable()
export class CustomerHistoryRepository {
  constructor(
    @InjectRepository(CustomerHistoryEntry)
    private readonly repository: Repository<CustomerHistoryEntry>,
  ) {}

  async findByCustomerId(customerId: string): Promise<CustomerHistoryEntry[]> {
    return this.repository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    customerId: string,
    actionType: CustomerActionType,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<CustomerHistoryEntry> {
    const entry = this.repository.create({
      customerId,
      actionType,
      description,
      metadata: metadata || null,
    });
    return this.repository.save(entry);
  }
}
