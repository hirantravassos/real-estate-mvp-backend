import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappSession } from "./entities/whatsapp-session.entity";
import { WhatsappSessionRepository } from "./repositories/whatsapp-session.repository";
import { WhatsappService } from "./services/whatsapp.service";
import { WhatsappController } from "./controllers/whatsapp.controller";
import { WhatsappSocketService } from "./services/whatsapp-socket.service";

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappSession])],
  controllers: [WhatsappController],
  providers: [
    WhatsappSessionRepository,
    WhatsappService,
    WhatsappSocketService,
  ],
  exports: [WhatsappService, WhatsappSocketService],
})
export class WhatsappModule {}
