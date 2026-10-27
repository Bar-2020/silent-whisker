/* Mock runtime. Not the app: it only stands in for what the app's shell does, so the screens can be
   looked at. It reads ?lang=he|en&screen=<id>&state=<id> and then:
   - fills every [data-t] element from the locale object (every string goes through a key),
   - shows the chosen screen and the elements that belong to the chosen state,
   - draws icons, the navigation and the map markers. */
(function () {
  const DEFAULT_LANG = 'he';
  const LANGS = { he: { dir: 'rtl' }, en: { dir: 'ltr' } };

  const params = new URLSearchParams(window.location.search);
  const lang = Object.hasOwn(LANGS, params.get('lang')) ? params.get('lang') : DEFAULT_LANG;
  const strings = (window.MOCK_LOCALES && window.MOCK_LOCALES[lang]) || {};

  const LOOKS = ['stairwell', 'plate', 'city', 'trail', 'standard'];
  const look = LOOKS.includes(params.get('look')) ? params.get('look') : LOOKS[0];
  document.documentElement.dataset.look = look;
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGS[lang].dir;

  function t(key, vars) {
    const raw = strings[key];
    if (raw === undefined) {
      console.warn(`missing string key: ${key}`);
      return `⚠ ${key}`;
    }
    return Object.entries(vars || {}).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, value),
      raw
    );
  }

  function parseVars(el) {
    try {
      return el.dataset.v ? JSON.parse(el.dataset.v) : undefined;
    } catch {
      return undefined;
    }
  }

  function translate(root) {
    root.querySelectorAll('[data-t]').forEach((el) => {
      el.textContent = t(el.dataset.t, parseVars(el));
    });
    root.querySelectorAll('[data-t-html]').forEach((el) => {
      el.innerHTML = t(el.dataset.tHtml, parseVars(el));
    });
    root.querySelectorAll('[data-t-attr]').forEach((el) => {
      el.dataset.tAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        el.setAttribute(attr.trim(), t(key.trim(), parseVars(el)));
      });
    });
  }

  function drawIcons(root) {
    root.querySelectorAll('i[data-icon]').forEach((el) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', `icon ${el.dataset.class || ''}`.trim());
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = `<use href="#i-${el.dataset.icon}"></use>`;
      el.replaceWith(svg);
    });
  }

  const NAV = [
    { id: 'map', icon: 'map', href: 'map.html' },
    { id: 'cats', icon: 'cat', href: 'cats.html' },
    { id: 'alerts', icon: 'alert', href: 'alerts.html' },
    { id: 'me', icon: 'user', href: 'profile.html' },
  ];

  /* Moving between mock pages keeps the language and the look. */
  function withLang(href) {
    const extra = [
      lang === DEFAULT_LANG ? '' : `lang=${lang}`,
      look === LOOKS[0] ? '' : `look=${look}`,
    ].filter(Boolean);
    return extra.length ? `${href}${href.includes('?') ? '&' : '?'}${extra.join('&')}` : href;
  }

  function drawNav() {
    const host = document.querySelector('[data-nav]');
    if (!host) return;
    const current = host.dataset.nav;
    const otherLang = lang === 'he' ? 'en' : 'he';
    const items = NAV.map(
      (item) =>
        `<a class="nav__item" href="${withLang(item.href)}"${item.id === current ? ' aria-current="page"' : ''}>` +
        `<i data-icon="${item.icon}"></i><span data-t="nav.${item.id}"></span></a>`
    ).join('');
    host.className = 'nav on-dado';
    host.setAttribute('aria-label', 'nav');
    host.innerHTML =
      `<a class="nav__brand" href="${withLang('landing.html')}"><img src="../../frontend/public/logo.png" alt="" /></a>` +
      items +
      `<a class="nav__lang" href="?${otherQuery(otherLang)}" lang="${otherLang}" data-t="nav.otherLang"></a>`;
  }

  function otherQuery(nextLang) {
    const next = new URLSearchParams(window.location.search);
    next.set('lang', nextLang);
    return next.toString();
  }

  function drawLangSwitch() {
    document.querySelectorAll('[data-langswitch]').forEach((host) => {
      const link = (code, label) =>
        `<a href="?${otherQuery(code)}" lang="${code}"${code === lang ? ' aria-current="true"' : ''}>${label}</a>`;
      host.className = 'langswitch';
      host.innerHTML = link('he', 'עברית') + link('en', 'English');
    });
  }

  /* ----- screens and states ----- */
  const screens = [...document.querySelectorAll('[data-screen]')];
  const active = screens.find((el) => el.dataset.screen === params.get('screen')) || screens[0];
  let state = params.get('state') || (active && active.dataset.defaultState) || '';
  /* A second, optional dimension (for example the result shown under a form). */
  let sub = params.get('sub') || '';

  function applyState() {
    screens.forEach((el) => {
      el.hidden = el !== active;
    });
    document.body.dataset.screen = active ? active.dataset.screen : '';
    if (active && active.dataset.chrome) document.body.dataset.chrome = active.dataset.chrome;
    document.body.dataset.state = state;
    document.body.dataset.sub = sub;
    document.querySelectorAll('[data-sub]').forEach((el) => {
      el.hidden = !el.dataset.sub.split(' ').includes(sub);
    });
    document.querySelectorAll('[data-nosub]').forEach((el) => {
      el.hidden = sub !== '';
    });
    document.querySelectorAll('[data-when]').forEach((el) => {
      el.hidden = !el.dataset.when.split(' ').includes(state);
    });
    document.querySelectorAll('[data-unless]').forEach((el) => {
      el.hidden = el.dataset.unless.split(' ').includes(state);
    });
    document.querySelectorAll('[data-state-attr]').forEach((el) => {
      el.dataset.sheet = state.split('-')[0];
    });
    document.querySelectorAll('[data-pressed]').forEach((el) => {
      el.setAttribute('aria-pressed', String(el.dataset.pressed.split(' ').includes(state)));
    });
    if (window.Mock.onState) window.Mock.onState(state);
  }

  /* "red/counted" sets the state and the sub-state together; "/counted" sets only the sub-state. */
  function setState(next) {
    const [nextState, nextSub] = next.split('/');
    if (nextState) state = nextState;
    sub = nextSub || '';
    const url = new URL(window.location.href);
    url.searchParams.set('state', state);
    if (sub) url.searchParams.set('sub', sub);
    else url.searchParams.delete('sub');
    window.history.replaceState(null, '', url);
    applyState();
  }

  document.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go) {
      event.preventDefault();
      setState(go.dataset.go);
      return;
    }
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      const target = document.getElementById(toggle.dataset.toggle);
      if (target) target.hidden = !target.hidden;
    }
  });

  /* Keep the language when moving between mock pages. */
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((a) => {
    if (!a.closest('.nav')) a.setAttribute('href', withLang(a.getAttribute('href')));
  });

  /* ----- map markers ----- */
  const LEVEL_MARK = { green: 'check', orange: 'clock', red: 'exclaim', none: 'dash' };

  function glyph(kind, extra) {
    const name = kind === 'water' ? 'drop' : 'bowl';
    return `<svg class="icon pin__glyph ${extra || ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function pinHtml(spot) {
    const glyphs =
      spot.kind === 'both'
        ? glyph('food', 'pin__glyph--a') + glyph('water', 'pin__glyph--b')
        : glyph(spot.kind);
    const selected = spot.selected ? ' is-selected' : '';
    return (
      `<div class="pin${selected}" data-level="${spot.level}" data-kind="${spot.kind}" data-status="${spot.status || 'active'}">` +
      `<svg class="pin__body" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 46S4 31 4 19a16 16 0 1 1 32 0c0 12-16 27-16 27z"/></svg>` +
      `${glyphs}<span class="pin__badge"><svg class="icon" aria-hidden="true"><use href="#i-${LEVEL_MARK[spot.level]}"></use></svg></span></div>`
    );
  }

  function signHtml(alertItem) {
    const selected = alertItem.selected ? ' is-selected' : '';
    return (
      `<div class="sign${selected}" data-level="alert"><span class="sign__box"><svg class="icon icon--l" aria-hidden="true"><use href="#i-cat"></use></svg></span>` +
      `<span class="sign__stem"></span><span class="sign__label">${t(`alerts.kind.${alertItem.kind}`)}</span></div>`
    );
  }

  /* The attribution sits on the side away from the rail (the rail is at the inline-start). */
  function addAttribution(map) {
    const position = lang === 'he' ? 'bottomleft' : 'bottomright';
    window.L.control
      .attribution({ position, prefix: false })
      .addAttribution('&copy; OpenStreetMap')
      .addTo(map);
  }

  function mountMap(el, config) {
    if (!window.L) {
      el.dataset.failed = 'true';
      return null;
    }
    const map = window.L.map(el, { zoomControl: false, attributionControl: false }).setView(
      config.center,
      config.zoom
    );
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
      map
    );
    addAttribution(map);
    const layers = [];
    const add = (position, html, onClick) => {
      const marker = window.L.marker(position, {
        icon: window.L.divIcon({ className: '', html, iconSize: null }),
        keyboard: false,
      }).addTo(map);
      if (onClick) marker.on('click', onClick);
      layers.push(marker);
    };
    (config.spots || []).forEach((spot) => add([spot.lat, spot.lng], pinHtml(spot), spot.onClick));
    (config.alerts || []).forEach((item) =>
      add([item.lat, item.lng], signHtml(item), item.onClick)
    );
    if (config.here) add(config.here, '<div class="here"></div>');
    return map;
  }

  function refresh(root) {
    drawIcons(root);
    translate(root);
  }

  window.Mock = {
    t,
    lang,
    setState,
    refresh,
    getState: () => state,
    getSub: () => sub,
    mountMap,
    addAttribution,
    pinHtml,
    signHtml,
    onState: null,
  };

  /* ----- boot ----- */
  drawNav();
  drawLangSwitch();
  drawIcons(document);
  translate(document);
  applyState();
  if (document.body.dataset.title) document.title = t(document.body.dataset.title);
})();
