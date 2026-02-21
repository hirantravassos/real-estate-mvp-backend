import { Injectable, BadRequestException } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories';
import { InterPixService } from '../../../infrastructure/pix/inter-pix.service';
import { SubscriptionStatus } from '../entities/subscription.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CreatePixSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly interPixService: InterPixService,
  ) {}

  async execute(userId: string) {
    const PLAN_NAME = 'professional_30';
    const AMOUNT = '30.00';

    // 1. Deactivate existing active subscriptions
    await this.subscriptionRepository.deactivateAllForUser(userId);

    // 2. Generate a unique txid (32 chars max for Inter/PIX)
    const txid = uuidv4().replace(/-/g, '').substring(0, 32);

    try {
      // 3. Create charge in Inter Bank
      const pixCharge = await this.interPixService.createImmediateCharge(
        txid,
        AMOUNT,
      );

      // 4. Save pending subscription in database
      const subscription = await this.subscriptionRepository.create({
        userId,
        planName: PLAN_NAME,
        isActive: false,
        status: SubscriptionStatus.PENDING,
        amount: parseFloat(AMOUNT),
        paymentId: txid,
        pixCopyPaste: pixCharge.pixCopiaECola,
      });

      return {
        subscriptionId: subscription.id,
        pixCopyPaste: subscription.pixCopyPaste,
        txid: subscription.paymentId,
        amount: subscription.amount,
      };
    } catch (error) {
      console.error('Failed to create PIX subscription:', error);
      throw new BadRequestException(
        'Não foi possível gerar a cobrança PIX. Tente novamente mais tarde.',
      );
    }
  }
}
