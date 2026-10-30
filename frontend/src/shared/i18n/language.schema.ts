import { z } from 'zod';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../../../../shared/constants/languages';

export const languageSchema = z.enum(LANGUAGES.map((language) => language.code));

export type LanguageCode = z.infer<typeof languageSchema>;

/** A stored choice that is missing or unknown means the default (D-85). */
export const storedLanguageSchema = languageSchema.catch(DEFAULT_LANGUAGE);
