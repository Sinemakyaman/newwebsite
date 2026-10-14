// Etkinlik (konuşma) bölümü: tarihlerden "Yaklaşan / Geçmiş" ayrımını hesaplar.
//
// ÖNEMLİ: Bu fonksiyon iki yerde çalışır:
//   1) build.mjs içinde (site üretilirken),
//   2) tarayıcıda (build.mjs bu fonksiyonun kaynağını dist/site.js içine gömer).
// Bu yüzden TAMAMEN kendi içinde olmalı; dışarıdaki hiçbir değişkene veya import'a dokunmamalı.
//
// Tarih biçimi (content.json -> talks[].start / end):
//   "2026-11-03"  tam gün        "2025-05"  yalnızca ay        "2024"  yalnızca yıl
export function renderTalks(talks, ui, today) {
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const p2 = (n) => (n < 10 ? '0' + n : '' + n);

  // Etkinliğin bittiği günü (YYYY-MM-DD) döndürür.
  const lastDay = (d) => {
    if (d.length === 4) return d + '-12-31';
    if (d.length === 7) return d + '-' + p2(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate());
    return d;
  };
  const parts = (d) => ({ y: d.slice(0, 4), m: d.length >= 7 ? +d.slice(5, 7) : 0, d: d.length === 10 ? +d.slice(8, 10) : 0 });

  // İnsan okunur Türkçe tarih: "3 Kasım 2026", "5–8 Mayıs 2026", "Mayıs 2025", "2024"
  const label = (t) => {
    const a = parts(t.start);
    const b = parts(t.end || t.start);
    if (!a.m) return a.y;
    if (!a.d) return MONTHS[a.m - 1] + ' ' + a.y;
    if (!t.end || t.end === t.start) return a.d + ' ' + MONTHS[a.m - 1] + ' ' + a.y;
    if (a.y === b.y && a.m === b.m) return a.d + '–' + b.d + ' ' + MONTHS[a.m - 1] + ' ' + a.y;
    if (a.y === b.y) return a.d + ' ' + MONTHS[a.m - 1] + ' – ' + b.d + ' ' + MONTHS[b.m - 1] + ' ' + a.y;
    return a.d + ' ' + MONTHS[a.m - 1] + ' ' + a.y + ' – ' + b.d + ' ' + MONTHS[b.m - 1] + ' ' + b.y;
  };

  const entry = (t) => {
    const who = [t.role, t.time && 'saat ' + t.time].filter(Boolean).join(', ');
    const link = t.link
      ? '<a class="more" href="' + esc(t.link) + '" target="_blank" rel="noopener">' + esc(ui.open) + '<span class="sr-only">: ' + esc(t.event) + '</span></a>'
      : '';
    return '<li class="entry"><div><h4>' + esc(t.event) + '</h4>'
      + (t.title ? '<p class="sub">' + esc(t.title) + '</p>' : '')
      + (who ? '<p>' + esc(who) + '</p>' : '') + link + '</div>'
      + '<span class="meta">' + esc(label(t)) + '</span></li>';
  };

  const items = talks.map((t, i) => ({ t, i, up: lastDay(t.end || t.start) >= today }));
  const upcoming = items.filter((x) => x.up).sort((a, b) => (a.t.start < b.t.start ? -1 : a.t.start > b.t.start ? 1 : a.i - b.i));
  const past = items.filter((x) => !x.up).sort((a, b) => (a.t.start < b.t.start ? 1 : a.t.start > b.t.start ? -1 : a.i - b.i));
  const years = [];
  past.forEach((x) => { const y = x.t.start.slice(0, 4); if (years.indexOf(y) < 0) years.push(y); });

  let html = '';
  if (upcoming.length) {
    html += '<div class="talks-upcoming"><h3 class="group">' + esc(ui.upcoming) + '</h3><ul class="entries">'
      + upcoming.map((x) => entry(x.t)).join('') + '</ul></div>';
  }
  if (past.length) {
    html += '<h3 class="group">' + esc(ui.past) + '</h3>' + years.map((y) =>
      '<p class="year">' + esc(y) + '</p><ul class="entries">'
      + past.filter((x) => x.t.start.slice(0, 4) === y).map((x) => entry(x.t)).join('') + '</ul>').join('');
  }
  return { html, signature: upcoming.map((x) => x.i).join(','), upcomingCount: upcoming.length };
}

// Build sırasında tarih biçimini doğrular; hatalıysa anlaşılır Türkçe mesajla durur.
export function validateTalkDates(talks) {
  const ok = (d) => typeof d === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(d)
    && (d.length < 7 || (+d.slice(5, 7) >= 1 && +d.slice(5, 7) <= 12))
    && (d.length < 10 || (+d.slice(8, 10) >= 1 && +d.slice(8, 10) <= new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate()));
  const errors = [];
  talks.forEach((t, i) => {
    const name = `talks[${i}] (${t.event || 'adsız'})`;
    if (!ok(t.start)) errors.push(`${name}: "start" geçersiz. Örnekler: "2026-11-03", "2025-05" veya "2024". Bulunan: ${JSON.stringify(t.start)}`);
    if (t.end != null && !ok(t.end)) errors.push(`${name}: "end" geçersiz. Boş bırakılabilir (null) ya da "2026-05-08" gibi olmalı. Bulunan: ${JSON.stringify(t.end)}`);
    if (ok(t.start) && t.end != null && ok(t.end) && t.end < t.start) errors.push(`${name}: "end" tarihi "start" tarihinden önce olamaz.`);
  });
  return errors;
}
