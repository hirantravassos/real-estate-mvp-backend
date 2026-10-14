import {
  leadingErrorOf,
  MAXIMUM_TELEMETRY_REQUESTS,
  pathOf,
  sanitizeBugReportTelemetry,
  scrubSecrets,
} from "./bug-report-telemetry.helper";

describe("bug report telemetry", () => {
  it("keeps the known fields and drops everything else", () => {
    const telemetry = sanitizeBugReportTelemetry({
      capturedAt: "2026-10-14T12:00:00.000Z",
      page: { path: "/customers/abc", title: "Clientes", injected: "x" },
      device: { viewportWidth: 390, touch: true, userAgent: 42 },
      userId: "someone-else",
      credits: 999,
    });

    expect(telemetry.page).toEqual({
      path: "/customers/abc",
      title: "Clientes",
      referrerPath: null,
    });
    expect(telemetry.device.viewportWidth).toBe(390);
    expect(telemetry.device.touch).toBe(true);
    expect(telemetry.device.userAgent).toBeNull();
    expect(telemetry).not.toHaveProperty("userId");
    expect(telemetry).not.toHaveProperty("credits");
  });

  it("survives anything that is not an object", () => {
    for (const raw of [undefined, null, "text", 12, ["a"]]) {
      const telemetry = sanitizeBugReportTelemetry(raw);
      expect(telemetry.errors).toEqual([]);
      expect(telemetry.page.path).toBeNull();
    }
  });

  it("strips the query string and the origin of every path", () => {
    expect(pathOf("https://api.example.com/auth/refresh?token=abc#x")).toBe(
      "/auth/refresh",
    );
    expect(pathOf("/inbox/1?refreshToken=secret")).toBe("/inbox/1");
  });

  it("scrubs bearer tokens, JSON web tokens and secret fields", () => {
    const body = JSON.stringify({ refreshToken: "r3fr3sh" });
    const scrubbed = scrubSecrets(
      `Authorization: Bearer abc.def.ghi failed with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature and ${body} password=hunter2`,
    );
    expect(scrubbed).not.toContain("abc.def.ghi");
    expect(scrubbed).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(scrubbed).not.toContain("r3fr3sh");
    expect(scrubbed).not.toContain("hunter2");
  });

  it("keeps only the newest requests and only valid methods", () => {
    const requests = Array.from(
      { length: MAXIMUM_TELEMETRY_REQUESTS + 10 },
      (_, index) => ({ method: "get", path: `/items/${index}`, status: 200 }),
    );
    requests.push({ method: "TRACE", path: "/nope", status: 200 });

    const telemetry = sanitizeBugReportTelemetry({ requests });

    expect(telemetry.requests).toHaveLength(MAXIMUM_TELEMETRY_REQUESTS - 1);
    expect(telemetry.requests[0].method).toBe("GET");
    expect(telemetry.requests.at(-1)?.path).toBe(
      `/items/${MAXIMUM_TELEMETRY_REQUESTS + 9}`,
    );
  });

  it("drops numbers out of range and dates that do not parse", () => {
    const telemetry = sanitizeBugReportTelemetry({
      capturedAt: "not a date",
      device: { viewportWidth: -5, devicePixelRatio: Number.NaN },
    });
    expect(telemetry.capturedAt).toBeNull();
    expect(telemetry.device.viewportWidth).toBeNull();
    expect(telemetry.device.devicePixelRatio).toBeNull();
  });

  it("names the crash before the latest console error", () => {
    const telemetry = sanitizeBugReportTelemetry({
      errors: [
        { kind: "boundary", message: "Cannot read properties of undefined" },
        { kind: "console", message: "Warning: something" },
      ],
    });
    expect(leadingErrorOf(telemetry)).toBe(
      "Cannot read properties of undefined",
    );
  });
});
