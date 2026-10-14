# Ceren Eryılmaz — kişisel site

Bağımlılıksız statik site. Tüm metin `data/content.json` dosyasındadır; `node build.mjs` bunu `dist/` klasörüne site olarak üretir. Vercel bu komutu otomatik çalıştırır (`vercel.json`).

## Klasörler
- `data/content.json` — bütün içerik (metinler, linkler, tarihler)
- `public/assets/` — fotoğraflar (`ceren-eryilmaz-*.webp/.jpg` hero portresi, `og-image.jpg` sosyal paylaşım görseli)
- `public/fonts/` — kendi sunucumuzdan yüklenen yazı tipleri (SIL Open Font License, lisans dosyaları yanlarında)
- `styles.css`, `client.js` — görünüm ve küçük tarayıcı betiği (mobil menü, etkinlik sınıflandırma)
- `build.mjs`, `lib/talks.mjs` — site üretici ve etkinlik tarih mantığı
- `scripts/test-talks.mjs` — etkinlik tarih mantığı testi (`npm test`)

## İçerik düzenleme
- **Yayın durumu:** Her kaydın `"verified"` alanı vardır. `true` (veya hiç yazılmamış) ise sitede görünür, `false` ise gizlenir. Build her çalıştığında hangi kayıtların gizli kaldığını ekrana yazar, böylece yanlışlıkla gizli kalan içerik fark edilir.
- **Eksik linkler:** `link: null` olan kayıt linksiz yayınlanır. Link geldiğinde `null` yerine `"https://..."` yazmanız yeter (örn. `media` altındaki Proses Sohbetleri ve Change Talks, `recognition` altındaki kayıtlar). Bağlantının görünen yazısı `linkLabel` alanındadır.
- **E-posta:** `links.email.value` alanına adresi yazıp `verified: true` yapın; iletişim bölümünde otomatik görünür.
- **Biyografi:** `bio` listesindeki her satır bir paragraftır.
- **Vaka çalışmaları / referanslar:** `cases` ve `testimonials` listeleri doluysa bölümler kendiliğinden görünür, boşken görünmez.

## Etkinlikler ve tarihler
Her etkinliğin `start` (ve çok günlüyse `end`) alanı ISO biçimindedir: `"2026-11-03"` (tam gün), `"2025-05"` (yalnızca ay), `"2024"` (yalnızca yıl). Etkinlik bittikten sonraki gün otomatik olarak "Geçmiş" listesine geçer; ekrandaki tarih metni (`3 Kasım 2026`, `5–8 Mayıs 2026`) bu alanlardan üretilir. Geçiş hem build sırasında hem de ziyaretçinin tarayıcısında hesaplanır, yani site yeniden yayınlanmasa bile doğru kalır. Hatalı biçimde tarih yazılırsa build, hangi etkinlikte hata olduğunu söyleyerek durur.

## Alan adı ve SEO
`site.url` alanına alan adını yazın (örn. `"https://www.ornek.com"`). Canonical, `og:url`, `og:image`, `sitemap.xml` ve JSON-LD buradan üretilir. Bu alan boşsa build, Vercel'in verdiği adresi (`VERCEL_PROJECT_PRODUCTION_URL`) kullanır; o da yoksa bu etiketleri üretmez ve uyarı verir. Kendi alan adını bağladığınızda `site.url`'yi güncellemeyi unutmayın.

## Fotoğraf değiştirme
Yeni portre için aynı adlandırmayla `ceren-eryilmaz-480.webp`, `-760.webp`, `-960.webp` (4:5 oran) ve `-760.jpg` dosyalarını `public/assets/` içine koyun. Sosyal paylaşım görseli 1200×630 piksel `og-image.jpg` olmalıdır.

## Yerelde deneme
```
node build.mjs
npx serve dist
```
Build, iç not işareti (`DOĞRULA`, `EKSİK`, köşeli parantez) veya bozuk JSON/tarih bulursa durur; Vercel'de bu durumda önceki yayın olduğu gibi kalır.
