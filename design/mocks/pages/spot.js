/* Spot pages: the state rows, the log form and the side map on wide screens. */
(function () {
  const { Mock, MockDemo } = window;

  /* What each spot state shows: [level, hours since the last counted log, bowl amount]. */
  const VIEWS = {
    red: {
      name: 'demo.spot1.name',
      address: 'demo.spot1.address',
      food: ['red', 26, 'full'],
      water: ['green', 6],
    },
    orange: {
      name: 'demo.spot1.name',
      address: 'demo.spot1.address',
      food: ['orange', 19, 'full'],
      water: ['orange', 20],
    },
    green: {
      name: 'demo.spot1.name',
      address: 'demo.spot1.address',
      food: ['green', 5, 'full'],
      water: ['green', 3],
    },
    none: {
      name: 'demo.spot1.name',
      address: 'demo.spot1.address',
      food: ['none'],
      water: ['none'],
    },
    inactive: {
      name: 'demo.spot3.name',
      address: 'demo.spot3.address',
      food: ['green', 30, 'partial'],
      water: ['green', 28],
    },
    station: {
      name: 'demo.station.name',
      address: 'demo.station.address',
      food: ['none'],
      water: ['none'],
    },
    creator: {
      name: 'demo.spot1.name',
      address: 'demo.spot1.address',
      food: ['orange', 10, 'partial'],
      water: ['green', 4],
    },
    'pending-creator': { name: 'demo.spot2.name', address: 'demo.spot2.address' },
    'pending-admin': { name: 'demo.spot2.name', address: 'demo.spot2.address' },
    notfound: { name: 'spot.notFound.title', address: 'spot.notFound.title' },
  };
  const LEVEL_MARK = { green: 'check', orange: 'clock', red: 'exclaim', none: 'dash' };
  const DETAIL_STATES = Object.keys(VIEWS);
  const PLACE_STATES = ['address', 'address-error', 'photo', 'uploading', 'refused'];
  const LOG_RESULTS = [
    'counted',
    'unverified',
    'toosoon',
    'dailycap',
    'attempts',
    'ratelimit',
    'banned',
  ];

  function stateRow(kind, level, hours, amount) {
    const icon = kind === 'food' ? 'bowl' : 'drop';
    let when = 'spot.last.none';
    if (level !== 'none') when = kind === 'water' ? 'spot.last.water' : `spot.last.${amount}`;
    if (hours === 0) when = 'spot.last.justNow';
    const action =
      level === 'none'
        ? ''
        : `<div class="state__actions"><button class="btn btn--secondary btn--small" type="button" data-go="/empty-${kind}" data-t="spot.empty.${kind}"></button></div>`;
    return (
      `<div class="state" data-level="${level}">` +
      `<span class="state__icon"><i data-icon="${icon}"></i></span>` +
      `<div class="cluster"><h3 class="state__label" data-t="spot.state.${kind}"></h3>` +
      `<span class="chip"><i data-icon="${LEVEL_MARK[level]}"></i><span data-t="level.${kind}.${level}"></span></span></div>` +
      `<p class="state__when num" data-t="${when}" data-v='{"n":${hours || 0}}'></p>${action}</div>`
    );
  }

  function renderDetail(state) {
    const view = VIEWS[state];
    if (!view) return;
    const title = document.getElementById('spot-title');
    title.dataset.t = view.name;
    document.getElementById('spot-address').dataset.t = view.address;
    const host = document.getElementById('state-rows');
    /* A counted log turns the row green at once: the proof moment. */
    const counted = Mock.getSub() === 'counted' && state === 'red';
    const food = counted ? ['green', 0, 'full'] : view.food;
    host.innerHTML = view.food ? stateRow('food', ...food) + stateRow('water', ...view.water) : '';
    Mock.refresh(document.querySelector('[data-screen="detail"]'));
  }

  /* The log form: pick one of three, then the button wakes up. */
  const submit = document.getElementById('log-submit');
  document.querySelectorAll('input[name="kind"]').forEach((input) => {
    input.addEventListener('change', () => {
      submit.disabled = false;
    });
  });

  function applySub() {
    const sub = Mock.getSub();
    const form = document.getElementById('log');
    if (form && (sub === 'ready' || LOG_RESULTS.includes(sub))) {
      const first = form.querySelector('input[name="kind"]');
      first.checked = true;
      submit.disabled = LOG_RESULTS.includes(sub);
    }
    /* A counted or unverified log reports at the top, beside the rows it changes; refusals stay at the form. */
    if (sub === 'counted' || sub === 'unverified') window.scrollTo(0, 0);
    else if (form && (sub === 'ready' || LOG_RESULTS.includes(sub))) form.scrollIntoView();
  }

  /* New spot and edit. */
  function applyForms(state) {
    const address = document.getElementById('place-address');
    const here = document.getElementById('place-here');
    if (address && here) {
      const wantsAddress = PLACE_STATES.includes(state);
      address.checked = wantsAddress;
      here.checked = !wantsAddress && ['mylocation', 'locating', 'vague'].includes(state);
      const addressInput = document.getElementById('spot-address-input');
      const filled = ['address-error', 'photo', 'uploading', 'refused'].includes(state);
      addressInput.value = filled
        ? Mock.t(state === 'address-error' ? 'demo.addressBad' : 'demo.spot2.address')
        : '';
      addressInput.setAttribute('aria-invalid', String(state === 'address-error'));
      const nameInput = document.getElementById('spot-name');
      nameInput.value = ['photo', 'uploading', 'refused'].includes(state)
        ? Mock.t('demo.spot2.name')
        : '';
      nameInput.setAttribute('aria-invalid', String(state === 'refused'));
    }
    const edit = document.getElementById('edit-name');
    if (edit) {
      edit.value = Mock.t(state === 'refused' ? 'demo.badName' : 'demo.spot1.name');
      edit.setAttribute('aria-invalid', String(state === 'refused'));
    }
  }

  /* Wide screens show the spot on a map next to the panel. */
  let map = null;
  function mountSideMap() {
    const host = document.getElementById('spot-map');
    if (!host || !window.L || window.getComputedStyle(host.parentElement).display === 'none')
      return;
    if (map) {
      map.invalidateSize();
      return;
    }
    const focus = MockDemo.spots[0];
    map = window.L.map(host, { zoomControl: false, attributionControl: false }).setView(
      [focus.lat, focus.lng],
      17
    );
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
      map
    );
    Mock.addAttribution(map);
    MockDemo.spots.slice(0, 4).forEach((spot) => {
      const selected = { ...spot, selected: spot.id === 'red' };
      window.L.marker(
        [spot.lat, spot.lng],
        Mock.markerOptions(Mock.pinLabel(spot), Mock.pinHtml(selected))
      ).addTo(map);
    });
  }
  new ResizeObserver(mountSideMap).observe(document.body);

  Mock.onState = (state) => {
    if (DETAIL_STATES.includes(state)) renderDetail(state);
    applyForms(state);
    applySub();
    mountSideMap();
  };
  Mock.onState(Mock.getState());
})();
