import { BadRequestException, NotFoundException } from "@nestjs/common";
import sharp from "sharp";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { User } from "../../users/entities/user.entity";
import { Conversation } from "../entities/conversation.entity";
import { ConversationService } from "./conversation.service";
import { MessageService } from "./message.service";
import {
  personalize,
  ProfileCardSenderService,
} from "./profile-card-sender.service";
import { WhatsappConnectionService } from "./whatsapp-connection.service";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";
const OWNER_CHAT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_CHAT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const conversations = [
  { id: OWNER_CHAT_ID, userId: OWNER_ID, contactName: "Ana Lima" },
  { id: OTHER_CHAT_ID, userId: OTHER_ID, contactName: "Bruno" },
] as Conversation[];

const buildService = () => {
  const conversationService = {
    findEntity: jest.fn((userId: string, id: string) => {
      const found = conversations.find(
        (conversation) =>
          conversation.id === id && conversation.userId === userId,
      );
      return found
        ? Promise.resolve(found)
        : Promise.reject(new NotFoundException("Conversa não encontrada."));
    }),
  } as unknown as ConversationService;
  const connectionService = {
    requireConnected: jest.fn(() => Promise.resolve({})),
  } as unknown as WhatsappConnectionService;
  const sendMediaTo = jest.fn(() => Promise.resolve(undefined));
  const messageService = { sendMediaTo } as unknown as MessageService;
  const uploadBuffer = jest.fn(() => Promise.resolve());
  const storageService = {
    uploadBuffer,
    generateInboxS3Key: (userId: string, conversationId: string) =>
      `inbox/${userId}/${conversationId}/card.jpg`,
  } as unknown as StorageService;

  return {
    service: new ProfileCardSenderService(
      conversationService,
      connectionService,
      messageService,
      storageService,
    ),
    sendMediaTo,
    uploadBuffer,
  };
};

const cardBase64 = async () =>
  (
    await sharp({
      create: { width: 40, height: 50, channels: 3, background: "#59b8ff" },
    })
      .png()
      .toBuffer()
  ).toString("base64");

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("ProfileCardSenderService.send", () => {
  it("sends the card to the broker's own chat with the contact's name", async () => {
    const { service, sendMediaTo, uploadBuffer } = buildService();

    const result = await service.send({ id: OWNER_ID } as User, {
      image: await cardBase64(),
      caption: "Oi, {nome}! Conheça o meu trabalho.",
      conversationIds: [OWNER_CHAT_ID],
    });
    await flush();

    expect(result.total).toBe(1);
    expect(uploadBuffer).toHaveBeenCalledWith(
      `inbox/${OWNER_ID}/${OWNER_CHAT_ID}/card.jpg`,
      expect.any(Buffer),
      "image/jpeg",
    );
    expect(sendMediaTo).toHaveBeenCalledWith(
      conversations[0],
      expect.objectContaining({
        mimeType: "image/jpeg",
        caption: "Oi, Ana! Conheça o meu trabalho.",
      }),
      {},
    );
  });

  it("refuses a chat of another account and sends nothing", async () => {
    const { service, sendMediaTo, uploadBuffer } = buildService();

    await expect(
      service.send({ id: OWNER_ID } as User, {
        image: await cardBase64(),
        caption: "Oi!",
        conversationIds: [OWNER_CHAT_ID, OTHER_CHAT_ID],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await flush();

    expect(uploadBuffer).not.toHaveBeenCalled();
    expect(sendMediaTo).not.toHaveBeenCalled();
  });

  it("refuses something that is not a picture", async () => {
    const { service, sendMediaTo } = buildService();

    await expect(
      service.send({ id: OWNER_ID } as User, {
        image: Buffer.from("<script>alert(1)</script>").toString("base64"),
        caption: "Oi!",
        conversationIds: [OWNER_CHAT_ID],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sendMediaTo).not.toHaveBeenCalled();
  });
});

describe("personalize", () => {
  it("puts the first name in place of {nome}", () => {
    expect(personalize("Oi, {nome}! Tudo bem?", "Ana")).toBe(
      "Oi, Ana! Tudo bem?",
    );
  });

  it("drops the placeholder cleanly when the contact has no name", () => {
    expect(personalize("Oi, {nome}! Tudo bem?", null)).toBe("Oi! Tudo bem?");
    expect(personalize("{nome}, olha só", null)).toBe("olha só");
  });
});
