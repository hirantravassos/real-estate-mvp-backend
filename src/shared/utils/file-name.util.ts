const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
const LATIN1_LAST_CODE = 0xff;
const ASCII_LAST_CODE = 0x7f;

/**
 * Multipart uploads read the file name as latin1, so "Matrícula.pdf" sent in
 * UTF-8 arrives as "MatrÃ­cula.pdf". Turns such a name back into the real
 * one and keeps any name that is not broken this way.
 */
export const repairFileName = (name: string) => {
  if (!name) return name;
  const codes = [...name].map((character) => character.codePointAt(0) ?? 0);
  const onlyLatin1 = codes.every((code) => code <= LATIN1_LAST_CODE);
  const hasAccent = codes.some((code) => code > ASCII_LAST_CODE);
  if (!onlyLatin1 || !hasAccent) return name;
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  return decoded.includes(REPLACEMENT_CHARACTER) ? name : decoded;
};
