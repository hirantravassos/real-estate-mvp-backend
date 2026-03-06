import { Injectable } from "@nestjs/common";
import { downloadMediaMessage, WAMessage } from "@whiskeysockets/baileys";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { User } from "../../users/entities/user.entity";
import { WhatsappMessageRepository } from "../repositories/whatsapp-message.repository";

const STORAGE_ROOT = join(process.cwd(), "storage");

interface MediaInfo {
  readonly mimetype: string;
  readonly extension: string;
}

const EXTENSION_BY_MIMETYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/3gpp": ".3gp",
  "audio/ogg; codecs=opus": ".ogg",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/zip": ".zip",
};

@Injectable()
export class WhatsappMediaService {
  constructor(private readonly messageRepository: WhatsappMessageRepository) {
    if (!existsSync(STORAGE_ROOT)) {
      mkdirSync(STORAGE_ROOT, { recursive: true });
    }
  }

  async downloadAndStore(user: User, rawMessage: WAMessage): Promise<void> {
    const mediaInfo = this.extractMediaInfo(rawMessage);
    if (!mediaInfo) return;

    const messageId = rawMessage.key?.id;
    const whatsappId = rawMessage.key?.remoteJid;
    if (!messageId || !whatsappId) return;

    try {
      const buffer = await downloadMediaMessage(rawMessage, "buffer", {});

      const userDirectory = join(STORAGE_ROOT, user.id);
      if (!existsSync(userDirectory)) {
        mkdirSync(userDirectory, { recursive: true });
      }

      const fileName = `${messageId}${mediaInfo.extension}`;
      const relativePath = `${user.id}/${fileName}`;
      const absolutePath = join(userDirectory, fileName);

      writeFileSync(absolutePath, buffer);

      await this.messageRepository.update(
        { messageId, whatsappId, userId: user.id },
        { mediaPath: relativePath, mimetype: mediaInfo.mimetype },
      );
    } catch (error) {
      console.warn(
        `Media download failed for message ${messageId}:\n`,
        (error as Error)?.message,
        `\n\nFailed Media Payload Report:\n${JSON.stringify({ rawMessage, mediaInfo }, null, 2)}`,
      );
    }
  }

  getAbsolutePath(relativePath: string): string {
    return join(STORAGE_ROOT, relativePath);
  }

  private extractMediaInfo(message: WAMessage): MediaInfo | null {
    const content = this.unwrapMessage(message.message);
    if (!content) return null;

    if (content.imageMessage) {
      const mimetype = content.imageMessage.mimetype ?? "image/jpeg";
      return { mimetype, extension: this.resolveExtension(mimetype, ".jpg") };
    }

    if (content.videoMessage) {
      const mimetype = content.videoMessage.mimetype ?? "video/mp4";
      return { mimetype, extension: this.resolveExtension(mimetype, ".mp4") };
    }

    if (content.ptvMessage) {
      const mimetype = content.ptvMessage.mimetype ?? "video/mp4";
      return { mimetype, extension: this.resolveExtension(mimetype, ".mp4") };
    }

    if (content.audioMessage) {
      const mimetype =
        content.audioMessage.mimetype ?? "audio/ogg; codecs=opus";
      return { mimetype, extension: this.resolveExtension(mimetype, ".ogg") };
    }

    if (content.documentMessage) {
      const mimetype =
        content.documentMessage.mimetype ?? "application/octet-stream";
      const originalFileName = content.documentMessage.fileName;
      const extension = originalFileName
        ? this.extractExtensionFromFileName(originalFileName)
        : this.resolveExtension(mimetype, ".bin");
      return { mimetype, extension };
    }

    if (content.stickerMessage) {
      const mimetype = content.stickerMessage.mimetype ?? "image/webp";
      return { mimetype, extension: this.resolveExtension(mimetype, ".webp") };
    }

    if (content.lottieStickerMessage) {
      const mimetype = "image/webp";
      return { mimetype, extension: this.resolveExtension(mimetype, ".webp") };
    }

    return null;
  }

  private unwrapMessage(
    message:
      | import("@whiskeysockets/baileys").proto.IMessage
      | null
      | undefined,
  ): import("@whiskeysockets/baileys").proto.IMessage | null {
    if (!message) return null;

    const wrapperCandidates = [
      message.viewOnceMessage,
      message.viewOnceMessageV2,
      message.viewOnceMessageV2Extension,
      message.ephemeralMessage,
      message.documentWithCaptionMessage,
      message.editedMessage,
    ];

    for (const wrapper of wrapperCandidates) {
      if (wrapper?.message) {
        return this.unwrapMessage(wrapper.message);
      }
    }

    return message;
  }

  private resolveExtension(mimetype: string, fallback: string): string {
    return EXTENSION_BY_MIMETYPE[mimetype] ?? fallback;
  }

  private extractExtensionFromFileName(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot === -1) return ".bin";
    return fileName.slice(lastDot);
  }
}
