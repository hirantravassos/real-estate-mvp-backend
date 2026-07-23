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
import { FindOptionsWhere, ILike } from "typeorm";
import { Contact } from "../entities/contact.entity";

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async findAll(user: User, filter: ContactFilterDto) {
    const [data, total] = await this.contactRepository.findAndCount({
      where: this.getWhereProps(user, filter),
      relations: {
        seller: {
          properties: true,
        },
        buyer: {
          preferences: true,
        },
      },
      order: {
        name: "ASC",
      },
      take: filter.limit,
      skip: filter.skip,
    });
    return PaginationMapper.toDto([data, total], {
      page: filter.page,
      limit: filter.limit,
      skip: filter.skip,
    });
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

  async findDuplicatedByPhone(user: User, phone: string) {
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

    return await this.contactRepository.save({
      ...entity,
      userId: user.id,
    });
  }

  private getWhereProps(
    user: User,
    filter: ContactFilterDto,
  ): FindOptionsWhere<Contact>[] {
    const baseWhere: FindOptionsWhere<Contact> = {
      userId: user.id,
      isSeller: filter?.sellers,
      isBuyer: filter?.buyers,
      isAgent: filter?.agents,
    };

    return [
      { ...baseWhere, name: ILike(`%${filter?.search ?? ""}%`) },
      { ...baseWhere, phone: ILike(`%${filter?.search ?? ""}%`) },
      { ...baseWhere, email: ILike(`%${filter?.search ?? ""}%`) },
    ];
  }
}
