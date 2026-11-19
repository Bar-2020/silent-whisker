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
import { AFTER_SIGN_IN_PATH, SIGN_IN_IDENTITY_PROVIDER } from '@constants/sign-in';
import { fakeUserManager } from '@shared/test-support/sign-in-fakes';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: FAKE_COGNITO_DOMAIN };
});

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

/** The keys of each page's sections (`legal.<name>.s<key>.h`), in the order the page shows them. */
const PAGES = [
  { path: '/privacy', name: 'privacy', keys: [1, 2, 3, 4, 5, 6, 7, 8] },
  // LAND-07, D-117: "Data sources" (key 8) stands before the last section, "Changes to the terms" (key 7)
  { path: '/terms', name: 'terms', keys: [1, 2, 3, 4, 5, 6, 8, 7] },
] as const;

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fakeUserManager.reset();
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

/** The section headings of a legal page, in the order shown: their ids start with the page's name. */
const sectionHeadings = (name: string): Element[] =>
  headings().filter((h) => h.id.startsWith(`${name}-`));

describe.each(CODES)('legal pages signed out, language %s', (code) => {
  describe.each(PAGES)('$path', ({ path, name, keys }) => {
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
    it('has its section headings in order, each with an id of its own', async () => {
      await openRoute(path, code);
      const sections = sectionHeadings(name);
      expect(sections).toHaveLength(keys.length);
      expect(new Set(sections.map((h) => h.id)).size).toBe(keys.length);
      keys.forEach((key, i) => {
        expect(sections[i].textContent).toContain(text(code, `legal.${name}.s${key}.h`));
      });
    });

    // LAND-05: each contents entry is a link to its section's heading
    it('has one contents link per section, in order, pointing at that heading', async () => {
      await openRoute(path, code);
      const ids = sectionHeadings(name).map((h) => h.id);
      const toc = links().filter((a) => ids.some((id) => a.getAttribute('href') === `#${id}`));
      expect(toc.map((a) => a.getAttribute('href'))).toEqual(ids.map((id) => `#${id}`));
      toc.forEach((a, i) => {
        expect(a.textContent).toContain(text(code, `legal.${name}.s${keys[i]}.h`));
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

/** What follows a section's heading, up to the next section heading of the page. */
function sectionText(heading: Element, name: string): string {
  const parts: string[] = [];
  let next = heading.nextElementSibling;
  while (next !== null && !(next.matches(HEADINGS) && next.id.startsWith(`${name}-`))) {
    parts.push(next.textContent);
    next = next.nextElementSibling;
  }
  const found = parts.join(' ').trim();
  if (found === '') throw new Error('there is no text after the section heading');
  return found;
}

const DATA_SOURCES_KEY = 'legal.terms.s8.h';
const CHANGES_KEY = 'legal.terms.s7.h';

/** The heading of the Data sources section on the terms page shown in `code`. */
function dataSourcesHeading(code: string): Element {
  const found = sectionHeadings('terms').find((h) =>
    h.textContent.includes(text(code, DATA_SOURCES_KEY))
  );
  if (found === undefined) throw new Error('the terms have no Data sources heading');
  return found;
}

describe.each(CODES)('terms of use, the Data sources section, language %s', (code) => {
  // LAND-07, D-117
  it('stands before the last section, Changes to the terms, and is in the contents list', async () => {
    await openRoute('/terms', code);
    const sections = sectionHeadings('terms');
    const at = sections.indexOf(dataSourcesHeading(code));

    expect(sections[at + 1].textContent).toContain(text(code, CHANGES_KEY));
    expect(at + 2).toBe(sections.length);
    const entry = links().find((a) => a.getAttribute('href') === `#${sections[at].id}`);
    expect(entry?.textContent).toContain(text(code, DATA_SOURCES_KEY));
  });

  // LAND-07, D-117: the host name is the same in every language
  it('names data.gov.il as the source', async () => {
    await openRoute('/terms', code);

    expect(sectionText(dataSourcesHeading(code), 'terms')).toContain('data.gov.il');
  });
});

describe('terms of use, the Data sources section, in words (LAND-07, D-117)', () => {
  // LAND-07, D-117
  it('is the section Data sources, before Changes to the terms', () => {
    expect(text('en', DATA_SOURCES_KEY)).toBe('Data sources');
    expect(text('en', CHANGES_KEY)).toBe('Changes to the terms');
  });

  // LAND-07, D-117
  it('says where the city list comes from, under which licence, that the Agency does not sponsor or approve the app, and that it is given as is', async () => {
    await openRoute('/terms', 'en');
    const section = sectionText(dataSourcesHeading('en'), 'terms');

    expect(section).toContain('data.gov.il');
    expect(section).toContain('National Digital Agency');
    expect(section).toMatch(/licen[cs]e/i);
    expect(section).toMatch(/sponsor/i);
    expect(section).toMatch(/approv/i);
    expect(section).toMatch(/as[ -]is/i);
  });

  // LAND-07, D-117: only the address of a new spot is looked up by the server now
  it('leaves the privacy policy with no sentence that has the city looked up by the server', async () => {
    await openRoute('/privacy', 'en');
    const sentences = document.body.textContent.split(/(?<=[.!?])\s+/);
    const cityLookups = sentences.filter(
      (sentence) =>
        /\bcity\b/i.test(sentence) && /look(?:ed|s)?[ -]?up|search|geocod/i.test(sentence)
    );

    expect(cityLookups).toEqual([]);
    expect(document.body.textContent).toMatch(/address/i);
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

  // LAND-06, D-39, D-59: every sign-in button is enabled and starts the Google sign-in
  it('has every sign-in button enabled, starting the Google sign-in with AFTER_SIGN_IN_PATH', async () => {
    await openRoute('/', code);
    const labels = [text(code, 'landing.signInShort'), text(code, 'landing.signIn')];
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) =>
      labels.includes(b.textContent.trim())
    );
    // top bar, hero and the closing section
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    for (const [index, button] of buttons.entries()) {
      expect(button.disabled).toBe(false);
      fireEvent.click(button);
      await waitFor(() => {
        expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(index + 1);
      });
      expect(fakeUserManager.signinRedirect).toHaveBeenLastCalledWith({
        state: AFTER_SIGN_IN_PATH,
        extraQueryParams: { identity_provider: SIGN_IN_IDENTITY_PROVIDER },
      });
    }
    expect(apiCalls()).toEqual([]);
  });

  // SHELL-19, D-59: the redirect cannot start: the button shows the retry word, and a second press tries again
  it('shows the retry word on a sign-in button whose redirect fails, and tries again', async () => {
    fakeUserManager.signinRedirect.mockRejectedValue(new Error('cannot reach Google'));
    await openRoute('/', code);
    const label = text(code, 'landing.signInShort');
    const retryWord = text(code, 'common.retry');
    const first = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === label || b.textContent.trim() === text(code, 'landing.signIn')
    );
    expect(first).toBeDefined();
    if (first === undefined) return;

    fireEvent.click(first);
    await waitFor(() => {
      expect(first.textContent.trim()).toBe(retryWord);
    });
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(first.disabled).toBe(false);

    fireEvent.click(first);
    await waitFor(() => {
      expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(2);
    });
    expect(fakeUserManager.signinRedirect).toHaveBeenLastCalledWith({
      state: AFTER_SIGN_IN_PATH,
      extraQueryParams: { identity_provider: SIGN_IN_IDENTITY_PROVIDER },
    });
  });
});
