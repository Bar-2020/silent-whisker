import { describe, expect, it } from 'vite-plus/test';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, resolve, relative, extname } from 'path';

/**
 * docs/ is the source of truth and is navigated by following links. A dead
 * link sends a reader, human or agent, to the wrong rule, so the
 * cross-references are checked rather than trusted.
 *
 * This is also the check that proves `npm run verify` works end to end while the
 * repo still has no application code.
 */

const REPO_ROOT = resolve(__dirname, '..');
const SCANNED_DIRS = ['docs', '.claude/instructions'];
const SCANNED_ROOT_FILES = ['README.md', 'CLAUDE.md'];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extname(entry.name) === '.md' ? [full] : [];
  });
}

function markdownFiles(): string[] {
  const fromDirs = SCANNED_DIRS.filter((d) => existsSync(join(REPO_ROOT, d))).flatMap((d) =>
    walk(join(REPO_ROOT, d))
  );
  const fromRoot = SCANNED_ROOT_FILES.map((f) => join(REPO_ROOT, f)).filter((f) => existsSync(f));
  return [...fromDirs, ...fromRoot].sort((a, b) => a.localeCompare(b));
}

/**
 * Fenced code blocks hold example links that are not meant to resolve. Each
 * block is replaced by the newlines it spanned rather than by nothing, so the
 * line numbers in a failure message still point at the real line.
 */
function stripFencedCode(markdown: string): string {
  return markdown.replace(/^```[\s\S]*?^```/gm, (block) =>
    '\n'.repeat(block.split('\n').length - 1)
  );
}

/**
 * GitHub's heading-anchor algorithm: lowercase, drop HTML tags and inline
 * markdown punctuation, keep letters, numbers, underscores and hyphens, then
 * turn each remaining space into a hyphen. Repeated hyphens are kept, which is
 * why "A - B" anchors as "a---b".
 */
function slugify(headingText: string): string {
  return headingText
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '')
    .replace(/ /g, '-');
}

function anchorsIn(filePath: string): Set<string> {
  const source = readFileSync(filePath, 'utf8');
  const anchors = new Set<string>();

  for (const [, text] of stripFencedCode(source).matchAll(/^#{1,6}\s+(.*)$/gm)) {
    anchors.add(slugify(text));
  }
  // Explicit anchors: rules may carry <a id="r-01"></a>.
  for (const [, id] of source.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) {
    anchors.add(id);
  }
  return anchors;
}

interface Link {
  file: string;
  target: string;
  line: number;
}

function linksIn(filePath: string): Link[] {
  const lines = stripFencedCode(readFileSync(filePath, 'utf8')).split('\n');
  const links: Link[] = [];
  lines.forEach((line, index) => {
    for (const [, target] of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|tel:|#!)/.test(target)) continue;
      links.push({ file: filePath, target, line: index + 1 });
    }
  });
  return links;
}

const anchorCache = new Map<string, Set<string>>();
function anchorsFor(filePath: string): Set<string> {
  const cached = anchorCache.get(filePath);
  if (cached) return cached;
  const anchors = anchorsIn(filePath);
  anchorCache.set(filePath, anchors);
  return anchors;
}

describe('documentation cross-references', () => {
  const files = markdownFiles();

  it('finds markdown to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [relative(REPO_ROOT, f), f]))('%s links resolve', (_name, filePath) => {
    const failures: string[] = [];

    for (const link of linksIn(filePath)) {
      const [rawPath, anchor] = link.target.split('#');
      const targetPath = rawPath === '' ? filePath : resolve(dirname(filePath), rawPath);
      const where = `${relative(REPO_ROOT, link.file)}:${String(link.line)}`;

      if (!existsSync(targetPath)) {
        failures.push(`${where} -> ${link.target} (no such file)`);
        continue;
      }
      if (!anchor) continue;
      if (statSync(targetPath).isDirectory() || extname(targetPath) !== '.md') continue;

      if (!anchorsFor(targetPath).has(anchor)) {
        failures.push(
          `${where} -> ${link.target} (no such anchor in ${relative(REPO_ROOT, targetPath)})`
        );
      }
    }

    expect(failures).toEqual([]);
  });
});

/**
 * The specs must stay simple. A section that outgrows its budget gets split or
 * cut, not stretched.
 */
const MAX_SPEC_LINES = 150;
// The design-token file the design tool reads (a YAML block and eight fixed sections): its size
// follows that format, not the prose-spec budget.
const DESIGN_SPEC = 'DESIGN.md';

describe('spec size budget', () => {
  const specs = readdirSync(join(REPO_ROOT, 'docs')).filter(
    (f) => extname(f) === '.md' && f !== DESIGN_SPEC
  );

  it.each(specs)('docs/%s stays within the line budget', (name) => {
    const lines = readFileSync(join(REPO_ROOT, 'docs', name), 'utf8').split('\n').length;
    expect(lines).toBeLessThanOrEqual(MAX_SPEC_LINES);
  });
});

/**
 * A cited rule or decision that does not exist sends a reader to nothing. Every R-nn and D-nn a
 * spec mentions must have a row in RULES.md or DECISIONS.md.
 */
function definedIds(file: string, prefix: string): Set<string> {
  const ids = new Set<string>();
  const source = readFileSync(join(REPO_ROOT, 'docs', file), 'utf8');
  for (const [, id] of source.matchAll(new RegExp(`^\\| (${prefix}-\\d+) \\|`, 'gm'))) {
    ids.add(id);
  }
  return ids;
}

describe('rule and decision references', () => {
  const defined = new Set([...definedIds('RULES.md', 'R'), ...definedIds('DECISIONS.md', 'D')]);
  const specs = readdirSync(join(REPO_ROOT, 'docs')).filter((f) => extname(f) === '.md');

  it.each(specs)('docs/%s cites only defined R-nn and D-nn', (name) => {
    const text = readFileSync(join(REPO_ROOT, 'docs', name), 'utf8');
    const unknown = [...text.matchAll(/\b[RD]-\d+\b/g)]
      .map(([id]) => id)
      .filter((id) => !defined.has(id));
    expect(unknown).toEqual([]);
  });
});
