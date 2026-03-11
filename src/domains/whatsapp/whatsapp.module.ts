import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";
import { WhatsappHostController } from "./controllers/whatsapp-host.controller";
import { WhatsappHostService } from "./services/whatsapp-host.service";
import { User } from "../users/entities/user.entity";
import { WhatsappChatsService } from "./services/whatsapp-chats.service";
import { WhatsappChatController } from "./controllers/whatsapp-chat.controller";
import { Customer } from "../customers/entities/customer.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappChat, WhatsappMessage, User, Customer]),
  ],
  controllers: [WhatsappHostController, WhatsappChatController],
  providers: [WhatsappHostService, WhatsappChatsService],
  exports: [WhatsappHostService, WhatsappChatsService],
})
export class WhatsappModule {}
