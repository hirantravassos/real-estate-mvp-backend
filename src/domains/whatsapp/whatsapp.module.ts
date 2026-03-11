import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappHostController } from "./controllers/whatsapp-host.controller";
import { WhatsappHostService } from "./services/whatsapp-host.service";
import { User } from "../users/entities/user.entity";
import { WhatsappChatsService } from "./services/whatsapp-chats.service";
import { WhatsappChatController } from "./controllers/whatsapp-chat.controller";
import { Customer } from "../customers/entities/customer.entity";
import { WhatsappContactController } from "./controllers/whatsapp-contact.controller";
import { WhatsappContactService } from "./services/whatsapp-contact.service";

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappChat, User, Customer])],
  controllers: [
    WhatsappHostController,
    WhatsappChatController,
    WhatsappContactController,
  ],
  providers: [
    WhatsappHostService,
    WhatsappChatsService,
    WhatsappContactService,
  ],
  exports: [WhatsappHostService, WhatsappChatsService, WhatsappContactService],
})
export class WhatsappModule {}
