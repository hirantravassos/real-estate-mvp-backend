import { EvolutionMessage } from "../../../infrastructure/evolution/types/evolution.type";
import { parseEvolutionMessage } from "./evolution-message.parser";

const imageWith = (jpegThumbnail: unknown) =>
  ({
    key: { remoteJid: "5511912345678@s.whatsapp.net", fromMe: false, id: "1" },
    message: { imageMessage: { mimetype: "image/jpeg", jpegThumbnail } },
  }) as EvolutionMessage;

describe("parseEvolutionMessage thumbnails", () => {
  it("keeps the base64 a webhook sends", () => {
    expect(parseEvolutionMessage(imageWith("AQID"))?.thumbnailBase64).toBe(
      "AQID",
    );
  });

  it("turns the raw bytes read back from Evolution into base64", () => {
    expect(
      parseEvolutionMessage(imageWith({ 0: 1, 1: 2, 2: 3 }))?.thumbnailBase64,
    ).toBe("AQID");
    expect(
      parseEvolutionMessage(imageWith({ type: "Buffer", data: [1, 2, 3] }))
        ?.thumbnailBase64,
    ).toBe("AQID");
  });

  it("drops a thumbnail it can't read", () => {
    expect(
      parseEvolutionMessage(imageWith({ unexpected: "value" }))
        ?.thumbnailBase64,
    ).toBeNull();
  });
});
