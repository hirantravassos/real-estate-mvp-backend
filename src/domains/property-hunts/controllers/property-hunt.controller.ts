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
  Query,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  HuntInterpretDto,
  PropertyHuntCreateDto,
  PropertyHuntFilterDto,
} from "../dtos/property-hunt.dto";
import { PropertyHuntService } from "../services/property-hunt.service";
import { PlanLimit } from "../../subscriptions/decorators/subscription.decorator";
import { PlanLimitResource } from "../../subscriptions/enums/subscription.enum";

/** The AI property hunt: reads what the broker wants and scans the portals. */
@Controller("property-hunts")
@UseGuards(JwtGuard)
export class PropertyHuntController {
  constructor(private readonly huntService: PropertyHuntService) {}

  @Get("estimate")
  estimate() {
    return this.huntService.estimate();
  }

  @Post("interpret")
  interpret(@GetUser() user: User, @Body() dto: HuntInterpretDto) {
    return this.huntService.interpret(user, dto.request);
  }

  @Post("conversations/:conversationId/interpret")
  interpretConversation(
    @GetUser() user: User,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.huntService.interpretConversation(user, conversationId);
  }

  @Get()
  findAll(@GetUser() user: User, @Query() filter: PropertyHuntFilterDto) {
    return this.huntService.findAll(user, filter);
  }

  @Post()
  @PlanLimit(PlanLimitResource.PROPERTY_HUNTS_PER_MONTH)
  create(@GetUser() user: User, @Body() dto: PropertyHuntCreateDto) {
    return this.huntService.create(user, dto);
  }

  @Get(":id")
  findOne(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.huntService.findOne(user, id);
  }

  @Post(":id/cancel")
  cancel(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.huntService.cancel(user, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    await this.huntService.remove(user, id);
  }
}
