import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "../services/user.service.js";
import { UserMapper } from "../mappers/user.mapper.js";
import { UserResponseDto } from "../dtos/user-response.dto.js";
import { User } from "../entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { CustomerAvatarDto } from "../../customers/dtos/customer-avatar.dto";
import { readRequestEvidence } from "../../../shared/utils/request-evidence.util";
import { UserTermsAcceptDto } from "../dtos/user-terms-accept.dto";

@Controller("users")
@UseGuards(JwtGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  async me(@GetUser() user: User): Promise<UserResponseDto> {
    const entity = await this.userService.findById(user.id);
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
