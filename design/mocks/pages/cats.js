/* Cats: sample posts for the feed, the place picker and the state of the post form. */
(function () {
  const { Mock, MockDemo } = window;
  const PHOTO_NAME_MAX = 40;

  const POSTS = [
    {
      tone: 1,
      cat: 'demo.cat1.name',
      user: 'demo.user1.name',
      initials: 'demo.user1.initials',
      place: 'demo.spot1.name',
      hours: 2,
      likes: 24,
      comments: 3,
      liked: true,
    },
    {
      tone: 3,
      cat: 'demo.cat3.name',
      user: 'demo.user2.name',
      initials: 'demo.user2.initials',
      place: 'demo.area1',
      hours: 5,
      likes: 17,
      comments: 0,
      liked: false,
    },
    {
      tone: 4,
      cat: 'demo.cat2.name',
      user: 'demo.user3.name',
      initials: 'demo.user3.initials',
      place: 'demo.station.name',
      hours: 9,
      likes: 6,
      comments: 1,
      liked: false,
    },
  ];

  /* The context menu of a photo: report for everyone, hide and restrict for admins. */
  const MENU =
    '<div class="menu post__menu" id="post-menu" data-when="menu menu-admin">' +
    `<button class="menu__item" type="button"><i data-icon="flag"></i><span data-t="cats.menu.report"></span></button>` +
    `<button class="menu__item menu__item--bad" type="button" data-when="menu-admin"><i data-icon="restrict"></i><span data-t="cats.menu.hide"></span></button>` +
    `<button class="menu__item menu__item--bad" type="button" data-when="menu-admin"><i data-icon="lock"></i><span data-t="chat.admin.restrict"></span></button>` +
    '</div>';

  /* A photo has a required name (at most PHOTO_NAME_MAX characters); the time of posting is the last line. */
  function post(item, index) {
    return (
      '<article class="post">' +
      '<div class="post__media">' +
      `<a href="cats.html?screen=cat" data-t-attr="aria-label:${item.cat}"><div class="photo photo--square" data-tone="${item.tone}"><i data-icon="cat"></i></div></a>` +
      `<span class="post__place"><i data-icon="pin"></i><span data-t="${item.place}"></span></span>` +
      '</div>' +
      '<div class="post__body">' +
      `<div class="post__title"><h2 data-t="${item.cat}"></h2>` +
      `<button class="iconbtn iconbtn--small post__more" type="button" data-disclosure aria-controls="post-menu" data-go="menu" data-t-attr="aria-label:common.more"><i data-icon="more"></i></button></div>` +
      (index === 0 ? MENU : '') +
      `<div class="post__who"><span class="avatar avatar--s" data-t="${item.initials}"></span><bdi data-t="${item.user}"></bdi></div>` +
      '<div class="post__actions">' +
      `<button class="react" type="button" aria-pressed="${item.liked}"><i data-icon="paw"></i><span class="visually-hidden" data-t="cats.like"></span><span class="num">${item.likes}</span></button>` +
      `<a class="react" href="cats.html?screen=cat"><i data-icon="comment"></i><span class="visually-hidden" data-t="cats.comments.label"></span><span class="num">${item.comments}</span></a>` +
      '</div>' +
      `<p class="post__time small muted num" data-t="spot.ago.hours" data-v='{"n":${item.hours}}'></p>` +
      '</div></article>'
    );
  }

  const posts = document.getElementById('posts');
  if (posts) {
    posts.className = 'feed';
    posts.innerHTML = POSTS.map(post).join('');
    Mock.refresh(posts);
    /* The menu belongs to the state, so the page applies the state again now that the posts exist. */
    Mock.setState(Mock.getState());
  }

  /* With location off the feed shows the member's own city. */
  const city = document.getElementById('feed-city');
  if (city) city.textContent = Mock.t('cats.feed.city.title', { city: Mock.t('demo.city') });

  /* ---------- The place picker: the map and the list are one choice ---------- */
  const SPOTS = [
    {
      id: 'red',
      level: 'red',
      kind: 'food',
      name: 'demo.spot1.name',
      address: 'demo.spot1.address',
    },
    {
      id: 'green',
      level: 'green',
      kind: 'both',
      name: 'demo.spot3.name',
      address: 'demo.spot3.address',
    },
    {
      id: 'none',
      level: 'none',
      kind: 'food',
      name: 'demo.station.name',
      address: 'demo.station.address',
    },
  ];
  const picker = document.getElementById('picker-rows');
  const random = document.getElementById('where-random');
  const confirmButton = document.getElementById('picker-confirm');

  function smallPin(spot) {
    return `<span class="pickpin">${Mock.pinHtml(spot)}</span>`;
  }

  if (picker) {
    picker.innerHTML = SPOTS.map(
      (spot) =>
        `<label class="choice choice--row"><input type="radio" name="where" value="${spot.id}" />` +
        `<span class="choice__tile">${smallPin(spot)}` +
        `<span class="pickrow__text"><strong data-t="${spot.name}"></strong><span class="small muted" data-t="${spot.address}"></span></span>` +
        '<span class="choice__mark"><i data-icon="check"></i></span></span></label>'
    ).join('');
    Mock.refresh(picker);
  }

  const radios = () => [...document.querySelectorAll('input[name="where"]')];
  let pickerMap = null;
  let pickerMarkers = [];

  function chosenId() {
    const checked = radios().find((input) => input.checked);
    return checked ? checked.value : '';
  }

  function drawPickerMarkers() {
    pickerMarkers.forEach((marker) => marker.remove());
    pickerMarkers = [];
    if (!pickerMap) return;
    const chosen = chosenId();
    SPOTS.forEach((spot) => {
      const position = MockDemo.spots.find((item) => item.id === spot.id);
      const marker = window.L.marker(
        [position.lat, position.lng],
        Mock.markerOptions(
          Mock.t(spot.name),
          Mock.pinHtml({ ...spot, selected: spot.id === chosen })
        )
      ).addTo(pickerMap);
      marker.on('click', () => choose(spot.id));
      pickerMarkers.push(marker);
    });
  }

  /* One choice at a time: picking on the map ticks the list, and the other way round. */
  function choose(id) {
    radios().forEach((input) => {
      input.checked = input.value === id;
    });
    if (confirmButton) confirmButton.dataset.go = id === 'random' ? 'ready-random' : 'ready-spot';
    drawPickerMarkers();
  }

  radios().forEach((input) => input.addEventListener('change', () => choose(input.value)));

  function mountPickerMap() {
    const host = document.getElementById('picker-map');
    if (!host || !window.L || host.offsetParent === null) return;
    if (!pickerMap) {
      pickerMap = window.L.map(host, { zoomControl: false, attributionControl: false }).setView(
        MockDemo.center,
        16
      );
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
        pickerMap
      );
    }
    Mock.addCredit(host.parentElement);
    pickerMap.invalidateSize();
    drawPickerMarkers();
  }

  /* ---------- The post form ---------- */
  const NAMED = ['ready-spot', 'ready-random', 'ready-fixed', 'uploading', 'nocat'];

  Mock.onState = (state) => {
    if (state === 'picker' || state === 'picker-general') {
      choose(state === 'picker' ? 'red' : 'random');
      mountPickerMap();
    }
    const name = document.getElementById('cat-name');
    if (name) {
      name.value = NAMED.includes(state) ? Mock.t('demo.cat1.name') : '';
      name.maxLength = PHOTO_NAME_MAX;
      name.setAttribute('aria-invalid', String(state === 'noname'));
    }
    /* Started from a spot, the place is fixed: the button cannot change it. */
    const where = document.getElementById('where-pick');
    if (where) where.disabled = state === 'ready-fixed';
  };
  Mock.onState(Mock.getState());
})();
