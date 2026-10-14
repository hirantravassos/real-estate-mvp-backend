import {
  decodeScreenshot,
  MAXIMUM_SCREENSHOT_BYTES,
  screenshotContentTypeOf,
} from "./bug-report-screenshot.helper";

const dataUrlOf = (bytes: number[] | Buffer, declared = "image/png") =>
  `data:${declared};base64,${Buffer.from(bytes).toString("base64")}`;

describe("bug report screenshot", () => {
  it("trusts the bytes, not the declared type", () => {
    const decoded = decodeScreenshot(
      dataUrlOf([0xff, 0xd8, 0xff, 0xdb, 0x00], "image/png"),
    );
    expect(decoded?.mimeType).toBe("image/jpeg");
    expect(decoded?.extension).toBe("jpg");
  });

  it("recognizes png and webp", () => {
    expect(
      decodeScreenshot(
        dataUrlOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      )?.extension,
    ).toBe("png");
    expect(
      decodeScreenshot(
        dataUrlOf(
          [
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
            0x50,
          ],
          "image/webp",
        ),
      )?.extension,
    ).toBe("webp");
  });

  it("refuses svg, html and anything not an image", () => {
    expect(
      decodeScreenshot(dataUrlOf(Buffer.from("<svg onload=alert(1)>"))),
    ).toBeNull();
    expect(
      decodeScreenshot(`data:image/svg+xml;base64,${btoa("<svg/>")}`),
    ).toBeNull();
    expect(decodeScreenshot("not a data url")).toBeNull();
    expect(decodeScreenshot(undefined)).toBeNull();
  });

  it("refuses an image above the size limit", () => {
    const huge = Buffer.alloc(MAXIMUM_SCREENSHOT_BYTES + 1);
    huge.set([0xff, 0xd8, 0xff]);
    expect(decodeScreenshot(dataUrlOf(huge))).toBeNull();
  });

  it("serves by the extension the server gave the key", () => {
    expect(screenshotContentTypeOf("bug-reports/u/x.webp")).toBe("image/webp");
    expect(screenshotContentTypeOf("bug-reports/u/x.html")).toBe(
      "application/octet-stream",
    );
  });
});
