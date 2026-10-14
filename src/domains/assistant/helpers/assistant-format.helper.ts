import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { previewOf } from "../../inbox/helpers/evolution-message.parser";
import { Message } from "../../inbox/entities/message.entity";
import { MessageDirection, MessageType } from "../../inbox/enums/inbox.enum";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const inTimezone = (date: Date | string, zone: string) =>
  dayjs(date).tz(zone).locale("pt-br");

/** "terça, 14/10/2026 às 15:30", how a broker reads a date. */
export const formatWhen = (date: Date | string, zone: string) =>
  inTimezone(date, zone).format("dddd, DD/MM/YYYY [às] HH:mm");

export const formatDay = (date: Date | string, zone: string) =>
  inTimezone(date, zone).format("DD/MM/YYYY");

export const shorten = (text: string | null | undefined, maximum: number) => {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > maximum ? `${clean.substring(0, maximum - 1)}…` : clean;
};

/** Message kinds whose file can be kept in a record. */
export const FILE_MESSAGE_TYPES = new Set<MessageType>([
  MessageType.IMAGE,
  MessageType.VIDEO,
  MessageType.DOCUMENT,
]);

/** The file name and the id the tools use to keep the file somewhere. */
const fileNoteOf = (message: Message) => {
  if (!FILE_MESSAGE_TYPES.has(message.type)) return "";
  const name = message.fileName?.trim();
  return ` [arquivo${name ? ` "${name}"` : ""}, messageId ${message.id}]`;
};

/** The chat as plain lines, oldest first, for the model to read. */
export const transcriptOf = (messages: Message[], zone: string) =>
  [...messages]
    .sort((first, second) => first.sentAt.getTime() - second.sentAt.getTime())
    .map((message) => {
      const author =
        message.direction === MessageDirection.INBOUND ? "Cliente" : "Corretor";
      const when = inTimezone(message.sentAt, zone).format("DD/MM HH:mm");
      return `[${when}] ${author}: ${previewOf(message.type, message.body)}${fileNoteOf(message)}`;
    });
