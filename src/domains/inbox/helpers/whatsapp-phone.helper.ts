const BRAZIL_COUNTRY_CODE = "55";

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** "11 91234-5678" becomes "5511912345678", the number WhatsApp expects. */
export const toWhatsappNumber = (phone: string) => {
  const digits = onlyDigits(phone);
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
