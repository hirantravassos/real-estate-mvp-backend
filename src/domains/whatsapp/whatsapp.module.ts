import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappSession } from "./entities/whatsapp-session.entity";
import { WhatsappSessionRepository } from "./repositories/whatsapp-session.repository";
import { WhatsappService } from "./services/whatsapp.service";
import { WhatsappController } from "./controllers/whatsapp.controller";
import { WhatsappSocketService } from "./services/whatsapp-socket.service";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappChatRepository } from "./repositories/whatsapp-chat.repository";

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappSession, WhatsappChat])],
  controllers: [WhatsappController],
  providers: [
    WhatsappSessionRepository,
    WhatsappChatRepository,
    WhatsappService,
    WhatsappSocketService,
  ],
  exports: [WhatsappService, WhatsappSocketService, WhatsappChatRepository],
})
export class WhatsappModule {}
