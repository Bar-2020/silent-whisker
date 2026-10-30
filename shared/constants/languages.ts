/** One entry per language, with its locale file in frontend/public/locales/ (D-32, D-85). */
export const LANGUAGES = [
  { code: 'he', dir: 'rtl', label: 'עברית' },
  { code: 'en', dir: 'ltr', label: 'English' },
  { code: 'ar', dir: 'rtl', label: 'العربية' },
  { code: 'ru', dir: 'ltr', label: 'Русский' },
] as const;

export const DEFAULT_LANGUAGE = 'he';

export const LANGUAGE_STORAGE_KEY = 'language';
