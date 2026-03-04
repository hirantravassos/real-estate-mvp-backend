import { User } from "../../users/entities/user.entity";

export interface CreateWhatsappMessageDto {
  user: User;
  messageId: string;
  whatsappId: string;
  sentAt: string;
  content: string;
  type: string;
  me: boolean;
}
