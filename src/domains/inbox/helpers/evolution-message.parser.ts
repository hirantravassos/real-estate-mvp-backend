import {
  EvolutionMessage,
  EvolutionMessageContent,
} from "../../../infrastructure/evolution/types/evolution.type";
import { MessageType } from "../enums/inbox.enum";

export interface ParsedMessage {
  type: MessageType;
  body: string | null;
  mimeType: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  thumbnailBase64: string | null;
  location: { latitude: number; longitude: number; name?: string } | null;
  quotedExternalId: string | null;
}

const WRAPPER_KEYS = [
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "editedMessage",
];

/** Messages that carry no content for the inbox. */
const IGNORED_KEYS = [
  "protocolMessage",
  "reactionMessage",
  "senderKeyDistributionMessage",
  "pollUpdateMessage",
];

const unwrap = (content: EvolutionMessageContent): EvolutionMessageContent => {
  for (const key of WRAPPER_KEYS) {
    const wrapper = content[key] as
      | { message?: EvolutionMessageContent }
      | undefined;
    if (wrapper?.message) return unwrap(wrapper.message);
  }
  return content;
};

const readSize = (
  value: number | string | { low: number } | undefined,
): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return value.low ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** A MySQL text column holds 65535 bytes. */
const THUMBNAIL_MAXIMUM_LENGTH = 60_000;

/**
 * Webhooks send the thumbnail as base64, but messages read back from
 * Evolution's database may carry the raw bytes, as {"0": 255, ...} or a
 * serialized Buffer. Both become base64, anything else is dropped.
 */
const readThumbnail = (value: unknown): string | null => {
  let thumbnail: string | null = null;
  if (typeof value === "string") {
    thumbnail = value;
  } else if (value && typeof value === "object") {
    const data = (value as { data?: unknown }).data;
    const bytes: unknown[] = Array.isArray(data) ? data : Object.values(value);
    if (bytes.length && bytes.every((byte) => typeof byte === "number")) {
      thumbnail = Buffer.from(bytes).toString("base64");
    }
  }
  return thumbnail && thumbnail.length <= THUMBNAIL_MAXIMUM_LENGTH
    ? thumbnail
    : null;
};

const emptyParsed = (type: MessageType): ParsedMessage => ({
  type,
  body: null,
  mimeType: null,
  fileName: null,
  sizeBytes: null,
  durationSeconds: null,
  thumbnailBase64: null,
  location: null,
  quotedExternalId: null,
});

/** Reads an Evolution message into what the inbox stores, or null to skip it. */
export const parseEvolutionMessage = (
  message: EvolutionMessage,
): ParsedMessage | null => {
  if (!message.message) return null;
  const content = unwrap(message.message);

  if (IGNORED_KEYS.some((key) => content[key])) return null;

  if (content.conversation !== undefined || content.extendedTextMessage) {
    return {
      ...emptyParsed(MessageType.TEXT),
      body: content.conversation ?? content.extendedTextMessage?.text ?? "",
      quotedExternalId:
        content.extendedTextMessage?.contextInfo?.stanzaId ?? null,
    };
  }

  if (content.imageMessage) {
    const image = content.imageMessage;
    return {
      ...emptyParsed(MessageType.IMAGE),
      body: image.caption ?? null,
      mimeType: image.mimetype ?? "image/jpeg",
      sizeBytes: readSize(image.fileLength),
      thumbnailBase64: readThumbnail(image.jpegThumbnail),
      quotedExternalId: image.contextInfo?.stanzaId ?? null,
    };
  }

  const video = content.videoMessage ?? content.ptvMessage;
  if (video) {
    return {
      ...emptyParsed(MessageType.VIDEO),
      body: video.caption ?? null,
      mimeType: video.mimetype ?? "video/mp4",
      sizeBytes: readSize(video.fileLength),
      durationSeconds: video.seconds ?? null,
      thumbnailBase64: readThumbnail(video.jpegThumbnail),
    };
  }

  if (content.audioMessage) {
    const audio = content.audioMessage;
    return {
      ...emptyParsed(audio.ptt ? MessageType.VOICE : MessageType.AUDIO),
      mimeType: audio.mimetype ?? "audio/ogg",
      sizeBytes: readSize(audio.fileLength),
      durationSeconds: audio.seconds ?? null,
      quotedExternalId: audio.contextInfo?.stanzaId ?? null,
    };
  }

  if (content.documentMessage) {
    const document = content.documentMessage;
    return {
      ...emptyParsed(MessageType.DOCUMENT),
      body: document.caption ?? null,
      mimeType: document.mimetype ?? "application/octet-stream",
      fileName: document.fileName?.substring(0, 255) || "documento",
      sizeBytes: readSize(document.fileLength),
      quotedExternalId: document.contextInfo?.stanzaId ?? null,
    };
  }

  if (content.stickerMessage) {
    return {
      ...emptyParsed(MessageType.STICKER),
      mimeType: content.stickerMessage.mimetype ?? "image/webp",
    };
  }

  if (content.locationMessage) {
    const location = content.locationMessage;
    return {
      ...emptyParsed(MessageType.LOCATION),
      body: location.name ?? location.address ?? null,
      location: {
        latitude: location.degreesLatitude ?? 0,
        longitude: location.degreesLongitude ?? 0,
        name: location.name ?? location.address,
      },
    };
  }

  if (content.contactMessage) {
    return {
      ...emptyParsed(MessageType.CONTACT),
      body: content.contactMessage.displayName ?? "Contato",
    };
  }

  return {
    ...emptyParsed(MessageType.UNSUPPORTED),
    body: "Mensagem não suportada, abra no celular para ver.",
  };
};

const PREVIEW_BY_TYPE: Record<MessageType, string> = {
  [MessageType.TEXT]: "",
  [MessageType.IMAGE]: "📷 Foto",
  [MessageType.VIDEO]: "🎬 Vídeo",
  [MessageType.AUDIO]: "🎵 Áudio",
  [MessageType.VOICE]: "🎤 Mensagem de voz",
  [MessageType.DOCUMENT]: "📄 Documento",
  [MessageType.STICKER]: "💟 Figurinha",
  [MessageType.LOCATION]: "📍 Localização",
  [MessageType.CONTACT]: "👤 Contato",
  [MessageType.UNSUPPORTED]: "Mensagem",
};

export const previewOf = (type: MessageType, body: string | null) => {
  const text = body?.trim();
  if (type === MessageType.TEXT) return (text ?? "").substring(0, 250);
  return text
    ? `${PREVIEW_BY_TYPE[type]} · ${text}`.substring(0, 250)
    : PREVIEW_BY_TYPE[type];
};
