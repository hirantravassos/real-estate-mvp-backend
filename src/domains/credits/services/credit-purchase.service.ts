import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import {
  MercadoPagoPayment,
  MercadoPagoService,
} from "../../../infrastructure/payments/services/mercado-pago.service";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { User } from "../../users/entities/user.entity";
import { findCreditPackage } from "../constants/credit-packages.constant";
import {
  CreditPurchase,
  CreditPurchaseStatus,
} from "../entities/credit-purchase.entity";
import { CreditTransactionKind } from "../entities/credit-transaction.entity";
import { creditPurchasePaidMail } from "../mails/credit.mails";
import { CreditMapper } from "../mappers/credit.mapper";
import { CreditWalletService } from "./credit-wallet.service";

const PIX_EXPIRATION_MINUTES = 30;
const FAILED_PAYMENT_STATUSES = new Set([
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
]);

@Injectable()
export class CreditPurchaseService {
  private readonly logger = new Logger(CreditPurchaseService.name);

  constructor(
    @InjectRepository(CreditPurchase)
    private readonly purchaseRepository: Repository<CreditPurchase>,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly walletService: CreditWalletService,
    private readonly dataSource: DataSource,
    private readonly brokerMailService: BrokerMailService,
  ) {}

  get paymentsEnabled() {
    return this.mercadoPagoService.isConfigured;
  }

  async create(user: User, packageKey: string) {
    const creditPackage = findCreditPackage(packageKey);
    if (!creditPackage) {
      throw new BadRequestException("Pacote de créditos não encontrado.");
    }

    const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60_000);

    const purchase = await this.purchaseRepository.save(
      this.purchaseRepository.create({
        userId: user.id,
        packageKey: creditPackage.key,
        credits: creditPackage.credits,
        amountInBrl: creditPackage.amountInBrl.toFixed(2),
        status: CreditPurchaseStatus.PENDING,
        provider: "mercado_pago",
        expiresAt,
      }),
    );

    try {
      const payment = await this.mercadoPagoService.createPixPayment({
        reference: purchase.id,
        amountInBrl: creditPackage.amountInBrl,
        description: `${creditPackage.credits} créditos de IA BrokerIn`,
        payerEmail: user.email,
        expiresAt,
      });

      const transactionData = payment.point_of_interaction?.transaction_data;
      purchase.providerPaymentId = String(payment.id);
      purchase.pixCode = transactionData?.qr_code ?? null;
      purchase.pixQrCodeBase64 = transactionData?.qr_code_base64 ?? null;
      await this.purchaseRepository.save(purchase);
    } catch (error) {
      purchase.status = CreditPurchaseStatus.FAILED;
      await this.purchaseRepository.save(purchase);
      throw error;
    }

    return CreditMapper.toPurchaseDto(purchase);
  }

  /** Also asks Mercado Pago, so the purchase settles even if a webhook is lost. */
  async findOne(user: User, id: string) {
    const purchase = await this.findWithQrCode({ id, userId: user.id });
    if (!purchase) throw new NotFoundException("Compra não encontrada.");

    if (
      purchase.status === CreditPurchaseStatus.PENDING &&
      purchase.providerPaymentId
    ) {
      const payment = await this.mercadoPagoService
        .findPayment(purchase.providerPaymentId)
        .catch(() => null);
      if (payment) await this.settle(payment);
      const refreshed = await this.findWithQrCode({ id, userId: user.id });
      return CreditMapper.toPurchaseDto(refreshed ?? purchase);
    }

    return CreditMapper.toPurchaseDto(purchase);
  }

  /** Credits the wallet once, inside the same lock as the purchase row. */
  /** Called by the Mercado Pago webhook with the payment read back from the API. */
  async settle(payment: MercadoPagoPayment) {
    const purchaseId = payment.external_reference;
    if (!purchaseId) return;
    let paidPurchase: CreditPurchase | null = null;

    await this.dataSource.transaction(async (manager) => {
      const purchase = await manager.findOne(CreditPurchase, {
        where: { id: purchaseId },
        lock: { mode: "pessimistic_write" },
      });

      if (!purchase || purchase.status !== CreditPurchaseStatus.PENDING) return;
      if (purchase.providerPaymentId !== String(payment.id)) return;

      if (payment.status === "approved") {
        if (
          Math.abs(payment.transaction_amount - Number(purchase.amountInBrl)) >
          0.009
        ) {
          this.logger.error(
            `Payment ${payment.id} amount ${payment.transaction_amount} differs from purchase ${purchase.id}`,
          );
          return;
        }

        purchase.status = CreditPurchaseStatus.PAID;
        purchase.paidAt = new Date();
        await manager.save(purchase);
        await this.walletService.applyChange(manager, purchase.userId, {
          kind: CreditTransactionKind.PURCHASE,
          amount: purchase.credits,
          description: `Compra de ${purchase.credits} créditos via Pix`,
          referenceId: purchase.id,
        });
        paidPurchase = purchase;
        return;
      }

      if (FAILED_PAYMENT_STATUSES.has(payment.status)) {
        purchase.status = CreditPurchaseStatus.FAILED;
        await manager.save(purchase);
        return;
      }

      if (
        purchase.expiresAt &&
        purchase.expiresAt.getTime() < Date.now() - 60_000
      ) {
        purchase.status = CreditPurchaseStatus.EXPIRED;
        await manager.save(purchase);
      }
    });

    // Only the call that credited the wallet mails, after the commit.
    const settled = paidPurchase as CreditPurchase | null;
    if (settled) {
      this.brokerMailService.notify(settled.userId, (context) =>
        creditPurchasePaidMail(context, {
          credits: settled.credits,
          amountInBrl: Number(settled.amountInBrl),
        }),
      );
    }
  }

  private findWithQrCode(where: { id: string; userId: string }) {
    return this.purchaseRepository
      .createQueryBuilder("purchase")
      .addSelect("purchase.pixQrCodeBase64")
      .where("purchase.id = :id", { id: where.id })
      .andWhere("purchase.userId = :userId", { userId: where.userId })
      .getOne();
  }
}
