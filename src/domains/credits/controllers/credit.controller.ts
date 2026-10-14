import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { OpenaiService } from "../../../infrastructure/openai/services/openai.service";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { AdminOnly } from "../../admin/decorators/admin-only.decorator";
import { attachAuditDetail } from "../../audit-logs/helpers/audit-detail.helper";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { UserRepository } from "../../users/repositories/user.repository";
import { CREDIT_PACKAGES } from "../constants/credit-packages.constant";
import { CreditGrantDto, CreditPurchaseCreateDto } from "../dtos/credit.dto";
import { CreditTransactionKind } from "../entities/credit-transaction.entity";
import { CreditPricingService } from "../services/credit-pricing.service";
import { CreditPurchaseService } from "../services/credit-purchase.service";
import { SkipSubscriptionCheck } from "../../subscriptions/decorators/subscription.decorator";
import { CreditWalletService } from "../services/credit-wallet.service";

@Controller("credits")
export class CreditController {
  constructor(
    private readonly walletService: CreditWalletService,
    private readonly purchaseService: CreditPurchaseService,
    private readonly pricingService: CreditPricingService,
    private readonly openaiService: OpenaiService,
    private readonly userRepository: UserRepository,
  ) {}

  @Get("wallet")
  @UseGuards(JwtGuard)
  @SkipSubscriptionCheck()
  async wallet(@GetUser() user: User) {
    return {
      balance: await this.walletService.balanceOf(user.id),
      aiEnabled: this.openaiService.isConfigured,
      paymentsEnabled: this.purchaseService.paymentsEnabled,
      featureEstimates: this.pricingService.featureEstimates(),
    };
  }

  @Get("packages")
  @UseGuards(JwtGuard)
  packages() {
    return CREDIT_PACKAGES;
  }

  @Get("transactions")
  @UseGuards(JwtGuard)
  transactions(
    @GetUser() user: User,
    @Query() pagination: PaginationRequestDto,
  ) {
    return this.walletService.findTransactions(user.id, pagination);
  }

  @Post("purchases")
  @UseGuards(JwtGuard)
  createPurchase(@GetUser() user: User, @Body() dto: CreditPurchaseCreateDto) {
    return this.purchaseService.create(user, dto.packageKey);
  }

  @Get("purchases/:id")
  @UseGuards(JwtGuard)
  findPurchase(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.purchaseService.findOne(user, id);
  }

  /** Manual top up by the platform owner, from the backoffice only. */
  @Post("grants")
  @AdminOnly()
  async grant(@Body() dto: CreditGrantDto, @Req() request: Request) {
    const user = await this.userRepository.findOneBy({
      email: dto.email,
      active: true,
    });
    if (!user) throw new NotFoundException("Usuário não encontrado.");

    attachAuditDetail(
      request,
      `${dto.credits} créditos para ${user.email} (${user.id}).`,
    );
    return this.walletService.add(user.id, {
      kind: CreditTransactionKind.GRANT,
      amount: dto.credits,
      description: dto.description,
    });
  }
}
