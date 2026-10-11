import {
  onlyDigits,
  toCustomerPhone,
} from "../../domains/inbox/helpers/whatsapp-phone.helper";

const BRAZIL_COUNTRY_CODE = "55";
const SHORTEST_INTERNATIONAL_NUMBER = 8;
const LONGEST_INTERNATIONAL_NUMBER = 15;

/**
 * The same number with its country code, however it was written:
 * "(11) 91234-5678", "+55 11 1234-5678" and "5511912345678" are all
 * "5511912345678", "+351 912 345 678" and "00351912345678" are
 * "351912345678". Null when it is not a phone number.
 */
export const toInternationalDigits = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  const explicitlyInternational =
    trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = onlyDigits(trimmed.split("@")[0]);
  if (trimmed.startsWith("00")) digits = digits.substring(2);

  const isBrazilian =
    !explicitlyInternational || digits.startsWith(BRAZIL_COUNTRY_CODE);
  if (isBrazilian) {
    const brazilianPhone = toCustomerPhone(
      explicitlyInternational ? `+${digits}` : trimmed,
    );
    if (brazilianPhone) return `${BRAZIL_COUNTRY_CODE}${brazilianPhone}`;
  }

  if (
    digits.length < SHORTEST_INTERNATIONAL_NUMBER ||
    digits.length > LONGEST_INTERNATIONAL_NUMBER
  ) {
    return null;
  }
  return digits;
};

/**
 * Key two numbers share when they are the same line. Brazilian mobiles match
 * with or without the ninth digit, as old WhatsApp accounts still lack it.
 */
export const toPhoneMatchingKey = (value: string | null | undefined) => {
  const internationalDigits = toInternationalDigits(value);
  if (!internationalDigits) return null;
  if (!internationalDigits.startsWith(BRAZIL_COUNTRY_CODE)) {
    return internationalDigits;
  }
  const nationalDigits = internationalDigits.substring(
    BRAZIL_COUNTRY_CODE.length,
  );
  if (nationalDigits.length !== 10 && nationalDigits.length !== 11) {
    return internationalDigits;
  }
  const areaCode = nationalDigits.substring(0, 2);
  const lastEightDigits = nationalDigits.substring(nationalDigits.length - 8);
  return `${BRAZIL_COUNTRY_CODE}${areaCode}${lastEightDigits}`;
};

/**
 * How a customer phone is kept: Brazilian numbers as area code and number,
 * like the contact import saves them, foreign ones with "+" and the country
 * code so they are never read as Brazilian.
 */
export const toStoredCustomerPhone = (internationalDigits: string) => {
  if (internationalDigits.startsWith(BRAZIL_COUNTRY_CODE)) {
    const brazilianPhone = toCustomerPhone(`+${internationalDigits}`);
    if (brazilianPhone) return brazilianPhone;
  }
  return `+${internationalDigits}`;
};
