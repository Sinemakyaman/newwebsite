// Sıfır bağımlılıklı statik site üreticisi: data/content.json -> dist/
// Metinlerin tamamı content.json içindedir. "verified": false olan her şey sitede gizlenir.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';

const c = JSON.parse(readFileSync('data/content.json', 'utf8'));
const { ui, identity: id, links } = c;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const vis = (arr) => (arr || []).filter((x) => x && x.verified !== false);
const p = (t, cls) => (t ? `<p${cls ? ` class="${cls}"` : ''}>${esc(t)}</p>` : '');
const ext = (url, label) => `<a class="more" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

const entry = ({ t, s, m, b = '' }) =>
  `<li class="entry"><div><h3>${esc(t)}</h3>${p(s, 'sub')}${b}</div>${m ? `<span class="meta">${esc(m)}</span>` : ''}</li>`;
const list = (items) => (items.length ? `<ul class="entries">${items.join('')}</ul>` : '');
const section = (id, title, body, cls = '') =>
  body ? `<section id="${id}" class="sec ${cls}"><div class="wrap sec-grid"><h2>${esc(title)}</h2><div class="sec-body">${body}</div></div></section>` : '';

// --- Bölümler ---
const photo = id.photo && existsSync(`public/${id.photo}`)
  ? `<img class="portrait" src="/${esc(id.photo)}" alt="${esc(id.photoAlt)}" width="360" height="450">` : '';

const about = c.bio.length || id.positioning
  ? `<p class="lead">${esc(id.positioning)}</p>${c.bio.map((x) => p(x)).join('')}` : '';

const experience = vis(c.experience).map((e) => {
  const body = p(e.summary) + (e.points?.length ? `<ul class="points">${e.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
    + vis(e.extra).map((x) => p(x.text)).join('');
  return entry({ t: e.role, s: e.org, m: e.period, b: body });
});

const certs = vis(c.certificates).map((x) => entry({ t: x.name, s: x.detail }));

const academic = vis(c.education.academic).map((x) => entry({ t: x.name }));
const programs = vis(c.education.programs);
const progItem = (x) => entry({ t: x.name, s: x.org });
const featured = programs.filter((x) => x.featured).map(progItem);
const rest = programs.filter((x) => !x.featured).map(progItem);
const education = (academic.length ? `<h3 class="group">${esc(ui.academicLabel)}</h3>${list(academic)}` : '')
  + (programs.length ? `<h3 class="group">${esc(ui.programsLabel)}</h3>${list(featured)}`
    + (rest.length ? `<details><summary>${esc(ui.showAll)} (${rest.length})</summary>${list(rest)}</details>` : '') : '');

const community = vis(c.community).map((x) => entry({ t: x.name, s: x.detail, m: x.date }));
const recognition = vis(c.recognition).map((x) =>
  entry({ t: x.name, m: x.date, b: x.link ? ext(x.link, ui.open) : '' }));

const talkEntry = (x) => entry({
  t: x.event, s: x.title, m: x.date,
  b: p([x.role, x.time && `saat ${x.time}`].filter(Boolean).join(', ')),
});
const talks = vis(c.talks);
const upcoming = talks.filter((x) => x.upcoming);
const years = [...new Set(talks.filter((x) => !x.upcoming).map((x) => x.year))].sort().reverse();
const talksBody = (upcoming.length ? `<h3 class="group">${esc(ui.upcoming)}</h3>${list(upcoming.map(talkEntry))}` : '')
  + (years.length ? `<h3 class="group">${esc(ui.past)}</h3>` + years.map((y) =>
    `<p class="year">${esc(y)}</p>${list(talks.filter((x) => !x.upcoming && x.year === y).map(talkEntry))}`).join('') : '');

const media = vis(c.media).map((x) =>
  entry({ t: x.name, s: x.kind, m: x.date, b: p(x.text) + (x.link ? ext(x.link, ui.open) : '') }));

const cases = vis(c.cases).map((x) => entry({ t: x.title, b: p(x.text) }));
const testimonials = vis(c.testimonials).map((x) => entry({ t: x.quote, s: x.author }));

const li = links.linkedin.verified && links.linkedin.url;
const mail = links.email.verified && links.email.value;
const contact = `${p(ui.contactText)}<div class="actions">`
  + (li ? `<a class="btn" href="${esc(li)}" target="_blank" rel="noopener">${esc(ui.ctaLabel)}</a>` : '')
  + (mail ? `<a class="btn ghost" href="mailto:${esc(mail)}">${esc(mail)}</a>` : '') + '</div>'
  + `<p class="elsewhere">${[li && ext(li, ui.linkedinLabel), links.substack.verified && ext(links.substack.url, ui.substackLabel)].filter(Boolean).join(' ')}</p>`;

const S = ui.sections;
const sections = [
  section('hakkinda', S.about, about),
  section('deneyim', S.experience, list(experience).replace('class="entries"', 'class="entries timeline"')),
  section('sertifikalar', S.certs, list(certs)),
  section('egitim', S.education, education),
  section('topluluk', S.community, list(community)),
  section('taninirlik', S.recognition, list(recognition)),
  section('konusmalar', S.talks, talksBody),
  section('medya', S.media, list(media)),
  section('vakalar', S.cases, list(cases)),
  section('referanslar', S.testimonials, list(testimonials)),
  section('iletisim', S.contact, contact, 'contact'),
].join('\n');

const present = (anchor) => sections.includes(`id="${anchor}"`);
const nav = ui.nav.filter(([a]) => present(a)).map(([a, l]) => `<a href="#${a}">${esc(l)}</a>`).join('');

const ld = { '@context': 'https://schema.org', '@type': 'Person', name: id.name, jobTitle: id.title,
  description: id.positioning, sameAs: [li, links.substack.verified && links.substack.url].filter(Boolean) };

const html = `<!doctype html>
<html lang="${esc(c.site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.site.title)}</title>
<meta name="description" content="${esc(id.positioning)}">
<meta property="og:title" content="${esc(c.site.title)}">
<meta property="og:description" content="${esc(id.positioning)}">
<meta property="og:type" content="profile">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400&display=swap">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<a class="skip" href="#main">${esc(ui.skip)}</a>
<div class="hero" id="top">
  <div class="wrap">
    <header class="bar"><a class="brand" href="#top">${esc(id.name)}</a><nav aria-label="Menü">${nav}</nav></header>
    <div class="hero-body">
      <p class="hero-q">${esc(id.question)}</p>
      <span class="trace" aria-hidden="true"></span>
      <div class="hero-id">
        <div><h1>${esc(id.name)}</h1>${p(id.title, 'role')}${li ? `<a class="btn" href="${esc(li)}" target="_blank" rel="noopener">${esc(ui.ctaLabel)}</a>` : ''}</div>
        ${photo}
      </div>
    </div>
  </div>
</div>
<main id="main">
${sections}
</main>
<footer class="foot"><div class="wrap">${esc(c.site.footer)}</div></footer>
</body>
</html>`;

// --- Güvenlik kontrolü: iç notlar asla yayına çıkmasın ---
if (/DOĞRULA|EKSİK|\[|\]/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) {
  console.error('HATA: Çıktıda iç not işareti bulundu (DOĞRULA/EKSİK/köşeli parantez). content.json dosyasını kontrol edin.');
  process.exit(1);
}

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
if (existsSync('public')) cpSync('public', 'dist', { recursive: true });
cpSync('styles.css', 'dist/styles.css');
writeFileSync('dist/index.html', html);
writeFileSync('dist/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0E3B43"/><text x="32" y="43" font-family="Georgia,serif" font-size="30" text-anchor="middle" fill="#F2F5F5">CE</text></svg>`);
writeFileSync('dist/robots.txt', 'User-agent: *\nAllow: /\n');
console.log('Build tamam: dist/index.html');
