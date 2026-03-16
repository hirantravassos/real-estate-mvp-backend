import { Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import WhatsappClientService from "../services/whatsapp-client.service";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";

@Controller("whatsapp-client")
@UseGuards(JwtGuard)
export class WhatsappClientController {
  constructor(private readonly whatsappClientService: WhatsappClientService) {}

  @Post("connect")
  connect(@GetUser() user: User) {
    return this.whatsappClientService.requestConnection(user);
  }

  @Delete("disconnect")
  disconnect(@GetUser() user: User) {
    return this.whatsappClientService.requestLogout(user.id);
  }
}
