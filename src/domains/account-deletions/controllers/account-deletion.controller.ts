import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { SkipSubscriptionCheck } from "../../subscriptions/decorators/subscription.decorator";
import { User } from "../../users/entities/user.entity";
import { AccountDeletionDto } from "../dtos/account-deletion.dto";
import { AccountDeletionService } from "../services/account-deletion.service";

/** Open even with the subscription expired: leaving is always allowed. */
@Controller("users")
@UseGuards(JwtGuard)
@SkipSubscriptionCheck()
export class AccountDeletionController {
  constructor(
    private readonly accountDeletionService: AccountDeletionService,
  ) {}

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(
    @GetUser() user: User,
    @Body() dto: AccountDeletionDto,
  ): Promise<void> {
    await this.accountDeletionService.deleteAccount(user, dto.confirmation);
  }
}
