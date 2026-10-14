import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { memoryStorage } from "multer";
import { UserService } from "../services/user.service.js";
import { UserProfileImageService } from "../services/user-profile-image.service";
import { UserMapper } from "../mappers/user.mapper.js";
import { UserResponseDto } from "../dtos/user-response.dto.js";
import { User } from "../entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { CustomerAvatarDto } from "../../customers/dtos/customer-avatar.dto";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import { UserTermsAcceptDto } from "../dtos/user-terms-accept.dto";
import { UserProfileUpdateDto } from "../dtos/user-profile-update.dto";
import { SkipSubscriptionCheck } from "../../subscriptions/decorators/subscription.decorator";

const MAXIMUM_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;

/** A first filter only: the server decodes and redraws every photo. */
const PROFILE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** The profile and the terms open even with the subscription expired. */
@Controller("users")
@UseGuards(JwtGuard)
@SkipSubscriptionCheck()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userProfileImageService: UserProfileImageService,
  ) {}

  @Get("me")
  async me(@GetUser() user: User): Promise<UserResponseDto> {
    const entity = await this.userService.findByIdWithSlug(user.id);
    return UserMapper.toDto(entity);
  }

  @Patch("me/profile")
  async updateProfile(
    @GetUser() user: User,
    @Body() dto: UserProfileUpdateDto,
  ): Promise<UserResponseDto> {
    const entity = await this.userService.updateProfile(user.id, dto);
    return UserMapper.toDto(entity);
  }

  @Patch("me/avatar")
  async updateAvatar(
    @GetUser() user: User,
    @Body() dto: CustomerAvatarDto,
  ): Promise<UserResponseDto> {
    const entity = await this.userService.updateAvatar(user.id, dto);
    return UserMapper.toDto(entity);
  }

  /** The broker's own photo, shown together with the character. */
  @Put("me/profile-image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAXIMUM_PROFILE_IMAGE_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(null, true);
          return;
        }
        callback(
          new BadRequestException("Envie uma foto JPEG, PNG ou WEBP."),
          false,
        );
      },
    }),
  )
  async updateProfileImage(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserResponseDto> {
    if (!file?.size) throw new BadRequestException("A foto é obrigatória.");
    const entity = await this.userProfileImageService.replace(
      user.id,
      file.buffer,
    );
    return UserMapper.toDto(entity);
  }

  @Delete("me/profile-image")
  async removeProfileImage(@GetUser() user: User): Promise<UserResponseDto> {
    const entity = await this.userProfileImageService.remove(user.id);
    return UserMapper.toDto(entity);
  }

  /** No body: it only stamps the time, for the broker in the token. */
  @Post("me/tutorial")
  async completeTutorial(@GetUser() user: User): Promise<UserResponseDto> {
    const entity = await this.userService.completeTutorial(user.id);
    return UserMapper.toDto(entity);
  }

  @Post("me/terms")
  async acceptTerms(
    @GetUser() user: User,
    @Body() dto: UserTermsAcceptDto,
    @Req() request: Request,
  ): Promise<UserResponseDto> {
    const entity = await this.userService.acceptTerms(
      user.id,
      dto.version,
      readRequestEvidence(request),
    );
    return UserMapper.toDto(entity);
  }
}
