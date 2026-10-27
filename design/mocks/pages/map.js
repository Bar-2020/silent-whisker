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
    if (state === 'spot-pending') {
      items.push({ ...MockDemo.pending, selected: true, onClick: () => select('spot-pending') });
    }
    const alerts = MockDemo.alerts.map((item) => ({
      ...item,
      selected: state === 'alert' && item.id === 'danger',
      onClick: () => select('alert'),
    }));
    items.forEach((spot) => {
      const marker = window.L.marker([spot.lat, spot.lng], {
        icon: window.L.divIcon({ className: '', html: Mock.pinHtml(spot), iconSize: null }),
        keyboard: false,
      }).addTo(map);
      marker.on('click', spot.onClick);
      layers.push(marker);
    });
    alerts.forEach((item) => {
      const marker = window.L.marker([item.lat, item.lng], {
        icon: window.L.divIcon({ className: '', html: Mock.signHtml(item), iconSize: null }),
        keyboard: false,
      }).addTo(map);
      marker.on('click', item.onClick);
      layers.push(marker);
    });
    layers.push(
      window.L.marker(MockDemo.here, {
        icon: window.L.divIcon({ className: '', html: '<div class="here"></div>', iconSize: null }),
        interactive: false,
      }).addTo(map)
    );
  }

  if (window.L) {
    map = window.L.map(host, { zoomControl: false, attributionControl: false }).setView(
      MockDemo.center,
      DEFAULT_ZOOM
    );
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
      map
    );
    Mock.addAttribution(map);
  } else {
    host.dataset.failed = 'true';
  }

  Mock.onState = (state) => {
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
    `<div class="legend__item"><span class="legend__swatch">${Mock.signHtml({ kind: 'danger' })}</span><span>${Mock.t('map.legend.alert')}</span></div>`
  );
  document.getElementById('legend').innerHTML = rows.join('');
})();
