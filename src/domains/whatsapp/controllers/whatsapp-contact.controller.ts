import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { WhatsappContactService } from "../services/whatsapp-contact.service";

@Controller("whatsapp-contacts")
@UseGuards(JwtGuard)
export class WhatsappContactController {
  constructor(
    private readonly whatsappContactService: WhatsappContactService,
  ) {}

  @Get()
  async findAll(@GetUser() user: User) {
    return this.whatsappContactService.findAll(user);
  }
}
