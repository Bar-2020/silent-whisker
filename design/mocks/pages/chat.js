/* Chat: a refused message stays in the box so it can be reworded. */
(function () {
  const { Mock } = window;
  Mock.onState = (state) => {
    const input = document.querySelector('.composer__input');
    if (!input) return;
    input.value = state === 'rejected' ? Mock.t('demo.badMsg') : '';
    input.setAttribute('aria-invalid', String(state === 'rejected'));
  };
  Mock.onState(Mock.getState());
})();
