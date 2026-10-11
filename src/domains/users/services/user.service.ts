import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Not } from "typeorm";
import { UserRepository } from "../repositories/user.repository.js";
import { User } from "../entities/user.entity.js";
import { UserMapper } from "../mappers/user.mapper";
import { UserCreateDto } from "../dtos/user-create.dto";
import { CustomerAvatarDto } from "../../customers/dtos/customer-avatar.dto";
import { CURRENT_TERMS_VERSION } from "../../../shared/constants/legal.constant";
import { RequestEvidence } from "../../../shared/utils/request-evidence.util";
import { UserProfileUpdateDto } from "../dtos/user-profile-update.dto";
import {
  isReservedSlug,
  SLUG_MAX_LENGTH,
  slugify,
} from "../helpers/user-slug.helper";

const SLUG_FALLBACK = "corretor";

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

  /** The broker with the address of their public page, made on first use. */
  async findByIdWithSlug(id: string): Promise<User> {
    const user = await this.findById(id);
    if (user.slug) return user;

    user.slug = await this.availableSlug(user.name, id);
    await this.userRepository.update({ id }, { slug: user.slug });
    return user;
  }

  async findBySlug(slug: string): Promise<User> {
    const user = await this.userRepository.findOneBy({
      slug: slug.toLowerCase(),
      active: true,
    });
    if (!user) throw new NotFoundException("Corretor não encontrado");
    return user;
  }

  async updateProfile(id: string, dto: UserProfileUpdateDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.slug && dto.slug !== user.slug) {
      if (isReservedSlug(dto.slug)) {
        throw new BadRequestException(
          "Esse endereço é reservado, escolha outro",
        );
      }
      const taken = await this.userRepository.existsBy({
        slug: dto.slug,
        id: Not(id),
      });
      if (taken) {
        throw new ConflictException("Esse endereço já é de outro corretor");
      }
    }

    await this.userRepository.update(
      { id },
      {
        city: dto.city,
        phone: dto.phone ? dto.phone.replaceAll(/\D/g, "") : null,
        creci: dto.creci ?? null,
        bio: dto.bio ?? null,
        workingCities: dto.workingCities ?? [],
        salesNiches: dto.salesNiches ?? [],
        targetClienteles: dto.targetClienteles ?? [],
        aiMemory: dto.aiMemory ?? null,
        ...(dto.slug ? { slug: dto.slug } : {}),
      },
    );
    return this.findByIdWithSlug(id);
  }

  /** The name as an address, with a number at the end when it is taken. */
  private async availableSlug(name: string, id: string): Promise<string> {
    const base = slugify(name) || SLUG_FALLBACK;
    for (let attempt = 1; attempt <= 50; attempt++) {
      const suffix = attempt === 1 ? "" : `-${attempt}`;
      const candidate = `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
      if (isReservedSlug(candidate)) continue;
      const taken = await this.userRepository.existsBy({
        slug: candidate,
        id: Not(id),
      });
      if (!taken) return candidate;
    }
    return `${base.slice(0, SLUG_MAX_LENGTH - 9)}-${id.slice(0, 8)}`;
  }

  async save(dto: UserCreateDto, id?: string): Promise<User> {
    const user = UserMapper.toEntity(dto, id);
    return this.userRepository.save(user);
  }
}
