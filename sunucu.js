// Basit yerel sunucu: programı http://localhost:8347 adresinde çalıştırır ve
// sınav sonuçlarını veri/ilerleme.json dosyasına yansıtır — böylece yapay zekâ
// yanlışlarını doğrudan okuyup ona göre soru üretebilir.
// Başlatma: KPSS-Baslat.bat (veya elle: node sunucu.js)
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var PORT = 8347;
var KOK = __dirname;
var TIPLER = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

http.createServer(function (istek, cevap) {
  // İlerleme verisini dosyaya yaz (program her sınav bitiminde gönderir)
  if (istek.method === "POST" && istek.url === "/veri-kaydet") {
    var govde = "";
    istek.on("data", function (parca) {
      govde += parca;
      if (govde.length > 5e6) istek.destroy();
    });
    istek.on("end", function () {
      try {
        JSON.parse(govde); // geçerli JSON mu kontrolü
        var klasor = path.join(KOK, "veri");
        if (!fs.existsSync(klasor)) fs.mkdirSync(klasor);
        fs.writeFileSync(path.join(klasor, "ilerleme.json"), govde, "utf8");
        cevap.writeHead(200, { "Content-Type": "application/json" });
        cevap.end('{"ok":true}');
      } catch (e) {
        cevap.writeHead(400);
        cevap.end("gecersiz veri");
      }
    });
    return;
  }

  // Statik dosya sunumu
  var yol = decodeURIComponent((istek.url || "/").split("?")[0]);
  if (yol === "/") yol = "/index.html";
  var dosya = path.normalize(path.join(KOK, yol));
  if (dosya.indexOf(KOK) !== 0 || !fs.existsSync(dosya) || fs.statSync(dosya).isDirectory()) {
    cevap.writeHead(404);
    cevap.end("bulunamadi");
    return;
  }
  cevap.writeHead(200, {
    "Content-Type": TIPLER[path.extname(dosya).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(dosya).pipe(cevap);
}).listen(PORT, "127.0.0.1", function () {
  console.log("KPSS Soru Programi calisiyor: http://localhost:" + PORT);
});
