import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { PropertyMediaService } from "../services/property-media.service";
import { PropertyMediaMapper } from "../mappers/property-media.mapper";
import { PropertyService } from "../services/property.service";
import {
  MediaConfirmUploadDto,
  MediaPresignedUploadRequestDto,
  MediaReorderDto,
  MediaUpdateDto,
} from "../dtos/property-media.dto";

@Controller("properties/:propertyId/media")
@UseGuards(JwtGuard)
export class PropertyMediaController {
  constructor(
    private readonly mediaService: PropertyMediaService,
    private readonly propertyService: PropertyService,
  ) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
  ) {
    await this.propertyService.findOne(user, propertyId);
    const media = await this.mediaService.findAllByProperty(user.id, propertyId);
    return media.map(PropertyMediaMapper.toDto);
  }

  @Post("presigned-upload")
  async getPresignedUpload(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
    @Body() dto: MediaPresignedUploadRequestDto,
  ) {
    await this.propertyService.findOne(user, propertyId);
    return this.mediaService.generatePresignedUpload(user.id, propertyId, dto);
  }

  @Post()
  async confirmUpload(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
    @Body() dto: MediaConfirmUploadDto,
  ) {
    await this.propertyService.findOne(user, propertyId);
    const media = await this.mediaService.confirmUpload(user.id, propertyId, dto);
    return PropertyMediaMapper.toDto(media);
  }

  @Get(":mediaId/url")
  async getPresignedUrl(
    @GetUser() user: User,
    @Param("mediaId") mediaId: string,
  ) {
    return this.mediaService.getPresignedUrl(user.id, mediaId);
  }

  @Patch(":mediaId")
  async update(
    @GetUser() user: User,
    @Param("mediaId") mediaId: string,
    @Body() dto: MediaUpdateDto,
  ) {
    const media = await this.mediaService.update(user.id, mediaId, dto);
    return PropertyMediaMapper.toDto(media);
  }

  @Put("order")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
    @Body() dto: MediaReorderDto,
  ) {
    await this.mediaService.reorder(user.id, propertyId, dto);
  }

  @Delete(":mediaId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GetUser() user: User, @Param("mediaId") mediaId: string) {
    await this.mediaService.remove(user.id, mediaId);
  }
}
