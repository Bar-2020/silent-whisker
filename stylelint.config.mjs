const FIX =
  'Use the logical property (inline-start/inline-end, block-start/block-end): Hebrew and Arabic flip. hard-rules.md, RTL-safe styles.';

export default {
  rules: {
    'property-disallowed-list': [
      [
        '/^(margin|padding)-(left|right)$/',
        '/^border-(left|right)(-|$)/',
        '/^border-(top|bottom)-(left|right)-radius$/',
        'left',
        'right',
      ],
      { message: (property) => `"${property}" is a physical edge. ${FIX}` },
    ],
    'declaration-property-value-disallowed-list': [
      { 'text-align': ['left', 'right'], float: ['left', 'right'] },
      { message: (property, value) => `"${property}: ${value}" is a physical edge. ${FIX}` },
    ],
  },
};
