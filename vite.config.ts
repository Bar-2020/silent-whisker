import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig } from 'vite-plus';

// ESLint's recommended set.
const CORE_RULES = [
  'for-direction',
  'no-async-promise-executor',
  'no-case-declarations',
  'no-compare-neg-zero',
  'no-cond-assign',
  'no-constant-binary-expression',
  'no-constant-condition',
  'no-control-regex',
  'no-debugger',
  'no-delete-var',
  'no-dupe-else-if',
  'no-duplicate-case',
  'no-empty',
  'no-empty-character-class',
  'no-empty-pattern',
  'no-empty-static-block',
  'no-ex-assign',
  'no-extra-boolean-cast',
  'no-fallthrough',
  'no-global-assign',
  'no-invalid-regexp',
  'no-irregular-whitespace',
  'no-loss-of-precision',
  'no-misleading-character-class',
  'no-nonoctal-decimal-escape',
  'no-prototype-builtins',
  'no-regex-spaces',
  'no-self-assign',
  'no-shadow-restricted-names',
  'no-sparse-arrays',
  'no-unsafe-finally',
  'no-unsafe-optional-chaining',
  'no-unused-labels',
  'no-unused-private-class-members',
  'no-useless-backreference',
  'no-useless-catch',
  'no-useless-escape',
  'no-var',
  'prefer-const',
  'prefer-rest-params',
  'prefer-spread',
  'require-yield',
  'use-isnan',
  'valid-typeof',
];

// typescript-eslint strict + stylistic, type-checked.
const TYPESCRIPT_RULES = [
  'typescript/adjacent-overload-signatures',
  'typescript/array-type',
  'typescript/await-thenable',
  'typescript/ban-ts-comment',
  'typescript/ban-tslint-comment',
  'typescript/class-literal-property-style',
  'typescript/consistent-generic-constructors',
  'typescript/consistent-indexed-object-style',
  'typescript/consistent-type-assertions',
  'typescript/consistent-type-definitions',
  'typescript/dot-notation',
  'typescript/no-array-constructor',
  'typescript/no-array-delete',
  'typescript/no-base-to-string',
  'typescript/no-confusing-non-null-assertion',
  'typescript/no-confusing-void-expression',
  'typescript/no-deprecated',
  'typescript/no-duplicate-enum-values',
  'typescript/no-duplicate-type-constituents',
  'typescript/no-dynamic-delete',
  'typescript/no-empty-function',
  'typescript/no-empty-object-type',
  'typescript/no-explicit-any',
  'typescript/no-extra-non-null-assertion',
  'typescript/no-extraneous-class',
  'typescript/no-floating-promises',
  'typescript/no-for-in-array',
  'typescript/no-generated-empty-object-type',
  'typescript/no-implied-eval',
  'typescript/no-inferrable-types',
  'typescript/no-invalid-void-type',
  'typescript/no-meaningless-void-operator',
  'typescript/no-misused-new',
  'typescript/no-misused-promises',
  'typescript/no-misused-spread',
  'typescript/no-mixed-enums',
  'typescript/no-namespace',
  'typescript/no-non-null-asserted-nullish-coalescing',
  'typescript/no-non-null-asserted-optional-chain',
  'typescript/no-non-null-assertion',
  'typescript/no-redundant-type-constituents',
  'typescript/no-require-imports',
  'typescript/no-this-alias',
  'typescript/no-unnecessary-boolean-literal-compare',
  'typescript/no-unnecessary-condition',
  'typescript/no-unnecessary-template-expression',
  'typescript/no-unnecessary-type-arguments',
  'typescript/no-unnecessary-type-assertion',
  'typescript/no-unnecessary-type-constraint',
  'typescript/no-unnecessary-type-conversion',
  'typescript/no-unnecessary-type-parameters',
  'typescript/no-unsafe-argument',
  'typescript/no-unsafe-assignment',
  'typescript/no-unsafe-call',
  'typescript/no-unsafe-declaration-merging',
  'typescript/no-unsafe-enum-comparison',
  'typescript/no-unsafe-function-type',
  'typescript/no-unsafe-member-access',
  'typescript/no-unsafe-return',
  'typescript/no-unsafe-unary-minus',
  'typescript/no-unused-expressions',
  'typescript/no-unused-vars',
  'typescript/no-useless-constructor',
  'typescript/no-useless-default-assignment',
  'typescript/no-wrapper-object-types',
  'typescript/non-nullable-type-assertion-style',
  'typescript/only-throw-error',
  'typescript/prefer-as-const',
  'typescript/prefer-find',
  'typescript/prefer-for-of',
  'typescript/prefer-function-type',
  'typescript/prefer-includes',
  'typescript/prefer-literal-enum-member',
  'typescript/prefer-namespace-keyword',
  'typescript/prefer-nullish-coalescing',
  'typescript/prefer-optional-chain',
  'typescript/prefer-promise-reject-errors',
  'typescript/prefer-reduce-type-parameter',
  'typescript/prefer-regexp-exec',
  'typescript/prefer-return-this-type',
  'typescript/prefer-string-starts-ends-with',
  'typescript/related-getter-setter-pairs',
  'typescript/require-await',
  'typescript/restrict-plus-operands',
  'typescript/restrict-template-expressions',
  'typescript/return-await',
  'typescript/triple-slash-reference',
  'typescript/unbound-method',
  'typescript/unified-signatures',
  'typescript/use-unknown-in-catch-callback-variable',
];

const asErrors = (names: string[]) =>
  Object.fromEntries(names.map((name) => [name, 'error' as const]));

// The plugin's own recommended preset, so new rules arrive with the plugin. Its types do not
// resolve here; its values are only 'error' or 'off'. Its rules that need the TypeScript
// checker (e.g. different-types-comparison) are enabled but do nothing: Oxlint JS plugins get no
// type information.
const SONARJS_RULES = sonarjs.configs.recommended.rules as Record<string, 'error' | 'off'>;

export default defineConfig({
  // `npm run build:backend`: each Lambda handler becomes one self-contained folder (its code and
  // the AWS SDK parts it uses), which Terraform zips. Add a handler as one more entry, with its
  // own outDir, so its zip never depends on a file another handler shares.
  pack: {
    entry: { handler: 'backend/get-profile/handler.ts' },
    outDir: 'backend/dist/get-profile',
    target: 'node24',
    clean: true,
    deps: { onlyBundle: false },
  },
  lint: {
    plugins: ['typescript'],
    jsPlugins: ['eslint-plugin-sonarjs', './lint/silent-whisker-plugin.js'],
    categories: { correctness: 'off' },
    options: { typeAware: true, reportUnusedDisableDirectives: 'error' },
    ignorePatterns: ['.claude/skills/'],
    rules: asErrors(CORE_RULES),
    overrides: [
      {
        // The type-aware and project rules apply to TypeScript only; plain .js
        // (tooling) gets ESLint's recommended set and nothing more.
        files: ['**/*.{ts,tsx}'],
        rules: {
          ...asErrors(TYPESCRIPT_RULES),
          ...SONARJS_RULES,
          'silent-whisker/rtl-logical-properties': 'error',
          'silent-whisker/no-inline-styles': 'error',
        },
      },
      {
        // Business logic holds no magic numbers: limits, timeouts, sizes and counts
        // are named in shared/constants/. 0, 1 and -1 stay readable in place. Tests
        // use literals freely.
        files: ['frontend/src/**/*.{ts,tsx}', 'backend/**/*.ts', 'shared/**/*.ts'],
        excludeFiles: ['shared/constants/**', '**/*.test.{ts,tsx}'],
        rules: {
          'typescript/no-magic-numbers': [
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
          'silent-whisker/numeric-constants-live-in-constants': 'error',
          'silent-whisker/paid-calls-go-through-metered-call': 'error',
        },
      },
      {
        // Tests parse the repo's own trusted markdown, never untrusted input, so
        // the backtracking cost sonarjs warns about is not a real attack surface.
        files: ['__tests__/docs-links.test.ts'],
        rules: { 'sonarjs/super-linear-regex': 'off' },
      },
      {
        // The test feeds the profile handler a plain-http photo address, which it must refuse (D-21).
        files: ['backend/get-profile/handler.test.ts'],
        rules: { 'sonarjs/no-clear-text-protocols': 'off' },
      },
      {
        // The test runs infra/app/spa-fallback.js, the repo's own CloudFront Function, to check
        // what it does with real addresses; it never runs anything from outside the repo.
        files: ['__tests__/spa-fallback.test.ts'],
        rules: { 'sonarjs/code-eval': 'off' },
      },
      {
        // RuleTester generates its cases at runtime, so sonarjs cannot see any tests here.
        files: ['__tests__/lint-rules.test.ts'],
        rules: { 'sonarjs/no-empty-test-file': 'off' },
      },
    ],
  },
  fmt: {
    singleQuote: true,
    printWidth: 100,
    trailingComma: 'es5',
    sortPackageJson: false,
    ignorePatterns: ['package-lock.json', '*.md', '.claude/skills/'],
  },
});
