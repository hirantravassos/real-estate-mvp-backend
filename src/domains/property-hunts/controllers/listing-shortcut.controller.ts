import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import { ListingShortcutCreateDto } from "../dtos/property-hunt.dto";
import { ListingShortcutService } from "../services/listing-shortcut.service";

/** Portal listings the broker keeps at hand, as a link and a small card. */
@Controller("listing-shortcuts")
@UseGuards(JwtGuard)
export class ListingShortcutController {
  constructor(private readonly shortcutService: ListingShortcutService) {}

  @Get()
  findAll(@GetUser() user: User) {
    return this.shortcutService.findAll(user);
  }

  @Post()
  create(@GetUser() user: User, @Body() dto: ListingShortcutCreateDto) {
    return this.shortcutService.createFromMatch(user, dto.matchId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    await this.shortcutService.remove(user, id);
  }
}
