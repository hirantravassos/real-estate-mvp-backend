import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories';
import { UserMapper } from '../mappers';
import { UserResponseDto } from '../dtos';

@Injectable()
export class ToggleMfaUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string, enable: boolean): Promise<UserResponseDto> {
    await this.userRepository.updateMfaEnabled(userId, enable);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return UserMapper.toResponseDto(user);
  }
}
