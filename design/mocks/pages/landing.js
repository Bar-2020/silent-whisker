/* Landing page: the real markers explain the three steps. */
(function () {
  const { Mock } = window;
  document.getElementById('sample-pin').innerHTML = Mock.pinHtml({ level: 'red', kind: 'food' });
  document.getElementById('step-pin-red').innerHTML = Mock.pinHtml({ level: 'red', kind: 'food' });
  document.getElementById('step-pin-green').innerHTML = Mock.pinHtml({
    level: 'green',
    kind: 'both',
  });
})();
