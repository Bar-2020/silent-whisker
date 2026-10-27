/* First run: fill the sample answers for the states that show a filled form or an error. */
(function () {
  const { Mock } = window;
  const FILLED = ['filled', 'citynotfound', 'saving', 'refused'];
  const INVALID = { errors: ['fullname', 'city'], refused: ['fullname'], citynotfound: ['city'] };

  Mock.onState = (state) => {
    const name = document.getElementById('fullname');
    const city = document.getElementById('city');
    if (!name || !city) return;
    name.value = FILLED.includes(state) ? Mock.t('demo.fullName') : '';
    city.value = FILLED.includes(state)
      ? Mock.t(state === 'citynotfound' ? 'demo.cityBad' : 'demo.city')
      : '';
    [name, city].forEach((input) => {
      input.setAttribute('aria-invalid', String((INVALID[state] || []).includes(input.id)));
    });
  };
  Mock.onState(Mock.getState());
})();
