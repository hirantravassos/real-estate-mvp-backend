import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { WhatsappContactService } from "../services/whatsapp-contact.service";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Controller("whatsapp-contacts")
@UseGuards(JwtGuard)
export class WhatsappContactController {
  constructor(
    private readonly whatsappContactService: WhatsappContactService,
  ) {}

  @Get("whatsapp-import")
  async findAllContactsToImport(
    @GetUser() user: User,
    @Query() pagination: PaginationRequestDto,
  ) {
    return this.whatsappContactService.findAllContactsToImport(
      user,
      pagination,
    );
  }
}
