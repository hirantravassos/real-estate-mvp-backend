import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities';
import { SubscriptionRepository } from './repositories';
import {
  ActivateSubscriptionUseCase,
  CheckSubscriptionUseCase,
} from './use-cases';
import { SubscriptionController } from './controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription])],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionRepository,
    ActivateSubscriptionUseCase,
    CheckSubscriptionUseCase,
  ],
  exports: [SubscriptionRepository, TypeOrmModule],
})
export class SubscriptionModule {}
