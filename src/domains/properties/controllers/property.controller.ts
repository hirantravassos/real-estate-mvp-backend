import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
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
import { FilesInterceptor } from "@nestjs/platform-express";

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

  @Get(":id/presentation-files")
  async findAllPresentationFilesFromOne(
    @GetUser() user: User,
    @Param("id") id: string,
  ) {
    return await this.propertyService.findAllPresentationFilesFromOne(user, id);
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
  @UseInterceptors(FilesInterceptor("files"))
  async saveFiles(
    @GetUser() user: User,
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.propertyService.saveFiles(user, id, files);
  }

  @Post(":id/presentation-upload")
  @UseInterceptors(FilesInterceptor("files"))
  async savePresentationFiles(
    @GetUser() user: User,
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.propertyService.savePresentationFiles(user, id, files);
  }
}
