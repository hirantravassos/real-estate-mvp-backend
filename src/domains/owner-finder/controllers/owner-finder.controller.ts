import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { OwnerLeadSaveDto, OwnerSearchDto } from "../dtos/owner-finder.dto";
import { OwnerFinderService } from "../services/owner-finder.service";

/** Finds property owners who advertise by themselves, with no broker in between. */
@Controller("owner-finder")
@UseGuards(JwtGuard)
export class OwnerFinderController {
  constructor(private readonly ownerFinderService: OwnerFinderService) {}

  @Get("links")
  links(@Query() dto: OwnerSearchDto) {
    return this.ownerFinderService.links(dto);
  }

  @Post("search")
  search(@GetUser() user: User, @Body() dto: OwnerSearchDto) {
    return this.ownerFinderService.search(user, dto);
  }

  @Post("leads")
  saveLead(@GetUser() user: User, @Body() dto: OwnerLeadSaveDto) {
    return this.ownerFinderService.saveLead(user, dto);
  }
}
