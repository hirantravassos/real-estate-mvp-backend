import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappClientController } from "./controllers/whatsapp-client.controller";
import WhatsappClientService from "./services/whatsapp-client.service";
import { User } from "../users/entities/user.entity";
import { WhatsappChatService } from "./services/whatsapp-chat.service";
import { WhatsappChatController } from "./controllers/whatsapp-chat.controller";
import { Customer } from "../customers/entities/customer.entity";
import { WhatsappContactController } from "./controllers/whatsapp-contact.controller";
import { WhatsappContactService } from "./services/whatsapp-contact.service";
import { WhatsappStatus } from "./entities/whatsapp-status.entity";
import { WhatsappStatusController } from "./controllers/whatsapp-status.controller";
import { WhatsappStatusService } from "./services/whatsapp-status.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappStatus, WhatsappChat, User, Customer]),
  ],
  controllers: [
    WhatsappClientController,
    WhatsappStatusController,
    WhatsappChatController,
    WhatsappContactController,
  ],
  providers: [
    WhatsappClientService,
    WhatsappStatusService,
    WhatsappChatService,
    WhatsappContactService,
  ],
  exports: [
    WhatsappClientService,
    WhatsappStatusService,
    WhatsappChatService,
    WhatsappContactService,
  ],
})
export class WhatsappModule {}
