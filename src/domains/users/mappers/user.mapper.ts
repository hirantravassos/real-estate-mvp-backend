import { User } from "../entities/user.entity.js";
import type { UserResponseDto } from "../dtos/user-response.dto.js";
import { DateHelper } from "../../../shared/utils/date.util.js";
import { UserCreateDto } from "../dtos/user-create.dto";
import { TokenPayload } from "google-auth-library";

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: DateHelper.formatUtcToIso(user.createdAt),
      updatedAt: DateHelper.formatUtcToIso(user.updatedAt),
    };
  }

  static toEntity(dto: UserCreateDto, id?: string): User {
    const user = new User();
    user.name = dto.name;
    user.email = dto.email;

    if (id) {
      user.id = id;
    }

    return user;
  }

  static toEntityFromGoogle(dto: TokenPayload): User {
    const user = new User();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    user.name = dto?.name as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    user.email = dto?.email as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    user.googleId = dto?.sub as string;

    return user;
  }
}
