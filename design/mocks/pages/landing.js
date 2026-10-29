/* Landing page: the real markers explain the three steps, and the made-by line draws its own heart. */
(function () {
  const { Mock } = window;
  document.getElementById('step-pin-red').innerHTML = Mock.pinHtml({ level: 'red', kind: 'food' });
  document.getElementById('step-pin-green').innerHTML = Mock.pinHtml({
    level: 'green',
    kind: 'both',
  });

  /* "Made with {heart} by ...": the heart is a drawn icon, not an emoji. */
  const madeBy = document.getElementById('made-by');
  const [before, after] = Mock.t('landing.madeBy', { heart: '\u0000' }).split('\u0000');
  const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  heart.setAttribute('class', 'icon icon--s icon--fill sitefoot__heart');
  heart.setAttribute('aria-hidden', 'true');
  heart.innerHTML = '<use href="#i-heart"></use>';
  madeBy.replaceChildren(before, heart, after);

  /* The frame shows the map as it looks inside a phone, below the camera island. */
  const frame = document.getElementById('hero-map');
  const url = new URL('map.html', window.location.href);
  url.searchParams.set('state', 'spot');
  url.searchParams.set('frame', '1');
  if (Mock.lang !== 'he') url.searchParams.set('lang', Mock.lang);
  frame.src = url.href;
})();
