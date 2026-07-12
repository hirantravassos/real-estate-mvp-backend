import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserGuard } from "../../auth/guards/user.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { PropertyMapper } from "../mappers/property.mapper";
import { PropertyService } from "../services/property.service";
import { PropertyFilterDto } from "../dtos/property-filter.dto";
import { PropertyCreateDto } from "../dtos/property-create.dto";

@Controller("properties")
@UseGuards(UserGuard)
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  async findAll(@GetUser() user: User, @Query() filter: PropertyFilterDto) {
    return await this.propertyService.findAll(user, filter);
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return await this.propertyService.findOne(user, id);
  }

  @Post()
  async create(@GetUser() user: User, @Body() dto: PropertyCreateDto) {
    return PropertyMapper.toDto(await this.propertyService.save(user, dto));
  }

  @Patch(":id")
  async update(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: PropertyCreateDto,
  ) {
    return PropertyMapper.toDto(await this.propertyService.save(user, dto, id));
  }

  @Delete(":id")
  remove(@GetUser() user: User, @Param("id") id: string) {
    return this.propertyService.remove(user, id);
  }
}
