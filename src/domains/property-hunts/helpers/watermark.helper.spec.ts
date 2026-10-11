import sharp from "sharp";
import { brokerMarkLines, stampBrokerMark } from "./watermark.helper";

const solidPhoto = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 240, g: 240, b: 240 },
    },
  })
    .jpeg()
    .toBuffer();

/** How many pixels in the area look like the dark tag or its white text. */
const markedPixels = async (
  photo: Buffer,
  area: { left: number; top: number; width: number; height: number },
) => {
  const { data, info } = await sharp(photo)
    .extract(area)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    if (data[index] < 150) count += 1;
  }
  return count;
};

describe("brokerMarkLines", () => {
  it("writes the name, CRECI and phone of the broker", () => {
    expect(
      brokerMarkLines({
        name: "Hiran Travassos",
        creci: "123456-F",
        phone: "5513991234567",
        email: "hiran@x.com",
      }),
    ).toEqual(["Hiran Travassos · CRECI 123456-F", "(13) 99123-4567"]);
  });

  it("falls back to the email without a phone", () => {
    expect(
      brokerMarkLines({ name: "Hiran", phone: null, email: "hiran@x.com" }),
    ).toEqual(["Hiran", "hiran@x.com"]);
  });
});

describe("stampBrokerMark", () => {
  it("stamps the tag in the bottom right corner only", async () => {
    const photo = await solidPhoto(1200, 800);
    const stamped = await stampBrokerMark(photo, [
      "Hiran Travassos · CRECI 123456-F",
      "(13) 99123-4567",
    ]);
    const { width, height } = await sharp(stamped).metadata();
    expect(width).toBe(1200);
    expect(height).toBe(800);

    const corner = await markedPixels(stamped, {
      left: 700,
      top: 650,
      width: 450,
      height: 120,
    });
    const topLeft = await markedPixels(stamped, {
      left: 0,
      top: 0,
      width: 450,
      height: 300,
    });
    expect(corner).toBeGreaterThan(5000);
    expect(topLeft).toBe(0);
  });

  it("keeps the photo when there is nothing to write", async () => {
    const photo = await solidPhoto(600, 400);
    const stamped = await stampBrokerMark(photo, []);
    expect(
      await markedPixels(stamped, { left: 0, top: 0, width: 600, height: 400 }),
    ).toBe(0);
  });
});
