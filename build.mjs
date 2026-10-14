// Sıfır bağımlılıklı statik site üreticisi: data/content.json -> dist/
// Tüm metin content.json içindedir. "verified": false olan kayıt sitede GİZLİDİR (build hangilerini gizlediğini yazar).
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { renderTalks, validateTalkDates } from './lib/talks.mjs';

const fail = (msg) => { console.error('HATA: ' + msg); process.exit(1); };
const warn = (msg) => console.warn('UYARI: ' + msg);

let c;
try { c = JSON.parse(readFileSync('data/content.json', 'utf8')); }
catch (e) { fail('data/content.json okunamadı veya geçerli JSON değil. Çoğunlukla eksik/fazla virgül ya da tırnaktır. Ayrıntı: ' + e.message); }

const { ui, identity: id, links, site } = c;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const p = (t, cls) => (t ? `<p${cls ? ` class="${cls}"` : ''}>${esc(t)}</p>` : '');

// ---------- Tarih ve site adresi ----------
// Test için BUILD_TODAY=2026-11-04 gibi verilebilir. Normalde İstanbul saatiyle bugün.
const today = process.env.BUILD_TODAY || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

// Site adresi önceliği: SITE_URL (ortam değişkeni) > content.json site.url > Vercel'in ürettiği üretim adresi.
const rawUrl = process.env.SITE_URL || site.url
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null);
const siteUrl = rawUrl ? rawUrl.replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://') : null;
const abs = (path) => `${siteUrl}/${String(path).replace(/^\//, '')}`;
if (!siteUrl) warn('Site adresi bilinmiyor: canonical, og:url, og:image ve sitemap.xml üretilmedi. content.json içindeki site.url alanına alan adını yazın (ör. "https://www.ornek.com").');
else if (/\.vercel\.app$/.test(new URL(siteUrl).hostname)) warn(`Site adresi geçici bir vercel.app adresi (${siteUrl}). Kendi alan adını bağlayınca content.json içindeki site.url alanını güncelleyin.`);

// ---------- Görünürlük ----------
const hidden = [];
const vis = (arr, where) => (arr || []).filter((x) => {
  if (x && x.verified !== false) return true;
  if (x) hidden.push(`${where}: ${x.name || x.role || x.event || x.title || '?'}`);
  return false;
});

// ---------- Küçük yapı taşları ----------
const ext = (url, label, sr) =>
  `<a class="more" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${sr ? `<span class="sr-only">: ${esc(sr)}</span>` : ''}</a>`;
const entry = ({ t, s, m, b = '', tag = 'h3' }) =>
  `<li class="entry"><div><${tag}>${esc(t)}</${tag}>${p(s, 'sub')}${b}</div>${m ? `<span class="meta">${esc(m)}</span>` : ''}</li>`;
const list = (items, cls = '') => (items.length ? `<ul class="entries${cls ? ' ' + cls : ''}">${items.join('')}</ul>` : '');
const group = (label) => `<h3 class="group">${esc(label)}</h3>`;
const section = (sid, title, body, cls = '') =>
  body ? `<section id="${sid}" class="sec ${cls}" aria-labelledby="${sid}-h"><div class="wrap sec-grid"><h2 id="${sid}-h">${esc(title)}</h2><div class="sec-body">${body}</div></div></section>` : '';

// ---------- Bölümler ----------
const about = c.bio.length
  ? c.bio.map((x, i) => p(x, i === 0 ? 'lead' : '')).join('')
  : (id.positioning ? p(id.positioning, 'lead') : '');

const experience = vis(c.experience, 'experience').map((e) => {
  const body = p(e.summary) + (e.points?.length ? `<ul class="points">${e.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return entry({ t: e.role, s: e.org, m: e.period, b: body });
});

const certs = vis(c.certificates, 'certificates').map((x) => entry({ t: x.name, s: x.detail }));

const academic = vis(c.education.academic, 'education.academic').map((x) => entry({ t: x.name, m: x.meta, tag: 'h4' }));
const programs = vis(c.education.programs, 'education.programs');
const progItem = (x) => entry({ t: x.name, s: x.org, tag: 'h4' });
const featured = programs.filter((x) => x.featured).map(progItem);
const rest = programs.filter((x) => !x.featured).map(progItem);
const education = (academic.length ? group(ui.academicLabel) + list(academic) : '')
  + (programs.length ? group(ui.programsLabel) + list(featured)
    + (rest.length ? `<details><summary>${esc(ui.showAll)} (${rest.length})</summary>${list(rest)}</details>` : '') : '');

const recognition = vis(c.recognition, 'recognition').map((x) =>
  entry({ t: x.name, m: x.date, tag: 'h4', b: p(x.detail) + (x.link ? ext(x.link, x.linkLabel || ui.open, x.name) : '') }));
const community = vis(c.community, 'community').map((x) => entry({ t: x.name, s: x.detail, m: x.date, tag: 'h4' }));
const recogBody = (recognition.length ? group(ui.recognitionLabel) + list(recognition) : '')
  + (community.length ? group(ui.communityLabel) + list(community) : '');

// Etkinlikler: yaklaşan/geçmiş ayrımı tarihlerden hesaplanır (lib/talks.mjs).
const talks = vis(c.talks, 'talks');
const dateErrors = validateTalkDates(talks);
if (dateErrors.length) fail('Etkinlik tarihleri hatalı:\n  - ' + dateErrors.join('\n  - '));
const talksRender = renderTalks(talks, ui, today);
const talksBody = talks.length
  ? `<div id="talks-root" data-sig="${talksRender.signature}">${talksRender.html}</div>`
    + `<script type="application/json" id="talks-data">${JSON.stringify({ talks, ui: { upcoming: ui.upcoming, past: ui.past, open: ui.open } }).replace(/</g, '\\u003c')}</script>`
  : '';

const media = vis(c.media, 'media').map((x) =>
  entry({ t: x.name, s: x.kind, m: x.date, b: p(x.text) + (x.link ? ext(x.link, x.linkLabel || ui.open, x.name) : '') }));
const cases = vis(c.cases, 'cases').map((x) => entry({ t: x.title, b: p(x.text) }));
const testimonials = vis(c.testimonials, 'testimonials').map((x) => entry({ t: x.quote, s: x.author }));

const li = links.linkedin.verified !== false && links.linkedin.url;
const sub = links.substack.verified !== false && links.substack.url;
const yt = links.youtube.verified !== false && links.youtube.url;
const mail = links.email.verified !== false && links.email.value;
if (!mail) warn('E-posta adresi boş (links.email.value). İletişimde yalnızca LinkedIn gösterilecek.');

const contact = `<div class="contact-in"><p class="contact-lead">${esc(ui.contactHeading)}</p><div class="actions">`
  + (li ? `<a class="btn" href="${esc(li)}" target="_blank" rel="noopener">${esc(ui.ctaLabel)}</a>` : '')
  + (mail ? `<a class="btn ghost" href="mailto:${esc(mail)}">${esc(mail)}</a>` : '') + '</div>'
  + `<p class="elsewhere">${[li && ext(li, ui.linkedinLabel), sub && ext(sub, ui.substackLabel), yt && ext(yt, ui.youtubeLabel)].filter(Boolean).join('')}</p></div>`;

const S = ui.sections;
const sections = [
  section('hakkinda', S.about, about, 'about'),
  section('deneyim', S.experience, list(experience, 'timeline')),
  section('sertifikalar', S.certs, list(certs, 'cols')),
  section('egitim', S.education, education),
  section('taninirlik', S.recognition, recogBody),
  section('konusmalar', S.talks, talksBody),
  section('medya', S.media, list(media)),
  section('vakalar', S.cases, list(cases)),
  section('referanslar', S.testimonials, list(testimonials)),
  section('iletisim', S.contact, contact, 'contact'),
].join('\n');

const present = (anchor) => sections.includes(`id="${anchor}"`);
const nav = ui.nav.filter(([a]) => present(a)).map(([a, l]) => `<a href="#${a}">${esc(l)}</a>`).join('');

// ---------- Fotoğraf ----------
const ph = id.photo;
const photoOk = ph && ph.widths.every((w) => existsSync(`public/${ph.base}-${w}.webp`)) && existsSync(`public/${ph.base}-760.jpg`);
if (ph && !photoOk) warn(`Fotoğraf dosyaları eksik (public/${ph.base}-*.webp ve -760.jpg). Hero fotoğrafsız üretildi.`);
const srcset = photoOk ? ph.widths.map((w) => `/${ph.base}-${w}.webp ${w}w`).join(', ') : '';
const photoHtml = photoOk
  ? `<figure class="hero-photo"><picture><source type="image/webp" srcset="${srcset}" sizes="(min-width: 961px) 440px, (min-width: 600px) 400px, 86vw">`
    + `<img src="/${ph.base}-760.jpg" width="${ph.width}" height="${ph.height}" alt="${esc(ph.alt)}" fetchpriority="high" decoding="async"></picture></figure>`
  : '';

// ---------- SEO ----------
const ogOk = site.ogImage && existsSync(`public/${site.ogImage}`);
if (site.ogImage && !ogOk) warn(`Paylaşım görseli bulunamadı: public/${site.ogImage}`);
const OG_W = 1200, OG_H = 630; // og-image.jpg bu boyutta üretildi

const sameAs = [li, sub, yt].filter(Boolean);
const person = {
  '@type': 'Person',
  ...(siteUrl && { '@id': `${siteUrl}/#person` }),
  name: id.name,
  ...(siteUrl && { url: `${siteUrl}/` }),
  ...(siteUrl && photoOk && { image: abs(`${ph.base}-960.webp`) }),
  jobTitle: id.title,
  description: id.positioning,
  ...(id.org && { worksFor: { '@type': 'Organization', name: id.org } }),
  ...(sameAs.length && { sameAs }),
  ...(c.seo?.knowsAbout?.length && { knowsAbout: c.seo.knowsAbout }),
};
const website = { '@type': 'WebSite', name: site.name, inLanguage: site.lang, ...(siteUrl && { url: `${siteUrl}/` }) };
const ld = { '@context': 'https://schema.org', '@graph': [website, person] };

const [first, ...restName] = id.name.split(' ');
const head = (extra = '') => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="${esc(site.themeColor)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/source-serif-4-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<script>document.documentElement.className+=' js'</script>${extra}`;

const seo = `<title>${esc(site.title)}</title>
<meta name="description" content="${esc(id.positioning)}">
${siteUrl ? `<link rel="canonical" href="${esc(siteUrl)}/">\n` : ''}<meta property="og:type" content="profile">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${esc(site.locale)}">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(id.positioning)}">
<meta property="profile:first_name" content="${esc(first)}">
<meta property="profile:last_name" content="${esc(restName.join(' '))}">
${siteUrl ? `<meta property="og:url" content="${esc(siteUrl)}/">\n` : ''}${siteUrl && ogOk ? `<meta property="og:image" content="${esc(abs(site.ogImage))}">
<meta property="og:image:width" content="${OG_W}">
<meta property="og:image:height" content="${OG_H}">
<meta property="og:image:alt" content="${esc(site.ogImageAlt)}">\n` : ''}<meta name="twitter:card" content="${siteUrl && ogOk ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(site.title)}">
<meta name="twitter:description" content="${esc(id.positioning)}">
${siteUrl && ogOk ? `<meta name="twitter:image" content="${esc(abs(site.ogImage))}">
<meta name="twitter:image:alt" content="${esc(site.ogImageAlt)}">\n` : ''}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;

const header = `<header class="site-header" id="top">
  <div class="wrap bar">
    <a class="brand" href="#top">${esc(id.name)}</a>
    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" data-open="${esc(ui.menu)}" data-close="${esc(ui.menuClose)}"><span class="menu-icon" aria-hidden="true"></span><span class="menu-label">${esc(ui.menu)}</span></button>
    <nav id="site-nav" class="site-nav" aria-label="Ana menü">${nav}</nav>
  </div>
</header>`;

const facts = (c.highlights || []).length
  ? `<div class="wrap"><ul class="facts">${c.highlights.map((h) => `<li><strong>${esc(h.text)}</strong>${h.detail ? `<span>${esc(h.detail)}</span>` : ''}</li>`).join('')}</ul></div>` : '';

const hero = `<section class="hero" aria-labelledby="hero-h">
  <div class="wrap hero-grid">
    <div class="hero-text">
      <h1 id="hero-h">${esc(id.name)}</h1>
      <p class="role">${esc(id.title)}${id.org ? `, ${esc(id.org)}` : ''}</p>
      <span class="trace" aria-hidden="true"></span>
      <p class="hero-q">${esc(id.question)}</p>
      ${li ? `<a class="btn" href="${esc(li)}" target="_blank" rel="noopener">${esc(ui.ctaLabel)}</a>` : ''}
    </div>
    ${photoHtml}
  </div>
  ${facts}
</section>`;

const html = `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
${head()}
${seo}
</head>
<body>
<a class="skip" href="#main">${esc(ui.skip)}</a>
${header}
<main id="main" tabindex="-1">
${hero}
${sections}
</main>
<footer class="foot"><div class="wrap">${esc(site.footer)}</div></footer>
<script src="/site.js" defer></script>
</body>
</html>`;

const notFound = `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
${head()}
<title>Sayfa bulunamadı — ${esc(site.name)}</title>
<meta name="robots" content="noindex">
</head>
<body>
<header class="site-header"><div class="wrap bar"><a class="brand" href="/">${esc(id.name)}</a></div></header>
<main id="main" class="notfound"><div class="wrap"><p class="nf-code">404</p><h1>Aradığınız sayfa bulunamadı</h1><p>Bağlantı değişmiş ya da yanlış yazılmış olabilir.</p><a class="btn" href="/">Ana sayfaya dön</a></div></main>
</body>
</html>`;

// ---------- Güvenlik kontrolü: iç notlar asla yayına çıkmasın ----------
const visible = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
if (/DOĞRULA|EKSİK|\[|\]/.test(visible(html)) || /DOĞRULA|EKSİK/.test(visible(notFound))) {
  fail('Çıktıda iç not işareti bulundu (DOĞRULA/EKSİK/köşeli parantez). content.json dosyasını kontrol edin.');
}

// ---------- Yaz ----------
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });
cpSync('styles.css', 'dist/styles.css');
writeFileSync('dist/site.js', `var renderTalks = ${renderTalks.toString()};\n${readFileSync('client.js', 'utf8')}`);
writeFileSync('dist/index.html', html);
writeFileSync('dist/404.html', notFound);
writeFileSync('dist/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0E3B43"/><text x="32" y="43" font-family="Georgia,serif" font-size="30" text-anchor="middle" fill="#F2F5F5">CE</text></svg>`);
writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
if (siteUrl) {
  writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${esc(siteUrl)}/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
}

// ---------- Özet ----------
if (hidden.length) {
  console.log(`Gizli kalan kayıt (verified: false): ${hidden.length}`);
  hidden.forEach((h) => console.log('  - ' + h));
} else {
  console.log('Gizli kayıt yok: content.json içindeki tüm kayıtlar yayında.');
}
console.log(`Etkinlikler (${today}): ${talksRender.upcomingCount} yaklaşan, ${talks.length - talksRender.upcomingCount} geçmiş.`);
console.log('Build tamam: dist/index.html');
