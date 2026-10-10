import { ConfigService } from "@nestjs/config";
import { EmailWhitelistService } from "./email-whitelist.service";

const buildService = (rawEmailWhitelist?: string): EmailWhitelistService => {
  const configService = {
    get: jest.fn().mockReturnValue(rawEmailWhitelist),
  } as unknown as ConfigService;

  return new EmailWhitelistService(configService);
};

describe("EmailWhitelistService", () => {
  describe("startup", () => {
    it.each([
      ["undefined", undefined],
      ["empty", ""],
      ["only whitespace", "   "],
      ["only separators", " , ; ,, "],
    ])("refuses to start when the whitelist is %s", (_label, rawValue) => {
      expect(() => buildService(rawValue)).toThrow(
        "AUTH_EMAIL_WHITELIST must contain at least one email",
      );
    });
  });

  describe("isAllowed", () => {
    const service = buildService(
      " Owner@Gmail.com, agent@gmail.com;broker@gmail.com\nassistant@gmail.com ",
    );

    it.each([
      "owner@gmail.com",
      "agent@gmail.com",
      "broker@gmail.com",
      "assistant@gmail.com",
    ])("allows %s", (email) => {
      expect(service.isAllowed(email)).toBe(true);
    });

    it("ignores letter casing and surrounding whitespace", () => {
      expect(service.isAllowed("  OWNER@GMAIL.COM ")).toBe(true);
    });

    it.each([
      "stranger@gmail.com",
      "xowner@gmail.com",
      "owner@gmail.com.evil.com",
      "owner+tag@gmail.com",
      "evil@owner@gmail.com",
      "gmail.com",
      "",
    ])("rejects %p", (email) => {
      expect(service.isAllowed(email)).toBe(false);
    });

    it("rejects a missing email", () => {
      expect(service.isAllowed(undefined)).toBe(false);
      expect(service.isAllowed(null)).toBe(false);
    });
  });
});
