/* Landing page: the real markers explain the three steps. */
(function () {
  const { Mock } = window;
  document.getElementById('sample-pin').innerHTML = Mock.pinHtml({ level: 'red', kind: 'food' });
  document.getElementById('step-pin-red').innerHTML = Mock.pinHtml({ level: 'red', kind: 'food' });
  document.getElementById('step-pin-green').innerHTML = Mock.pinHtml({
    level: 'green',
    kind: 'both',
  });
  const frame = document.getElementById('hero-map');
  const url = new URL('map.html', window.location.href);
  url.searchParams.set('state', 'spot');
  if (Mock.lang !== 'he') url.searchParams.set('lang', Mock.lang);
  frame.src = url.href;
})();
