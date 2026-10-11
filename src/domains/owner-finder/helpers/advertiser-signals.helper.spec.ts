import {
  advertiserSignalOf,
  phoneFromContacts,
} from "./advertiser-signals.helper";

describe("advertiserSignalOf", () => {
  it("sees a broker by the CRECI number, even on a 'particular' ad", () => {
    expect(
      advertiserSignalOf("Particular. Fale comigo, CRECI 123456-F", false).type,
    ).toBe("agency");
  });

  it("sees the owner by the words of the ad", () => {
    const signal = advertiserSignalOf(
      "Vendo direto com o proprietário, 3 dorms",
      false,
    );
    expect(signal.type).toBe("owner");
    expect(signal.reason).toContain("direto com o proprietário");
  });

  it("trusts the sites that only take owners", () => {
    expect(advertiserSignalOf("Apartamento 3 quartos", true).type).toBe(
      "owner",
    );
  });

  it("does not guess when the page says nothing", () => {
    expect(advertiserSignalOf("Apartamento 3 quartos", false).type).toBe(
      "unknown",
    );
  });
});

describe("phoneFromContacts", () => {
  it("prefers phone links and drops the country code", () => {
    expect(
      phoneFromContacts(["(11) 4004-0000", "tel:+5513991234567"], true),
    ).toBe("13991234567");
  });

  it("reads WhatsApp links", () => {
    expect(
      phoneFromContacts(["https://wa.me/5513991234567?text=oi"], false),
    ).toBe("13991234567");
  });

  it("ignores loose numbers in the text when told to", () => {
    expect(phoneFromContacts(["(13) 99123-4567"], false)).toBeNull();
  });
});
