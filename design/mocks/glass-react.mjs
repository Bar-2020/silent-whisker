/* Glass study: mounts liquid-glass-react around the same four tabs. Everything comes from a CDN, so a
   missing network only shows a message. */
const note = document.getElementById('note');

async function mount() {
  const [reactModule, domModule, glassModule] = await Promise.all([
    import('https://esm.sh/react@18.3.1'),
    import('https://esm.sh/react-dom@18.3.1/client'),
    import('https://esm.sh/liquid-glass-react?deps=react@18.3.1,react-dom@18.3.1'),
  ]);
  const React = reactModule.default;
  const LiquidGlass = glassModule.default;
  const { strings, tabs } = window.GlassStudy;
  const h = React.createElement;

  const items = tabs.map(([id, icon], index) =>
    h(
      'a',
      { key: id, className: 'nav__item', 'aria-current': index === 0 ? 'page' : undefined },
      h('svg', { className: 'icon', 'aria-hidden': 'true' }, h('use', { href: `#i-${icon}` })),
      h('span', null, strings[`nav.${id}`])
    )
  );
  const glass = h(
    LiquidGlass,
    {
      displacementScale: 64,
      blurAmount: 0.08,
      saturation: 150,
      aberrationIntensity: 1.5,
      elasticity: 0.15,
      cornerRadius: 28,
      overLight: false,
      mode: 'standard',
      style: { position: 'fixed', top: 'auto', bottom: '150px', left: '50%' },
    },
    h(
      'nav',
      { className: 'nav on-dado glassdemo__lg-nav', 'aria-label': 'liquid-glass-react navigation' },
      items
    )
  );
  domModule.createRoot(document.getElementById('root')).render(glass);
  note.textContent =
    'Top: the library. Bottom: the CSS glass. In Safari and Firefox the library shows its blur and edge light but not the displacement.';
}

mount().catch((error) => {
  note.textContent = `Could not load liquid-glass-react: ${error.message}. It needs a network.`;
});
