// Plain objects, no import: definePlugin/defineRule from vite-plus only add types to this same
// shape.
function restrictSyntax(entries) {
  return {
    create(context) {
      return Object.fromEntries(
        entries.map(({ selector, message }) => [
          selector,
          (node) => context.report({ node, message }),
        ])
      );
    },
  };
}

// Physical edges do not flip in RTL, and Hebrew is the primary language (hard-rules.md, "RTL-safe
// styles"). Plain .css files get the same check from stylelint once the web app exists.
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
const rtlLogicalProperties = restrictSyntax(
  PHYSICAL_EDGE_PROPS.map((name) => ({
    selector: `ObjectExpression > Property[key.name="${name}"], ObjectExpression > Property[key.value="${name}"]`,
    message: `"${name}" is a physical edge and does not flip in RTL. Use the logical equivalent (start/end) instead. .claude/instructions/hard-rules.md, RTL-safe styles.`,
  }))
);

const noInlineStyles = restrictSyntax(
  ['JSXAttribute[name.name="style"]', 'MemberExpression[property.name="style"]'].map(
    (selector) => ({
      selector,
      message:
        'No inline styles. Move the rule to a .css file beside the component and switch a class or a data-* attribute. .claude/instructions/hard-rules.md, No inline styles.',
    })
  )
);

// `no-magic-numbers` lets `const LIMIT = 30` through anywhere, which would
// leave limits scattered across logic files. Constants belong in
// shared/constants/, so a numeric top-level const is rejected everywhere else.
const numericConstantsLiveInConstants = restrictSyntax(
  [
    'Program > VariableDeclaration > VariableDeclarator',
    'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator',
  ]
    .flatMap((declarator) => [
      `${declarator} > Literal[value=type(number)]:not([value=0]):not([value=1])`,
      `${declarator} > UnaryExpression[operator="-"] > Literal[value=type(number)]:not([value=1])`,
    ])
    .map((selector) => ({
      selector,
      message:
        'Numeric constants live in shared/constants/. Move this one there and import it. .claude/instructions/hard-rules.md, Constants.',
    }))
);

// R-05: the paid call is a function handed to `meteredCall`, so a file that imports a paid client
// must also import metered-call. A reminder, not a proof: it cannot see that every call is wrapped,
// and only static imports are checked. Add a client here when a new paid service is chosen.
const PAID_AWS_CLIENTS = [
  '@aws-sdk/client-bedrock-runtime',
  '@aws-sdk/client-bedrock-agent-runtime',
  '@aws-sdk/client-rekognition',
  '@aws-sdk/client-comprehend',
  '@aws-sdk/client-textract',
  '@aws-sdk/client-location',
];

const isPaidClient = (source) =>
  PAID_AWS_CLIENTS.some((client) => source === client || source.startsWith(`${client}/`));

// './metered-call', './metered-call.js' and an alias path all count.
const isMeteredCall = (source) =>
  source
    .replace(/\.[cm]?[jt]s$/, '')
    .split('/')
    .at(-1) === 'metered-call';

const paidCallsGoThroughMeteredCall = {
  create(context) {
    const paidImports = [];
    let importsMeteredCall = false;
    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type') return; // types alone make no call
        const source = node.source.value;
        if (isPaidClient(source)) paidImports.push(node);
        else if (isMeteredCall(source)) importsMeteredCall = true;
      },
      'Program:exit'() {
        if (importsMeteredCall) return;
        for (const node of paidImports) {
          context.report({
            node,
            message: `"${node.source.value}" is a paid AWS client. Wrap every call in meteredCall (backend/shared/metered-call.ts) so the daily cap counts it. .claude/instructions/hard-rules.md, metered AWS calls.`,
          });
        }
      },
    };
  },
};

export default {
  meta: { name: 'silent-whisker' },
  rules: {
    'rtl-logical-properties': rtlLogicalProperties,
    'no-inline-styles': noInlineStyles,
    'numeric-constants-live-in-constants': numericConstantsLiveInConstants,
    'paid-calls-go-through-metered-call': paidCallsGoThroughMeteredCall,
  },
};
