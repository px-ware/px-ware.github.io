// Aktualny rok w stopce i zliczanie kliknięć (anonimowo, bez cookies).
(function () {
  'use strict';
  // Adres zdarzeń w folderze projektu (np. /safecheck/e).
  var BEACON = '/' + location.pathname.split('/')[1] + '/e';
  var rok = document.getElementById('rok');
  if (rok) rok.textContent = new Date().getFullYear();

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button, summary');
    if (!el) return;
    var link = el.tagName === 'A';
    var data = JSON.stringify({
      p: location.pathname,
      k: link ? 'link' : 'button',
      t: link ? (el.getAttribute('href') || '') : '',
      l: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(BEACON, data);
      else fetch(BEACON, { method: 'POST', body: data, keepalive: true });
    } catch (err) { /* bez znaczenia dla strony */ }
  }, { capture: true, passive: true });
})();
