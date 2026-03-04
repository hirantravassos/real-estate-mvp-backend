import { User } from "../../users/entities/user.entity";

export class CreateWhatsappContactDto {
  user: User;
  whatsappId: string;
  name: string;
  phoneNumber: string | null | undefined;
}
