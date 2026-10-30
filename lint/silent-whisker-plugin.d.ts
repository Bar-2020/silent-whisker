import type { Rule } from 'vite-plus/lint/plugins';

declare const plugin: {
  meta: { name: string };
  rules: Record<
    | 'rtl-logical-properties'
    | 'no-inline-styles'
    | 'numeric-constants-live-in-constants'
    | 'paid-calls-go-through-metered-call'
    | 'no-deep-relative-imports',
    Rule
  >;
};

export default plugin;
