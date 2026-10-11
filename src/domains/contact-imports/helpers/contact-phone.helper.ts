import { onlyDigits } from "../../inbox/helpers/whatsapp-phone.helper";

const BRAZIL_COUNTRY_CODE = "55";

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
