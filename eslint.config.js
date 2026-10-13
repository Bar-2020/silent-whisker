import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

// Hebrew is the primary language and the layout is fully right-to-left, so
// physical edges are always wrong in styles. `start`/`end` (CSS logical
// properties) flip with the writing direction; `left`/`right` do not. See
// .claude/instructions/hard-rules.md "RTL-safe styles". Plain .css files get the same check
// from stylelint once the web app exists.
const PHYSICAL_EDGE_PROPS = [
  'left',
  'right',
  'marginLeft',
  'marginRight',
  'paddingLeft',
  'paddingRight',
  'borderLeft',
  'borderRight',
  'borderLeftWidth',
  'borderRightWidth',
  'borderLeftColor',
  'borderRightColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'textAlign',
];

// Only object *expressions*: `{ marginLeft: 8 }` is a style, while
// `const { left, right } = rect` is an ObjectPattern and perfectly correct.
const RTL_SELECTORS = PHYSICAL_EDGE_PROPS.map((name) => ({
  selector: `ObjectExpression > Property[key.name="${name}"], ObjectExpression > Property[key.value="${name}"]`,
  message: `"${name}" is a physical edge and does not flip in RTL. Use the logical equivalent (start/end) instead. .claude/instructions/hard-rules.md, RTL-safe styles.`,
}));

export default defineConfig(
  { ignores: ['node_modules/', 'dist/', 'cdk.out/', 'coverage/', '.claude/skills/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      sonarjs.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { 'no-restricted-syntax': ['error', ...RTL_SELECTORS] },
  },
  {
    // Tests parse the repo's own trusted markdown, never untrusted input, so
    // the backtracking cost sonarjs warns about is not a real attack surface.
    files: ['__tests__/docs-links.test.ts'],
    rules: { 'sonarjs/super-linear-regex': 'off' },
  },
  prettierConfig
);
