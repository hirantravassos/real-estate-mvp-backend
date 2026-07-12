import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ContactService } from "../services/contact.service";
import { ContactFilterDto } from "../dtos/contact.dto";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { UserGuard } from "../../auth/guards/user.guard";

@Controller("contacts")
@UseGuards(UserGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  async findAll(@GetUser() user: User, @Query() filter: ContactFilterDto) {
    return this.contactService.findAll(user, filter);
  }
}
