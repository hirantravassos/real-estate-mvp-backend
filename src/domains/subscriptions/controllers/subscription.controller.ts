import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { SkipSubscriptionCheck } from "../decorators/subscription.decorator";
import {
  SubscriptionCardDto,
  SubscriptionPlanDto,
} from "../dtos/subscription.dto";
import { UserThrottlerGuard } from "../guards/user-throttler.guard";
import { SubscriptionBillingService } from "../services/subscription-billing.service";

/** Payment attempts per broker per minute, against card testing. */
const PAYMENT_ATTEMPTS_PER_MINUTE = 5;

/** Billing opens even with the subscription expired, it is how the broker pays. */
@Controller("subscriptions")
@SkipSubscriptionCheck()
export class SubscriptionController {
  constructor(private readonly billingService: SubscriptionBillingService) {}

  /** Public, the landing page shows the prices. */
  @Get("plans")
  plans() {
    return this.billingService.publicPlans();
  }

  @Get("me")
  @UseGuards(JwtGuard)
  me(@GetUser() user: User) {
    return this.billingService.summary(user);
  }

  @Get("payments")
  @UseGuards(JwtGuard)
  payments(@GetUser() user: User) {
    return this.billingService.findPayments(user);
  }

  @Get("payments/:id")
  @UseGuards(JwtGuard)
  payment(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.billingService.findPayment(user, id);
  }

  @Post("pix")
  @UseGuards(JwtGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: PAYMENT_ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
  pix(@GetUser() user: User, @Body() dto: SubscriptionPlanDto) {
    return this.billingService.createPixPayment(user, dto.planKey);
  }

  @Post("card")
  @UseGuards(JwtGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: PAYMENT_ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
  card(@GetUser() user: User, @Body() dto: SubscriptionCardDto) {
    return this.billingService.subscribeWithCard(user, dto);
  }

  @Patch("plan")
  @UseGuards(JwtGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: PAYMENT_ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
  changePlan(@GetUser() user: User, @Body() dto: SubscriptionPlanDto) {
    return this.billingService.changePlan(user, dto.planKey);
  }

  @Post("cancel")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: PAYMENT_ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
  cancel(@GetUser() user: User) {
    return this.billingService.cancel(user);
  }
}
