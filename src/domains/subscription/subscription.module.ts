import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities';
import { SubscriptionRepository } from './repositories';
import {
  ActivateSubscriptionUseCase,
  CheckSubscriptionUseCase,
} from './use-cases';
import { SubscriptionController } from './controllers';
import { InterPixService } from '../../infrastructure/pix/inter-pix.service';
import { CreatePixSubscriptionUseCase } from './use-cases/create-pix-subscription.use-case';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), ConfigModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionRepository,
    ActivateSubscriptionUseCase,
    CheckSubscriptionUseCase,
    CreatePixSubscriptionUseCase,
    InterPixService,
  ],
  exports: [SubscriptionRepository, TypeOrmModule],
})
export class SubscriptionModule {}
