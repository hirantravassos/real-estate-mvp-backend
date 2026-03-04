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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsappSession,
      WhatsappChat,
      WhatsappMessage,
      WhatsappContact,
    ]),
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
    WhatsappMessageService,
    WhatsappChatService,
    WhatsappContactService,
  ],
  exports: [
    WhatsappService,
    WhatsappSocketService,
    WhatsappChatRepository,
    WhatsappMessageRepository,
    WhatsappContactRepository,
    WhatsappMessageService,
    WhatsappChatService,
    WhatsappContactService,
  ],
})
export class WhatsappModule { }
