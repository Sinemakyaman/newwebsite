# Ceren Eryılmaz — kişisel marka sitesi

Bağımlılıksız statik site. Tüm metin `data/content.json` dosyasındadır; `node build.mjs` bunu `dist/` klasörüne siteye çevirir. Vercel bu komutu otomatik çalıştırır (`vercel.json`).

## Sayfalar
`/` ana sayfa · `/hakkimda/` · `/deneyim/` · `/konusmalar/` · `/yayinlar/` · `/iletisim/` · 404

Ana sayfa seçilmiş özetleri gösterir; ayrıntılı ve eksiksiz içerik alt sayfalardadır (sertifikalar, eğitim ve tanınırlık "Hakkımda" sayfasındadır).

## Klasörler
- `data/content.json` — bütün içerik (metinler, linkler, tarihler)
- `public/assets/` — fotoğraflar; `public/fonts/` — kendi sunucumuzdan yüklenen yazı tipleri (SIL OFL, lisans dosyaları yanlarında)
- `styles.css`, `client.js` — görünüm; mobil menü, kaydırma animasyonu ve etkinlik sınıflandırma
- `build.mjs`, `lib/talks.mjs` — site üretici ve etkinlik tarih mantığı
- `scripts/test-talks.mjs` — tarih mantığı testi (`npm test`)

## Görsel kimlik
Lacivert `#102A43`, sıcak krem `#F5F0E8`, beyaz, ölçülü şampanya altını `#C5A46D`. Başlıklarda Cormorant (serif), metinde Hanken Grotesk. Renkler `styles.css` başındaki `:root` değişkenlerindedir. Altın, açık zeminde metin rengi olarak kullanılmaz (kontrast yetersiz); yerine koyu altın `--gold-ink` kullanılır.

## İçerik düzenleme
- **Yayın durumu:** Her kaydın `"verified"` alanı vardır. `true` (veya yazılmamış) ise görünür, `false` ise gizlenir. Build her çalıştığında gizli kalan kayıtları listeler.
- **Eksik linkler:** `link: null` olan kayıt linksiz yayınlanır. Link geldiğinde `null` yerine `"https://..."` yazın (`media`, `recognition`, `talks`). Bağlantı yazısı `linkLabel` alanındadır.
- **Fotoğraflı kartlar:** `talks[].image` (ve `imageAlt`) ile `media[].image` alanları hazırdır; etkinlik fotoğrafı eklenince `public/assets/` içine koyup yolunu yazın.
- **E-posta:** `links.email.value` alanına adresi yazıp `verified: true` yapın; üst/alt bilgide ve iletişim sayfasında otomatik görünür.
- **Biyografi:** `bio` listesindeki her satır bir paragraftır. **Uzmanlık alanları:** `expertise`. **Fotoğraflar bölümü:** `gallery`.
- **Vaka çalışmaları / referanslar:** `cases`, `testimonials` (şu an sitede gösterilmiyor).

## Etkinlikler ve tarihler
`start` (çok günlüyse `end`) ISO biçimindedir: `"2026-11-03"`, `"2025-05"` (yalnızca ay) veya `"2024"` (yalnızca yıl). Etkinlik bittikten sonraki gün otomatik olarak "Geçmiş"e geçer. Hesap hem build sırasında hem ziyaretçinin tarayıcısında yapılır; yeniden yayın gerekmez. Hatalı tarih yazılırsa build hangi etkinlikte hata olduğunu söyleyerek durur.

## Alan adı ve SEO
`site.url` alanına alan adını yazın (ör. `"https://www.ornek.com"`). Canonical, `og:url`, `og:image`, `sitemap.xml` ve JSON-LD buradan üretilir. Boşsa build Vercel'in verdiği adresi kullanır; o da yoksa bu etiketleri üretmez ve uyarı verir. Her sayfanın başlığı ve açıklaması `site.pages` içindedir. Sayfa adresleri `/` ile biter (`vercel.json` içinde `trailingSlash: true`).

## Fotoğraf değiştirme
Aynı adlandırmayla (`ceren-eryilmaz-480/760/960.webp` ve `-760.jpg` hero, `ceren-hakkinda-*` hakkında portresi, `ceren-galeri-*` galeri) dosyaları `public/assets/` içine koyun. Sosyal paylaşım görseli 1200×630 piksel `og-image.jpg` olmalıdır.

## Yerelde deneme
```
node build.mjs
npx serve dist
```
Build, iç not işareti (`DOĞRULA`, `EKSİK`, köşeli parantez), bozuk JSON veya bozuk tarih bulursa durur; Vercel'de bu durumda önceki yayın olduğu gibi kalır.
