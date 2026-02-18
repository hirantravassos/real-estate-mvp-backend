import { User } from '../entities/user.entity';
import { UserResponseDto } from '../dtos';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isMfaEnabled: user.isMfaEnabled,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
