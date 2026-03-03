import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappSession } from "./entities/whatsapp-session.entity";
import { WhatsappContact } from "./entities/whatsapp-contact.entity";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";
import { WhatsappSessionRepository } from "./repositories/whatsapp-session.repository";
import { WhatsappContactRepository } from "./repositories/whatsapp-contact.repository";
import { WhatsappChatRepository } from "./repositories/whatsapp-chat.repository";
import { WhatsappMessageRepository } from "./repositories/whatsapp-message.repository";
import { WhatsappService } from "./services/whatsapp.service";
import { WhatsappController } from "./controllers/whatsapp.controller";
import { WhatsappSocketService } from "./services/whatsapp-socket.service";

@Module({
  imports: [TypeOrmModule.forFeature([
    WhatsappSession,
    WhatsappContact,
    WhatsappChat,
    WhatsappMessage
  ])],
  controllers: [WhatsappController],
  providers: [
    WhatsappSessionRepository,
    WhatsappContactRepository,
    WhatsappChatRepository,
    WhatsappMessageRepository,
    WhatsappService,
    WhatsappSocketService,
  ],
  exports: [WhatsappService, WhatsappSocketService],
})
export class WhatsappModule { }
