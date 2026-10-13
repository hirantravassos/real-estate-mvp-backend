import { parsePhotoAvatar, seededSkinTone } from "./photo-avatar.helper";

const SEED = "customer-1";

const person = {
  isPerson: true,
  gender: "feminine",
  skinTone: "honey",
  hairStyle: "braids",
  hairColor: "auburn",
  facialHair: "none",
  outfitStyle: "jacket",
  outfitColor: "navy",
  eyewear: "round",
  headwear: "beanie",
  neckwear: "necklace",
};

describe("parsePhotoAvatar", () => {
  it("keeps the new looks and accessories", () => {
    expect(parsePhotoAvatar(JSON.stringify(person), SEED)).toEqual({
      gender: "feminine",
      skinTone: seededSkinTone(SEED),
      hairStyle: "braids",
      hairColor: "auburn",
      facialHair: "none",
      outfitStyle: "jacket",
      outfitColor: "navy",
      eyewear: "round",
      headwear: "beanie",
      neckwear: "necklace",
    });
  });

  it("falls back to no accessory when the value is unknown", () => {
    const avatar = parsePhotoAvatar(
      JSON.stringify({
        ...person,
        eyewear: "monocle",
        headwear: undefined,
        neckwear: 3,
      }),
      SEED,
    );
    expect(avatar?.eyewear).toBe("none");
    expect(avatar?.headwear).toBe("none");
    expect(avatar?.neckwear).toBe("none");
  });

  it("never gives a beard to a feminine look or a dress to a masculine one", () => {
    expect(
      parsePhotoAvatar(JSON.stringify({ ...person, facialHair: "beard" }), SEED)
        ?.facialHair,
    ).toBe("none");
    const masculine = parsePhotoAvatar(
      JSON.stringify({ ...person, gender: "masculine", outfitStyle: "dress" }),
      SEED,
    );
    expect(masculine?.outfitStyle).toBe("casual");
  });

  it("returns null for pictures without a person or with broken fields", () => {
    expect(
      parsePhotoAvatar(JSON.stringify({ ...person, isPerson: false }), SEED),
    ).toBeNull();
    expect(
      parsePhotoAvatar(
        JSON.stringify({ ...person, hairStyle: "dreadlocks" }),
        SEED,
      ),
    ).toBeNull();
    expect(parsePhotoAvatar("not json", SEED)).toBeNull();
  });

  it("never reads the skin tone from the photo", () => {
    const fromHoney = parsePhotoAvatar(JSON.stringify(person), SEED);
    const fromEspresso = parsePhotoAvatar(
      JSON.stringify({ ...person, skinTone: "espresso" }),
      SEED,
    );
    expect(fromHoney?.skinTone).toBe(fromEspresso?.skinTone);
    expect(seededSkinTone(SEED)).toBe(seededSkinTone(SEED));
  });
});
