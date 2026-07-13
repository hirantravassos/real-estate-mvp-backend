import { ContactCreateDto } from "../dtos/contact-create.dto";
import {
  Contact,
  ContactAgent,
  ContactBuyer,
  ContactSeller,
} from "../entities/contact.entity";
import { PropertyCharacteristic } from "../../properties/entities/property-characteristic.entity";

export class ContactMapper {
  public static toEntity(dto: ContactCreateDto, contactId?: string): Contact {
    const entity = new Contact();

    entity.buyer = new ContactBuyer();
    entity.buyer.preferences = new PropertyCharacteristic();
    entity.agent = new ContactAgent();
    entity.seller = new ContactSeller();

    if (contactId) {
      entity.id = contactId;
    }

    entity.name = dto.name;
    entity.phone = dto.phone;
    entity.email = dto.email ?? null;

    if (dto.isBuyer) {
      entity.buyer.minBudget = dto?.buyer?.minBudget;
      entity.buyer.maxBudget = dto?.buyer?.maxBudget;
      entity.buyer.preferences.bedrooms = dto?.buyer?.bedrooms;
      entity.buyer.preferences.suiteBedrooms = dto?.buyer?.suiteBedrooms;
      entity.buyer.preferences.bathrooms = dto?.buyer?.bathrooms;
      entity.buyer.preferences.lift = dto?.buyer?.lift;
      entity.buyer.preferences.hasPool = dto?.buyer?.hasPool;
      entity.buyer.preferences.hasBalcony = dto?.buyer?.hasBalcony;
      entity.buyer.preferences.hasFancyBalcony = dto?.buyer?.hasFancyBalcony;
      entity.buyer.preferences.furniture = dto?.buyer?.furniture;
      entity.buyer.preferences.parkingSpaceUnits =
        dto?.buyer?.parkingSpaceUnits;
      entity.buyer.preferences.hasDedicatedParkingSpace =
        dto?.buyer?.hasDedicatedParkingSpace;
      entity.buyer.preferences.squareMeters = dto?.buyer?.squareMeters;
      entity.buyer.preferences.propertyTax = dto?.buyer?.propertyTax;
      entity.buyer.preferences.maintenanceFee = dto?.buyer?.maintenanceFee;
      entity.buyer.preferences.floor = dto?.buyer?.floor;
      entity.buyer.preferences.beachProximityInKm =
        dto?.buyer?.beachProximityInKm;
      entity.buyer.preferences.conciergeService = dto?.buyer?.conciergeService;
      entity.buyer.preferences.hasAirConditioningSystem =
        dto?.buyer?.hasAirConditioningSystem;
      entity.buyer.preferences.hasGasWaterHeatingSystem =
        dto?.buyer?.hasGasWaterHeatingSystem;
      entity.buyer.preferences.hasGasSystem = dto?.buyer?.hasGasSystem;
      entity.buyer.preferences.hasGym = dto?.buyer?.hasGym;
    }

    return entity;
  }
}
