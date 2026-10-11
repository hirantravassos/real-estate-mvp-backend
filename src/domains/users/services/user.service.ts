import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository.js";
import { User } from "../entities/user.entity.js";
import { UserMapper } from "../mappers/user.mapper";
import { UserCreateDto } from "../dtos/user-create.dto";
import { CustomerAvatarDto } from "../../customers/dtos/customer-avatar.dto";
import { CURRENT_TERMS_VERSION } from "../../../shared/constants/legal.constant";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";

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

  /** Stores who accepted which version of the terms, when and from where. */
  async acceptTerms(
    id: string,
    version: string,
    evidence: RequestEvidence,
  ): Promise<User> {
    if (version !== CURRENT_TERMS_VERSION) {
      throw new BadRequestException(
        "Esta versão dos termos não está mais em vigor. Recarregue a página.",
      );
    }
    await this.userRepository.update(
      { id },
      {
        termsVersion: version,
        termsAcceptedAt: new Date(),
        termsAcceptedIp: evidence.ip,
        termsAcceptedUserAgent: evidence.userAgent,
      },
    );
    return this.findById(id);
  }

  async save(dto: UserCreateDto, id?: string): Promise<User> {
    const user = UserMapper.toEntity(dto, id);
    return this.userRepository.save(user);
  }
}
