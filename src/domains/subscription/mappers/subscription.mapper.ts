import { Subscription } from '../entities';
import { SubscriptionResponseDto } from '../dtos';

export class SubscriptionMapper {
    static toResponseDto(subscription: Subscription): SubscriptionResponseDto {
        return {
            id: subscription.id,
            planName: subscription.planName,
            isActive: subscription.isActive,
            activatedAt: subscription.activatedAt
                ? subscription.activatedAt.toISOString()
                : null,
            expiresAt: subscription.expiresAt
                ? subscription.expiresAt.toISOString()
                : null,
            createdAt: subscription.createdAt.toISOString(),
        };
    }
}
