import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  normalizePhoneNumber,
  PHONE_NUMBER_PATTERN,
  ValidatePhoneNumber,
} from "./phone-number.decorator";
import { toWhatsappNumber } from "../../../domains/inbox/helpers/whatsapp-phone.helper";

describe("normalizePhoneNumber", () => {
  it("keeps Brazilian numbers as area code and number", () => {
    expect(normalizePhoneNumber("(11) 9 1234-5678")).toBe("11912345678");
    expect(normalizePhoneNumber("+55 11 91234-5678")).toBe("11912345678");
    expect(normalizePhoneNumber("5511912345678")).toBe("11912345678");
    expect(normalizePhoneNumber("(11) 1234-5678")).toBe("1112345678");
  });

  it("keeps foreign numbers with a plus and the country code", () => {
    expect(normalizePhoneNumber("+351 912 345 678")).toBe("+351912345678");
    expect(normalizePhoneNumber("00351912345678")).toBe("+351912345678");
    expect(normalizePhoneNumber("+1 (212) 555-1234")).toBe("+12125551234");
  });

  it("leaves empty and non text values alone", () => {
    expect(normalizePhoneNumber("   ")).toBe("");
    expect(normalizePhoneNumber(null)).toBeNull();
    expect(normalizePhoneNumber(undefined)).toBeUndefined();
  });
});

describe("PHONE_NUMBER_PATTERN", () => {
  it.each(["11912345678", "1112345678", "+351912345678", "+12125551234"])(
    "accepts %s",
    (phone) => expect(PHONE_NUMBER_PATTERN.test(phone)).toBe(true),
  );

  it.each(["1191234", "+0123456789", "+1234567", "+1234567890123456", "abc"])(
    "rejects %s",
    (phone) => expect(PHONE_NUMBER_PATTERN.test(phone)).toBe(false),
  );
});

describe("toWhatsappNumber", () => {
  it("adds the Brazilian code only to Brazilian numbers", () => {
    expect(toWhatsappNumber("11912345678")).toBe("5511912345678");
    expect(toWhatsappNumber("+12125551234")).toBe("12125551234");
    expect(toWhatsappNumber("+351912345678")).toBe("351912345678");
  });
});

class PhoneHolder {
  @ValidatePhoneNumber()
  phone: string;
}

describe("ValidatePhoneNumber", () => {
  const check = (phone: unknown) => {
    const holder = plainToInstance(PhoneHolder, { phone });
    return { phone: holder.phone, errors: validateSync(holder).length };
  };

  it("stores normalized Brazilian and foreign numbers", () => {
    expect(check("(11) 9 1234-5678")).toEqual({
      phone: "11912345678",
      errors: 0,
    });
    expect(check("+351 912 345 678")).toEqual({
      phone: "+351912345678",
      errors: 0,
    });
  });

  it("rejects incomplete numbers", () => {
    expect(check("(11) 9 1234").errors).toBe(1);
    expect(check("+351").errors).toBe(1);
    expect(check("").errors).toBe(1);
  });
});
