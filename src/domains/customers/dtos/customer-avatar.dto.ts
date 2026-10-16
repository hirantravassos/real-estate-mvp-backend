import { IsIn, IsOptional } from "class-validator";

export const CUSTOMER_AVATAR_GENDERS = ["feminine", "masculine"] as const;
export const CUSTOMER_AVATAR_SKIN_TONES = [
  "porcelain",
  "sand",
  "honey",
  "caramel",
  "cocoa",
  "espresso",
] as const;
export const CUSTOMER_AVATAR_HAIR_STYLES = [
  "short",
  "long",
  "curly",
  "bun",
  "spiky",
  "bald",
  "ponytail",
  "afro",
  "mohawk",
  "bob",
  "braids",
  "pigtails",
  "pixie",
  "wavy",
  "sleek",
  "lowBun",
  "lowPonytail",
  "halfUp",
  "slickedBack",
  "sidePart",
  "undercut",
  "buzz",
  "dreads",
] as const;
export const CUSTOMER_AVATAR_HAIR_COLORS = [
  "black",
  "brown",
  "blonde",
  "ginger",
  "gray",
  "pink",
  "auburn",
  "blue",
  "purple",
] as const;
export const CUSTOMER_AVATAR_FACIAL_HAIRS = [
  "none",
  "stubble",
  "goatee",
  "mustache",
  "beard",
] as const;
export const CUSTOMER_AVATAR_OUTFIT_STYLES = [
  "casual",
  "suit",
  "dress",
  "hoodie",
  "jacket",
  "overalls",
  "tracksuit",
  "sweater",
  "hawaiian",
  "tuxedo",
  "gown",
  "cocktail",
  "skirtSuit",
  "waistcoat",
] as const;
/** Outfits drawn on a feminine body, with a skirt and high heels. */
export const CUSTOMER_AVATAR_FEMININE_OUTFIT_STYLES = [
  "dress",
  "gown",
  "cocktail",
  "skirtSuit",
] as const;
export const CUSTOMER_AVATAR_OUTFIT_COLORS = [
  "coral",
  "sky",
  "mint",
  "sunflower",
  "lavender",
  "graphite",
  "cherry",
  "navy",
  "cream",
  "rose",
] as const;
export const CUSTOMER_AVATAR_EYEWEARS = [
  "none",
  "round",
  "square",
  "sunglasses",
  "heart",
  "star",
] as const;
export const CUSTOMER_AVATAR_HEADWEARS = [
  "none",
  "cap",
  "beanie",
  "headphones",
  "flower",
  "bow",
  "crown",
] as const;
export const CUSTOMER_AVATAR_NECKWEARS = [
  "none",
  "necklace",
  "pearls",
  "scarf",
] as const;

export type CustomerAvatarGender = (typeof CUSTOMER_AVATAR_GENDERS)[number];
export type CustomerAvatarSkinTone =
  (typeof CUSTOMER_AVATAR_SKIN_TONES)[number];
export type CustomerAvatarHairStyle =
  (typeof CUSTOMER_AVATAR_HAIR_STYLES)[number];
export type CustomerAvatarHairColor =
  (typeof CUSTOMER_AVATAR_HAIR_COLORS)[number];
export type CustomerAvatarFacialHair =
  (typeof CUSTOMER_AVATAR_FACIAL_HAIRS)[number];
export type CustomerAvatarOutfitStyle =
  (typeof CUSTOMER_AVATAR_OUTFIT_STYLES)[number];
export type CustomerAvatarOutfitColor =
  (typeof CUSTOMER_AVATAR_OUTFIT_COLORS)[number];
export type CustomerAvatarEyewear = (typeof CUSTOMER_AVATAR_EYEWEARS)[number];
export type CustomerAvatarHeadwear = (typeof CUSTOMER_AVATAR_HEADWEARS)[number];
export type CustomerAvatarNeckwear = (typeof CUSTOMER_AVATAR_NECKWEARS)[number];

export interface CustomerAvatar {
  gender: CustomerAvatarGender;
  skinTone: CustomerAvatarSkinTone;
  hairStyle: CustomerAvatarHairStyle;
  hairColor: CustomerAvatarHairColor;
  /** Optional, looks saved before beards existed do not have it. */
  facialHair?: CustomerAvatarFacialHair;
  outfitStyle: CustomerAvatarOutfitStyle;
  outfitColor: CustomerAvatarOutfitColor;
  /** Accessories are optional, looks saved before them have none. */
  eyewear?: CustomerAvatarEyewear;
  headwear?: CustomerAvatarHeadwear;
  neckwear?: CustomerAvatarNeckwear;
  /** Color of hats, scarves and pendants, the outfit color when missing. */
  accessoryColor?: CustomerAvatarOutfitColor;
}

/** The look of the customer's little character on the broker's screen. */
export class CustomerAvatarDto implements CustomerAvatar {
  @IsIn(CUSTOMER_AVATAR_GENDERS)
  gender: CustomerAvatarGender;

  @IsIn(CUSTOMER_AVATAR_SKIN_TONES)
  skinTone: CustomerAvatarSkinTone;

  @IsIn(CUSTOMER_AVATAR_HAIR_STYLES)
  hairStyle: CustomerAvatarHairStyle;

  @IsIn(CUSTOMER_AVATAR_HAIR_COLORS)
  hairColor: CustomerAvatarHairColor;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_FACIAL_HAIRS)
  facialHair?: CustomerAvatarFacialHair;

  @IsIn(CUSTOMER_AVATAR_OUTFIT_STYLES)
  outfitStyle: CustomerAvatarOutfitStyle;

  @IsIn(CUSTOMER_AVATAR_OUTFIT_COLORS)
  outfitColor: CustomerAvatarOutfitColor;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_EYEWEARS)
  eyewear?: CustomerAvatarEyewear;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_HEADWEARS)
  headwear?: CustomerAvatarHeadwear;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_NECKWEARS)
  neckwear?: CustomerAvatarNeckwear;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_OUTFIT_COLORS)
  accessoryColor?: CustomerAvatarOutfitColor;
}
