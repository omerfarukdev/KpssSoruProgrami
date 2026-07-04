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
| 📖 Türkçe | 30 | 90 |
| 🔢 Matematik | 30 | 90 |
| 🏛️ Tarih | 27 | 81 |
| 🌍 Coğrafya | 18 | 54 |
| ⚖️ Vatandaşlık | 9 | 36 |
| 📰 Güncel Bilgiler | 6 | 24 |

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
- **💾 Yedekleme:** İlerlemeni dosya olarak dışa/içe aktarabilirsin

## ❓ Sık Sorulanlar

**Verilerim nerede saklanıyor?** Tarayıcının yerel depolamasında (localStorage), sadece senin bilgisayarında. Kimseyle paylaşılmaz.

**Tarayıcı verilerini silersem ne olur?** İlerleme kaydın gider. Bu yüzden ana sayfadaki **💾 Yedek Al** butonunu arada bir kullan; **📂 Yedek Yükle** ile geri getirebilirsin.

**Sınav tarihi yanlış görünüyor.** Ana sayfadaki tarih kutusundan değiştirebilirsin; tercihin kaydedilir.

**Soru eklenebilir mi?** Evet — `sorular/` klasörüne aynı formatta yeni bir `.js` dosyası ekleyip `sorular/manifest.js` listesine adını yazman yeterli.

Bol netler! 💪
