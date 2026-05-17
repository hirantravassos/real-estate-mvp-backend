import { PropertyContactDto } from "./property-contact.dto";

export interface PropertyListDto {
  id: string;
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