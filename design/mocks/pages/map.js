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

  Mock.onState = (state) => {
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
