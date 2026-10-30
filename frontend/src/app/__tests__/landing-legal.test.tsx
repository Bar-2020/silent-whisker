// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { App } from '@app/App';
import { CONTACT_EMAIL, SOURCE_CODE_URL } from '@constants/contact';
import { LANGUAGES } from '@constants/languages';

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

const text = (code: string, key: string): string => {
  const locale = getLocale(code);
  if (!Object.hasOwn(locale, key)) throw new Error(`${code}.json has no key ${key}`);
  return locale[key];
};

const CODES = LANGUAGES.map(({ code }) => code);
const MAIL_HREF = `mailto:${CONTACT_EMAIL}`;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

const PAGES = [
  { path: '/privacy', name: 'privacy', sections: 8 },
  { path: '/terms', name: 'terms', sections: 7 },
] as const;

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new Error('no network in tests')));
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Opens `path` signed out in language `code`, lets effects run, and returns once the page has a heading. */
async function openRoute(path: string, code: string): Promise<void> {
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
        <App />
      </MemoryRouter>
    </I18nextProvider>
  );
  await waitFor(() => {
    expect(document.querySelector(HEADINGS)).not.toBeNull();
  });
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

const links = (): HTMLAnchorElement[] => Array.from(document.querySelectorAll('a'));
const linksTo = (href: string): HTMLAnchorElement[] =>
  links().filter((a) => a.getAttribute('href') === href);
const linksEndingWith = (suffix: string): HTMLAnchorElement[] =>
  links().filter((a) => (a.getAttribute('href') ?? '').endsWith(suffix));
const headings = (): Element[] => Array.from(document.querySelectorAll(HEADINGS));
const apiCalls = (): string[] =>
  fetchSpy.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/api/'));

/** The footer links every public page carries (D-39, D-74). */
function expectFooterLinks(code: string): void {
  expect(linksTo('/terms').length).toBeGreaterThan(0);
  expect(linksTo('/privacy').length).toBeGreaterThan(0);

  const mail = linksTo(MAIL_HREF);
  expect(mail.some((a) => a.textContent.includes(text(code, 'common.contact')))).toBe(true);

  const source = linksTo(SOURCE_CODE_URL);
  expect(source.some((a) => a.textContent.includes(text(code, 'landing.source')))).toBe(true);
  for (const a of source) {
    expect(a.getAttribute('target')).toBe('_blank');
    expect((a.getAttribute('rel') ?? '').split(/\s+/)).toContain('noopener');
  }
}

describe('locale files hold no literal contact address', () => {
  // LAND-05, D-74: the address is one constant, filled into {{email}}
  it.each(CODES)('%s.json does not contain CONTACT_EMAIL', (code) => {
    expect(localeText(code)).not.toContain(CONTACT_EMAIL);
  });
});

describe.each(CODES)('legal pages signed out, language %s', (code) => {
  describe.each(PAGES)('$path', ({ path, name, sections }) => {
    const ids = Array.from({ length: sections }, (_, i) => `${name}-${i + 1}`);

    // LAND-05, R-22, D-68
    it('shows its title and the contents label', async () => {
      await openRoute(path, code);
      const title = text(code, `legal.${name}.title`);
      expect(headings().some((h) => h.textContent.includes(title))).toBe(true);
      const toc = text(code, 'legal.toc');
      const labelled = Array.from(document.querySelectorAll('[aria-label]')).some(
        (el) => el.getAttribute('aria-label') === toc
      );
      expect(labelled || document.body.textContent.includes(toc)).toBe(true);
    });

    // LAND-05, R-22, D-68
    it('has its section headings in order, with the ids of the contents links', async () => {
      await openRoute(path, code);
      const sectionIds = headings()
        .map((h) => h.id)
        .filter((id) => id.startsWith(`${name}-`));
      expect(sectionIds).toEqual(ids);
      ids.forEach((id, i) => {
        const heading = document.getElementById(id);
        expect(heading?.textContent ?? '').toContain(text(code, `legal.${name}.s${i + 1}.h`));
      });
    });

    // LAND-05: each contents entry is a link to its section's heading
    it('has one contents link per section, in order, pointing at that heading', async () => {
      await openRoute(path, code);
      const toc = links().filter((a) => ids.some((id) => a.getAttribute('href') === `#${id}`));
      expect(toc.map((a) => a.getAttribute('href'))).toEqual(ids.map((id) => `#${id}`));
      toc.forEach((a, i) => {
        expect(a.textContent).toContain(text(code, `legal.${name}.s${i + 1}.h`));
      });
    });

    // LAND-05, D-74: the address is the one constant, as a mail link
    it('shows the contact address as a mail link, with no markup left over', async () => {
      await openRoute(path, code);
      const body = linksTo(MAIL_HREF).filter((a) => a.textContent === CONTACT_EMAIL);
      const seen = linksTo(MAIL_HREF).map((a) => a.textContent);
      expect(body.length, `mailto links on the page: ${JSON.stringify(seen)}`).toBeGreaterThan(0);
      expect(document.body.textContent).not.toContain('{{email}}');
      expect(document.body.textContent).not.toContain('<mail>');
    });

    // LAND-05, R-22: nothing is fetched from /api/ without a sign-in
    it('fetches nothing from /api/', async () => {
      await openRoute(path, code);
      expect(apiCalls()).toEqual([]);
    });

    // LAND-06, D-39, D-74: the legal pages carry the site footer
    it('carries the footer links', async () => {
      await openRoute(path, code);
      expectFooterLinks(code);
    });
  });
});

describe.each(CODES)('landing page signed out, language %s', (code) => {
  // LAND-06, D-39, D-74
  it('carries the footer links', async () => {
    await openRoute('/', code);
    expectFooterLinks(code);
  });

  // LAND-06, D-39, R-22: following a footer link opens the public text, still without /api/
  it.each(PAGES)('following the footer link to $path opens it', async ({ path, name }) => {
    await openRoute('/', code);
    const link = linksTo(path)[0];
    expect(link).toBeDefined();
    fireEvent.click(link);
    const title = text(code, `legal.${name}.title`);
    await waitFor(() => {
      expect(headings().some((h) => h.textContent.includes(title))).toBe(true);
    });
    expect(apiCalls()).toEqual([]);
  });

  // LAND-06: each top-bar anchor points at a section that exists
  it.each(['how-h', 'privacy-h', 'free-h'])('anchor to #%s has a target element', async (id) => {
    await openRoute('/', code);
    expect(linksEndingWith(`#${id}`).length).toBeGreaterThan(0);
    expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
  });

  // LAND-06, D-39: sign-in is not built yet, so every sign-in button is disabled
  it('has every sign-in button disabled, and clicking one does nothing', async () => {
    await openRoute('/', code);
    const labels = [text(code, 'landing.signInShort'), text(code, 'landing.signIn')];
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) =>
      labels.includes(b.textContent.trim())
    );
    // top bar, hero and the closing section
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    const before = window.location.href;
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(window.location.href).toBe(before);
    expect(apiCalls()).toEqual([]);
  });
});
