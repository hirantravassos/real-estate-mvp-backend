/**
 * The print of the screen arrives as a data URL. The declared type is not
 * trusted: the real bytes decide it, and only jpeg, png and webp, all inline
 * safe, are kept.
 */

/** About 3 MB of image, the browser compresses well below that. */
export const MAXIMUM_SCREENSHOT_BYTES = 3 * 1024 * 1024;
/** The base64 text of the largest image plus its prefix. */
export const MAXIMUM_SCREENSHOT_DATA_URL_LENGTH =
  Math.ceil(MAXIMUM_SCREENSHOT_BYTES / 3) * 4 + 64;
export const SCREENSHOT_DATA_URL_PATTERN =
  /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export interface DecodedScreenshot {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
}

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

const typeOf = (buffer: Buffer): Omit<DecodedScreenshot, "buffer"> | null => {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", extension: "png" };
  }
  // RIFF....WEBP
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
};

/** The image, or null when it is not a real jpeg, png or webp of fair size. */
export const decodeScreenshot = (
  dataUrl: string | undefined,
): DecodedScreenshot | null => {
  if (!dataUrl || dataUrl.length > MAXIMUM_SCREENSHOT_DATA_URL_LENGTH) {
    return null;
  }
  if (!SCREENSHOT_DATA_URL_PATTERN.test(dataUrl)) return null;

  const buffer = Buffer.from(
    dataUrl.substring(dataUrl.indexOf(",") + 1),
    "base64",
  );
  if (buffer.length === 0 || buffer.length > MAXIMUM_SCREENSHOT_BYTES) {
    return null;
  }
  const type = typeOf(buffer);
  return type ? { buffer, ...type } : null;
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, DecodedScreenshot["mimeType"]> =
  {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

/** The type to serve, from the extension the server itself gave the key. */
export const screenshotContentTypeOf = (key: string) =>
  CONTENT_TYPE_BY_EXTENSION[key.split(".").pop()?.toLowerCase() ?? ""] ??
  "application/octet-stream";
