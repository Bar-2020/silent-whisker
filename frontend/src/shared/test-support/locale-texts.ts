import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { LANGUAGES } from '@constants/languages';

/** The language the screen tests read by default; not the app's own default (`DEFAULT_LANGUAGE`). */
export const ENGLISH_CODE = 'en';
export const LANGUAGE_CODES = LANGUAGES.map(({ code }) => code);

const localeMessagesSchema = z.record(z.string(), z.string());

const thisFolder = dirname(fileURLToPath(import.meta.url));

const readLocaleFile = (code: string): string =>
  readFileSync(resolve(thisFolder, '../../../public/locales', `${code}.json`), 'utf8');

const localeMessagesByCode = new Map<string, Record<string, string>>(
  LANGUAGES.map(({ code }) => [code, localeMessagesSchema.parse(JSON.parse(readLocaleFile(code)))])
);

/** Every key of a language's real locale file, as the app would load it. */
export const getLocaleMessages = (code: string): Record<string, string> => {
  const messages = localeMessagesByCode.get(code);
  if (messages === undefined) throw new Error(`no locale ${code}`);
  return messages;
};

/** The words of a key, as the locale file has them (placeholders still in). */
export const getLocaleText = (code: string, key: string): string => {
  const messages = getLocaleMessages(code);
  if (!Object.hasOwn(messages, key)) throw new Error(`${code}.json has no key ${key}`);
  return messages[key];
};
