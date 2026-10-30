import type { ParseKeys } from 'i18next';

/** A paragraph, or a bulleted list, of one section. Every text is a locale key. */
export type LegalBlock = { paragraph: ParseKeys } | { list: ParseKeys[] };

export interface LegalSection {
  heading: ParseKeys;
  blocks: LegalBlock[];
}
