import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { Property } from "../entities/property.entity";
import {
  Between,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { publicAddressOf } from "../helpers/customer-safe.helper";
import {
  PropertyConciergeServiceEnum,
  PropertyFurnitureEnum,
  PropertyKindEnum,
  PropertyLiftEnum,
  PropertyMapper,
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
  @IsEnum(PropertyKindEnum)
  kind?: PropertyKindEnum | null;

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

function parseBoolean({ value }: any) {
  if (value === undefined || value === null || value === "") return undefined;
  return value === "true" || value === true;
}

export class PropertyFilterDto extends PaginationRequestDto {
  @IsOptional() @IsString() search?: string | null;
  @IsOptional() @IsEnum(PropertyKindEnum) kind?: PropertyKindEnum | null;
  @IsOptional() @IsString() minPrice?: string | null;
  @IsOptional() @IsString() maxPrice?: string | null;
  @IsOptional() @IsString() minPropertyTax?: string | null;
  @IsOptional() @IsString() maxPropertyTax?: string | null;
  @IsOptional() @IsString() minMaintenanceFee?: string | null;
  @IsOptional() @IsString() maxMaintenanceFee?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() minBedrooms?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minSuiteBedrooms?:
    | number
    | null;
  @IsOptional() @Type(() => Number) @IsNumber() minBathrooms?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minSquareMeters?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() maxSquareMeters?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minParkingSlots?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() minFloor?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() maxFloor?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() maxBeachProximityInKm?:
    | number
    | null;
  @IsOptional() @IsEnum(PropertyLiftEnum) infoLift?: PropertyLiftEnum | null;
  @IsOptional()
  @IsEnum(PropertyFurnitureEnum)
  infoFurniture?: PropertyFurnitureEnum | null;
  @IsOptional()
  @IsEnum(PropertyConciergeServiceEnum)
  infoConciergeService?: PropertyConciergeServiceEnum | null;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() hasPool?: boolean | null;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() hasBalcony?:
    | boolean
    | null;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() hasFancyBalcony?:
    | boolean
    | null;
  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  hasDedicatedParkingSpace?: boolean | null;
  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  hasAirConditioningSystem?: boolean | null;
  @IsOptional()
  @Transform(parseBoolean)
  @IsBoolean()
  hasGasWaterHeatingSystem?: boolean | null;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() hasGasSystem?:
    | boolean
    | null;
  @IsOptional() @Transform(parseBoolean) @IsBoolean() hasGym?: boolean | null;
}

export class PropertyLandingVisibilityDto {
  @IsBoolean()
  visible: boolean;
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

    if (dto.minBedrooms)
      baseWhere.infoBedrooms = MoreThanOrEqual(dto.minBedrooms);
    if (dto.minSuiteBedrooms)
      baseWhere.infoSuiteBedrooms = MoreThanOrEqual(dto.minSuiteBedrooms);
    if (dto.minBathrooms)
      baseWhere.infoBathrooms = MoreThanOrEqual(dto.minBathrooms);
    if (dto.minParkingSlots)
      baseWhere.infoParkingSpaceUnits = MoreThanOrEqual(dto.minParkingSlots);

    if (dto.minSquareMeters && dto.maxSquareMeters) {
      baseWhere.infoSquareMeters = Between(
        dto.minSquareMeters,
        dto.maxSquareMeters,
      );
    } else if (dto.minSquareMeters) {
      baseWhere.infoSquareMeters = MoreThanOrEqual(dto.minSquareMeters);
    } else if (dto.maxSquareMeters) {
      baseWhere.infoSquareMeters = LessThanOrEqual(dto.maxSquareMeters);
    }

    if (dto.minFloor && dto.maxFloor) {
      baseWhere.infoFloor = Between(dto.minFloor, dto.maxFloor);
    } else if (dto.minFloor) {
      baseWhere.infoFloor = MoreThanOrEqual(dto.minFloor);
    } else if (dto.maxFloor) {
      baseWhere.infoFloor = LessThanOrEqual(dto.maxFloor);
    }

    if (dto.maxBeachProximityInKm)
      baseWhere.infoBeachProximityInKm = LessThanOrEqual(
        dto.maxBeachProximityInKm,
      );

    if (dto.kind) baseWhere.kind = dto.kind;
    if (dto.infoLift) baseWhere.infoLift = dto.infoLift;
    if (dto.infoFurniture) baseWhere.infoFurniture = dto.infoFurniture;
    if (dto.infoConciergeService)
      baseWhere.infoConciergeService = dto.infoConciergeService;

    if (dto.hasPool !== undefined && dto.hasPool !== null)
      baseWhere.infoHasPool = dto.hasPool;
    if (dto.hasBalcony !== undefined && dto.hasBalcony !== null)
      baseWhere.infoHasBalcony = dto.hasBalcony;
    if (dto.hasFancyBalcony !== undefined && dto.hasFancyBalcony !== null)
      baseWhere.infoHasFancyBalcony = dto.hasFancyBalcony;
    if (
      dto.hasDedicatedParkingSpace !== undefined &&
      dto.hasDedicatedParkingSpace !== null
    )
      baseWhere.infoHasDedicatedParkingSpace = dto.hasDedicatedParkingSpace;
    if (
      dto.hasAirConditioningSystem !== undefined &&
      dto.hasAirConditioningSystem !== null
    )
      baseWhere.infoHasAirConditioningSystem = dto.hasAirConditioningSystem;
    if (
      dto.hasGasWaterHeatingSystem !== undefined &&
      dto.hasGasWaterHeatingSystem !== null
    )
      baseWhere.infoHasGasWaterHeatingSystem = dto.hasGasWaterHeatingSystem;
    if (dto.hasGasSystem !== undefined && dto.hasGasSystem !== null)
      baseWhere.infoHasGasSystem = dto.hasGasSystem;
    if (dto.hasGym !== undefined && dto.hasGym !== null)
      baseWhere.infoHasGym = dto.hasGym;

    if (dto.minPrice && dto.maxPrice) {
      baseWhere.price = Between(dto.minPrice, dto.maxPrice);
    } else if (dto.minPrice) {
      baseWhere.price = MoreThanOrEqual(dto.minPrice);
    } else if (dto.maxPrice) {
      baseWhere.price = LessThanOrEqual(dto.maxPrice);
    }

    if (dto.minPropertyTax && dto.maxPropertyTax) {
      baseWhere.infoPropertyTax = Between(
        dto.minPropertyTax,
        dto.maxPropertyTax,
      );
    } else if (dto.minPropertyTax) {
      baseWhere.infoPropertyTax = MoreThanOrEqual(dto.minPropertyTax);
    } else if (dto.maxPropertyTax) {
      baseWhere.infoPropertyTax = LessThanOrEqual(dto.maxPropertyTax);
    }

    if (dto.minMaintenanceFee && dto.maxMaintenanceFee) {
      baseWhere.infoMaintenanceFee = Between(
        dto.minMaintenanceFee,
        dto.maxMaintenanceFee,
      );
    } else if (dto.minMaintenanceFee) {
      baseWhere.infoMaintenanceFee = MoreThanOrEqual(dto.minMaintenanceFee);
    } else if (dto.maxMaintenanceFee) {
      baseWhere.infoMaintenanceFee = LessThanOrEqual(dto.maxMaintenanceFee);
    }

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
    if (id) {
      const owned = await this.propertyRepository.findOne({
        where: { id, user: { id: user.id } },
        select: { id: true },
      });

      if (!owned) {
        throw new NotFoundException("Property not found");
      }
    }

    const entity = PropertyMapper.toEntity(dto, id);
    entity.user = user;

    if (entity.contacts?.length) {
      for (const contact of entity.contacts) {
        contact.user = user;
      }
    }

    return await this.propertyRepository.save(entity);
  }

  /** Shows or hides the property on the broker's public page. */
  async setLandingVisibility(user: User, id: string, visible: boolean) {
    const result = await this.propertyRepository.update(
      { id, user: { id: user.id }, active: true },
      { showOnLanding: visible },
    );
    if (!result.affected) throw new NotFoundException("Property not found");
    return this.findOne(user, id);
  }

  /** What the broker's public page lists, newest first. */
  async findForLanding(userId: string, limit: number) {
    return this.propertyRepository.find({
      where: { userId, active: true, showOnLanding: true },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async remove(user: User, id: string) {
    await this.propertyRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }

  async findOneForPresentation(id: string) {
    const entity = await this.propertyRepository
      .findOneOrFail({
        where: { id, active: true },
        relations: { user: true },
      })
      .catch(() => {
        throw new NotFoundException("Property not found");
      });

    const dto = PropertyMapper.toDto(entity);
    // The customer never sees the private notes nor the portal it came from.
    const {
      comment: _comment, // eslint-disable-line @typescript-eslint/no-unused-vars
      sourcePortal: _sourcePortal, // eslint-disable-line @typescript-eslint/no-unused-vars
      sourceUrl: _sourceUrl, // eslint-disable-line @typescript-eslint/no-unused-vars
      showOnLanding: _showOnLanding, // eslint-disable-line @typescript-eslint/no-unused-vars
      sourceDetails: _sourceDetails, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...presentation
    } = dto;
    return {
      ...presentation,
      // Anyone with the link may open it: only the neighborhood and city.
      address: publicAddressOf(dto),
      address2: "",
      agent: {
        name: entity.user.name,
        profileImage: entity.user.profileImage,
        slug: entity.user.slug ?? null,
      },
    };
  }
}
