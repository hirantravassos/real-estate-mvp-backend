import sharp from "sharp";

export type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "center";

const GRAVITY: Record<WatermarkPosition, string> = {
  "bottom-right": "southeast",
  "bottom-left": "southwest",
  "top-right": "northeast",
  "top-left": "northwest",
  center: "centre",
};

export interface WatermarkOptions {
  position: string;
  opacity: number;
  /** Width of the mark against the photo width. */
  widthRatio: number;
}

/**
 * Stamps the platform's mark on a photo, in a corner with a small margin,
 * and returns it as a JPEG.
 */
export const applyWatermark = async (
  photo: Buffer,
  mark: Buffer,
  options: WatermarkOptions,
) => {
  const image = sharp(photo).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  const markWidth = Math.max(40, Math.round(width * options.widthRatio));
  const margin = Math.round(Math.min(width, height) * 0.03);

  const resized = await sharp(mark)
    .resize({ width: Math.min(markWidth, width - margin * 2) })
    .ensureAlpha()
    .toBuffer();
  // Multiplies the mark's own transparency by the chosen opacity.
  const faded = await sharp(resized)
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(255 * options.opacity)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .extend({
      top: margin,
      bottom: margin,
      left: margin,
      right: margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const position = (
    options.position in GRAVITY ? options.position : "bottom-right"
  ) as WatermarkPosition;

  return image
    .composite([{ input: faded, gravity: GRAVITY[position] }])
    .jpeg({ quality: 88 })
    .toBuffer();
};
