/* Map page: markers, selection and the legend. */
(function () {
  const { Mock, MockDemo } = window;
  const STATE_VIEW = { zoom: 12, empty: 15 };
  const EMPTY_CENTER = [32.0525, 34.7607];
  const DEFAULT_ZOOM = 16;

  const host = document.getElementById('map');
  let map = null;
  let layers = [];

  function select(state) {
    Mock.setState(state);
  }

  const pendingState = (state) => state.startsWith('spot-pending');

  function draw(state) {
    layers.forEach((layer) => layer.remove());
    layers = [];
    if (!map || state === 'zoom' || state === 'empty') return;
    const selectedSpot = state === 'spot';
    const items = MockDemo.spots.map((spot) => ({
      ...spot,
      selected: selectedSpot && spot.id === 'red',
      onClick: () => select('spot'),
    }));
    if (pendingState(state)) {
      items.push({ ...MockDemo.pending, selected: true, onClick: () => select('spot-pending') });
    }
    const alerts = MockDemo.alerts.map((item) => ({
      ...item,
      selected: state === 'alert' && item.id === 'danger',
      onClick: () => select('alert'),
    }));
    items.forEach((spot) => {
      const marker = window.L.marker(
        [spot.lat, spot.lng],
        Mock.markerOptions(`${Mock.t(spot.name)}: ${Mock.pinLabel(spot)}`, Mock.pinHtml(spot))
      ).addTo(map);
      marker.on('click', spot.onClick);
      layers.push(marker);
    });
    alerts.forEach((item) => {
      const marker = window.L.marker(
        [item.lat, item.lng],
        Mock.markerOptions(Mock.t(`alerts.kind.${item.kind}`), Mock.signHtml(item))
      ).addTo(map);
      marker.on('click', item.onClick);
      layers.push(marker);
    });
    if (state !== 'locdenied') {
      layers.push(
        window.L.marker(MockDemo.here, {
          icon: window.L.divIcon({
            className: '',
            html: `<div class="here" role="img" aria-label="${Mock.t('map.here')}"></div>`,
            iconSize: null,
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map)
      );
    }
  }

  if (window.L) {
    map = window.L.map(host, { zoomControl: false, attributionControl: false }).setView(
      MockDemo.center,
      DEFAULT_ZOOM
    );
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
      map
    );
    Mock.addCredit(host.parentElement);
  } else {
    host.dataset.failed = 'true';
  }

  const search = document.getElementById('map-search');

  /* The list of spots to feed opens like a card (D-103): the map behind it is inert, focus moves into
     it, and Escape or the X closes it and gives focus back to its button. */
  const LIST_STATES = ['list', 'list-empty'];
  const listButton = document.getElementById('list-open');
  const listTitle = document.getElementById('list-h');
  let listWasOpen = false;

  function syncList(state) {
    const open = LIST_STATES.includes(state);
    host.inert = open;
    if (open && !listWasOpen) listTitle.focus();
    if (!open && listWasOpen && state === 'default') listButton.focus();
    listWasOpen = open;
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && LIST_STATES.includes(Mock.getState())) Mock.setState('default');
  });

  Mock.onState = (state) => {
    syncList(state);
    if (search) {
      search.setAttribute('aria-expanded', String(state === 'search' || state === 'search-none'));
      search.value =
        state === 'search'
          ? Mock.t('demo.search')
          : state === 'search-none'
            ? Mock.t('demo.searchNone')
            : '';
    }
    if (map) {
      const zoom = STATE_VIEW[state] || DEFAULT_ZOOM;
      map.setView(state === 'empty' ? EMPTY_CENTER : MockDemo.center, zoom, { animate: false });
    }
    draw(state);
  };
  Mock.onState(Mock.getState());

  /* The spots to feed near the phone, in the order D-103 sets: red with kittens, red, then the rest
     (kittens seen, orange, no data), nearest first inside each group. */
  const LEVEL_ICON = { red: 'bowl-empty', orange: 'clock', none: 'dash' };
  const FEED_ROWS = [
    { name: 'demo.spot1.name', level: 'red', state: 'kittens', m: 80, kittens: true },
    { name: 'demo.spot2.name', level: 'red', m: 410 },
    { name: 'demo.spot5.name', level: 'red', m: 650 },
    { name: 'demo.spot6.name', level: 'orange', m: 520, kittens: true },
    { name: 'demo.spot3.name', level: 'orange', m: 210 },
    { name: 'demo.spot7.name', level: 'orange', m: 940 },
    { name: 'demo.station.name', level: 'none', m: 300 },
    { name: 'demo.spot8.name', level: 'none', m: 1400 },
  ];
  const KITTENS_TAG =
    '<span class="tag"><i data-icon="paw" data-class="icon--s"></i><span data-t="spot.tag.kittens"></span></span>';
  const feedRow = ({ name, level, state, m, kittens }) => {
    const [unit, n] = m < 1000 ? ['m', m] : ['km', m / 1000];
    return (
      `<a class="results__item" href="spot.html?screen=detail&state=${state || level}">` +
      '<span class="results__icon"><i data-icon="pin"></i></span><span class="results__text">' +
      `<span class="results__head"><strong data-t="${name}"></strong>` +
      `<span class="results__distance num small muted" data-t="map.list.distance.${unit}" data-v='{"n":${n}}'></span></span>` +
      `<span class="results__meta"><span class="chip" data-level="${level}"><i data-icon="${LEVEL_ICON[level]}"></i>` +
      `<span data-t="map.legend.${level}"></span></span>${kittens ? KITTENS_TAG : ''}</span></span></a>`
    );
  };
  const feedList = document.querySelector('.sheet__list');
  feedList.innerHTML = FEED_ROWS.map(feedRow).join('');
  Mock.drawIcons(feedList);
  Mock.translate(feedList);

  const legend = [
    { pin: { level: 'red', kind: 'food' }, key: 'map.legend.red' },
    { pin: { level: 'orange', kind: 'water' }, key: 'map.legend.orange' },
    { pin: { level: 'green', kind: 'both' }, key: 'map.legend.green' },
    { pin: { level: 'none', kind: 'food' }, key: 'map.legend.none' },
    { pin: { level: 'green', kind: 'food', status: 'inactive' }, key: 'map.legend.inactive' },
    { pin: { level: 'none', kind: 'food', status: 'pending' }, key: 'map.legend.pending' },
  ];
  const rows = legend.map(
    (item) =>
      `<div class="legend__item"><span class="legend__swatch">${Mock.pinHtml(item.pin)}</span><span>${Mock.t(item.key)}</span></div>`
  );
  rows.push(
    `<div class="legend__item"><span class="legend__swatch">${Mock.signHtml({ kind: 'danger' })}</span><span>${Mock.t('map.legend.alert')}</span></div>`,
    `<div class="legend__item"><span class="legend__swatch">${Mock.signHtml({ kind: 'neuter' })}</span><span>${Mock.t('map.legend.neuter')}</span></div>`
  );
  document.getElementById('legend').innerHTML = rows.join('');
})();
