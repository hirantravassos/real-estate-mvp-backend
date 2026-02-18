import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Visit } from '../entities/visit.entity';

@Injectable()
export class VisitRepository {
  constructor(
    @InjectRepository(Visit)
    private readonly repository: Repository<Visit>,
  ) {}

  async findAllByUserId(userId: string): Promise<Visit[]> {
    return this.repository.find({
      where: { userId },
      order: { scheduledAt: 'ASC' },
      relations: ['customer'],
    });
  }

  async findByUserIdInRange(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Visit[]> {
    return this.repository.find({
      where: {
        userId,
        scheduledAt: Between(start, end),
      },
      order: { scheduledAt: 'ASC' },
      relations: ['customer'],
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Visit | null> {
    return this.repository.findOne({
      where: { id, userId },
      relations: ['customer'],
    });
  }

  async findByCustomerId(customerId: string): Promise<Visit[]> {
    return this.repository.find({
      where: { customerId },
      order: { scheduledAt: 'ASC' },
    });
  }

  async create(partial: Partial<Visit>): Promise<Visit> {
    const visit = this.repository.create(partial);
    return this.repository.save(visit);
  }

  async save(visit: Visit): Promise<Visit> {
    return this.repository.save(visit);
  }

  async remove(visit: Visit): Promise<void> {
    await this.repository.remove(visit);
  }
}
