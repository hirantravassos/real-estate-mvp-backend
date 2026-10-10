import { IsIn } from "class-validator";

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
] as const;
export const CUSTOMER_AVATAR_HAIR_COLORS = [
  "black",
  "brown",
  "blonde",
  "ginger",
  "gray",
  "pink",
] as const;
export const CUSTOMER_AVATAR_OUTFIT_STYLES = [
  "casual",
  "suit",
  "dress",
  "hoodie",
] as const;
export const CUSTOMER_AVATAR_OUTFIT_COLORS = [
  "coral",
  "sky",
  "mint",
  "sunflower",
  "lavender",
  "graphite",
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

export interface CustomerAvatar {
  gender: CustomerAvatarGender;
  skinTone: CustomerAvatarSkinTone;
  hairStyle: CustomerAvatarHairStyle;
  hairColor: CustomerAvatarHairColor;
  outfitStyle: CustomerAvatarOutfitStyle;
  outfitColor: CustomerAvatarOutfitColor;
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
}
