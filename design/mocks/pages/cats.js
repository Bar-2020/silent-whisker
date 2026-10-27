/* Cats: sample posts for the feed, the spot picker and the radio state of the post form. */
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

  function post(item) {
    const name = item.cat ? `<strong data-t="${item.cat}"></strong>` : '';
    return (
      `<article class="post">` +
      `<header class="post__head"><span class="avatar" data-t="${item.initials}"></span>` +
      `<div class="post__who"><strong><bdi data-t="${item.user}"></bdi></strong>` +
      `<div class="small muted"><i data-icon="pin" data-class="icon--s"></i> <span data-t="${item.place}"></span> · <span class="num" data-t="spot.ago.hours" data-v='{"n":${item.hours}}'></span></div></div>` +
      `<button class="iconbtn" type="button" data-t-attr="aria-label:common.more"><i data-icon="more"></i></button></header>` +
      `<a href="cats.html?screen=cat"><div class="photo photo--square" data-tone="${item.tone}"><i data-icon="cat"></i><span class="photo__caption" data-t="common.samplePhoto"></span></div></a>` +
      `<div class="post__actions"><button class="like" type="button" aria-pressed="${item.liked}"><i data-icon="heart"></i><span class="num">${item.likes}</span></button>` +
      `<a class="like" href="cats.html?screen=cat"><i data-icon="comment"></i><span class="num">${item.comments}</span></a></div>` +
      `<div class="post__foot">${name}</div></article>`
    );
  }

  const posts = document.getElementById('posts');
  if (posts) {
    posts.className = 'feed';
    posts.innerHTML = POSTS.map(post).join('');
    Mock.refresh(posts);
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
        (spot) =>
          `<button class="row" type="button" data-go="ready-spot"><span class="legend__swatch">${Mock.pinHtml(spot)}</span>` +
          `<span class="row__main"><span class="row__title" data-t="${spot.name}"></span><br /><span class="row__value" data-t="${spot.address}"></span></span></button>`
      )
      .join('');
    Mock.refresh(picker);
  }

  Mock.onState = (state) => {
    const spot = document.getElementById('where-spot');
    const random = document.getElementById('where-random');
    if (!spot || !random) return;
    spot.checked = ['ready-spot', 'uploading', 'nocat'].includes(state);
    random.checked = state === 'ready-random';
  };
  Mock.onState(Mock.getState());
})();
