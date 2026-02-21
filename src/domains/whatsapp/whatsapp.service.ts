import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WhatsAppGateway } from './gateways/whatsapp.gateway';
import {
  WhatsAppStatus,
  WhatsAppSession,
} from './entities/whatsapp-session.entity';
import { SyncWhatsAppContactsUseCase } from '../customer/use-cases';
import * as fs from 'fs';
// Note: We will implement session persistence later, starting with in-memory/temp file for MVP stability

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private sockets = new Map<string, any>();
  private qrCodes = new Map<string, string>();
  private userChats = new Map<string, Map<string, any>>();
  private userContacts = new Map<string, Map<string, any>>();

  constructor(
    private readonly gateway: WhatsAppGateway,
    private readonly syncContacts: SyncWhatsAppContactsUseCase,
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepository: Repository<WhatsAppSession>,
  ) {}

  async onModuleInit() {
    this.logger.log('Loading active WhatsApp sessions from database...');
    const activeSessions = await this.sessionRepository.find({
      where: {
        status: In([
          WhatsAppStatus.CONNECTED,
          WhatsAppStatus.QR_READY,
          WhatsAppStatus.CONNECTING,
        ]),
      },
    });

    if (activeSessions.length > 0) {
      this.logger.log(
        `Found ${activeSessions.length} active sessions to reconnect`,
      );
      for (const session of activeSessions) {
        this.initializeSession(session.userId).catch((err) => {
          this.logger.error(
            `Failed to auto-resume session for user ${session.userId}`,
            err,
          );
        });
      }
    }
  }

  private async clearSessionData(userId: string) {
    const sessionDir = `sessions/${userId}`;
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        this.logger.log(`Cleared WhatsApp session data for user ${userId}`);
      } catch (err) {
        this.logger.error(
          `Failed to clear WhatsApp session data for user ${userId}`,
          err,
        );
      }
    }
  }

  async initializeSession(userId: string) {
    if (this.sockets.has(userId)) {
      const state = this.sockets.get(userId).state;
      if (state === 'open') return;
    }

    this.logger.log(`Initializing WhatsApp session for user: ${userId}`);

    let session = await this.sessionRepository.findOne({ where: { userId } });
    if (session) {
      session.status = WhatsAppStatus.CONNECTING;
      await this.sessionRepository.save(session);
    } else {
      session = this.sessionRepository.create({
        userId,
        status: WhatsAppStatus.CONNECTING,
      });
      await this.sessionRepository.save(session);
    }

    // For MVP, using local file storage for auth state to ensure stability with Baileys
    // In a production app, we would implement a custom DB state provider
    const { state, saveCreds } = await useMultiFileAuthState(
      `sessions/${userId}`,
    );
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      browser: ['Antigravity Real Estate', 'Chrome', '1.0.0'],
    });

    if (!this.userChats.has(userId)) this.userChats.set(userId, new Map());
    if (!this.userContacts.has(userId))
      this.userContacts.set(userId, new Map());

    this.sockets.set(userId, sock);

    sock.ev.on(
      'connection.update',
      async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          const qrBase64 = await QRCode.toDataURL(qr);
          this.qrCodes.set(userId, qrBase64);
          this.gateway.emitToUser(userId, 'whatsapp.qr', { qr: qrBase64 });
          this.logger.log(`QR Code generated for user: ${userId}`);

          await this.sessionRepository.update(
            { userId },
            {
              status: WhatsAppStatus.QR_READY,
              qrCode: qrBase64,
            },
          );
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
          this.logger.log(
            `Connection closed for user ${userId}. Reconnecting: ${shouldReconnect}`,
          );
          this.qrCodes.delete(userId);
          this.gateway.emitToUser(userId, 'whatsapp.status', {
            status: WhatsAppStatus.DISCONNECTED,
          });

          if (shouldReconnect) {
            await this.sessionRepository.update(
              { userId },
              { status: WhatsAppStatus.CONNECTING, qrCode: null },
            );
            this.initializeSession(userId);
          } else {
            await this.sessionRepository.update(
              { userId },
              { status: WhatsAppStatus.DISCONNECTED, qrCode: null },
            );
            this.sockets.delete(userId);
            await this.clearSessionData(userId);
          }
        } else if (connection === 'open') {
          this.logger.log(`WhatsApp connection opened for user: ${userId}`);
          this.qrCodes.delete(userId);
          this.gateway.emitToUser(userId, 'whatsapp.status', {
            status: WhatsAppStatus.CONNECTED,
          });

          await this.sessionRepository.update(
            { userId },
            { status: WhatsAppStatus.CONNECTED, qrCode: null },
          );
        }
      },
    );

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            this.logger.log(
              `New message from ${msg.key.remoteJid}: ${msg.message?.conversation}`,
            );
            this.gateway.emitToUser(userId, 'whatsapp.message', {
              from: msg.key.remoteJid,
              content:
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text,
              timestamp: msg.messageTimestamp,
            });

            // Attempt to sync this contact as a lead if it's a valid user
            if (
              msg.key.remoteJid &&
              msg.key.remoteJid.endsWith('@s.whatsapp.net')
            ) {
              // We might not have the name, but the use case handles fallback to phone number
              this.syncContacts
                .execute(userId, [
                  { jid: msg.key.remoteJid, name: msg.pushName || undefined },
                ])
                .catch((err) =>
                  this.logger.error(
                    `Failed to sync contact on new message for user ${userId}`,
                    err,
                  ),
                );
            }
          }
        }
      }
    });

    // Contacts and Chats event interceptors
    sock.ev.on('contacts.upsert', async (contacts) => {
      const map = this.userContacts.get(userId);
      if (map) {
        for (const c of contacts) {
          map.set(c.id, { ...(map.get(c.id) || {}), ...c });
        }
      }
    });

    sock.ev.on('contacts.update', async (updates) => {
      const map = this.userContacts.get(userId);
      if (map) {
        for (const u of updates) {
          if (u.id) map.set(u.id, { ...(map.get(u.id) || {}), ...u });
        }
      }
    });

    sock.ev.on('chats.upsert', async (chats) => {
      const map = this.userChats.get(userId);
      if (map) {
        for (const c of chats) {
          if (c.id) map.set(c.id, { ...(map.get(c.id) || {}), ...c });
        }
      }
    });

    sock.ev.on('chats.update', async (updates) => {
      const map = this.userChats.get(userId);
      if (map) {
        for (const u of updates) {
          if (u.id) map.set(u.id, { ...(map.get(u.id) || {}), ...u });
        }
      }
    });

    sock.ev.on(
      'messaging-history.set',
      async ({ chats, contacts, isLatest }) => {
        this.logger.log(
          `Received initial history sync for ${userId}. Chats: ${chats.length}, Contacts: ${contacts.length}`,
        );

        const chatMap = this.userChats.get(userId);
        if (chatMap) {
          for (const c of chats) {
            if (c.id) chatMap.set(c.id, c);
          }
        }

        const contactMap = this.userContacts.get(userId);
        if (contactMap) {
          for (const c of contacts) {
            if (c.id) contactMap.set(c.id, c);
          }
        }

        // ONLY sync chats. Chats represent active conversations!
        // Filter out system messages, status broadcasts, groups, and linked devices
        const validUserChats = chats.filter((c: any) => {
          if (!c.id) return false;
          // Standard personal and business accounts use @s.whatsapp.net
          return c.id.endsWith('@s.whatsapp.net');
        });

        const toSync = validUserChats.map((c: any) => {
          const cContact = contactMap?.get(c.id);
          const bestName = cContact
            ? cContact.name || cContact.notify || cContact.verifiedName
            : undefined;
          return {
            jid: c.id as string,
            name: c.name || bestName || undefined,
          };
        });

        if (toSync.length > 0) {
          this.logger.log(
            `Initial history sync completed for ${userId}. Discovered ${toSync.length} mappable contacts. Proceeding to wait for user to initialize manual sync.`,
          );
        }
      },
    );
  }

  async getStatus(userId: string) {
    const session = await this.sessionRepository.findOne({ where: { userId } });

    if (!session || session.status === WhatsAppStatus.DISCONNECTED) {
      return { status: WhatsAppStatus.DISCONNECTED };
    }

    return {
      status: session.status,
      qr: session.qrCode || this.qrCodes.get(userId) || undefined,
    };
  }

  async logout(userId: string) {
    this.logger.log(`Logging out WhatsApp session for user: ${userId}`);
    const sock = this.sockets.get(userId);
    if (sock) {
      try {
        await sock.logout();
      } catch (err) {
        this.logger.warn(
          `Failed to gracefully logout socket for user ${userId}`,
          err,
        );
      }
      this.sockets.delete(userId);
      this.qrCodes.delete(userId);
      this.userChats.delete(userId);
      this.userContacts.delete(userId);
    }
    await this.clearSessionData(userId);
    await this.sessionRepository.update(
      { userId },
      { status: WhatsAppStatus.DISCONNECTED, qrCode: null },
    );
    this.gateway.emitToUser(userId, 'whatsapp.status', {
      status: WhatsAppStatus.DISCONNECTED,
    });
  }

  async getConversations(userId: string) {
    const sock = this.sockets.get(userId);
    if (!sock) return [];

    // Baileys has internal store for chats
    // For now, we return a list of chats from the socket's internal state if available
    // or just an empty list if not yet synced.
    // Real implementation would use 'makeInMemoryStore'
    return [];
  }

  async getMessages(userId: string, chatJid: string) {
    // Similar to chats, messages would be in the store
    return [];
  }

  async getContactsToSync(userId: string) {
    const chatMap = this.userChats.get(userId);
    const contactMap = this.userContacts.get(userId);

    if (!chatMap || !contactMap) {
      throw new Boom('WhatsApp session not authenticated or initialized', {
        statusCode: 400,
      });
    }

    const chats = Array.from(chatMap.values());
    this.logger.log(
      `Fetching contacts to sync for user ${userId}. Found ${chats.length} chats in memory.`,
    );

    // Find individual users
    const validUserChats = chats.filter(
      (c: any) => c.id && c.id.endsWith('@s.whatsapp.net'),
    );

    return validUserChats.map((c: any) => {
      const contactItem = contactMap.get(c.id);

      let bestName = undefined;
      if (contactItem) {
        bestName =
          contactItem.name || contactItem.notify || contactItem.verifiedName;
      }

      return {
        jid: c.id as string,
        name: c.name || bestName || undefined,
      };
    });
  }

  async syncSelectedContacts(userId: string, contacts: any[]) {
    if (!contacts || contacts.length === 0) {
      return {
        total: 0,
        success: 0,
        skipped: 0,
        errors: 0,
        details: [],
      };
    }
    return this.syncContacts.execute(userId, contacts);
  }
}
