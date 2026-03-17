import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { Property } from "../entities/property.entity";
import { FindOptionsWhere, ILike, Repository } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { IsOptional, IsString, IsNumber, IsBoolean, ValidateNested, IsArray, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { InjectRepository } from "@nestjs/typeorm";
import {
  PropertyMapper,
  PropertyLiftEnum,
  PropertyFurnitureEnum,
  PropertyConciergeServiceEnum,
} from "../mappers/property.mapper";

export class PropertyContactCreateDto {
  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string | null;
}

export class PropertyCreateDto {
  @IsOptional()
  @IsString()
  alias?: string | null;

  @IsString()
  address: string;

  @IsString()
  address2: string;

  @IsOptional()
  @ValidateLongText({ isOptional: true })
  comment?: string | null;

  @ValidateCurrency()
  price: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyContactCreateDto)
  contacts?: PropertyContactCreateDto[];

  @IsOptional()
  @IsNumber()
  infoBedrooms?: number | null;

  @IsOptional()
  @IsNumber()
  infoSuiteBedrooms?: number | null;

  @IsOptional()
  @IsNumber()
  infoBathrooms?: number | null;

  @IsOptional()
  @IsEnum(PropertyLiftEnum)
  infoLift?: PropertyLiftEnum | null;

  @IsOptional()
  @IsBoolean()
  infoHasPool?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasBalcony?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasFancyBalcony?: boolean | null;

  @IsOptional()
  @IsEnum(PropertyFurnitureEnum)
  infoFurniture?: PropertyFurnitureEnum | null;

  @IsOptional()
  @IsNumber()
  infoParkingSpaceUnits?: number | null;

  @IsOptional()
  @IsBoolean()
  infoHasDedicatedParkingSpace?: boolean | null;

  @IsOptional()
  @IsNumber()
  infoSquareMeters?: number | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  infoPropertyTax?: string | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  infoMaintenanceFee?: string | null;

  @IsOptional()
  @IsNumber()
  infoFloor?: number | null;

  @IsOptional()
  @IsNumber()
  infoBeachProximityInKm?: number | null;

  @IsOptional()
  @IsString()
  infoConciergeService?: PropertyConciergeServiceEnum | null;

  @IsOptional()
  @IsBoolean()
  infoHasAirConditioningSystem?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasGasWaterHeatingSystem?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasGasSystem?: boolean | null;

  @IsOptional()
  @IsBoolean()
  infoHasGym?: boolean | null;
}

export class PropertyFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search?: string | null;
}

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

    let where: FindOptionsWhere<Property> | FindOptionsWhere<Property>[] =
      baseWhere;

    if (dto.search) {
      where = [
        { ...baseWhere, alias: ILike(`%${dto.search}%`) },
        { ...baseWhere, address: ILike(`%${dto.search}%`) },
      ];
    }

    const [data, total] = await this.propertyRepository.findAndCount({
      where,
      relations: {
        contacts: true,
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
            contacts: true,
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

    if (entity.contacts?.length) {
      for (const contact of entity.contacts) {
        contact.user = user;
      }
    }

    return await this.propertyRepository.save(entity);
  }

  async remove(user: User, id: string) {
    await this.propertyRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
