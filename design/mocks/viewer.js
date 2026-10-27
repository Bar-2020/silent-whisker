/* Screen viewer: the catalogue of every screen and its states, shown in a frame at a chosen width. */
(function () {
  /* A state is "state" or "state/sub"; see mock.js. */
  const CATALOGUE = [
    {
      area: 'Landing and legal',
      items: [
        {
          title: 'Landing page',
          page: 'landing.html',
          screen: 'home',
          states: [
            ['default', 'Default'],
            ['eu', 'EU consent bar'],
          ],
          q: [7, 8, 10, 11, 33],
          note: 'Public. The only page with an ad slot.',
        },
        {
          title: 'Privacy policy',
          page: 'legal.html',
          screen: 'privacy',
          states: [['default', 'Default']],
          q: [],
          note: 'Sample structure; the legal text is the owner’s.',
        },
        {
          title: 'Terms of use',
          page: 'legal.html',
          screen: 'terms',
          states: [['default', 'Default']],
          q: [],
          note: 'Sample structure; the legal text is the owner’s.',
        },
      ],
    },
    {
      area: 'First run',
      items: [
        {
          title: 'Profile questions',
          page: 'first-run.html',
          screen: 'profile',
          states: [
            ['empty', 'Empty'],
            ['filled', 'Filled'],
            ['errors', 'Required errors'],
            ['refused', 'Name refused'],
            ['citynotfound', 'City not found'],
            ['saving', 'Saving'],
            ['nophoto', 'No Google photo'],
          ],
          q: [12, 27],
          note: 'Three questions; no answer to the photo question is pre-selected.',
        },
        {
          title: 'Location screen',
          page: 'first-run.html',
          screen: 'location',
          states: [
            ['ask', 'Ask'],
            ['prompt', 'Browser prompt open'],
          ],
          q: [9],
          note: 'Shown once per device, before the map.',
        },
      ],
    },
    {
      area: 'Map',
      items: [
        {
          title: 'Map',
          page: 'map.html',
          screen: 'map',
          states: [
            ['default', 'Default'],
            ['spot', 'Spot selected'],
            ['alert', 'Cat alert selected'],
            ['plus', '“+” menu'],
            ['legend', 'Legend'],
            ['zoom', 'Zoom-in hint'],
            ['empty', 'No spots here'],
            ['locdenied', 'Location off'],
            ['spot-pending', 'Admin: pending spot'],
          ],
          q: [1, 3, 4, 5, 30],
          note: 'Real OpenStreetMap tiles (needs a network), softened by one CSS filter.',
        },
      ],
    },
    {
      area: 'Spot and logging',
      items: [
        {
          title: 'Spot page',
          page: 'spot.html',
          screen: 'detail',
          states: [
            ['red', 'Food needed'],
            ['orange', 'Running low'],
            ['green', 'All fine'],
            ['none', 'No data'],
            ['inactive', 'Inactive'],
            ['station', 'City station'],
            ['creator', 'Creator'],
            ['pending-creator', 'Pending (creator)'],
            ['pending-admin', 'Pending (admin)'],
            ['notfound', 'Not found'],
          ],
          q: [12, 13, 14, 17, 31],
          note: 'On 1024px and wider the map stays beside the page.',
        },
        {
          title: 'Log a feeding or water',
          page: 'spot.html',
          screen: 'detail',
          states: [
            ['red/ready', 'Chosen'],
            ['red/counted', 'Counted'],
            ['red/unverified', 'Unverified'],
            ['red/toosoon', 'Too soon'],
            ['red/dailycap', 'Daily cap'],
            ['red/attempts', 'Attempt cap'],
            ['red/ratelimit', 'Rate limit'],
            ['red/banned', 'Banned'],
          ],
          q: [13],
          note: 'The answer is only counted or unverified, never a distance.',
        },
        {
          title: '“This is empty” report',
          page: 'spot.html',
          screen: 'detail',
          states: [
            ['red/empty-food', 'Confirm'],
            ['red/empty-done', 'Accepted'],
            ['red/empty-refused', 'Refused'],
          ],
          q: [],
          note: 'One identical message for every refusal.',
        },
        {
          title: 'Report a spot',
          page: 'spot.html',
          screen: 'detail',
          states: [
            ['red/report-confirm', 'Confirm'],
            ['red/report-done', 'Done'],
          ],
          q: [],
          note: 'Hides the item from the reporter at once.',
        },
        {
          title: 'New spot',
          page: 'spot.html',
          screen: 'new',
          states: [
            ['address', 'Address'],
            ['address-error', 'Address not found'],
            ['photo', 'With photo'],
            ['uploading', 'Uploading'],
            ['refused', 'Name refused'],
            ['mylocation', 'My location'],
            ['locating', 'Locating'],
            ['vague', 'Too vague'],
            ['submitted', 'Sent'],
            ['limit', 'Daily limit'],
          ],
          q: [15],
          note: 'Saved as pending until an admin approves.',
        },
        {
          title: 'Edit spot (creator)',
          page: 'spot.html',
          screen: 'edit',
          states: [
            ['default', 'Default'],
            ['refused', 'Name refused'],
          ],
          q: [31],
          note: '',
        },
      ],
    },
    {
      area: 'Explore',
      items: [
        {
          title: 'Feed',
          page: 'cats.html',
          screen: 'feed',
          states: [
            ['default', 'Default'],
            ['loading', 'Loading'],
            ['empty', 'Empty'],
            ['seen', 'Seen everything'],
            ['ownreview', 'Own photo in review'],
          ],
          q: [18, 20],
          note: '',
        },
        {
          title: 'Post a cat',
          page: 'cats.html',
          screen: 'post',
          states: [
            ['choose', 'Choose photo'],
            ['ready-spot', 'At a spot'],
            ['ready-random', 'Not at a spot'],
            ['picker', 'Spot picker'],
            ['uploading', 'Uploading'],
            ['inreview', 'In review'],
            ['nocat', 'No cat found'],
            ['limit', 'Daily limit'],
          ],
          q: [16, 19],
          note: '',
        },
        {
          title: 'One cat and comments',
          page: 'cats.html',
          screen: 'cat',
          states: [
            ['default', 'Default'],
            ['review', 'Own comment in review'],
            ['refused', 'Comment refused'],
            ['restricted', 'Chat restricted'],
            ['limit', 'Daily limit'],
          ],
          q: [19, 12],
          note: '',
        },
      ],
    },
    {
      area: 'Cat alerts',
      items: [
        {
          title: 'Alerts list',
          page: 'alerts.html',
          screen: 'list',
          states: [
            ['default', 'Default'],
            ['soon', 'Expiring soon'],
            ['own', 'Own in review'],
            ['empty', 'Empty'],
            ['admin', 'Admin'],
          ],
          q: [5, 21],
          note: '',
        },
        {
          title: 'Raise an alert',
          page: 'alerts.html',
          screen: 'raise',
          states: [
            ['form', 'Empty form'],
            ['locating', 'Locating'],
            ['ready', 'Ready'],
            ['vague', 'Too vague'],
            ['nopermission', 'Location off'],
            ['submitting', 'Sending'],
            ['inreview', 'In review'],
            ['nocat', 'No cat found'],
            ['refused', 'Note refused'],
            ['limit', 'Daily limit'],
          ],
          q: [22],
          note: 'Needs a photo, a note and a precise location.',
        },
        {
          title: 'One alert',
          page: 'alerts.html',
          screen: 'detail',
          states: [
            ['member', 'Member'],
            ['admin', 'Admin'],
            ['expired', 'Expired (admin)'],
          ],
          q: [14],
          note: 'On 1024px and wider the map stays beside the page.',
        },
      ],
    },
    {
      area: 'Chat',
      items: [
        {
          title: 'Spot chat',
          page: 'chat.html',
          screen: 'thread',
          states: [
            ['default', 'Default'],
            ['loading', 'Loading'],
            ['empty', 'Empty'],
            ['review', 'Own message in review'],
            ['rejected', 'Message refused'],
            ['restricted', 'Chat restricted'],
            ['limit', 'Daily limit'],
            ['banned', 'Banned'],
            ['admin', 'Admin menu'],
          ],
          q: [12, 23],
          note: '',
        },
      ],
    },
    {
      area: 'Profile',
      items: [
        {
          title: 'Profile',
          page: 'profile.html',
          screen: 'me',
          states: [
            ['member', 'Member'],
            ['admin', 'Admin'],
            ['noloc', 'Location off'],
            ['banned', 'Banned'],
          ],
          q: [6, 24, 26, 29],
          note: '',
        },
        {
          title: 'Edit details',
          page: 'profile.html',
          screen: 'edit',
          states: [
            ['default', 'Default'],
            ['cityerror', 'City not found'],
            ['refused', 'Name refused'],
          ],
          q: [],
          note: '',
        },
        {
          title: 'Location help',
          page: 'profile.html',
          screen: 'location-help',
          states: [
            ['denied', 'Denied'],
            ['notasked', 'Not asked'],
            ['granted', 'Granted'],
          ],
          q: [9],
          note: '',
        },
        {
          title: 'Delete account',
          page: 'profile.html',
          screen: 'delete',
          states: [['default', 'Default']],
          q: [25],
          note: 'Not in the spec yet.',
        },
        {
          title: 'Admin: waiting spots',
          page: 'profile.html',
          screen: 'admin-spots',
          states: [
            ['default', 'Default'],
            ['empty', 'Empty'],
          ],
          q: [6],
          note: '',
        },
        {
          title: 'Admin: reported content',
          page: 'profile.html',
          screen: 'admin-reports',
          states: [
            ['default', 'Default'],
            ['empty', 'Empty'],
          ],
          q: [6],
          note: 'The spec has no route to list reports yet.',
        },
      ],
    },
    {
      area: 'Global states',
      items: [
        {
          title: 'No connection',
          page: 'states.html',
          screen: 'offline',
          states: [['default', 'Default']],
          q: [],
          note: '',
        },
        {
          title: 'Sign-in expired',
          page: 'states.html',
          screen: 'session',
          states: [['default', 'Default']],
          q: [],
          note: '',
        },
        {
          title: 'Page not found',
          page: 'states.html',
          screen: 'notfound',
          states: [['default', 'Default']],
          q: [],
          note: '',
        },
        {
          title: 'Language files failed',
          page: 'states.html',
          screen: 'locale-failed',
          states: [['default', 'Default']],
          q: [32],
          note: 'No text exists, so it is an icon and a button.',
        },
        {
          title: 'App starting',
          page: 'states.html',
          screen: 'loading',
          states: [['default', 'Default']],
          q: [],
          note: '',
        },
        {
          title: 'Refusal toast',
          page: 'states.html',
          screen: 'toast',
          states: [
            ['ratelimit', 'Rate limit'],
            ['banned', 'Banned'],
            ['error', 'Error'],
          ],
          q: [29],
          note: '',
        },
      ],
    },
  ];

  /* Extra entries so every screen has its own line, not only a state pill. */
  const group = (name) => CATALOGUE.find((entry) => entry.area === name);
  group('Map').items.push(
    {
      title: 'Map: legend (the "?" button)',
      page: 'map.html',
      screen: 'map',
      states: [['legend', 'Legend']],
      q: [],
      note: 'Opens from the round "?" at the top.',
    },
    {
      title: 'Map: add menu (the "+" button)',
      page: 'map.html',
      screen: 'map',
      states: [['plus', 'Menu open']],
      q: [5],
      note: 'New spot, or raise a cat alert.',
    }
  );
  const feed = group('Explore').items.find((item) => item.screen === 'feed');
  feed.states.push(['menu', 'Photo menu'], ['menu-admin', 'Photo menu (admin)']);
  const post = group('Explore').items.find((item) => item.screen === 'post');
  post.states = post.states.filter(([id]) => id !== 'picker');
  group('Explore').items.push({
    title: 'Pick a place for the photo',
    page: 'cats.html',
    screen: 'post',
    states: [
      ['picker', 'A spot is picked'],
      ['picker-general', 'Not at a spot'],
    ],
    q: [16],
    note: 'A feeding spot, or a cat that is not at one.',
  });
  CATALOGUE.splice(1, 0, {
    area: 'Onboarding (a new member)',
    items: [
      {
        title: '1. Landing page',
        page: 'landing.html',
        screen: 'home',
        states: [['default', 'Default']],
        q: [7, 8],
        note: 'Then the hosted Google sign-in, which is not our screen (Q7).',
      },
      {
        title: '2. Profile questions',
        page: 'first-run.html',
        screen: 'profile',
        states: [
          ['empty', 'Empty'],
          ['filled', 'Filled'],
        ],
        q: [12],
        note: '',
      },
      {
        title: '3. Location',
        page: 'first-run.html',
        screen: 'location',
        states: [['ask', 'Ask']],
        q: [9],
        note: '',
      },
      {
        title: '4. The first map',
        page: 'map.html',
        screen: 'map',
        states: [
          ['default', 'Location on'],
          ['locdenied', 'Location refused'],
        ],
        q: [],
        note: '',
      },
    ],
  });

  const QUESTIONS = {
    1: 'Light theme only in v1',
    3: 'Own icon set',
    4: 'Map tile look',
    5: 'Four tabs and a “+”',
    6: 'Where admins see what is waiting',
    7: 'Hosted Google sign-in screen',
    8: 'Terms consent line',
    9: '“Continue without location”',
    10: 'Ads and the EU consent banner',
    11: 'Where the donation link lives',
    12: 'How members are named to others',
    13: 'No distance to the spot',
    14: 'A navigate link',
    15: 'No reason on rejection',
    16: 'Spot picker for cat photos',
    17: 'Unverified logs in the history',
    18: 'Own photo while in review',
    19: 'Deleting own photo or comment',
    20: 'Note when the feed repeats',
    21: 'Distance on each alert',
    22: 'Alert note length',
    23: 'Chat order',
    24: 'What “cats helped” counts',
    25: 'Delete my account',
    26: 'Where the language switch is',
    27: 'Gender-neutral Hebrew',
    29: 'A banned member',
    30: 'A list for people who cannot use a map',
    31: 'Logs at an inactive spot',
    32: 'Label for the icon-only retry screen',
    33: 'A Hebrew name for the app',
  };

  const DEVICES = [
    ['phone', 'Phone 360'],
    ['phone-tall', 'Phone 360 tall'],
    ['phone-xs', 'iPhone 375'],
    ['tablet', 'Tablet 768'],
    ['laptop', 'Laptop 1024'],
    ['desktop', 'Desktop 1280'],
  ];
  const ZOOMS = [
    ['100', '100%'],
    ['75', '75%'],
    ['50', '50%'],
  ];
  const LANGS = [
    ['he', 'עברית'],
    ['en', 'English'],
  ];

  const params = new URLSearchParams(window.location.hash.slice(1));
  const view = {
    item: Number(params.get('item') || 0),
    state: Number(params.get('state') || 0),
    device: params.get('device') || 'phone',
    zoom: params.get('zoom') || '100',
    lang: params.get('lang') || 'he',
  };

  const flat = CATALOGUE.flatMap((group) => group.items);
  window.ViewerCatalogue = flat;
  const el = (id) => document.getElementById(id);

  function segment(host, options, key) {
    host.innerHTML = '';
    options.forEach(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-pressed', String(view[key] === value));
      button.addEventListener('click', () => {
        view[key] = value;
        render();
      });
      host.append(button);
    });
  }

  function frameUrl(item, stateId) {
    const [state, sub] = stateId.split('/');
    const url = new URL(item.page, window.location.href);
    url.searchParams.set('screen', item.screen);
    url.searchParams.set('state', state);
    if (sub) url.searchParams.set('sub', sub);
    if (view.lang !== 'he') url.searchParams.set('lang', view.lang);
    return url;
  }

  function renderList() {
    const list = el('list');
    list.innerHTML = '';
    let index = 0;
    CATALOGUE.forEach((group) => {
      const heading = document.createElement('h2');
      heading.textContent = group.area;
      list.append(heading);
      group.items.forEach((item) => {
        const itemIndex = index;
        index += 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'viewer__item';
        button.textContent = item.title;
        button.setAttribute('aria-current', String(itemIndex === view.item));
        button.addEventListener('click', () => {
          view.item = itemIndex;
          view.state = 0;
          render();
        });
        list.append(button);
        if (itemIndex === view.item) {
          const states = document.createElement('div');
          states.className = 'viewer__states';
          item.states.forEach(([id, label], stateIndex) => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'viewer__state';
            pill.textContent = label;
            pill.setAttribute('aria-pressed', String(stateIndex === view.state));
            pill.addEventListener('click', () => {
              view.state = stateIndex;
              render();
            });
            states.append(pill);
          });
          list.append(states);
        }
      });
    });
  }

  function render() {
    const item = flat[view.item];
    const [stateId, stateLabel] = item.states[view.state] || item.states[0];
    const url = frameUrl(item, stateId);
    el('frame').src = url.href;
    el('open-tab').href = url.href;
    el('stage').dataset.device = view.device;
    el('stage').dataset.zoom = view.zoom;
    el('caption-title').textContent = `${item.title}: ${stateLabel}`;
    el('caption-detail').textContent = item.note;
    const questions = el('caption-questions');
    questions.innerHTML = '';
    item.q.forEach((number) => {
      const chip = document.createElement('span');
      chip.className = 'tag tag--pending';
      chip.textContent = `Needs a decision: ${QUESTIONS[number]} (Q${number})`;
      questions.append(chip);
    });
    segment(el('seg-device'), DEVICES, 'device');
    segment(el('seg-zoom'), ZOOMS, 'zoom');
    segment(el('seg-lang'), LANGS, 'lang');
    renderList();
    window.location.hash = new URLSearchParams(
      Object.entries(view).map(([k, v]) => [k, String(v)])
    ).toString();
  }

  render();
})();
