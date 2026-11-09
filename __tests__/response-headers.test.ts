import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';
import securityHeaders from '../shared/constants/security-headers.json';

/**
 * Every CloudFront behavior must point to a response headers policy, and every such policy must send
 * the four security headers (INFRA-07, D-59, D-103). A Terraform test sees only today's resources and
 * cannot tell a behavior added later from a bare one, so this reads the text of every `.tf` file in
 * `infra/app`, the same way table-protection.test.ts does. It reads the structure (blocks and
 * attributes), never an exact policy string, so a sign-in host or the geocoder added to the app's
 * policy later (D-59, D-88) does not break it.
 */

const APP_DIR = resolve(__dirname, '../infra/app');
const HSTS_KEY = 'hsts_max_age_seconds' satisfies keyof typeof securityHeaders;

// --- A small reader for the parts of HCL these checks need -------------------------------------

interface Scanned {
  /** The source with comments blanked; strings intact. */
  code: string;
  /** The same length as `code`, with the inside of every string made inert, so braces are structure only. */
  masked: string;
  /** The inside of every string literal and heredoc. */
  literals: string[];
}

interface Block {
  type: string;
  labels: string[];
  open: number;
  close: number;
  src: Scanned;
}

interface Token {
  length: number;
  code: string;
  masked: string;
  literal?: string;
}

const COMMENT = /#[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\//y;
const HEREDOC = /<<-?(?<tag>[A-Za-z_]\w*)\n(?<body>[\s\S]*?)\n[ \t]*\k<tag>[ \t]*(?=\n|$)/y;
const HEADER = /^[ \t]*(?<type>[A-Za-z_]\w*)(?<labels>(?:[ \t]+"[^"\n]*")*)[ \t]*$/;

const blank = (text: string) => text.replace(/[^\n]/g, ' ');
const inert = (text: string) => text.replace(/[^\w\s]/g, '_');

function matchAt(pattern: RegExp, text: string, at: number) {
  pattern.lastIndex = at;
  return pattern.exec(text);
}

/** From the `{` of an interpolation to just after its `}`, whatever strings sit inside. */
function skipBraces(text: string, open: number): number {
  let depth = 0;
  let i = open;
  do {
    if (text[i] === '"') i = readString(text, i) - 1;
    else if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  } while (depth > 0 && i < text.length);
  return i;
}

/** From an opening quote to just after the closing one. */
function readString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length && text[i] !== '"') {
    const here = text[i];
    const next = text[i + 1];
    // A backslash escapes the next character; `$$` and `%%` escape an interpolation.
    if (here === '\\' || (here === next && '$%'.includes(here))) i++;
    else if ((here === '$' || here === '%') && next === '{') i = skipBraces(text, i + 1) - 1;
    i++;
  }
  return i + 1;
}

function tokenAt(text: string, i: number): Token {
  const comment = matchAt(COMMENT, text, i);
  if (comment) {
    const gap = blank(comment[0]);
    return { length: comment[0].length, code: gap, masked: gap };
  }
  const heredoc = matchAt(HEREDOC, text, i);
  if (heredoc?.groups) {
    return {
      length: heredoc[0].length,
      code: heredoc[0],
      masked: inert(heredoc[0]),
      literal: heredoc.groups.body,
    };
  }
  if (text[i] === '"') {
    const raw = text.slice(i, readString(text, i));
    const inside = raw.slice(1, -1);
    return { length: raw.length, code: raw, masked: `"${inert(inside)}"`, literal: inside };
  }
  return { length: 1, code: text[i], masked: text[i] };
}

function scan(text: string): Scanned {
  const scanned: Scanned = { code: '', masked: '', literals: [] };
  let i = 0;
  while (i < text.length) {
    const token = tokenAt(text, i);
    scanned.code += token.code;
    scanned.masked += token.masked;
    if (token.literal !== undefined) scanned.literals.push(token.literal);
    i += token.length;
  }
  return scanned;
}

function matchingBrace(masked: string, open: number): number {
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === '{') depth++;
    if (masked[i] === '}') depth--;
    if (depth === 0) return i;
  }
  return masked.length;
}

/** The blocks written directly in `from..to`; an object in an expression (`x = {`) is not a block. */
function blocksIn(src: Scanned, from: number, to: number): Block[] {
  const found: Block[] = [];
  let i = from;
  while (i < to) {
    if (src.masked[i] !== '{') {
      i++;
      continue;
    }
    const close = matchingBrace(src.masked, i);
    const lineStart = Math.max(src.masked.lastIndexOf('\n', i) + 1, from);
    const header = HEADER.exec(src.masked.slice(lineStart, i));
    if (header?.groups) {
      const labels = [...header.groups.labels.matchAll(/"([^"]*)"/g)].map((label) => label[1]);
      found.push({ type: header.groups.type, labels, open: i, close, src });
    }
    i = close + 1;
  }
  return found;
}

const childrenOf = (block: Block) => blocksIn(block.src, block.open + 1, block.close);

/** The body of a block with everything inside nested braces blanked, so only its own lines remain. */
function ownLevel(block: Block): string {
  let depth = 0;
  let own = '';
  for (let i = block.open + 1; i < block.close; i++) {
    const char = block.src.masked[i];
    if (char === '}') depth--;
    const nested = depth > 0 || char === '{' || char === '}';
    own += nested && char !== '\n' ? ' ' : char;
    if (char === '{') depth++;
  }
  return own;
}

/** The text on the right of `name = ` in the block itself (not in a nested block), or undefined. */
function attributeOf(block: Block | undefined, name: string): string | undefined {
  if (!block) return undefined;
  const own = ownLevel(block);
  const found = new RegExp(`(?:^|[\\s,;])${name}[ \\t]*=(?!=)[ \\t]*`, 'm').exec(own);
  if (!found) return undefined;
  const start = found.index + found[0].length;
  const lineEnd = own.indexOf('\n', start);
  const end = lineEnd === -1 ? own.length : lineEnd;
  const from = block.open + 1;
  return block.src.code.slice(from + start, from + end).trim();
}

const isBlank = (expression: string | undefined) =>
  expression === undefined || ['', '""', 'null'].includes(expression);

// --- What the Terraform declares -----------------------------------------------------------------

const files = readdirSync(APP_DIR)
  .filter((file) => file.endsWith('.tf'))
  .map((file) => ({ file, src: scan(readFileSync(join(APP_DIR, file), 'utf8')) }));

function resourcesOf(type: string) {
  return files.flatMap(({ file, src }) =>
    blocksIn(src, 0, src.masked.length)
      .filter((block) => block.type === 'resource' && block.labels[0] === type)
      .map((block) => ({ id: `${file}: ${block.labels[1]}`, block }))
  );
}

const DEFAULT_BEHAVIOR = 'default_cache_behavior';
const ORDERED_BEHAVIOR = 'ordered_cache_behavior';

/** A `dynamic` ordered behavior counts once: its `content` block covers all of its paths. */
function behaviorsOf(distribution: Block) {
  return childrenOf(distribution).flatMap((child) => {
    if (child.type === DEFAULT_BEHAVIOR || child.type === ORDERED_BEHAVIOR) {
      return [{ kind: child.type, dynamic: false, block: child }];
    }
    if (
      child.type === 'dynamic' &&
      [DEFAULT_BEHAVIOR, ORDERED_BEHAVIOR].includes(child.labels[0])
    ) {
      const content = childrenOf(child).find((inner) => inner.type === 'content');
      return [{ kind: child.labels[0], dynamic: true, block: content ?? child }];
    }
    return [];
  });
}

const distributions = resourcesOf('aws_cloudfront_distribution');
const behaviors = distributions.flatMap(({ id, block }) =>
  behaviorsOf(block).map((behavior, index) => ({
    ...behavior,
    name: `${id} #${index + 1} (${behavior.dynamic ? 'dynamic ' : ''}${behavior.kind.split('_')[0]})`,
  }))
);
const policies = resourcesOf('aws_cloudfront_response_headers_policy');

const SECURITY_HEADERS = [
  'content_security_policy',
  'content_type_options',
  'referrer_policy',
  'strict_transport_security',
];

function headerBlock(policy: Block, header: string): Block | undefined {
  const config = childrenOf(policy).find((child) => child.type === 'security_headers_config');
  return config && childrenOf(config).find((child) => child.type === header);
}

// --- Content-Security-Policy strings ------------------------------------------------------------

/** A string literal that is a policy: it opens with, or has after a `;`, the `default-src` directive. */
const CSP_LITERAL = /(?:^|;)\s*default-src\b/;
const cspTexts = files.flatMap(({ src }) => src.literals).filter((text) => CSP_LITERAL.test(text));
const csps = cspTexts.map((text, index) => ({
  name: `Content-Security-Policy #${index + 1} of ${cspTexts.length}`,
  text,
}));

function directivesOf(csp: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of csp.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), sources);
  }
  return directives;
}

/** Every source of every directive, without quotes: `'unsafe-eval'` becomes `unsafe-eval`. */
const sourcesOf = (csp: string) =>
  [...directivesOf(csp).values()].flat().map((source) => source.replaceAll("'", '').toLowerCase());

const allowsNothing = (sources: string[] | undefined) =>
  sources?.length === 1 && sources[0] === "'none'";
const deniesEverything = (csp: string) => allowsNothing(directivesOf(csp).get('default-src'));
const cannotBeFramed = (csp: string) => allowsNothing(directivesOf(csp).get('frame-ancestors'));
const allowsInline = (csp: string) => sourcesOf(csp).includes('unsafe-inline');

// --- The reader itself, on text written here ------------------------------------------------------

/** The checks below read real files, which a mutation cannot reach; this proves the reader sees a bare spot. */
const SAMPLE = scan(
  [
    '# a comment with { and response_headers_policy_id = "commented"',
    'resource "aws_cloudfront_distribution" "demo" {',
    '  default_cache_behavior {',
    '    target_origin_id = "${var.a}-${join("}", ["x"])}"',
    '    response_headers_policy_id = aws_cloudfront_response_headers_policy.app.id # trailing',
    '  }',
    '  dynamic "ordered_cache_behavior" {',
    '    for_each = { a = { path = "/a/*" } }',
    '    content {',
    '      path_pattern = ordered_cache_behavior.value.path',
    '    }',
    '  }',
    '  ordered_cache_behavior {',
    '    forwarded_values {',
    '      response_headers_policy_id = "set only in a nested block"',
    '    }',
    '  }',
    '}',
    'resource "aws_cloudfront_response_headers_policy" "demo" {',
    '  security_headers_config {',
    '    content_type_options { override = false }',
    '    referrer_policy {',
    '      referrer_policy = ""',
    '      override        = true',
    '    }',
    '  }',
    '}',
  ].join('\n')
);

describe('the reader of Terraform text', () => {
  const [distribution, policy] = blocksIn(SAMPLE, 0, SAMPLE.masked.length);
  const [defaultBehavior, dynamicBehavior, bareBehavior] = behaviorsOf(distribution);

  // INFRA-07
  it('sees a policy set on a behavior, and not one that is commented out or in a nested block', () => {
    expect(distribution.labels).toEqual(['aws_cloudfront_distribution', 'demo']);
    expect(attributeOf(defaultBehavior.block, 'response_headers_policy_id')).toBe(
      'aws_cloudfront_response_headers_policy.app.id'
    );
    expect(isBlank(attributeOf(bareBehavior.block, 'response_headers_policy_id'))).toBe(true);
  });

  // INFRA-07
  it('counts a dynamic ordered behavior once, through its content block', () => {
    expect(dynamicBehavior.dynamic).toBe(true);
    expect(dynamicBehavior.block.type).toBe('content');
    expect(isBlank(attributeOf(dynamicBehavior.block, 'response_headers_policy_id'))).toBe(true);
  });

  // INFRA-07
  it('sees a header that is missing, one that does not override and one that is empty', () => {
    expect(headerBlock(policy, 'content_security_policy')).toBeUndefined();
    expect(attributeOf(headerBlock(policy, 'content_type_options'), 'override')).toBe('false');
    const referrer = headerBlock(policy, 'referrer_policy');
    expect(attributeOf(referrer, 'override')).toBe('true');
    expect(isBlank(attributeOf(referrer, 'referrer_policy'))).toBe(true);
  });

  // INFRA-07
  it('reads the sources of a Content-Security-Policy, with the quotes taken off', () => {
    const csp =
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'Unsafe-Inline'; frame-ancestors 'none'";
    expect(sourcesOf(csp)).toContain('unsafe-inline');
    expect(sourcesOf(csp)).not.toContain('unsafe-eval');
    expect(sourcesOf(`${csp}; style-src 'unsafe-eval'`)).toContain('unsafe-eval');
    expect(cannotBeFramed(csp)).toBe(true);
    expect(deniesEverything(csp)).toBe(false);
    expect(deniesEverything("default-src 'none'")).toBe(true);
    expect(cannotBeFramed("default-src 'none'")).toBe(false);
  });
});

// --- The checks ---------------------------------------------------------------------------------

describe('CloudFront response headers (INFRA-07, D-59, D-103)', () => {
  // INFRA-07, D-59, D-103
  it('finds a distribution, so the scan cannot pass by finding nothing', () => {
    expect(distributions.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it('finds a default behavior', () => {
    expect(behaviors.filter(({ kind }) => kind === DEFAULT_BEHAVIOR).length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it('finds an ordered behavior', () => {
    expect(behaviors.filter(({ kind }) => kind === ORDERED_BEHAVIOR).length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it('finds a response headers policy', () => {
    expect(policies.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it.each(behaviors)('$name sets a response headers policy', ({ block }) => {
    expect(isBlank(attributeOf(block, 'response_headers_policy_id'))).toBe(false);
  });

  // INFRA-07, D-59, D-103
  it.each(behaviors)(
    '$name uses a policy of this repository, not a literal or managed id',
    ({ block }) => {
      const policy = attributeOf(block, 'response_headers_policy_id') ?? '';
      expect(policy.startsWith('"')).toBe(false);
      expect(policy.startsWith('data.')).toBe(false);
    }
  );

  describe.each(policies)('policy $id', ({ block }) => {
    // INFRA-07, D-59, D-103
    it.each(SECURITY_HEADERS)('sends %s and overrides the origin', (header) => {
      const found = headerBlock(block, header);
      expect(found).toBeDefined();
      expect(attributeOf(found, 'override')).toBe('true');
    });

    // INFRA-07, D-59, D-103
    it('does not leave the Content-Security-Policy empty', () => {
      const csp = headerBlock(block, 'content_security_policy');
      expect(isBlank(attributeOf(csp, 'content_security_policy'))).toBe(false);
    });

    // INFRA-07, D-59, D-103
    it('does not leave the referrer policy empty', () => {
      const referrer = headerBlock(block, 'referrer_policy');
      expect(isBlank(attributeOf(referrer, 'referrer_policy'))).toBe(false);
    });

    // INFRA-07, D-59, D-103
    it('sets an HSTS max age that is not a number written in the file', () => {
      const hsts = headerBlock(block, 'strict_transport_security');
      const maxAge = attributeOf(hsts, 'access_control_max_age_sec');
      expect(isBlank(maxAge)).toBe(false);
      expect(/^[\d\s*+/().-]+$/.test(maxAge ?? '')).toBe(false);
    });
  });

  // INFRA-07, D-103
  it('reads the HSTS max age from shared/constants/security-headers.json', () => {
    expect(securityHeaders[HSTS_KEY]).toBeGreaterThan(0);
    expect(
      files.some(({ src }) => src.literals.some((text) => text.includes('security-headers.json')))
    ).toBe(true);
    expect(files.some(({ src }) => src.code.includes(HSTS_KEY))).toBe(true);
  });

  // INFRA-07, D-59, D-103
  it('finds at least one Content-Security-Policy string', () => {
    expect(csps.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it.each(csps)('$name allows no unsafe-eval', ({ text }) => {
    expect(sourcesOf(text).includes('unsafe-eval')).toBe(false);
  });

  // INFRA-07, D-59, D-103
  it("has the app's strict policy: it allows content, cannot be framed and allows no unsafe-inline", () => {
    const strictApp = csps.filter(
      ({ text }) => !deniesEverything(text) && cannotBeFramed(text) && !allowsInline(text)
    );
    expect(strictApp.length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it("has the API's policy: default-src 'none'", () => {
    expect(csps.filter(({ text }) => deniesEverything(text)).length).toBeGreaterThan(0);
  });

  // INFRA-07, D-59, D-103
  it("cannot frame an API: every policy with default-src 'none' also has frame-ancestors 'none'", () => {
    const api = csps.filter(({ text }) => deniesEverything(text));
    expect(api.length).toBeGreaterThan(0);
    expect(api.every(({ text }) => cannotBeFramed(text))).toBe(true);
  });
});
