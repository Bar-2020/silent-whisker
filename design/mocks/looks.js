/* Compare looks: one row per screen, one column per look, every cell a live frame. */
(function () {
  const LOOKS = [
    ['stairwell', 'A  Stairwell', 'White wall, slate-blue glass. The one built so far.'],
    ['plate', 'B  Street plate', 'Enamel blue, white edges, small sharp corners.'],
    ['city', 'C  White City', 'Graphite and off-white, square corners, no colour in the shell.'],
    [
      'trail',
      'D  Trail map',
      'Sand ground, teal-slate glass, an orange blaze for the divider line.',
    ],
    ['standard', 'E  Standard', 'The plain map-app look: white, grey and a blue action colour.'],
  ];
  const SCREENS = [
    ['Map with a spot selected', 'map.html?state=spot'],
    ['Spot page', 'spot.html?screen=detail&state=red'],
    ['Landing page', 'landing.html'],
    ['Cats feed', 'cats.html?screen=feed'],
    ['Raise a cat alert', 'alerts.html?screen=raise&state=ready'],
  ];
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang') === 'en' ? 'en' : 'he';

  const seg = document.getElementById('seg-lang');
  [
    ['he', 'עברית'],
    ['en', 'English'],
  ].forEach(([code, label]) => {
    const link = document.createElement('a');
    link.href = `?lang=${code}`;
    link.textContent = label;
    link.setAttribute('aria-current', String(code === lang));
    seg.append(link);
  });

  const grid = document.getElementById('grid');
  SCREENS.forEach(([title, page]) => {
    const row = document.createElement('section');
    row.className = 'looks__row';
    const heading = document.createElement('h2');
    heading.textContent = title;
    row.append(heading);
    const cells = document.createElement('div');
    cells.className = 'looks__cells';
    LOOKS.forEach(([id, name, text]) => {
      const cell = document.createElement('figure');
      cell.className = 'looks__cell';
      const frame = document.createElement('iframe');
      frame.className = 'frame frame--mini';
      frame.title = `${title}, look ${name}`;
      frame.loading = 'lazy';
      const url = new URL(page, window.location.href);
      if (lang !== 'he') url.searchParams.set('lang', lang);
      if (id !== 'stairwell') url.searchParams.set('look', id);
      frame.src = url.href;
      const caption = document.createElement('figcaption');
      const strong = document.createElement('strong');
      strong.textContent = name;
      const small = document.createElement('span');
      small.className = 'muted small';
      small.textContent = text;
      caption.append(strong, small);
      cell.append(frame, caption);
      cells.append(cell);
    });
    row.append(cells);
    grid.append(row);
  });
})();
