import { User } from "../entities/user.entity.js";
import { DateHelper } from "../../../shared/utils/date.util.js";
import { UserCreateDto } from "../dtos/user-create.dto";
import { TokenPayload } from "google-auth-library";
import { GoogleUserDto } from "../../auth/dtos/google-user.dto";

export class UserMapper {
  static toDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
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

  static toGoogleDto(payload: TokenPayload): GoogleUserDto {
    const dto = new GoogleUserDto();

    dto.name = payload?.name as string;
    dto.email = payload?.email as string;
    dto.id = payload?.sub;

    return dto;
  }
}
