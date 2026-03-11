import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { WhatsappHostService } from "../services/whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";

@Controller("whatsapp-host")
@UseGuards(JwtGuard)
export class WhatsappHostController {
  constructor(private readonly whatsappHostService: WhatsappHostService) {}

  @Get()
  findStatus(@GetUser() user: User) {
    return this.whatsappHostService.getStatus(user);
  }

  @Post("connect")
  connect(@GetUser() user: User) {
    return this.whatsappHostService.requestConnection(user);
  }
}
