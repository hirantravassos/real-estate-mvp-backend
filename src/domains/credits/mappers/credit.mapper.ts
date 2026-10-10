import { CreditTransaction } from "../entities/credit-transaction.entity";
import { CreditPurchase } from "../entities/credit-purchase.entity";

export class CreditMapper {
  static toTransactionDto(entity: CreditTransaction) {
    return {
      id: entity.id,
      kind: entity.kind,
      amount: entity.amount,
      balanceAfter: entity.balanceAfter,
      description: entity.description,
      feature: entity.feature,
      createdAt: entity.createdAt,
    };
  }

  static toPurchaseDto(entity: CreditPurchase) {
    return {
      id: entity.id,
      packageKey: entity.packageKey,
      credits: entity.credits,
      amountInBrl: Number(entity.amountInBrl),
      status: entity.status,
      pixCode: entity.pixCode,
      pixQrCodeBase64: entity.pixQrCodeBase64 ?? null,
      expiresAt: entity.expiresAt,
      paidAt: entity.paidAt,
      createdAt: entity.createdAt,
    };
  }
}
