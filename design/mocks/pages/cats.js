/* Cats: sample posts for the feed, the place picker and the state of the post form. */
(function () {
  const { Mock } = window;

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
      cat: 'demo.cat2.name',
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
      cat: '',
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
    '<div class="menu post__menu" data-when="menu menu-admin" role="menu">' +
    `<button class="menu__item" type="button"><i data-icon="flag"></i><span data-t="cats.menu.report"></span></button>` +
    `<button class="menu__item menu__item--bad" type="button" data-when="menu-admin"><i data-icon="restrict"></i><span data-t="cats.menu.hide"></span></button>` +
    `<button class="menu__item menu__item--bad" type="button" data-when="menu-admin"><i data-icon="lock"></i><span data-t="chat.admin.restrict"></span></button>` +
    '</div>';

  function post(item, index) {
    const title = item.cat
      ? `<div class="post__title"><h2 data-t="${item.cat}"></h2><span class="small muted num" data-t="spot.ago.hours" data-v='{"n":${item.hours}}'></span></div>`
      : `<div class="post__title"><span></span><span class="small muted num" data-t="spot.ago.hours" data-v='{"n":${item.hours}}'></span></div>`;
    return (
      '<article class="post">' +
      '<div class="post__media">' +
      `<a href="cats.html?screen=cat"><div class="photo photo--square" data-tone="${item.tone}"><i data-icon="cat"></i></div></a>` +
      `<span class="post__place"><i data-icon="pin"></i><span data-t="${item.place}"></span></span>` +
      `<button class="iconbtn post__more" type="button" aria-haspopup="menu" data-go="menu" data-t-attr="aria-label:common.more"><i data-icon="more"></i></button>` +
      (index === 0 ? MENU : '') +
      '</div>' +
      '<div class="post__body">' +
      title +
      `<div class="post__who"><span class="avatar avatar--s" data-t="${item.initials}"></span><bdi data-t="${item.user}"></bdi></div>` +
      '<div class="post__actions">' +
      `<button class="react" type="button" aria-pressed="${item.liked}"><i data-icon="paw"></i><span class="visually-hidden" data-t="cats.like"></span><span class="num">${item.likes}</span></button>` +
      `<a class="react" href="cats.html?screen=cat"><i data-icon="comment"></i><span class="visually-hidden" data-t="cats.comments.label"></span><span class="num">${item.comments}</span></a>` +
      '</div></div></article>'
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

  const picker = document.getElementById('picker-rows');
  if (picker) {
    const spots = [
      { level: 'red', kind: 'food', name: 'demo.spot1.name', address: 'demo.spot1.address' },
      { level: 'green', kind: 'both', name: 'demo.spot3.name', address: 'demo.spot3.address' },
      { level: 'none', kind: 'food', name: 'demo.station.name', address: 'demo.station.address' },
    ];
    picker.innerHTML = spots
      .map(
        (spot, index) =>
          `<button class="row" type="button" data-go="ready-spot"><span class="legend__swatch">${Mock.pinHtml(spot)}</span>` +
          `<span class="row__main"><span class="row__title" data-t="${spot.name}"></span><br /><span class="row__value" data-t="${spot.address}"></span></span>` +
          (index === 0 ? '<i class="check-end" data-icon="check" data-when="picker"></i>' : '') +
          '</button>'
      )
      .join('');
    Mock.refresh(picker);
  }

  Mock.onState = (state) => {
    const random = document.getElementById('where-random');
    if (random) random.checked = state === 'ready-random';
  };
})();
