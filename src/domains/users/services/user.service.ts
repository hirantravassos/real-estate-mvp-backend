import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository.js";
import { User } from "../entities/user.entity.js";
import { UserMapper } from "../mappers/user.mapper";
import { UserCreateDto } from "../dtos/user-create.dto";
import { CustomerAvatarDto } from "../../customers/dtos/customer-avatar.dto";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    return user;
  }

  async updateAvatar(id: string, avatar: CustomerAvatarDto): Promise<User> {
    await this.userRepository.update({ id }, { avatar: { ...avatar } });
    return this.findById(id);
  }

  async save(dto: UserCreateDto, id?: string): Promise<User> {
    const user = UserMapper.toEntity(dto, id);
    return this.userRepository.save(user);
  }
}
