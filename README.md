# 🎓 KPSS Soru Programı

KPSS Lisans (GY-GK) hazırlığı için tarayıcıda çalışan, kurulum gerektirmeyen soru çözme programı. İnternet bağlantısı gerekmez, tüm verilerin kendi bilgisayarında kalır.

## 🚀 Nasıl Kullanılır?

1. Sağ üstteki yeşil **Code** butonuna tıkla → **Download ZIP**
2. İndirdiğin ZIP dosyasını bir klasöre çıkart
3. **index.html** dosyasına çift tıkla (veya **KPSS-Baslat.bat**) — program tarayıcında açılır

Hepsi bu. Kurulum yok, üyelik yok, internet gerekmez.

## 📚 Soru Bankası

Gerçek KPSS soru dağılımıyla birebir aynı:

| Ders | Testte Soru | Bankada Soru |
|---|---|---|
| 📖 Türkçe | 30 | 990 |
| 🔢 Matematik | 30 | 270 |
| 🏛️ Tarih | 27 | 969 |
| 🌍 Coğrafya | 18 | 648 |
| ⚖️ Vatandaşlık | 9 | 369 |
| 📰 Güncel Bilgiler | 6 | 138 |

**Toplam: 3.384 soru** — banka düzenli olarak büyütülmektedir.

Tüm sorular ÖSYM tarzında hazırlanmış ve çok aşamalı kalite denetiminden geçirilmiştir. Vatandaşlık soruları 2017 sonrası güncel mevzuata göredir.

## ✨ Özellikler

- **Ders testi:** Ders seç, gerçek sınav soru sayısıyla test çöz; kronometre çalışır
- **Otomatik ilerleme:** Şıkkı seçince sonraki soruya geçer (kapatılabilir); klavyeden 1-5 veya A-E ile cevaplanabilir
- **Detaylı sonuç ekranı:** Doğru/yanlış/boş, net hesabı (4 yanlış 1 doğruyu götürür), süre, konu bazlı analiz
- **Açıklamalı çözümler:** Her sorunun neden o cevap olduğu anlatılır; matematikte adım adım çözüm
- **🎯 Tam Deneme:** 120 soru (60 GY + 60 GK), 130 dakika geri sayım, ders ders sonuç dökümü
- **📕 Yanlış Defteri:** Yanlış yaptığın sorular birikir; doğru çözünce defterden düşer
- **📈 Gelişim Grafiği:** Netlerinin zaman içindeki değişimini gösterir
- **Soru tekrarı yok:** Çözdüğün sorular bir daha karşına gelmez
- **📅 Günlük hedef ve seri:** "Bugün X/120 soru" ilerleme çubuğu + 🔥 üst üste çalışılan gün sayısı
- **🧩 Zayıf Konularım:** Başarısı düşük konuları otomatik tespit eder, onlardan özel test derler
- **⚑ Soru işaretleme:** Emin olmadığın soruyu işaretle (F tuşu), sonuç ekranında işaretlilere dön
- **⏱ Süre analizi:** Soru başına ortalama süren, denemede ders ders hız dökümü
- **📋 Sonucu kopyala:** Netini tek tıkla WhatsApp'a yapıştırılacak metne çevirir
- **💾 Yedekleme:** İlerlemeni dosya olarak dışa/içe aktarabilirsin

## ❓ Sık Sorulanlar

**Verilerim nerede saklanıyor?** Tarayıcının yerel depolamasında (localStorage), sadece senin bilgisayarında. Kimseyle paylaşılmaz.

**Tarayıcı verilerini silersem ne olur?** İlerleme kaydın gider. Bu yüzden ana sayfadaki **💾 Yedek Al** butonunu arada bir kullan; **📂 Yedek Yükle** ile geri getirebilirsin.

**Sınav tarihi yanlış görünüyor.** Ana sayfadaki tarih kutusundan değiştirebilirsin; tercihin kaydedilir.

**Soru eklenebilir mi?** Evet — adım adım rehber için [KATKI.md](KATKI.md) dosyasına bak. Yapay zekâ asistanı kullanıyorsan işi ona bırakabilirsin: depodaki kuralları (CLAUDE.md/AGENTS.md) otomatik okur, kopya üretmez, `node dogrula.js` ile kontrol eder.

Bol netler! 💪
