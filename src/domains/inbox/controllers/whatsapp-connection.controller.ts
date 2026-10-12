import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { WhatsappConnectDto } from "../dtos/inbox.dto";
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
  connect(@GetUser() user: User, @Body() payload: WhatsappConnectDto) {
    return this.connectionService.connect(user, payload.phone);
  }

  @Delete()
  disconnect(@GetUser() user: User) {
    return this.connectionService.disconnect(user);
  }
}
