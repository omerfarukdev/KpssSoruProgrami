# KPSS Soru Programı — Yapay Zekâ Çalışma Talimatları

Bu depo **3 kişinin ortak** KPSS Lisans (GY-GK) çalışma aracıdır. Bu dosya, depoda çalışan **her yapay zekâ asistanı için bağlayıcıdır**. Soru eklemeden veya değişiklik yapmadan önce bu dosyanın tamamını uygula.

## Proje Yapısı

- Tarayıcıda çalışan, kurulumsuz, internetsiz uygulama: `index.html` + `js/app.js` + `css/style.css`
- Sorular: `sorular/*.js` dosyalarında, `window.KPSS_BANK["<ders>"]` dizisine push edilir
- `sorular/manifest.js`: programın yükleyeceği dosyaların listesi — burada olmayan dosya görünmez
- Kullanıcı verileri (netler, yanlış defteri) tarayıcı localStorage'ındadır; depoda veri YOKTUR
- Yerel çalıştırmada (KPSS-Baslat.bat → localhost:8347, `sunucu.js`) ilerleme verisi `veri/ilerleme.json` dosyasına da yansıtılır (git'e girmez, kişiseldir)

## Kişiselleştirilmiş Soru Üretimi (yapay zekâlar için)

Kullanıcı "soru ekle / soru üret" dediğinde ÖNCE `veri/ilerleme.json` dosyasının olup olmadığına bak. Varsa oku:
- `wrong`: ders → yanlış yapılan soru id'leri. Bu id'leri bankadaki sorularla eşleştir, hangi kavramların yanlış yapıldığını çıkar ve **o kavramları test eden benzer ama yeni sorular üret** (yanlış başına 2-3 varyasyon).
- `konuIst`: ders → konu → {d,y,b}. Başarı oranı düşük konulara üretimde ağırlık ver.
Dosya yoksa normal dengeli üretim yap. Kişiselleştirme, format ve kalite kurallarını değiştirmez.

## DOKUNMA Kuralları

1. **Başkasının soru dosyasını düzenleme, silme, yeniden adlandırma.** Herkes yalnızca kendi dosyalarını yönetir.
2. **Mevcut soru id'lerini asla değiştirme** — kullanıcıların ilerleme kayıtları id'lere bağlıdır; id değişirse çözülmüş soru "yeni" sanılır, yanlış defteri bozulur.
3. **Soru silme.** Hatalı soru varsa düzeltilir (yalnızca sahibi ya da onun onayıyla), silinmez.
4. Soru eklemek için `js/app.js`, `css/style.css`, `index.html` dosyalarına dokunmak GEREKMEZ; çekirdek uygulamayı yalnızca depo sahibi (omerfarukdev) değiştirir. (Not: çekirdek dosyalar değiştiğinde `index.html` içindeki `?v=...` sürüm damgaları da güncellenir — tarayıcı önbelleği için.)

## Soru Ekleme Prosedürü (sırayla, adım atlamadan)

1. `git pull` — önce diğerlerinin eklediklerini al.
2. Kullanıcına adını sor (örn. Ali). Dosya adı: `<ders>-<isim>-<sıra>.js` (örn. `turkce-ali-1.js`). Soru id'leri: `<önek>-<isim>-<numara>` (örn. `tur-ali-001`). **İsimsiz id üretme** — çakışmayı bu kural önler.
3. **KOPYA KONTROLÜ (zorunlu):** Yeni soru yazmadan önce o dersin `sorular/endeks/<ders>.txt` endeksini oku — her satır bir sorunun özetidir (`id | konu | soru özü | doğru cevap`). Endeksteki kurgu ve kavramlarla çakışan soru üretme; aynı bilgiyi, aynı paragrafı, aynı kurguyu soran soru kopyadır — sadece sayıları değiştirilmiş matematik sorusu da kopyadır. (Endeks, tam dosyaları okumaktan ~5 kat ucuzdur; endeks yoksa veya bir satırdan emin olamazsan ilgili tam soru dosyasına bak. `node dogrula.js` endeksi otomatik tazeler.)
4. Formata birebir uy (aşağıda). Tam 5 şık, tek savunulabilir doğru cevap, `dogru` alanı 0-4 indeks (0=A … 4=E), `aciklama` zorunlu.
5. `konu` alanına aşağıdaki listeden BİREBİR bir ad yaz — serbest konu adı uydurma (konu analizi bozulur).
6. Dosya adını `sorular/manifest.js` listesinin **sonuna** ekle (başkasının satırına dokunma).
7. **`node dogrula.js` çalıştır** — hata (❌) ve benzerlik uyarısı (⚠️) sıfır olana kadar düzelt. Bu araç şema hatalarını, id çakışmalarını ve kopya/benzer soruları yakalar; başarılı çalıştığında `sorular/endeks/` altındaki ders endekslerini de otomatik günceller — **güncellenen endeks dosyalarını da commit'e dahil et**.
8. Commit + `git push`. Push reddedilirse: `git pull --rebase` sonra tekrar push. `manifest.js`'te çakışma çıkarsa iki tarafın satırlarını da koru.

## Soru Formatı

```js
window.KPSS_BANK = window.KPSS_BANK || {};
(window.KPSS_BANK["turkce"] = window.KPSS_BANK["turkce"] || []).push(
{ id: "tur-ali-001", konu: "Paragraf", soru: "Soru metni?", secenekler: ["A", "B", "C", "D", "E"], dogru: 2, aciklama: "Gerekçe + kritik çeldirici neden yanlış." },
{ id: "tur-ali-002", konu: "Dil Bilgisi", soru: "...", secenekler: ["...", "...", "...", "...", "..."], dogru: 0, aciklama: "..." }
);
```

- String içindeki çift tırnaklar `\"` ile kaçırılır; her soru tek satırda yazılır; görsel/şekil gerektiren soru eklenmez (her şey metinle ifade edilmeli).

## Ders Anahtarları, id Önekleri ve Geçerli Konu Adları

| Ders anahtarı | id öneki | Geçerli `konu` adları |
|---|---|---|
| `turkce` | `tur` | Paragraf, Cümlede Anlam, Sözcükte Anlam, Dil Bilgisi, Yazım Kuralları, Noktalama, Anlatım Bozukluğu, Sözel Mantık |
| `matematik` | `mat` | Temel Kavramlar ve Sayılar, Denklem ve Oran-Orantı, Problemler, Küme-Fonksiyon-İşlem, Permütasyon-Kombinasyon-Olasılık, Sayısal Mantık, Geometri |
| `tarih` | `tar` | İslamiyet Öncesi Türk Tarihi, İlk Türk-İslam Devletleri, Osmanlı Kuruluş ve Yükselme, Osmanlı Kültür ve Medeniyeti, Osmanlı Dağılma ve Islahatlar, Millî Mücadele Hazırlık Dönemi, Kurtuluş Savaşı, Atatürk İlke ve İnkılapları, Atatürk Dönemi İç ve Dış Politika, Çağdaş Türk ve Dünya Tarihi |
| `cografya` | `cog` | Coğrafi Konum, İklim ve Bitki Örtüsü, Yer Şekilleri, Nüfus ve Yerleşme, Tarım ve Hayvancılık, Madenler, Enerji ve Sanayi, Ulaşım, Ticaret ve Turizm, Bölgeler ve Projeler |
| `vatandaslik` | `vat` | Hukukun Temel Kavramları, Anayasa ve Genel Esaslar, Temel Hak ve Ödevler, Yasama, Yürütme, Yargı ve İdare |
| `guncel` | `gun` | Uluslararası Gündem, Türkiye Gündemi, Bilim ve Teknoloji, Spor, Kültür-Sanat, Ödüller |

## Kalite Standartları (sınav başarısı buna bağlı)

- **Faktüel doğruluk kritik:** Emin olunmayan bilgi soruya çevrilmez. Tarih/coğrafya bilgileri kesin doğru olmalı; şüphede web'den doğrula.
- **Vatandaşlık:** Yalnızca 2017 anayasa değişikliği SONRASI sistem (600 milletvekili, Cumhurbaşkanlığı Hükûmet Sistemi, CB kararnamesi, %7 baraj, HSK 13 üye, AYM 15 üye).
- **Matematik:** Her soruyu yazdıktan sonra baştan çöz; cevabın şıklarda tam bir kez geçtiğini ve `dogru` indeksinin onu gösterdiğini doğrula. Açıklamalar adım adım öğretici yazılır.
- **Güncel Bilgiler:** Yalnızca web'den doğrulanmış, son ~18 ayın olayları.
- ÖSYM üslubu; doğru cevabın şık konumu dengeli dağıtılır (her şıkka ~%20).
- **ÇELDİRİCİLER GERÇEKTEN YARIŞMALI (kritik kalite kuralı):** Her yanlış şık, sığ bilgili bir adayı gerçekten yanıltabilecek makullükte olmalı. YASAK "hediye" kalıbı: doğru cevap tek başına bariz bir kategoride, diğer 4 şık apaçık başka tek bir kategoride olmasın — çünkü aday doğruyu okumadan, elemeyle bulur (ölçme değeri sıfır). Örnek YANLIŞ soru: "Hangisi zıt anlamlıdır?" için 1 zıt çift + 4 eş anlamlı çift (ileri-geri | ev-konut | sözcük-kelime | yıl-sene | armağan-hediye) → cevap göze batar. DOĞRUSU: şıkların hepsi aynı görünümde olmalı (ör. hepsi yakın anlamlı ya da hepsi karışık) ki aday gerçekten düşünsün. Aynı ilke Noktalama/Yazım'da da geçerli: "sev-gi" gibi aşırı bariz örnek verme; kural birden çok şıkta makul görünüp yalnızca birinde doğru uygulanmalı. Kolay soru bile bu kurala uyar — kolaylık, çeldiriciyi zayıflatarak değil, bilgiyi tanıdık tutarak sağlanır.
- **Zorluk: gerçek KPSS çıkmış soru seviyesi.** Karışım ~%20 kolay, %55 orta, %25 zor. Ne aşırı kolay ne aşırı zor — ölçüt, ÖSYM'nin çıkmış sorularında ortalama bir adayın zorlanma düzeyidir. Zor sorularda bile müfredat dışına çıkma veya belirsiz/tartışmalı soru yazma — tek savunulabilir doğru cevap kuralı her zorlukta geçerli.
- Açıklama: doğru cevabın gerekçesi + en güçlü çeldiricinin neden yanlış olduğu (3-5 cümle).
- **Açıklamada kavram öğretimi (zorunlu):** Soru bir kavramı/terimi test ediyorsa açıklama o kavramın 1 cümlelik TANIMINI da içermeli (ör. "Dönüşlü çatı, öznenin yaptığı işten yine kendisinin etkilendiği çatıdır: yıkandı, tarandı."). Kullanıcı kavramı hiç bilmiyorsa bile yanlışını incelerken açıklamadan öğrenebilmeli.

## Sık Yapılan Hatalar

- `dogru` alanına harf yazmak → SAYI olmalı (0=A … 4=E)
- Son sorudan sonra virgül bırakmak → sözdizimi hatası, dosya hiç yüklenmez
- Dosyayı yazıp `manifest.js`'e eklememek → program soruyu görmez
- `node dogrula.js` çalıştırmadan push etmek → bozuk dosya herkese gider
