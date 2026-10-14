import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { randomUUID } from "crypto";
import * as path from "path";
import { appConfig } from "../../../config/app.config";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import {
  PropertyMedia,
  PropertyMediaType,
} from "../../properties/entities/property-media.entity";
import { PropertyMediaService } from "../../properties/services/property-media.service";
import { PropertyService } from "../../properties/services/property.service";
import { User } from "../../users/entities/user.entity";
import { PresentationPreviewDto, PresentationSendDto } from "../dtos/inbox.dto";
import { Conversation } from "../entities/conversation.entity";
import { MessageStatus } from "../enums/inbox.enum";
import { formatPropertyPitch } from "../helpers/property-pitch.helper";
import { ConversationService } from "./conversation.service";
import { InboxAiService } from "./inbox-ai.service";
import { MessageService } from "./message.service";
import { WhatsappConnectionService } from "./whatsapp-connection.service";
import { isFromPortal } from "../../properties/helpers/customer-safe.helper";

/** Above this, or when not mp4, a video goes as a file so WhatsApp accepts it. */
const MAXIMUM_WHATSAPP_VIDEO_BYTES = 64 * 1024 * 1024;
const MAXIMUM_WHATSAPP_IMAGE_BYTES = 16 * 1024 * 1024;

/**
 * Sends a property as one combo: the pitch with the public link, then the
 * chosen photos and videos, all grouped under the same presentation id.
 */
@Injectable()
export class PropertyPresentationSenderService {
  private readonly logger = new Logger(PropertyPresentationSenderService.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly applicationConfiguration: ConfigType<typeof appConfig>,
    private readonly conversationService: ConversationService,
    private readonly connectionService: WhatsappConnectionService,
    private readonly messageService: MessageService,
    private readonly inboxAiService: InboxAiService,
    private readonly propertyService: PropertyService,
    private readonly propertyMediaService: PropertyMediaService,
    private readonly storageService: StorageService,
  ) {}

  async preview(
    user: User,
    conversationId: string,
    dto: PresentationPreviewDto,
  ) {
    const conversation = await this.conversationService.findEntity(
      user.id,
      conversationId,
    );
    const property = await this.propertyService.findOne(user, dto.propertyId);
    const link = this.linkOf(property);

    const media = await this.propertyMediaService.findForMessaging(
      user.id,
      property.id,
    );
    const mediaPreview = await Promise.all(
      media.map(async (item) => ({
        id: item.id,
        type: item.type,
        displayName: item.displayName,
        sizeBytes: Number(item.sizeBytes),
        isCover: item.isCover,
        sendsAsFile: this.sendsAsFile(item),
        url: await this.storageService.getPresignedUrl(item.s3Key),
      })),
    );

    if (dto.useAi) {
      const generated = await this.inboxAiService.presentationText(
        user,
        conversation,
        property,
        link,
        dto.instruction,
      );
      return { ...generated, link, media: mediaPreview, aiGenerated: true };
    }

    return {
      text: formatPropertyPitch(property, this.firstNameOf(conversation), link),
      creditsCharged: 0,
      balance: null,
      link,
      media: mediaPreview,
      aiGenerated: false,
    };
  }

  async send(user: User, conversationId: string, dto: PresentationSendDto) {
    const conversation = await this.conversationService.findEntity(
      user.id,
      conversationId,
    );
    await this.connectionService.requireConnected(user.id);
    const property = await this.propertyService.findOne(user, dto.propertyId);

    const available = await this.propertyMediaService.findForMessaging(
      user.id,
      property.id,
    );
    const byId = new Map(available.map((item) => [item.id, item]));
    const chosen = dto.mediaIds
      .map((id) => byId.get(id))
      .filter((item): item is PropertyMedia => Boolean(item));

    const presentationId = randomUUID();
    void this.deliver(conversation, property.id, presentationId, dto, chosen);

    return { presentationId, total: chosen.length + 1 };
  }

  private async deliver(
    conversation: Conversation,
    propertyId: string,
    presentationId: string,
    dto: PresentationSendDto,
    media: PropertyMedia[],
  ) {
    try {
      const pitch = await this.messageService.sendTextTo(
        conversation,
        dto.text,
        { aiGenerated: dto.aiGenerated, presentationId, propertyId },
      );
      // Photos without the pitch make no sense, and a refused pitch usually
      // means a safety limit that would refuse the photos too.
      if (pitch.status === MessageStatus.FAILED) {
        this.logger.warn(
          `Presentation ${presentationId} stopped, the pitch was not sent`,
        );
        return;
      }

      const ordered = [
        ...media.filter((item) => item.type === PropertyMediaType.IMAGE),
        ...media.filter((item) => item.type === PropertyMediaType.VIDEO),
      ];

      for (const item of ordered) {
        await this.messageService.sendMediaTo(
          conversation,
          {
            s3Key: item.s3Key,
            mimeType: item.mimeType,
            fileName: this.fileNameOf(item),
            sizeBytes: Number(item.sizeBytes),
            forceDocument: this.sendsAsFile(item),
          },
          { presentationId, propertyId },
        );
      }
    } catch (error) {
      this.logger.error(
        `Presentation ${presentationId} stopped: ${String(error)}`,
      );
    }
  }

  private sendsAsFile(item: PropertyMedia) {
    if (item.type === PropertyMediaType.IMAGE) {
      return Number(item.sizeBytes) > MAXIMUM_WHATSAPP_IMAGE_BYTES;
    }
    return (
      item.type === PropertyMediaType.VIDEO &&
      (Number(item.sizeBytes) > MAXIMUM_WHATSAPP_VIDEO_BYTES ||
        item.mimeType !== "video/mp4")
    );
  }

  private fileNameOf(item: PropertyMedia) {
    const extension = path.extname(item.s3Key);
    return item.displayName.toLowerCase().endsWith(extension)
      ? item.displayName
      : `${item.displayName}${extension}`;
  }

  /** A property found on a portal has no public page, so no link. */
  private linkOf(property: { id: string; sourcePortal?: string | null }) {
    if (isFromPortal(property)) return null;
    return `${this.applicationConfiguration.frontendUrl}/p/${property.id}`;
  }

  private firstNameOf(conversation: Conversation) {
    const name = conversation.customer?.name ?? conversation.contactName;
    return name?.trim().split(/\s+/)[0] ?? null;
  }
}
