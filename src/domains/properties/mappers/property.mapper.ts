import { Property } from "../entities/property.entity";
import { PropertyCreateDto } from "../services/property.service";
import { PropertyContact } from "../entities/property-contact.entity";
import { CustomerMapper } from "../../customers/mappers/customer.mapper";

export enum PropertyKindEnum {
  HOUSE = "house",
  APARTMENT = "apartment",
  COMMERCIAL = "commercial",
}

export enum PropertyLiftEnum {
  PRIVATE = "private",
  COMMON = "common",
  NONE = "none",
}

export enum PropertyFurnitureEnum {
  FULL = "full",
  HALF = "half",
  NONE = "none",
}

export enum PropertyConciergeServiceEnum {
  FULL = "full",
  HALF = "half",
  NONE = "none",
}

export interface PropertyContactDto {
  id: string;
  name: string | null;
  phone: string;
  customerId: string | null;
}

export interface PropertyDto {
  id: string;
  kind: PropertyKindEnum | null;
  alias: string | null;
  address: string;
  address2: string;
  comment: string | null;
  price: string;
  contacts: PropertyContactDto[];
  infoBedrooms: number | null;
  infoSuiteBedrooms: number | null;
  infoBathrooms: number | null;
  infoLift: PropertyLiftEnum | null;
  infoHasPool: boolean | null;
  infoHasBalcony: boolean | null;
  infoHasFancyBalcony: boolean | null;
  infoFurniture: PropertyFurnitureEnum | null;
  infoParkingSpaceUnits: number | null;
  infoHasDedicatedParkingSpace: boolean | null;
  infoSquareMeters: number | null;
  infoPropertyTax: string | null;
  infoMaintenanceFee: string | null;
  infoFloor: number | null;
  infoBeachProximityInKm: number | null;
  infoConciergeService: PropertyConciergeServiceEnum | null;
  infoHasAirConditioningSystem: boolean | null;
  infoHasGasWaterHeatingSystem: boolean | null;
  infoHasGasSystem: boolean | null;
  infoHasGym: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

export interface PropertyListDto {
  id: string;
  kind: PropertyKindEnum | null;
  alias: string | null;
  address: string;
  address2: string;
  price: string;
  infoBedrooms: number | null;
  infoBathrooms: number | null;
  infoSquareMeters: number | null;
  createdAt: Date;
  contacts: PropertyContactDto[];
}

export class PropertyMapper {
  static toEntity(dto: PropertyCreateDto, id?: string) {
    const entity = new Property();
    entity.kind = dto.kind ?? null;
    entity.alias = dto.alias ?? null;
    entity.address = dto.address;
    entity.address2 = dto.address2;
    entity.comment = dto.comment ?? null;
    entity.price = dto.price;

    entity.infoBedrooms = dto.infoBedrooms ?? null;
    entity.infoSuiteBedrooms = dto.infoSuiteBedrooms ?? null;
    entity.infoBathrooms = dto.infoBathrooms ?? null;
    entity.infoLift = dto.infoLift ?? null;
    entity.infoHasPool = dto.infoHasPool ?? null;
    entity.infoHasBalcony = dto.infoHasBalcony ?? null;
    entity.infoHasFancyBalcony = dto.infoHasFancyBalcony ?? null;
    entity.infoFurniture = dto.infoFurniture ?? null;
    entity.infoParkingSpaceUnits = dto.infoParkingSpaceUnits ?? null;
    entity.infoHasDedicatedParkingSpace =
      dto.infoHasDedicatedParkingSpace ?? null;
    entity.infoSquareMeters = dto.infoSquareMeters ?? null;
    entity.infoPropertyTax = dto.infoPropertyTax ?? null;
    entity.infoMaintenanceFee = dto.infoMaintenanceFee ?? null;
    entity.infoFloor = dto.infoFloor ?? null;
    entity.infoBeachProximityInKm = dto.infoBeachProximityInKm ?? null;
    entity.infoConciergeService = dto?.infoConciergeService ?? null;
    entity.infoHasAirConditioningSystem =
      dto.infoHasAirConditioningSystem ?? null;
    entity.infoHasGasWaterHeatingSystem =
      dto.infoHasGasWaterHeatingSystem ?? null;
    entity.infoHasGasSystem = dto.infoHasGasSystem ?? null;
    entity.infoHasGym = dto.infoHasGym ?? null;

    if (dto.contacts) {
      entity.contacts = dto.contacts.map((c) => {
        const contact = new PropertyContact();
        contact.phone = c.phone.replaceAll(/\D/g, "");
        contact.name = c.name ?? null;
        return contact;
      });
    }

    if (id) entity.id = id;
    return entity;
  }

  static toDto(entity: Property): PropertyDto {
    return {
      id: entity.id,
      kind: entity.kind ?? null,
      alias: entity.alias,
      address: entity.address,
      address2: entity.address2,
      comment: entity.comment,
      price: entity.price,
      infoBedrooms: entity.infoBedrooms,
      infoSuiteBedrooms: entity.infoSuiteBedrooms,
      infoBathrooms: entity.infoBathrooms,
      infoLift: entity.infoLift,
      infoHasPool: entity.infoHasPool,
      infoHasBalcony: entity.infoHasBalcony,
      infoHasFancyBalcony: entity.infoHasFancyBalcony,
      infoFurniture: entity.infoFurniture,
      infoParkingSpaceUnits: entity.infoParkingSpaceUnits,
      infoHasDedicatedParkingSpace: entity.infoHasDedicatedParkingSpace,
      infoSquareMeters: entity.infoSquareMeters,
      infoPropertyTax: entity.infoPropertyTax,
      infoMaintenanceFee: entity.infoMaintenanceFee,
      infoFloor: entity.infoFloor,
      infoBeachProximityInKm: entity.infoBeachProximityInKm,
      infoConciergeService: entity.infoConciergeService,
      infoHasAirConditioningSystem: entity.infoHasAirConditioningSystem,
      infoHasGasWaterHeatingSystem: entity.infoHasGasWaterHeatingSystem,
      infoHasGasSystem: entity.infoHasGasSystem,
      infoHasGym: entity.infoHasGym,
      contacts: [], // Must be ALWAYS empty!!!
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      active: entity.active,
    };
  }

  static toListDto(entities: Property[]): PropertyListDto[] {
    return entities.map((entity) => {
      return {
        id: entity.id,
        kind: entity.kind ?? null,
        alias: entity.alias,
        address: entity.address,
        address2: entity.address2,
        price: entity.price,
        infoBedrooms: entity.infoBedrooms,
        infoBathrooms: entity.infoBathrooms,
        infoSquareMeters: entity.infoSquareMeters,
        createdAt: entity.createdAt,
        contacts: this.toContacts(entity.contacts),
      };
    });
  }

  /** Owners with their contact, only for the broker who has the property. */
  static toOwners(contacts: PropertyContact[]) {
    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.customer?.name ?? contact.name,
      phone: contact.phone,
      customer: contact.customer
        ? {
            id: contact.customer.id,
            name: contact.customer.name,
            avatar: contact.customer.avatar ?? null,
            roles: CustomerMapper.toRoles(contact.customer),
          }
        : null,
    }));
  }

  private static toContacts(contacts: PropertyContact[] | undefined) {
    if (!contacts) return [];
    return contacts.map((contact) => {
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        customerId: contact.customerId ?? null,
      };
    });
  }
}
