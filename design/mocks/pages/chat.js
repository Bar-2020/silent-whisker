/* Chat: a refused message stays in the box so it can be reworded; the refusal itself is a toast. */
(function () {
  const { Mock } = window;
  Mock.onState = (state) => {
    const input = document.querySelector('.composer__input');
    if (!input) return;
    input.value = state === 'rejected' ? Mock.t('demo.badMsg') : '';
  };
  Mock.onState(Mock.getState());
})();
