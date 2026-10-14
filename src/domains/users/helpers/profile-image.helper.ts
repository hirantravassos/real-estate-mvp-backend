/** Folder of the brokers' profile photos in the bucket. */
export const PROFILE_IMAGE_FOLDER = "profile-images";

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** `profile-images/{userId}/{uuid}.webp`, the only shape the app stores. */
const PROFILE_IMAGE_KEY_PATTERN = new RegExp(
  `^${PROFILE_IMAGE_FOLDER}/${UUID_PATTERN}/${UUID_PATTERN}\\.webp$`,
);

export const isProfileImageKey = (value: string): boolean =>
  PROFILE_IMAGE_KEY_PATTERN.test(value);

export const profileImageKeyOf = (userId: string, fileName: string) =>
  `${PROFILE_IMAGE_FOLDER}/${userId.toLowerCase()}/${fileName.toLowerCase()}`;

/**
 * What the API answers for the stored photo: the public path, relative to
 * the API address, that serves it. Anything that is not a key we wrote
 * (old or broken values) is dropped, so the app falls back to the character.
 */
export const profileImagePathOf = (
  storedValue: string | null | undefined,
): string | null =>
  storedValue && isProfileImageKey(storedValue) ? `/${storedValue}` : null;
