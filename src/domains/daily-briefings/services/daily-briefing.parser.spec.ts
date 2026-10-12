import { DailyBriefingCustomer } from "../entities/daily-briefing.entity";
import { parseBriefing } from "./daily-briefing.service";

const maria: DailyBriefingCustomer = {
  id: "customer-maria",
  name: "Maria Souza",
  phone: "11912345678",
  conversationId: "conversation-maria",
};

const people = new Map([["c1", maria]]);

describe("parseBriefing", () => {
  it("links the people the AI pointed to and drops invented ones", () => {
    const content = parseBriefing(
      JSON.stringify({
        headline: "Dia de fechar!",
        summary: "Carteira aquecida.",
        attendances: [
          {
            title: "Responder Maria",
            detail: "Ela perguntou do apartamento.",
            customerRef: "[C1]",
            message: "Oi Maria!",
          },
          {
            title: "Revisar funil",
            detail: "Muitos clientes sem etapa.",
            customerRef: "c99",
            message: null,
          },
        ],
        recoveries: [
          { customerRef: "c1", reason: "Gostou do bairro.", message: "Oi!" },
          { customerRef: "c1", reason: "Repetido.", message: "Oi de novo!" },
          { customerRef: "c42", reason: "Inventado.", message: "Oi!" },
        ],
        improvements: [
          { title: "Anotar mais", detail: "Registre cada contato." },
        ],
      }),
      people,
    );

    expect(content.attendances[0].customer).toEqual(maria);
    expect(content.attendances[1].customer).toBeNull();
    expect(content.recoveries).toHaveLength(1);
    expect(content.recoveries[0].reason).toBe("Gostou do bairro.");
    expect(content.improvements).toHaveLength(1);
  });

  it("keeps a plain text answer as the summary", () => {
    const content = parseBriefing("Sem JSON por aqui", people);
    expect(content.summary).toBe("Sem JSON por aqui");
    expect(content.headline).toBe("Seu resumo do dia");
    expect(content.attendances).toEqual([]);
  });
});
