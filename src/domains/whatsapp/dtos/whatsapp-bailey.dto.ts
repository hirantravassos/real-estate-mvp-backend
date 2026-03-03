import {
  Chat,
  Contact,
  MessageUpsertType,
  proto,
  WAMessage,
} from "@whiskeysockets/baileys";

export interface WhatsappBaileyMessageHistorySetDto {
  chats: Chat[];
  contacts: Contact[];
  messages: WAMessage[];
  isLatest?: boolean;
  progress?: number | null;
  syncType?: proto.HistorySync.HistorySyncType | null;
  peerDataRequestSessionId?: string | null;
}

export interface WhatsappBaileyMessageUpsert {
  messages: WAMessage[];
  type: MessageUpsertType;
  requestId?: string;
}
