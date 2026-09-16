/* ==========================================================================
   LifeOS — icônes
   Un seul trait, 24×24, arrondi : dessinées à la main pour rester lisibles
   à 14 px comme à 24 px, et pour ne dépendre d'aucune bibliothèque.
   ========================================================================== */
(function (L) {
  'use strict';

  var P = {
    home:        '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    sun:         '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:        '<path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    layout:      '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    calendar:    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>',
    check:       '<path d="M4 12.5 9 17.5 20 6.5"/>',
    'check-small': '<path d="M4 12.5 9 17.5 20 6.5"/>',
    circle:      '<circle cx="12" cy="12" r="8"/>',
    folder:      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    target:      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    wallet:      '<path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1"/><rect x="3" y="8" width="18" height="11" rx="2"/><circle cx="16.5" cy="13.5" r="1.2"/>',
    repeat:      '<path d="M17 3.5 20.5 7 17 10.5"/><path d="M20.5 7H7a3.5 3.5 0 0 0-3.5 3.5V12"/><path d="M7 20.5 3.5 17 7 13.5"/><path d="M3.5 17H17a3.5 3.5 0 0 0 3.5-3.5V12"/>',
    chart:       '<path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/>',
    note:        '<path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',
    sparkle:     '<path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2z"/><path d="M18.5 4v3M20 5.5h-3"/>',
    settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4.9z"/>',
    plus:        '<path d="M12 5v14M5 12h14"/>',
    minus:       '<path d="M5 12h14"/>',
    search:      '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    x:           '<path d="M6 6l12 12M18 6 6 18"/>',
    clock:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    flag:        '<path d="M6 21V4m0 0h10l-2 3.5L16 11H6"/>',
    trash:       '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    edit:        '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5 17.5 9.5"/>',
    link:        '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.8 6.5"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.5-1.5"/>',
    filter:      '<path d="M4 6h16M7 12h10M10 18h4"/>',
    sort:        '<path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/>',
    bell:        '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z"/><path d="M10.5 19.5a2 2 0 0 0 3 0"/>',
    user:        '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    briefcase:   '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
    book:        '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5z"/>',
    activity:    '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    car:         '<path d="M5 17h14M4 17v-4l2-5h12l2 5v4M4 13h16"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
    leaf:        '<path d="M5 19c0-8 5-13 14-13 0 9-5 13-11 13H5z"/><path d="M5 19c3-4 6-6 9-7"/>',
    phone:       '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    inbox:       '<path d="M4 13h4l1.5 3h5L16 13h4"/><path d="M4 13 6 5h12l2 8v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    tag:         '<path d="M3 11V5a2 2 0 0 1 2-2h6l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    paperclip:   '<path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"/>',
    copy:        '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    external:    '<path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    download:    '<path d="M12 4v11m0 0-4-4m4 4 4-4M4 19h16"/>',
    upload:      '<path d="M12 20V9m0 0-4 4m4-4 4 4M4 5h16"/>',
    'chevron-down':  '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-left':  '<path d="m15 6-6 6 6 6"/>',
    'arrow-right':   '<path d="M5 12h14m0 0-6-6m6 6-6 6"/>',
    'arrow-left':    '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
    more:        '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
    drag:        '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    alert:       '<path d="M12 4.5 21 19.5H3z"/><path d="M12 10v4m0 3v.5"/>',
    info:        '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5m0-8v.5"/>',
    undo:        '<path d="M8 8H4V4"/><path d="M4 8a8 8 0 1 1 2 9"/>',
    play:        '<path d="M7 5l12 7-12 7z"/>',
    pause:       '<path d="M9 5v14M15 5v14"/>',
    lock:        '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    key:         '<circle cx="8" cy="12" r="4"/><path d="M12 12h9m-3 0v3m-2-3v2"/>',
    list:        '<path d="M8 6h12M8 12h12M8 18h12M4 6v.5M4 12v.5M4 18v.5"/>',
    grid:        '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    send:        '<path d="M5 12 20 5l-5 15-3.5-6.5z"/><path d="M11.5 13.5 20 5"/>',
    compass:     '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 5-5 2 2-5z"/>',
    refresh:     '<path d="M20 11a8 8 0 1 0-1.5 6"/><path d="M20 5v6h-6"/>',
    eye:         '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
    google:      '<path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.8h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.8-4.2 2.8-7.2z" fill="currentColor" stroke="none"/><path d="M12 21c2.5 0 4.7-.8 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.4 0-4.5-1.6-5.3-3.8H3.5v2.4A9 9 0 0 0 12 21z" fill="currentColor" stroke="none"/><path d="M6.7 13.4a5.4 5.4 0 0 1 0-3.4V7.6H3.5a9 9 0 0 0 0 8.1z" fill="currentColor" stroke="none"/><path d="M12 6.6c1.4 0 2.6.5 3.5 1.4l2.7-2.7A9 9 0 0 0 3.5 7.6l3.2 2.4C7.5 8.2 9.6 6.6 12 6.6z" fill="currentColor" stroke="none"/>',
    apple:       '<path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.2 1.2-2.4 1.2-2.5 0 0-2.4-.9-2.4-3.7z" fill="currentColor" stroke="none"/><path d="M14.2 5.9c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3z" fill="currentColor" stroke="none"/>'
  };

  var cache = {};

  L.icon = function (name, size) {
    var path = P[name] || P.circle;
    var key = name + ':' + (size || 0);
    var svg;
    if (cache[key]) {
      svg = cache[key].cloneNode(true);
      return svg;
    }
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', name === 'check-small' ? '2.6' : '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (size) {
      /* Le style prime sur la règle globale des icônes : une taille
         demandée est une taille obtenue. */
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.style.width = size + 'px';
      svg.style.height = size + 'px';
    }
    svg.innerHTML = path;
    cache[key] = svg;
    return svg.cloneNode(true);
  };

  L.icon.names = Object.keys(P);
  L.icon.has = function (name) { return !!P[name]; };
})(window.LifeOS = window.LifeOS || {});
