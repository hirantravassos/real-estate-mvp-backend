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

    entity.characteristics.bedrooms = dto.infoBedrooms ?? null;
    entity.characteristics.suiteBedrooms = dto.infoSuiteBedrooms ?? null;
    entity.characteristics.bathrooms = dto.infoBathrooms ?? null;
    entity.characteristics.lift = dto.infoLift ?? null;
    entity.characteristics.hasPool = dto.infoHasPool ?? null;
    entity.characteristics.hasBalcony = dto.infoHasBalcony ?? null;
    entity.characteristics.hasFancyBalcony = dto.infoHasFancyBalcony ?? null;
    entity.characteristics.furniture = dto.infoFurniture ?? null;
    entity.characteristics.parkingSpaceUnits =
      dto.infoParkingSpaceUnits ?? null;
    entity.characteristics.hasDedicatedParkingSpace =
      dto.infoHasDedicatedParkingSpace ?? null;
    entity.characteristics.squareMeters = dto.infoSquareMeters ?? null;
    entity.characteristics.propertyTax = dto.infoPropertyTax ?? null;
    entity.characteristics.maintenanceFee = dto.infoMaintenanceFee ?? null;
    entity.characteristics.floor = dto.infoFloor ?? null;
    entity.characteristics.beachProximityInKm =
      dto.infoBeachProximityInKm ?? null;
    entity.characteristics.conciergeService = dto.infoConciergeService ?? null;
    entity.characteristics.hasAirConditioningSystem =
      dto.infoHasAirConditioningSystem ?? null;
    entity.characteristics.hasGasWaterHeatingSystem =
      dto.infoHasGasWaterHeatingSystem ?? null;
    entity.characteristics.hasGasSystem = dto.infoHasGasSystem ?? null;
    entity.characteristics.hasGym = dto.infoHasGym ?? null;
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
      infoBedrooms: entity.characteristics.bedrooms,
      infoSuiteBedrooms: entity.characteristics.suiteBedrooms,
      infoBathrooms: entity.characteristics.bathrooms,
      infoLift: entity.characteristics.lift,
      infoHasPool: entity.characteristics.hasPool,
      infoHasBalcony: entity.characteristics.hasBalcony,
      infoHasFancyBalcony: entity.characteristics.hasFancyBalcony,
      infoFurniture: entity.characteristics.furniture,
      infoParkingSpaceUnits: entity.characteristics.parkingSpaceUnits,
      infoHasDedicatedParkingSpace:
        entity.characteristics.hasDedicatedParkingSpace,
      infoSquareMeters: entity.characteristics.squareMeters,
      infoPropertyTax: entity.characteristics.propertyTax,
      infoMaintenanceFee: entity.characteristics.maintenanceFee,
      infoFloor: entity.characteristics.floor,
      infoBeachProximityInKm: entity.characteristics.beachProximityInKm,
      infoConciergeService: entity.characteristics.conciergeService,
      infoHasAirConditioningSystem:
        entity.characteristics.hasAirConditioningSystem,
      infoHasGasWaterHeatingSystem:
        entity.characteristics.hasGasWaterHeatingSystem,
      infoHasGasSystem: entity.characteristics.hasGasSystem,
      infoHasGym: entity.characteristics.hasGym,
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
        infoBedrooms: entity.characteristics.bedrooms,
        infoBathrooms: entity.characteristics.bathrooms,
        infoSquareMeters: entity.characteristics.squareMeters,
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
