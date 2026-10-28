/* The icon set: 24px grid, 2px stroke, round ends, one weight. Injected as an SVG sprite so the
   mocks also open straight from disk (an external sprite file is blocked there). In the app this
   becomes one sprite file served beside the build. */
(function () {
  const ICONS = {
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    cat: '<path d="M4 10.6V4.9c0-.7.7-1 1.2-.7l3.6 2.3c2.1-.5 4.3-.5 6.4 0l3.6-2.3c.5-.3 1.2 0 1.2.7v5.7c.4.9.6 1.9.6 2.8 0 4-3.7 6.7-8.6 6.7S3.4 17.4 3.4 13.4c0-.9.2-1.9.6-2.8z"/><path d="M9 13h.01M15 13h.01"/><path d="M10.9 15.5h2.2L12 16.9z"/>',
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
    paw: '<path d="M12 12.4c-3.1 0-5.9 2.6-5.9 5.5 0 1.7 1.2 2.6 2.8 2.6 1 0 1.8-.5 3.1-.5s2.1.5 3.1.5c1.6 0 2.8-.9 2.8-2.6 0-2.9-2.8-5.5-5.9-5.5z"/><ellipse cx="4.5" cy="11.2" rx="1.9" ry="2.4"/><ellipse cx="9" cy="6" rx="2" ry="2.6"/><ellipse cx="15" cy="6" rx="2" ry="2.6"/><ellipse cx="19.5" cy="11.2" rx="1.9" ry="2.4"/>',
    'drop-fill': '<path d="M12 2.5s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.5 12 2.5 12 2.5z"/>',
    'cat-fill':
      '<path d="M4 10.6V4.9c0-.7.7-1 1.2-.7l3.6 2.3c2.1-.5 4.3-.5 6.4 0l3.6-2.3c.5-.3 1.2 0 1.2.7v5.7c.4.9.6 1.9.6 2.8 0 4-3.7 6.7-8.6 6.7S3.4 17.4 3.4 13.4c0-.9.2-1.9.6-2.8z"/><circle class="cut" cx="9" cy="13" r="1.3"/><circle class="cut" cx="15" cy="13" r="1.3"/><path class="cut" d="M10.7 15.4h2.6L12 17.1z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    siren:
      '<path d="M6 19v-6a6 6 0 0 1 12 0v6"/><path d="M4 19h16v2.5H4z"/><path d="M12 2.5V5M4 6l1.8 1.8M20 6l-1.8 1.8"/>',
    'bowl-empty': '<path d="M3 12h18c0 4.5-3.5 7-9 7s-9-2.5-9-7z"/>',
    'drop-empty':
      '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5h5"/>',
    'gps-weak':
      '<circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7" stroke-dasharray="2.4 3"/>',
    'locate-off':
      '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M4 4l16 16"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    'image-off': '<path d="M4 5h16v14H4z"/><path d="M4 16l5-5 3 3M3 3l18 18"/>',
    thermometer:
      '<path d="M8.5 13.6V5.5a2.5 2.5 0 0 1 5 0v8.1a4.5 4.5 0 1 1-5 0z"/><path d="M11 9.5v6.5"/><circle cx="11" cy="17" r="1.2" fill="currentColor" stroke="none"/><path d="M17.5 5h3M17.5 8.5h3M17.5 12h3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    share: '<path d="M12 15V3.5M8 7l4-4 4 4M5 12v8h14v-8"/>',
    addbox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>',
    laptop: '<rect x="4.5" y="5" width="15" height="10" rx="1.5"/><path d="M2.5 19h19"/>',
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
