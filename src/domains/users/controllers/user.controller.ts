import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "../services/user.service.js";
import { UserMapper } from "../mappers/user.mapper.js";
import { UserResponseDto } from "../dtos/user-response.dto.js";
import { User } from "../entities/user.entity";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";

@Controller("users")
@UseGuards(JwtGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  async me(@GetUser() user: User): Promise<UserResponseDto> {
    const entity = await this.userService.findById(user.id);
    return UserMapper.toDto(entity);
  }
}
