import { User } from "../../users/entities/user.entity";
import { WhatsappMessageTypeEnum } from "../enums/whatsapp-message-type.enum";

export interface CreateWhatsappMessageDto {
  user: User;
  messageId: string;
  whatsappId: string;
  sentAt: string;
  content: string;
  type: WhatsappMessageTypeEnum;
  me: boolean;
}
