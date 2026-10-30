import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { describe, expect, it } from 'vite-plus/test';

/**
 * infra/app/design-index.js serves the design mocks under /design/ (D-89). Terraform tests can
 * only see that it is attached; this runs its code, so a change that breaks the mocks' relative
 * links or their index page fails here.
 */

interface Request {
  uri: string;
}
interface Redirect {
  statusCode: number;
  headers: { location: { value: string } };
}
type Handler = (event: { request: Request }) => Request | Redirect;

function loadHandler(): Handler {
  const context: { handler?: Handler } = {};
  runInNewContext(
    readFileSync(resolve(__dirname, '../infra/app/design-index.js'), 'utf8'),
    context
  );
  if (!context.handler) throw new Error('design-index.js defines no handler function');
  return context.handler;
}

const handler = loadHandler();
const answerTo = (uri: string) => handler({ request: { uri } });

describe('the function that serves the design mocks', () => {
  it('sends /design to /design/, so the pages’ relative links resolve', () => {
    expect(answerTo('/design')).toMatchObject({
      statusCode: 301,
      headers: { location: { value: '/design/' } },
    });
  });

  it('answers /design/ with its index.html', () => {
    expect(answerTo('/design/')).toEqual({ uri: '/design/index.html' });
  });

  it.each(['/design/map.html', '/design/styles/tokens.css', '/design/locales/he.js'])(
    'leaves the file %s alone',
    (uri) => {
      expect(answerTo(uri)).toEqual({ uri });
    }
  );
});
