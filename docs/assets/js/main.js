(function () {
  'use strict';

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
        toggle.focus();
      }
    });
  }

  // Header border on scroll
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Move focus to form status message after submit
  var status = document.getElementById('form-status');
  if (status) {
    status.focus({ preventScroll: true });
    var firstInvalid = document.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
  }

  // Client-side validation (server validates as well)
  var form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        var invalid = form.querySelector(':invalid');
        if (invalid) {
          invalid.setAttribute('aria-invalid', 'true');
          invalid.reportValidity();
        }
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Wysyłanie…'; }
    });
    form.addEventListener('input', function (e) {
      if (e.target.validity && e.target.validity.valid) e.target.removeAttribute('aria-invalid');
    });
  }

  // Zliczanie kliknięć (anonimowo, bez cookies)
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
      if (navigator.sendBeacon) navigator.sendBeacon('/e', data);
      else fetch('/e', { method: 'POST', body: data, keepalive: true });
    } catch (err) { /* bez znaczenia dla strony */ }
  }, { capture: true, passive: true });

  // Reveal on scroll
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    var items = document.querySelectorAll('.section-head, .card, .project, .value, .steps li, .tech-group');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px' });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal');
        io.observe(el);
      }
    });
  }
})();
