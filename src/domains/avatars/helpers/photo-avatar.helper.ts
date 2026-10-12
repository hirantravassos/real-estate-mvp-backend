import {
  CUSTOMER_AVATAR_EYEWEARS,
  CUSTOMER_AVATAR_FACIAL_HAIRS,
  CUSTOMER_AVATAR_GENDERS,
  CUSTOMER_AVATAR_HAIR_COLORS,
  CUSTOMER_AVATAR_HAIR_STYLES,
  CUSTOMER_AVATAR_HEADWEARS,
  CUSTOMER_AVATAR_NECKWEARS,
  CUSTOMER_AVATAR_OUTFIT_COLORS,
  CUSTOMER_AVATAR_OUTFIT_STYLES,
  CUSTOMER_AVATAR_SKIN_TONES,
  CustomerAvatar,
} from "../../customers/dtos/customer-avatar.dto";

/** Outfits a masculine character never gets from a photo. */
const FEMININE_ONLY_OUTFITS = new Set(["dress"]);

const oneOf = <T extends string>(
  options: readonly T[],
  value: unknown,
): T | null => (options.includes(value as T) ? (value as T) : null);

/** Only a clear person becomes a look, anything else keeps the default one. */
export const parsePhotoAvatar = (text: string): CustomerAvatar | null => {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (raw.isPerson !== true) return null;

  const gender = oneOf(CUSTOMER_AVATAR_GENDERS, raw.gender);
  const skinTone = oneOf(CUSTOMER_AVATAR_SKIN_TONES, raw.skinTone);
  const hairStyle = oneOf(CUSTOMER_AVATAR_HAIR_STYLES, raw.hairStyle);
  const hairColor = oneOf(CUSTOMER_AVATAR_HAIR_COLORS, raw.hairColor);
  const outfitStyle = oneOf(CUSTOMER_AVATAR_OUTFIT_STYLES, raw.outfitStyle);
  const outfitColor = oneOf(CUSTOMER_AVATAR_OUTFIT_COLORS, raw.outfitColor);
  if (
    !gender ||
    !skinTone ||
    !hairStyle ||
    !hairColor ||
    !outfitStyle ||
    !outfitColor
  ) {
    return null;
  }

  return {
    gender,
    skinTone,
    hairStyle,
    hairColor,
    facialHair:
      gender === "masculine"
        ? (oneOf(CUSTOMER_AVATAR_FACIAL_HAIRS, raw.facialHair) ?? "none")
        : "none",
    outfitStyle:
      gender === "masculine" && FEMININE_ONLY_OUTFITS.has(outfitStyle)
        ? "casual"
        : outfitStyle,
    outfitColor,
    eyewear: oneOf(CUSTOMER_AVATAR_EYEWEARS, raw.eyewear) ?? "none",
    headwear: oneOf(CUSTOMER_AVATAR_HEADWEARS, raw.headwear) ?? "none",
    neckwear: oneOf(CUSTOMER_AVATAR_NECKWEARS, raw.neckwear) ?? "none",
  };
};
