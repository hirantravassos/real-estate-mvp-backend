import { Controller, Post, Get, Body } from '@nestjs/common';
import * as SharedDecorators from '../../../shared/decorators/current-user.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import {
  ActivateSubscriptionUseCase,
  CheckSubscriptionUseCase,
} from '../use-cases';
import { SubscriptionResponseDto } from '../dtos';

interface ActivateSubscriptionDto {
  readonly planName: string;
}

@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly activateSubscription: ActivateSubscriptionUseCase,
    private readonly checkSubscription: CheckSubscriptionUseCase,
  ) { }

  @Post('activate')
  async activate(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Body() dto: ActivateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.activateSubscription.execute(user.userId, dto.planName);
  }

  @Get('status')
  async getStatus(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
  ): Promise<{ isActive: boolean; subscription: SubscriptionResponseDto | null }> {
    const subscription = await this.checkSubscription.execute(user.userId);
    return {
      isActive: subscription !== null,
      subscription,
    };
  }
}
