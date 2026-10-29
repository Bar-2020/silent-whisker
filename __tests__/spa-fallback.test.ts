import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { describe, expect, it } from 'vite-plus/test';

/**
 * infra/app/spa-fallback.js is the CloudFront Function that turns an address with no file behind it
 * into index.html (D-63). Terraform tests can only see that it is attached; this runs its code, so
 * a change that serves a page as a missing file, or a file as a page, fails here.
 */

interface Request {
  uri: string;
}
type Handler = (event: { request: Request }) => Request;

function loadHandler(): Handler {
  const context: { handler?: Handler } = {};
  runInNewContext(
    readFileSync(resolve(__dirname, '../infra/app/spa-fallback.js'), 'utf8'),
    context
  );
  if (!context.handler) throw new Error('spa-fallback.js defines no handler function');
  return context.handler;
}

const handler = loadHandler();
const uriAfter = (uri: string) => handler({ request: { uri } }).uri;

describe('the function that serves the app for its own pages', () => {
  it.each(['/', '/auth/callback', '/auth/callback/', '/profile', '/spots/12'])(
    'answers the page %s with index.html',
    (uri) => {
      expect(uriAfter(uri)).toBe('/index.html');
    }
  );

  it.each(['/index.html', '/assets/index-4f9c2a.js', '/assets/style.css', '/locales/he.json'])(
    'leaves the file %s alone',
    (uri) => {
      expect(uriAfter(uri)).toBe(uri);
    }
  );
});
