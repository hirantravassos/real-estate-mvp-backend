import { existsSync } from "fs";
import * as path from "path";
import sharp from "sharp";

/** Bundled with the code, so the mark looks the same on any server. */
const FONT_FILE = path.join(
  process.cwd(),
  "assets",
  "fonts",
  "DejaVuSans-Bold.ttf",
);
const FONT_FAMILY = "DejaVu Sans Bold";

const escapeMarkup = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The broker's name and contact, the lines stamped on imported photos. */
export const brokerMarkLines = (broker: {
  name: string;
  creci?: string | null;
  phone?: string | null;
  email?: string | null;
}) => {
  const phone = formatPhone(broker.phone);
  return [
    [broker.name, broker.creci ? `CRECI ${broker.creci}` : null]
      .filter(Boolean)
      .join(" · "),
    phone ?? broker.email ?? null,
  ].filter((line): line is string => Boolean(line?.trim()));
};

const formatPhone = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  // Foreign numbers keep their country code, as "+351912345678".
  else if (trimmed.startsWith("+") && digits.length >= 8) return `+${digits}`;
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return null;
};

/**
 * Stamps the broker's name and contact on a photo, white text on a dark
 * rounded tag in the bottom right corner, sized to the photo. Returns a JPEG.
 */
export const stampBrokerMark = async (photo: Buffer, lines: string[]) => {
  const image = sharp(photo).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  if (!lines.length || !width || !height) {
    return image.jpeg({ quality: 88 }).toBuffer();
  }

  const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.032));
  const padding = Math.round(fontSize * 0.7);
  const margin = Math.round(Math.min(width, height) * 0.03);

  const text = await sharp({
    text: {
      text: lines
        .map(
          (line, index) =>
            `<span foreground="white" size="${index === 0 ? 100 : 85}%">${escapeMarkup(line)}</span>`,
        )
        .join("\n"),
      font: `${FONT_FAMILY} ${fontSize}`,
      ...(existsSync(FONT_FILE) ? { fontfile: FONT_FILE } : {}),
      rgba: true,
      dpi: 72,
      spacing: Math.round(fontSize * 0.25),
      width: Math.max(10, width - margin * 2 - padding * 2),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });

  const tagWidth = Math.min(width - margin * 2, text.info.width + padding * 2);
  const tagHeight = Math.min(
    height - margin * 2,
    text.info.height + padding * 2,
  );
  const radius = Math.round(fontSize * 0.6);
  const tag = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tagWidth}" height="${tagHeight}"><rect width="${tagWidth}" height="${tagHeight}" rx="${radius}" fill="#0d2f5c" fill-opacity="0.72"/></svg>`,
    ),
  )
    .composite([{ input: text.data, top: padding, left: padding }])
    .png()
    .toBuffer();

  return image
    .composite([
      {
        input: tag,
        left: width - tagWidth - margin,
        top: height - tagHeight - margin,
      },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
};
