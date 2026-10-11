import { SubscriptionPayment } from "../entities/subscription-payment.entity";

export class SubscriptionMapper {
  static toPaymentDto(entity: SubscriptionPayment) {
    return {
      id: entity.id,
      planKey: entity.planKey,
      method: entity.method,
      status: entity.status,
      amountInBrl: Number(entity.amountInBrl),
      credits: entity.credits,
      pixCode: entity.pixCode,
      pixQrCodeBase64: entity.pixQrCodeBase64 ?? null,
      expiresAt: entity.expiresAt,
      periodStart: entity.periodStart,
      periodEnd: entity.periodEnd,
      paidAt: entity.paidAt,
      createdAt: entity.createdAt,
    };
  }
}
