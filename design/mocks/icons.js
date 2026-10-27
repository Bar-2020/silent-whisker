/* The icon set: 24px grid, 2px stroke, round ends, one weight. Injected as an SVG sprite so the
   mocks also open straight from disk (an external sprite file is blocked there). In the app this
   becomes one sprite file served beside the build. */
(function () {
  const ICONS = {
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    cat: '<path d="M4 10V4l4.5 3h7L20 4v6c0 5-3.5 9-8 9s-8-4-8-9z"/><path d="M9 11.5h.01M15 11.5h.01M10.3 15c.5.5 1 .7 1.7.7s1.2-.2 1.7-.7"/>',
    alert:
      '<path d="M10.3 4 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    locate:
      '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    bowl: '<path d="M3 12h18c0 4.5-3.5 7-9 7s-9-2.5-9-7z"/><path d="M8 8.5h.01M12 7h.01M16 8.5h.01"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    exclaim: '<path d="M12 5v9M12 19h.01"/>',
    dash: '<path d="M7 12h10"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    more: '<path d="M12 5h.01M12 12h.01M12 19h.01"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    comment: '<path d="M4 5h16v11H9l-5 4z"/>',
    send: '<path d="M21 3 3 10l7 3 3 7z"/><path d="M10 13 21 3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    image: '<path d="M4 5h16v14H4z"/><path d="M4 16l5-5 4 4 3-3 4 4"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .900-1 1.7M12 17h.01"/>',
    signout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    navigate: '<path d="M12 3l8 17-8-4-8 4z"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    retry: '<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>',
    offline:
      '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    restrict: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2 5.6-5.6 2 2-5.6z"/>',
    'bowl-fill':
      '<rect x="2.5" y="8.5" width="19" height="2.8" rx="1.4"/><path d="M4.5 13h15a7.5 7.5 0 0 1-15 0z"/>',
    'both-fill':
      '<path d="M12 1.8s3.1 3.3 3.1 5.4a3.1 3.1 0 0 1-6.2 0C8.9 5.1 12 1.8 12 1.8z"/><rect x="3.5" y="11.5" width="17" height="2.4" rx="1.2"/><path d="M5.2 15h13.6a6.8 6.8 0 0 1-13.6 0z"/>',
    paw: '<ellipse cx="12" cy="16.2" rx="4.6" ry="3.8"/><circle cx="5.4" cy="11" r="2"/><circle cx="9" cy="6.6" r="2.1"/><circle cx="15" cy="6.6" r="2.1"/><circle cx="18.6" cy="11" r="2"/>',
    'drop-fill': '<path d="M12 2.5s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.5 12 2.5 12 2.5z"/>',
    'cat-fill':
      '<path d="M4 3.5l4.8 3.3h6.4L20 3.5V13a8 8 0 0 1-16 0z"/><circle class="cut" cx="9" cy="12.5" r="1.4"/><circle class="cut" cx="15" cy="12.5" r="1.4"/><path class="cut-line" d="M10.3 16c.5.6 1 .8 1.7.8s1.2-.2 1.7-.8"/>',
  };

  const symbols = Object.entries(ICONS)
    .map(([id, body]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${body}</symbol>`)
    .join('');

  document.body.insertAdjacentHTML(
    'afterbegin',
    `<svg class="sprite" aria-hidden="true" focusable="false">${symbols}</svg>`
  );

  window.MOCK_ICON_IDS = Object.keys(ICONS);
})();
