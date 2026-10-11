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
] as const;
export const CUSTOMER_AVATAR_HAIR_COLORS = [
  "black",
  "brown",
  "blonde",
  "ginger",
  "gray",
  "pink",
  "blue",
  "purple",
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
] as const;
export const CUSTOMER_AVATAR_EYEWEAR = [
  "none",
  "round",
  "square",
  "sunglasses",
  "heart",
  "star",
] as const;
export const CUSTOMER_AVATAR_HEADWEAR = [
  "none",
  "cap",
  "beanie",
  "headphones",
  "flower",
  "crown",
  "bow",
] as const;
export const CUSTOMER_AVATAR_FACIAL_HAIR = [
  "none",
  "mustache",
  "goatee",
  "beard",
] as const;
export const CUSTOMER_AVATAR_EXTRAS = [
  "none",
  "earrings",
  "necklace",
  "scarf",
] as const;

export type CustomerAvatarGender = (typeof CUSTOMER_AVATAR_GENDERS)[number];
export type CustomerAvatarSkinTone =
  (typeof CUSTOMER_AVATAR_SKIN_TONES)[number];
export type CustomerAvatarHairStyle =
  (typeof CUSTOMER_AVATAR_HAIR_STYLES)[number];
export type CustomerAvatarHairColor =
  (typeof CUSTOMER_AVATAR_HAIR_COLORS)[number];
export type CustomerAvatarOutfitStyle =
  (typeof CUSTOMER_AVATAR_OUTFIT_STYLES)[number];
export type CustomerAvatarOutfitColor =
  (typeof CUSTOMER_AVATAR_OUTFIT_COLORS)[number];
export type CustomerAvatarEyewear = (typeof CUSTOMER_AVATAR_EYEWEAR)[number];
export type CustomerAvatarHeadwear = (typeof CUSTOMER_AVATAR_HEADWEAR)[number];
export type CustomerAvatarFacialHair =
  (typeof CUSTOMER_AVATAR_FACIAL_HAIR)[number];
export type CustomerAvatarExtra = (typeof CUSTOMER_AVATAR_EXTRAS)[number];

export interface CustomerAvatar {
  gender: CustomerAvatarGender;
  skinTone: CustomerAvatarSkinTone;
  hairStyle: CustomerAvatarHairStyle;
  hairColor: CustomerAvatarHairColor;
  outfitStyle: CustomerAvatarOutfitStyle;
  outfitColor: CustomerAvatarOutfitColor;
  /** Accessories came later, so looks saved before them leave these out. */
  eyewear?: CustomerAvatarEyewear;
  headwear?: CustomerAvatarHeadwear;
  facialHair?: CustomerAvatarFacialHair;
  extra?: CustomerAvatarExtra;
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

  @IsIn(CUSTOMER_AVATAR_OUTFIT_STYLES)
  outfitStyle: CustomerAvatarOutfitStyle;

  @IsIn(CUSTOMER_AVATAR_OUTFIT_COLORS)
  outfitColor: CustomerAvatarOutfitColor;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_EYEWEAR)
  eyewear?: CustomerAvatarEyewear;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_HEADWEAR)
  headwear?: CustomerAvatarHeadwear;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_FACIAL_HAIR)
  facialHair?: CustomerAvatarFacialHair;

  @IsOptional()
  @IsIn(CUSTOMER_AVATAR_EXTRAS)
  extra?: CustomerAvatarExtra;
}
