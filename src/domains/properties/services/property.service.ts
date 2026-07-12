import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { Property } from "../entities/property.entity";
import { FindOptionsWhere, Repository } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { PropertyMapper } from "../mappers/property.mapper";
import { PropertyFilterDto } from "../dtos/property-filter.dto";
import { PropertyCreateDto } from "../dtos/property-create.dto";

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async findAll(user: User, dto: PropertyFilterDto) {
    const baseWhere: FindOptionsWhere<Property> = {
      user: { id: user.id },
      active: true,
    };

    const [data, total] = await this.propertyRepository.findAndCount({
      where: baseWhere,
      relations: {
        owner: true,
      },
      order: {
        createdAt: "DESC",
      },
      skip: dto.skip,
      take: dto.limit,
    });

    return PaginationMapper.toDto([PropertyMapper.toListDto(data), total], dto);
  }

  async findOne(user: User, id: string) {
    return PropertyMapper.toDto(
      await this.propertyRepository
        .findOneOrFail({
          where: { id, user: { id: user.id } },
          relations: {
            owner: true,
          },
        })
        .catch(() => {
          throw new NotFoundException("Property not found");
        }),
    );
  }

  async save(user: User, dto: PropertyCreateDto, id?: string) {
    const entity = PropertyMapper.toEntity(dto, id);
    entity.user = user;
    return await this.propertyRepository.save(entity);
  }

  async remove(user: User, id: string) {
    await this.propertyRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
