import type en from '../../../public/locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    keySeparator: false;
    resources: { translation: typeof en };
  }
}
