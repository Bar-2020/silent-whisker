import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';
import securityHeaders from '../shared/constants/security-headers.json';

/**
 * Every CloudFront behavior sets a response headers policy of ours, the one named for its kind, and
 * every such policy sends the four security headers (INFRA-07, D-59, D-104). Reads every `.tf` file
 * in `infra/app` as text, like table-protection.test.ts, so a behavior added later is checked too.
 * Each check is its own case, and a failure prints kinds, counts or booleans, never a line of it.
 */

const APP_DIR = resolve(__dirname, '../infra/app');
const HSTS_KEY = 'hsts_max_age_seconds' satisfies keyof typeof securityHeaders;
const SECURITY_HEADERS = [
  'content_security_policy',
  'content_type_options',
  'referrer_policy',
  'strict_transport_security',
];
const KINDS = ['app', 'design', 'api'];

// Whole-line comments go; `/* */` stays, because a path pattern such as "/design/*" holds a `/*`.
const text = readdirSync(APP_DIR)
  .filter((file) => file.endsWith('.tf'))
  .map((file) => readFileSync(join(APP_DIR, file), 'utf8'))
  .join('\n')
  .replace(/^[ \t]*(?:#|\/\/).*$/gm, '');

/** The text inside every `header { ... }`, found by counting braces (a string's must balance). */
function bodies(source: string, header: RegExp): string[] {
  const opening = new RegExp(`${header.source}\\s*\\{`, 'g');
  const found: string[] = [];
  for (let match = opening.exec(source); match; match = opening.exec(source)) {
    let depth = 1;
    let end = opening.lastIndex;
    for (; depth > 0 && end < source.length; end++) {
      if (source[end] === '{') depth++;
      if (source[end] === '}') depth--;
    }
    found.push(source.slice(opening.lastIndex, end - 1));
  }
  return found;
}

/** What follows `=` on the first line of a block that starts with `name`, without a comment. */
function attribute(block: string, name: string): string {
  const line = block
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.startsWith(name) && row.includes('='));
  return (line?.slice(line.indexOf('=') + 1).split('#')[0] ?? '').trim();
}

const isBlank = (value: string) => ['', '""', 'null'].includes(value);

const distributions = bodies(text, /resource\s+"aws_cloudfront_distribution"\s+"\w+"/);
const policies = bodies(text, /resource\s+"aws_cloudfront_response_headers_policy"\s+"\w+"/).map(
  (body, index) => ({ name: `policy ${index + 1}`, body })
);

// The default behavior is the files (app). An ordered one with a /design or /api path is that kind;
// any other ordered one (`/locales/`, page addresses) is the app's too (D-104).
const behaviors = distributions
  .flatMap((distribution) =>
    [false, true].flatMap((ordered) => {
      const type = ordered ? 'ordered' : 'default';
      const header = new RegExp(`(?:dynamic\\s+")?${type}_cache_behavior"?`);
      return bodies(distribution, header).map((body) => ({ ordered, body }));
    })
  )
  .map(({ ordered, body }, index) => {
    const found = ['design', 'api'].filter((kind) =>
      new RegExp(`"/${kind}(?:[/*][^"]*)?"`).test(body)
    );
    const kinds = ordered && found.length > 0 ? found : ['app'];
    const expression = attribute(body, 'response_headers_policy_id');
    const label = `${ordered ? 'ordered' : 'default'}: ${kinds.join(' and ')}`;
    return { name: `behavior ${index + 1} (${label})`, ordered, kinds, expression };
  });

describe('the scan finds what it checks (INFRA-07, D-59, D-104)', () => {
  // INFRA-07, D-59, D-104
  it('finds a CloudFront distribution', () => {
    expect(distributions.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-104
  it('finds its default behavior', () => {
    expect(behaviors.some(({ ordered }) => !ordered)).toBe(true);
  });

  // INFRA-07, D-59, D-104
  it('finds its ordered behaviors', () => {
    expect(behaviors.some(({ ordered }) => ordered)).toBe(true);
  });

  // INFRA-07, D-59, D-104
  it('finds a response headers policy', () => {
    expect(policies.length).toBeGreaterThan(0);
  });
});

describe('every behavior (INFRA-07, D-59, D-104)', () => {
  // INFRA-07, D-59, D-104
  it.each(behaviors)('$name sets a response headers policy', ({ expression }) => {
    expect(isBlank(expression)).toBe(false);
  });

  // INFRA-07, D-59, D-104
  it.each(behaviors)('$name sets a policy of ours, not a managed one', ({ expression }) => {
    expect(expression.startsWith('aws_cloudfront_response_headers_policy.')).toBe(true);
  });

  // INFRA-07, D-104
  it.each(behaviors)('$name names its own kind', ({ kinds, expression }) => {
    expect(kinds.filter((kind) => !expression.includes(`"${kind}"`))).toEqual([]);
  });

  // INFRA-07, D-104
  it.each(behaviors)('$name names no other kind', ({ kinds, expression }) => {
    const others = KINDS.filter((kind) => !kinds.includes(kind));
    expect(others.filter((kind) => expression.includes(`"${kind}"`))).toEqual([]);
  });
});

describe.each(policies)('$name (INFRA-07, D-59, D-104)', ({ body }) => {
  const blocksOf = (header: string) => bodies(body, new RegExp(`\\b${header}`));
  const valueOf = (header: string, name = header) => attribute(blocksOf(header)[0] ?? '', name);
  const maxAge = () => valueOf('strict_transport_security', 'access_control_max_age_sec');

  // INFRA-07, D-59, D-104
  it.each(SECURITY_HEADERS)('sends %s', (header) => {
    expect(blocksOf(header).length).toBe(1);
  });

  // INFRA-07, D-59, D-104
  it.each(SECURITY_HEADERS)('sends %s with override = true', (header) => {
    expect(valueOf(header, 'override')).toBe('true');
  });

  // INFRA-07, D-59, D-104
  it('does not leave the Content-Security-Policy empty', () => {
    expect(isBlank(valueOf('content_security_policy'))).toBe(false);
  });

  // INFRA-07, D-59, D-104
  it('does not leave the referrer policy empty', () => {
    expect(isBlank(valueOf('referrer_policy'))).toBe(false);
  });

  // INFRA-07, D-104
  it('sets an HSTS max age', () => {
    expect(isBlank(maxAge())).toBe(false);
  });

  // INFRA-07, D-104
  it('sets an HSTS max age that is not a number written in the file', () => {
    expect(/^[\d\s*+/().-]+$/.test(maxAge())).toBe(false);
  });
});

describe('the HSTS max age (INFRA-07, D-104)', () => {
  // INFRA-07, D-104
  it('is a positive number in shared/constants/security-headers.json', () => {
    expect(securityHeaders[HSTS_KEY]).toBeGreaterThan(0);
  });

  // INFRA-07, D-104
  it('is read from shared/constants/security-headers.json by the Terraform', () => {
    expect(text).toContain('security-headers.json');
  });

  // INFRA-07, D-104
  it('is read under the key the constants file names', () => {
    expect(text).toContain(HSTS_KEY);
  });
});

describe('Content-Security-Policy strings (INFRA-07, D-59, D-104)', () => {
  // A string holding `default-src` is a policy; one built from several strings is not seen whole.
  const csps = [...text.matchAll(/"([^"\n]*\bdefault-src\b[^"\n]*)"/g)].map((match) => match[1]);
  const sourcesOf = (csp: string, directive: string) =>
    (new RegExp(`(?:^|;)\\s*${directive}\\s+([^;]*)`, 'i').exec(csp)?.[1] ?? '').trim();
  const allows = (csp: string, source: string) => csp.toLowerCase().includes(`'${source}'`);
  const deniesAll = (csp: string) => sourcesOf(csp, 'default-src') === "'none'";
  const unframable = (csp: string) => sourcesOf(csp, 'frame-ancestors') === "'none'";

  // INFRA-07, D-59, D-104
  it('finds at least one, so the scan cannot pass by finding nothing', () => {
    expect(csps.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-104
  it('allows no unsafe-eval', () => {
    expect(csps.filter((csp) => allows(csp, 'unsafe-eval')).length).toBe(0);
  });

  // INFRA-07, D-59, D-104
  it("has the app's: content allowed, cannot be framed, no unsafe-inline", () => {
    const app = csps.filter(
      (csp) => !deniesAll(csp) && unframable(csp) && !allows(csp, 'unsafe-inline')
    );
    expect(app.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-104
  it("has the API's, with default-src 'none'", () => {
    expect(csps.filter(deniesAll).length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-104
  it("cannot frame an API: every policy with default-src 'none' has frame-ancestors 'none'", () => {
    expect(csps.filter((csp) => deniesAll(csp) && !unframable(csp)).length).toBe(0);
  });
});
