import { parsePhotoAvatar } from "./photo-avatar.helper";

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
    expect(parsePhotoAvatar(JSON.stringify(person))).toEqual({
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
    );
    expect(avatar?.eyewear).toBe("none");
    expect(avatar?.headwear).toBe("none");
    expect(avatar?.neckwear).toBe("none");
  });

  it("never gives a beard to a feminine look or a dress to a masculine one", () => {
    expect(
      parsePhotoAvatar(JSON.stringify({ ...person, facialHair: "beard" }))
        ?.facialHair,
    ).toBe("none");
    const masculine = parsePhotoAvatar(
      JSON.stringify({ ...person, gender: "masculine", outfitStyle: "dress" }),
    );
    expect(masculine?.outfitStyle).toBe("casual");
  });

  it("returns null for pictures without a person or with broken fields", () => {
    expect(
      parsePhotoAvatar(JSON.stringify({ ...person, isPerson: false })),
    ).toBeNull();
    expect(
      parsePhotoAvatar(JSON.stringify({ ...person, hairStyle: "dreadlocks" })),
    ).toBeNull();
    expect(parsePhotoAvatar("not json")).toBeNull();
  });
});
