(function () {
  const params = new URLSearchParams(window.location.search);
  const stage = document.getElementById('stage');
  stage.dataset.device = params.get('device') || 'phone';
  document.getElementById('frame').src = params.get('src') || 'index.html';
})();
