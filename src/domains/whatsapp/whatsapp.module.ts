import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappSession } from "./entities/whatsapp-session.entity";
import { WhatsappSessionRepository } from "./repositories/whatsapp-session.repository";
import { WhatsappService } from "./services/whatsapp.service";
import { WhatsappController } from "./controllers/whatsapp.controller";
import { WhatsappSocketService } from "./services/whatsapp-socket.service";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappChatRepository } from "./repositories/whatsapp-chat.repository";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";
import { WhatsappMessageRepository } from "./repositories/whatsapp-message.repository";
import { WhatsappMessageService } from "./services/whatsapp-message.service";
import { WhatsappChatService } from "./services/whatsapp-chat.service";
import { WhatsappContactService } from "./services/whatsapp-contact.service";
import { WhatsappContactRepository } from "./repositories/whatsapp-contact.repository";
import { WhatsappContact } from "./entities/whatsapp-contact.entity";
import { WhatsappEventProcessorService } from "./services/whatsapp-event-processor.service";
import { WhatsappMediaService } from "./services/whatsapp-media.service";
import { CustomerModule } from "../customers/customer.module";
import { AuthModule } from "../auth/auth.module";
import { WhatsappGateway } from "./gateways/whatsapp.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappSession,
      WhatsappChat,
      WhatsappMessage,
      WhatsappContact,
    ]),
    CustomerModule,
    AuthModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappSessionRepository,
    WhatsappChatRepository,
    WhatsappMessageRepository,
    WhatsappContactRepository,
    WhatsappService,
    WhatsappSocketService,
    WhatsappEventProcessorService,
    WhatsappMediaService,
    WhatsappMessageService,
    WhatsappChatService,
    WhatsappContactService,
    WhatsappGateway,
  ],
  exports: [
    WhatsappService,
    WhatsappSocketService,
    WhatsappChatRepository,
    WhatsappMessageRepository,
    WhatsappContactRepository,
    WhatsappMediaService,
    WhatsappMessageService,
    WhatsappChatService,
    WhatsappContactService,
  ],
})
export class WhatsappModule {}
