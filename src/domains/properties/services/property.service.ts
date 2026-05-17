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
