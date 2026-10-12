import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EvolutionHistoryChat,
  EvolutionMessage,
} from "../../../infrastructure/evolution/types/evolution.type";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { WhatsappConnection } from "../entities/whatsapp-connection.entity";
import { isPersonalJid } from "../helpers/whatsapp-phone.helper";
import { InboxMapper } from "../mappers/inbox.mapper";

/** Without any chunk this long after pairing, the phone had nothing to hand over. */
const FIRST_CHUNK_TIMEOUT_MILLISECONDS = 2 * 60 * 1000;

/** Without a new chunk this long, the phone finished even if it never said 100%. */
const IDLE_TIMEOUT_MILLISECONDS = 3 * 60 * 1000;

export type HistorySyncStatus = "syncing" | "done";

export interface HistorySyncSnapshot {
  status: HistorySyncStatus;
  /** From 0 to 100, as reported by WhatsApp. */
  progress: number;
  chats: number;
  messages: number;
  startedAt: Date;
  updatedAt: Date;
}

interface HistorySyncState extends HistorySyncSnapshot {
  timer: NodeJS.Timeout | null;
}

/**
 * Follows the history WhatsApp hands over right after pairing, so the broker
 * sees it loading instead of guessing whether the connection worked. Kept in
 * memory: it only matters for the minutes the sync takes.
 */
@Injectable()
export class WhatsappHistorySyncService implements OnModuleDestroy {
  private readonly states = new Map<string, HistorySyncState>();
  /** Connections that asked for a QR or pairing code and have not opened yet. */
  private readonly awaitingPairing = new Set<string>();

  constructor(
    @InjectRepository(WhatsappConnection)
    private readonly connectionRepository: Repository<WhatsappConnection>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  onModuleDestroy() {
    for (const state of this.states.values()) {
      if (state.timer) clearTimeout(state.timer);
    }
  }

  snapshot(connectionId: string): HistorySyncSnapshot | null {
    const state = this.states.get(connectionId);
    if (!state) return null;
    return {
      status: state.status,
      progress: state.progress,
      chats: state.chats,
      messages: state.messages,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
    };
  }

  /** A new QR or pairing code was handed out, history comes once it is used. */
  expectPairing(connectionId: string) {
    this.clear(connectionId);
    this.awaitingPairing.add(connectionId);
  }

  /** The socket opened. Only a fresh pairing brings history, a reconnect does not. */
  handleOpened(connectionId: string) {
    if (!this.awaitingPairing.delete(connectionId)) return;
    this.begin(connectionId);
  }

  clear(connectionId: string) {
    this.awaitingPairing.delete(connectionId);
    const state = this.states.get(connectionId);
    if (state?.timer) clearTimeout(state.timer);
    this.states.delete(connectionId);
  }

  async handleChats(
    connection: WhatsappConnection,
    chats: EvolutionHistoryChat[],
  ) {
    const state = this.begin(connection.id);
    state.chats += chats.filter((chat) => isPersonalJid(chat.remoteJid)).length;
    this.touch(connection.id, state);
    await this.publish(connection.id);
  }

  async handleMessages(
    connection: WhatsappConnection,
    messages: EvolutionMessage[],
    progress: number | null,
  ) {
    const state = this.begin(connection.id);
    state.messages += messages.filter((message) =>
      isPersonalJid(message.key?.remoteJid),
    ).length;

    if (progress !== null) {
      // A new phase after a finished one (recent chats, then the full history) starts over.
      if (state.status === "done" && progress < 100) {
        state.status = "syncing";
        state.progress = progress;
      } else {
        state.progress = Math.max(state.progress, progress);
      }
      if (state.progress >= 100) state.status = "done";
    }

    this.touch(connection.id, state);
    await this.publish(connection.id);
  }

  private begin(connectionId: string) {
    const existing = this.states.get(connectionId);
    if (existing) return existing;

    const now = new Date();
    const state: HistorySyncState = {
      status: "syncing",
      progress: 0,
      chats: 0,
      messages: 0,
      startedAt: now,
      updatedAt: now,
      timer: null,
    };
    this.states.set(connectionId, state);
    this.scheduleFinish(connectionId, state, FIRST_CHUNK_TIMEOUT_MILLISECONDS);
    return state;
  }

  private touch(connectionId: string, state: HistorySyncState) {
    state.updatedAt = new Date();
    if (state.status === "done") {
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
      return;
    }
    this.scheduleFinish(connectionId, state, IDLE_TIMEOUT_MILLISECONDS);
  }

  private scheduleFinish(
    connectionId: string,
    state: HistorySyncState,
    delayMilliseconds: number,
  ) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = null;
      if (this.states.get(connectionId) !== state) return;
      state.status = "done";
      state.progress = 100;
      state.updatedAt = new Date();
      void this.publish(connectionId).catch(() => undefined);
    }, delayMilliseconds);
    state.timer.unref();
  }

  /** Reads the connection again, the webhook's copy may predate the "open" update. */
  private async publish(connectionId: string) {
    const connection = await this.connectionRepository.findOneBy({
      id: connectionId,
    });
    if (!connection) return;
    this.realtimeGateway.emitToUser(
      connection.userId,
      "connection.updated",
      InboxMapper.toConnectionDto(
        connection,
        true,
        this.snapshot(connection.id),
      ),
    );
  }
}
