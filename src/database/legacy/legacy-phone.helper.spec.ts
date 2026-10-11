import {
  toInternationalDigits,
  toPhoneMatchingKey,
  toStoredCustomerPhone,
} from "./legacy-phone.helper";

describe("toInternationalDigits", () => {
  it.each([
    ["(11) 91234-5678", "5511912345678"],
    ["11912345678", "5511912345678"],
    ["+55 11 91234-5678", "5511912345678"],
    ["5511912345678", "5511912345678"],
    ["(11) 1234-5678", "551112345678"],
    ["11 8123-4567", "5511981234567"],
    ["+351 912 345 678", "351912345678"],
    ["00351912345678", "351912345678"],
    ["+1 (415) 555-2671", "14155552671"],
    ["351912345678", "351912345678"],
  ])("reads %s as %s", (value, expected) => {
    expect(toInternationalDigits(value)).toBe(expected);
  });

  it.each([null, "", "123", "abc", "+1234567890123456"])(
    "rejects %s",
    (value) => {
      expect(toInternationalDigits(value)).toBeNull();
    },
  );
});

describe("toPhoneMatchingKey", () => {
  it("matches Brazilian mobiles with and without the ninth digit", () => {
    expect(toPhoneMatchingKey("(11) 91234-5678")).toBe(
      toPhoneMatchingKey("+55 11 1234-5678"),
    );
  });

  it("keeps a foreign number apart from a Brazilian one", () => {
    expect(toPhoneMatchingKey("+1 (415) 555-2671")).not.toBe(
      toPhoneMatchingKey("(41) 5555-2671"),
    );
  });

  it("matches a foreign number however it was written", () => {
    expect(toPhoneMatchingKey("+351 912 345 678")).toBe(
      toPhoneMatchingKey("00351912345678"),
    );
  });
});

describe("toStoredCustomerPhone", () => {
  it("keeps Brazilian numbers as the contact import does", () => {
    expect(toStoredCustomerPhone("5511912345678")).toBe("11912345678");
  });

  it("keeps the country code of foreign numbers", () => {
    expect(toStoredCustomerPhone("14155552671")).toBe("+14155552671");
  });
});
