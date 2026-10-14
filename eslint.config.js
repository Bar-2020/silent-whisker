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

// Styles live in a .css file beside the component, never in the markup or on
// an element. See .claude/instructions/hard-rules.md "No inline styles".
const NO_INLINE_STYLE_MESSAGE =
  'No inline styles. Move the rule to a .css file beside the component and switch a class or a data-* attribute. .claude/instructions/hard-rules.md, No inline styles.';
const INLINE_STYLE_SELECTORS = [
  'JSXAttribute[name.name="style"]',
  'MemberExpression[property.name="style"]',
].map((selector) => ({ selector, message: NO_INLINE_STYLE_MESSAGE }));

// ESLint's no-magic-numbers lets `const LIMIT = 30` through anywhere, which
// would leave limits scattered across logic files. Constants belong in
// src/constants/, so a numeric top-level const is rejected everywhere else.
const NUMERIC_CONST_MESSAGE =
  'Numeric constants live in src/constants/. Move this one there and import it. .claude/instructions/hard-rules.md, Constants.';
// Any number but 0 and 1, fractions included, and the same behind a unary minus.
// A string such as '10' is not a number and passes.
const NUMERIC_CONST_SELECTORS = [
  'Program > VariableDeclaration > VariableDeclarator',
  'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator',
]
  .flatMap((declarator) => [
    `${declarator} > Literal[value=type(number)]:not([value=0]):not([value=1])`,
    `${declarator} > UnaryExpression[operator="-"] > Literal[value=type(number)]:not([value=1])`,
  ])
  .map((selector) => ({ selector, message: NUMERIC_CONST_MESSAGE }));

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
    rules: { 'no-restricted-syntax': ['error', ...RTL_SELECTORS, ...INLINE_STYLE_SELECTORS] },
  },
  {
    // Business logic holds no magic numbers: limits, timeouts, sizes and counts
    // are named in src/constants/. 0, 1 and -1 stay readable in place. Tests
    // use literals freely. A later rule block replaces the earlier
    // no-restricted-syntax list instead of merging, so this one repeats it.
    files: ['src/**/*.{ts,tsx}', 'functions/**/*.ts'],
    ignores: ['src/constants/**', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...RTL_SELECTORS,
        ...INLINE_STYLE_SELECTORS,
        ...NUMERIC_CONST_SELECTORS,
      ],
    },
  },
  {
    // Tests parse the repo's own trusted markdown, never untrusted input, so
    // the backtracking cost sonarjs warns about is not a real attack surface.
    files: ['__tests__/docs-links.test.ts'],
    rules: { 'sonarjs/super-linear-regex': 'off' },
  },
  prettierConfig
);
