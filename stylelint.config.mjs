const RTL_FIX =
  'Use the logical property (inline-start/inline-end, block-start/block-end): Hebrew and Arabic flip. hard-rules.md, RTL-safe styles.';
const TYPE_FIX =
  'Take a whole variant: font: var(--type-body) (the variants are in frontend/src/styles/tokens.css and DESIGN.md, Typography). A look that no variant has is added to the design first.';

export default {
  rules: {
    'property-disallowed-list': [
      [
        '/^(margin|padding)-(left|right)$/',
        '/^border-(left|right)(-|$)/',
        '/^border-(top|bottom)-(left|right)-radius$/',
        'left',
        'right',
        '/^font-(size|weight|family|style|variant-caps)$/',
        'line-height',
        'letter-spacing',
      ],
      {
        message: (property) =>
          /^(font-|line-|letter-)/.test(property)
            ? `"${property}" is set on its own. ${TYPE_FIX}`
            : `"${property}" is a physical edge. ${RTL_FIX}`,
      },
    ],
    'declaration-property-value-disallowed-list': [
      { 'text-align': ['left', 'right'], float: ['left', 'right'] },
      { message: (property, value) => `"${property}: ${value}" is a physical edge. ${RTL_FIX}` },
    ],
    'declaration-property-value-allowed-list': [
      {
        font: ['/^var[(]--type-[a-z-]+[)]$/', 'inherit'],
        'z-index': ['/^var[(]--z-[a-z-]+[)]$/'],
      },
      {
        message: (property, value) =>
          property === 'z-index'
            ? `"z-index: ${value}" is a number. Use a layer: z-index: var(--z-bar) (the scale is in frontend/src/styles/tokens.css, DESIGN.md, Layers).`
            : `"font: ${value}" is not a variant. ${TYPE_FIX}`,
      },
    ],
  },
};
