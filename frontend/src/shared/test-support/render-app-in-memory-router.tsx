import { render } from '@testing-library/react';
import { createInstance } from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router';

import { ENGLISH_CODE, getLocaleMessages } from './locale-texts';
import { RouterLocationProbe } from './RouterLocationProbe';

/** Renders the app in its own i18n instance (the real locale file) and a memory router at `path`. */
export async function renderAppAtPath(
  app: ReactElement,
  path: string,
  languageCode = ENGLISH_CODE
): Promise<void> {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: languageCode,
    fallbackLng: false,
    resources: { [languageCode]: { translation: getLocaleMessages(languageCode) } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        {app}
        <RouterLocationProbe />
      </MemoryRouter>
    </I18nextProvider>
  );
}
