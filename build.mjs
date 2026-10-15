// Sıfır bağımlılıklı statik site üreticisi: data/content.json -> dist/
// Tüm metin content.json içindedir. "verified": false olan kayıt sitede GİZLİDİR (build hangilerini gizlediğini yazar).
// Sayfalar: / , /hakkimda/ , /deneyim/ , /konusmalar/ , /yayinlar/ , /iletisim/ , 404
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { renderTalks, validateTalkDates } from './lib/talks.mjs';

const fail = (msg) => { console.error('HATA: ' + msg); process.exit(1); };
const warn = (msg) => console.warn('UYARI: ' + msg);

let c;
try { c = JSON.parse(readFileSync('data/content.json', 'utf8')); }
catch (e) { fail('data/content.json okunamadı veya geçerli JSON değil. Çoğunlukla eksik/fazla virgül ya da tırnaktır. Ayrıntı: ' + e.message); }

const { ui, identity: id, links, site } = c;
const PAGES = site.pages;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const p = (t, cls) => (t ? `<p${cls ? ` class="${cls}"` : ''}>${esc(t)}</p>` : '');
const rv = (i = 0) => `reveal" style="--i:${i}`; // class="reveal" + kademeli gecikme

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

// ---------- Veriler ----------
const li = links.linkedin.verified !== false && links.linkedin.url;
const sub = links.substack.verified !== false && links.substack.url;
const yt = links.youtube.verified !== false && links.youtube.url;
const mail = links.email.verified !== false && links.email.value;
if (!mail) warn('E-posta adresi boş (links.email.value). E-posta bağlantısı hiçbir yerde gösterilmeyecek.');
const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/, '');

const experience = vis(c.experience, 'experience');
const certs = vis(c.certificates, 'certificates');
const academic = vis(c.education.academic, 'education.academic');
const programs = vis(c.education.programs, 'education.programs');
const recognition = vis(c.recognition, 'recognition');
const community = vis(c.community, 'community');
const talks = vis(c.talks, 'talks');
const media = vis(c.media, 'media');
const expertise = vis(c.expertise, 'expertise');
const gallery = vis(c.gallery, 'gallery');
const cases = vis(c.cases, 'cases');
const testimonials = vis(c.testimonials, 'testimonials');

const dateErrors = validateTalkDates(talks);
if (dateErrors.length) fail('Etkinlik tarihleri hatalı:\n  - ' + dateErrors.join('\n  - '));

// ---------- Simgeler (satır içi SVG) ----------
const ICONS = {
  linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9.5 5 2.5-5 2.5z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
};

// ---------- Küçük yapı taşları ----------
const ext = (url, label, sr) =>
  `<a class="more" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${sr ? `<span class="sr-only">: ${esc(sr)}</span>` : ''}</a>`;
const entry = ({ t, s, m, b = '', tag = 'h3' }) =>
  `<li class="entry"><div><${tag}>${esc(t)}</${tag}>${p(s, 'sub')}${b}</div>${m ? `<span class="meta">${esc(m)}</span>` : ''}</li>`;
const list = (items, cls = '') => (items.length ? `<ul class="entries${cls ? ' ' + cls : ''}">${items.join('')}</ul>` : '');
const group = (label) => `<h3 class="group">${esc(label)}</h3>`;

// Duyarlı fotoğraf: WebP srcset + JPG yedeği. Dosyalar yoksa uyarı verir ve boş döner.
const pic = (ph, sizes, { eager = false } = {}) => {
  if (!ph) return '';
  const fb = ph.fallback || 760;
  const ok = ph.widths.every((w) => existsSync(`public/${ph.base}-${w}.webp`)) && existsSync(`public/${ph.base}-${fb}.jpg`);
  if (!ok) { warn(`Fotoğraf dosyaları eksik: public/${ph.base}-*.webp ve -${fb}.jpg`); return ''; }
  const srcset = ph.widths.map((w) => `/${ph.base}-${w}.webp ${w}w`).join(', ');
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="/${ph.base}-${fb}.jpg" width="${ph.width}" height="${ph.height}" alt="${esc(ph.alt)}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}></picture>`;
};

const btn = (href, label, cls = '', extra = '') => `<a class="btn${cls ? ' ' + cls : ''}" href="${esc(href)}"${extra}>${esc(label)}</a>`;
const linkedinBtn = (cls = '') => (li ? btn(li, ui.ctaLabel, cls, ' target="_blank" rel="noopener"') : '');
const textLink = (href, label) => `<a class="text-link" href="${esc(href)}">${esc(label)}</a>`;

// ---------- Etkinlikler (yaklaşan/geçmiş tarihten hesaplanır; bkz. lib/talks.mjs) ----------
const talksBlock = (mode) => {
  if (!talks.length) return { html: '', has: false };
  const r = renderTalks(talks, ui, today, mode);
  return { html: `<div class="talks-root" data-talks="${mode}" data-sig="${r.signature}">${r.html}</div>`, has: true, up: r.upcomingCount };
};
const talksData = () => `<script type="application/json" id="talks-data">${JSON.stringify({ talks, ui: { upcoming: ui.upcoming, past: ui.past, open: ui.open } }).replace(/</g, '\\u003c')}</script>`;

// ---------- Ortak bölüm kalıpları ----------
const section = ({ id: sid, tone = 'cream', title, body, intro = '', cls = '' }) =>
  body ? `<section id="${sid}" class="sec ${tone} ${cls}" aria-labelledby="${sid}-h"><div class="wrap">`
    + `<header class="sec-head ${rv()}"><h2 id="${sid}-h">${esc(title)}</h2>${intro}</header>${body}</div></section>` : '';

const mediaTile = (lvl) => (m, i) => `<li class="tile ${rv(i)}"><div class="tile-icon">${ICONS[m.icon] || ICONS.play}</div>`
  + `<p class="tile-type">${esc(m.type)}</p><${lvl} class="tile-h">${esc(m.name)}</${lvl}>${p(m.kind, 'tile-kind')}${m.date ? p(m.date, 'tile-date') : ''}${p(m.text)}`
  + `${m.link ? ext(m.link, m.linkLabel || ui.open, m.name) : ''}</li>`;

const expRows = (items) => `<ol class="exp-rows">${items.map((e, i) => `<li class="exp-row ${rv(i)}">`
  + `<div class="exp-when"><p class="exp-org">${esc(e.org)}</p>${e.period ? `<p class="exp-period">${esc(e.period)}</p>` : ''}</div>`
  + `<div class="exp-what"><h3>${esc(e.role)}</h3>${p(e.summary)}</div></li>`).join('')}</ol>`;

const cta = () => `<section class="sec navy cta" aria-labelledby="cta-h"><div class="wrap cta-in"><div class="${rv()}">`
  + `<h2 id="cta-h">${esc(ui.contactHeading)}</h2></div><div class="cta-actions ${rv(1)}">${linkedinBtn()}`
  + `${mail ? btn(`mailto:${mail}`, mail, 'ghost-light') : btn(PAGES.contact.path, ui.contactTitle, 'ghost-light')}</div></div></section>`;

// ---------- Sayfa gövdeleri ----------
const facts = (c.highlights || []).length
  ? `<div class="wrap band"><ul class="facts">${c.highlights.map((h) => `<li><strong>${esc(h.text)}</strong>${h.detail ? `<span>${esc(h.detail)}</span>` : ''}</li>`).join('')}</ul></div>` : '';

function homeBody() {
  const q = esc(id.question);
  const hero = `<section class="hero navy" aria-labelledby="hero-h"><div class="wrap hero-grid">
    <div class="hero-text">
      <h1 id="hero-h"><span class="sr-only">${esc(id.name)}: </span>${q}</h1>
      <div class="hero-by"><span class="gold-rule" aria-hidden="true"></span><p class="hero-name">${esc(id.name)}</p><p class="hero-role">${esc(id.title)}${id.org ? `, ${esc(id.org)}` : ''}</p></div>
      ${p(id.positioning, 'hero-intro')}
      <div class="hero-cta">${linkedinBtn()}${btn(PAGES.about.path, ui.heroSecondary, 'ghost-light')}</div>
    </div>
    ${id.photo ? `<figure class="hero-photo photo">${pic(id.photo, '(min-width: 961px) 440px, 100vw', { eager: true })}</figure>` : ''}
  </div></section>`;

  const about = c.bio.length ? `<section id="ozet" class="sec cream about-sec" aria-labelledby="ozet-h"><div class="wrap about-grid">
    ${id.aboutPhoto ? `<figure class="about-photo photo ${rv()}">${pic(id.aboutPhoto, '(min-width: 961px) 420px, 90vw')}</figure>` : ''}
    <div class="about-text ${rv(1)}"><h2 id="ozet-h">${esc(ui.aboutTitle)}</h2><span class="gold-rule" aria-hidden="true"></span>
      ${p(c.bio[0], 'lead')}${c.bio[2] ? p(c.bio[2]) : ''}${textLink(PAGES.about.path, ui.aboutMore)}</div></div></section>` : '';

  const exp = section({ id: 'deneyim-ozet', tone: 'white', title: ui.selectedExperience, body: expRows(experience) + `<p class="sec-more ${rv()}">${textLink(PAGES.experience.path, ui.allExperience)}</p>` });

  const exper = expertise.length ? section({ id: 'uzmanlik', tone: 'navy', title: ui.expertiseTitle,
    body: `<ul class="exp-grid">${expertise.map((x, i) => `<li class="${rv(i)}"><h3>${esc(x.title)}</h3>${p(x.text)}</li>`).join('')}</ul>` }) : '';

  const tb = talksBlock('featured');
  const talkSec = tb.has ? section({ id: 'konusmalar-ozet', tone: 'cream', title: ui.featuredTalks,
    body: tb.html + `<p class="sec-more ${rv()}">${textLink(PAGES.talks.path, ui.allTalks)}</p>` }) : '';

  const mediaSec = media.length ? section({ id: 'yayinlar-ozet', tone: 'white', title: ui.featuredMedia,
    body: `<ul class="tiles">${media.map(mediaTile('h3')).join('')}</ul><p class="sec-more ${rv()}">${textLink(PAGES.media.path, ui.allMedia)}</p>` }) : '';

  const gal = gallery.length ? section({ id: 'fotograflar', tone: 'cream', title: ui.galleryTitle,
    body: `<div class="gallery">${gallery.map((g, i) => `<figure class="photo g-${g.kind} ${rv(i)}">${pic(g, g.kind === 'wide' ? '(min-width: 961px) 700px, 92vw' : '(min-width: 961px) 440px, 92vw')}</figure>`).join('')}</div>` }) : '';

  return hero + facts + about + exp + exper + talkSec + mediaSec + gal + cta() + (tb.has ? talksData() : '');
}

const pageHead = (key) => {
  const pg = PAGES[key];
  return `<section class="page-head navy"><div class="wrap">
    <nav class="crumbs" aria-label="${esc(ui.breadcrumb)}"><ol><li><a href="/">${esc(ui.homeLabel)}</a></li><li aria-current="page">${esc(pg.nav)}</li></ol></nav>
    <h1>${esc(pg.h1)}</h1><span class="gold-rule" aria-hidden="true"></span>${pg.intro ? p(pg.intro, 'page-intro') : ''}</div></section>`;
};

function aboutBody() {
  const bio = c.bio.length
    ? `<section class="sec cream" aria-label="${esc(PAGES.about.h1)}"><div class="wrap about-full">
      ${id.aboutPhoto ? `<figure class="about-photo photo sticky ${rv()}">${pic(id.aboutPhoto, '(min-width: 961px) 420px, 90vw', { eager: true })}</figure>` : ''}
      <div class="prose ${rv(1)}">${c.bio.map((x, i) => p(x, i === 0 ? 'lead' : '')).join('')}
        <p class="prose-links">${textLink(PAGES.experience.path, ui.allExperience)}${textLink(PAGES.talks.path, ui.allTalks)}${textLink(PAGES.media.path, ui.allMedia)}${li ? ext(li, ui.linkedinLabel) : ''}</p></div></div></section>` : '';

  const certSec = section({ id: 'sertifikalar', tone: 'white', title: ui.certsTitle,
    body: list(certs.map((x) => entry({ t: x.name, s: x.detail })), 'cols') });

  const eduBody = (academic.length ? group(ui.academicLabel) + list(academic.map((x) => entry({ t: x.name, m: x.meta, tag: 'h4' }))) : '')
    + (programs.length ? group(ui.programsLabel) + list(programs.map((x) => entry({ t: x.name, s: x.org, tag: 'h4' })), 'cols') : '');
  const edu = section({ id: 'egitim', tone: 'cream', title: ui.educationTitle, body: eduBody });

  const recBody = (recognition.length ? group(ui.recognitionLabel) + list(recognition.map((x) =>
    entry({ t: x.name, m: x.date, tag: 'h4', b: p(x.detail) + (x.link ? ext(x.link, x.linkLabel || ui.open, x.name) : '') }))) : '')
    + (community.length ? group(ui.communityLabel) + list(community.map((x) => entry({ t: x.name, s: x.detail, m: x.date, tag: 'h4' }))) : '');
  const rec = section({ id: 'taninirlik', tone: 'white', title: ui.recognitionTitle, body: recBody });

  return pageHead('about') + bio + certSec + edu + rec + cta();
}

function experienceBody() {
  const tl = `<ol class="tl">${experience.map((e, i) => `<li class="tl-item${e.current ? ' current' : ''} ${rv(i)}">
    <div class="tl-meta"><p class="tl-org">${esc(e.org)}</p>${e.period ? `<p class="tl-period">${esc(e.period)}</p>` : ''}${e.current ? `<p class="tl-tag">${esc(ui.currentRole)}</p>` : ''}</div>
    <div class="tl-card"><h2>${esc(e.role)}</h2>${p(e.summary)}${e.points?.length ? `<ul class="points">${e.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></li>`).join('')}</ol>`;
  return pageHead('experience') + `<section class="sec cream" aria-label="${esc(PAGES.experience.h1)}"><div class="wrap">${tl}</div></section>` + cta();
}

function talksBody() {
  const tb = talksBlock('full');
  return pageHead('talks') + (tb.has ? `<section class="sec cream" aria-label="${esc(PAGES.talks.h1)}"><div class="wrap">${tb.html}</div></section>` + talksData() : '') + cta();
}

function mediaBody() {
  return pageHead('media') + (media.length ? `<section class="sec white" aria-label="${esc(PAGES.media.h1)}"><div class="wrap"><ul class="tiles big">${media.map(mediaTile('h2')).join('')}</ul></div></section>` : '') + cta();
}

function contactBody() {
  const rows = [
    li && { name: ui.linkedinLabel, url: li }, sub && { name: ui.substackLabel + ': From Strategy to Adoption', url: sub },
    yt && { name: ui.youtubeLabel + ': Change Management in 20 Mins', url: yt },
  ].filter(Boolean);
  return pageHead('contact') + `<section class="sec cream" aria-label="${esc(PAGES.contact.h1)}"><div class="wrap contact-grid">
    <div class="${rv()}"><p class="lead">${esc(ui.contactHeading)}</p><div class="cta-actions on-light">${linkedinBtn()}${mail ? btn(`mailto:${mail}`, mail, 'ghost-dark') : ''}</div></div>
    <div class="${rv(1)}"><h2 class="sm">${esc(ui.elsewhere)}</h2>${list(rows.map((r) => entry({ t: r.name, tag: 'h3', b: ext(r.url, shortUrl(r.url), r.name) })))}</div></div></section>`;
}

// ---------- SEO ----------
const ogOk = site.ogImage && existsSync(`public/${site.ogImage}`);
if (site.ogImage && !ogOk) warn(`Paylaşım görseli bulunamadı: public/${site.ogImage}`);
const OG_W = 1200, OG_H = 630; // og-image.jpg bu boyutta üretildi
const photoOk = id.photo && existsSync(`public/${id.photo.base}-960.webp`);
const sameAs = [li, sub, yt].filter(Boolean);
const person = {
  '@type': 'Person', ...(siteUrl && { '@id': `${siteUrl}/#person` }), name: id.name,
  ...(siteUrl && { url: `${siteUrl}/` }), ...(siteUrl && photoOk && { image: abs(`${id.photo.base}-960.webp`) }),
  jobTitle: id.title, description: id.positioning,
  ...(id.org && { worksFor: { '@type': 'Organization', name: id.org } }),
  ...(sameAs.length && { sameAs }), ...(c.seo?.knowsAbout?.length && { knowsAbout: c.seo.knowsAbout }),
};
const website = { '@type': 'WebSite', name: site.name, inLanguage: site.lang, ...(siteUrl && { url: `${siteUrl}/` }) };
const jsonLd = (key) => {
  const graph = key === 'home' || key === 'about' ? [website, person] : [];
  if (key !== 'home' && siteUrl) graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: ui.homeLabel, item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name: PAGES[key].nav, item: abs(PAGES[key].path) }] });
  if (!graph.length) return '';
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
};

const [first, ...restName] = id.name.split(' ');
const headTags = () => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="${esc(site.themeColor)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/cormorant-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<script>document.documentElement.className+=' js'</script>`;

const seoTags = (key) => {
  const pg = PAGES[key];
  const url = siteUrl ? abs(pg.path) : null;
  const big = siteUrl && ogOk;
  return `<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.description)}">
${url ? `<link rel="canonical" href="${esc(url)}">\n` : ''}<meta property="og:type" content="${key === 'home' || key === 'about' ? 'profile' : 'website'}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${esc(site.locale)}">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.description)}">
${key === 'home' || key === 'about' ? `<meta property="profile:first_name" content="${esc(first)}">\n<meta property="profile:last_name" content="${esc(restName.join(' '))}">\n` : ''}${url ? `<meta property="og:url" content="${esc(url)}">\n` : ''}${big ? `<meta property="og:image" content="${esc(abs(site.ogImage))}">
<meta property="og:image:width" content="${OG_W}">
<meta property="og:image:height" content="${OG_H}">
<meta property="og:image:alt" content="${esc(site.ogImageAlt)}">\n` : ''}<meta name="twitter:card" content="${big ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(pg.title)}">
<meta name="twitter:description" content="${esc(pg.description)}">
${big ? `<meta name="twitter:image" content="${esc(abs(site.ogImage))}">\n<meta name="twitter:image:alt" content="${esc(site.ogImageAlt)}">\n` : ''}${jsonLd(key)}`;
};

// ---------- Ortak düzen ----------
const NAV_KEYS = ['about', 'experience', 'talks', 'media', 'contact'];
const header = (key) => `<header class="site-header navy" id="top">
  <div class="wrap bar">
    <a class="brand" href="/">${esc(id.name)}</a>
    <nav id="site-nav" class="site-nav" aria-label="${esc(ui.navLabel)}">${NAV_KEYS.map((k) => `<a href="${PAGES[k].path}"${k === key ? ' aria-current="page"' : ''}>${esc(PAGES[k].nav)}</a>`).join('')}</nav>
    <div class="bar-actions">
      ${li ? `<a class="icon-link" href="${esc(li)}" target="_blank" rel="noopener" aria-label="${esc(ui.linkedinAria)}">${ICONS.linkedin}</a>` : ''}
      <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" data-open="${esc(ui.menu)}" data-close="${esc(ui.menuClose)}"><span class="menu-icon" aria-hidden="true"></span><span class="menu-label">${esc(ui.menu)}</span></button>
    </div>
  </div>
</header>`;

const footer = () => `<footer class="foot navy"><div class="wrap foot-grid">
  <div><p class="foot-brand">${esc(id.name)}</p><p class="foot-role">${esc(id.title)}${id.org ? `, ${esc(id.org)}` : ''}</p></div>
  <nav aria-label="${esc(ui.exploreTitle)}"><h2 class="foot-h">${esc(ui.exploreTitle)}</h2><ul>${NAV_KEYS.map((k) => `<li><a href="${PAGES[k].path}">${esc(PAGES[k].nav)}</a></li>`).join('')}</ul></nav>
  <div><h2 class="foot-h">${esc(ui.elsewhere)}</h2><ul>
    ${li ? `<li><a href="${esc(li)}" target="_blank" rel="noopener">${esc(ui.linkedinLabel)}</a></li>` : ''}${sub ? `<li><a href="${esc(sub)}" target="_blank" rel="noopener">${esc(ui.substackLabel)}</a></li>` : ''}${yt ? `<li><a href="${esc(yt)}" target="_blank" rel="noopener">${esc(ui.youtubeLabel)}</a></li>` : ''}${mail ? `<li><a href="mailto:${esc(mail)}">${esc(mail)}</a></li>` : ''}</ul></div>
  <p class="foot-copy">${esc(site.footer)}</p></div></footer>`;

const layout = (key, body) => `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
${headTags()}
${seoTags(key)}
</head>
<body>
<a class="skip" href="#main">${esc(ui.skip)}</a>
${header(key)}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
<script src="/site.js" defer></script>
</body>
</html>`;

const notFound = `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
${headTags()}
<title>Sayfa bulunamadı — ${esc(site.name)}</title>
<meta name="robots" content="noindex">
</head>
<body>
<header class="site-header navy"><div class="wrap bar"><a class="brand" href="/">${esc(id.name)}</a></div></header>
<main id="main" class="notfound"><div class="wrap"><p class="nf-code">404</p><h1>Aradığınız sayfa bulunamadı</h1><p>Bağlantı değişmiş ya da yanlış yazılmış olabilir.</p>${btn('/', ui.backHome)}</div></main>
</body>
</html>`;

const pages = {
  home: layout('home', homeBody()),
  about: layout('about', aboutBody()),
  experience: layout('experience', experienceBody()),
  talks: layout('talks', talksBody()),
  media: layout('media', mediaBody()),
  contact: layout('contact', contactBody()),
};

// ---------- Güvenlik kontrolü: iç notlar asla yayına çıkmasın ----------
const visible = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
for (const [k, h] of [...Object.entries(pages), ['404', notFound]]) {
  if (/DOĞRULA|EKSİK|\[|\]/.test(visible(h))) fail(`"${k}" sayfasının çıktısında iç not işareti bulundu (DOĞRULA/EKSİK/köşeli parantez). content.json dosyasını kontrol edin.`);
}

// ---------- Yaz ----------
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });
cpSync('styles.css', 'dist/styles.css');
writeFileSync('dist/site.js', `var renderTalks = ${renderTalks.toString()};\n${readFileSync('client.js', 'utf8')}`);
for (const [k, h] of Object.entries(pages)) {
  const path = PAGES[k].path;
  if (path === '/') writeFileSync('dist/index.html', h);
  else { mkdirSync(`dist${path}`, { recursive: true }); writeFileSync(`dist${path}index.html`, h); }
}
writeFileSync('dist/404.html', notFound);
writeFileSync('dist/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#102A43"/><text x="32" y="43" font-family="Georgia,serif" font-size="30" text-anchor="middle" fill="#C5A46D">CE</text></svg>`);
writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
if (siteUrl) {
  const urls = Object.keys(pages).map((k) => `  <url><loc>${esc(abs(PAGES[k].path))}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

// ---------- Özet ----------
if (hidden.length) {
  console.log(`Gizli kalan kayıt (verified: false): ${hidden.length}`);
  hidden.forEach((h) => console.log('  - ' + h));
} else {
  console.log('Gizli kayıt yok: content.json içindeki tüm kayıtlar yayında.');
}
const r0 = renderTalks(talks, ui, today, 'full');
console.log(`Etkinlikler (${today}): ${r0.upcomingCount} yaklaşan, ${talks.length - r0.upcomingCount} geçmiş.`);
console.log(`Sayfalar: ${Object.keys(pages).map((k) => PAGES[k].path).join('  ')}  + 404`);
console.log('Build tamam: dist/');
