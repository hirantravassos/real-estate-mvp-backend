import { escapeLikePattern } from "./like-pattern.helper";

describe("escapeLikePattern", () => {
  it("matches the wildcards literally", () => {
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("keeps plain text as it is", () => {
    expect(escapeLikePattern("maria@example.com")).toBe("maria@example.com");
  });
});
