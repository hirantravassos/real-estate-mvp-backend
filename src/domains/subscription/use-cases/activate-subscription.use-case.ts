import { Injectable, BadRequestException } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories';
import { SubscriptionResponseDto } from '../dtos';
import { SubscriptionMapper } from '../mappers';

const AVAILABLE_PLANS = ['professional'] as const;
type PlanName = (typeof AVAILABLE_PLANS)[number];

@Injectable()
export class ActivateSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(
    userId: string,
    planName: string,
  ): Promise<SubscriptionResponseDto> {
    if (!AVAILABLE_PLANS.includes(planName as PlanName)) {
      throw new BadRequestException(`Plano "${planName}" não disponível`);
    }

    await this.subscriptionRepository.deactivateAllForUser(userId);

    const subscription = await this.subscriptionRepository.create({
      userId,
      planName,
      isActive: true,
      activatedAt: new Date(),
      expiresAt: null,
    });

    return SubscriptionMapper.toResponseDto(subscription);
  }
}
