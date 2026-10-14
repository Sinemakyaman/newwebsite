// Tarayıcı betiği (build.mjs bunu dist/site.js olarak yazar; başına renderTalks fonksiyonu eklenir).
(function () {
  'use strict';

  // ---------- Mobil menü (klavye ve ekran okuyucu uyumlu) ----------
  var btn = document.getElementById('menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    var label = btn.querySelector('.menu-label');
    var wide = window.matchMedia('(min-width: 961px)');
    var setOpen = function (open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('open', open);
      if (label) label.textContent = open ? btn.getAttribute('data-close') : btn.getAttribute('data-open');
    };
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (btn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setOpen(false);
    });
    var onWide = function () { if (wide.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
  }

  // ---------- Etkinlikler: build'den sonra tarih geçtiyse bölümü yeniden sınıflandır ----------
  var root = document.getElementById('talks-root');
  var dataEl = document.getElementById('talks-data');
  if (root && dataEl && typeof renderTalks === 'function') {
    try {
      var d = JSON.parse(dataEl.textContent);
      var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
      var r = renderTalks(d.talks, d.ui, today);
      if (r.signature !== root.getAttribute('data-sig')) {
        root.innerHTML = r.html;
        root.setAttribute('data-sig', r.signature);
      }
    } catch (err) { /* build'in ürettiği HTML olduğu gibi kalır */ }
  }
})();
