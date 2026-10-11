import { User } from "../entities/user.entity.js";
import { DateHelper } from "../../../shared/utils/date.util.js";
import { UserCreateDto } from "../dtos/user-create.dto";
import { TokenPayload } from "google-auth-library";
import { CURRENT_TERMS_VERSION } from "../../../shared/constants/legal.constant";

export class UserMapper {
  static toDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      avatar: user.avatar ?? null,
      terms: {
        acceptedVersion: user.termsVersion ?? null,
        acceptedAt: user.termsAcceptedAt
          ? DateHelper.formatUtcToIso(user.termsAcceptedAt)
          : null,
        currentVersion: CURRENT_TERMS_VERSION,
      },
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

    user.name = dto?.name as string;

    user.email = dto?.email as string;

    user.googleId = dto?.sub;

    return user;
  }
}
