import { IsEmail, IsEnum, IsString, Matches, MaxLength } from "class-validator";
import { SubscriptionPlanKey } from "../enums/subscription.enum";

export class SubscriptionPlanDto {
  @IsEnum(SubscriptionPlanKey)
  planKey: SubscriptionPlanKey;
}

/**
 * Only the single use token made by Mercado Pago in the browser arrives
 * here. Card number, security code and expiry never reach this server.
 */
export class SubscriptionCardDto {
  @IsEnum(SubscriptionPlanKey)
  planKey: SubscriptionPlanKey;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,128}$/, { message: "Token do cartão inválido." })
  cardToken: string;

  @IsEmail()
  @MaxLength(254)
  payerEmail: string;
}
