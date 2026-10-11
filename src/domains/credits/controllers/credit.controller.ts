import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  Inject,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { creditsConfig } from "../../../config/credits.config";
import { OpenaiService } from "../../../infrastructure/openai/services/openai.service";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
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
    @Inject(creditsConfig.KEY)
    private readonly configuration: ConfigType<typeof creditsConfig>,
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

  /** Manual top up by the platform owner, protected by CREDITS_ADMIN_KEY. */
  @Post("grants")
  async grant(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Body() dto: CreditGrantDto,
  ) {
    if (!this.isAdminKeyValid(adminKey)) {
      throw new ForbiddenException("Chave de administrador inválida.");
    }

    const user = await this.userRepository.findOneBy({ email: dto.email });
    if (!user) throw new NotFoundException("Usuário não encontrado.");

    return this.walletService.add(user.id, {
      kind: CreditTransactionKind.GRANT,
      amount: dto.credits,
      description: dto.description,
    });
  }

  private isAdminKeyValid(adminKey: string | undefined) {
    const expected = this.configuration.adminKey;
    if (!expected || !adminKey) return false;
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(adminKey);
    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }
}
