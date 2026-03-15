import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import {
  WhatsappContactFilterDto,
  WhatsappContactService,
} from "../services/whatsapp-contact.service";

@Controller("whatsapp-contacts")
@UseGuards(JwtGuard)
export class WhatsappContactController {
  constructor(
    private readonly whatsappContactService: WhatsappContactService,
  ) {}

  @Get("whatsapp-import")
  async findAllContactsToImport(
    @GetUser() user: User,
    @Query() filter: WhatsappContactFilterDto,
  ) {
    return this.whatsappContactService.findAllContactsToImport(user, filter);
  }
}
