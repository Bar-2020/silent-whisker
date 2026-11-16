import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { z } from 'zod';

const FRONTEND_FOLDER = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PUBLIC_FOLDER = resolve(FRONTEND_FOLDER, 'public');
const MANIFEST_FILE = 'manifest.webmanifest';

const manifestSchema = z.object({
  name: z.string(),
  start_url: z.string(),
  display: z.string(),
  icons: z.array(z.object({ src: z.string(), sizes: z.string().optional() })),
});

const ICON_SIDE = 512;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** A PNG's width and height are the two 32-bit numbers that open its first chunk, after the 8-byte signature. */
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(resolve(PUBLIC_FOLDER, MANIFEST_FILE), 'utf8'))
);

/** The pixel size of a PNG file, read from its header bytes. */
function pngSize(file: string): { width: number; height: number } | null {
  const bytes = readFileSync(file);
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return null;
  return {
    width: bytes.readUInt32BE(PNG_WIDTH_OFFSET),
    height: bytes.readUInt32BE(PNG_HEIGHT_OFFSET),
  };
}

const publicFileOf = (src: string): string => resolve(PUBLIC_FOLDER, src.replace(/^\/+/, ''));

describe('the web manifest and the page that links it', () => {
  // SHELL-23, D-01, D-110: the page links the manifest
  it('is linked from index.html', () => {
    const html = readFileSync(resolve(FRONTEND_FOLDER, 'index.html'), 'utf8');
    const tags = html.match(/<link\b[^>]*>/gi) ?? [];
    const link = tags.find((tag) => /\brel\s*=\s*["']manifest["']/i.test(tag));
    expect(link).toBeDefined();
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(link ?? '')?.[1];
    expect(href?.replace(/^\/+/, '')).toBe(MANIFEST_FILE);
  });

  // SHELL-23, D-01, D-110: the name, the start page and the display mode
  it('names the app, starts at the root and opens as a standalone app', () => {
    expect(manifest.name).toBe('Silent Whisker');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  // SHELL-23, D-01: an icon exists in public/ and is 512 by 512 pixels, as its header says
  it('has an icon file in public/ that is 512 by 512 pixels', () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    const existing = manifest.icons.filter((icon) => existsSync(publicFileOf(icon.src)));
    expect(existing.map((icon) => icon.src)).toEqual(manifest.icons.map((icon) => icon.src));
    const sizes = existing.map((icon) => pngSize(publicFileOf(icon.src)));
    expect(sizes).toContainEqual({ width: ICON_SIDE, height: ICON_SIDE });
  });
});
