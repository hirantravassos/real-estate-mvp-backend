import { MigrationInterface, QueryRunner } from "typeorm";

const BRAZIL_COUNTRY_CODE = "55";

/**
 * Same rule as `toProfilePhone`, copied so the migration never changes when
 * the helper does: "5511912345678" becomes "11912345678", old accounts
 * without the ninth digit get it, foreign numbers keep "+" and the code.
 */
const profilePhoneOf = (whatsappNumber: string) => {
  let digits = whatsappNumber.replace(/\D/g, "");
  const isBrazilian =
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 13);
  if (!isBrazilian) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  digits = digits.substring(BRAZIL_COUNTRY_CODE.length);
  if (digits.startsWith("0") || digits[1] === "0") return null;
  if (digits.length === 11 && digits[2] !== "9") return null;
  if (digits.length === 10 && Number(digits[2]) >= 6) {
    digits = `${digits.substring(0, 2)}9${digits.substring(2)}`;
  }
  return digits;
};

/**
 * The profile number stops being typed and becomes the connected WhatsApp's.
 * Brokers who already linked a phone get that number on the profile now,
 * the others keep what they typed until they connect.
 */
export class ProfilePhoneFromWhatsapp1792627200000 implements MigrationInterface {
  name = "ProfilePhoneFromWhatsapp1792627200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const connections = (await queryRunner.query(
      "SELECT `userId`, `phone` FROM `whatsapp_connections` WHERE `phone` IS NOT NULL AND `phone` <> ''",
    )) as { userId: string; phone: string }[];
    for (const connection of connections) {
      const phone = profilePhoneOf(connection.phone);
      if (!phone) continue;
      await queryRunner.query("UPDATE `users` SET `phone` = ? WHERE `id` = ?", [
        phone,
        connection.userId,
      ]);
    }
  }

  public async down(): Promise<void> {
    // The numbers typed before are gone, there is nothing to restore.
  }
}
