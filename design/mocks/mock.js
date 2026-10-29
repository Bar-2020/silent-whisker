/* Mock runtime. Not the app: it only stands in for what the app's shell does, so the screens can be
   looked at. It reads ?lang=he|en|ar|ru&screen=<id>&state=<id> and then:
   - fills every [data-t] element from the locale object (every string goes through a key),
   - shows the chosen screen and the elements that belong to the chosen state,
   - draws icons, the navigation and the map markers. */
(function () {
  const DEFAULT_LANG = 'he';
  const LANGS = { he: { dir: 'rtl' }, en: { dir: 'ltr' }, ar: { dir: 'rtl' }, ru: { dir: 'ltr' } };

  const params = new URLSearchParams(window.location.search);
  const lang = Object.hasOwn(LANGS, params.get('lang')) ? params.get('lang') : DEFAULT_LANG;
  const strings = (window.MOCK_LOCALES && window.MOCK_LOCALES[lang]) || {};

  if (params.has('bare')) document.documentElement.dataset.bare = 'true';
  if (params.has('frame')) document.documentElement.dataset.frame = 'true';
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGS[lang].dir;

  function t(key, vars) {
    const raw = strings[key];
    if (raw === undefined) {
      console.warn(`missing string key: ${key}`);
      return `⚠ ${key}`;
    }
    return Object.entries(vars || {}).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, () => isolate(value)),
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
    /* Locale text is trusted and written by us. The real app must not copy this: it would build
       nodes, or escape the variables, so a typed name could never become markup. */
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
    { id: 'alerts', icon: 'siren', href: 'alerts.html' },
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
      `<a class="nav__brand" href="${withLang('landing.html')}" aria-label="${t('nav.home')}"><svg class="brand-glyph" aria-hidden="true"><use href="#i-cat"></use></svg></a>` +
      items +
      '<div class="nav__lang" data-langmenu></div>';
  }

  /* Every top bar carries the mark: first when the bar has no back button, right after it otherwise. */
  function drawTopbarBrand() {
    document.querySelectorAll('.topbar:not([data-nobrand])').forEach((bar) => {
      const brand = document.createElement('a');
      brand.className = 'topbar__brand';
      brand.href = withLang('map.html');
      brand.setAttribute('aria-label', t('nav.home'));
      brand.innerHTML =
        '<svg class="brandmark__glyph" aria-hidden="true"><use href="#i-cat"></use></svg>';
      const first = bar.firstElementChild;
      const hasBack = first && first.classList.contains('iconbtn') && first.tagName === 'A';
      if (hasBack) first.after(brand);
      else bar.prepend(brand);
    });
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

  /* The title of the page is the title of the screen being shown, so a tab or a history list names it. */
  function syncTitle() {
    const heading = active && active.querySelector('h1');
    const text = heading && heading.textContent.trim();
    if (text) document.title = `${text} | Silent Whisker`;
  }

  /* A screen with a pinned bar at its foot (a form's button, a composer) is as tall as the viewport, so
     the bar sits at the bottom. The screen says so, and the styles read that one attribute. */
  function markPinned() {
    document.querySelectorAll('[data-screen], .split-view__panel').forEach((el) => {
      const kids = [...el.children];
      if (kids.some((kid) => kid.matches('.footbar, [data-panel-footer]')))
        el.dataset.pinned = 'bar';
      else if (kids.some((kid) => kid.matches('.composer'))) el.dataset.pinned = 'composer';
      else delete el.dataset.pinned;
    });
  }

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
    document.querySelectorAll('[data-notsub]').forEach((el) => {
      el.hidden = el.dataset.notsub.split(' ').includes(sub);
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
    markPinned();
    if (window.Mock.onState) window.Mock.onState(state);
    syncTitle();
    improveAccessibility();
    showFirstProblem();
  }

  /* Names, announcements and links that a real component would carry from the start. */
  function improveAccessibility() {
    document.querySelectorAll('.field__error').forEach((el) => el.setAttribute('role', 'alert'));
    document
      .querySelectorAll('header.topbar, header.sitenav, header.sitebar')
      .forEach((el) => el.setAttribute('role', 'banner'));
    document
      .querySelectorAll('footer.sitefoot')
      .forEach((el) => el.setAttribute('role', 'contentinfo'));
    document.querySelectorAll('ul, ol').forEach((el) => el.setAttribute('role', 'list'));
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
    document.querySelectorAll('[data-disclosure][data-go]').forEach((el) => {
      el.setAttribute('aria-expanded', String(el.dataset.go === state));
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
      .querySelectorAll('input.input, textarea.textarea, .msg__text, .comment__body p')
      .forEach(syncDirection);
  }

  /* Typed words choose their own direction; an empty box (its placeholder) follows the page, so a
     Hebrew placeholder sits at the right, not the left. */
  const TEXT_BOX = 'input.input, textarea.textarea';
  function syncDirection(el) {
    if (el.matches(TEXT_BOX) && !el.value) el.removeAttribute('dir');
    else el.setAttribute('dir', 'auto');
  }
  document.addEventListener('input', (event) => {
    if (event.target.matches && event.target.matches(TEXT_BOX)) syncDirection(event.target);
  });

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
      if (menu && toggle.hasAttribute('data-disclosure')) {
        toggle.setAttribute('aria-expanded', String(!menu.hidden));
      }
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
  function glyph(name) {
    return `<svg class="pin__glyph" aria-hidden="true"><use href="#i-${name}-fill"></use></svg>`;
  }

  /* One pin everywhere: a teardrop in the state colour and nothing else. The card, the legend and the
     name of the marker carry the words. */
  function pinHtml(spot) {
    const selected = spot.selected ? ' is-selected' : '';
    return (
      `<div class="pin${selected}" data-level="${spot.level}" data-kind="${spot.kind}" data-status="${spot.status || 'active'}">` +
      '<svg class="pin__body" viewBox="0 0 46 56" aria-hidden="true"><path d="M23 54S5 37 5 22a18 18 0 1 1 36 0c0 15-18 32-18 32z"/></svg></div>'
    );
  }

  function signHtml(alertItem) {
    const selected = alertItem.selected ? ' is-selected' : '';
    return (
      `<div class="sign${selected}" data-level="alert" data-kind="${alertItem.kind}"><span class="sign__box"><svg class="sign__glyph" aria-hidden="true"><use href="#i-cat-fill"></use></svg></span>` +
      `<span class="sign__stem"></span><span class="sign__label">${t(`alerts.kind.${alertItem.kind}`)}</span></div>`
    );
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

  /* The map credit OpenStreetMap asks for: visible on the map when it opens, folded into a small
     (i) button after five seconds (allowed by their attribution guidelines), and shown again by a tap. */
  const CREDIT_SECONDS = 5;
  function addCredit(container) {
    if (!container || container.querySelector('.mapcredit')) return;
    const credit = document.createElement('div');
    credit.className = 'mapcredit';
    credit.innerHTML =
      `<a class="mapcredit__text" dir="ltr" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">${t('map.credit.short')}</a>` +
      `<button class="mapcredit__info" type="button" aria-label="${t('map.credit.show')}"><i data-icon="info"></i></button>`;
    container.append(credit);
    drawIcons(credit);
    let timer = 0;
    const fold = () => {
      credit.classList.add('is-collapsed');
    };
    const open = () => {
      credit.classList.remove('is-collapsed');
      window.clearTimeout(timer);
      timer = window.setTimeout(fold, CREDIT_SECONDS * 1000);
    };
    credit.querySelector('.mapcredit__info').addEventListener('click', open);
    open();
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
    addCredit,
    pinHtml,
    signHtml,
    onState: null,
  };

  /* ----- boot ----- */
  drawNav();
  drawTopbarBrand();
  drawLangMenu();
  drawIcons(document);
  translate(document);
  applyState();
  if (document.body.dataset.title) document.title = t(document.body.dataset.title);
  syncTitle();
})();
