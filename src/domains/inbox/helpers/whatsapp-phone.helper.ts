const BRAZIL_COUNTRY_CODE = "55";

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/**
 * "11 91234-5678" becomes "5511912345678", the number WhatsApp expects.
 * Foreign numbers already carry their code, "+351912345678" is "351912345678".
 */
export const toWhatsappNumber = (phone: string) => {
  const digits = onlyDigits(phone);
  if (phone.trim().startsWith("+")) return digits;
  if (digits.length === 10 || digits.length === 11) {
    return `${BRAZIL_COUNTRY_CODE}${digits}`;
  }
  return digits;
};

/** "5511912345678@s.whatsapp.net" becomes "5511912345678". */
export const numberFromJid = (jid: string) =>
  onlyDigits(jid.split("@")[0].split(":")[0]);

export const isPersonalJid = (jid: string | undefined | null) =>
  Boolean(jid && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@c.us")));

/**
 * Area code plus the last eight digits. Old Brazilian WhatsApp accounts
 * still live without the ninth digit, so this matches both forms.
 */
export const phoneMatchingKey = (phone: string) => {
  let digits = onlyDigits(phone);
  if (
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.substring(2);
  }
  if (digits.length < 10) return digits;
  return `${digits.substring(0, 2)}${digits.substring(digits.length - 8)}`;
};

/**
 * Any way a Brazilian number is written ("+55 (11) 91234-5678",
 * "011 91234-5678", "5511912345678@s.whatsapp.net") becomes the digits a
 * customer keeps: area code and number, "11912345678". Foreign or broken
 * numbers become null.
 */
export const toCustomerPhone = (value: string | null | undefined) => {
  if (!value) return null;
  let digits = onlyDigits(value.split("@")[0].split(":")[0]);

  if (digits.startsWith("00")) digits = digits.substring(2);

  if (
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.substring(2);
  } else if (digits.startsWith("0")) {
    digits = digits.substring(1);
    // Long distance carrier code, as in "0 21 11 91234-5678".
    if (digits.length === 12 || digits.length === 13) {
      digits = digits.substring(2);
    }
  }

  if (digits.length !== 10 && digits.length !== 11) return null;
  if (digits.startsWith("0") || digits[1] === "0") return null;
  if (digits.length === 11 && digits[2] !== "9") return null;

  // Old WhatsApp accounts keep mobiles without the ninth digit.
  if (digits.length === 10 && Number(digits[2]) >= 6) {
    digits = `${digits.substring(0, 2)}9${digits.substring(2)}`;
  }
  return digits;
};

/**
 * The connected WhatsApp number as the profile keeps it: Brazilian numbers
 * as area code and number ("5511912345678" becomes "11912345678"), foreign
 * ones with "+" and the country code ("351912345678" becomes "+351912345678").
 */
export const toProfilePhone = (whatsappNumber: string | null | undefined) => {
  const digits = onlyDigits(whatsappNumber ?? "");
  if (!digits) return null;
  const isBrazilian =
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 13);
  if (isBrazilian) return toCustomerPhone(digits);
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
};
