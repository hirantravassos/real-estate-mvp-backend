/** Escapes the LIKE wildcards, so the typed text is matched literally. */
export const escapeLikePattern = (text: string): string =>
  text.replace(/[\\%_]/g, (character) => `\\${character}`);
