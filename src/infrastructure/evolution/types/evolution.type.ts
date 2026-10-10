/** Shapes of the Evolution API v2 payloads this app reads. */

export type EvolutionConnectionState = "open" | "close" | "connecting";

export type EvolutionMessageStatus =
  | "ERROR"
  | "PENDING"
  | "SERVER_ACK"
  | "DELIVERY_ACK"
  | "READ"
  | "PLAYED"
  | "DELETED";

export interface EvolutionMessageKey {
  remoteJid: string;
  remoteJidAlt?: string;
  senderPn?: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

interface EvolutionMediaContent {
  caption?: string;
  mimetype?: string;
  fileName?: string;
  fileLength?: number | string | { low: number };
  seconds?: number;
  ptt?: boolean;
  jpegThumbnail?: string;
}

interface EvolutionContextInfo {
  stanzaId?: string;
  quotedMessage?: EvolutionMessageContent;
}

export interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text?: string; contextInfo?: EvolutionContextInfo };
  imageMessage?: EvolutionMediaContent & { contextInfo?: EvolutionContextInfo };
  videoMessage?: EvolutionMediaContent & { contextInfo?: EvolutionContextInfo };
  ptvMessage?: EvolutionMediaContent;
  audioMessage?: EvolutionMediaContent & { contextInfo?: EvolutionContextInfo };
  documentMessage?: EvolutionMediaContent & {
    contextInfo?: EvolutionContextInfo;
  };
  documentWithCaptionMessage?: {
    message?: { documentMessage?: EvolutionMediaContent };
  };
  stickerMessage?: EvolutionMediaContent;
  locationMessage?: {
    degreesLatitude?: number;
    degreesLongitude?: number;
    name?: string;
    address?: string;
  };
  contactMessage?: { displayName?: string; vcard?: string };
  reactionMessage?: { text?: string; key?: EvolutionMessageKey };
  [key: string]: unknown;
}

export interface EvolutionMessage {
  key: EvolutionMessageKey;
  pushName?: string;
  message?: EvolutionMessageContent;
  messageType?: string;
  messageTimestamp?: number | string;
  status?: EvolutionMessageStatus;
}

export interface EvolutionMessageUpdate {
  keyId?: string;
  messageId?: string;
  remoteJid?: string;
  fromMe?: boolean;
  status?: EvolutionMessageStatus;
}

export interface EvolutionConnectionUpdate {
  instance?: string;
  state?: EvolutionConnectionState;
  statusReason?: number;
  wuid?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export interface EvolutionQrCodeUpdate {
  qrcode?: {
    instance?: string;
    pairingCode?: string | null;
    code?: string;
    base64?: string;
  };
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: unknown;
  date_time?: string;
}

export interface EvolutionQrCode {
  pairingCode?: string | null;
  code?: string;
  base64?: string;
  count?: number;
}

export interface EvolutionInstanceInformation {
  name?: string;
  connectionStatus?: EvolutionConnectionState;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
}

export interface EvolutionMediaDownload {
  mediaType?: string;
  fileName?: string;
  mimetype?: string;
  base64: string;
}

export type EvolutionSendMediaType = "image" | "video" | "document" | "audio";

export type EvolutionPresence = "composing" | "recording" | "paused";
