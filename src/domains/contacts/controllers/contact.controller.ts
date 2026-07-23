import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ContactService } from "../services/contact.service";
import { ContactFilterDto } from "../dtos/contact.dto";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { UserGuard } from "../../auth/guards/user.guard";
import { ContactCreateDto } from "../dtos/contact-create.dto";

@Controller("contacts")
@UseGuards(UserGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  async findAll(@GetUser() user: User, @Query() filter: ContactFilterDto) {
    return this.contactService.findAll(user, filter);
  }

  @Get(":contactId")
  async findOne(@GetUser() user: User, @Param("contactId") contactId: string) {
    return this.contactService.findOne(user, contactId);
  }

  @Get("/check-duplicated/:phone")
  async findDuplicatedByPhone(
    @GetUser() user: User,
    @Param("phone") phone: string,
  ) {
    return this.contactService.findDuplicatedByPhone(user, phone);
  }

  @Post()
  async create(@GetUser() user: User, @Body() dto: ContactCreateDto) {
    return this.contactService.save(user, dto);
  }

  @Patch(":contactId")
  async update(
    @GetUser() user: User,
    @Param("contactId") contactId: string,
    @Body() dto: ContactCreateDto,
  ) {
    return this.contactService.save(user, dto, contactId);
  }
}
