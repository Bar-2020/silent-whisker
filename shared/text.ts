// Small text helpers for code that more than one area runs. No imports besides the `.ts` extension
// rule: Node runs `scripts/` as it is.

/** The text without the spaces around it, or null when nothing is left (or there was no text). */
export const trimOrNull = (text: string | null): string | null => {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/** Words that were written in capitals: "BE'ER SHEVA" becomes "Be'er Sheva". */
export const titleCase = (text: string): string =>
  text
    .toLowerCase()
    .replace(
      /(^|[ \-(])([a-z])/g,
      (_, before: string, letter: string) => before + letter.toUpperCase()
    );
