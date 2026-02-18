import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories';
import { RegisterDto, UserResponseDto } from '../dtos';
import { UserMapper } from '../mappers';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(registerDto: RegisterDto): Promise<UserResponseDto> {
    const isEmailTaken = await this.userRepository.existsByEmail(
      registerDto.email,
    );

    if (isEmailTaken) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      BCRYPT_SALT_ROUNDS,
    );

    const user = await this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      fullName: registerDto.fullName,
      isMfaEnabled: false,
    });

    return UserMapper.toResponseDto(user);
  }
}
