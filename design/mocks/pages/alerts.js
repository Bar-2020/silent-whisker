/* Alerts: the raise form's filled states and the side map on wide screens. */
(function () {
  const { Mock, MockDemo } = window;
  const FILLED = ['ready', 'submitting', 'nocat', 'limit', 'refused'];
  const NOTE_STATES = {
    ready: 'demo.alert1.note',
    submitting: 'demo.alert1.note',
    nocat: 'demo.alert1.note',
    limit: 'demo.alert1.note',
    refused: 'demo.badNote',
  };

  let map = null;
  function mountSideMap() {
    const host = document.getElementById('alert-map');
    if (!host || !window.L || window.getComputedStyle(host.parentElement).display === 'none')
      return;
    if (map) {
      map.invalidateSize();
      return;
    }
    const focus = MockDemo.alerts[0];
    map = window.L.map(host, { zoomControl: false, attributionControl: false }).setView(
      [focus.lat, focus.lng],
      17
    );
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
      map
    );
    window.L.marker(
      [focus.lat, focus.lng],
      Mock.markerOptions(
        Mock.t(`alerts.kind.${focus.kind}`),
        Mock.signHtml({ ...focus, selected: true })
      )
    ).addTo(map);
  }
  new ResizeObserver(mountSideMap).observe(document.body);

  Mock.onState = (state) => {
    const danger = document.getElementById('kind-danger');
    const note = document.getElementById('alert-note');
    if (danger && note) {
      danger.checked = FILLED.includes(state);
      note.value = FILLED.includes(state) ? Mock.t(NOTE_STATES[state]) : '';
      const counter = document.querySelector('.counter');
      counter.dataset.v = JSON.stringify({ n: note.value.length, max: 140 });
      Mock.refresh(counter.parentElement);
      note.setAttribute('aria-invalid', String(state === 'refused'));
    }
    mountSideMap();
  };
  Mock.onState(Mock.getState());
})();
