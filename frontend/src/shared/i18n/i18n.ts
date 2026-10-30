import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
} from '../../../../shared/constants/languages';
import { localeSchema } from './locale.schema';
import { languageSchema, storedLanguageSchema, type LanguageCode } from './language.schema';

function readStoredLanguage(): LanguageCode {
  try {
    return storedLanguageSchema.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

i18n.on('languageChanged', (code) => {
  const language = LANGUAGES.find((entry) => entry.code === code);
  if (!language) return;
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.dir;
  if (i18n.hasResourceBundle(code, 'translation')) document.title = i18n.t('app.name');
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language.code);
  } catch {
    // Storage is blocked (a private window): the choice is only not remembered.
  }
});

/** Resolves once the first language file is in, and throws if it could not be loaded (D-32). */
export async function initI18n() {
  await i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      lng: readStoredLanguage(),
      supportedLngs: languageSchema.options,
      fallbackLng: false,
      keySeparator: false,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      backend: {
        loadPath: '/locales/{{lng}}.json',
        parse: (data: string) => localeSchema.parse(JSON.parse(data)),
      },
    });
  // init resolves even when the file failed, and every t() would then answer its own key.
  if (!i18n.hasResourceBundle(i18n.language, 'translation')) {
    throw new Error(`The ${i18n.language} language file did not load`);
  }
}
