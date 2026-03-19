import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  PropertyCreateDto,
  PropertyFilterDto,
  PropertyService,
} from "../services/property.service";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { PropertyMapper } from "../mappers/property.mapper";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("properties")
@UseGuards(JwtGuard)
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

  @Get(":id/files")
  async findAllFilesFromOne(@GetUser() user: User, @Param("id") id: string) {
    return await this.propertyService.findAllFilesFromOne(user, id);
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

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @GetUser() user: User,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.propertyService.saveFile(user, id, file);
  }
}
