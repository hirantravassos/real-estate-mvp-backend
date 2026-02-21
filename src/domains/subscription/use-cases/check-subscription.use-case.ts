import { Injectable } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories';
import { SubscriptionResponseDto } from '../dtos';
import { SubscriptionMapper } from '../mappers';

@Injectable()
export class CheckSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(userId: string): Promise<SubscriptionResponseDto | null> {
    const subscription =
      await this.subscriptionRepository.findActiveByUserId(userId);

    if (!subscription) {
      return null;
    }

    return SubscriptionMapper.toResponseDto(subscription);
  }
}
