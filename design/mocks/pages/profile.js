/* Profile: the edit form shows the member's saved answers. */
(function () {
  const { Mock } = window;
  Mock.onState = (state) => {
    const name = document.getElementById('edit-fullname');
    const city = document.getElementById('edit-city');
    if (!name || !city) return;
    name.value = Mock.t(state === 'refused' ? 'demo.badName' : 'demo.fullName');
    city.value = Mock.t(state === 'cityerror' ? 'demo.cityBad' : 'demo.city');
    name.setAttribute('aria-invalid', String(state === 'refused'));
    city.setAttribute('aria-invalid', String(state === 'cityerror'));
  };
  document.querySelectorAll('[data-lang-option]').forEach((option) => {
    if (option.dataset.langOption === Mock.lang) {
      option.setAttribute('aria-current', 'true');
      option.insertAdjacentHTML('beforeend', '<i class="check-end" data-icon="check"></i>');
    }
  });
  Mock.refresh(document.body);
  Mock.onState(Mock.getState());
})();
