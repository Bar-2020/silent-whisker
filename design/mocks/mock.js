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

  if (params.has('bare')) document.documentElement.dataset.bare = 'true';
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGS[lang].dir;

  function t(key, vars) {
    const raw = strings[key];
    if (raw === undefined) {
      console.warn(`missing string key: ${key}`);
      return `⚠ ${key}`;
    }
    return Object.entries(vars || {}).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, isolate(value)),
      raw
    );
  }

  /* Words typed by people (a name) are isolated, so their punctuation cannot jump across the
     sentence's direction. Numbers are left alone. */
  function isolate(value) {
    return typeof value === 'string' && /\p{L}/u.test(value) ? `⁨${value}⁩` : value;
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
    { id: 'explore', icon: 'compass', href: 'cats.html' },
    { id: 'alerts', icon: 'alert', href: 'alerts.html' },
    { id: 'me', icon: 'user', href: 'profile.html' },
  ];

  /* Moving between mock pages keeps the language. */
  function withLang(href) {
    return lang === DEFAULT_LANG ? href : `${href}${href.includes('?') ? '&' : '?'}lang=${lang}`;
  }

  function drawNav() {
    const host = document.querySelector('[data-nav]');
    if (!host) return;
    const current = host.dataset.nav;
    const items = NAV.map(
      (item) =>
        `<a class="nav__item" href="${withLang(item.href)}"${item.id === current ? ' aria-current="page"' : ''}>` +
        `<i data-icon="${item.icon}"></i><span data-t="nav.${item.id}"></span></a>`
    ).join('');
    host.className = 'nav on-dado';
    host.setAttribute('aria-label', t('nav.label'));
    host.innerHTML =
      `<a class="nav__brand" href="${withLang('landing.html')}" aria-label="${t('nav.home')}"><svg class="brand-glyph" aria-hidden="true"><use href="#i-cat-fill"></use></svg></a>` +
      items +
      '<div class="nav__lang" data-langmenu></div>';
  }

  function otherQuery(nextLang) {
    const next = new URLSearchParams(window.location.search);
    next.set('lang', nextLang);
    return next.toString();
  }

  /* A globe button that opens the list of languages. */
  let menuCount = 0;
  function drawLangMenu() {
    document.querySelectorAll('[data-langmenu]').forEach((host) => {
      menuCount += 1;
      const id = `langmenu-${menuCount}`;
      const items = Object.keys(LANGS)
        .map(
          (code) =>
            `<a class="menu__item" href="?${otherQuery(code)}" lang="${code}"${code === lang ? ' aria-current="true"' : ''}>` +
            `${t(`lang.${code}`)}${code === lang ? '<i class="check-end" data-icon="check"></i>' : ''}</a>`
        )
        .join('');
      host.classList.add('langmenu');
      host.innerHTML =
        `<button class="iconbtn langmenu__btn" type="button" aria-expanded="false" aria-controls="${id}" aria-label="${t('lang.label')}" data-toggle="${id}"><i data-icon="globe"></i></button>` +
        `<div class="menu langmenu__menu" id="${id}" hidden>${items}</div>`;
    });
  }

  function closeLangMenus(except) {
    document.querySelectorAll('.langmenu__menu:not([hidden])').forEach((menu) => {
      if (except && menu.parentElement.contains(except)) return;
      menu.hidden = true;
      menu.previousElementSibling.setAttribute('aria-expanded', 'false');
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
    improveAccessibility();
    showFirstProblem();
  }

  /* Names, announcements and links that a real component would carry from the start. */
  function improveAccessibility() {
    document.querySelectorAll('.field__error').forEach((el) => el.setAttribute('role', 'alert'));
    document
      .querySelectorAll('.notice[data-sub]')
      .forEach((el) => el.setAttribute('role', 'status'));
    document.querySelectorAll('[role="dialog"]').forEach((dialog, index) => {
      if (dialog.hasAttribute('aria-labelledby') || dialog.hasAttribute('aria-label')) return;
      const heading = dialog.querySelector('.sheet__title, h2, strong');
      if (!heading) return;
      heading.id = heading.id || `dialog-title-${index}`;
      dialog.setAttribute('aria-labelledby', heading.id);
    });
    document.querySelectorAll('[aria-haspopup][data-go]').forEach((el) => {
      el.setAttribute('aria-expanded', String(el.dataset.go === state));
    });
    let linked = 0;
    document.querySelectorAll('.field').forEach((field) => {
      const control = field.querySelector('input.input, textarea.textarea');
      if (!control) return;
      const ids = [...field.querySelectorAll('.field__hint, .field__error')]
        .filter((el) => !el.closest('[hidden]'))
        .map((el) => {
          linked += 1;
          el.id = el.id || `field-message-${linked}`;
          return el.id;
        });
      if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
      else control.removeAttribute('aria-describedby');
    });
    document
      .querySelectorAll('input.input, textarea.textarea, .msg__bubble p, .comment__body p')
      .forEach((el) => el.setAttribute('dir', 'auto'));
  }

  /* A refusal or error that sits below the fold is brought into view. */
  function showFirstProblem() {
    if (!active) return;
    const problem = [
      ...active.querySelectorAll(
        '.field__error, .notice[data-level="red"], .notice[data-level="orange"]'
      ),
    ].find((el) => el.offsetParent !== null && !el.closest('.footbar, .toast'));
    if (problem && state !== 'default') problem.scrollIntoView({ block: 'center' });
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
      toggle.dataset.toggle.split(' ').forEach((id) => {
        const target = document.getElementById(id);
        if (target) target.hidden = !target.hidden;
      });
      const menu = document.getElementById(toggle.dataset.toggle);
      if (menu && menu.classList.contains('langmenu__menu')) {
        toggle.setAttribute('aria-expanded', String(!menu.hidden));
        closeLangMenus(toggle.parentElement);
      }
      return;
    }
    closeLangMenus(event.target);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLangMenus();
  });

  /* Keep the language when moving between mock pages. */
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((a) => {
    if (!a.closest('.nav')) a.setAttribute('href', withLang(a.getAttribute('href')));
  });

  /* ----- map markers ----- */
  const LEVEL_MARK = { green: 'check', orange: 'clock', red: 'exclaim', none: 'dash' };

  function glyph(name) {
    return `<svg class="pin__glyph" aria-hidden="true"><use href="#i-${name}-fill"></use></svg>`;
  }

  /* One minimal pin everywhere: a state-coloured teardrop, one solid white glyph, one small mark. */
  function pinHtml(spot) {
    const name = spot.kind === 'both' ? 'both' : spot.kind === 'water' ? 'drop' : 'bowl';
    const selected = spot.selected ? ' is-selected' : '';
    return (
      `<div class="pin${selected}" data-level="${spot.level}" data-kind="${spot.kind}" data-status="${spot.status || 'active'}">` +
      '<svg class="pin__body" viewBox="0 0 46 56" aria-hidden="true"><path d="M23 54S5 37 5 22a18 18 0 1 1 36 0c0 15-18 32-18 32z"/></svg>' +
      glyph(name) +
      `<span class="pin__badge"><svg class="icon" aria-hidden="true"><use href="#i-${LEVEL_MARK[spot.level]}"></use></svg></span></div>`
    );
  }

  function signHtml(alertItem) {
    const selected = alertItem.selected ? ' is-selected' : '';
    return (
      `<div class="sign${selected}" data-level="alert"><span class="sign__box"><svg class="sign__glyph" aria-hidden="true"><use href="#i-cat-fill"></use></svg></span>` +
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

  /* Pins and signs are buttons: reachable by keyboard and named by what they mean. */
  function markerOptions(label, html) {
    return {
      icon: window.L.divIcon({ className: '', html, iconSize: null }),
      keyboard: true,
      title: label,
      alt: label,
    };
  }

  function pinLabel(spot) {
    return spot.status === 'pending' ? t('map.legend.pending') : t(`map.legend.${spot.level}`);
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
        keyboard: true,
        title: config.label || '',
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
    markerOptions,
    pinLabel,
    mountMap,
    addAttribution,
    pinHtml,
    signHtml,
    onState: null,
  };

  /* ----- boot ----- */
  drawNav();
  drawLangMenu();
  drawIcons(document);
  translate(document);
  applyState();
  if (document.body.dataset.title) document.title = t(document.body.dataset.title);
})();
