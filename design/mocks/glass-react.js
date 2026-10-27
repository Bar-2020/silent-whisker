/* Glass study: the CSS version of the bar, drawn from the same strings and icons as the app. */
(function () {
  const lang = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  const strings = window.MOCK_LOCALES[lang];
  const TABS = [
    ['map', 'map'],
    ['explore', 'compass'],
    ['alerts', 'alert'],
    ['me', 'user'],
  ];
  window.GlassStudy = { strings, tabs: TABS };
  const items = TABS.map(
    ([id, icon], index) =>
      `<a class="nav__item"${index === 0 ? ' aria-current="page"' : ''}><svg class="icon" aria-hidden="true"><use href="#i-${icon}"></use></svg><span>${strings[`nav.${id}`]}</span></a>`
  ).join('');
  document.getElementById('css-nav').innerHTML = items;
})();
