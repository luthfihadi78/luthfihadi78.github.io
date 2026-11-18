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
/* 25 Okt: bump cache — kolom big caps baru (posisi/korelasi/funding/OI) + alert. */
/* 11 Nov: bump cache — perbaikan login admin (hash password cloud) + gembok
   anti-timpang cloudWrite, supaya app.js baru benar-benar terpakai. */
const CACHE = "qkuk-v20261114f";
const SHELL = [
  "./", "./index.html", "./app.js", "./style.css", "./manifest.json",
  "./whale.html", "./whale.js", "./riwayat.html", "./archive.html",
  "./riwayat-posisi.html", "./riwayat-posisi.js", "./playbook.html",
  "./icon-192.png", "./icon-512.png"
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
  /* 12 Nov — HTML/navigasi jadi NETWORK-FIRST. Dulu cache-first: halaman lama
     terus tampil (mis. urutan section lama) walau versi baru sudah terbit,
     karena SW menyajikan cache dulu dan baru memperbaruinya di belakang.
     Sekarang: ambil dari jaringan, simpan ke cache, cache hanya dipakai saat
     offline. Aset berat (css/js bergaya ?v=) tetap cache-first. */
  var html = e.request.mode === "navigate" || /\.html?$/.test(url.pathname) || url.pathname.slice(-1) === "/";
  if (html) {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var salin = resp.clone();
          caches.open(CACHE).then(function (c) { try { c.put(e.request, salin); } catch (x) {} });
        }
        return resp;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }
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
