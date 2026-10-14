/* Qkuk Terminal — service worker (13 Okt, permintaan user: PWA + push).
   Strategi cache:
   - app-shell (HTML/CSS/JS/manifest/icon): cache-first dgn stale-while-revalidate
     supaya buka instan walau jaringan lambat, tapi tiap buka ambil versi baru dr
     network utk disimpan di cache inset. Situs sudah memakai cache-buster ?v=
     di URL asset — versi baru otomatis melewati cache lama.
   - data.json & picks.json & textdb: BYPASS cache selalu (network-only) — data
     live tak boleh basi; kalau network fail, biarkan error (tapi dgn offline
     fallback opsi halaman masih terbuka dgn data terakhir).
   - Notifikasi: SW menerima push/ klik notifikasi → fokus tab yang ada. */
const CACHE = "qkuk-v20261015c";
const SHELL = [
  "./", "./index.html", "./app.js", "./style.css", "./manifest.json",
  "./whale.html", "./whale.js", "./riwayat.html", "./archive.html", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== CACHE) return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // data live: selalu network
  if (/data\.json$/.test(url.pathname) || /picks\.json$/.test(url.pathname)
      || /picks-data\.json$/.test(url.pathname)
      || /\/archive\//.test(url.pathname)
      || url.hostname.indexOf("textdb.dev") >= 0 || url.hostname.indexOf("binance") >= 0
      || url.hostname.indexOf("coingecko") >= 0 || url.hostname.indexOf("coinpaprika") >= 0) {
    return;   // biarkan default network (tidak di-cache SW)
  }
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(e.request).then(function (hit) {
        var fetchAndPut = fetch(e.request).then(function (resp) {
          if (resp && resp.status === 200) { try { cache.put(e.request, resp.clone()); } catch (x) {} }
          return resp;
        }).catch(function () { return hit; });
        return hit || fetchAndPut;
      });
    })
  );
});

// klik notifikasi → fokuskan/jembatan tab pengirim
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var tujuan = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true })
    .then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var cl = list[i];
        if (cl.url.indexOf("qkuk") >= 0) { cl.focus(); return; }
      }
      return clients.openWindow(tujuan);
    }));
});
