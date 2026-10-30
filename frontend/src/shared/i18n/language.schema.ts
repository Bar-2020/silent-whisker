import { z } from 'zod';
import { LANGUAGES } from '@constants/languages';

export const languageSchema = z.enum(LANGUAGES.map((language) => language.code));
