import { User } from "../../users/entities/user.entity";

export class CreateWhatsappChatDto {
  user: User;
  whatsappId: string;
  unread: boolean;
}
