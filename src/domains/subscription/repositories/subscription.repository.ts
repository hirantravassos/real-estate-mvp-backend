import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectRepository(Subscription)
    private readonly repository: Repository<Subscription>,
  ) {}

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.repository.findOne({
      where: { userId, isActive: true },
    });
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(partial: Partial<Subscription>): Promise<Subscription> {
    const subscription = this.repository.create(partial);
    return this.repository.save(subscription);
  }

  async save(subscription: Subscription): Promise<Subscription> {
    return this.repository.save(subscription);
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.repository.update(
      { userId, isActive: true },
      { isActive: false },
    );
  }
}
