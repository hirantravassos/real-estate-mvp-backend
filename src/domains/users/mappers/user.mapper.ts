import { User } from "../entities/user.entity.js";
import { DateHelper } from "../../../shared/utils/date.util.js";
import { UserCreateDto } from "../dtos/user-create.dto";
import { TokenPayload } from "google-auth-library";
import { UserResponseDto } from "../dtos/user-response.dto";
import { CURRENT_TERMS_VERSION } from "../../../shared/constants/legal.constant";

export class UserMapper {
  static toDto(user: User): UserResponseDto {
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
      slug: user.slug ?? null,
      tutorial: {
        completedAt: user.tutorialCompletedAt
          ? DateHelper.formatUtcToIso(user.tutorialCompletedAt)
          : null,
      },
      profile: {
        city: user.city ?? null,
        phone: user.phone ?? null,
        creci: user.creci ?? null,
        bio: user.bio ?? null,
        workingCities: user.workingCities ?? [],
        salesNiches: user.salesNiches ?? [],
        targetClienteles: user.targetClienteles ?? [],
        aiMemory: user.aiMemory ?? null,
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
