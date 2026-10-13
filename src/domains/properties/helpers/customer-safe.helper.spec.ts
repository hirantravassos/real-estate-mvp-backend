import {
  customerAddressOf,
  publicAddressOf,
  scrubThirdPartyData,
} from "./customer-safe.helper";

describe("customerAddressOf", () => {
  it("shows the full address of the broker's own properties", () => {
    expect(
      customerAddressOf({ address: "Rua A, 10, Embaré", address2: "ap 92" }),
    ).toBe("Rua A, 10, Embaré, ap 92");
  });

  it("shows only the neighborhood and city of a portal property", () => {
    expect(
      customerAddressOf({
        address: "Rua Carvalho de Mendonça, 320, Embaré, Santos, SP",
        address2: "",
        sourcePortal: "zap_imoveis",
        sourceDetails: {
          importedAt: "",
          neighborhood: "Embaré",
          city: "Santos",
          state: "SP",
          advertiser: {
            name: null,
            kind: "agency",
            phones: [],
            emails: [],
            creci: null,
            company: null,
          },
          description: null,
          videos: [],
        },
      }),
    ).toBe("Embaré, Santos, SP");
  });

  it("never falls back to the street of a portal property", () => {
    expect(
      customerAddressOf({
        address: "Rua Carvalho de Mendonça, 320",
        address2: "",
        sourcePortal: "olx",
      }),
    ).toBe("Localização com o corretor");
  });
});

describe("publicAddressOf", () => {
  it("never shows the street, number or unit of the broker's own property", () => {
    const address = publicAddressOf({
      address: "Rua Carvalho de Mendonça, 320 - Embaré, Santos - SP",
      address2: "Apto 42, bloco B",
    });
    expect(address).toBe("Embaré, Santos - SP");
    expect(address).not.toContain("320");
    expect(address).not.toContain("42");
  });

  it("falls back to a neutral text when the address has no region", () => {
    expect(publicAddressOf({ address: "Rua A 10", address2: "ap 1" })).toBe(
      "Localização com o corretor",
    );
  });

  it("keeps the hunt area of a portal property", () => {
    expect(
      publicAddressOf({
        address: "Rua B, 5",
        address2: "",
        sourcePortal: "olx",
      }),
    ).toBe("Localização com o corretor");
  });
});

describe("scrubThirdPartyData", () => {
  it("removes links, contacts, CRECI, codes and the advertiser", () => {
    const text = scrubThirdPartyData(
      "Lindo apto! Fale com Imobiliária Maré (13) 99123-4567, contato@mare.com.br, CRECI 12345-J. Veja em https://zapimoveis.com.br/imovel/x ou mare.com.br. Cód. AP1234",
      ["Imobiliária Maré"],
    );
    expect(text).toContain("Lindo apto!");
    for (const leak of [
      "99123",
      "contato@",
      "12345-J",
      "zapimoveis",
      "mare.com.br",
      "AP1234",
      "Maré",
    ]) {
      expect(text).not.toContain(leak);
    }
  });

  it("keeps the numbers that describe the property", () => {
    const text = scrubThirdPartyData(
      "3 quartos, 98 m², condomínio R$ 480, a 300 m da praia",
    );
    expect(text).toBe("3 quartos, 98 m², condomínio R$ 480, a 300 m da praia");
  });
});
