import { Contact } from "../../contacts/entities/contact.entity";
import { PropertyCreateCharacteristics } from "./property-create-characteristics.dto";

export interface PropertyDto extends PropertyCreateCharacteristics {
  id: string;
  alias: string | null;
  address: string;
  address2: string;
  comment: string | null;
  price: string;
  owner: Contact | null;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}
