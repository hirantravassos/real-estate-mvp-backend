import { Property } from "../entities/property.entity";
import { PropertyDto } from "../dtos/property.dto";
import { PropertyListDto } from "../dtos/property-list.dto";
import { PropertyCreateDto } from "../dtos/property-create.dto";
import { Contact } from "../../contacts/entities/contact.entity";

export class PropertyMapper {
  static toEntity(dto: PropertyCreateDto, id?: string) {
    const entity = new Property();

    entity.alias = dto.alias ?? null;
    entity.address = dto.address;
    entity.address2 = dto.address2;
    entity.comment = dto.comment ?? null;
    entity.price = dto.price;

    entity.characteristics.bedrooms = dto.characteristics.bedrooms ?? null;
    entity.characteristics.suiteBedrooms =
      dto.characteristics.suiteBedrooms ?? null;
    entity.characteristics.bathrooms = dto.characteristics.bathrooms ?? null;
    entity.characteristics.lift = dto.characteristics.lift ?? null;
    entity.characteristics.hasPool = dto.characteristics.hasPool ?? null;
    entity.characteristics.hasBalcony = dto.characteristics.hasBalcony ?? null;
    entity.characteristics.hasFancyBalcony =
      dto.characteristics.hasFancyBalcony ?? null;
    entity.characteristics.furniture = dto.characteristics.furniture ?? null;
    entity.characteristics.parkingSpaceUnits =
      dto.characteristics.parkingSpaceUnits ?? null;
    entity.characteristics.hasDedicatedParkingSpace =
      dto.characteristics.hasDedicatedParkingSpace ?? null;
    entity.characteristics.squareMeters =
      dto.characteristics.squareMeters ?? null;
    entity.characteristics.propertyTax =
      dto.characteristics.propertyTax ?? null;
    entity.characteristics.maintenanceFee =
      dto.characteristics.maintenanceFee ?? null;
    entity.characteristics.floor = dto.characteristics.floor ?? null;
    entity.characteristics.beachProximityInKm =
      dto.characteristics.beachProximityInKm ?? null;
    entity.characteristics.conciergeService =
      dto.characteristics.conciergeService ?? null;
    entity.characteristics.hasAirConditioningSystem =
      dto.characteristics.hasAirConditioningSystem ?? null;
    entity.characteristics.hasGasWaterHeatingSystem =
      dto.characteristics.hasGasWaterHeatingSystem ?? null;
    entity.characteristics.hasGasSystem =
      dto.characteristics.hasGasSystem ?? null;
    entity.characteristics.hasGym = dto.characteristics.hasGym ?? null;

    entity.ownerId = dto?.ownerId ?? null;

    if (id) {
      entity.id = id;
    }

    return entity;
  }

  static toDto(entity: Property): PropertyDto {
    return {
      id: entity.id,
      alias: entity.alias,
      address: entity.address,
      address2: entity.address2,
      comment: entity.comment,
      price: entity.price,
      bedrooms: entity.characteristics.bedrooms,
      suiteBedrooms: entity.characteristics.suiteBedrooms,
      bathrooms: entity.characteristics.bathrooms,
      lift: entity.characteristics.lift,
      hasPool: entity.characteristics.hasPool,
      hasBalcony: entity.characteristics.hasBalcony,
      hasFancyBalcony: entity.characteristics.hasFancyBalcony,
      furniture: entity.characteristics.furniture,
      parkingSpaceUnits: entity.characteristics.parkingSpaceUnits,
      hasDedicatedParkingSpace: entity.characteristics.hasDedicatedParkingSpace,
      squareMeters: entity.characteristics.squareMeters,
      propertyTax: entity.characteristics.propertyTax,
      maintenanceFee: entity.characteristics.maintenanceFee,
      floor: entity.characteristics.floor,
      beachProximityInKm: entity.characteristics.beachProximityInKm,
      conciergeService: entity.characteristics.conciergeService,
      hasAirConditioningSystem: entity.characteristics.hasAirConditioningSystem,
      hasGasWaterHeatingSystem: entity.characteristics.hasGasWaterHeatingSystem,
      hasGasSystem: entity.characteristics.hasGasSystem,
      hasGym: entity.characteristics.hasGym,
      owner: this.toContact(entity.owner),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      active: entity.active,
    };
  }

  static toListDto(entities: Property[]): PropertyListDto[] {
    return entities.map((entity) => {
      return {
        id: entity.id,
        alias: entity.alias,
        address: entity.address,
        address2: entity.address2,
        price: entity.price,
        bedrooms: entity.characteristics.bedrooms,
        bathrooms: entity.characteristics.bathrooms,
        squareMeters: entity.characteristics.squareMeters,
        createdAt: entity.createdAt,
        owner: this.toContact(entity.owner),
      };
    });
  }

  private static toContact(from?: Contact): Contact | null {
    if (!from) return null;

    const entity = new Contact();
    entity.id = from.id;
    entity.name = from.name;
    entity.phone = from.phone;

    return entity;
  }
}
