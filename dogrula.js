// Soru bankası doğrulama aracı.
// Kullanım: proje klasöründe  node dogrula.js
// Kontroller: sözdizimi, şema, id çakışması, manifest eksiği, KOPYA/BENZER soru tespiti.
"use strict";

var fs = require("fs");
var path = require("path");

global.window = {};
var dir = path.join(__dirname, "sorular");
var hata = 0, uyari = 0;

function sorun(mesaj) { console.log("  ❌ " + mesaj); hata++; }
function dikkat(mesaj) { console.log("  ⚠️  " + mesaj); uyari++; }

// 1) Manifest'i yükle
try {
  require(path.join(dir, "manifest.js"));
} catch (e) {
  console.log("❌ manifest.js yüklenemedi: " + e.message);
  process.exit(1);
}
var manifest = window.KPSS_MANIFEST || [];
console.log("Manifest'te " + manifest.length + " dosya kayıtlı.\n");

// 2) Manifest'teki her dosyayı yükle
manifest.forEach(function (f) {
  var p = path.join(dir, f);
  if (!fs.existsSync(p)) { sorun("Manifest'te var ama dosya yok: " + f); return; }
  try { require(p); } catch (e) { sorun(f + " yüklenemedi (sözdizimi hatası olabilir): " + e.message); }
});

// 3) Klasörde olup manifest'te unutulmuş dosya var mı?
fs.readdirSync(dir).forEach(function (f) {
  if (f.slice(-3) === ".js" && f !== "manifest.js" && manifest.indexOf(f) === -1) {
    dikkat(f + " klasörde var ama manifest.js listesine eklenmemiş (program bu dosyayı görmez).");
  }
});

// 4) Şema ve id kontrolü
var ids = {};
var toplam = 0;
var dersler = Object.keys(window.KPSS_BANK || {});
if (dersler.length === 0) { sorun("Hiç soru yüklenemedi."); }

dersler.forEach(function (d) {
  var a = window.KPSS_BANK[d];
  toplam += a.length;
  a.forEach(function (q, i) {
    var kimlik = d + "[" + i + "]" + (q && q.id ? " (" + q.id + ")" : "");
    if (!q || typeof q !== "object") { sorun(kimlik + ": kayıt nesne değil"); return; }
    if (!q.id || typeof q.id !== "string") sorun(kimlik + ": id eksik");
    else if (ids[q.id]) sorun(q.id + ": id TEKRAR ediyor (" + ids[q.id] + " ile çakışıyor)");
    else ids[q.id] = d;
    if (!q.konu) sorun(kimlik + ": konu eksik");
    if (!q.soru) sorun(kimlik + ": soru metni eksik");
    if (!Array.isArray(q.secenekler) || q.secenekler.length !== 5) sorun(kimlik + ": tam 5 şık olmalı");
    else if (q.secenekler.some(function (s) { return !s; })) sorun(kimlik + ": boş şık var");
    if (typeof q.dogru !== "number" || q.dogru < 0 || q.dogru > 4) sorun(kimlik + ": dogru 0-4 arası sayı olmalı (0=A ... 4=E)");
    if (!q.aciklama) sorun(kimlik + ": aciklama eksik");
  });
  console.log("  📚 " + d + ": " + a.length + " soru");
});

// 5) Kopya / benzer soru tespiti (ders içinde)
console.log("\nKopya kontrolü yapılıyor…");
function normallestir(s) {
  return String(s).toLowerCase()
    .replace(/[^a-zçğıöşü0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function kelimeSeti(s) {
  var set = {};
  var say = 0;
  normallestir(s).split(" ").forEach(function (w) {
    // 2 harften uzun kelimeler + tüm sayılar (matematik soruları sayılarıyla ayrışır)
    if ((w.length > 2 || /[0-9]/.test(w)) && !set[w]) { set[w] = true; say++; }
  });
  return { set: set, boyut: say };
}
function benzerlik(a, b) {
  var ortak = 0;
  for (var w in a.set) if (b.set[w]) ortak++;
  var birlesim = a.boyut + b.boyut - ortak;
  return birlesim === 0 ? 0 : ortak / birlesim;
}

var kopyaBulundu = false;
dersler.forEach(function (d) {
  var a = window.KPSS_BANK[d];
  var kayitlar = a.map(function (q) {
    var tamMetin = (q.soru || "") + " " + (Array.isArray(q.secenekler) ? q.secenekler.join(" ") : "");
    return {
      id: q.id,
      norm: normallestir(tamMetin), // soru kökü aynı olabilir; kopya kararı şıklar dahil verilir
      set: kelimeSeti(tamMetin)
    };
  });
  for (var i = 0; i < kayitlar.length; i++) {
    for (var j = i + 1; j < kayitlar.length; j++) {
      var A = kayitlar[i], B = kayitlar[j];
      if (A.norm && A.norm === B.norm) {
        sorun("KOPYA soru: " + A.id + " ile " + B.id + " birebir aynı içeriğe sahip (soru + şıklar).");
        kopyaBulundu = true;
      } else if (A.set.boyut >= 6 && B.set.boyut >= 6 && benzerlik(A.set, B.set) >= 0.85) {
        dikkat("Çok benzer sorular: " + A.id + " ile " + B.id + " (%" + Math.round(benzerlik(A.set, B.set) * 100) + " kelime örtüşmesi) — birini yeniden yazmayı düşünün.");
        kopyaBulundu = true;
      }
    }
  }
});
if (!kopyaBulundu) console.log("  ✅ Kopya veya aşırı benzer soru bulunamadı.");

console.log("");
if (hata > 0) {
  console.log("❌ " + hata + " hata" + (uyari > 0 ? ", " + uyari + " uyarı" : "") + " bulundu. Düzeltmeden push etmeyin!");
  process.exit(1);
} else if (uyari > 0) {
  console.log("⚠️  Hata yok ama " + uyari + " uyarı var — TOPLAM " + toplam + " soru yüklendi. Uyarıları gözden geçirin.");
} else {
  console.log("🎉 TOPLAM " + toplam + " soru — her şey geçerli, gönderebilirsiniz!");
}
