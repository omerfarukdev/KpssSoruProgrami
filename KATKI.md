# 🤝 Soru Ekleme Rehberi

Bu depoya üç kişi de soru ekleyebilir. Herkes eklediğinde **herkesin programına** yeni sorular gelir (siteyi kullananlara otomatik, ZIP indirenlere yeniden indirince). İlerlemeler (çözülen sorular, netler, yanlış defteri) kişiseldir, karışmaz.

## Altın Kurallar (çakışma olmasın diye)

1. **Kendi dosyanı ekle, başkasının dosyasını düzenleme.**
   Dosya adına kendi adını koy: `turkce-ali-1.js`, `tarih-mehmet-1.js` gibi.
2. **Soru id'lerine kendi adını koy:** `tur-ali-001`, `tar-mehmet-001` gibi.
   Böylece iki kişinin id'si asla çakışmaz.
3. Dosyanı ekledikten sonra adını `sorular/manifest.js` listesinin **sonuna** ekle.
4. Göndermeden önce proje klasöründe şunu çalıştır: `node dogrula.js`
   (🎉 görürsen her şey yolunda; ❌ görürsen hatayı düzelt.)

## Soru Dosyası Formatı

`sorular/turkce-ali-1.js` örneği:

```js
window.KPSS_BANK = window.KPSS_BANK || {};
(window.KPSS_BANK["turkce"] = window.KPSS_BANK["turkce"] || []).push(
{ id: "tur-ali-001", konu: "Paragraf", soru: "Soru metni buraya?", secenekler: ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı", "E şıkkı"], dogru: 2, aciklama: "Neden C olduğunun açıklaması." },
{ id: "tur-ali-002", konu: "Dil Bilgisi", soru: "İkinci soru?", secenekler: ["...", "...", "...", "...", "..."], dogru: 0, aciklama: "..." }
);
```

Dikkat:
- İlk satırdaki `"turkce"` yerine dersin anahtarını yaz: `turkce`, `matematik`, `tarih`, `cografya`, `vatandaslik`, `guncel`
- `dogru`: doğru şıkkın sırası — **0=A, 1=B, 2=C, 3=D, 4=E**
- Tam **5 şık** olmalı, sorular arasına **virgül** konmalı (son sorudan sonra virgül yok)
- Metin içinde çift tırnak kullanacaksan `\"` şeklinde yaz
- `konu` alanına mevcut sorulardaki konu adlarından birini yazarsan konu analizi düzgün çalışır (mevcut adları o dersin dosyalarına bakarak görebilirsin)

## Ders Anahtarları ve id Önekleri

| Ders | anahtar | id öneki örneği |
|---|---|---|
| Türkçe | `turkce` | `tur-ali-001` |
| Matematik | `matematik` | `mat-ali-001` |
| Tarih | `tarih` | `tar-ali-001` |
| Coğrafya | `cografya` | `cog-ali-001` |
| Vatandaşlık | `vatandaslik` | `vat-ali-001` |
| Güncel Bilgiler | `guncel` | `gun-ali-001` |

## GitHub'a Gönderme Yolları

**Kolay yol (tarayıcıdan):** GitHub'da depoyu aç → `sorular` klasörü → **Add file → Create new file** → dosyanı oluştur → aynı şekilde `manifest.js`'i düzenleyip dosya adını listeye ekle → **Commit changes**. (Bunun için depoya davet edilmiş olman gerekir.)

**Klasik yol (bilgisayardan):**
```
git pull          # önce başkalarının eklediklerini al
node dogrula.js   # kontrol et
git add .
git commit -m "Türkçe'ye 20 yeni soru (Ali)"
git push
```

**En kolay yol:** Sorularını düz metin olarak Ömer'e gönder — o, yapay zekâya formatlatıp doğrulatıp yükler. 😊

## 🤖 Yapay Zekâ ile Soru Ekleyenler

Claude Code, Cursor, Copilot gibi bir yapay zekâ asistanı kullanıyorsan işin çok kolay: asistanın bu depodaki **CLAUDE.md / AGENTS.md** dosyalarını otomatik okur ve tüm kuralları öğrenir. Ona sadece şunu söylemen yeterli:

> "Bu depoya benim adıma (adın) türkçe dersine 20 soru ekle, depodaki kurallara uy."

Asistan otomatik olarak: mevcut soruları okuyup kopya üretmez, senin adınla dosya ve id oluşturur, manifest'i günceller, `node dogrula.js` ile kontrol eder ve push'lar. `dogrula.js` kopya ve aşırı benzer soruları da yakalar — yani üç kişi farklı koldan eklerken sistem karışmaz.
