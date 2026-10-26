import { RuleTester } from 'vite-plus/lint/plugins-dev';
import { describe, it } from 'vite-plus/test';
import plugin from '../lint/silent-whisker-plugin.js';

/**
 * The hard rules in .claude/instructions/hard-rules.md are enforced by selector rules in
 * lint/silent-whisker-plugin.js. A selector that stops matching reports nothing, so
 * `npm run verify` would stay green with the rule dead. Each rule is pinned here to code it must
 * flag and code it must leave alone.
 */
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'tsx' } } });

// hard-rules.md, "RTL-safe styles".
tester.run('rtl-logical-properties', plugin.rules['rtl-logical-properties'], {
  valid: [
    'const { left, right } = rect;',
    'const style = { marginInlineStart: 8, insetInlineEnd: 0 };',
  ],
  invalid: [
    { code: 'const s = { marginLeft: 8 };', errors: [{ message: /marginLeft/ }] },
    { code: "const s = { 'paddingRight': 4 };", errors: [{ message: /paddingRight/ }] },
    { code: 'const s = { left: 0 };', errors: [{ message: /"left"/ }] },
    { code: "const s = { textAlign: 'left' };", errors: [{ message: /textAlign/ }] },
  ],
});

// D-33 (no inline styles).
tester.run('no-inline-styles', plugin.rules['no-inline-styles'], {
  valid: ['const a = <div className="card" />;', 'const k = styles.card;'],
  invalid: [
    { code: "const a = <div style={{ color: 'red' }} />;", errors: [{ message: /inline styles/ }] },
    { code: "node.style.color = 'red';", errors: [{ message: /inline styles/ }] },
  ],
});

// D-33 (no magic numbers: constants live in src/constants/).
tester.run(
  'numeric-constants-live-in-constants',
  plugin.rules['numeric-constants-live-in-constants'],
  {
    valid: [
      'export const ZERO = 0;',
      'export const ONE = 1;',
      'export const MINUS_ONE = -1;',
      "const LABEL = '10';",
      'function area() { const w = 30; return w; }',
    ],
    invalid: [
      { code: 'const LIMIT = 30;', errors: [{ message: /src\/constants/ }] },
      { code: 'export const LIMIT = 30;', errors: [{ message: /src\/constants/ }] },
      { code: 'export const OFFSET = -5;', errors: [{ message: /src\/constants/ }] },
      { code: 'const RATIO = 0.5;', errors: [{ message: /src\/constants/ }] },
    ],
  }
);

// R-05 (every metered AWS call goes through one function that checks the daily cap).
tester.run(
  'paid-calls-go-through-metered-call',
  plugin.rules['paid-calls-go-through-metered-call'],
  {
    valid: [
      "import { PublishCommand } from '@aws-sdk/client-sns';",
      "import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';\nimport { meteredCall } from './metered-call';",
      "import { meteredCall } from '../shared/metered-call';\nimport { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';",
      "import type { InvokeModelCommandInput } from '@aws-sdk/client-bedrock-runtime';",
      "import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';\nimport { meteredCall } from './metered-call.js';",
      "import { DetectLabelsCommand } from '@aws-sdk/client-rekognition';\nimport { meteredCall } from '@/functions/shared/metered-call';",
    ],
    invalid: [
      {
        code: "import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';",
        errors: [{ message: /meteredCall/ }],
      },
      {
        code: "import { SearchPlaceIndexForTextCommand } from '@aws-sdk/client-location';",
        errors: [{ message: /meteredCall/ }],
      },
      {
        code: "import { DetectLabelsCommand } from '@aws-sdk/client-rekognition';",
        errors: [{ message: /meteredCall/ }],
      },
      {
        code: "import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime/dist-types/commands';",
        errors: [{ message: /meteredCall/ }],
      },
      {
        code: "import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';\nimport { takeDailyAllowance } from './metered-call.types';",
        errors: [{ message: /meteredCall/ }],
      },
    ],
  }
);
