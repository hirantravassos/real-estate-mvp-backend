import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  PropertyMatchFilterDto,
  PropertyMatchPinDto,
  PropertyMatchUpdateDto,
} from "../dtos/property-hunt.dto";
import { PropertyMatchService } from "../services/property-match.service";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the hunts found, and the soft links between properties and customers. */
@Controller("property-matches")
@UseGuards(JwtGuard)
export class PropertyMatchController {
  constructor(private readonly matchService: PropertyMatchService) {}

  @Get()
  findAll(@GetUser() user: User, @Query() filter: PropertyMatchFilterDto) {
    return this.matchService.findAll(user, filter);
  }

  @Get("counts")
  counts(@GetUser() user: User, @Query("customerIds") customerIds?: string) {
    const ids = (customerIds ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => UUID_PATTERN.test(id))
      .slice(0, 200);
    return this.matchService.countByCustomer(user, ids);
  }

  @Get("properties/:propertyId")
  findByProperty(
    @GetUser() user: User,
    @Param("propertyId", ParseUUIDPipe) propertyId: string,
  ) {
    return this.matchService.findByProperty(user, propertyId);
  }

  @Post("pins")
  pin(@GetUser() user: User, @Body() dto: PropertyMatchPinDto) {
    return this.matchService.pin(user, dto);
  }

  @Patch(":id")
  update(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PropertyMatchUpdateDto,
  ) {
    return this.matchService.update(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    await this.matchService.remove(user, id);
  }
}
