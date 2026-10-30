import { z } from 'zod';
import { LANGUAGES } from '../../../../shared/constants/languages';

export const languageSchema = z.enum(LANGUAGES.map((language) => language.code));
