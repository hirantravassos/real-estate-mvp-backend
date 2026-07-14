import { ContactRepository } from "../repositories/contact.repository";
import { User } from "../../users/entities/user.entity";
import { ContactFilterDto } from "../dtos/contact.dto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContactCreateDto } from "../dtos/contact-create.dto";
import { ContactMapper } from "../mappers/contact.mapper";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async findAll(
    user: User,
    pagination: PaginationRequestDto,
    filter: ContactFilterDto,
  ) {
    const [data, total] = await this.contactRepository.findAndCount({
      where: {
        userId: user.id,
      },
      relations: {
        seller: {
          properties: true,
        },
        buyer: {
          preferences: true,
        },
      },
      take: filter.limit,
      skip: filter.skip,
    });
    return PaginationMapper.toDto([data, total], pagination);
  }

  async findOne(user: User, contactId: string) {
    return await this.contactRepository
      .findOneOrFail({
        where: {
          id: contactId,
          userId: user.id,
        },
        relations: {
          seller: {
            properties: true,
          },
          buyer: {
            preferences: true,
          },
        },
      })
      .catch(() => {
        throw new NotFoundException("Contato não encontrado");
      });
  }

  async findDuplicated(user: User, phone: string) {
    return await this.contactRepository
      .findOneOrFail({
        where: {
          phone: phone,
          userId: user.id,
        },
      })
      .catch(() => {
        return null;
      });
  }

  async save(user: User, dto: ContactCreateDto, contactId?: string) {
    const hasAtLeastOneType = dto?.isAgent || dto?.isBuyer || dto?.isSeller;

    if (!hasAtLeastOneType) {
      throw new BadRequestException(
        "Contato precisa ter pelo menos um tipo de categoria",
      );
    }

    const entity = ContactMapper.toEntity(dto, contactId);
    const saved = await this.contactRepository.save({
      ...entity,
      userId: user.id,
    });
    return saved;
  }
}
