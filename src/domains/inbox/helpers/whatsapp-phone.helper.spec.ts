import { toProfilePhone } from "./whatsapp-phone.helper";

describe("toProfilePhone", () => {
  it("keeps a Brazilian number as area code and number", () => {
    expect(toProfilePhone("5511912345678")).toBe("11912345678");
  });

  it("adds the ninth digit old WhatsApp accounts still lack", () => {
    expect(toProfilePhone("551191234567")).toBe("11991234567");
  });

  it("keeps the country code of a foreign number", () => {
    expect(toProfilePhone("351912345678")).toBe("+351912345678");
  });

  it("gives nothing for an empty or broken number", () => {
    expect(toProfilePhone(null)).toBeNull();
    expect(toProfilePhone("")).toBeNull();
    expect(toProfilePhone("1234")).toBeNull();
  });
});
