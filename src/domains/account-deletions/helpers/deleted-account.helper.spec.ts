import { anonymousEmail, deletedGoogleIdOf } from "./deleted-account.helper";

describe("deleted account helpers", () => {
  it("marks the same Google account the same way without keeping its id", () => {
    const googleId = "108234567890123456789";
    expect(deletedGoogleIdOf(googleId)).toBe(deletedGoogleIdOf(googleId));
    expect(deletedGoogleIdOf(googleId)).not.toContain(googleId);
    expect(deletedGoogleIdOf(googleId)).not.toBe(deletedGoogleIdOf("other"));
  });

  it("never repeats an anonymous e-mail", () => {
    expect(anonymousEmail()).not.toBe(anonymousEmail());
  });
});
