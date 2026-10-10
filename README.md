# Ceren Eryılmaz — kişisel site

Sıfır bağımlılıklı statik site. Tüm metin `data/content.json` içindedir.

## İçerik kuralları
- `"verified": false` olan her kayıt sitede GİZLİDİR. Doğruladığınızda `true` yapın.
- Biyografi: `bio` listesine paragrafları ekleyin (olduğu gibi gösterilir).
- Fotoğraf: dosyayı `public/assets/` içine koyun, `identity.photo` alanına `assets/dosya.jpg` yazın.
- Vaka çalışması / referans: `cases` ve `testimonials` listeleri doluysa bölümler otomatik görünür.
- E-posta: `links.email` içine `value` yazıp `verified: true` yapın.
- Build, çıktıda `DOĞRULA`, `EKSİK` veya köşeli parantez bulursa hata verir.

## Vercel'e yükleme
1. Klasörü GitHub'a gönderin, vercel.com > Add New > Project ile içe aktarın.
   (Ayarlar `vercel.json` içinde hazır: build `node build.mjs`, çıktı `dist`.)
2. Alternatif: `npm i -g vercel` ardından bu klasörde `vercel --prod`.

Yerelde denemek için: `npm start`
