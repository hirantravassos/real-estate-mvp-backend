import { Repository } from "typeorm";
import { MailService } from "../../../infrastructure/mail/services/mail.service";
import { User } from "../../users/entities/user.entity";
import { BrokerMailService } from "./broker-mail.service";

const buildService = (user: Partial<User> | null) => {
  const send = jest.fn().mockResolvedValue(true);
  const findOneBy = jest.fn().mockResolvedValue(user);
  const service = new BrokerMailService(
    {
      port: 3001,
      corsOrigin: undefined,
      timezone: undefined,
      frontendUrl: "https://app.example.com",
    },
    { findOneBy } as unknown as Repository<User>,
    { send } as unknown as MailService,
  );
  return { service, send, findOneBy };
};

const messageWith = (url: string) => ({
  kind: "test",
  subject: "Assunto",
  preheader: "Resumo",
  heading: "Olá",
  paragraphs: [],
  action: { label: "Abrir", url },
});

describe("BrokerMailService", () => {
  it("loads only an active broker by id", async () => {
    const { service, send, findOneBy } = buildService(null);
    await service.deliver("broker-1", () => messageWith("x"));
    expect(findOneBy).toHaveBeenCalledWith({ id: "broker-1", active: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("greets by the first name and links inside the app", async () => {
    const { service, send } = buildService({
      id: "broker-1",
      email: "maria@example.com",
      name: "Maria Souza",
    });
    let greeting = "";
    await service.deliver("broker-1", (context) => {
      greeting = context.firstName;
      return messageWith(context.appUrl("/assinatura"));
    });
    expect(greeting).toBe("Maria");
    expect(send).toHaveBeenCalledWith(
      "maria@example.com",
      expect.objectContaining({
        action: { label: "Abrir", url: "https://app.example.com/assinatura" },
      }),
    );
  });

  it("never builds a link to another host", async () => {
    const { service, send } = buildService({
      id: "broker-1",
      email: "maria@example.com",
      name: "Maria",
    });
    await service.deliver("broker-1", (context) =>
      messageWith(context.appUrl("//evil.example.com")),
    );
    expect(send).toHaveBeenCalledWith(
      "maria@example.com",
      expect.objectContaining({
        action: { label: "Abrir", url: "https://app.example.com/" },
      }),
    );
  });

  it("sends every mail of a pair, in order", async () => {
    const { service, send } = buildService({
      id: "broker-1",
      email: "maria@example.com",
      name: "Maria",
    });
    await service.deliver("broker-1", () => [
      { ...messageWith("x"), kind: "first" },
      { ...messageWith("x"), kind: "second" },
    ]);
    expect(
      send.mock.calls.map(([, sent]) => (sent as { kind: string }).kind),
    ).toEqual(["first", "second"]);
  });
});
