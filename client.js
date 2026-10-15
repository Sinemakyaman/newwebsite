// Tarayıcı betiği (build.mjs bunu dist/site.js olarak yazar; başına renderTalks fonksiyonu eklenir).
// initSite() birden fazla kez çağrılabilir (yalnızca önizleme sayfası içeriği değiştirince gerekir).
function initSite() {
  'use strict';
  var html = document.documentElement;

  // ---------- Mobil menü (klavye ve ekran okuyucu uyumlu) ----------
  var btn = document.getElementById('menu-btn');
  var nav = document.getElementById('site-nav');
  var setOpen = function (open) {
    var b = document.getElementById('menu-btn'), n = document.getElementById('site-nav');
    if (!b || !n) return;
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    n.classList.toggle('open', open);
    var label = b.querySelector('.menu-label');
    if (label) label.textContent = open ? b.getAttribute('data-close') : b.getAttribute('data-open');
  };
  if (btn && nav) {
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }
  if (!window.__siteDocListeners) {
    window.__siteDocListeners = true;
    document.addEventListener('keydown', function (e) {
      var b = document.getElementById('menu-btn');
      if (e.key === 'Escape' && b && b.getAttribute('aria-expanded') === 'true') { setOpen(false); b.focus(); }
    });
    document.addEventListener('click', function (e) {
      var b = document.getElementById('menu-btn');
      if (b && b.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setOpen(false);
    });
    var wide = window.matchMedia('(min-width: 961px)');
    var onWide = function () { if (wide.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
  }

  // ---------- Etkinlikler: build'den sonra tarih geçtiyse bölümleri yeniden sınıflandır ----------
  var dataEl = document.getElementById('talks-data');
  var roots = document.querySelectorAll('[data-talks]');
  if (dataEl && roots.length && typeof renderTalks === 'function') {
    try {
      var d = JSON.parse(dataEl.textContent);
      var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
      Array.prototype.forEach.call(roots, function (root) {
        var r = renderTalks(d.talks, d.ui, today, root.getAttribute('data-talks'));
        if (r.signature !== root.getAttribute('data-sig')) {
          root.innerHTML = r.html;
          root.setAttribute('data-sig', r.signature);
        }
      });
    } catch (err) { /* build'in ürettiği HTML olduğu gibi kalır */ }
  }

  // ---------- Kaydırınca görünme animasyonu ----------
  // İçerik yalnızca bu betik çalışıp gözlemci kurulduktan sonra gizlenir (betik yüklenmezse hiçbir şey saklanmaz).
  // Hareket azaltma tercihinde animasyon hiç kurulmaz, her şey baştan görünür.
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal:not(.in)'));
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (els.length && !reduce && 'IntersectionObserver' in window) {
    html.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      // Görünüme giren ya da zaten kaydırılıp geçilmiş (yukarıda kalmış) öğeler gösterilir
      entries.forEach(function (e) { if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }
}
initSite();
