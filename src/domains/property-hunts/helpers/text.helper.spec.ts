import { withoutPersonalContacts } from "./text.helper";

describe("withoutPersonalContacts", () => {
  it("takes phones, emails, WhatsApp links and CRECI out", () => {
    const text = [
      "Fale com Ana: (13) 99123-4567 ou 13 3222-1234.",
      "E-mail ana.souza@imobiliaria.com.br",
      "WhatsApp https://wa.me/5513991234567?text=oi",
      "CRECI 123456-F e Creci/SP 98.765-J",
    ].join("\n");

    const cleaned = withoutPersonalContacts(text);

    expect(cleaned).not.toMatch(/9912|3222|ana\.souza|wa\.me|123456|98\.765/);
    expect(cleaned).toContain("[contato no portal]");
  });

  it("keeps prices, areas and postal codes", () => {
    const text =
      "Apartamento 3 quartos, 120 m², R$ 850.000, condomínio R$ 1.200, CEP 11060-001.";

    expect(withoutPersonalContacts(text)).toBe(text);
  });

  it("accepts empty values", () => {
    expect(withoutPersonalContacts(null)).toBe("");
  });
});
