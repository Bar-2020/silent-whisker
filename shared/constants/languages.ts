/**
 * One entry per language, with its locale file in frontend/public/locales/ (D-32, D-85). `retry` is
 * the word of the screen shown when that file cannot load, so it cannot come from the file (D-102).
 */
export const LANGUAGES = [
  { code: 'he', dir: 'rtl', label: 'עברית', retry: 'ניסיון חוזר' },
  { code: 'en', dir: 'ltr', label: 'English', retry: 'Try again' },
  { code: 'ar', dir: 'rtl', label: 'العربية', retry: 'إعادة المحاولة' },
  { code: 'ru', dir: 'ltr', label: 'Русский', retry: 'Повторить' },
] as const;

export const DEFAULT_LANGUAGE = 'he';

export const LANGUAGE_STORAGE_KEY = 'language';
