import { Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { WhatsappConnectionService } from "../services/whatsapp-connection.service";

@Controller("inbox/connection")
@UseGuards(JwtGuard)
export class WhatsappConnectionController {
  constructor(private readonly connectionService: WhatsappConnectionService) {}

  @Get()
  status(@GetUser() user: User) {
    return this.connectionService.status(user);
  }

  @Post()
  connect(@GetUser() user: User) {
    return this.connectionService.connect(user);
  }

  @Delete()
  disconnect(@GetUser() user: User) {
    return this.connectionService.disconnect(user);
  }
}
