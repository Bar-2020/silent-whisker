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
  Mock.onState(Mock.getState());
})();
