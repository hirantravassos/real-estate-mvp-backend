import { Contact } from "../../contacts/entities/contact.entity";

export interface PropertyListDto {
  id: string;
  alias: string | null;
  address: string;
  address2: string;
  price: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareMeters: number | null;
  createdAt: Date;
  owner: Contact | null;
}
