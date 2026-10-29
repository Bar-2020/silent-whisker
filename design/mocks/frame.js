(function () {
  const params = new URLSearchParams(window.location.search);
  const stage = document.getElementById('stage');
  stage.dataset.device = params.get('device') || 'phone';
  /* Only a mock page of this folder may be shown: a relative .html name, no scheme. */
  const src = params.get('src') || '';
  const local = /^[\w-]+\.html(\?[^#]*)?$/.test(src);
  document.getElementById('frame').src = local ? src : 'index.html';
})();
