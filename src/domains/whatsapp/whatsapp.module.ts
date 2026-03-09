import { forwardRef, Inject, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappSession } from "./entities/whatsapp-session.entity";
import { WhatsappSessionRepository } from "./repositories/whatsapp-session.repository";
import { WhatsappService } from "./services/whatsapp.service";
import { WhatsappSocketService } from "./services/whatsapp-socket.service";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappChatRepository } from "./repositories/whatsapp-chat.repository";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";
import { WhatsappMessageRepository } from "./repositories/whatsapp-message.repository";
import { WhatsappMessageService } from "./services/whatsapp-message.service";
import { WhatsappChatService } from "./services/whatsapp-chat.service";
import { WhatsappEventProcessorService } from "./services/whatsapp-event-processor.service";
import { WhatsappMediaService } from "./services/whatsapp-media.service";
import { CustomerModule } from "../customers/customer.module";
import { AuthModule } from "../auth/auth.module";
import { WhatsappGateway } from "./gateways/whatsapp.gateway";
import { WhatsappController } from "./controllers/whatsapp.controller";
import { WhatsappChatController } from "./controllers/whatsapp-chat.controller";
import { WhatsappSessionService } from "./services/whatsapp-session.service";
import { NotificationService } from "./services/notification.service";
import { NotificationController } from "./controllers/notification.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappSession, WhatsappChat, WhatsappMessage]),
    CustomerModule,
    AuthModule,
  ],
  controllers: [WhatsappController, WhatsappChatController, NotificationController],
  providers: [
    WhatsappSessionRepository,
    WhatsappChatRepository,
    WhatsappMessageRepository,
    WhatsappService,
    WhatsappSocketService,
    WhatsappEventProcessorService,
    WhatsappMediaService,
    WhatsappMessageService,
    WhatsappChatService,
    WhatsappSessionService,
    WhatsappGateway,
    NotificationService,
  ],
  exports: [
    WhatsappService,
    WhatsappSocketService,
    WhatsappChatRepository,
    WhatsappMessageRepository,
    WhatsappMediaService,
    WhatsappMessageService,
    WhatsappChatService,
    WhatsappSessionService,
    WhatsappGateway,
  ],
})
export class WhatsappModule { }
