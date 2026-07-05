"use strict";

var App = (function () {

  // ================= Sabitler =================
  var DERSLER = {
    turkce:      { ad: "Türkçe",          soru: 30, ikon: "📖" },
    matematik:   { ad: "Matematik",       soru: 30, ikon: "🔢" },
    tarih:       { ad: "Tarih",           soru: 27, ikon: "🏛️" },
    cografya:    { ad: "Coğrafya",        soru: 18, ikon: "🌍" },
    vatandaslik: { ad: "Vatandaşlık",     soru: 9,  ikon: "⚖️" },
    guncel:      { ad: "Güncel Bilgiler", soru: 6,  ikon: "📰" }
  };
  var DENEME_SIRA = ["turkce", "matematik", "tarih", "cografya", "vatandaslik", "guncel"];
  var DENEME_SURE = 130 * 60; // saniye
  var HARFLER = ["A", "B", "C", "D", "E"];
  var VARSAYILAN_SINAV_TARIHI = "2026-09-12";
  var VARSAYILAN_HEDEF = 120;
  var ZAYIF_ESIK = 0.65;   // bu oranın altındaki konular zayıf sayılır
  var ZAYIF_MIN_SORU = 4;  // bir konuda en az bu kadar soru çözülmüş olmalı
  // ================= Depolama =================
  var Store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem("kpss_" + k);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) { localStorage.setItem("kpss_" + k, JSON.stringify(v)); }
  };

  // ================= Yardımcılar =================
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function fmtSure(sn) {
    sn = Math.max(0, sn);
    var h = Math.floor(sn / 3600), m = Math.floor((sn % 3600) / 60), s = sn % 60;
    return h > 0 ? h + ":" + pad2(m) + ":" + pad2(s) : pad2(m) + ":" + pad2(s);
  }
  function fmtTarih(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  function tarihKey(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function bank(ders) {
    return (window.KPSS_BANK && window.KPSS_BANK[ders]) || [];
  }
  function render(html) {
    $("#app").innerHTML = html;
    window.scrollTo(0, 0);
  }

  // ================= Durum =================
  var S = null;          // aktif sınav / sonuç durumu
  var ekran = "home";
  var statFiltre = "hepsi";

  // ================= Soru seçimi (pekiştirme destekli) =================
  function sorulariSec(ders, adet) {
    var b = bank(ders);
    var seenObj = Store.get("seen", {});
    var seen = {};
    (seenObj[ders] || []).forEach(function (id) { seen[id] = true; });

    var wrongObj = Store.get("wrong", {});
    var wrongIds = wrongObj[ders] || [];
    var meta = Store.get("yanlisMeta", {});
    var pekKonuObj = Store.get("pekKonu", {});
    var pk = pekKonuObj[ders] || {};

    var idMap = {};
    b.forEach(function (q) { idMap[q.id] = q; });

    var secilen = {};
    var pekSorular = [];
    var simdi = Date.now();

    // 1) Tekrar zamanı gelen eski yanlışlar (~20 saatten eski) teste serpiştirilir
    var tekrarAdaylari = wrongIds.filter(function (id) {
      var m = meta[id];
      return idMap[id] && (!m || simdi - m.ts >= 20 * 3600 * 1000);
    });
    var tekrarKota = Math.min(3, Math.max(1, Math.round(adet * 0.12)));
    shuffle(tekrarAdaylari).slice(0, tekrarKota).forEach(function (id) {
      pekSorular.push(Object.assign({}, idMap[id], { ders: ders, tekrarSoru: true }));
      secilen[id] = true;
    });

    // 2) Yanlış yapılan konulardan pekiştirme soruları (görülmemişlerden)
    if (Object.keys(pk).length > 0) {
      var havuz = shuffle(b.filter(function (q) {
        return !seen[q.id] && !secilen[q.id] && pk[q.konu] > 0;
      }));
      var ust = Math.max(2, Math.round(adet * 0.25));
      for (var i = 0; i < havuz.length && pekSorular.length < ust; i++) {
        var pq = havuz[i];
        pekSorular.push(Object.assign({}, pq, { ders: ders }));
        secilen[pq.id] = true;
        pk[pq.konu]--;
      }
      pekKonuObj[ders] = pk;
      Store.set("pekKonu", pekKonuObj);
    }

    // 3) Kalan yerler: önce hiç görülmemişler, yetmezse eskiler
    var kalanAdet = Math.max(0, adet - pekSorular.length);
    var gorulmemis = shuffle(b.filter(function (q) { return !seen[q.id] && !secilen[q.id]; }));
    var secim = gorulmemis.slice(0, kalanAdet);
    var tekrar = false;
    if (secim.length < kalanAdet) {
      var eskiler = shuffle(b.filter(function (q) { return seen[q.id] && !secilen[q.id]; }))
        .slice(0, kalanAdet - secim.length);
      if (eskiler.length > 0) tekrar = true;
      secim = secim.concat(eskiler);
    }
    var sorular = shuffle(pekSorular.concat(secim.map(function (q) {
      return Object.assign({}, q, { ders: ders });
    })));
    return { sorular: sorular, tekrar: tekrar };
  }

  // ================= Zayıf konu analizi =================
  function zayifKonular() {
    var ki = Store.get("konuIst", {});
    var liste = [];
    for (var dl in ki) {
      for (var k in ki[dl]) {
        var x = ki[dl][k];
        var top = x.d + x.y + x.b;
        if (top >= ZAYIF_MIN_SORU && x.d / top < ZAYIF_ESIK) {
          liste.push({ ders: dl, konu: k, oran: x.d / top, top: top });
        }
      }
    }
    liste.sort(function (a, b) { return a.oran - b.oran; });
    return liste;
  }

  // ================= Sınav kurulumu =================
  function sinavKur(mod, sorular, dersKey, tekrar) {
    S = {
      mod: mod,
      ders: dersKey || null,
      sorular: sorular,
      cevaplar: new Array(sorular.length).fill(null),
      isaret: new Array(sorular.length).fill(false),
      sureler: new Array(sorular.length).fill(0),
      idx: 0,
      gecen: 0,
      auto: Store.get("settings", {}).otoIlerle !== false,
      tekrar: !!tekrar,
      timerId: null,
      sonuc: null,
      filtre: "hepsi"
    };
    ekran = "exam";
    renderExam();
    S.timerId = setInterval(tik, 1000);
  }

  function tik() {
    if (!S || ekran !== "exam") return;
    S.gecen++;
    S.sureler[S.idx]++;
    var el = $("#timer");
    if (el) {
      if (S.mod === "deneme") {
        var kalan = DENEME_SURE - S.gecen;
        el.textContent = "⏳ " + fmtSure(kalan);
        if (kalan <= 600) el.classList.add("kritik");
      } else {
        el.textContent = "🕐 " + fmtSure(S.gecen);
      }
    }
    if (S.mod === "deneme" && S.gecen >= DENEME_SURE) {
      alert("Süre doldu! Sınavın otomatik olarak bitiriliyor.");
      bitir(true);
    }
  }

  function dersTestiBaslat(ders) {
    var sec = sorulariSec(ders, DERSLER[ders].soru);
    if (sec.sorular.length === 0) {
      alert("Bu dersin soru bankası henüz hazır değil.");
      return;
    }
    sinavKur("ders", sec.sorular, ders, sec.tekrar);
  }

  function denemeBaslat() {
    var tum = [], tekrar = false, eksik = [];
    DENEME_SIRA.forEach(function (d) {
      var sec = sorulariSec(d, DERSLER[d].soru);
      if (sec.sorular.length < DERSLER[d].soru) eksik.push(DERSLER[d].ad);
      if (sec.tekrar) tekrar = true;
      tum = tum.concat(sec.sorular);
    });
    if (tum.length === 0) { alert("Soru bankaları henüz hazır değil."); return; }
    if (eksik.length > 0 &&
        !confirm("Şu derslerin bankasında tam sayıda soru yok: " + eksik.join(", ") +
                 ".\nDeneme eksik soruyla başlatılsın mı?")) return;
    sinavKur("deneme", tum, null, tekrar);
  }

  function yanlisBaslat(dersKey) {
    var wrong = Store.get("wrong", {});
    var harita = {};
    for (var d in DERSLER) {
      bank(d).forEach(function (q) { harita[q.id] = Object.assign({}, q, { ders: d }); });
    }
    var idler = [];
    if (dersKey === "hepsi") {
      for (var w in wrong) idler = idler.concat(wrong[w]);
    } else {
      idler = (wrong[dersKey] || []).slice();
    }
    var sorular = shuffle(idler.map(function (id) { return harita[id]; })
      .filter(function (q) { return !!q; })).slice(0, 30);
    if (sorular.length === 0) { alert("Yanlış defterinde soru yok. Harika!"); return; }
    sinavKur("yanlis", sorular, dersKey, false);
  }

  function zayifBaslat() {
    var zk = zayifKonular();
    if (zk.length === 0) {
      alert("Henüz zayıf konu tespit edilmedi. Birkaç test çözdükçe analiz oluşur.");
      return;
    }
    var set = {};
    zk.forEach(function (z) { set[z.ders + "|" + z.konu] = true; });
    var seenObj = Store.get("seen", {});
    var yeni = [], eski = [];
    for (var dl in DERSLER) {
      var seen = {};
      (seenObj[dl] || []).forEach(function (id) { seen[id] = true; });
      bank(dl).forEach(function (q) {
        if (set[dl + "|" + q.konu]) {
          (seen[q.id] ? eski : yeni).push(Object.assign({}, q, { ders: dl }));
        }
      });
    }
    var sorular = shuffle(yeni).slice(0, 20);
    if (sorular.length < 20) sorular = sorular.concat(shuffle(eski).slice(0, 20 - sorular.length));
    if (sorular.length === 0) { alert("Zayıf konularına ait soru bulunamadı."); return; }
    sinavKur("zayif", shuffle(sorular), null, false);
  }

  // ================= Sınav akışı =================
  function secim(i) {
    if (!S || ekran !== "exam") return;
    var onceki = S.cevaplar[S.idx];
    S.cevaplar[S.idx] = (onceki === i) ? null : i;
    renderExam();
    if (S.cevaplar[S.idx] !== null && S.auto && S.idx < S.sorular.length - 1) {
      setTimeout(function () {
        if (S && ekran === "exam") { S.idx++; renderExam(); }
      }, 230);
    }
  }

  function git(delta) {
    if (!S || ekran !== "exam") return;
    var yeni = S.idx + delta;
    if (yeni < 0 || yeni >= S.sorular.length) return;
    S.idx = yeni;
    renderExam();
  }

  function gitNo(i) {
    if (!S || ekran !== "exam") return;
    S.idx = i;
    renderExam();
  }

  function isaretle() {
    if (!S || ekran !== "exam") return;
    S.isaret[S.idx] = !S.isaret[S.idx];
    renderExam();
  }

  function otoDegis(cb) {
    if (!S) return;
    S.auto = cb.checked;
    var ayar = Store.get("settings", {});
    ayar.otoIlerle = cb.checked;
    Store.set("settings", ayar);
  }

  function iptal() {
    if (!confirm("Sınavdan çıkılsın mı? Bu test kaydedilmeyecek.")) return;
    clearInterval(S.timerId);
    S = null;
    anaSayfa();
  }

  function bitir(otomatik) {
    if (!S || ekran !== "exam") return;
    if (!otomatik) {
      var bosSayi = S.cevaplar.filter(function (c) { return c === null; }).length;
      var isaretliSayi = S.isaret.filter(Boolean).length;
      var msg = (bosSayi > 0 ? bosSayi + " soru boş bırakıldı. " : "") +
                (isaretliSayi > 0 ? "⚑ " + isaretliSayi + " işaretli sorun var. " : "") +
                "Sınav bitirilsin mi?";
      if (!confirm(msg)) return;
    }
    clearInterval(S.timerId);

    var detay = S.sorular.map(function (q, i) {
      var c = S.cevaplar[i];
      var durum = c === null ? "bos" : (c === q.dogru ? "dogru" : "yanlis");
      return { q: q, cevap: c, durum: durum, isaret: S.isaret[i], sure: S.sureler[i] };
    });
    var d = 0, y = 0, b = 0;
    detay.forEach(function (x) {
      if (x.durum === "dogru") d++;
      else if (x.durum === "yanlis") y++;
      else b++;
    });
    var net = d - y / 4;
    var sure = S.gecen;

    // görülen ve yanlış defteri güncelle
    var seen = Store.get("seen", {});
    var wrong = Store.get("wrong", {});
    var defterdenCikan = 0;
    var duzeltilen = {};
    detay.forEach(function (x) {
      if (x.cevap === null) return; // boş bırakılan soru "görülmüş" sayılmaz, ileride tekrar gelebilir
      var dl = x.q.ders;
      seen[dl] = seen[dl] || [];
      if (seen[dl].indexOf(x.q.id) === -1) seen[dl].push(x.q.id);
      wrong[dl] = wrong[dl] || [];
      var wi = wrong[dl].indexOf(x.q.id);
      if (x.durum === "yanlis") {
        if (wi === -1) wrong[dl].push(x.q.id);
      } else if (x.durum === "dogru" && wi !== -1) {
        wrong[dl].splice(wi, 1);
        defterdenCikan++;
        duzeltilen[x.q.id] = true;
      }
    });
    Store.set("seen", seen);
    Store.set("wrong", wrong);

    // pekiştirme takibi: yanlış → aynı konudan 2 soru planla + tekrar zamanı kaydet;
    // eski yanlışı düzeltme → tam pekişsin diye aynı konudan 2 soru daha planla
    var yMeta = Store.get("yanlisMeta", {});
    var pekKonuObj = Store.get("pekKonu", {});
    detay.forEach(function (x) {
      if (x.cevap === null) return;
      var dl = x.q.ders;
      pekKonuObj[dl] = pekKonuObj[dl] || {};
      if (x.durum === "yanlis") {
        yMeta[x.q.id] = { ts: Date.now(), sayi: ((yMeta[x.q.id] || {}).sayi || 0) + 1 };
        pekKonuObj[dl][x.q.konu] = Math.min(6, (pekKonuObj[dl][x.q.konu] || 0) + 2);
      } else if (duzeltilen[x.q.id]) {
        pekKonuObj[dl][x.q.konu] = Math.min(6, (pekKonuObj[dl][x.q.konu] || 0) + 2);
      }
    });
    Store.set("yanlisMeta", yMeta);
    Store.set("pekKonu", pekKonuObj);

    // konu istatistiği (zayıf konu analizi için, tüm modlarda birikir)
    var ki = Store.get("konuIst", {});
    detay.forEach(function (x) {
      if (x.cevap === null) return; // cevaplanmayan soru konu istatistiğini etkilemez
      var dl = x.q.ders;
      ki[dl] = ki[dl] || {};
      ki[dl][x.q.konu] = ki[dl][x.q.konu] || { d: 0, y: 0, b: 0 };
      ki[dl][x.q.konu][x.durum === "dogru" ? "d" : "y"]++;
    });
    Store.set("konuIst", ki);

    // günlük çözülen soru sayacı (tüm modlar) — yalnızca CEVAPLANAN sorular sayılır
    var gunluk = Store.get("gunluk", {});
    var bugun = tarihKey(new Date());
    gunluk[bugun] = (gunluk[bugun] || 0) + d + y;
    Store.set("gunluk", gunluk);

    // konu dökümü (bu sınav için)
    var konular = {};
    detay.forEach(function (x) {
      var key = (S.mod === "deneme" || S.mod === "zayif" ? DERSLER[x.q.ders].ad + " • " : "") + x.q.konu;
      konular[key] = konular[key] || { d: 0, y: 0, b: 0 };
      konular[key][x.durum === "dogru" ? "d" : x.durum === "yanlis" ? "y" : "b"]++;
    });

    // deneme için ders dökümü
    var dersDok = null;
    if (S.mod === "deneme") {
      dersDok = {};
      detay.forEach(function (x) {
        var dl = x.q.ders;
        dersDok[dl] = dersDok[dl] || { d: 0, y: 0, b: 0, sure: 0 };
        dersDok[dl][x.durum === "dogru" ? "d" : x.durum === "yanlis" ? "y" : "b"]++;
        dersDok[dl].sure += x.sure;
      });
    }

    // geçmişe kaydet (yanlış defteri turları hariç)
    if (S.mod !== "yanlis") {
      var gecmis = Store.get("history", []);
      gecmis.push({
        ts: Date.now(), mod: S.mod, ders: S.ders,
        toplam: detay.length, d: d, y: y, b: b,
        net: Math.round(net * 100) / 100, sure: sure,
        ortSure: Math.round(sure / detay.length),
        dersDok: dersDok
      });
      Store.set("history", gecmis);
    }

    S.sonuc = {
      detay: detay, d: d, y: y, b: b, net: net, sure: sure,
      konular: konular, dersDok: dersDok, defterdenCikan: defterdenCikan
    };
    S.filtre = y > 0 ? "yanlis" : "hepsi";
    ekran = "result";
    sunucuyaKaydet();
    renderSonuc();
  }

  // ================= Ekran: Sınav =================
  function modBaslik() {
    var q = S.sorular[S.idx];
    if (S.mod === "deneme") return "🎯 Tam Deneme — " + DERSLER[q.ders].ad;
    if (S.mod === "yanlis") return "📕 Yanlış Defteri" + (S.ders !== "hepsi" ? " — " + DERSLER[S.ders].ad : "");
    if (S.mod === "zayif") return "🧩 Zayıf Konular Testi — " + DERSLER[q.ders].ad;
    return DERSLER[S.ders].ikon + " " + DERSLER[S.ders].ad + " Testi";
  }

  function renderExam() {
    var q = S.sorular[S.idx];
    var n = S.sorular.length;
    var cevapli = S.cevaplar.filter(function (c) { return c !== null; }).length;

    var timerText = S.mod === "deneme"
      ? "⏳ " + fmtSure(DENEME_SURE - S.gecen)
      : "🕐 " + fmtSure(S.gecen);

    var siklar = q.secenekler.map(function (s, i) {
      var cls = "opt" + (S.cevaplar[S.idx] === i ? " secili" : "");
      return '<div class="' + cls + '" onclick="App.secim(' + i + ')">' +
        '<span class="harf">' + HARFLER[i] + '</span>' +
        '<span class="metin">' + esc(s) + '</span></div>';
    }).join("");

    var harita = S.sorular.map(function (_, i) {
      var cls = (S.cevaplar[i] !== null ? "cevapli" : "") +
                (i === S.idx ? " aktif" : "") +
                (S.isaret[i] ? " isaretli" : "");
      return '<button class="' + cls + '" onclick="App.gitNo(' + i + ')">' + (i + 1) + '</button>';
    }).join("");

    render(
      '<div class="exam-ust">' +
        '<div class="baslik">' + modBaslik() + '</div>' +
        '<div class="timer' + (S.mod === "deneme" && DENEME_SURE - S.gecen <= 600 ? " kritik" : "") + '" id="timer">' + timerText + '</div>' +
        '<label><input type="checkbox" ' + (S.auto ? "checked" : "") + ' onchange="App.otoDegis(this)"> Otomatik ilerle</label>' +
        '<button class="btn tehlike kucuk" onclick="App.iptal()">Çıkış</button>' +
      '</div>' +
      '<div class="progress"><div style="width:' + Math.round(cevapli / n * 100) + '%"></div></div>' +
      '<div class="soru-kart">' +
        '<div class="soru-ust">' +
          '<span class="soru-no">Soru ' + (S.idx + 1) + ' / ' + n + '</span>' +
          '<span class="chip">' + esc(q.konu) + '</span>' +
          (q.tekrarSoru ? '<span class="chip tekrar-chip">🔁 Tekrar</span>' : '') +
          '<span style="flex:1"></span>' +
          '<button class="btn kucuk ' + (S.isaret[S.idx] ? "isaret-aktif" : "ikincil") + '" onclick="App.isaretle()">⚑ ' + (S.isaret[S.idx] ? "İşaretli" : "İşaretle") + '</button>' +
        '</div>' +
        '<div class="soru-metin">' + esc(q.soru) + '</div>' +
        siklar +
      '</div>' +
      '<div class="exam-alt">' +
        '<button class="btn ikincil" onclick="App.git(-1)" ' + (S.idx === 0 ? "disabled" : "") + '>← Önceki</button>' +
        '<button class="btn ikincil" onclick="App.git(1)" ' + (S.idx === n - 1 ? "disabled" : "") + '>Sonraki →</button>' +
        '<div class="bosluk"></div>' +
        '<button class="btn" onclick="App.bitir(false)">Sınavı Bitir ✓</button>' +
      '</div>' +
      '<div class="harita">' + harita + '</div>'
    );
  }

  // ================= Ekran: Sonuç =================
  function renderSonuc() {
    var r = S.sonuc;
    var n = r.detay.length;
    var yuzde = n > 0 ? Math.round(r.net / n * 100) : 0;
    var isaretliSayi = r.detay.filter(function (x) { return x.isaret; }).length;

    var baslik;
    if (S.mod === "deneme") baslik = "🎯 Tam Deneme Sonucu";
    else if (S.mod === "yanlis") baslik = "📕 Yanlış Defteri Sonucu";
    else if (S.mod === "zayif") baslik = "🧩 Zayıf Konular Test Sonucu";
    else baslik = DERSLER[S.ders].ikon + " " + DERSLER[S.ders].ad + " Test Sonucu";

    var html = '<div class="geri-satir">' +
      '<button class="btn ikincil" onclick="App.anaSayfa()">← Ana Sayfa</button>' +
      (S.mod === "ders" ? '<button class="btn" onclick="App.dersTestiBaslat(\'' + S.ders + '\')">Aynı Dersten Yeni Test</button>' : '') +
      (S.mod === "yanlis" ? '<button class="btn" onclick="App.yanlisBaslat(\'' + S.ders + '\')">Deftere Devam Et</button>' : '') +
      (S.mod === "zayif" ? '<button class="btn" onclick="App.zayifBaslat()">Zayıf Konulardan Yeni Test</button>' : '') +
      '<button class="btn ikincil" onclick="App.sonucKopyala()">📋 Sonucu Kopyala</button>' +
      '</div>' +
      '<h1>' + baslik + '</h1>';

    if (S.tekrar) {
      html += '<div class="uyari-not">ℹ️ Bankadaki hiç görülmemiş soru azaldığı için bu teste daha önce çözdüğün bazı sorular da eklendi. Bana "soru ekle" dersen bankayı büyütürüm.</div>';
    }
    if (S.mod === "yanlis" && r.defterdenCikan > 0) {
      html += '<div class="bilgi-not">🎉 ' + r.defterdenCikan + ' soruyu doğru çözdün, yanlış defterinden çıkarıldı.</div>';
    }

    html += '<div class="ozet-grid">' +
      '<div class="ozet-kart"><div class="deger yesil">' + r.d + '</div><div class="etiket">Doğru</div></div>' +
      '<div class="ozet-kart"><div class="deger kirmizi">' + r.y + '</div><div class="etiket">Yanlış</div></div>' +
      '<div class="ozet-kart"><div class="deger sari">' + r.b + '</div><div class="etiket">Boş</div></div>' +
      '<div class="ozet-kart"><div class="deger mor">' + (Math.round(r.net * 100) / 100) + '</div><div class="etiket">Net (%' + yuzde + ')</div></div>' +
      '<div class="ozet-kart"><div class="deger">' + fmtSure(r.sure) + '</div><div class="etiket">Süre</div></div>' +
      '<div class="ozet-kart"><div class="deger">' + Math.round(r.sure / n) + '</div><div class="etiket">sn / soru</div></div>' +
    '</div>';

    // deneme: ders dökümü
    if (r.dersDok) {
      html += '<h2>Ders Bazlı Sonuçlar</h2><table class="tablo"><tr><th>Ders</th><th class="sag">Doğru</th><th class="sag">Yanlış</th><th class="sag">Boş</th><th class="sag">Net</th><th class="sag">Ort. sn/soru</th></tr>';
      DENEME_SIRA.forEach(function (dl) {
        var x = r.dersDok[dl];
        if (!x) return;
        var adet = x.d + x.y + x.b;
        var dnet = Math.round((x.d - x.y / 4) * 100) / 100;
        html += '<tr><td>' + DERSLER[dl].ikon + ' ' + DERSLER[dl].ad + '</td>' +
          '<td class="sag">' + x.d + '</td><td class="sag">' + x.y + '</td>' +
          '<td class="sag">' + x.b + '</td><td class="sag"><b>' + dnet + '</b></td>' +
          '<td class="sag">' + (adet > 0 ? Math.round(x.sure / adet) : "-") + '</td></tr>';
      });
      html += '</table>';
    }

    // konu dökümü
    var konuAdlari = Object.keys(r.konular);
    if (konuAdlari.length > 1) {
      konuAdlari.sort(function (a, b2) {
        return (r.konular[b2].y + r.konular[b2].b) - (r.konular[a].y + r.konular[a].b);
      });
      html += '<h2>Konu Analizi</h2><table class="tablo"><tr><th>Konu</th><th class="sag">Doğru</th><th class="sag">Yanlış</th><th class="sag">Boş</th><th class="sag">Başarı</th></tr>';
      konuAdlari.forEach(function (k) {
        var x = r.konular[k];
        var top = x.d + x.y + x.b;
        var oran = top > 0 ? Math.round(x.d / top * 100) : 0;
        html += '<tr><td>' + esc(k) + '</td><td class="sag">' + x.d + '</td>' +
          '<td class="sag">' + x.y + '</td><td class="sag">' + x.b + '</td>' +
          '<td class="sag">%' + oran + '</td></tr>';
      });
      html += '</table>';
    }

    // soru incelemesi
    var filtreler = ['hepsi|Hepsi (' + n + ')', 'yanlis|Yanlışlar (' + r.y + ')', 'bos|Boşlar (' + r.b + ')', 'dogru|Doğrular (' + r.d + ')'];
    if (isaretliSayi > 0) filtreler.push('isaret|⚑ İşaretliler (' + isaretliSayi + ')');
    html += '<h2>Soru İncelemesi</h2><div class="filtreler">' +
      filtreler.map(function (f) {
        var p = f.split("|");
        return '<button class="btn kucuk ' + (S.filtre === p[0] ? "aktif" : "ikincil") + '" onclick="App.filtrele(\'' + p[0] + '\')">' + p[1] + '</button>';
      }).join("") +
      '</div><div id="inceleme">' + incelemeHTML() + '</div>';

    render(html);
  }

  function incelemeHTML() {
    var r = S.sonuc;
    var liste = r.detay.filter(function (x) {
      if (S.filtre === "hepsi") return true;
      if (S.filtre === "isaret") return x.isaret;
      return x.durum === S.filtre;
    });
    if (liste.length === 0) return '<div class="bos-not">Bu filtrede soru yok.</div>';
    return liste.map(function (x) {
      var i = r.detay.indexOf(x);
      var rozet = x.durum === "dogru"
        ? '<span class="rozet dogru">✓ Doğru</span>'
        : x.durum === "yanlis"
          ? '<span class="rozet yanlis">✗ Yanlış — senin cevabın: ' + HARFLER[x.cevap] + '</span>'
          : '<span class="rozet bos">○ Boş</span>';
      if (x.isaret) rozet += '<span class="rozet isaret">⚑ İşaretli</span>';
      var siklar = x.q.secenekler.map(function (s, j) {
        var cls = "opt pasif";
        if (j === x.q.dogru) cls = "opt dogru-sik";
        else if (j === x.cevap) cls = "opt yanlis-sik";
        return '<div class="' + cls + '"><span class="harf">' + HARFLER[j] + '</span>' +
          '<span class="metin">' + esc(s) + '</span></div>';
      }).join("");
      return '<div class="inceleme">' +
        '<div class="rozetler"><span class="soru-no">Soru ' + (i + 1) + '</span>' +
        (S.mod === "deneme" || S.mod === "zayif" ? '<span class="chip">' + DERSLER[x.q.ders].ad + '</span>' : '') +
        '<span class="chip">' + esc(x.q.konu) + '</span>' +
        '<span class="chip">⏱ ' + x.sure + ' sn</span>' + rozet + '</div>' +
        '<div class="soru-metin">' + esc(x.q.soru) + '</div>' + siklar +
        '<div class="aciklama-kutu"><b>💡 Açıklama:</b> ' + esc(x.q.aciklama) + '</div>' +
        '</div>';
    }).join("");
  }

  function filtrele(f) {
    S.filtre = f;
    renderSonuc();
  }

  function sonucKopyala() {
    var r = S.sonuc;
    var n = r.detay.length;
    var ad = S.mod === "deneme" ? "Tam Deneme"
      : S.mod === "yanlis" ? "Yanlış Defteri Turu"
      : S.mod === "zayif" ? "Zayıf Konular Testi"
      : DERSLER[S.ders].ad + " Testi";
    var txt = "📊 KPSS " + ad + " Sonucum\n" +
      "✅ " + r.d + " doğru  ❌ " + r.y + " yanlış  ⭕ " + r.b + " boş\n" +
      "🎯 Net: " + (Math.round(r.net * 100) / 100) + " / " + n + "\n" +
      "⏱ Süre: " + fmtSure(r.sure);
    if (r.dersDok) {
      txt += "\n— Ders netleri —";
      DENEME_SIRA.forEach(function (dl) {
        var x = r.dersDok[dl];
        if (!x) return;
        txt += "\n" + DERSLER[dl].ad + ": " + (Math.round((x.d - x.y / 4) * 100) / 100);
      });
    }
    txt += "\n💪 KPSS Soru Programı";
    panoyaKopyala(txt, "Sonuç kopyalandı! WhatsApp'a yapıştırabilirsin.");
  }

  function panoyaKopyala(txt, mesaj) {
    function eskiYontem() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); alert(mesaj); }
      catch (e) { alert("Kopyalama başarısız oldu."); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { alert(mesaj); }).catch(eskiYontem);
    } else eskiYontem();
  }

  function pekRaporKopyala() {
    var wrong = Store.get("wrong", {});
    var satirlar = [];
    for (var dl in DERSLER) {
      var idMap = {};
      bank(dl).forEach(function (q) { idMap[q.id] = q; });
      (wrong[dl] || []).forEach(function (id) {
        var q = idMap[id];
        if (q) satirlar.push("- [" + DERSLER[dl].ad + " / " + q.konu + "] " + q.soru.slice(0, 110).replace(/\s+/g, " "));
      });
    }
    if (satirlar.length === 0) { alert("Yanlış defterin boş — rapor oluşturulamadı."); return; }
    var txt = "KPSS soru programında aşağıdaki sorularda yanlış yaptım. Bu soruların test ettiği kavramlarla ilgili, depodaki kurallara (CLAUDE.md) uygun BENZER ama YENİ sorular üretip bankaya ekler misin? Her yanlışım için 2-3 farklı soru olsun ki kavram iyice pekişsin.\n\n" +
      satirlar.join("\n");
    panoyaKopyala(txt, "Rapor kopyalandı! Yapay zekâna (Claude) yapıştırman yeterli — yanlışlarına özel yeni sorular üretecek.");
  }

  // ================= Ekran: Ana sayfa =================
  function seriHesapla(gunluk) {
    var s = 0;
    var d = new Date();
    if (!gunluk[tarihKey(d)]) d.setDate(d.getDate() - 1); // bugün henüz yoksa dünden say
    while (gunluk[tarihKey(d)] > 0) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }

  function haftaVerisi(gunluk) {
    var adlar = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    var simdi = new Date();
    var gunIdx = (simdi.getDay() + 6) % 7; // Pazartesi = 0
    var arr = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - gunIdx + i);
      arr.push({ ad: adlar[i], adet: gunluk[tarihKey(d)] || 0, bugun: i === gunIdx });
    }
    return arr;
  }

  function enUzunSeri(gunluk) {
    var gunler = Object.keys(gunluk).filter(function (k) { return gunluk[k] > 0; }).sort();
    var enUzun = 0, mevcut = 0, onceki = null;
    gunler.forEach(function (k) {
      var ts = new Date(k + "T00:00:00").getTime();
      mevcut = (onceki !== null && ts - onceki === 86400000) ? mevcut + 1 : 1;
      if (mevcut > enUzun) enUzun = mevcut;
      onceki = ts;
    });
    return enUzun;
  }

  function bugunDersIst(gecmis, dl) {
    var bugun = tarihKey(new Date());
    var d = 0, y = 0;
    gecmis.forEach(function (g) {
      if (g.mod === "ders" && g.ders === dl && tarihKey(new Date(g.ts)) === bugun) { d += g.d; y += g.y; }
    });
    var cevap = d + y;
    return { cevap: cevap, dogru: d, pct: cevap > 0 ? Math.round(d / cevap * 100) : null };
  }

  function bugunDogruluk(gecmis) {
    var bugun = tarihKey(new Date());
    var d = 0, y = 0;
    gecmis.forEach(function (g) {
      if (tarihKey(new Date(g.ts)) === bugun) { d += g.d; y += g.y; }
    });
    return (d + y) > 0 ? Math.round(d / (d + y) * 100) : null;
  }

  function trendVerisi(gecmis) {
    return gecmis.slice(-8).map(function (g) {
      var cevap = g.d + g.y;
      return cevap > 0 ? Math.round(g.d / cevap * 100) : 0;
    });
  }

  function ringSVG(pct) {
    var r = 52, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, pct) / 100);
    return '<svg class="ring" viewBox="0 0 130 130">' +
      '<circle cx="65" cy="65" r="52" fill="none" stroke="#e3e9e5" stroke-width="12"/>' +
      '<circle cx="65" cy="65" r="52" fill="none" stroke="#15603d" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 65 65)"/>' +
      '<text x="65" y="63" text-anchor="middle" font-size="27" font-weight="800" fill="#152a20">%' + pct + '</text>' +
      '<text x="65" y="83" text-anchor="middle" font-size="10" letter-spacing="1" fill="#64766d">TAMAM</text>' +
      '</svg>';
  }

  function aktiviteSVG(hafta, hedef) {
    var W = 460, H = 150, P = 26, taban = H - 22, tavan = 18;
    var maks = Math.max(hedef, 1);
    hafta.forEach(function (h) { if (h.adet > maks) maks = h.adet; });
    var bw = (W - 2 * P) / 7;
    var barlar = hafta.map(function (h, i) {
      var x = P + i * bw;
      var yuk = (h.adet / maks) * (taban - tavan);
      var y = taban - yuk;
      var renk = h.bugun ? "#15603d" : "#7cc39a";
      return (h.adet > 0 ? '<text x="' + (x + bw / 2).toFixed(0) + '" y="' + (y - 5).toFixed(0) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#64766d">' + h.adet + '</text>' : '') +
        '<rect x="' + (x + bw * 0.22).toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + (bw * 0.56).toFixed(0) + '" height="' + Math.max(0, yuk).toFixed(0) + '" rx="5" fill="' + renk + '"/>' +
        '<text x="' + (x + bw / 2).toFixed(0) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="11" fill="' + (h.bugun ? "#15603d" : "#64766d") + '" font-weight="' + (h.bugun ? "800" : "400") + '">' + h.ad + '</text>';
    }).join("");
    var hy = taban - (hedef / maks) * (taban - tavan);
    var hedefCizgi = '<line x1="' + P + '" y1="' + hy.toFixed(0) + '" x2="' + (W - P) + '" y2="' + hy.toFixed(0) + '" stroke="#c9a94a" stroke-width="1.5" stroke-dasharray="4 4"/>' +
      '<text x="' + (W - P) + '" y="' + (hy - 5).toFixed(0) + '" text-anchor="end" font-size="10" fill="#b9820f" font-weight="700">HEDEF ' + hedef + '</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + hedefCizgi + barlar + '</svg>';
  }

  function trendSVG(pts) {
    if (pts.length < 2) return '<div class="bos-mini">En az 2 test çözünce trend çizgisi oluşur.</div>';
    var W = 300, H = 80, P = 8;
    var noktalar = pts.map(function (v, i) {
      return { x: P + i * (W - 2 * P) / (pts.length - 1), y: H - P - (v / 100) * (H - 2 * P) };
    });
    var cizgi = noktalar.map(function (p) { return p.x.toFixed(0) + "," + p.y.toFixed(0); }).join(" ");
    var son = noktalar[noktalar.length - 1];
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="trend-svg">' +
      '<polyline fill="none" stroke="#15603d" stroke-width="2.5" points="' + cizgi + '"/>' +
      '<circle cx="' + son.x.toFixed(0) + '" cy="' + son.y.toFixed(0) + '" r="4" fill="#15603d"/>' +
      '</svg>';
  }

  function anaSayfa() {
    S = null;
    ekran = "home";
    var ayar = Store.get("settings", {});
    var sinavTarihi = ayar.sinavTarihi || VARSAYILAN_SINAV_TARIHI;
    var kalanGun = Math.ceil((new Date(sinavTarihi + "T09:00:00") - new Date()) / 86400000);
    var seen = Store.get("seen", {});
    var wrong = Store.get("wrong", {});
    var gecmis = Store.get("history", []);
    var gunluk = Store.get("gunluk", {});

    var toplamYanlis = 0;
    for (var w in wrong) toplamYanlis += wrong[w].length;

    var hedef = ayar.gunlukHedef || VARSAYILAN_HEDEF;
    var bugunCozulen = gunluk[tarihKey(new Date())] || 0;
    var hedefYuzde = Math.min(100, Math.round(bugunCozulen / hedef * 100));
    var kalan = Math.max(0, hedef - bugunCozulen);
    var seri = seriHesapla(gunluk);
    var enUzun = enUzunSeri(gunluk);
    var hafta = haftaVerisi(gunluk);
    var haftaTop = hafta.reduce(function (a, h) { return a + h.adet; }, 0);
    var bugDog = bugunDogruluk(gecmis);
    var zayif = zayifKonular();
    var trend = trendVerisi(gecmis);
    var trendOrt = trend.length ? Math.round(trend.reduce(function (a, b) { return a + b; }, 0) / trend.length) : null;
    var trendDelta = trend.length >= 2 ? trend[trend.length - 1] - trend[0] : 0;
    var sinavTarihMetni = new Date(sinavTarihi + "T09:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

    var dersKartlari = Object.keys(DERSLER).map(function (dl) {
      var D = DERSLER[dl];
      var bankAdet = bank(dl).length;
      var ist = bugunDersIst(gecmis, dl);
      var yapildi = ist.cevap > 0;
      var barPct = Math.min(100, Math.round(ist.cevap / D.soru * 100));
      var detay, durum = "", btn;
      if (bankAdet === 0) {
        detay = "Soru bankası hazırlanıyor…";
        btn = '<button class="dk-btn" disabled>Hazırlanıyor</button>';
      } else if (yapildi) {
        detay = ist.cevap + " soru · %" + ist.pct + " doğru";
        durum = barPct >= 100 ? '<span class="dk-durum bitti">✓ bugün</span>' : "";
        btn = '<button class="dk-btn" onclick="App.dersTestiBaslat(\'' + dl + '\')">Yeni Test →</button>';
      } else {
        detay = D.soru + " soru hazır";
        btn = '<button class="dk-btn" onclick="App.dersTestiBaslat(\'' + dl + '\')">Teste Başla →</button>';
      }
      return '<div class="ders-kart">' +
        '<div class="dk-ust"><span class="dk-ikon">' + D.ikon + '</span>' + durum + '</div>' +
        '<div class="dk-ad">' + D.ad + '</div>' +
        '<div class="dk-detay">' + detay + '</div>' +
        '<div class="dk-progress"><div style="width:' + (yapildi ? barPct : 0) + '%"></div></div>' +
        btn +
        '</div>';
    }).join("");

    var odakHTML;
    if (zayif.length === 0) {
      odakHTML = '<div class="bos-mini">Birkaç test çöz; doğruluğun düşük olduğu konular burada listelenir.</div>';
    } else {
      odakHTML = zayif.slice(0, 5).map(function (z) {
        var p = Math.round(z.oran * 100);
        var renk = z.oran < 0.5 ? "kirmizi" : "sari";
        return '<div class="odak-satir" onclick="App.zayifEkrani()">' +
          '<div class="odak-ust"><span>' + DERSLER[z.ders].ad + ' · ' + esc(z.konu) + '</span><b class="' + renk + '-metin">%' + p + '</b></div>' +
          '<div class="odak-bar"><div class="' + renk + '" style="width:' + p + '%"></div></div>' +
          '</div>';
      }).join("");
    }

    var seriBars = hafta.map(function (h) {
      var cls = h.adet >= hedef ? "dolu" : (h.adet > 0 ? "kismi" : "");
      return '<span class="seri-bar ' + cls + '"></span>';
    }).join("");

    render(
      '<div class="panel-head">' +
        '<div class="panel-head-sol">' +
          '<div class="panel-brand"><span class="panel-brand-ikon">🎓</span>' +
            '<div><div class="panel-kicker">KPSS ÇALIŞMA PANELİ</div><div class="panel-brand-alt">2026 · Genel Yetenek &amp; Kültür</div></div>' +
          '</div>' +
          '<h1 class="panel-baslik">Merhaba Rafık,<br><span>bugün de devam edelim.</span></h1>' +
        '</div>' +
        '<div class="geri-kart">' +
          '<div class="gk-kicker">SINAVA KALAN</div>' +
          '<div class="gk-gun">' + (kalanGun > 0 ? kalanGun : 0) + '<span>gün</span></div>' +
          '<input type="date" value="' + sinavTarihi + '" onchange="App.tarihDegis(this.value)">' +
          '<div class="gk-alt">' + sinavTarihMetni + ' · sınav günü</div>' +
        '</div>' +
      '</div>' +
      '<div class="bolum-baslik"><h2>Dersler</h2><span>Ders seç, teste başla</span></div>' +
      '<div class="ders-grid">' + dersKartlari + '</div>' +
      '<div class="aksiyon-bar">' +
        '<button class="btn" onclick="App.denemeBaslat()">🎯 Tam Deneme</button>' +
        '<button class="btn ikincil" onclick="App.zayifBaslat()"' + (zayif.length === 0 ? ' disabled' : '') + '>🧩 Zayıf Konu Testi</button>' +
        '<button class="btn ikincil" onclick="App.yanlisEkrani()"' + (toplamYanlis === 0 ? ' disabled' : '') + '>📕 Yanlış Defterim' + (toplamYanlis ? ' (' + toplamYanlis + ')' : '') + '</button>' +
        '<button class="btn ikincil" onclick="App.statsEkrani()"' + (gecmis.length === 0 ? ' disabled' : '') + '>📈 Gelişim</button>' +
      '</div>' +
      '<div class="panel-grid">' +
        '<div class="p-kart">' +
          '<div class="p-kart-baslik"><h3>Bugünkü Hedef</h3><span class="p-rozet">🎯 ' + hedef + '</span></div>' +
          '<div class="hedef-icerik">' + ringSVG(hedefYuzde) +
            '<div class="hedef-yan">' +
              '<div class="hy-buyuk"><b>' + bugunCozulen + '</b> / ' + hedef + ' soru</div>' +
              '<div class="hy-kalan">' + (kalan > 0 ? kalan + ' soru kaldı' : 'Hedef tamam! 🎉') + '</div>' +
              '<div class="mini-satir">' +
                '<div class="mini-kutu"><span>DOĞRULUK</span><b>' + (bugDog !== null ? '%' + bugDog : '—') + '</b></div>' +
                '<div class="mini-kutu"><span>BU HAFTA</span><b>' + haftaTop + '</b></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="p-kart">' +
          '<div class="p-kart-baslik"><h3>Çalışma Serisi</h3></div>' +
          '<div class="seri-icerik"><span class="seri-alev">🔥</span><div><div class="seri-buyuk">' + seri + ' <span>gün</span></div><div class="seri-alt">' + (seri > 0 ? 'Aralıksız çalışıyorsun' : 'Bugün başla, seriyi kur') + '</div></div></div>' +
          '<div class="seri-bars">' + seriBars + '</div>' +
          '<div class="seri-enuzun">En uzun seri <b>' + enUzun + ' gün</b></div>' +
        '</div>' +
        '<div class="p-kart genis">' +
          '<div class="p-kart-baslik"><h3>Haftalık Aktivite</h3><span>' + haftaTop + ' soru · bu hafta</span></div>' +
          '<div class="aktivite-kutu">' + aktiviteSVG(hafta, hedef) + '</div>' +
        '</div>' +
        '<div class="p-kart">' +
          '<div class="p-kart-baslik"><h3>Odaklanman Gerekenler</h3></div>' +
          '<div class="odak-liste">' + odakHTML + '</div>' +
        '</div>' +
        '<div class="p-kart">' +
          '<div class="p-kart-baslik"><h3>Doğruluk Trendi</h3>' + (trendDelta ? '<span class="p-rozet ' + (trendDelta > 0 ? 'yukari' : 'asagi') + '">' + (trendDelta > 0 ? '▲ +' + trendDelta : '▼ ' + Math.abs(trendDelta)) + '</span>' : '') + '</div>' +
          '<div class="trend-buyuk">' + (trendOrt !== null ? '%' + trendOrt : '—') + ' <span>son testler ort.</span></div>' +
          trendSVG(trend) +
        '</div>' +
      '</div>' +
      '<div class="cihaz-not">📱💻 <b>İlerlemen bu cihaza ve tarayıcıya özeldir.</b> Çözdüğün sorular, netlerin ve yanlış defterin yalnızca şu an kullandığın cihaz/tarayıcıda saklanır; telefon ile bilgisayar (ya da farklı bir tarayıcı) ayrı sayılır. Cihaz değiştireceksen <b>💾 Yedek Al</b> ile indir, yeni cihazda <b>📂 Yedek Yükle</b> ile geri yükle.</div>' +
      '<div class="alt-satir">' +
        '<span class="hedef-ayar">Günlük hedef: <input type="number" min="10" max="1000" step="10" value="' + hedef + '" onchange="App.hedefDegis(this.value)"></span>' +
        '<div class="butonlar">' +
          '<button class="btn ikincil kucuk" onclick="App.yedekAl()">💾 Yedek Al</button>' +
          '<button class="btn ikincil kucuk" onclick="document.getElementById(\'yedekDosya\').click()">📂 Yedek Yükle</button>' +
          '<input type="file" id="yedekDosya" accept=".json" style="display:none" onchange="App.yedekYukle(this)">' +
        '</div>' +
      '</div>'
    );
  }

  function tarihDegis(v) {
    if (!v) return;
    var ayar = Store.get("settings", {});
    ayar.sinavTarihi = v;
    Store.set("settings", ayar);
    anaSayfa();
  }

  function hedefDegis(v) {
    var n = parseInt(v, 10);
    if (!n || n < 10) n = 10;
    if (n > 1000) n = 1000;
    var ayar = Store.get("settings", {});
    ayar.gunlukHedef = n;
    Store.set("settings", ayar);
    anaSayfa();
  }

  // ================= Ekran: Zayıf konular =================
  function zayifEkrani() {
    ekran = "zayif";
    var liste = zayifKonular();
    var satirlar = liste.map(function (z) {
      return '<tr><td>' + DERSLER[z.ders].ikon + ' ' + DERSLER[z.ders].ad + '</td>' +
        '<td>' + esc(z.konu) + '</td>' +
        '<td class="sag">' + z.top + ' soru</td>' +
        '<td class="sag"><b class="' + (z.oran < 0.4 ? "kirmizi-metin" : "sari-metin") + '">%' + Math.round(z.oran * 100) + '</b></td></tr>';
    }).join("");

    render(
      '<div class="geri-satir"><button class="btn ikincil" onclick="App.anaSayfa()">← Ana Sayfa</button></div>' +
      '<h1>🧩 Zayıf Konularım</h1>' +
      '<p class="slogan">Başarı oranın %65\'in altında kalan konular (en az ' + ZAYIF_MIN_SORU + ' soru çözülmüş olanlar). Çözdükçe liste güncellenir; bir konuda güçlenince listeden çıkar.</p>' +
      (liste.length === 0
        ? '<div class="bos-not">Zayıf konun yok ya da henüz yeterli veri birikmedi. Böyle devam! 🎉</div>'
        : '<table class="tablo"><tr><th>Ders</th><th>Konu</th><th class="sag">Çözülen</th><th class="sag">Başarı</th></tr>' + satirlar + '</table>' +
          '<button class="btn" onclick="App.zayifBaslat()">🧩 Zayıf Konulardan Test Çöz (20 soru)</button>')
    );
  }

  // ================= Ekran: Yanlış defteri =================
  function yanlisEkrani() {
    ekran = "wrong";
    var wrong = Store.get("wrong", {});
    var toplam = 0;
    var satirlar = Object.keys(DERSLER).map(function (dl) {
      var adet = (wrong[dl] || []).length;
      toplam += adet;
      if (adet === 0) return "";
      return '<tr><td>' + DERSLER[dl].ikon + ' ' + DERSLER[dl].ad + '</td>' +
        '<td class="sag">' + adet + ' soru</td>' +
        '<td class="sag"><button class="btn kucuk" onclick="App.yanlisBaslat(\'' + dl + '\')">Çöz</button></td></tr>';
    }).join("");

    render(
      '<div class="geri-satir"><button class="btn ikincil" onclick="App.anaSayfa()">← Ana Sayfa</button></div>' +
      '<h1>📕 Yanlış Defterim</h1>' +
      '<p class="slogan">Yanlış yaptığın sorular burada birikir ve 🔁 işaretiyle normal testlerine de otomatik serpiştirilir; yanlış yaptığın konulardan ekstra sorular gelir. Doğru çözünce defterden çıkar, pekişmesi için aynı konudan birkaç soru daha karşına çıkar.</p>' +
      (toplam === 0
        ? '<div class="bos-not">Defter bomboş. Böyle devam! 🎉</div>'
        : '<table class="tablo"><tr><th>Ders</th><th class="sag">Biriken</th><th class="sag"></th></tr>' + satirlar + '</table>' +
          '<div class="geri-satir">' +
          '<button class="btn" onclick="App.yanlisBaslat(\'hepsi\')">Hepsini Karışık Çöz (' + Math.min(30, toplam) + ' soru)</button>' +
          '<button class="btn ikincil" onclick="App.pekRaporKopyala()">🤖 Yapay Zekâ Raporu Kopyala</button>' +
          '</div>')
    );
  }

  // ================= Ekran: Gelişim =================
  function statsEkrani() {
    ekran = "stats";
    var gecmis = Store.get("history", []);
    var veri = gecmis.filter(function (g) {
      if (statFiltre === "hepsi") return true;
      if (statFiltre === "deneme") return g.mod === "deneme";
      if (statFiltre === "zayif") return g.mod === "zayif";
      return g.mod === "ders" && g.ders === statFiltre;
    });

    var secenekler = '<option value="hepsi"' + (statFiltre === "hepsi" ? " selected" : "") + '>Tüm Sınavlar</option>' +
      '<option value="deneme"' + (statFiltre === "deneme" ? " selected" : "") + '>Tam Denemeler</option>' +
      '<option value="zayif"' + (statFiltre === "zayif" ? " selected" : "") + '>Zayıf Konu Testleri</option>' +
      Object.keys(DERSLER).map(function (dl) {
        return '<option value="' + dl + '"' + (statFiltre === dl ? " selected" : "") + '>' + DERSLER[dl].ad + '</option>';
      }).join("");

    var satirlar = veri.slice().reverse().map(function (g) {
      var ad = g.mod === "deneme" ? "🎯 Tam Deneme"
        : g.mod === "zayif" ? "🧩 Zayıf Konu Testi"
        : DERSLER[g.ders].ikon + " " + DERSLER[g.ders].ad;
      var yuzde = Math.round(g.net / g.toplam * 100);
      return '<tr><td>' + fmtTarih(g.ts) + '</td><td>' + ad + '</td>' +
        '<td class="sag">' + g.d + ' / ' + g.y + ' / ' + g.b + '</td>' +
        '<td class="sag"><b>' + g.net + '</b> (%' + yuzde + ')</td>' +
        '<td class="sag">' + fmtSure(g.sure) + '</td>' +
        '<td class="sag">' + (g.ortSure ? g.ortSure + " sn" : "-") + '</td></tr>';
    }).join("");

    render(
      '<div class="geri-satir"><button class="btn ikincil" onclick="App.anaSayfa()">← Ana Sayfa</button></div>' +
      '<h1>📈 Gelişimim</h1>' +
      '<p class="slogan">Net oranının zaman içindeki değişimi. Çizgi yukarı gidiyorsa doğru yoldasın.</p>' +
      '<select class="filtre-sec" onchange="App.statSec(this.value)">' + secenekler + '</select>' +
      '<div class="grafik-kutu">' + grafikSVG(veri) + '</div>' +
      (veri.length > 0
        ? '<table class="tablo"><tr><th>Tarih</th><th>Sınav</th><th class="sag">D / Y / B</th><th class="sag">Net</th><th class="sag">Süre</th><th class="sag">Soru başına</th></tr>' + satirlar + '</table>'
        : '<div class="bos-not">Bu filtrede kayıt yok.</div>')
    );
  }

  function statSec(v) {
    statFiltre = v;
    statsEkrani();
  }

  function grafikSVG(veri) {
    if (veri.length < 2) return '<div class="bos-not">Grafik için en az 2 sınav kaydı gerekli.</div>';
    var W = 700, H = 260, P = 40;
    var noktalar = veri.map(function (g, i) {
      var x = P + i * (W - 2 * P) / (veri.length - 1);
      var yuzde = Math.max(0, g.net / g.toplam * 100);
      var y = H - P - (yuzde / 100) * (H - 2 * P);
      return { x: x, y: y, yuzde: Math.round(yuzde), ts: g.ts };
    });
    var izgara = [0, 25, 50, 75, 100].map(function (v) {
      var y = H - P - (v / 100) * (H - 2 * P);
      return '<line x1="' + P + '" y1="' + y + '" x2="' + (W - P) + '" y2="' + y + '" stroke="#dde5e0" stroke-width="1"/>' +
        '<text x="' + (P - 8) + '" y="' + (y + 4) + '" fill="#64766d" font-size="11" text-anchor="end">%' + v + '</text>';
    }).join("");
    var cizgi = '<polyline fill="none" stroke="#15603d" stroke-width="2.5" points="' +
      noktalar.map(function (p) { return p.x + "," + p.y; }).join(" ") + '"/>';
    var daireler = noktalar.map(function (p) {
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="4.5" fill="#1e7a4f">' +
        '<title>' + fmtTarih(p.ts) + " — %" + p.yuzde + '</title></circle>';
    }).join("");
    var ilkTarih = new Date(veri[0].ts).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
    var sonTarih = new Date(veri[veri.length - 1].ts).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
    var etiketler = '<text x="' + P + '" y="' + (H - 12) + '" fill="#64766d" font-size="11">' + ilkTarih + '</text>' +
      '<text x="' + (W - P) + '" y="' + (H - 12) + '" fill="#64766d" font-size="11" text-anchor="end">' + sonTarih + '</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + izgara + cizgi + daireler + etiketler + '</svg>';
  }

  // ================= Yerel sunucuya veri yansıtma =================
  // Program localhost'tan çalışıyorsa (KPSS-Baslat.bat) ilerleme verisi
  // veri/ilerleme.json dosyasına yazılır; yapay zekâ yanlışları oradan okur.
  function sunucuyaKaydet() {
    try {
      if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
      var veri = {
        guncelleme: new Date().toISOString(),
        wrong: Store.get("wrong", {}),
        yanlisMeta: Store.get("yanlisMeta", {}),
        konuIst: Store.get("konuIst", {}),
        pekKonu: Store.get("pekKonu", {}),
        gunluk: Store.get("gunluk", {}),
        history: Store.get("history", []).slice(-100)
      };
      fetch("/veri-kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(veri)
      }).catch(function () {});
    } catch (e) { /* sessizce geç — site/dosya modunda sunucu yoktur */ }
  }

  // ================= Yedekleme =================
  function yedekAl() {
    var veri = {
      surum: 2,
      tarih: new Date().toISOString(),
      seen: Store.get("seen", {}),
      wrong: Store.get("wrong", {}),
      history: Store.get("history", []),
      settings: Store.get("settings", {}),
      konuIst: Store.get("konuIst", {}),
      gunluk: Store.get("gunluk", {}),
      yanlisMeta: Store.get("yanlisMeta", {}),
      pekKonu: Store.get("pekKonu", {})
    };
    var blob = new Blob([JSON.stringify(veri, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kpss-yedek-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function yedekYukle(input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var veri = JSON.parse(r.result);
        if (!veri || typeof veri !== "object" || !("history" in veri)) throw new Error("format");
        Store.set("seen", veri.seen || {});
        Store.set("wrong", veri.wrong || {});
        Store.set("history", veri.history || []);
        Store.set("settings", veri.settings || {});
        Store.set("konuIst", veri.konuIst || {});
        Store.set("gunluk", veri.gunluk || {});
        Store.set("yanlisMeta", veri.yanlisMeta || {});
        Store.set("pekKonu", veri.pekKonu || {});
        alert("Yedek başarıyla yüklendi.");
        anaSayfa();
      } catch (e) {
        alert("Geçersiz yedek dosyası.");
      }
    };
    r.readAsText(f);
    input.value = "";
  }

  // ================= Klavye =================
  function klavye(e) {
    if (ekran !== "exam" || !S) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    var map = { a: 0, b: 1, c: 2, d: 3, e: 4, "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
    var k = e.key.toLowerCase();
    if (k in map) secim(map[k]);
    else if (e.key === "ArrowRight") git(1);
    else if (e.key === "ArrowLeft") git(-1);
    else if (k === "f" || k === "w") isaretle();
  }

  // ================= Başlatma =================
  function init() {
    document.addEventListener("keydown", klavye);
    window.addEventListener("beforeunload", function (e) {
      if (S && ekran === "exam") { e.preventDefault(); e.returnValue = ""; }
    });
    anaSayfa();
    sunucuyaKaydet();
  }

  return {
    init: init,
    dersTestiBaslat: dersTestiBaslat,
    denemeBaslat: denemeBaslat,
    yanlisBaslat: yanlisBaslat,
    yanlisEkrani: yanlisEkrani,
    zayifBaslat: zayifBaslat,
    zayifEkrani: zayifEkrani,
    statsEkrani: statsEkrani,
    statSec: statSec,
    secim: secim,
    git: git,
    gitNo: gitNo,
    isaretle: isaretle,
    bitir: bitir,
    iptal: iptal,
    otoDegis: otoDegis,
    filtrele: filtrele,
    sonucKopyala: sonucKopyala,
    pekRaporKopyala: pekRaporKopyala,
    anaSayfa: anaSayfa,
    tarihDegis: tarihDegis,
    hedefDegis: hedefDegis,
    yedekAl: yedekAl,
    yedekYukle: yedekYukle
  };
})();
