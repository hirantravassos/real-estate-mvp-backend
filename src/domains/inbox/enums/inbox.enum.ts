export enum WhatsappConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
}

export enum MessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  VOICE = "voice",
  DOCUMENT = "document",
  STICKER = "sticker",
  LOCATION = "location",
  CONTACT = "contact",
  UNSUPPORTED = "unsupported",
}

export enum MessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  PLAYED = "played",
  RECEIVED = "received",
  FAILED = "failed",
}

export enum MessageMediaStatus {
  NONE = "none",
  DOWNLOADING = "downloading",
  READY = "ready",
  FAILED = "failed",
}

export const MEDIA_MESSAGE_TYPES = new Set<MessageType>([
  MessageType.IMAGE,
  MessageType.VIDEO,
  MessageType.AUDIO,
  MessageType.VOICE,
  MessageType.DOCUMENT,
  MessageType.STICKER,
]);
