import {
  readConfiguredCorsOrigins,
  resolveCorsOrigins,
} from "./cors-origins.util.js";

describe("cors origins", () => {
  const originalCorsOrigin = process.env.APP_CORS_ORIGIN;

  afterEach(() => {
    if (originalCorsOrigin === undefined) delete process.env.APP_CORS_ORIGIN;
    else process.env.APP_CORS_ORIGIN = originalCorsOrigin;
  });

  it("always allows the production sites", () => {
    delete process.env.APP_CORS_ORIGIN;
    expect(resolveCorsOrigins()).toEqual([
      "https://brokerin.com.br",
      "https://www.brokerin.com.br",
      "http://localhost:3000",
    ]);
  });

  it("reads a comma separated list without trailing slashes or duplicates", () => {
    process.env.APP_CORS_ORIGIN =
      " https://staging.brokerin.com.br/ , https://brokerin.com.br,";
    expect(readConfiguredCorsOrigins()).toEqual([
      "https://staging.brokerin.com.br",
      "https://brokerin.com.br",
    ]);
    expect(resolveCorsOrigins()).toEqual([
      "https://brokerin.com.br",
      "https://www.brokerin.com.br",
      "https://staging.brokerin.com.br",
    ]);
  });
});
