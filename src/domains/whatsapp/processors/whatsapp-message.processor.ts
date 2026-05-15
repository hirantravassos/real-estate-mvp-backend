import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  InboundMessagePayload,
  WhatsappChatService,
} from "../services/whatsapp-chat.service";
import {
  PROCESS_INBOUND_MESSAGE,
  WHATSAPP_INBOUND_QUEUE,
} from "../whatsapp.constants";

@Processor(WHATSAPP_INBOUND_QUEUE)
export class WhatsappMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  constructor(private readonly chatService: WhatsappChatService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === PROCESS_INBOUND_MESSAGE) {
      const payload = job.data as InboundMessagePayload;
      this.logger.log(`Processing inbound message job: ${job.id}`);
      await this.chatService.processInboundMessage(payload);
    }
  }
}
