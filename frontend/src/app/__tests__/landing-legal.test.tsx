import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { App } from '@app/App';
import { CONTACT_EMAIL, SOURCE_CODE_URL } from '@constants/contact';
import { LANGUAGES } from '@constants/languages';

const localeSchema = z.record(z.string(), z.string());

const localeText = (code: string): string =>
  readFileSync(new URL(`../../../public/locales/${code}.json`, import.meta.url), 'utf8');

const locales = new Map<string, Record<string, string>>(
  LANGUAGES.map(({ code }) => [code, localeSchema.parse(JSON.parse(localeText(code)))])
);

const getLocale = (code: string): Record<string, string> => {
  const locale = locales.get(code);
  if (locale === undefined) throw new Error(`no locale ${code}`);
  return locale;
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const PRIVACY_SECTIONS = 8;
const TERMS_SECTIONS = 7;

async function renderRoute(
  path: string,
  code: string
): Promise<{ html: string; t: (k: string) => string }> {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: code,
    fallbackLng: false,
    resources: { [code]: { translation: getLocale(code) } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  const html = renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </I18nextProvider>
  );
  const t = (key: string): string => {
    const locale = getLocale(code);
    if (!Object.hasOwn(locale, key)) throw new Error(`${code}.json has no key ${key}`);
    return locale[key];
  };
  return { html, t };
}

const hasText = (html: string, text: string): boolean => html.includes(escapeHtml(text));

/** The opening tag of every <a> whose href matches. */
const anchorTags = (html: string, hrefPattern: RegExp): string[] =>
  (html.match(/<a\b[^>]*>/g) ?? []).filter((tag) => {
    const href = /\shref="([^"]*)"/.exec(tag);
    return href !== null && hrefPattern.test(href[1]);
  });

const headingIndex = (html: string, heading: string, from: number): number => {
  const re = new RegExp(
    `<h[1-6]\\b[^>]*>(?:\\s*<[^>]+>)*\\s*${escapeHtml(heading).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  );
  const hit = re.exec(html.slice(from));
  return hit ? from + hit.index : -1;
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new Error('no network in tests')));
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('locale files hold no literal contact address', () => {
  // LAND-05, D-74: the address is one constant, filled into {{email}}
  it.each(LANGUAGES.map(({ code }) => code))('%s.json does not contain CONTACT_EMAIL', (code) => {
    expect(localeText(code)).not.toContain(CONTACT_EMAIL);
  });
});

describe.each(LANGUAGES.map(({ code }) => code))('legal pages signed out, language %s', (code) => {
  const pages = [
    { path: '/privacy', name: 'privacy', sections: PRIVACY_SECTIONS },
    { path: '/terms', name: 'terms', sections: TERMS_SECTIONS },
  ] as const;

  describe.each(pages)('$path', ({ path, name, sections }) => {
    // LAND-05, R-22, D-68
    it('shows the title, the contents label and the draft notice', async () => {
      const { html, t } = await renderRoute(path, code);
      expect(hasText(html, t(`legal.${name}.title`))).toBe(true);
      expect(hasText(html, t('legal.toc'))).toBe(true);
      expect(hasText(html, t('legal.sample'))).toBe(true);
    });

    // LAND-05, R-22, D-68
    it('shows every section heading, in order', async () => {
      const { html, t } = await renderRoute(path, code);
      let from = 0;
      for (let n = 1; n <= sections; n += 1) {
        const heading = t(`legal.${name}.s${n}.h`);
        const at = headingIndex(html, heading, from);
        expect(
          at,
          `section ${n} heading "${heading}" after position ${from}`
        ).toBeGreaterThanOrEqual(0);
        from = at + 1;
      }
    });

    // LAND-05, D-74: the address is the one constant, as a mail link
    it('shows the contact address as a mailto link', async () => {
      const { html } = await renderRoute(path, code);
      expect(
        anchorTags(html, new RegExp(`^mailto:${CONTACT_EMAIL.replace(/\./g, '\\.')}$`)).length
      ).toBeGreaterThan(0);
      expect(html).not.toContain('{{email}}');
      expect(html).not.toContain('&lt;mail&gt;');
      expect(html).not.toContain('<mail>');
    });

    // LAND-05, R-22: only the landing page, policy, terms and translations are served unsigned
    it('asks for no /api/ route', async () => {
      const { html } = await renderRoute(path, code);
      expect(html).not.toContain('/api/');
      expect(
        fetchSpy.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/api/'))
      ).toEqual([]);
    });
  });
});

describe.each(LANGUAGES.map(({ code }) => code))('landing page signed out, language %s', (code) => {
  // LAND-06, D-39: the footer reaches the two public texts
  it('links to /terms and /privacy', async () => {
    const { html } = await renderRoute('/', code);
    expect(anchorTags(html, /^\/terms$/).length).toBeGreaterThan(0);
    expect(anchorTags(html, /^\/privacy$/).length).toBeGreaterThan(0);
  });

  // LAND-06, D-74
  it('has a contact link that is a mailto of the one constant, labelled common.contact', async () => {
    const { html, t } = await renderRoute('/', code);
    const mail = anchorTags(html, new RegExp(`^mailto:${CONTACT_EMAIL.replace(/\./g, '\\.')}$`));
    expect(mail.length).toBeGreaterThan(0);
    expect(hasText(html, t('common.contact'))).toBe(true);
  });

  // LAND-06: the repository opens in a new tab and gets no opener
  it('opens the source code link in a new tab without the opener', async () => {
    const { html, t } = await renderRoute('/', code);
    const tags = anchorTags(
      html,
      new RegExp(`^${SOURCE_CODE_URL.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`)
    );
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag).toMatch(/\starget="_blank"/);
      const rel = /\srel="([^"]*)"/.exec(tag)?.[1] ?? '';
      expect(rel.split(/\s+/)).toContain('noopener');
    }
    expect(hasText(html, t('landing.source'))).toBe(true);
  });

  // LAND-06: each top-bar anchor jumps to a section that exists
  it.each(['how-h', 'privacy-h', 'free-h'])(
    'anchor to #%s has a target element with that id',
    async (id) => {
      const { html } = await renderRoute('/', code);
      expect(anchorTags(html, new RegExp(`#${id}$`)).length).toBeGreaterThan(0);
      expect(html).toMatch(new RegExp(`\\sid="${id}"`));
    }
  );
});
