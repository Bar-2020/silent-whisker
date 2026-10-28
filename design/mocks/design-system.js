/* The design system page: tokens and every component with its states, drawn with the real classes.
   Design tooling, not the app. */
(() => {
  /* English by default: this page is tooling. */
  if (!new URLSearchParams(window.location.search).has('lang')) {
    window.location.replace('design-system.html?lang=en');
    return;
  }
  const root = document.getElementById('root');
  const icon = (name, cls) => `<i data-icon="${name}"${cls ? ` data-class="${cls}"` : ''}></i>`;
  const cell = (label, html) =>
    `<figure class="ds__cell"><div class="ds__sample">${html}</div><figcaption>${label}</figcaption></figure>`;
  const section = (id, title, note, body) =>
    `<section class="ds__section" id="${id}"><h2>${title}</h2>${note ? `<p class="muted">${note}</p>` : ''}${body}</section>`;
  const grid = (html, wide) =>
    `<div class="ds__grid${wide ? ' ds__grid--wide' : ''}">${html}</div>`;

  /* ----- colour ----- */
  const swatch = (token, dark) =>
    `<div class="sw sw--${token}${dark ? ' sw--dark' : ''}">${token}</div>`;
  const colour = section(
    'colour',
    'Colour',
    'A white wall, one slate blue for everything you can press, and five state colours that always carry an icon and a word too. Light only.',
    `<h3>Ground and ink</h3>${grid(
      ['wall', 'surface', 'surface-sunk', 'line', 'line-strong'].map((t) => swatch(t)).join('') +
        ['ink', 'ink-2', 'ink-3'].map((t) => swatch(t, true)).join('')
    )}<h3>Slate: the colour of pressable things</h3>${grid(
      swatch('dado', true) + swatch('dado-deep', true) + swatch('dado-tint') + swatch('focus', true)
    )}<h3>State: fill, ink, tint</h3>${grid(
      ['ok', 'warn', 'bad', 'none', 'alert']
        .map((s) => swatch(s, true) + swatch(`${s}-ink`, true) + swatch(`${s}-tint`))
        .join('') + swatch('here', true)
    )}`
  );

  /* ----- type, space, radius ----- */
  const sizes = ['xs', 's', 'm', 'l', 'xl', '2xl', 'display'];
  const type = section(
    'type',
    'Type and space',
    'System sans, one family. Hebrew first, so every size is checked in Hebrew. Spacing runs on a 4 px step; targets are 48 px (44 for small buttons).',
    `<div class="stack stack--2">${sizes
      .map(
        (s) =>
          `<div class="sw--type" ><span class="small muted">--fs-${s}</span>&nbsp;&nbsp;<span class="ds__type ds__type--${s}">Silent Whisker · שקט, חתולים</span></div>`
      )
      .join('')}</div>` +
      `<h3>Radius and lift</h3><div class="ds__sample">${['r-s', 'r-m', 'r-l', 'r-pill']
        .map((r) => `<span class="ds__box ds__box--${r}">${r}</span>`)
        .join('')}<span class="ds__box ds__box--lift">lift</span></div>`
  );

  /* ----- buttons ----- */
  const variants = [
    ['Primary', 'btn'],
    ['Secondary', 'btn btn--secondary'],
    ['Quiet', 'btn btn--quiet'],
    ['Danger', 'btn btn--danger'],
  ];
  const states = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Pending'];
  function button(cls, state, label) {
    const spin = '<span class="spinner spinner--btn"></span>';
    if (state === 'Hover') return `<button class="${cls} is-hover" type="button">${label}</button>`;
    if (state === 'Pressed')
      return `<button class="${cls} is-pressed" type="button">${label}</button>`;
    if (state === 'Focus') return `<button class="${cls} is-focus" type="button">${label}</button>`;
    if (state === 'Disabled')
      return `<button class="${cls}" type="button" disabled>${label}</button>`;
    if (state === 'Pending')
      return `<button class="${cls}" type="button" aria-busy="true">${spin}<span>Saving…</span></button>`;
    return `<button class="${cls}" type="button">${label}</button>`;
  }
  const matrix = `<div class="ds__scroll"><div class="ds__matrix"><span></span>${states
    .map((s) => `<b>${s}</b>`)
    .join('')}${variants
    .map(
      ([name, cls]) =>
        `<b>${name}</b>${states.map((s) => button(cls, s, `${icon('check', 'icon--s')}Save`)).join('')}`
    )
    .join('')}</div></div>`;
  const barButtons = [
    '<button class="btn btn--lg" type="button">Save</button>',
    '<button class="btn btn--lg" type="button" disabled>Save</button>',
    '<button class="btn btn--lg" type="button" aria-busy="true"><span class="spinner spinner--btn"></span><span>Saving…</span></button>',
  ];
  const onBar = `<div class="ds__sample">${barButtons
    .map((html) => `<div class="footbar">${html}</div>`)
    .join('')}</div>`;
  const buttons = section(
    'buttons',
    'Buttons',
    'Every variant has the same six states. Disabled is grey and says why close by (a label or a hint), never only by looking dull. Pending is for any button that sends something to the server: the button keeps its size and colour, only a spinner shows (the label stays in the page for screen readers), and it takes no taps. In the app, pending comes from the TanStack Query mutation (isPending), never from a hand-kept flag.',
    `<h3>States by variant</h3>${matrix}<h3>On the pinned bar of a form: default, disabled, pending</h3><p class="muted">The bar is white and flat, pinned to the bottom of the screen, with no line, shadow or glass. On a wide screen it sits under the form.</p>${onBar}<h3>Sizes and round buttons</h3><div class="ds__sample"><button class="btn btn--small" type="button">Small 44</button><button class="btn" type="button">Default 48</button><button class="btn btn--lg" type="button">Large 56</button><button class="iconbtn" type="button" aria-label="Menu">${icon('more')}</button><button class="round" type="button" aria-label="Locate">${icon('locate')}</button><button class="round round--primary" type="button" aria-label="Add">${icon('plus')}</button><button class="round" type="button" disabled aria-label="Locate (disabled)">${icon('locate')}</button><button class="round round--primary" type="button" aria-busy="true" aria-label="Adding"><span class="spinner spinner--btn"></span></button></div>`
  );

  /* ----- forms ----- */
  const field = (label, control, hint) =>
    `<div class="field"><span class="field__label">${label}</span>${control}${hint || ''}</div>`;
  const tile = (name, checked, disabled, text) =>
    `<label class="choice"><input type="radio" name="${name}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''} /><span class="choice__tile">${icon('bowl')}<span>${text}</span><small>for 24 hours</small><span class="choice__mark">${icon('check')}</span></span></label>`;
  const forms = section(
    'forms',
    'Forms',
    'One text field style. The error is a sentence below it, in red ink, with the field tinted and no icon; focus is a 3 px ring. A placeholder follows the page direction, typed words choose their own.',
    `${grid(
      cell('Default', field('Name', '<input class="input" placeholder="For example: Mitzi" />')) +
        cell('Focus', field('Name', '<input class="input is-focus" value="Mitzi" />')) +
        cell(
          'Error',
          field(
            'Name',
            '<input class="input" aria-invalid="true" value="M" />',
            `<span class="field__error">At least 2 letters.</span>`
          )
        ) +
        cell('Disabled', field('Name', '<input class="input" disabled value="Mitzi" />')) +
        cell(
          'Text area',
          field(
            'Note',
            '<textarea class="textarea" placeholder="Anything we should know"></textarea>'
          )
        ),
      true
    )}<h3>Choice tiles</h3>${grid(
      cell('Default', `<div class="choices">${tile('a', false, false, 'Full bowl')}</div>`) +
        cell('Selected', `<div class="choices">${tile('b', true, false, 'Full bowl')}</div>`) +
        cell('Disabled', `<div class="choices">${tile('c', false, true, 'Full bowl')}</div>`)
    )}<h3>Tabs</h3><div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true">Log</button><button type="button" role="tab" aria-selected="false">Cats</button><button type="button" role="tab" aria-selected="false">Chat</button><button type="button" role="tab" aria-selected="false">History</button></div>`
  );

  /* ----- feedback ----- */
  const notice = (level, ic, title, text) =>
    `<div class="notice" data-level="${level}">${icon(ic)}<div class="notice__body"><strong>${title}</strong><span>${text}</span></div></div>`;
  const chip = (level, ic, text) =>
    `<span class="chip" data-level="${level}">${icon(ic)}<span>${text}</span></span>`;
  const feedback = section(
    'feedback',
    'Feedback',
    'State colour is always paired with an icon and words. A refusal for a gentle reason (too soon, daily limit) is grey, not red.',
    `<h3>Chips: the five states</h3><div class="ds__sample">${chip('green', 'check', 'Water is fine')}${chip('orange', 'clock', 'Food is running low')}${chip('red', 'bowl-empty', 'Needs food')}${chip('none', 'clock', 'No log yet')}${chip('alert', 'siren', 'Cat in danger')}</div>` +
      `<h3>Notices</h3>${grid(
        notice('green', 'check', 'Counted', 'Thank you for feeding.') +
          notice('orange', 'clock', 'Running low', 'Someone should come soon.') +
          notice('red', 'restrict', 'Not allowed', 'This account is blocked.') +
          notice('none', 'clock', 'Too soon', 'You can log again in 2 hours.'),
        true
      )}<h3>Loading: a spinner, and solid skeletons (never see-through)</h3><div class="ds__sample"><span class="spinner"></span></div><div class="ds__sample"><div class="skeleton-post ds__skeleton-post"><div class="skeleton skeleton--media"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></div>` +
      `<h3>Process strip: shown under the top bar while a screen is sending something</h3><div class="process ds__process" role="status"><div class="process__row"><span class="spinner"></span><div><strong>Uploading the photo</strong><span class="small">You can keep filling in the details.</span></div></div></div>` +
      `<h3>Toast: a refusal or a short confirmation that does not move the page</h3><div class="ds__sample"><div class="toast" role="status">${icon('check')}<div class="notice__body"><span>Report sent.</span></div></div><div class="toast" role="alert">${icon('xcircle')}<div class="notice__body"><span>The text did not pass the check. Try rewording it.</span></div></div></div>`
  );

  /* ----- map markers ----- */
  const pins = ['green', 'orange', 'red', 'none']
    .map((level) =>
      cell(
        `Spot: ${level}`,
        window.Mock.pinHtml({ level, kind: 'custom', status: 'active' }) +
          window.Mock.pinHtml({ level, kind: 'custom', status: 'active', selected: true })
      )
    )
    .join('');
  const map = section(
    'map',
    'Map markers',
    'A pin is a teardrop in the state colour and nothing else; the card, the legend and the marker name carry the words. A selected pin is larger with a dark outline. A cat in danger is a plum sign with a stem and a label.',
    `${grid(pins)}<h3>Cat alert sign</h3><div class="ds__sample">${window.Mock.signHtml({ kind: 'danger' })}${window.Mock.signHtml({ kind: 'danger', selected: true })}</div><h3>Your position</h3><div class="ds__sample ds__sample--pad"><span class="here" aria-label="Your position"></span></div>`
  );

  /* ----- glass and surfaces ----- */
  const glass = section(
    'glass',
    'Glass and surfaces',
    'The navigation is slate glass over whatever is behind it (a bar on a phone, a floating rail from 768 px). Floating cards, round buttons, the map search and menus use light glass. Without backdrop-filter or with reduced transparency they turn solid slate or white. The form bar is not glass.',
    `<div class="ds__stage ds__stage--nav" id="nav-slot"></div>` +
      `<h3>Menu: short, 44 px rows</h3><div class="ds__stage ds__sample"><div class="menu"><a class="menu__item" href="#glass">${icon('flag')}<span>Report this photo</span></a><a class="menu__item menu__item--bad" href="#glass">${icon('restrict')}<span>Hide the photo</span></a></div></div>` +
      `<h3>Dialog: in the middle of the screen, with a scrim behind it</h3><div class="ds__sample"><div class="sheet sheet--modal" role="dialog"><h2 class="sheet__title">What do you want to add?</h2><a class="dialog__option" href="#glass"><span class="dialog__icon">${icon('pin')}</span><span class="dialog__text"><strong>New feeding spot</strong><span class="small muted">A place where cats eat and drink.</span></span></a><a class="dialog__option" data-level="alert" href="#glass"><span class="dialog__icon">${icon('siren')}</span><span class="dialog__text"><strong>Report a cat in danger</strong><span class="small muted">A cat that is hurt, sick or in danger now.</span></span></a><button class="btn btn--quiet" type="button">Cancel</button></div></div>` +
      `<h3>Map search and its results</h3><div class="ds__sample ds__sample--map"><div class="maptop ds__maptop"><div class="mapsearch" role="search">${icon('search')}<input class="mapsearch__input" placeholder="City, street, address or spot" /></div><button class="round" type="button" aria-label="Legend">${icon('help')}</button></div></div>`
  );

  /* ----- lists and cards ----- */
  const lists = section(
    'lists',
    'Lists and cards',
    'Rows are one tap target with a chevron; counts are chips; photos use a warm placeholder tone until a real photo loads.',
    `<div class="rows"><a class="row" href="#lists">${icon('pin', 'row__icon')}<span class="row__main"><span class="row__title">Bialik 14, Tel Aviv</span><br /><span class="row__value">Feeding spot</span></span><span class="chip chip--count"><span class="num">3</span></span>${icon('chevron', 'row__chev icon--flip')}</a><a class="row" href="#lists">${icon('cat', 'row__icon')}<span class="row__main"><span class="row__title">Mitzi</span></span>${icon('chevron', 'row__chev icon--flip')}</a></div>` +
      `<div class="ds__sample"><div class="photo photo--square ds__photo" data-tone="1">${icon('cat')}</div><div class="photo photo--square ds__photo" data-tone="2">${icon('cat')}</div><div class="photo photo--square ds__photo" data-tone="3">${icon('cat')}</div><div class="photo photo--square ds__photo" data-tone="4">${icon('cat')}</div></div>` +
      `<h3>Like and comment: outlined when off, solid when on</h3><div class="ds__sample"><button class="react" type="button" aria-pressed="false">${icon('paw')}<span class="num">17</span></button><button class="react" type="button" aria-pressed="true">${icon('paw')}<span class="num">24</span></button><button class="react" type="button">${icon('comment')}<span class="num">3</span></button></div>` +
      `<h3>An alert: photo and words on top, two buttons side by side under them</h3><div class="alerts ds__alerts"><article class="alertrow"><div class="alertrow__top"><div class="photo photo--square" data-tone="1">${icon('cat')}</div><div class="alertrow__main"><div class="alertrow__head"><span class="chip" data-level="alert">${icon('thermometer')}<span>Sick</span></span><span class="alertrow__time small muted">Reported 2 hours ago</span></div><p class="alertrow__note">Limping on a back leg, under a car</p><p class="small muted">320 m · Florentin</p></div></div><div class="alertrow__actions"><a class="btn btn--small" href="#lists">Alert details</a><a class="btn btn--small btn--secondary" href="#lists">Show on map</a></div></article></div>` +
      `<h3>Photos in a grid: three to a row</h3><div class="cat-grid ds__grid-photos">${[1, 2, 3, 4, 3, 2].map((tone) => `<div class="photo photo--square" data-tone="${tone}">${icon('cat')}</div>`).join('')}</div>`
  );

  /* ----- brand and icons ----- */
  const brand = section(
    'icons',
    'Brand mark and icons',
    'The mark is an outline cat head, 2 px strokes with round ends, two dot eyes and a small nose. It sits at the start of every top bar and in the navigation rail, in the colour of the bar. Every icon is drawn on a 24 px grid with the same 2 px stroke.',
    `<div class="ds__sample ds__sample--pad"><svg class="brandmark__glyph ds__brand ds__brand--l" aria-hidden="true"><use href="#i-cat"></use></svg><svg class="brandmark__glyph ds__brand" aria-hidden="true"><use href="#i-cat"></use></svg><span class="topbar__brand"><svg class="brandmark__glyph" aria-hidden="true"><use href="#i-cat"></use></svg></span></div>` +
      `<h3>All icons</h3><div class="ds__icons">${window.MOCK_ICON_IDS.map(
        (id) =>
          `<figure class="ds__icon">${icon(id, 'icon--l')}<figcaption>${id}</figcaption></figure>`
      ).join('')}</div>`
  );

  root.innerHTML = [colour, type, buttons, forms, feedback, map, glass, lists, brand].join('');
  document.getElementById('nav-slot').append(document.querySelector('[data-nav]'));
  window.Mock.refresh(document.body);
})();
