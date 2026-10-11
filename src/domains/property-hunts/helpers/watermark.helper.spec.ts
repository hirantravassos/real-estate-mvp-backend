import sharp from "sharp";
import { applyWatermark } from "./watermark.helper";

const solid = (
  width: number,
  height: number,
  color: { r: number; g: number; b: number; alpha: number },
) =>
  sharp({ create: { width, height, channels: 4, background: color } })
    .png()
    .toBuffer();

describe("applyWatermark", () => {
  it("stamps the mark in the chosen corner and leaves the rest alone", async () => {
    const photo = await solid(1000, 600, { r: 0, g: 0, b: 255, alpha: 1 });
    const mark = await solid(200, 100, { r: 255, g: 0, b: 0, alpha: 1 });

    const stamped = await applyWatermark(photo, mark, {
      position: "bottom-right",
      opacity: 1,
      widthRatio: 0.2,
    });
    const { data, info } = await sharp(stamped)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const index = (y * info.width + x) * info.channels;
      return [data[index], data[index + 1], data[index + 2]];
    };

    expect(info.width).toBe(1000);
    expect(info.height).toBe(600);
    const [red, , blue] = pixel(880, 540);
    expect(red).toBeGreaterThan(200);
    expect(blue).toBeLessThan(60);
    const [cornerRed, , cornerBlue] = pixel(20, 20);
    expect(cornerRed).toBeLessThan(60);
    expect(cornerBlue).toBeGreaterThan(200);
  });

  it("fades the mark with the opacity", async () => {
    const photo = await solid(1000, 600, { r: 0, g: 0, b: 255, alpha: 1 });
    const mark = await solid(200, 100, { r: 255, g: 0, b: 0, alpha: 1 });

    const stamped = await applyWatermark(photo, mark, {
      position: "bottom-right",
      opacity: 0.5,
      widthRatio: 0.2,
    });
    const { data, info } = await sharp(stamped)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const index = (540 * info.width + 880) * info.channels;
    expect(data[index]).toBeGreaterThan(90);
    expect(data[index]).toBeLessThan(170);
    expect(data[index + 2]).toBeGreaterThan(90);
  });
});
