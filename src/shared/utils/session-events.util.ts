import { EventEmitter } from "events";

/**
 * Tells the realtime gateway that every session of a broker ended (logout
 * or deleted account), without the auth domain depending on it.
 */
export const sessionEvents = new EventEmitter();

export const SESSIONS_ENDED_EVENT = "sessions.ended";

export const announceSessionsEnded = (userId: string) => {
  sessionEvents.emit(SESSIONS_ENDED_EVENT, userId);
};
