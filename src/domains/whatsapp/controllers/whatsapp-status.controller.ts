import { Controller, Get, UseGuards } from "@nestjs/common";
import { WhatsappStatusService } from "../services/whatsapp-status.service";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { WhatsappStatusDto } from "../mappers/whatsapp-status.mapper";
import { SkipThrottle } from "@nestjs/throttler";

@Controller("whatsapp-status")
@UseGuards(JwtGuard)
export class WhatsappStatusController {
  constructor(private readonly whatsappStatusService: WhatsappStatusService) {}

  @Get()
  @SkipThrottle()
  async findStatus(@GetUser() user: User): Promise<WhatsappStatusDto> {
    return await this.whatsappStatusService.findStatus(user);
  }
}
