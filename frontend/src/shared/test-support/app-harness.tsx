import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, render } from '@testing-library/react';
import { createInstance } from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { z } from 'zod';

import { LANGUAGES } from '@constants/languages';

/** What the screen tests share: the real locale files, the app in a memory router, and a way to let it settle. */

export const EN = 'en';
export const CODES = LANGUAGES.map(({ code }) => code);

const localeSchema = z.record(z.string(), z.string());

const here = dirname(fileURLToPath(import.meta.url));

const localeText = (code: string): string =>
  readFileSync(resolve(here, '../../../public/locales', `${code}.json`), 'utf8');

const locales = new Map<string, Record<string, string>>(
  LANGUAGES.map(({ code }) => [code, localeSchema.parse(JSON.parse(localeText(code)))])
);

const getLocale = (code: string): Record<string, string> => {
  const locale = locales.get(code);
  if (locale === undefined) throw new Error(`no locale ${code}`);
  return locale;
};

/** The words of a key, as the locale file has them (placeholders still in). */
export const text = (code: string, key: string): string => {
  const locale = getLocale(code);
  if (!Object.hasOwn(locale, key)) throw new Error(`${code}.json has no key ${key}`);
  return locale[key];
};

/** Shows where the router is and how it got there (a replace is not a push). */
function Probe(): ReactElement {
  const location = useLocation();
  const type = useNavigationType();
  const label = `${location.pathname}${location.search}${location.hash}|${type}`;
  return <output data-testid="probe">{label}</output>;
}

/** Query results reach the screen a macrotask after the answer, and a page can chain several of them. */
export async function flush(rounds: number): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await act(async () => {
      await new Promise((done) => {
        setTimeout(done, 0);
      });
    });
  }
}

export async function renderApp(app: ReactElement, path: string, code = EN): Promise<void> {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: code,
    fallbackLng: false,
    resources: { [code]: { translation: getLocale(code) } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        {app}
        <Probe />
      </MemoryRouter>
    </I18nextProvider>
  );
}

const probe = (): string => document.querySelector('[data-testid="probe"]')?.textContent ?? '';
export const currentPath = (): string => probe().split('|')[0];
