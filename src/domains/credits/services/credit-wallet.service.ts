import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { creditsConfig } from "../../../config/credits.config";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { CreditWallet } from "../entities/credit-wallet.entity";
import {
  CreditTransaction,
  CreditTransactionKind,
} from "../entities/credit-transaction.entity";
import { CreditMapper } from "../mappers/credit.mapper";

export interface CreditChange {
  kind: CreditTransactionKind;
  amount: number;
  description: string;
  feature?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  providerCostUsd?: number | null;
  referenceId?: string | null;
}

@Injectable()
export class CreditWalletService {
  constructor(
    @Inject(creditsConfig.KEY)
    private readonly configuration: ConfigType<typeof creditsConfig>,
    @InjectRepository(CreditWallet)
    private readonly walletRepository: Repository<CreditWallet>,
    @InjectRepository(CreditTransaction)
    private readonly transactionRepository: Repository<CreditTransaction>,
    private readonly dataSource: DataSource,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async balanceOf(userId: string) {
    const wallet = await this.findOrCreate(userId);
    return wallet.balance;
  }

  async ensureBalance(userId: string, required: number) {
    const balance = await this.balanceOf(userId);
    if (balance < required) {
      throw new HttpException(
        {
          message: `Créditos insuficientes. Essa ação pede pelo menos ${required} créditos de saldo e você tem ${balance}.`,
          required,
          balance,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return balance;
  }

  /**
   * Spends what was really used, even past the balance: the provider
   * already charged us, so the rest stays as a debt that blocks new AI
   * calls (see ensureBalance) and is paid by the next purchase.
   */
  async spend(userId: string, change: Omit<CreditChange, "kind">) {
    await this.findOrCreate(userId);
    return this.dataSource.transaction((manager) =>
      this.applyChange(manager, userId, {
        ...change,
        kind: CreditTransactionKind.USAGE,
        amount: -Math.abs(change.amount),
      }),
    );
  }

  async add(userId: string, change: CreditChange) {
    await this.findOrCreate(userId);
    return this.dataSource.transaction((manager) =>
      this.applyChange(manager, userId, {
        ...change,
        amount: Math.abs(change.amount),
      }),
    );
  }

  /** Runs inside the caller's transaction, locking the wallet row. */
  async applyChange(
    manager: EntityManager,
    userId: string,
    change: CreditChange,
  ) {
    const wallet = await manager.findOneOrFail(CreditWallet, {
      where: { userId },
      lock: { mode: "pessimistic_write" },
    });

    const amount = change.amount;

    wallet.balance += amount;
    await manager.save(wallet);

    const transaction = manager.create(CreditTransaction, {
      userId,
      kind: change.kind,
      amount,
      balanceAfter: wallet.balance,
      description: change.description.substring(0, 255),
      feature: change.feature ?? null,
      model: change.model ?? null,
      inputTokens: change.inputTokens ?? null,
      outputTokens: change.outputTokens ?? null,
      providerCostUsd:
        change.providerCostUsd === null || change.providerCostUsd === undefined
          ? null
          : change.providerCostUsd.toFixed(8),
      referenceId: change.referenceId ?? null,
    });
    await manager.save(transaction);

    this.realtimeGateway.emitToUser(userId, "credits.updated", {
      balance: wallet.balance,
    });

    return { charged: Math.abs(amount), balance: wallet.balance };
  }

  async findTransactions(userId: string, pagination: PaginationRequestDto) {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return PaginationMapper.toDto(
      [
        data.map((transaction) => CreditMapper.toTransactionDto(transaction)),
        total,
      ],
      pagination,
    );
  }

  private async findOrCreate(userId: string) {
    const existing = await this.walletRepository.findOneBy({ userId });
    if (existing) return existing;

    try {
      const wallet = await this.walletRepository.save(
        this.walletRepository.create({ userId, balance: 0 }),
      );
      if (this.configuration.welcomeCredits > 0) {
        await this.add(userId, {
          kind: CreditTransactionKind.BONUS,
          amount: this.configuration.welcomeCredits,
          description: "Créditos de boas vindas",
        });
        return this.walletRepository.findOneByOrFail({ userId });
      }
      return wallet;
    } catch {
      // Another request created it at the same time.
      return this.walletRepository.findOneByOrFail({ userId });
    }
  }
}
