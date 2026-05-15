import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";
import { WhatsappAccount } from "./entities/whatsapp-account.entity";
import { WhatsappContact } from "./entities/whatsapp-contact.entity";
import { WhatsappChat } from "./entities/whatsapp-chat.entity";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";
import { WhatsappAccountRepository } from "./repositories/whatsapp-account.repository";
import { WhatsappContactRepository } from "./repositories/whatsapp-contact.repository";
import { WhatsappChatRepository } from "./repositories/whatsapp-chat.repository";
import { WhatsappMessageRepository } from "./repositories/whatsapp-message.repository";
import { WhatsappApiService } from "./services/whatsapp-api.service";
import { WhatsappAccountService } from "./services/whatsapp-account.service";
import { WhatsappChatService } from "./services/whatsapp-chat.service";
import { WhatsappMessageProcessor } from "./processors/whatsapp-message.processor";
import { WhatsappController } from "./controllers/whatsapp.controller";
import { WhatsappWebhookController } from "./controllers/whatsapp-webhook.controller";
import { WHATSAPP_INBOUND_QUEUE } from "./whatsapp.constants";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      WhatsappAccount,
      WhatsappContact,
      WhatsappChat,
      WhatsappMessage,
    ]),
    BullModule.registerQueue({ name: WHATSAPP_INBOUND_QUEUE }),
  ],
  controllers: [WhatsappController, WhatsappWebhookController],
  providers: [
    WhatsappApiService,
    WhatsappAccountService,
    WhatsappChatService,
    WhatsappMessageProcessor,
    WhatsappAccountRepository,
    WhatsappContactRepository,
    WhatsappChatRepository,
    WhatsappMessageRepository,
  ],
  exports: [WhatsappAccountService, WhatsappChatService],
})
export class WhatsappModule {}
