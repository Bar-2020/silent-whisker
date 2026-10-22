// Copies the logo into banner.svg and social-preview.svg, which embed it as a nested <svg>.
// Edit .github/assets/src/logo.svg, then run: node scripts/inline-logo.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../.github/assets/src/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8').replaceAll('\r\n', '\n');

const logo = read('logo.svg');
const inner = logo.slice(logo.indexOf('>', logo.indexOf('<svg')) + 1, logo.lastIndexOf('</svg>'));
const body = inner.replace(/\s*<title[^>]*>.*?<\/title>/, '');

const nested =
  /(<svg x="\d+" y="\d+" width="\d+" height="\d+" viewBox="0 0 512 512">)[\s\S]*?(<\/svg>)/;

for (const name of ['banner.svg', 'social-preview.svg']) {
  const svg = read(name);
  if (!nested.test(svg)) throw new Error(`${name}: nested logo <svg> not found`);
  writeFileSync(
    new URL(name, dir),
    svg.replace(nested, (_, open, close) => open + body + close)
  );
}
