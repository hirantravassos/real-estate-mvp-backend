import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  OwnerContactSaveDto,
  OwnerContactSearchDto,
} from "../dtos/owner-finder.dto";
import { OwnerFinderService } from "../services/owner-finder.service";

/**
 * Finds the contact of a property's owner, to talk to them without the
 * broker or agency that advertises it.
 */
@Controller("owner-finder")
@UseGuards(JwtGuard)
export class OwnerFinderController {
  constructor(private readonly ownerFinderService: OwnerFinderService) {}

  @Get("links")
  links(@GetUser() user: User, @Query() dto: OwnerContactSearchDto) {
    return this.ownerFinderService.links(user, dto);
  }

  @Post("contacts/search")
  searchContacts(@GetUser() user: User, @Body() dto: OwnerContactSearchDto) {
    return this.ownerFinderService.searchContacts(user, dto);
  }

  @Post("contacts")
  saveContact(@GetUser() user: User, @Body() dto: OwnerContactSaveDto) {
    return this.ownerFinderService.saveContact(user, dto);
  }
}
