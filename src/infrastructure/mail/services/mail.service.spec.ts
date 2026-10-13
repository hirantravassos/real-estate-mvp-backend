import { MailerService } from "@nestjs-modules/mailer";
import { MailMessage } from "../templates/mail-layout.template";
import { isDeliverableAddress, MailService } from "./mail.service";

const message: MailMessage = {
  kind: "test",
  subject: "Linha um\r\nBcc: someone@example.com",
  preheader: "Resumo",
  heading: "Olá",
  paragraphs: ["Texto"],
};

const buildService = (fails = false) => {
  const sendMail = fails
    ? jest.fn().mockRejectedValue(new Error("smtp down"))
    : jest.fn().mockResolvedValue({});
  const service = new MailService({ sendMail } as unknown as MailerService);
  return { service, sendMail };
};

describe("MailService", () => {
  it("never writes to an anonymized account", async () => {
    const { service, sendMail } = buildService();
    await expect(
      service.send("deleted-1234@removido.invalid", message),
    ).resolves.toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("refuses an address that could add headers", () => {
    expect(isDeliverableAddress("maria@example.com")).toBe(true);
    expect(isDeliverableAddress("maria@example.com\r\nBcc: x@y.com")).toBe(
      false,
    );
    expect(isDeliverableAddress("")).toBe(false);
    expect(isDeliverableAddress(null)).toBe(false);
  });

  it("keeps the subject on a single header line", async () => {
    const { service, sendMail } = buildService();
    await service.send("maria@example.com", message);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@example.com",
        subject: "Linha um Bcc: someone@example.com",
      }),
    );
  });

  it("swallows a delivery failure, the flow that sent it carries on", async () => {
    const { service } = buildService(true);
    await expect(service.send("maria@example.com", message)).resolves.toBe(
      false,
    );
  });
});
