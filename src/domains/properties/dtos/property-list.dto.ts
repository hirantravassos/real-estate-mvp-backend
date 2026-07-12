import { Contact } from "../../contacts/entities/contact.entity";

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
  owner: Contact | null;
}
