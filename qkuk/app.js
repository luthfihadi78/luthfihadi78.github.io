if (window.top !== window.self) { try { window.top.location = window.self.location; }
  catch (e) { document.documentElement.style.display = "none"; } }

(function () {
  "use strict";
  /* 6 Okt — "2h" (🩸 HARVEST) WAJIB ada di ORDER: tab bubbles/watchlist/signals
     dan kartu winrate strip() semuanya memakai ord() yang menyaring daftar
     ini. Tanpa "2h", tab & winrate HARVEST lenyap diam-diam walau data.json
     sudah membawanya. "30m" dibiarkan (REVERSAL mati) — ord() menyaring
     otomatis kalau datanya tak ada. */
  var DATA = null, ORDER = ["ob", "2h", "4h", "whale"], LEFT = 60;   // 8 Okt: 4 engine aktif — REA 30m keluar
  /* ⚠️ GitHub Pages menyajikan index.html dgn cache-control 600 dtk, dan tab
     yang dibiarkan terbuka TIDAK PERNAH mengambil ulang HTML-nya sama sekali —
     ia hanya menarik data.json. Akibatnya pembaruan tampilan tak terlihat
     sampai pembaca menekan hard-reload, dan itu tidak masuk akal untuk halaman
     yang memang dimaksudkan ditinggal terbuka. Versi build ditanam saat terbit;
     kalau data.json membawa versi lain, halaman memuat ulang dirinya sendiri. */
  /* 5 Okt: kartu riset 🐳 WHALE (n=59 WR 69.5% EV +0.372R, IS→OOS + sebaran
   bulan) di bawah strip bandeng; kartu SNIPER 1h dihapus dari tampilan.
   ⚠️ BUILD sengaja TIDAK dinaikkan. Penaga auto-reload di bawah compares
   BUILD vs data.json.build; kalau BUILD beda, tab memuat ulang — dan karena
   kuncinya per-versi, ia akan reload lagi tiap poll SELAMA data.json belum
   juga terbit baru. Menaikkan BUILD tanpa ikut menerbitkan data.json = reload
   tanpa henti. data.json hanya boleh terbit dari mesin bot, jadi di sini kita
   samakan. Cache busting tetap lewat ?v=20261005a di index.html. */
  var BUILD = "qkuk-nuansa-kilat-20261016i";
  /* 4 engine aktif (8 Okt): 🩸 HARVEST 2h = merah darah · 🧱 BRICK
     (kanal "ob", bukan TF — engine ob_premium_watch.py, setup bar 1h → TVI 60;
     riset backtestnya MSS→IDM→zona OB 30m+mantul dgn gerbang searah BTC 24 jam,
     oranye bata) · 🧵 SWING 4h = hijau (Sweep+Reclaim 4h, TVI 240) ·
     🐳 WHALE = emas. Reversal 30m = ungu (mati, dibiarkan utk riwayat).
     TVI = interval TradingView — tanpa entri tf-nya link chart jatuh ke
     fallback "240", interval salah. */
  var COLOR = { "30m": "#C792EA", "2h": "#FF6B6B", "ob": "#E8965A", "4h": "#7CE38B", "whale": "#FFD54F" };
  var TVI = { "30m": "30", "2h": "120", "ob": "60", "4h": "240", "whale": "60" };

  function $(s) { return document.querySelector(s); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function num(v) { var f = parseFloat(v); return isFinite(f) ? f : null; }
  function sgn(v, d) { var f = num(v); return f === null ? "—" : (f > 0 ? "+" : "") + f.toFixed(d == null ? 2 : d); }
  /* 27 Sep — isFinite(null) === true di JS! pct pick open disimpan null, jadi
     semua cek "ada tidaknya hasil %" wajib lewat hasPct (cek null dulu),
     bukan isFinite mentah — sumber bug crash toFixed di popup detail. */
  function hasPct(v) { return v !== null && v !== undefined && v !== "" && isFinite(v); }
  function ord() { return ORDER.filter(function (t) { return DATA.live && DATA.live[t]; }); }
  /* 21 Sep — pelapor error di layar: error JS apa pun yang tadinya hilang diam
     di konsol (yang tidak dilihat pengunjung) kini tampil sebagai chip merah
     kecil di kiri-bawah — klik untuk menutup. Memudahkan diagnosis bila ada
     yang gagal di device tertentu. */
  function showErr(msg) {
    try {
      var c = document.getElementById("qk-err");
      if (!c) {
        c = document.createElement("button"); c.id = "qk-err"; c.type = "button";
        c.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:9999;max-width:76vw;"
          + "background:#3a1418;color:#ffb4ab;border:1px solid rgba(232,135,124,.45);"
          + "border-radius:8px;padding:6px 10px;font:11px/1.5 monospace;text-align:left;cursor:pointer";
        c.addEventListener("click", function () { c.style.display = "none"; });
        (document.body || document.documentElement).appendChild(c);
      }
      c.textContent = "⚠ " + String(msg || "error").slice(0, 220);
      c.style.display = "block";
      clearTimeout(c._t); c._t = setTimeout(function () { c.style.display = "none"; }, 15000);
    } catch (e) {}
  }
  window.addEventListener("error", function (ev) {
    showErr((ev && ev.error && (ev.error.stack || ev.error.message)) || (ev && ev.message) || "error");
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var rsn = ev && ev.reason;
    showErr((rsn && (rsn.stack || rsn.message || String(rsn))) || "promise rejected");
  });
  /* harga dari CSV adalah hasil float mentah (0.013629999999999998) */
  function fp(v) {
    var f = num(v); if (f === null) return "—";
    var a = Math.abs(f), d = a >= 1000 ? 2 : a >= 1 ? 4 : a >= .01 ? 5 : a >= .0001 ? 7 : 9;
    var t = f.toFixed(d);
    if (t.indexOf(".") >= 0) t = t.replace(/0+$/, "").replace(/\.$/, "");
    return t;
  }
  function tvUrl(sym, tf) {
    return "https://www.tradingview.com/chart/?symbol=BINANCE%3A" + encodeURIComponent(sym)
         + ".P&interval=" + (TVI[tf] || "240");
  }
  function tvCell(sym, tf) {
    var td = el("td");
    var a = document.createElement("a");
    a.className = "tv"; a.href = tvUrl(sym, tf);
    a.target = "_blank"; a.rel = "noopener noreferrer";
    a.title = "Open " + sym + " on TradingView, " + tf.toUpperCase() + " chart";
    a.setAttribute("aria-label", a.title);
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M3 20h18"/><path d="M7 20V9"/><path d="M12 20V4"/><path d="M17 20v-7"/></svg>';
    td.appendChild(a); return td;
  }

  /* ===== arah altcoin: spidometer + aura api =====
     Jarum dipetakan dari KODE REZIM, bukan dari satu angka mentah: rezimnya
     memang kategorial (5 kombinasi BTC x BTC.D x USDT.D), jadi memaksakan
     skala kontinu dari btc_chg saja akan mengarang presisi yang tak ada.
     Peta di bawah mengurutkan 5 rezim itu dari paling bearish ke paling
     bullish menurut label yang dipakai engine. */
  var GPOS = { "1": .85, "3": .55, "2": 0, "4": -.7, "5": -.85 };
  /* 25 Sep v33 — 6 status gauge: long, altseason (long kuat), netral,
     short, crash (short kuat), deg (degraded). ALTSEASON & CRASH bukan
     sekadar LONG/SHORT ekstrem: faktor dominannya beda (altseason syarat
     BTC.D TURUN; crash syarat BTC turun dalam), makanya warnanya sendiri. */
  /* 16 Okt (permintaan user, PILIHAN): nuansa LONG = Jade-Emas (teal #2DD4A7
     + kilau emas), ALTSEASON = CYBER LIME (#B6F36B + cyan #22D3EE, grid
     digital) — dipilih user dari 3 kandidat. GC dipakai di: needle gauge,
     arc flow, glow, dan label bias. */
  var GC = { long: "#2DD4A7", altseason: "#B6F36B", short: "#E8877C", crash: "#FF6D5E",
             netral: "#EEF4F1", deg: "#EEB44C" };
  var GA = 140, GB = 142, GR = 104;            // pusat & radius busur
  function pol(r, deg) {
    var t = deg * Math.PI / 180;
    return [GA + r * Math.cos(t), GB - r * Math.sin(t)];
  }
  function gaugeStatik() {
    var arc = $("#g-arc"), fl = $("#g-fl");
    if (arc.childNodes.length) return;          // cukup sekali
    var p0 = pol(GR, 180), p1 = pol(GR, 0);
    arc.appendChild(mk("path", { "class": "arcbg",
      d: "M" + p0[0] + "," + p0[1] + " A" + GR + "," + GR + " 0 0 1 " + p1[0] + "," + p1[1] }));
    for (var i = 0; i <= 8; i++) {
      var d = 180 - i * 22.5, a = pol(GR - 9, d), b = pol(GR + 5, d);
      arc.appendChild(mk("line", { "class": "tick" + (i === 4 ? " mid" : ""),
        x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
    }
    // ⚠️ Versi pertama: 17 lidah SERAGAM, jarak sama, tinggi hampir sama.
    // Hasilnya terbaca sebagai KELOPAK BUNGA, bukan api. Api itu tidak teratur.
    // Perbaikan: dua lapis (pangkal lebar-pendek + ujung ramping-tinggi),
    // posisi & tinggi di-jitter dengan deret deterministik (bukan Math.random,
    // supaya tampilannya stabil antar-muat), dan fase animasi dibuat berbeda
    // tiap lidah sehingga tak pernah berkedip serempak.
    var N = 38;
    for (var k = 0; k < N; k++) {
      var jit = Math.sin(k * 12.9898) * 43758.5453;
      jit = jit - Math.floor(jit);                       // 0..1 deterministik
      var deg = 177 - (k + (jit - .5) * .8) * (174 / (N - 1));
      var pt = pol(GR + 7, deg);
      var g = mk("g", { transform: "translate(" + pt[0].toFixed(1) + "," + pt[1].toFixed(1)
        + ") rotate(" + (90 - deg).toFixed(1) + ")" });
      var base = 0.5 + jit * 1.05;                       // tinggi sangat bervariasi
      // lapis pangkal: lebar, pendek, lebih pekat
      var f1 = mk("path", { "class": "fl", opacity: .4,
        d: "M0,0 C-6.2,-5 -5,-12 0,-17 C5,-12 6.2,-5 0,0 Z",
        transform: "scale(" + (base * .95).toFixed(2) + ",1)" });
      // lapis ujung: ramping, tinggi, lebih tipis -> meruncing tanpa gradien
      var f2 = mk("path", { "class": "fl", opacity: .22,
        d: "M0,0 C-3.4,-8 -2.6,-19 0,-30 C2.6,-19 3.4,-8 0,0 Z",
        transform: "scale(" + (0.75 + jit * .6).toFixed(2) + "," + (0.8 + jit * .75).toFixed(2) + ")" });
      [f1, f2].forEach(function (f, j) {
        f.style.animationDelay = ((k * 137 + j * 430) % 1900) + "ms";
        f.style.animationDuration = (1250 + (k * 197 + j * 350) % 1100) + "ms";
        g.appendChild(f);
      });
      fl.appendChild(g);
    }
    var n = mk("g", { "class": "ndl", id: "ndl-g" });
    n.appendChild(mk("path", { d: "M" + GA + "," + GB + " L" + (GA - 5) + "," + (GB - 6)
      + " L" + GA + "," + (GB - 86) + " L" + (GA + 5) + "," + (GB - 6) + " Z" }));
    n.appendChild(mk("circle", { cx: GA, cy: GB, r: 7.5 }));
    n.appendChild(mk("circle", { cx: GA, cy: GB, r: 3, fill: "#070B09" }));
    $("#g-ndl").appendChild(n);
  }
  /* ── 15 Okt — NUANSA LATAR IKUT GAUGE (cangkok dari sync laptop 15 Okt) ──
     Latar halaman merespon kondisi gauge live: crash = api kebakaran
     (jingga/merah menyala dari bawah + kedip pelan), short = bara merah,
     long = hijau bull, altseason = aurora, deg = amber, netral = default.
     Pratinjau: chip di panel gauge atau URL ?tema=crash dst — pratinjau
     menimpa live sampai "ikut live" diklik. Tampilan saja, bot tak rubah. */
  var TEMA_DAFTAR = ["netral","long","altseason","short","crash","deg"];
  var PRATINJAU_TEMA = null, TEMA_LIVE = "netral";
  try {
    var _qt = new URLSearchParams(location.search).get("tema");
    if (_qt && TEMA_DAFTAR.indexOf(_qt) >= 0) PRATINJAU_TEMA = _qt;
  } catch (e) {}
  function temaApply(t, pratinjau) {
    if (TEMA_DAFTAR.indexOf(t) < 0) t = "netral";
    if (!document.getElementById("tema")) {
      var l = el("div"); l.id = "tema"; l.setAttribute("aria-hidden", "true");
      document.body.insertBefore(l, document.body.firstChild);
    }
    TEMA_DAFTAR.forEach(function (x) {
      document.body.classList.toggle("tema-" + x, x === t);
    });
    /* 16 Okt — lapisan partikel ikut berganti bersama tema */
    nuansaSet(t);
    if (pratinjau) PRATINJAU_TEMA = t; else TEMA_LIVE = t;
    var r = document.querySelector(".tema-demo");
    if (r) {
      r.querySelectorAll("button[data-t]").forEach(function (b) {
        b.classList.toggle("on", b.dataset.t === t);
      });
      var g = r.querySelector(".tag");
      if (g) { g.textContent = pratinjau ? "pratinjau" : "ikut live";
               g.classList.toggle("pratinjau", !!pratinjau);
               g.classList.toggle("live", !pratinjau); }
    }
  }
  function temaChip() {
    if (document.querySelector(".tema-demo")) return;
    var kotak = document.querySelector("#dir .dir");
    if (!kotak) return;
    var r = el("div", "tema-demo");
    var tag = el("span", "tag live");
    var tt = el("span", "tt", "nuansa:");
    r.appendChild(tt);
    [["netral","NETRAL"],["long","LONG"],["altseason","ALTSEASON"],
     ["short","SHORT"],["crash","CRASH · API"],["deg","DEGRADED"]]
      .forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button"; b.dataset.t = p[0]; b.textContent = p[1];
        b.title = "pratinjau latar: " + p[0];
        b.addEventListener("click", function () { temaApply(p[0], true); });
        r.appendChild(b);
      });
    var ikut = document.createElement("button");
    ikut.type = "button"; ikut.dataset.t = "ikuti"; ikut.textContent = "ikut live";
    ikut.title = "buang pratinjau — ikut kondisi gauge sebenarnya";
    ikut.addEventListener("click", function () {
      PRATINJAU_TEMA = null; temaApply(TEMA_LIVE, false);
    });
    r.appendChild(ikut);
    r.appendChild(tag);
    kotak.appendChild(r);
  }
  /* ── 16 Okt — NUANSA PARTIKEL (canvas #nuansa) — pasar jadi "hidup" ──
      netral = salju berbutir jatuh lembut · long = CRONA PULSA (serpihan
     cahaya jade/emas berkilau naik, lahir-mati lembut) ·
     altseason = DENJIRI NEON (rerik pendek lime/cyan diagonal juntai
     kencang — kesan pasar jalan cepat) ·
     short = gerimis merah gelap + KILAT HALUS SESEKALI (hujan mendung
     menjelang badai) · crash = API & BARA MEMENUHI SEMUA SISI, bukan
     sekadar cahaya · deg = debu amber mengambang.
     (17 Okt — daun dibusak: user minta desain non-daun; idear "daun long,"
     daun+angin altseason" diganti CRONA PULSA & DENJIRI NEON.)
     Ringan: 1 canvas, 1 rAF, tanpa shadowBlur; berhenti saat tab
     tersembunyi; hormati prefers-reduced-motion (tot mati). Cuma tampilan. */
  var NU = { cv: null, cx: null, W: 0, H: 0, parts: [], mode: null,
             raf: 0, last: 0, sp: null, wind: 0,
             k: { next: 0, t0: -9, pts: null } };   // k = kilat (short)
  var NU_REDUCED = false;
  try { NU_REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var NU_KEDALIM = { snow: 96, driz: 140, bara: 210, api: 5, debu: 32,
                     pulsa: 46, debuneon: 62 };
  function nuSprite() {   // 1 sprite api pra-render — murah tiap gambarkan
    if (NU.sp) return NU.sp;
    var s = document.createElement("canvas"); s.width = s.height = 128;
    var g = s.getContext("2d");
    var gr = g.createRadialGradient(64, 64, 3, 64, 64, 63);
    gr.addColorStop(0, "rgba(255,192,112,1)");
    gr.addColorStop(.3, "rgba(255,109,94,.6)");
    gr.addColorStop(.66, "rgba(202,38,52,.15)");
    gr.addColorStop(1, "rgba(202,38,52,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    NU.sp = s; return s;
  }
  function nuResize() {
    if (!NU.cv) return;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    NU.W = window.innerWidth; NU.H = window.innerHeight;
    NU.cv.width = Math.round(NU.W * d); NU.cv.height = Math.round(NU.H * d);
    NU.cx.setTransform(d, 0, 0, d, 0, 0);
  }
  function nuInit() {
    if (NU.cv) return;
    var c = document.createElement("canvas");
    c.id = "nuansa"; c.setAttribute("aria-hidden", "true");
    var body = document.body;
    var t = document.getElementById("tema");
    if (t && t.parentNode) t.parentNode.insertBefore(c, t.nextSibling);
    else body.insertBefore(c, body.firstChild);
    NU.cv = c; NU.cx = c.getContext("2d");
    nuResize();
    window.addEventListener("resize", nuResize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(NU.raf); NU.raf = 0; }
      else if (NU.mode && !NU_REDUCED) { NU.last = 0; NU.raf = requestAnimationFrame(nuLoop); }
    });
  }
  function nuSpawn(kind, isi) {   // isi = isi layar saat prefill; kalau tidak, titik lahir di pinggir
    var r = Math.random, p = { k: kind, ph: r() * 6.283, fs: .8 + r() * 1.4 };
    function coba(ka) { return ka[(r() * ka.length) | 0]; }
    if (kind === "snow") {
      p.x = r() * NU.W; p.y = isi ? r() * NU.H : -8;
      p.vy = 16 + r() * 26; p.sw = 8 + r() * 18; p.r = .8 + r() * 2.2;
      p.a = .3 + r() * .5; p.c = r() < .75 ? "224,238,246" : "198,222,244";
    } else if (kind === "pulsa") {          // LONG: serpihan cahaya berkilau naik
      p.x = r() * NU.W; p.y = isi ? r() * NU.H : NU.H + 6;
      p.vy = -(12 + r() * 26);               // naik pelan dari dasar
      p.r = 1.1 + r() * 2.3;
      p.umur = 0; p.ttl = 2.4 + r() * 2.8;   // hidup-mati dgn envelope sin
      p.c = coba(["#2DD4A7", "#EEB44C", "#A7F3D0", "#E8C97A"]);   // jade & emas
      p.a = .4 + r() * .45;
    } else if (kind === "debuneon") {       // ALTSEASON: rerik neon diagonal
      p.x = r() * (NU.W + 90) - 45; p.y = isi ? r() * NU.H : -18 - r() * 70;
      p.vx = 30 + r() * 46;                  // miring landai ke kanan
      p.vy = 200 + r() * 190;                // deras ke bawah
      p.ln = 9 + r() * 17;
      p.c = coba(["#B6F36B", "#22D3EE", "#A3E635", "#67E8F9"]);   // lime & cyan
      p.a = .26 + r() * .38;
    } else if (kind === "driz") {            // gerimis merah gelap
      p.x = r() * (NU.W + 40) - 20; p.y = isi ? r() * NU.H : -14;
      p.vx = -12 - r() * 12; p.vy = 320 + r() * 150;
      p.ln = 9 + r() * 9; p.a = .22 + r() * .26;
    } else if (kind === "bara") {           // bara api memenuhi sisi
      var e = r();
      if (e < .58) { p.x = r() * NU.W; p.y = NU.H + 6;
        p.vy = -(46 + r() * 120); p.vx = (r() - .5) * 44; }
      else if (e < .88) { var kiri = r() < .5;            // dinding sisi
        p.x = kiri ? -6 : NU.W + 6; p.y = NU.H * (.2 + r() * .78);
        p.vx = kiri ? 14 + r() * 40 : -(14 + r() * 40);
        p.vy = -(30 + r() * 90); }
      else { p.x = r() * NU.W; p.y = -6;                  // bunga api turun dari atas
        p.vy = 24 + r() * 40; p.vx = (r() - .5) * 22; }
      if (isi) { p.x = r() * NU.W; p.y = r() * NU.H; }
      p.c = coba(["255,109,94", "255,148,52", "255,226,90"]);
      p.r = 1 + r() * 2.1; p.a = .5 + r() * .5;
    } else if (kind === "api") {            // lidah api besar di akar sisi
      var slot = NU.parts.filter(function (q) { return q.k === "api"; }).length;
      var s5 = [[.18, 1.0], [.5, 1.0], [.82, 1.0], [-.04, .62], [1.04, .62]];
      p.x = NU.W * s5[slot % 5][0]; p.y = NU.H * s5[slot % 5][1];
      p.r = 52 + r() * 48; p.a = .34 + r() * .2;
    } else {                                // debu amber (deg)
      p.x = r() * NU.W; p.y = r() * NU.H;
      p.vy = 6 + r() * 10; p.sw = 6 + r() * 10; p.r = .6 + r() * 1.4;
      p.a = .14 + r() * .18;
    }
    NU.parts.push(p);
  }
  function nuTick(dt, t) {
    var W = NU.W, H = NU.H, r = Math.random, i, p, x, alive;
    NU.wind = NU.mode === "altseason"
      ? 96 + 64 * Math.sin(t * .55) + 120 * Math.max(0, Math.sin(t * 1.9)) : 0;
    /* 16 Okt — KILAT HALUS (short): sesekali, bukan hujan kilat. Sambaran
       pertama ~1–3 dtk setelah masuk short biar terlihat, lalu tiap 4–11 dtk.
       Subjek: garis jagged dari langit (~65% layar) + kedip kabur dua-nadi
       (0–90ms terang, jeda, 130–240ms susulan) — seperti petang nyata. */
    var K = NU.k;
    if (NU.mode === "short") {
      if (!K.next) K.next = t + 1.2 + r() * 2;
      if (t >= K.next) {
        K.t0 = t; K.next = t + 4 + r() * 7;
        var bp = [], bx = NU.W * (.12 + r() * .76), by = -8;
        var seg = 6 + (r() * 4 | 0);
        for (var q = 0; q < seg; q++) {
          bp.push([bx, by]);
          bx += (r() - .5) * NU.W * .07;
          by += NU.H * (.05 + r() * .06);
          if (by > NU.H * .68) break;
        }
        K.pts = bp;
      }
    } else if (K.next) { K.next = 0; K.pts = null; K.t0 = -9; }
    for (i = NU.parts.length - 1; i >= 0; i--) {
      p = NU.parts[i]; alive = true;
      if (p.k === "snow") {
        p.x += Math.sin(t * p.fs + p.ph) * p.sw * dt;
        p.y += p.vy * dt;
        if (p.y > H + 6) { NU.parts[i] = NU.parts[NU.parts.length - 1]; NU.parts.pop(); alive = false; p.k = "snow"; }
      } else if (p.k === "pulsa") {
        p.x += Math.sin(t * p.fs * .9 + p.ph) * 8 * dt;   // goyang pelan
        p.y += p.vy * dt; p.umur += dt;
        if (p.umur > p.ttl || p.y < -12) {
          NU.parts[i] = NU.parts[NU.parts.length - 1]; NU.parts.pop(); alive = false;
        }
      } else if (p.k === "debuneon") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > H + 24 || p.x > W + 70) {
          NU.parts[i] = NU.parts[NU.parts.length - 1]; NU.parts.pop(); alive = false;
        }
      } else if (p.k === "driz") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > H + 14) { NU.parts[i] = NU.parts[NU.parts.length - 1]; NU.parts.pop(); alive = false; }
      } else if (p.k === "bara") {
        p.x += (p.vx + (r() - .5) * 60) * dt; p.y += p.vy * dt;
        if (p.y < -10 || p.y > H + 12 || p.x < -12 || p.x > W + 12) {
          NU.parts[i] = NU.parts[NU.parts.length - 1]; NU.parts.pop(); alive = false;
        }
      } else if (p.k === "api") {
        /* lidah api: hidup di tempat, naik-turun & menghembus pelan —
           posisi dasarnya permanen, ukuran & opasitas berkedip */
        p.off = Math.sin(t * p.fs + p.ph);
      }
      if (alive) continue;
      // ganti yang mati dgn yang baru — jumlah tiap jenis tetap
      nuSpawn(p.k, false);
    }
  }
  function nuPaint() {   // draw semua partikel dalam 1 pass
    var cx = NU.cx, t = performance.now() / 1000;
    NU.parts.forEach(function (p) {
      if (p.k === "snow") {
        cx.fillStyle = "rgba(" + p.c + "," + (p.a * (0.6 + 0.4 * Math.sin(t * p.fs + p.ph))).toFixed(3) + ")";
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
      } else if (p.k === "pulsa") {
        /* CRONA PULSA: alpha memuncak di tengah umur (envelope sin) — lahir
           & mati lembut. Inti titik + salib kilau tipis (garis +) dgn
           composite lighter supaya bersinar, tanpa shadowBlur (mahal). */
        var um = Math.min(1, p.umur / p.ttl);
        var env = Math.sin(Math.PI * um);
        cx.save(); cx.globalCompositeOperation = "lighter";
        cx.globalAlpha = p.a * env; cx.fillStyle = p.c;
        cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.8 + 0.5 * env), 0, 6.283); cx.fill();
        cx.strokeStyle = p.c; cx.lineWidth = 1;
        var kl = p.r * 2.2 + 2.4 * env;
        cx.beginPath();
        cx.moveTo(p.x - kl, p.y); cx.lineTo(p.x + kl, p.y);
        cx.moveTo(p.x, p.y - kl); cx.lineTo(p.x, p.y + kl);
        cx.stroke();
        cx.restore(); cx.globalAlpha = 1;
      } else if (p.k === "debuneon") {
        /* DENJIRI NEON: satu garis lebar halus (glow) + inti tajam;
           kemiringan mengikuti vx/vy supaya terlihat miring landai. */
        var dn = p.ln * (p.vx / p.vy);
        cx.save(); cx.globalCompositeOperation = "lighter"; cx.lineCap = "round";
        cx.strokeStyle = p.c;
        cx.globalAlpha = p.a * .45; cx.lineWidth = 3;
        cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x + dn, p.y + p.ln); cx.stroke();
        cx.globalAlpha = p.a; cx.lineWidth = 1.1;
        cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x + dn, p.y + p.ln); cx.stroke();
        cx.restore(); cx.globalAlpha = 1;
      } else if (p.k === "driz") {
        cx.strokeStyle = "rgba(190,74,66," + p.a.toFixed(3) + ")";
        cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(p.x, p.y);
        cx.lineTo(p.x - p.vx * .028, p.y - p.ln); cx.stroke();
      } else if (p.k === "bara") {
        cx.save(); cx.globalCompositeOperation = "lighter";
        cx.fillStyle = "rgba(" + p.c + "," + (p.a * (0.55 + 0.45 * Math.sin(t * p.fs + p.ph))).toFixed(3) + ")";
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
        cx.restore();
      } else if (p.k === "api") {
        var sp = nuSprite();
        var sz = p.r * (1 + .09 * (p.off || 0)), dy = (p.off || 0) * 14;
        cx.save(); cx.globalCompositeOperation = "lighter";
        cx.globalAlpha = Math.max(.12, p.a * (0.75 + .25 * (p.off || 0)));
        cx.drawImage(sp, p.x - sz, p.y - sz + dy, sz * 2, sz * 2);
        cx.restore(); cx.globalAlpha = 1;
      } else {
        cx.fillStyle = "rgba(238,180,76," + p.a.toFixed(3) + ")";
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
      }
    });
    /* kilat halus (short): ambient kabur + garis inti — digambar PALING AKHIR
       biar di atas gerimis; hilang sendiri dalam setengah detik */
    var K = NU.k, age = t - K.t0;
    if (K.pts && age >= 0 && age < .5) {
      var env = age < .09 ? 1 - age / .09
        : (age > .13 && age < .24 ? (0.24 - age) / .11 * .7 : 0);
      if (env > 0) {
        cx.fillStyle = "rgba(255,110,100," + (env * .06).toFixed(3) + ")";
        cx.fillRect(0, 0, NU.W, NU.H);
        for (var g = 0; g < 2; g++) {
          cx.strokeStyle = g === 0
            ? "rgba(255,96,84," + (env * .3).toFixed(3) + ")"
            : "rgba(255,224,214," + (env * .85).toFixed(3) + ")";
          cx.lineWidth = g === 0 ? 4 : 1.4;
          cx.lineJoin = "round";
          cx.beginPath();
          for (var s2 = 0; s2 < K.pts.length; s2++) {
            if (s2 === 0) cx.moveTo(K.pts[s2][0], K.pts[s2][1]);
            else cx.lineTo(K.pts[s2][0], K.pts[s2][1]);
          }
          cx.stroke();
        }
      } else if (age >= .24) K.pts = null;
    }
  }
  function nuLoop(ts) {
    NU.raf = 0;
    if (!NU.mode || !NU.cx || NU_REDUCED || document.hidden) {
      if (!NU.mode && NU.cv) NU.cv.style.display = "none";
      return;
    }
    if (!NU.last) NU.last = ts;
    var dt = Math.min(.05, (ts - NU.last) / 1000 || .016);
    NU.last = ts;
    NU.cx.clearRect(0, 0, NU.W, NU.H);
    nuTick(dt, ts / 1000);
    nuPaint();
    NU.raf = requestAnimationFrame(nuLoop);
  }
  function nuansaSet(mode) {
    if (NU_REDUCED) mode = null;   // hormati prefers-reduced-motion: mati total
    if (mode === NU.mode) return;
    NU.mode = mode || null;
    NU.parts.length = 0; NU.wind = 0;
    NU.k.next = 0; NU.k.pts = null; NU.k.t0 = -9;   // reset kilat saat ganti mode
    if (!NU.mode) { if (NU.cv) NU.cv.style.display = "none"; return; }
    nuInit();
    NU.cv.style.display = "block";
    var m = NU.mode;
    var jenis = m === "netral" ? ["snow"] : m === "long" ? ["pulsa"] :
                m === "altseason" ? ["debuneon"] : m === "short" ? ["driz"] :
                m === "crash" ? ["bara", "api"] : ["debu"];
    jenis.forEach(function (k) {
      var c = NU_KEDALIM[k] || 24;
      // prefill separuh dgn posisi menyebar biar layar langsung penuh;
      // sisanya lahir di pinggir pelan-pelan — animasi mulai penuh, tak kosong dulu
      var pre = k === "api" ? c : Math.round(c * .55);
      for (var q = 0; q < pre; q++) nuSpawn(k, true);
    });
    if (!NU.raf && !document.hidden && NU.cx) { NU.last = 0; NU.raf = requestAnimationFrame(nuLoop); }
  }

  function arrow(s) { return s === "naik" ? "\u2191" : s === "turun" ? "\u2193" : "\u2192"; }
  function gauge() {
    var A = DATA.altdir;
    // ⚠️⚠️ 14 Sep — dulu: display:none saat altdir kosong. Blok ini lalu LENYAP
    // TANPA JEJAK ketika engine (yang masih memegang modul lama di memori)
    // menimpa data.json dgn versi tanpa `altdir`. Dari luar itu terlihat persis
    // seperti "pembaruan tidak terpasang". Sekarang ia MENGUMUMKAN dirinya rusak.
    if (!A) {
      $("#g-fl").innerHTML = ""; $("#g-arc").innerHTML = ""; $("#g-ndl").innerHTML = "";
      $("#glow").style.background = "none";
      var gb0 = $("#gbias"); gb0.textContent = "NO DATA"; gb0.style.color = "var(--gold)";
      $("#gname").textContent = "altdir missing from data.json";
      $("#dmeta").innerHTML = "";
      return;
    }
    gaugeStatik();
    var bias = (A.bias || "netral").toLowerCase();
    var col = GC[bias] || GC.netral;
    var v = GPOS.hasOwnProperty(A.kode) ? GPOS[A.kode] : 0;
    var deg = 90 - v * 90;
    var g = $("#ndl-g");
    g.setAttribute("transform", "rotate(" + (90 - deg).toFixed(2) + " " + GA + " " + GB + ")");
    g.querySelectorAll("path,circle").forEach(function (e, i) {
      if (i < 2) { e.setAttribute("fill", col); e.setAttribute("stroke", "none"); }
    });
    $("#g-fl").querySelectorAll(".fl").forEach(function (e) { e.setAttribute("fill", col); });
    $("#glow").style.background = "radial-gradient(circle, " + col + "55 0%, transparent 68%)";
    var lab = bias === "long" ? "LONG" : bias === "short" ? "SHORT" : "NEUTRAL";
    var gb = $("#gbias"); gb.textContent = lab; gb.style.color = col;
    $("#gname").textContent = A.nama || "altcoin direction";

    var m = $("#dmeta"); m.innerHTML = "";
    function r(l, v2, c) {
      var x = el("div", "dr");
      x.appendChild(el("span", "l", l));
      x.appendChild(el("span", "d"));
      x.appendChild(el("span", "v " + (c || ""), v2));
      m.appendChild(x);
    }
    r("BTC", arrow(A.btc) + "  " + sgn(A.btc_chg, 2) + "%", A.btc_chg < 0 ? "neg" : "pos");
    r("BTC.D", arrow(A.btcd) + "  " + sgn(A.d_btcd, 2) + "pp \u2192 " + A.btcd_now + "%", "mut");
    r("USDT.D", arrow(A.usdtd) + "  " + sgn(A.d_usdtd, 2) + "pp \u2192 " + A.usdtd_now + "%", "mut");
    r("regime", A.nama || "--", "");
    r("bias (table)", lab, "");
    if (A.bias_data) {
      var bd = A.bias_data.toLowerCase();
      r("bias (measured 365d)",
        bd === "netral" ? "NEUTRAL" : bd.toUpperCase(), "mut");
    }
    /* 15 Okt (permintaan user): catatan penjelasan panjang dihapus — situs bersih */
    gaugeLivePaint();
  }
  function btc1h(cb) {
    if (GBTC.rows && Date.now() - GBTC.at < 5 * 60e3) { cb(GBTC.rows); return; }
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var to = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
    fetch("https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=1h&limit=120",
        { signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw 0; clearTimeout(to); return r.json(); })
      .then(function (k) {
        GBTC.rows = k.slice(0, -1).map(function (x) { return { h: +x[2], l: +x[3], c: +x[4] }; });
        GBTC.at = Date.now();
        cb(GBTC.rows);
      })
      .catch(function () { clearTimeout(to); cb(GBTC.rows); });
  }
  /* 16 Okt — PREVIEW gauge: tombol ◀▶ di sebelah label arah. Siklus
     LIVE → LONG → SHORT → ALTSEASON → CRASH supaya gaya aura (api terang
     besar / merah berdarah terbakar) bisa dinilai kapan saja tanpa menunggu
     kondisi itu memang terjadi. Panel dmeta ikut menampilkan data sintetis
     yang ditandas "MODE PREVIEW" — nilai engine asli tidak tersentuh. */
  var PVMODE = null, PVF = null, PVLIVE = null, PVELbl = null, PVPAINT = null;
  function pvFake(mode) {
    var b = mode === "long" || mode === "altseason";
    return { status: mode, bias: mode,
      scoreRaw: b ? 6 : -6, score: b ? 6 : -6,
      usdtDir: b ? 1 : -1, dUsdtDominan: 0,
      dirBtc: b ? 1 : -1, maj: b ? 4 : -4,
      nMaj: 8, nLong: b ? 6 : 2, nShort: b ? 2 : 6,
      why: "MODE PREVIEW — tombol ◀▶ gauge; desk skor asli tetap dari engine",
      degraded: false };
  }
  function pvStep(d) {
    var list = [null, "long", "short", "altseason", "crash"];
    var i = list.indexOf(PVMODE);
    i = (i + d + list.length) % list.length;
    PVMODE = list[i];
    PVF = PVMODE ? pvFake(PVMODE) : null;
    if (window.__gwrap) window.__gwrap.classList.toggle("pv-on", !!PVF);
    if (PVELbl) PVELbl.textContent = PVF ? PVF.status.toUpperCase() : "LIVE";
    if (PVF) PVPAINT(PVF); else if (PVLIVE && PVPAINT) PVPAINT(PVLIVE);
  }
  function gaugeLivePaint() {
    if (!DATA || !DATA.altdir) return;
    var A = DATA.altdir;
    PVPAINT = paint;                      // pvStep (scope luas) butuh jalur ini;
    function paint(V) {                   // di-set sinkron — klik ◀▶ bisa diidinap
      if (PVF) V = PVF; else PVLIVE = V;   // preview menimpa; asli disimpan
      GLIVE = V;
      /* 23 Sep v32 — FRESHNESS GATE: input basi (BTC >15 mnt / gelombang grup
         >8 jam) → jarum netral + label DEGRADED, bukan arah palsu. Skor tetap
         dihitung engine (bot & logika tak berubah) — hanya tampilan yang jujur. */
      /* 16 Okt — keadaan darurat sweep menembus freshness gate: engine
         menghitung crash dari klines segar (sweepCrash), bukan CSV grup
         yang basi — menampilkannya DEGRADED berarti menyembunyikan alarm. */
      var DEG = (!!V.degraded && !V.sweepCrash) || V.status === "deg";
      var st = DEG ? "deg" : (V.status || V.bias || "netral");
      temaChip();     // baris chips pratinjau — dibangun sekali, self-guard
      /* 15 Okt — latar halaman ikut kondisi gauge (pratinjau menimpa live);
         16 Okt — partikel nuansa ikut berganti lebih dalam temaApply */
      temaApply(PRATINJAU_TEMA || st, !!PRATINJAU_TEMA);
      var col = GC[st] || GC[V.bias] || GC.netral;
      var NAMA = { long: "LONG", altseason: "ALTSEASON", netral: "NETRAL",
                   short: "SHORT", crash: "CRASH", deg: "DEGRADED" };
      var lab = NAMA[st] || st.toUpperCase();
      var v = DEG ? 0 : Math.max(-1, Math.min(1, (V.scoreRaw || V.score || 0) / 6)) * .85;   // v34: |skor| maks praktis ±6 → skala jarum baru
      var deg = 90 - v * 90;
      var g = $("#ndl-g");
      if (g) {
        g.setAttribute("transform", "rotate(" + (90 - deg).toFixed(2) + " " + GA + " " + GB + ")");
        g.querySelectorAll("path,circle").forEach(function (e, i) {
          if (i < 2) { e.setAttribute("fill", col); e.setAttribute("stroke", "none"); }
        });
      }
      $("#g-fl").querySelectorAll(".fl").forEach(function (e) { e.setAttribute("fill", col); });
      $("#glow").style.background = "radial-gradient(circle, " + col + "55 0%, transparent 68%)";
      /* 15 Okt — aura ekstrem: ALTSEASON api lebih terang & besar; CRASH api
         merah berdarah dgn aura terbakar besar (kelas .st-alt / .st-crash). */
      var gw = document.querySelector(".gwrap"), gf = $("#g-fl");
      if (gw) {
        gw.classList.toggle("st-alt", st === "altseason");
        gw.classList.toggle("st-crash", st === "crash");
      }
      if (gf) {
        gf.classList.toggle("st-alt", st === "altseason");
        gf.classList.toggle("st-crash", st === "crash");
        /* 15 Okt (uji live) — durasi tiap api di-set INLINE (bawah), jadi
           override .gwrap.st-alt .fl di CSS tidak pernah menang. Skala durasi
           dari sini: julur altseason 0.62× (lebih cepat, hidup), crash 0.5×
           (mengamuk). */
        var FAK = st === "crash" ? .5 : st === "altseason" ? .62 : 1;
        gf.querySelectorAll(".fl").forEach(function (e) {
          if (!e.dataset.bd) e.dataset.bd = parseInt(e.style.animationDuration) || 1700;
          e.style.animationDuration = Math.round(e.dataset.bd * FAK) + "ms";
        });
      }
      var bA = $("#gbias"); bA.textContent = lab + (PVF ? " · PREVIEW" : " · LIVE"); bA.style.color = col;
      if (DEG && V.degrade_reason) bA.title = "input basi: " + V.degrade_reason;
      /* 21 Sep — gname = keterangan sumber arah, BUKAN rezim backtest.
         Dulu menampilkan nama rezim tabel stale (mis. "SANGAT BULLISH
         (altseason)" dari log berhari-hari lalu) persis di bawah label LIVE —
         terbaca seperti gauge berkata dua hal bertentangan sekaligus. */
      $("#gname").textContent = "arah live · dominan USDT.D (engine reclaim 2 jam) + mayoritas + BTC";
      var m = $("#dmeta"); m.innerHTML = "";
      function r(l, v2, c) {
        var x = el("div", "dr");
        x.appendChild(el("span", "l", l));
        x.appendChild(el("span", "d"));
        x.appendChild(el("span", "v " + (c || ""), v2));
        m.appendChild(x);
      }
      var ar = function (d) { return d > 0 ? "↑" : d < 0 ? "↓" : "→"; };
      var fc = function (d) { return d > 0 ? "pos" : d < 0 ? "neg" : "mut"; };
      /* 24 Sep — format umur data (detik → teks), sama dgn _umur_txt engine */
      var umur = function (s) {
        s = Math.max(0, Math.floor(+s || 0));
        if (s < 90) return s + " detik";
        if (s < 3600) return Math.round(s / 60) + " mnt";
        var j = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return m < 5 ? j + " jam" : j + " jam " + m + " mnt";
      };
      /* 25 Sep v33 — baris status: nama + alasan 1 kalimat dari hitungStatus */
      if (!DEG && V.status) {
        r("status", NAMA[V.status] || V.status.toUpperCase(),
          V.status === "altseason" || V.status === "long" ? "pos"
          : V.status === "crash" || V.status === "short" ? "neg" : "mut");
        if (V.why) r("kondisi", V.why, "mut");
      }
      /* 15 Okt revisi-2 — komponen dominan: USDT.D reclaim 2H, bobot
         asimetris dgn backtest (bullish→SHORT ±4 · 92%; bearish→LONG −2 · 47%);
         sinyal/watchlist HARVEST 2h ditampilkan sebagai konfirmasi ±3. */
      r("USDT.D (dominan)",
        (V.usdtDir > 0 ? "↓ turun — LONG " : V.usdtDir < 0 ? "↑ naik — SHORT " : "→ datar ")
        + "→ dU " + sgn(V.dUsdtDominan, 1),
        V.usdtDir > 0 ? "pos" : V.usdtDir < 0 ? "neg" : "mut");
      if (V.harvest) {
        var hlv = V.harvest;
        r("HARVEST 2H (konfirmasi)",
          "SINYAL " + (hlv.sym || "").replace(/USDT$/, "") + " " + (hlv.dir || "").toUpperCase()
          + (V.harvestAge != null ? " · " + umur(V.harvestAge) + " lalu" : "")
          + " → dHv " + sgn(V.dHv, 1),
          hlv.dir === "long" ? "pos" : "neg");
      } else if (V.harvestWatch) {
        r("HARVEST 2H (konfirmasi)",
          "watchlist pending — bias " + (V.harvestWatch > 0 ? "LONG" : "SHORT")
          + " → dHv " + sgn(V.dHv, 1),
          V.harvestWatch > 0 ? "pos" : "neg");
      } else {
        r("HARVEST 2H (konfirmasi)", "tidak ada sinyal terbuka / watchlist baru", "mut");
      }
      if (DEG) {
        r("status data", "DEGRADED — " + (V.degrade_reason || "input basi"), "warn");
        r("skor terakhir", sgn(V.score, 0) + " (dari data basi — tidak dipakai)", "mut");
        return;                          // baris detail arah disembunyikan saat degraded
      }
      var bp = bbTicker("BTCUSDT");
      if (bp === null || !isFinite(bp)) bp = (V.btc24h != null) ? V.btc24h : A.btc_chg;
      /* 23 Sep v31 — baris utama = MAYORITAS grup gelombang terakhir (sumber
         sama dgn pesan yang masuk grup WA), lalu BTC 1h. BTC.D/USDT.D DIHAPUS
         total (permintaan user): gauge = BTC + mayoritas reclaim, titik. */
      r("mayoritas grup",
        V.nMaj > 0
          ? V.nLong + "L · " + V.nShort + "S → " + sgn(V.maj, 0)
          : "— belum ada gelombang tercatat",
        V.maj > 0 ? "pos" : V.maj < 0 ? "neg" : "mut");
      r("BTC 1h", ar(V.dirBtc) + "  " + sgn(bp, 2) + "%" + (V.btc24h != null ? " (24 jam)" : ""), bp < 0 ? "neg" : "pos");
      /* 28 Sep v34 — rincian faktor: mayoritas, BTC, BTC.D, USDT.D (Δ3 jam) */
      if (V.domAda || V.btcD != null) r("BTC.D", ar(V.sBtcd || 0) + " " + sgn(V.sBtcd, 2) + "pp (3 jam)" + (V.btcDNow != null ? " → " + sgn(V.btcDNow, 2) + "%" : ""), fc(V.sBtcd || 0));
      else r("BTC.D", "— tidak tersedia", "mut");
      if (V.domAda || V.usdtD != null) r("USDT.D", ar(V.sUsdtd || 0) + " " + sgn(V.sUsdtd, 2) + "pp (3 jam)" + (V.usdtDNow != null ? " → " + sgn(V.usdtDNow, 2) + "%" : ""), fc(-(V.sUsdtd || 0)));
      else r("USDT.D", "— tidak tersedia", "mut");
      if (V.pubTs) r("dihitung engine", V.pubTs + " WIB", "mut");
      /* 24 Sep — umur data sumber saat NORMAL: biar terlihat segar/tidaknya
         input gauge (BTC 1h & gelombang grup) tanpa harus nunggu degrade.
         Warna: hijau = jauh dari batas degrade, kuning = ≥60% menuju batas
         (BTC 15 mnt, gelombang grup 8 jam — batas sama dgn engine v32). */
      if (V.ageBtc != null && V.ageMaj != null) {
        var ub = +V.ageBtc || 0, ug = +V.ageMaj || 0;
        r("umur data", "BTC " + umur(ub) + " lalu · gelombang grup " + umur(ug) + " lalu",
          (ub > 540 || ug > 17280) ? "warn" : "pos");
      }
      /* sparkline riwayat arah per jam (48 jam terakhir, dari engine) */
      (function () {
        var H = DATA.altdir_hist || [];
        if (H.length < 2) return;
        var W = 210, Hh = 34, pad = 3;
        var colmap = { long: "var(--up)", short: "var(--dn)", netral: "#8B968F" };
        var NS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 " + W + " " + Hh);
        svg.setAttribute("width", W); svg.setAttribute("height", Hh);
        svg.style.verticalAlign = "middle";
        var n = H.length;
        function cx(i) { return pad + i * (W - 2 * pad) / (n - 1); }
        function cy(sc) { return Hh / 2 - Math.max(-1, Math.min(1, sc / 2)) * (Hh / 2 - pad); }
        var pts = "", i;
        for (i = 0; i < n; i++) pts += cx(i).toFixed(1) + "," + cy(H[i].score).toFixed(1) + " ";
        var pl = document.createElementNS(NS, "polyline");
        pl.setAttribute("points", pts);
        pl.setAttribute("fill", "none");
        pl.setAttribute("stroke", "rgba(139,150,143,.55)");
        pl.setAttribute("stroke-width", "1.2");
        svg.appendChild(pl);
        var base = document.createElementNS(NS, "line");
        base.setAttribute("x1", pad); base.setAttribute("x2", W - pad);
        base.setAttribute("y1", Hh / 2); base.setAttribute("y2", Hh / 2);
        base.setAttribute("stroke", "rgba(139,150,143,.25)");
        base.setAttribute("stroke-dasharray", "2 3");
        svg.appendChild(base);
        for (i = 0; i < n; i++) {
          var c = document.createElementNS(NS, "circle");
          c.setAttribute("cx", cx(i).toFixed(1)); c.setAttribute("cy", cy(H[i].score).toFixed(1));
          c.setAttribute("r", i === n - 1 ? 2.6 : 1.4);
          c.setAttribute("fill", colmap[H[i].bias] || colmap.netral);
          var tt = document.createElementNS(NS, "title");
          var dt = new Date(H[i].t * 1000);
          tt.textContent = (dt.getUTCHours() + 7) % 24 + ".00 WIB — " + H[i].bias.toUpperCase()
            + " (skor " + H[i].score + ")";
          c.appendChild(tt);
          svg.appendChild(c);
        }
        var x = el("div", "dr");
        x.appendChild(el("span", "l", "riwayat " + n + " jam"));
        x.appendChild(el("span", "d"));
        var vs = el("span", "v mut");
        vs.appendChild(svg);
        x.appendChild(vs);
        m.appendChild(x);
      })();
      r("reclaim terakhir",
        "mayoritas " + sgn(V.maj, 0) + " + BTC " + ar(V.dirBtc)
        + " − BTC.D " + ar(V.sBtcd || 0) + " − USDT.D " + ar(V.sUsdtd || 0)
        + " → skor " + sgn(V.scoreRaw != null ? V.scoreRaw : V.score, 1),
        V.bias === "long" ? "pos" : V.bias === "short" ? "neg" : "mut");
      /* 21 Sep — momentum BTC 24 jam eksplisit: penyeimbang penalti dominan.
         Dulu tidak dirinci, jadi BTC naik kencang + dominan bergerak terlihat
         seperti "SHORT tanpa alasan" di panel. */
      var btcMom = (V.btc24h != null) ? V.btc24h
        : (isFinite(bp) ? bp : (A.btc_chg != null ? A.btc_chg : null));
      if (btcMom != null && isFinite(btcMom))
        r("momentum BTC", sgn(btcMom, 2) + "% (24 jam)", btcMom > 0 ? "pos" : btcMom < 0 ? "neg" : "mut");
      /* 15 Okt (permintaan user): catatan panjang dihapus — panel bersih */
    }
    /* 16 Okt — tombol preview ◀▶ (sekali per render; id-guard) */
    var gw = document.querySelector(".gwrap");
    if (gw) window.__gwrap = gw;
    if (gw && !document.getElementById("gpv")) {
      var pv = el("div", "gpv"); pv.id = "gpv";
      var gl = el("button", "gpb"); gl.type = "button"; gl.textContent = "◀"; gl.title = "kondisi sebelumnya";
      var gr = el("button", "gpb"); gr.type = "button"; gr.textContent = "▶"; gr.title = "kondisi berikutnya (LIVE→LONG→SHORT→ALTSEASON→CRASH)";
      PVELbl = el("span", "gplab", PVF ? PVF.status.toUpperCase() : "LIVE");
      gl.addEventListener("click", function () { pvStep(-1); });
      gr.addEventListener("click", function () { pvStep(1); });
      pv.appendChild(gl); pv.appendChild(PVELbl); pv.appendChild(gr);
      var gnameEl = $("#gname");
      (gnameEl && gnameEl.parentNode || gw).insertBefore(pv, gnameEl ? gnameEl.nextSibling : gw.firstChild);
      gw.classList.toggle("pv-on", !!PVF);
    }
    /* 20 Sep v28: nilai arah dihitung JUGA di engine (dashboard_data →
       altdir_live, logika rcl identik) dan diterbitkan di data.json.
       Semua device sekarang mulai dari nilai yang SAMA; device yang bisa
       mencapai Binance/CoinGecko menyegarkan real-time di atasnya. */
    var pub = DATA.altdir_live;
    if (pub && (pub.src && (pub.src.btc || pub.src.maj || pub.src.dom))) {
      var V0 = { dirBtc: pub.dirBtc || 0,
              maj: pub.maj || 0, nLong: pub.nLong || 0, nShort: pub.nShort || 0,
              nMaj: pub.nMaj || 0,
              pubTs: pub.ts, btc24h: pub.btc24h,
              degraded: !!pub.degraded, degrade_reason: pub.degrade_reason || "",
              ageBtc: pub.age_btc_s, ageMaj: pub.age_maj_s };
      /* v33: dominan diambil browser (CoinGecko, cache 15 mnt) — bila gagal,
         gauge tetap jalan 3 faktor dgn keterangan "tanpa data dominan". */
      domGlobal(function (D) {
        if (D) {
          V0.btcD = D.btcd; V0.sBtcd = D.btcd; V0.btcDNow = D.btcdNow;
          V0.usdtD = D.usdtd; V0.sUsdtd = D.usdtd; V0.usdtDNow = D.usdtdNow;
          V0.domAda = true;
        }
        usdtDseri(function (rc) {
          if (rc != null) V0.usdtRcl = rc;
          hitungStatus(V0);
          paint(V0);
        });
      });
    }
    btc1h(function (rows) {
      /* 23 Sep v31 — penyegaran real-time: mayoritas diambil dari engine
         (browser tak punya CSV grup), dirBtc dihitung ulang dari klines live.
         25 Sep v33 — BTC.D & USDT.D ikut di-refresh real-time (domGlobal,
         cache 15 mnt) dan klasifikasi pakai hitungStatus: 6 status dgn
         ALTSEASON/CRASH menuntut konfirmasi dominan + momentum BTC. */
      var pub2 = DATA.altdir_live || {};
      var V = { dirBtc: 0,
                maj: pub2.maj || 0, nLong: pub2.nLong || 0, nShort: pub2.nShort || 0, nMaj: pub2.nMaj || 0,
                /* v32: status degraded engine selalu dihormati — refresh browser
                   tak boleh menyembunyikan gate (BTC segar di browser ≠ gelombang
                   grup segar di engine) */
                degraded: !!pub2.degraded, degrade_reason: pub2.degrade_reason || "",
                ageBtc: pub2.age_btc_s, ageMaj: pub2.age_maj_s };
      if (rows && rows.length > 30) {
        V.dirBtc = rclSweep(rows.map(function (r) { return r.h; }),
                             rows.map(function (r) { return r.l; }),
                             rows.map(function (r) { return r.c; }), .01)
          || rclSlope(rows.map(function (r) { return r.c; }), 24, .3);
        if (rows.length > 25) V.btc24h = Math.round((rows[rows.length-1].c / rows[rows.length-25].c - 1) * 10000) / 100;
      }
      domGlobal(function (D) {
        if (D) {
          V.btcD = D.btcd; V.sBtcd = D.btcd; V.btcDNow = D.btcdNow;
          V.usdtD = D.usdtd; V.sUsdtd = D.usdtd; V.usdtDNow = D.usdtdNow;
          V.domAda = true;
        }
        usdtDseri(function (rc) {
          if (rc != null) V.usdtRcl = rc;
          hitungStatus(V);
          if (rows && rows.length > 30 && !V.degraded) paint(V);   // v32: degraded tetap tampil dari engine
        });
      });
    });
  }
  /* ===== PENENTU ARAH LIVE — engine reclaim 1 jam =====
     Replikasi _detect_sweep + _find_pivots (smc_engine): pivot order 3,
     sweep di luar level ±EPS 0.15%, MAX_WAIT 48 bar. Tiga pemilih:
     BTC (klines Binance 1h) + BTC.D & USDT.D (share mcap CoinGecko dari
     basket 5 koin besar, di-anchor ke nilai sejati dari /global).
     Arah alt: BTC mengikuti arahnya; BTC.D / USDT.D naik = menekan alts. */
  var RCL = { order: 3, eps: 0.0015, maxWait: 48 };
  var GLIVE = null;   // hasil arah live terakhir (untuk debug/inspeksi)
  var GD = { at: 0, btcd: null, usdtd: null, btcdNow: 0, usdtdNow: 0 };
  var GBTC = { at: 0, rows: null };
  function rclPivots(hi, lo, minMove) {
    var n = hi.length; if (n < RCL.order * 2 + 3) return [];
    var raw = [];
    for (var i = RCL.order; i < n - RCL.order; i++) {
      var hm = -1e18, lm = 1e18;
      for (var k = i - RCL.order; k <= i + RCL.order; k++) {
        if (hi[k] > hm) hm = hi[k];
        if (lo[k] < lm) lm = lo[k];
      }
      if (hi[i] >= hm - 1e-10) raw.push({ type: "high", price: hi[i], idx: i });
      if (lo[i] <= lm + 1e-10) raw.push({ type: "low", price: lo[i], idx: i });
    }
    var alt = [];
    raw.forEach(function (p) {
      if (!alt.length) { alt.push(p); return; }
      if (alt[alt.length - 1].type === p.type) {
        if (p.type === "high" && p.price > alt[alt.length - 1].price) alt[alt.length - 1] = p;
        else if (p.type === "low" && p.price < alt[alt.length - 1].price) alt[alt.length - 1] = p;
      } else alt.push(p);
    });
    var out = [];
    alt.forEach(function (p) {
      if (!out.length) { out.push(p); return; }
      var mv = Math.abs(p.price - out[out.length - 1].price) / Math.max(out[out.length - 1].price, 1e-10);
      if (mv >= minMove) out.push(p);
      else if (p.type === "high" && p.price > out[out.length - 1].price) out[out.length - 1] = p;
      else if (p.type === "low" && p.price < out[out.length - 1].price) out[out.length - 1] = p;
    });
    return out;
  }
  /* arah sweep+reclaim pada bar tertutup terakhir: +1 bull, -1 bear, 0 netral.
     Engine asli: sweep & reclaim di bar yang SAMA (lo[cur] menembus level,
     close balik). Untuk seri close-only (dominan) dipakai kedalaman sweep
     dari 6 bar sebelumnya. */
  function rclSweep(hi, lo, cl, minMove, win) {
    var n = cl.length; if (n < RCL.order * 2 + 6) return 0;
    var cur = n - 1, piv = rclPivots(hi, lo, minMove);
    var w0 = Math.max(RCL.order + 1, cur - (win || 6));
    var loMin = Math.min.apply(null, lo.slice(w0, cur));
    var hiMax = Math.max.apply(null, hi.slice(w0, cur));
    for (var i = piv.length - 1; i >= 0; i--) {
      var p = piv[i];
      if (p.idx >= cur || p.idx + RCL.order > cur) continue;
      if (cur - p.idx > RCL.maxWait) break;
      if (p.type === "low") {
        if ((lo[cur] < p.price * (1 - RCL.eps) || loMin < p.price * (1 - RCL.eps)) && cl[cur] > p.price) return 1;
      } else {
        if ((hi[cur] > p.price * (1 + RCL.eps) || hiMax > p.price * (1 + RCL.eps)) && cl[cur] < p.price) return -1;
      }
    }
    return 0;
  }
  /* fallback peka: arah momentum di antara dua sweep supaya jarum tidak tidur */
  function rclSlope(c, n, thr) {
    if (!c || c.length < n + 1) return 0;
    var d = (c[c.length - 1] - c[c.length - 1 - n]) / c[c.length - 1 - n] * 100;
    return d > thr ? 1 : d < -thr ? -1 : 0;
  }
  /* ═══ 25 Sep v33 — DOMINAN KEMBALI (permintaan user): BTC.D & USDT.D ═══
     Dihapus di v31 atas permintaan yang lama; kini diminta lagi sebagai
     faktor gauge. Sumber sama seperti sebelum dihapus: CoinGecko /global
     (market_cap_percentage.btc + anchor baseline v6) + market_chart BTC
     14 hari (varians) — hash keduanya utk delta & arah. Cache 15 mnt.
     Bila CoinGecko kebanjiran 429: cache terakhir dipakai selama 24 jam,
     kalau benar-benar kosong gauge otomatis DEGRADED (tidak mengarang). */
  function domGlobal(cb) {
    function jadi(dBtc, dUsdt, anchorBtc, usdtdNow) {
      if (GD.btcd == null && isFinite(dBtc)) {
        GD.btcd = dBtc; GD.usdtd = dUsdt;
        GD.btcdNow = anchorBtc; GD.usdtdNow = usdtdNow;
        GD.at = Date.now();
      }
      cb(GD.btcd != null ? GD : null);
    }
    if (GD.at && Date.now() - GD.at < 15 * 60e3) { cb(GD); return; }
    /* gone: CoinGecko gagal (mis. 429). Cadangan CoinPaprika /global — punya
       BTC.D sekarang saja (tanpa seri delta → delta 0, arah →): gauge tetap
       punya faktor dominan nilai-nya, klasifikasi ekstrem tetap konservatif.
       Bila dua-duanya gagal → null (baris dominan: tidak tersedia). */
    var gone = function () {
      if (GD.btcd != null) { cb(GD); return; }                     // cache 24 jam
      fetch("https://api.coinpaprika.com/v1/global")
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (p) {
          if (p && p.bitcoin_dominance_percentage) {
            GD.btcd = 0; GD.usdtd = null;                          // delta tak diketahui
            GD.btcdNow = +p.bitcoin_dominance_percentage;
            GD.usdtdNow = 0;
            GD.at = Date.now();
            cb(GD);
          } else cb(null);
        });
    };
    fetch("https://api.coingecko.com/api/v3/global")
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (g) {
        var d = g && g.data; if (!d) throw 0;
        var usdtdNow = +d.market_cap_percentage.usdt || 0;   /* kunci CoinGecko = "usdt" */
        var anchorBtc = +d.market_cap_percentage.btc || 0;
        function caps3hari(slug, done) {
          fetch("https://api.coingecko.com/api/v3/coins/" + slug
            + "/market_chart?vs_currency=usd&days=14&interval=daily")
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (mc) {
              if (!mc || !mc.market_caps || mc.market_caps.length < 5) { done(null); return; }
              var caps = mc.market_caps.map(function (x) { return x[1]; });
              var n = caps.length;
              var ref = caps[n - 4] != null ? caps[n - 4] : caps[0];  // 3 hari lalu
              done(ref ? (caps[n - 1] / ref - 1) * 100 : null);        // Δ% 3 hari
            });
        }
        caps3hari("bitcoin", function (dBtc) {
          if (dBtc == null) { gone(); return; }
          /* USDT.D: tak ada seri gratis — pakai arus relatif 3 hari
             (kap USDT vs kap BTC) sbg proksi; nilai sekarang tetap asli
             dari /global. Cukup utk arah ↑/↓ gauge. */
          caps3hari("tether", function (dUsdtCap) {
            var dUsdt = dUsdtCap == null ? 0 : (dUsdtCap - dBtc);
            jadi(dBtc, dUsdt, anchorBtc, usdtdNow);
          });
        });
      })
      .catch(gone);
  }
  /* ═══ 11 Okt v35 — NILAI TETAP GAUGE (keluhan user: "terlalu sensitif") ══
     Rumus skor tetap 4 faktor, tapi:
       • USDT.D dikompresi ×0.5 (proksi 3 hari tak setara data per jam)
       • ambang: LONG ≥±3 (dulu ±2) · ALTSEASON/CRASH ≥±6 (dulu ±5)
       • konfirmasi keluar netral & balik arah ditangani engine (data.json
         altdir_live.bias sudah melewati gate v35 — browser cuma mengikuti;
         bila tanpa data engine, browser memakai baris "tahan" di bawah).
     Sinkron dengan gauge_live.py v35 — satu sumber kebenaran. */
  var G35 = { thLong: 3, thShort: -3, thExtreme: 6, usdtW: 0.5 };
  /* ═══ 15 Okt revisi-2 — SERI USDT.D utk detektor reclaim (V.usdtRcl) ══
     Sumber: DefiLlama stablecoins API (gratis, tanpa kunci, rate-limit santai):
       • /stablecoincharts/all?stablecoin=1  → pasokan USDT harian (sejak 2014)
       • /stablecoincharts/all               → pasokan total stablecoin harian
     USDT.D = pasokan USDT ÷ pasokan total ×100 — proksi harian dari seri
     dominasi yang dibacktest (92% sisi SHORT / 47% sisi LONG). Rata-rata
     harian, jadi sinyal bisa telat beberapa jam vs grafik 2H TradingView.
     Cache 6 jam (data harian tak perlu lebih sering); gagal → null →
     gauge jatuh ke fallback Δ3j USDT.D seperti semula. */
  var USDTS = { at: 0, dir: null };
  function usdtDseri(cb) {
    if (USDTS.at && Date.now() - USDTS.at < 6 * 3600e3) { cb(USDTS.dir); return; }
    function ambil(url, done) {
      fetch(url).then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }).then(done);
    }
    ambil("https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=1", function (u) {
      if (!u || u.length < 60) { USDTS.at = Date.now(); cb(USDTS.dir); return; }
      ambil("https://stablecoins.llama.fi/stablecoincharts/all", function (t) {
        if (!t || t.length < 60) { USDTS.at = Date.now(); cb(USDTS.dir); return; }
        var mu = {}, mt = {};
        u.forEach(function (x) {
          var d = new Date(x.date * 1000).toISOString().slice(0, 10);
          mu[d] = x.totalCirculating && x.totalCirculating.peggedUSD;
        });
        t.forEach(function (x) {
          var d = new Date(x.date * 1000).toISOString().slice(0, 10);
          mt[d] = x.totalCirculating && x.totalCirculating.peggedUSD;
        });
        var hari = Object.keys(mu).filter(function (d) { return mt[d] && mu[d]; }).sort();
        if (hari.length < 60) { USDTS.at = Date.now(); cb(USDTS.dir); return; }
        var s = hari.map(function (d) { return mu[d] / mt[d] * 100; });
        // detektor sama dgn backtest: sweep+reclaim di seri harian dominasi
        USDTS.dir = rclSweep(s, s, s, .002) || 0;
        USDTS.at = Date.now();
        cb(USDTS.dir);
      });
    });
  }
  function hitungStatus(V) {
    /* 15 Okt revisi-2 — GAUGE DIDOMINASI USDT DOMINANCE (USDT.D): dominan =
       RECLAIM 2H pada grafik USDT.D itu sendiri (detektor DefiLlama).
       USDT.D bullish (reclaim swing high) → pasar SHORT/CRASH; bearish
       (breakdown swing low) → LONG/ALTSEASON (butuh konfirmasi, sisi ini
       cuma 47% di backtest). Komponen 2h/mayoritas/BTC tinggal ±1–3. */
    var S2 = (DATA && DATA.live && DATA.live["2h"]) || {};
    var sig2 = S2.sinyal || [], wat2 = S2.pantau || [];
    var dom = null;
    for (var i2 = sig2.length - 1; i2 >= 0; i2--) {
      var s2 = sig2[i2];
      if (s2 && s2.st === "fired" && (s2.dir === "long" || s2.dir === "short")) { dom = s2; break; }
    }
    /* konfirmasi: sinyal terbuka ±3; tanpa sinyal → 3 watchlist ±3 (skala) */
    var dHv = dom ? (dom.dir === "long" ? 3 : -3) : 0;
    var wdom = 0;
    if (!dom && wat2.length) {
      var mw = 0;
      for (var j2 = Math.max(0, wat2.length - 3); j2 < wat2.length; j2++) {
        var w2 = wat2[j2];
        if (w2 && w2.dir === "long") mw++; else if (w2 && w2.dir === "short") mw--;
      }
      if (mw !== 0) wdom = (mw > 0 ? 3 : -3) * Math.min(1, Math.abs(mw) / 2);
    }
    var domAge = null;
    if (dom) {
      var t2 = Date.parse(String(dom.ts).replace(" ", "T") + "+07:00");
      if (!isNaN(t2)) domAge = Math.max(0, (Date.now() - t2) / 1000);
    }
    V.harvest = dom; V.harvestWatch = wdom; V.harvestAge = domAge; V.dHv = dHv;
    /* ── KONFIRMASI: sinyal/watchlist HARVEST 2h (bukan komponen utama) ──
       Komponen utama = USDT.D reclaim (dibawah); 2h hanya konfirmasi ±3. */
    var dUraw = +V.sUsdtd || 0, dUproyek = (V.usdtDNow != null) ? +V.usdtDNow : null;
    /* 15 Okt revisi-2 (koreksi user) — dominan = RECLAIM 2H PADA GRAFIK
       USDT.D itu sendiri (detektor sweep+reclaim atas seri dominasi dari
       DefiLlama). Backtest 18 bln: sisi USDT-bullish→SHORT 92% (KUAT),
       sisi USDT-bearish→LONG 47% (LEMAH — dipakai hanya sbg penimbang). */
    var dirUsdt;
    if (V.usdtRcl != null && V.usdtRcl !== 0) dirUsdt = V.usdtRcl;   // +1 = USDT.D bullish (bearish pasar), −1 = bearish (bullish pasar)
    else dirUsdt = dUraw < -0.05 ? 1 : dUraw > 0.05 ? -1 : 0;
    /* bobot komposit: sisi kuat ±4 (diuji 92%), sisi lemah −2 (47%) */
    var dUDominan = dirUsdt > 0 ? 4 : dirUsdt < 0 ? -2 : 0;
    V.usdtDir = dirUsdt; V.dUsdtDominan = dUDominan;
    var mom = (V.btc24h != null) ? V.btc24h : 0;
    var dU = dUraw * G35.usdtW, dB = V.sBtcd || 0;
    var skor = (V.maj || 0) + (V.dirBtc || 0) - dB - dU + dUDominan + dHv;
    V.scoreRaw = Math.round(skor * 10) / 10;
    V.score = Math.round(skor);
    V.strength = Math.abs(V.scoreRaw);
    var domAda = V.domAda !== undefined ? V.domAda : (V.btcD != null);
    var sR = V.scoreRaw;
    /* ── KOMPOSISI PER-ENGINE (15 Okt, koreksi user) ──
       • Harvest 2h TERBUKA banyak SHORT → SHORT; banyak LONG → LONG.
       • Swing 4h + OB dua-duanya long-majority → LONG.
       • SEMUA engine bearish + BTC turun + USDT.D naik → CRASH.
       • SEMUA engine hijau + USDT.D turun → ALTSEASON.
       USDT.D tetap d-bobot asimetris di skor (92%/47% backtest). */
    var hitungKanal = function (tf) {
      var L2 = (DATA.live || {})[tf] || {};
      var L = 0, S = 0;
      (L2.sinyal || []).forEach(function (r) {
        if (r && r.st === "fired" && (r.dir === "long" || r.dir === "short"))
          r.dir === "long" ? L++ : S++;
      });
      return { L: L, S: S };
    };
    var K2 = hitungKanal("2h"), K4 = hitungKanal("4h"), KO = hitungKanal("ob"), KW = hitungKanal("whale");
    var arahK = function (k) { return (k.L + k.S) ? (k.L > k.S ? 1 : k.S > k.L ? -1 : 0) : 0; };
    var d2 = arahK(K2), d4 = arahK(K4), dO = arahK(KO), dW = arahK(KW);
    var berdata = [d2, d4, dO, dW].filter(function (d) { return d !== 0; });
    var semuaMerah = berdata.length >= 2 && berdata.every(function (d) { return d < 0; });
    var semuaHijau = berdata.length >= 2 && berdata.every(function (d) { return d > 0; });
    var banyakShort2h = (K2.S >= 2 && K2.S > K2.L);
    var banyakLong2h = (K2.L >= 2 && K2.L > K2.S);
    var swingObLong = (d4 > 0 && dO > 0);
    var usdtNaik = dirUsdt > 0, usdtTurun = dirUsdt < 0;
    V.kanalArah = { "2h": d2, "4h": d4, ob: dO, whale: dW };
    /* 16 Okt — SWEEP KEBAWAH BERSAMAAN (engine v36): ≥5 dari 8 mayor
       menyapu low 24 jam dalam 3 bar 1h = keadaan darurat → CRASH, tanpa
       menunggu gate dominan & tanpa ditahan histeresis. Angka dihitung
       engine dari klines segar & diterbitkan di data.json (sweepN/
       sweepSyms/sweepCrash) — browser hanya mengikuti. */
    if ((DATA.altdir_live || {}).sweepCrash) {
      V.status = "crash"; V.bias = "short"; V.sweepCrash = true;
      V.why = "SWEEP KEBAWAH BERSAMAAN (" + (DATA.altdir_live.sweepN || 0) + "/8 mayor: "
        + ((DATA.altdir_live.sweepSyms || []).join(", ") || "?") + ") → CRASH"
        + (usdtNaik ? " + USDT.D naik" : "");
    } else if (semuaMerah && mom < -3 && usdtNaik) {
      V.status = "crash"; V.bias = "short";
      V.why = "semua engine merah + BTC " + sgn(mom, 1) + "% (24 jam) + USDT.D naik — "
        + "uang lari ke stable → CRASH";
    } else if (semuaMerah && mom < -3) {
      V.status = "crash"; V.bias = "short";
      V.why = "semua engine merah + BTC " + sgn(mom, 1)
        + "% (24 jam) jatuh — risk-off → CRASH (skor " + sR + ")";
    } else if (semuaMerah) {
      V.status = "short"; V.bias = "short";
      V.why = "semua engine merah (bearish) — komposisi short" + (usdtNaik ? " + USDT.D naik" : "") + " (skor " + sR + ")";
    } else if (semuaHijau && usdtTurun) {
      V.status = "altseason"; V.bias = "long";
      V.why = "semua engine hijau + USDT.D turun (uang masuk alt) — "
        + "BTC " + (mom > -1 ? "tak jatuh" : sgn(mom, 1) + "% (24 jam)") + " (skor " + sR + ")";
    } else if (banyakShort2h) {
      V.status = "short"; V.bias = "short";
      V.why = "Harvest 2h terbuka banyak SHORT (" + K2.S + "S vs " + K2.L + "L)"
        + (usdtNaik ? " + USDT.D naik" : "") + " → komposisi short";
    } else if (banyakLong2h) {
      V.status = "long"; V.bias = "long";
      V.why = "Harvest 2h terbuka banyak LONG (" + K2.L + "L vs " + K2.S + "S)"
        + (usdtTurun ? " + USDT.D turun" : "") + " → komposisi long";
    } else if (swingObLong) {
      V.status = "long"; V.bias = "long";
      V.why = "Swing 4h + OB dua-duanya long-majority → komposisi long"
        + (usdtTurun ? " + USDT.D turun" : "") + " (skor " + sR + ")";
    } else if (dirUsdt > 0 && mom < -3) {
      V.status = "crash"; V.bias = "short";
      V.why = "USDT.D reclaim bullish + BTC " + sgn(mom, 1) + "% (24 jam) — risk-off";
    } else if (dirUsdt > 0) {
      V.status = "short"; V.bias = "short";
      V.why = "USDT.D reclaim 2H bullish (dominan — sisi 92% backtest)";
    } else if (dirUsdt < 0 && domAda && dB < 0 && mom > -1 && sR >= G35.thLong) {
      V.status = "long"; V.bias = "long";
      V.why = "USDT.D reclaim bearish + BTC.D turun + BTC tak jatuh — "
        + "konfirmasi komposit lolos (skor " + sR + ") → long/altseason";
    } else if (sR <= -G35.thExtreme && domAda && mom < -3) {
      V.status = "crash"; V.bias = "short";
      V.why = "skor " + sR + " + BTC " + sgn(mom, 1) + "% (24 jam) — risk-off dalam";
    } else if (sR >= G35.thExtreme && domAda && dB < 0 && mom > -1) {
      V.status = "altseason"; V.bias = "long";
      V.why = "skor " + sR + " + BTC.D turun (uang rotasi ke alt) + BTC tak jatuh";
    } else if (sR >= G35.thLong) {
      V.status = "long"; V.bias = "long";
      V.why = domAda ? "skor " + sR + " — mayoritas + BTC sepakat (USDT.D datar)"
                     : "skor " + sR + " (tanpa data dominan)";
    } else if (sR <= G35.thShort) {
      V.status = "short"; V.bias = "short";
      V.why = domAda ? "skor " + sR + " — mayoritas + BTC sepakat (USDT.D datar)"
                     : "skor " + sR + " (tanpa data dominan)";
    } else {
      V.status = "netral"; V.bias = "netral";
      V.why = "skor " + sR + " di zona tengah — USDT.D datar, tanpa konfirmasi kuat";
    }
    /* histeresis: tahanan rezim engine (altdir_live.bias) hanya berlaku saat
       USDT.D datar (dirUsdt=0); saat dominan memerintah, gauge ikut USDT.D. */
    var pubBias = (DATA.altdir_live || {}).bias;
    if (dirUsdt === 0 && pubBias && pubBias !== V.bias && pubBias !== "netral" && V.bias !== "netral" && !V.sweepCrash) {
      V.bias = pubBias;
      V.status = (pubBias === "long" ? "long" : pubBias === "short" ? "short" : "netral");
      V.why = "rezim ditahan " + pubBias.toUpperCase() + " — " + V.why;
    }
    return V;
  }

  function strip() {
    var host = $("#strip"); host.innerHTML = "";
    ord().forEach(function (tf) {
      var L = DATA.live[tf], E = (DATA.engine || {})[tf], P = L.pantau_akurasi;
      var c = el("div", "ch");
      var h = el("div", "ch-h");
      h.appendChild(el("span", "ch-n", L.nama));
      h.appendChild(el("span", "ch-tf", tf.toUpperCase()));
      /* 6 Okt — tag per jalur: "sinyal shadow" = sinyal tak dikirim tapi
         watchlistnya dikirim; "shadow" penuh = kedua jalur tak dikirim.
         (6 Okt malam: DART dimatikan — kanal uji kini kosong, semua tag
         "live"; logika dipertahankan untuk kanal uji berikutnya.) */
      var _tag = L.uji ? (L.pantau_shadow ? "shadow" : "sinyal shadow")
                       : (L.pantau_shadow ? "watchlist shadow" : "live");
      h.appendChild(el("span", "tag " + (_tag === "live" ? "live" : "test"), _tag));
      c.appendChild(h);

      function blok(judul, baris) {
        var w = el("div", "ch-sep");
        w.appendChild(el("div", "ch-sep-l", judul));
        var r = el("div", "rows");
        baris.forEach(function (b) {
          var x = el("div", "row");
          x.appendChild(el("span", "l", b[0]));
          x.appendChild(el("span", "d"));
          x.appendChild(el("span", "v " + (b[2] || ""), b[1]));
          r.appendChild(x);
        });
        w.appendChild(r); return w;
      }

      var wr = L.tutup ? (L.menang / L.tutup * 100) : null;
      var blokSig = [
        ["sent", String(L.kirim), ""],
        ["closed", String(L.tutup), ""],
        ["win rate", wr === null ? "—" : wr.toFixed(0) + "%", wr === null ? "mut" : ""],
        ["net R", L.tutup ? sgn(L.totR, 2) : "—", L.tutup ? (L.totR > 0 ? "pos" : "neg") : "mut"]
      ];
      /* 17 Sep — sinyal yang kamu ambil sendiri (ditandai via ambil_stats.py).
         Winrate mentah mengukur engine TANPA penyaringanmu; baris ini menampilkan
         hasil sinyal yang benar-benar dieksekusi — versi yang kamu rasakan. */
      if (L.diambil && L.diambil.tutup) {
        var D = L.diambil;
        blokSig.push(["taken by you", D.tutup + " · "
          + (D.wr === null ? "—" : D.wr.toFixed(0) + "%")
          + (D.pf == null ? "" : " · PF " + D.pf) + " · " + sgn(D.totR, 1) + "R",
          D.totR > 0 ? "pos" : "neg"]);
      }
      c.appendChild(blok("signals · engine R", blokSig));

      c.appendChild(blok("watchlist · 1R:1R", P ? [
        ["scored", String(P.n), ""],
        ["win rate", P.wr === null ? "—" : P.wr.toFixed(1) + "%",
          P.wr === null ? "mut" : (P.wr >= 50 ? "pos" : "neg")],
        ["EV / entry", sgn(P.evR, 3) + "R", P.evR > 0 ? "pos" : "neg"],
        ["net R", sgn(P.totR, 1), P.totR > 0 ? "pos" : "neg"]
      ] : [["scored", "0", "mut"], ["win rate", "—", "mut"],
           ["EV / entry", "—", "mut"], ["net R", "—", "mut"]]));

      /* 18 Sep — blok "picked by you": hasil LIVE dari centang manual kolom
         `picked` di CSV engine (lihat dashboard_data.py). WR dihitung dari
         resolver/pnl_r yang SUDAH TERJADI — bukan backtest. Populasinya kecil
         dan jujur: n ditampilkan, sinyal open/pending tidak ikut WR. */
      var PIK = L.pilih;
      if (PIK) {
        function blokPik(judul, S, flip) {
          if (!S || !S.n) return null;            // belum ada centang → blok hilang
          var baris = [
            ["picked", String(S.n) + (S.tutup < S.n ? " · " + S.tutup + " closed" : "")
              + (flip ? " · ⇄" + flip : ""), ""],
            ["win rate (live)", S.wr === null ? "—" : S.wr.toFixed(1) + "%",
              S.wr === null ? "mut" : (S.wr >= 50 ? "pos" : "neg")],
            ["net R", S.totR === null ? "—" : sgn(S.totR, 2),
              S.totR === null ? "mut" : (S.totR > 0 ? "pos" : S.totR < 0 ? "neg" : "mut")],
            ["profit factor", S.pf == null ? "—" : String(S.pf), "mut"]];
          /* 18 Sep v2 — streak & drawdown: bukan pemanis, ini ukuran risiko.
             maxDD = jurang terdalam dari puncak kumulatif R; streak = run
             menang/rugi yang sedang berjalan (angka minus = rugi beruntun). */
          if (S.maxdd !== null && S.maxdd !== undefined)
            baris.push(["max drawdown", sgn(S.maxdd, 2) + "R", S.maxdd < 0 ? "neg" : "mut"]);
          if (S.streak)
            baris.push(["streak", Math.abs(S.streak) + (Math.abs(S.streak) > 1 ? "x" : "x")
              + (S.streak > 0 ? " win" : " loss"), S.streak > 0 ? "pos" : "neg"]);
          return blok(judul, baris);
        }
        var bPikSig = blokPik("picked sinyal · live R", PIK.sig, PIK.sig_flip);
        if (bPikSig) c.appendChild(bPikSig);
        var bPikPt = blokPik("picked watchlist · 1R:1R", PIK.pt, PIK.pt_flip);
        if (bPikPt) c.appendChild(bPikPt);
      }

      /* 9 Okt — kartu "backtest reference" kini utk SEMUA engine. Sumber:
         HARVEST/SWING dari DATA.engine[tf] (schema per_bln), BRICK dari
         DATA.bt_brick & WHALE dari DATA.bt_whale (schema sendiri, tak punya
         per_bln → dihitung n / n_bulan; tooltip jendela + populasi). */
      var BT = (tf === "ob" && DATA.bt_brick) || (tf === "whale" && DATA.bt_whale) || E;
      if (BT && BT.n) {
        var _pr = BT.per_bln;
        if (_pr == null && BT.n_bulan) _pr = Math.round(BT.n / BT.n_bulan * 10) / 10;
        var _tip = BT.jendela ? (BT.jendela + (BT.populasi ? " · " + BT.populasi : "")) : null;
        var _rows = [
          ["entries", Number(BT.n).toLocaleString("en"), ""],
          ["win rate", BT.wr == null ? "—" : BT.wr.toFixed(1) + "%", ""],
          ["EV / trade", BT.ev == null ? "—" : sgn(BT.ev, 3) + "R", BT.ev > 0 ? "pos" : "neg"]];
        if (_pr != null) _rows.push(["per month", String(_pr), ""]);
        var bb = blok("backtest reference", _rows);
        if (_tip) bb.title = _tip;
        c.appendChild(bb);
      }
      host.appendChild(c);
    });
  }

  /* ── tables ── */
  /* 8 Okt (permintaan user): label tab pakai NAMA ENGINE — BRICK/HARVEST/SWING
     bukan kode TF "OB"/"2H"/"4H", biar konsisten dgn grup WA & strip riset. */
  var TAB_NAME = { "30m": "REA", "2h": "HARVEST", "4h": "SWING",
                   "ob": "BRICK", "whale": "WHALE", "1h": "SNIPER", "15m": "DART" };
  function tabs(host, active, pick) {
    host.innerHTML = "";
    ord().forEach(function (tf) {
      var b = el("button", "tab", TAB_NAME[tf] || tf.toUpperCase());
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", tf === active ? "true" : "false");
      b.addEventListener("click", function () { pick(tf); });
      host.appendChild(b);
    });
  }
  function table(host, cols, rows, msg) {
    host.innerHTML = "";
    if (!rows.length) { host.appendChild(el("div", "empty", msg)); return; }
    var t = el("table"), th = el("thead"), tr = el("tr");
    cols.forEach(function (c) { var h = el("th", null, c.h); if (c.n) h.style.textAlign = "right"; tr.appendChild(h); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var x = el("tr");
      /* baris watchlist/sinyal yang diambil admin → latar emas tipis */
      if (r && r.apick && r.apick.taken) x.classList.add("pickrow");
      cols.forEach(function (c) { x.appendChild(c.c(r)); });
      tb.appendChild(x);
    });
    t.appendChild(tb); host.appendChild(t);
  }
  function side(d) {
    var td = el("td");
    td.appendChild(el("span", "side " + (d === "long" ? "long" : "short"), d === "long" ? "long" : "short"));
    return td;
  }
  function txt(v, c) { var td = el("td", c); td.textContent = (v == null || v === "") ? "—" : v; return td; }
  /* sel pair dengan highlight kata pencarian (watchlist & signals) */
  function pairCell(sym, q) {
    var td = el("td", "sym");
    var s = sym || "—";
    if (q && q.length >= 2) {
      var U = s.toUpperCase(), i = U.indexOf(q);
      if (i !== -1) {
        if (i > 0) td.appendChild(el("span", null, s.slice(0, i)));
        td.appendChild(el("mark", "hlmark", s.slice(i, i + q.length)));
        if (i + q.length < s.length) td.appendChild(el("span", null, s.slice(i + q.length)));
        return td;
      }
    }
    td.textContent = s;
    return td;
  }
  function rcell(v, h) {
    var td = el("td", "n"), f = num(v);
    if (f === null) { td.textContent = h ? "open" : "—"; td.className = "n st open"; return td; }
    td.textContent = sgn(f, 2);
    td.style.color = f > 0 ? "var(--up)" : f < 0 ? "var(--dn)" : "var(--fg-3)";
    return td;
  }

  /* ══ 14 Okt (prioritas #4) — JARAK LIVE & HARGA TERAKHIR ════════════
     Kolom "last" & "jarak" di tabel Signals: seberapa jauh harga Binance
     SAAT INI dari entry sinyal/watchlist. Admin tak perlu hitung manual.
     Sumber: api.binance.com/ticker/price (sudah di CSP) — dikumpul sekali
     per render (batch) utk semua simbol tabel, cache 20 dtk per render,
     auto-refresh list harga tiap 60 dtk selama tab terbuka. */
  var LPRICE = {};          // sym → {p: harga, t: ms}, cache
  var LPRICE_PENDING = false;
  function lpriceGet(sym, cb) {
    var c = LPRICE[sym];
    if (c && Date.now() - c.t < 20000) { cb(c.p); return; }
    if (c && LPRICE_PENDING) { cb(c.p); return; }   // nilai lama sambil menunggu
    lpriceBatch(function () { var c2 = LPRICE[sym]; cb(c2 ? c2.p : null); });
  }
  function lpriceBatch(done) {
    LPRICE_PENDING = true;
    fetch("https://api.binance.com/api/v3/ticker/price", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (j) {
        var now = Date.now();
        (j || []).forEach(function (x) {
          if (x && x.symbol) LPRICE[x.symbol] = { p: +x.price || 0, t: now };
        });
      })
      .catch(function () { /* diam: kolom hanya kosong */ })
      .then(function () { LPRICE_PENDING = false; done && done(); });
  }
  function lastCell(sym, tf) {
    var td = el("td", "n jrk-last");
    td.textContent = "…";
    var S = decodeURIComponent(tvUrl(sym, tf).split("symbol=")[1] || "");
    var s = S.replace("BINANCE:", "").replace(".P", "");
    lpriceGet(s, function (p) {
      if (p) { td.textContent = fp(p); td.dataset.px = p; }
      else { td.textContent = "—"; }
    });
    return td;
  }
  function jarakCell(r) {
    var td = el("td", "n jrk-c");
    td.textContent = "…";
    var e = r._jenis === "watch" ? r.lv : r.e;
    var eF = num(e);
    if (eF === null) { td.textContent = "—"; return td; }
    lpriceGet(r.sym, function (p) {
      if (!p) { td.textContent = "—"; return; }
      var dJ = (p - eF) / eF * 100;
      td.textContent = sgn(dJ, 2) + "%";
      td.style.color = Math.abs(dJ) < 0.3 ? "var(--up)" : Math.abs(dJ) > 3 ? "var(--dn)" : "var(--fg-2)";
      td.title = "harga " + fp(p) + " vs entry " + fp(eF);
    });
    return td;
  }

  /* 8 Okt — section Watchlist & Winrate-accuracy DIHAPUS (permintaan user:
     satukan watchlist + sinyal dalam SATU section Signals, tanpa pindah-pindah).
     8 Okt (lanjutan, permintaan user): watchlist MASUK KE DAFTAR SIGNAL — satu
     tabel berisi sinyal entry DAN baris watchlist (kolom "jenis" membedakan).
     sMode = filter: "semua" (default, gabungan) / "sig" / "watch". */
  var sMode = "semua";
  var wTf = null, sTf = null, sQ = "", sSort = "ts", sSide = "", bq = "";

  /* ⚠️ 5 Okt — kanal yang memang LANGKA perlu dijelaskan saat kosong.
     Pesan umum "Nothing on the watchlist for this channel." dibaca sebagai
     "kanal ini mati/error", padahal 🐳 WHALE memang dirancang jarang: ia
     hanya berbunyi saat konfluensi penuh (reclaim 1h + killzone + IDM +
     SuperTrend), sekitar 5 sinyal/bulan — sudah diaudit di RESEARCH_STATE
     5 Okt dan nol watchlist-nya memang benar, bukan bug. */
  var KANAL_LANGKA = {
    whale: {
      w: "🐳 Watchlist 🐳 WHALE kosong — kanal ini hanya berbunyi saat konfluensi penuh.",
      s: "🐳 Belum ada sinyal 🐳 WHALE — kanal ini memang jarang berbunyi."
    }
  };
  function kosong(tf, jenis) {
    var k = KANAL_LANGKA[tf];
    if (k) return jenis === "sinyal" ? k.s : k.w;
    return jenis === "sinyal"
      ? "No signals recorded on this channel yet."
      : "Nothing on the watchlist for this channel.";
  }

  /* 8 Okt — SATU TABEL: sinyal entry + watchlist dalam daftar yang sama
     (permintaan user: "watchlist masuk ke daftar signal biar gampang
     maintenance"). Kolom "jenis" membedakan; sMode memfilter bila perlu. */
  function signals(tf) {
    sTf = tf; tabs($("#s-tabs"), tf, signals);
    var gabung = sMode === "semua";
    var rows = [];
    if (sMode !== "watch")
      (DATA.live[tf].sinyal || []).forEach(function (r) {
        rows.push(Object.assign({}, r, { _jenis: "sig" }));
      });
    if (sMode !== "sig")
      (DATA.live[tf].pantau || []).forEach(function (r) {
        rows.push(Object.assign({}, r, { _jenis: "watch" }));
      });
    if (sQ) rows = rows.filter(function (r) { return (r.sym || "").toUpperCase().indexOf(sQ) !== -1; });
    if (sSide) rows = rows.filter(function (r) { return r.dir === sSide; });
    if (sSort === "pick") {
      rows.sort(function (a, b) {               // pilihan user dulu, lalu terbaru
        return ((b.pick ? 1 : 0) - (a.pick ? 1 : 0)) || (b.ts || "").localeCompare(a.ts || "");
      });
    } else if (sSort === "sym") {
      rows.sort(function (a, b) { return (a.sym || "").localeCompare(b.sym || ""); });
    } else if (sSort !== "ts") {
      rows.sort(function (a, b) {            /* open (pnl null) selalu di bawah */
        var av = num(a.pnl), bv = num(b.pnl);
        if (av === null) av = sSort === "pnl" ? -Infinity : Infinity;
        if (bv === null) bv = sSort === "pnl" ? -Infinity : Infinity;
        return sSort === "pnl" ? bv - av : av - bv;
      });
    } else {
      rows.sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });
    }
    var kolom = [
      { h: "", c: function (r) { return tvCell(r.sym, tf); } },
      { h: "time WIB", c: function (r) { return txt(r.ts); } },
      { h: "pair", c: function (r) { return pairCell(r.sym, sQ); } },
      { h: "side", c: function (r) { return side(r.dir); } },
      { h: "koreksi admin", c: function (r) { return corrCell(r, tf, r._jenis); } }];
    if (gabung) kolom.push({ h: "jenis", c: function (r) {
      var td = el("td", "st", r._jenis === "sig" ? "⚡ sinyal" : "👁 watchlist");
      if (r._jenis !== "sig") td.style.color = "var(--fg-2)";
      return td; } });
    kolom.push(
      { h: "entry", n: true, c: function (r) {
          return txt(fp(r._jenis === "watch" ? r.lv : r.e), "n"); } },
      { h: "stop", n: true, c: function (r) {
          return r._jenis === "watch" ? txt("—", "n") : txt(fp(r.s), "n"); } },
      { h: "target", n: true, c: function (r) {
          return r._jenis === "watch" ? txt("—", "n") : txt(fp(r.t), "n"); } },
      /* 14 Okt (prioritas #4) — JARAK LIVE: post(list harga terakhir ke
         harga entry). Hitung dari entry vs harga Binance lastPrice
         (cache 20 dtk per batch — CSP sudah mengizinkan api.binance.com).
         watchlist lv = level reclaim (bhk jarak) + sinyal e = entry.
         Tidak perlu memilih TP/SL manual — mata admin langsung melihat
         dekat/dah mana posisi entry. Baris open atau "jauh" (>|3%|)
         di-highlight via class jrk-far agar gampang dipindahkan. */
      { h: "last", n: true, c: function (r) { return lastCell(r.sym, tf); } },
      { h: "jarak", n: true, c: function (r) { return jarakCell(r); } },
      { h: "status", c: function (r) {
          var td = el("td", "st");
          if (r._jenis === "watch") {
            td.textContent = r.h ? (r.h === "menang" ? "win" : r.h === "kalah" ? "loss" : "timeout") : "watchlist";
            if (r.h === "menang") td.style.color = "var(--up)";
            else if (r.h === "kalah") td.style.color = "var(--dn)";
          } else {
            td.className = "st" + (r.st === "fired" ? " open" : "");
            td.textContent = r.st === "fired" ? "open" : r.st;
          }
          return td; } },
      { h: "result R", n: true, c: function (r) {
          return r._jenis === "watch" ? rcell(r.r, false) : rcell(r.pnl, r.st === "fired"); } },
      { h: "live", c: function (r) { return pickCell(r, tf, r._jenis); } });
    kolom.push({ h: "★", c: function (r) {                 // dipilih user di CSV (kolom picked)
          var td = el("td", "st" + (r.pick ? " pickb" : " dim"));
          td.textContent = r.pick ? (r.flip ? "★⇄" : "★") : "—";
          if (r.pick) td.title = "picked by you"
            + (r.flip ? " — ARAH DIPERBAIKI: kamu ambil "
              + (r.dir === "long" ? "short" : "long") + ", R dihitung dari arahmu" : "")
            + (r.note ? " — " + r.note : "");
          return td; } });
    table($("#s-table"), kolom, rows, sQ ? "No signal matches \u201C" + sQ + "\u201D on this channel."
      : DATA.live[tf].uji
      ? "Shadow channel — no entry signal recorded yet."
      : kosong(tf, "sinyal"));
  }

  /* ── watchlist accuracy: skor mekanis 1R:1R atas SEMUA reclaim terdeteksi ── */
  function akurasi() {
    var host = $("#ak-grid"); if (!host) return;
    host.innerHTML = "";
    ord().forEach(function (tf) {
      var L = DATA.live[tf], P = L.pantau_akurasi;
      var c = el("div", "ch");
      var h = el("div", "ch-h");
      h.appendChild(el("span", "ch-n", L.nama));
      h.appendChild(el("span", "ch-tf", tf.toUpperCase()));
      c.appendChild(h);
      var w = el("div", "ch-sep");
      w.appendChild(el("div", "ch-sep-l", "every reclaim · 1R:1R"));
      var r = el("div", "rows");
      function row(l, v, cls) {
        var x = el("div", "row");
        x.appendChild(el("span", "l", l));
        x.appendChild(el("span", "d"));
        x.appendChild(el("span", "v " + (cls || ""), v));
        r.appendChild(x);
      }
      if (P && P.n) {
        row("scored", String(P.n));
        row("win rate", P.wr === null ? "—" : P.wr.toFixed(1) + "%",
            P.wr === null ? "mut" : (P.wr >= 50 ? "pos" : "neg"));
        row("EV / entry", sgn(P.evR, 3) + "R", P.evR > 0 ? "pos" : "neg");
        row("net R", sgn(P.totR, 1), P.totR > 0 ? "pos" : "neg");
        row("W · L · timeout", (P.menang || 0) + " · " + (P.kalah || 0) + " · " + (P.sisa || 0), "mut");
      } else {
        row("scored", "0", "mut"); row("win rate", "—", "mut");
        row("EV / entry", "—", "mut"); row("net R", "—", "mut");
        row("W · L · timeout", "— · — · —", "mut");
      }
      w.appendChild(r); c.appendChild(w);
      host.appendChild(c);
    });
  }

  /* ── pilihan user (18 Sep): hasil centang kolom `picked` di CSV engine ──
     Bukan backtest: WR dari resolver 1R:1R (watchlist) / pnl_r resolved
     (sinyal). Populasi kecil — itu justru intinya, ini SARINGANMU.
     v2: streak & max drawdown = ukuran risiko; flip = arah yang kamu ambil
     berbeda dari engine (R dihitung dari arahmu); catatan = alasannya. */
  function kamu() {
    var host = $("#kamu-grid"); if (!host) return;
    host.innerHTML = "";
    ord().forEach(function (tf) {
      var L = DATA.live[tf], P = L.pilih;
      var c = el("div", "ch");
      var h = el("div", "ch-h");
      h.appendChild(el("span", "ch-n", L.nama));
      h.appendChild(el("span", "ch-tf", tf.toUpperCase()));
      c.appendChild(h);
      var rows = el("div", "rows");
      function row(l, v, cls) {
        var x = el("div", "row");
        x.appendChild(el("span", "l", l));
        x.appendChild(el("span", "d"));
        x.appendChild(el("span", "v " + (cls || ""), v));
        rows.appendChild(x);
      }
      if (P && (P.sig.n || P.pt.n)) {
        ["sig", "pt"].forEach(function (jenis) {
          var S = P[jenis];
          var flip = P[jenis + "_flip"] || 0;
          var lab = jenis === "sig" ? "picked sinyal" : "picked watchlist";
          if (!S.n) { row(lab, "belum ada", "mut"); return; }
          row(lab, String(S.n) + (S.tutup ? " · " + S.tutup + " closed" : " · pending")
            + (flip ? " · ⇄ " + flip + " flip" : ""), "");
          row(lab + " WR (live)", S.wr === null ? "belum ada yang tutup"
            : S.wr.toFixed(1) + "%", S.wr === null ? "mut" : (S.wr >= 50 ? "pos" : "neg"));
          row(lab + " net R", S.totR === null ? "—" : sgn(S.totR, 2),
            S.totR === null ? "mut" : (S.totR > 0 ? "pos" : S.totR < 0 ? "neg" : "mut"));
          if (S.maxdd != null) row(lab + " max drawdown", sgn(S.maxdd, 2) + "R",
            S.maxdd < 0 ? "neg" : "mut");
          if (S.streak) row(lab + " streak",
            Math.abs(S.streak) + "x " + (S.streak > 0 ? "win" : "loss"),
            S.streak > 0 ? "pos" : "neg");
          if (S.pf != null) row(lab + " profit factor", String(S.pf), "mut");
        });
      } else {
        row("picked sinyal", "belum ada centang", "mut");
        row("picked watchlist", "belum ada centang", "mut");
        row("cara menceklis", "lihat catatan di bawah", "mut");
      }
      c.appendChild(rows);
      host.appendChild(c);
    });
    /* daftar catatan: ALASAN di balik tiap pilihan — dari kolom note CSV.
       Lama-lama ini jadi data: alasan mana yang winrate-nya paling tinggi. */
    var cat = [];
    ord().forEach(function (tf) {
      /* ⚠️ jalan pintas `(x || []).forEach` SALAH: || mengikat lebih longgar
         dari akses-anggota, jadi yang di-forEach array kosong literal —
         catatan tidak pernah tampil. Ambil referensinya dulu. */
      var cc = (DATA.live[tf].pilih || {}).catatan;
      if (cc) cat = cat.concat(cc);
    });
    if (cat.length) {
      var w = el("div", "pick-notes");
      w.appendChild(el("div", "pn-h", "catatan pilihan"));
      cat.sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });
      cat.slice(0, 12).forEach(function (x) {
        var r = el("div", "pn-r");
        r.appendChild(el("span", "pn-tf", x.tf.toUpperCase()));
        r.appendChild(el("b", null, x.sym.replace(/USDT$/, "")));
        if (x.side) r.appendChild(el("span", "pn-side " + x.side,
          "⇄ " + x.side.toUpperCase()));
        var n2 = el("span", "pn-note", x.note);
        r.appendChild(n2);
        w.appendChild(r);
      });
      host.appendChild(w);
    }
  }

  /* ── charts ── */
  var NS = "http://www.w3.org/2000/svg";
  function mk(t, a) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); return n; }
  function path(p) {
    if (p.length < 2) return p.length ? "M" + p[0][0] + "," + p[0][1] : "";
    var n = p.length, d = [], m = [], i;
    for (i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / ((p[i + 1][0] - p[i][0]) || 1));
    m.push(d[0]);
    for (i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    m.push(d[n - 2]);
    var s = "M" + p[0][0] + "," + p[0][1];
    for (i = 0; i < n - 1; i++) {
      var dx = (p[i + 1][0] - p[i][0]) / 3;
      s += "C" + (p[i][0] + dx) + "," + (p[i][1] + m[i] * dx) + " "
         + (p[i + 1][0] - dx) + "," + (p[i + 1][1] - m[i + 1] * dx) + " "
         + p[i + 1][0] + "," + p[i + 1][1];
    }
    return s;
  }
  function draw(svg, ser, o) {
    svg.innerHTML = "";
    var W = 620, H = 190, P = { t: 12, r: 34, b: 22, l: 40 };
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    var all = []; ser.forEach(function (s) { s.pts.forEach(function (q) { all.push(q[1]); }); });
    if (!all.length) return;
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var pd = (hi - lo) * .12 || 1; lo -= pd; hi += pd;
    var rg = (hi - lo) || 1, xr = (o.xhi - o.xlo) || 1;
    var X = function (x) { return P.l + (x - o.xlo) / xr * (W - P.l - P.r); };
    var Y = function (y) { return P.t + (1 - (y - lo) / rg) * (H - P.t - P.b); };
    var defs = mk("defs"); svg.appendChild(defs);
    for (var g = 0; g <= 3; g++) {
      var yy = P.t + g / 3 * (H - P.t - P.b);
      svg.appendChild(mk("line", { x1: P.l, x2: W - P.r, y1: yy, y2: yy, "class": "g" }));
      var lb = mk("text", { x: P.l - 6, y: yy + 3, "text-anchor": "end" });
      lb.textContent = o.fy(hi - g / 3 * rg); svg.appendChild(lb);
    }
    if (lo < 0 && hi > 0) svg.appendChild(mk("line", { x1: P.l, x2: W - P.r, y1: Y(0), y2: Y(0), "class": "z" }));
    (o.xt || []).forEach(function (t) {
      var tx = mk("text", { x: X(t.x), y: H - 7, "text-anchor": "middle" });
      tx.textContent = t.label; svg.appendChild(tx);
    });
    ser.forEach(function (s, si) {
      if (s.pts.length < 2) return;
      var lp = s.pts.map(function (q) { return [X(q[0]), Y(q[1])]; });
      var dLine = path(lp);
      var dArea = dLine + "L" + lp[lp.length - 1][0] + "," + Y(Math.max(lo, 0)) + "L" + lp[0][0] + "," + Y(Math.max(lo, 0)) + "Z";
      /* area gradien lembut di bawah kurva — penguat arah, bukan hiasan */
      var gid = "eqg" + si;
      var g = mk("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
      g.appendChild(mk("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": .16 }));
      g.appendChild(mk("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 }));
      defs.appendChild(g);
      svg.appendChild(mk("path", { d: dArea, fill: "url(#" + gid + ")", stroke: "none" }));
      svg.appendChild(mk("path", { d: dLine, fill: "none", stroke: s.color, "stroke-width": 5,
        "stroke-opacity": .14, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      svg.appendChild(mk("path", { d: dLine, fill: "none", stroke: s.color, "stroke-width": 1.8,
        "stroke-linecap": "round", "stroke-linejoin": "round" }));
      /* marker ujung: nilai terakhir dgn glow — posisi akhir tiap kanal */
      var last = lp[lp.length - 1];
      var lv = s.pts[s.pts.length - 1][1];
      svg.appendChild(mk("circle", { cx: last[0], cy: last[1], r: 3.2, fill: s.color }));
      svg.appendChild(mk("circle", { cx: last[0], cy: last[1], r: 6.5, fill: s.color,
        "fill-opacity": .22 }));
      var lb2 = mk("text", { x: last[0] + 8, y: last[1] + 3, "class": "eq-end",
        "fill": s.color });
      lb2.textContent = (lv > 0 ? "+" : "") + Math.round(lv) + "%";
      svg.appendChild(lb2);
    });
  }
  function legend(host, ser) {
    host.innerHTML = "";
    ser.forEach(function (s) {
      var d = el("span"); var i = el("i"); i.style.background = s.color;
      d.appendChild(i); d.appendChild(document.createTextNode(s.name)); host.appendChild(d);
    });
  }
  /* ── charts (23 Sep: SEMUA LIVE dari resolve admin, bukan backtest) ──
     ① eq : kurva kumulatif hasil live (%) per kanal, urut waktu sinyal
     ② hr : winrate per jam WIB — lollipop per jam (bukan garis: user
            makin bingung dgn 3 garis bersilangan)
     Sumber sama dengan heat table & kartu live resolve: picks admin. */
  /* whale = "Whale 1h" bukan salah ketik: resep 🐳 WHALE memang reclaim 1h
     + killzone + IDM + SuperTrend (riset n=59). */
  var HR_NAME = { "ob": "Engine OB", "30m": "Reversal 30m", "2h": "Harvest 2h", "4h": "Swing 4h", "whale": "Whale 1h" };
  /* 25 Sep — tinggi ter-akhir tiap batang histogram (urut h×kanal), buat
     tween antar segaran: batang MELUNCUR dari tinggi lama ke baru, persis
     histogram divergen di tab Whale. Bentuk array mengikuti urutan render. */
  var HR_RAW = null;
  /* 6 Okt — kanal chart by-hour/kurva live = ord() (kanal aktif di
     DATA.live), bukan ["1h","30m"] hardcoded: sejak swap DART→shadow &
     HARVEST naik, key DATA.live hanya 15m/2h/whale, jadi chart lama
     selalu kosong. Init per[h] dinamis ikut daftar kanal itu. */
  function liveHourAgg() {
    var tfs = ord(), per = {}, h;
    for (h = 0; h < 24; h++) { per[h] = {}; tfs.forEach(function (t) { per[h][t] = [0, 0, 0]; }); }
    tfs.forEach(function (tf) {
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p) return;
          if (p.win !== 0 && p.win !== 1) return;   // terbuka: tidak dinilai
          var m = /(\d{2}):(\d{2})\s*$/.exec(String(r.ts || ""));
          if (!m) return;
          var hh = parseInt(m[1], 10); if (!(hh >= 0 && hh < 24)) return;
          var pct = hasPct(p.pct) ? p.pct      /* 13 Okt: untung/rugi nett — tanpa balik tanda short */
                    : (p.win === 1 ? 1 : -1);        // fallback 1R (juga saat pct null)
          var c = per[hh][tf]; c[0]++; c[1] += p.win; c[2] += pct;
        });
      });
    });
    return per;
  }
  function eqLiveSeries() {
    return ord().map(function (tf) {
      var rows = [];
      Object.keys(PICKS).forEach(function (k) {
        var kp = kpOf(k); if (kp.tf !== tf) return;   // 16 Okt: kunci 5-bagian juga
        var p = PICKS[k]; if (!p) return;
        if (p.win !== 0 && p.win !== 1) return;
        if (!eqPickFilter(p)) return;       // 11 Okt — filter admin/periode
        var pct = hasPct(p.pct) ? p.pct   /* 13 Okt: untung/rugi nett — tanpa balik tanda short */
                  : (p.win === 1 ? 1 : -1);
        rows.push({ ts: kp.ts || "", pct: pct });
      });
      rows.sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; });
      var pts = [], cum = 0;
      rows.forEach(function (r, i) {
        cum += r.pct;
        pts.push([rows.length > 1 ? i / (rows.length - 1) : 0, cum, r.ts]);
      });
      return { name: HR_NAME[tf], color: COLOR[tf], pts: pts };
    });
  }
  function svgEmpty(svg, msg) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 620 190");
    var t = mk("text", { x: 310, y: 95, "text-anchor": "middle", "class": "hr-none-t" });
    t.textContent = msg; svg.appendChild(t);
  }
  /* 11 Okt — filter admin & periode untuk kurva live (#eq) — permintaan
     user: "winrate berdasarkan admin agar kita tahu performa setiap orang,
     ada filter mingguan atau bulanan". Pilihan disimpan di localStorage.
     "all" = gabungan dua admin (perilaku lama). Jam-harian/heatmap TIDAK
     kena filter ini — koin menang dari admin siapa pun tetap masuk jam
     yang sama (syarat eksplisit user). */
  var EQ_FILTER = { who: "all", per: "all" };        // who: all|Qkuk|Gerry · per: all|week|month
  try {
    var _eqf = JSON.parse(localStorage.getItem("qkuk_eq_filter") || "null");
    if (_eqf && typeof _eqf === "object") {
      if (["all", "Qkuk", "Gerry"].indexOf(_eqf.who) >= 0) EQ_FILTER.who = _eqf.who;
      if (["all", "week", "month"].indexOf(_eqf.per) >= 0) EQ_FILTER.per = _eqf.per;
    }
  } catch (e) {}
  function eqPickFilter(p) {
    if (EQ_FILTER.who !== "all" && p.by !== EQ_FILTER.who) return false;
    if (EQ_FILTER.per === "all") return true;
    var d = dowParseTs(p.ts || "");
    if (!d) return false;
    if (EQ_FILTER.per === "week") return weekIndex(d) === weekIndex(new Date());
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) === wibDate(new Date().toISOString()).slice(0, 7);
  }
  /* tombol filter admin/periode di header kartu #eq — 11 Okt */
  function eqFilterBar() {
    var lg = document.getElementById("eq-lg"); if (!lg) return;
    lg.innerHTML = "";
    function btn(def, lab) {
      var b = el("button", "hh-tg" + (EQ_FILTER.who === def[0] || EQ_FILTER.per === def[0] ? " on" : ""), lab);
      b.type = "button";
      b.addEventListener("click", function () {
        EQ_FILTER[def[2]] = def[0];
        try { localStorage.setItem("qkuk_eq_filter", JSON.stringify(EQ_FILTER)); } catch (e) {}
        charts();
      });
      return b;
    }
    var wrap = el("span", "eq-filt");
    [["all|semua admin|who"], ["Qkuk|Qkuk|who"], ["Gerry|Gerry|who"],
     ["all|semua waktu|per"], ["week|minggu ini|per"], ["month|bulan ini|per"]]
      .forEach(function (s) {
        var pp = s[0].split("|");
        wrap.appendChild(btn([pp[0], pp[1], pp[2]], pp[1]));
      });
    lg.appendChild(wrap);
  }
  function charts() {
    eqFilterBar();
    var eq = eqLiveSeries().filter(function (s) { return s.pts.length; });
    if (eq.some(function (s) { return s.pts.length >= 2; })) {
      var base = eq.reduce(function (a, b) { return b.pts.length > a.pts.length ? b : a; });
      var xt = [0, .5, 1].map(function (f) {
        var q = base.pts[Math.round(f * (base.pts.length - 1))];
        return { x: f, label: (q && q[2] ? q[2].slice(5, 10) : "") };
      });
      draw($("#eq"), eq, { xlo: 0, xhi: 1, xt: xt, fy: function (y) { return (y > 0 ? "+" : "") + Math.round(y) + "%"; } });
      legend($("#eq-lg"), eq);
    } else svgEmpty($("#eq"), "belum ada resolve live — tandai win/loss lewat tombol ambil, kurva terisi otomatis");
    hrChart();
  }
  /* ② Win rate by WIB hour — LOLLIPOP per jam (ganti garis, permintaan
     user 23 Sep: garis 3 kanal justru membingungkan). Satu kolom per jam,
     tiga batang kanal berdampingan dari garis 50%: naik = menang,
     turun = kalah, tinggi = winrate. Sumbu jujur 0–100%. */
  function hrChart() {
    var svg = $("#hr"); if (!svg) return;
    var per = liveHourAgg();
    var ser = ord().map(function (tf) {
      var pts = [];
      for (var h = 0; h < 24; h++) {
        var c = per[h][tf];
        if (c[0] > 0) pts.push([h, c[1] / c[0] * 100, c]);
      }
      return { name: HR_NAME[tf], color: COLOR[tf], pts: pts, tf: tf };
    });
    legend($("#hr-lg"), ser);
    if (!ser.some(function (s) { return s.pts.length; })) {
      svgEmpty(svg, "belum ada resolve live — grafik & heat table terisi otomatis setelah win/loss diisi");
      return;
    }
    drawLiveHr(svg, ser, per);
  }
  function tipRow(color, name, wr, w, n) {
    var row = el("div", "hr-tr");
    var dot = el("i", "lg-dot");
    /* CSP: properti individual, bukan cssText */
    dot.style.background = color; dot.style.width = "8px"; dot.style.height = "8px";
    dot.style.borderRadius = "2px"; dot.style.display = "inline-block";
    row.appendChild(dot);
    row.appendChild(el("span", "hr-tn", name));
    row.appendChild(el("span", "hr-tv " + (wr >= 50 ? "pos" : "neg"), wr.toFixed(0) + "%"));
    row.appendChild(el("span", "hr-tm", w + "W/" + (n - w) + "L"));
    return row;
  }
  function drawLiveHr(svg, ser, per) {
    svg.innerHTML = "";
    /* 25 Sep v2 — SKALA PER SISI (permintaan user: winrate kalah dulu selalu
       pendek karena mayoritas resolve menang, sehingga histogram tak terlihat
       divergen). Kini tiap sisi diskalakan SENDIRI: batang kalah terparah
       setinggi batang menang terbaik — bentuk divergennya jelas. Konsekuensi:
       sumbu % 0–100 ditarik (tidak lagi sesuai geometri); diganti label
       MENANG / KALAH + garis putus 50%, angka eksak tetap di hover. */
    var W = 620, H = 190, P = { t: 14, r: 14, b: 26, l: 14 };
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    var iw = (W - P.l - P.r) / 24;
    var X = function (h) { return P.l + h * iw; };
    var Y = function (v) { return P.t + (1 - v / 100) * (H - P.t - P.b); };
    var defs = mk("defs");
    ser.forEach(function (s, i) {
      var g = mk("linearGradient", { id: "hrg" + i, x1: 0, y1: 0, x2: 0, y2: 1 });
      g.appendChild(mk("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": .95 }));
      g.appendChild(mk("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": .55 }));
      defs.appendChild(g);
    });
    svg.appendChild(defs);
    /* garis nol (50%) — pengganti sumbu % (skala per sisi); label MENANG/KALAH
       menyusul di lapisan teratas (setelah batang) supaya tak tertutup */
    var y50 = Y(50);
    svg.appendChild(mk("line", { x1: P.l, x2: W - P.r, y1: y50, y2: y50, "class": "z" }));
    for (var h2 = 0; h2 < 24; h2 += 3) {
      var tx = mk("text", { x: X(h2) + iw / 2, y: H - 8, "text-anchor": "middle" });
      tx.textContent = (h2 < 10 ? "0" : "") + h2; svg.appendChild(tx);
    }
    var ax = mk("text", { x: W - P.r, y: H - 8, "text-anchor": "end", "class": "hr-wib" });
    ax.textContent = "WIB"; svg.appendChild(ax);
    /* HISTOGRAM DIVERGEN (25 Sep, gaya tab Whale v3): batang tumbuh dari
       garis 50% — naik = menang (gradient kanal), turun = kalah (merah);
       tinggi = jarak winrate dari 50% (floor 6px biar 50% eksak tetap
       terlihat). Antar redraw batang MELUNCUR halus dgn stagger kiri→kanan
       (luncur 650ms + delay 18ms per kolom jam, dua rAF utk posisi awal,
       tween dari tinggi lama via HR_RAW). Batang ekstrem — dominasi jauh
       dari 50% DAN sampel cukup (≥3) — berdenyut oranye (class hot).
       Hormati prefers-reduced-motion (CSS mematikan transisi/animasi). */
    var bw = iw / 3.4, gap = 1.5;
    var RM = false;
    try { RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    var lama = HR_RAW, tinggiBaru = [];
    /* SKALA PER SISI: setengah plot utk menang, setengah utk kalah.
       Terparah tiap sisi = penuh setengah plot; sisanya proporsional —
       jam kalah 33% kini tampak setinggi jam menang 67%. */
    var upMax = 1, dnMax = 1;
    ser.forEach(function (s) {
      s.pts.forEach(function (p) {
        var d = Math.abs(p[1] - 50);
        if (p[1] >= 50) { if (d > upMax) upMax = d; }
        else if (d > dnMax) dnMax = d;
      });
    });
    var plotHalf = (H - P.t - P.b) / 2;               // px per sisi penuh
    for (var h3 = 0; h3 < 24; h3++) {
      var x0 = X(h3) + (iw - bw * 3 - gap * 2) / 2;
      ser.forEach(function (s, i) {
        for (var q = 0; q < s.pts.length; q++) {
          if (s.pts[q][0] !== h3) continue;
          var c = s.pts[q][2], wr = s.pts[q][1];
          var up = wr >= 50;
          var bh = Math.max(6, Math.abs(wr - 50) / (up ? upMax : dnMax) * plotHalf);
          var by = up ? y50 - bh : y50;
          var bx = x0 + i * (bw + gap);
          var grp = mk("g", { "class": "hr-bar" + (Math.abs(wr - 50) >= 20 && c[0] >= 3 ? " hot" : "")
            + (up ? " w" : " l") });
          var tv = mk("title");
          tv.textContent = s.name + " @ " + ("0" + h3).slice(-2) + ".00 — WR "
            + wr.toFixed(0) + "% (" + c[1] + "W/" + (c[0] - c[1]) + "L)";
          grp.appendChild(tv);
          var rc = mk("rect", { x: bx.toFixed(1), y: by.toFixed(1),
            width: bw.toFixed(1), height: bh.toFixed(1), rx: 1.5,
            fill: "url(#hrg" + i + ")",
            stroke: up ? s.color : "rgba(232,135,124,.9)",
            "stroke-opacity": up ? .55 : .9, "stroke-width": .8 });
          tinggiBaru.push({ k: h3 + "|" + s.tf, bh: bh, by: by });
          var awal = null;
          if (!RM && lama && lama.length) {
            for (var z = 0; z < lama.length; z++) {
              if (lama[z] && lama[z].k === h3 + "|" + s.tf) { awal = lama[z]; break; }
            }
          }
          /* catatan: walau data sama, mulai dari tinggi lama — transisi ke
             nilai sama tak terlihat, JANGAN di-nol-kan lagi supaya batang
             tidak tumbuh ulang tiap poll 60 dtk. */
          if (!RM) {
            if (awal) {                                        // mulai dr tinggi lama
              rc.setAttribute("y", awal.by.toFixed(1));
              rc.setAttribute("height", awal.bh.toFixed(1));
            } else {                                           // tumbuh dr garis 50%
              rc.setAttribute("y", y50.toFixed(1));
              rc.setAttribute("height", "0");
            }
            rc.style.transitionDelay = (h3 * 18) + "ms";       // stagger per JAM
          }
          grp.appendChild(rc);
          svg.appendChild(grp);
          if (!RM) {
            (function (r, ty, th) {                            // dua rAF: pastikan posisi awal ter-render
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  r.setAttribute("y", ty.toFixed(1));
                  r.setAttribute("height", th.toFixed(1));
                });
              });
            })(rc, by, bh);
          }
          break;
        }
      });
    }
    HR_RAW = tinggiBaru;
    /* label MENANG/KALAH paling atas (di atas batang) — halo gelap via CSS paint-order */
    var lbU = mk("text", { x: P.l + 4, y: P.t + 9, "class": "hr-lab up" });
    lbU.textContent = "MENANG"; svg.appendChild(lbU);
    var lbD = mk("text", { x: P.l + 4, y: H - P.b - 5, "class": "hr-lab dn" });
    lbD.textContent = "KALAH"; svg.appendChild(lbD);
    /* crosshair + tooltip per jam — hover di mana pun menampilkan semua kanal */
    var card = svg.parentNode;
    /* redraw (picks berubah): buang tooltip & crosshair lama supaya tak menumpuk */
    Array.prototype.forEach.call(card.querySelectorAll(":scope > .hr-tip"), function (n) { n.remove(); });
    var xh = mk("line", { x1: 0, x2: 0, y1: P.t, y2: H - P.b, "class": "hr-x" });
    xh.style.display = "none"; svg.appendChild(xh);
    var tip = el("div", "hr-tip"); tip.style.display = "none"; card.appendChild(tip);
    var ov = mk("rect", { x: P.l, y: P.t, width: W - P.l - P.r, height: H - P.t - P.b, fill: "transparent" });
    ov.addEventListener("mousemove", function (ev) {
      /* jam dari rect overlay sendiri — svg.ch berpadding 16px, jadi rect svg
         mencakup padding; rect overlay persis area plot (viewBox x=P.l..W-P.r). */
      var ob = ov.getBoundingClientRect();
      var hq = Math.round((ev.clientX - ob.left) / (ob.width || 1) * 23);
      hq = Math.max(0, Math.min(23, hq));
      xh.setAttribute("x1", X(hq)); xh.setAttribute("x2", X(hq));
      xh.style.display = "";
      tip.innerHTML = "";
      var jt = el("b"); jt.textContent = ("0" + hq).slice(-2) + ".00 WIB"; tip.appendChild(jt);
      var totN = 0, totW = 0;
      ser.forEach(function (s) { totN += per[hq][s.tf][0]; totW += per[hq][s.tf][1]; });
      ser.forEach(function (s) {
        for (var q = 0; q < s.pts.length; q++) {
          if (s.pts[q][0] !== hq) continue;
          var c = s.pts[q][2];
          tip.appendChild(tipRow(s.color, s.name, c[1] / c[0] * 100, c[1], c[0]));
          break;
        }
      });
      if (totN) tip.appendChild(tipRow("transparent", "Total", totW / totN * 100, totW, totN));
      tip.style.display = "block";
      var cr = card.getBoundingClientRect();
      var lx = ev.clientX - cr.left + 14;
      if (lx > cr.width * .55) lx = ev.clientX - cr.left - tip.offsetWidth - 14;
      tip.style.left = Math.max(4, lx) + "px";
      var ty = ev.clientY - cr.top - 10;
      if (ty < 4) ty = 4;
      tip.style.top = ty + "px";
    });
    ov.addEventListener("mouseleave", function () {
      xh.style.display = "none"; tip.style.display = "none";
    });
    svg.appendChild(ov);
  }

  /* ekspos state untuk konsol (debug & verifikasi; tidak dipakai logika internal) */
  window.DBG = { get DATA() { return DATA; }, get PICKS() { return PICKS; }, get PLOG() { return PLOG; },
    get gaugeStatus() { return hitungStatus; } };   // v33: uji klasifikasi 6 status dr konsol
  /* ── bubbles: gelembung FISIK koin hasil deteksi engine ──
     BUKAN pasar crypto seluruhnya — hanya koin yang tercatat di engine.
     Fisika ala bubblescrypto: tiap gelembung melayang (gaya acak lembut),
     bertumbukan elastis dgn sesamanya, memantul di dinding kanvas, dan
     BISA DIGESER dgn tekan-tahan (mouse & sentuh). Isi gelembung =
     perubahan harga 24 jam LIVE dari Binance fapi (CORS terbuka), bukan
     angka R. Warna: hijau naik, merah turun, kuning = tak ada data 24 jam.
     Aura api: koin yang memang ada di catatan engine hari ini. */
  /* 8 Okt (permintaan user): bubbles kembali — tapi isi = daftar SINYAL saja
     (watchlist sekarang juga tampil di daftar signal, jadi bubbles mengikuti).
     Tab mode dihapus; bMode dipatok "sinyal". */
  var bMode = "sinyal", bTf = null;
  var BB = { up: { glow: "rgba(110,231,183,.32)", edge: "rgba(110,231,183,.85)",
                   fill: "rgba(110,231,183,.10)", txt: "#8DF0C6" },
             dn: { glow: "rgba(232,135,124,.30)", edge: "rgba(232,135,124,.85)",
                   fill: "rgba(232,135,124,.10)", txt: "#F0A99F" },
             id: { glow: "rgba(216,200,154,.28)", edge: "rgba(216,200,154,.80)",
                   fill: "rgba(216,200,154,.10)", txt: "#E4D6AE" } };
  var bbBodies = [];          // badan fisik: {el, x, y, vx, vy, r, ph}
  /* ── koin yang diambil admin (live picks): bintang + garis emas di bubble ── */
  var bbPicked = {};
  function bbPickedSync() {
    /* tanda bubble hanya untuk pick HARI INI (WIB) — pick hari-hari
       sebelumnya tidak lagi ditandai di kanvas. Nilai = arah pilihan admin
       (p.side) supaya bubble menampilkan label koreksi long/short. */
    bbPicked = {};
    /* 11 Okt — reset MINGGUAN (permintaan user): tanda bubble hidup satu
       minggu, bukan hari ini saja — ada sinyal yang betul-betul perlu
       ditunggu sampai minggu berikutnya. Minggu pakai konvensi Senin-awal
       (fungsinya sudah ada). */
    var wk = weekIndex(new Date());
    Object.keys(PICKS).forEach(function (k) {
      var p = PICKS[k];
      if (!p || !p.taken) return;
      var tglSig = (k.split("|")[2] || "").slice(0, 10);
      if (!tglSig) return;
      var d = new Date(tglSig + "T00:00:00");
      if (isNaN(d.getTime()) || weekIndex(d) !== wk) return;   // minggu lain → tak ditandai
      var sym = (k.split("|")[3] || "").toUpperCase();
      if (!sym) return;
      /* nilai = {side, by, status} — label koreksi + nama admin yang
         mengambil + status (Menunggu / Ambil Posisi / Take Profit). */
      var side = (p.side === "long" || p.side === "short") ? p.side : false;
      var val = { side: side, by: (p.by === "Gerry" ? "Gerry" : "Qkuk"),
                  status: p.status || "menunggu" };
      /* 12 Okt — prioritas-6: dua admin bisa memilih SIMBOL YANG SAMA.
         Masih ditandai — tapi konflik disimpan juga, bubble menampilkan
         KEDUANYA dgn badge ⚔ (bukan diam-diam menimpa). */
      var lama = bbPicked[sym];
      if (!lama) { bbPicked[sym] = val; bbPicked[sym].satu = [val]; }
      else {
        var dup = (lama.satu || []).some(function (x) { return x.by === val.by && x.side === val.side; });
        if (!dup) {
          (lama.satu = lama.satu || []).push(val);
          lama.konflik = lama.satu.some(function (x) { return x.side !== lama.satu[0].side; });
          if (!lama.side && val.side) lama.side = val.side;
          if (val.by === "Gerry") lama.by = "Gerry";
        }
      }
    });
  }
  function bbPickedMark() {
    var plot = $("#bb-plot"); if (!plot) return;
    Array.prototype.forEach.call(plot.children, function (b) {
      var sym = b.dataset && b.dataset.sym; if (!sym) return;
      var pk = bbPicked[sym], on = !!pk;
      b.classList.toggle("gerry-side", on && pk.by === "Gerry");   // tone CSS utk pick Gerry
      b.classList.toggle("picked", on);
      var st = b.querySelector(".bbstar");
      if (on && !st) b.appendChild(el("span", "bbstar", "\u2605"));
      else if (!on && st && st.parentNode) st.parentNode.removeChild(st);
      /* 11 Okt — dua label DI DALAM bubble (terlihat semua pengunjung):
         .bbfix = arah pilihan admin (long hijau / short merah; lama),
         .bbadmin = SIAPA yang ambil (Qkuk / Gerry) + status pick
         (Menunggu / Ambil Posisi / Take Profit). */
      var side = on && pk && pk.side ? pk.side : null;
      var fx = b.querySelector(".bbfix");
      if (side) {
        if (!fx) { fx = el("u", "bbfix " + side, side); fx.dataset.side = side; b.appendChild(fx); }
        else if (fx.dataset.side !== side) {
          fx.className = "bbfix " + side; fx.textContent = side; fx.dataset.side = side;
        }
      } else if (fx && fx.parentNode) fx.parentNode.removeChild(fx);
      var adminEl = b.querySelector(".bbadmin");
      if (on && pk) {
        var STT = { menunggu: "Menunggu", entry: "Ambil Posisi", tp: "Take Profit" };
        var txt = (pk.by || "Qkuk") + (pk.side ? " · " + pk.side : "") + " · " + (STT[pk.status] || "Menunggu");
        /* 12 Okt — prioritas-6: dua admin pilih simbol sama → tampilkan keduanya dgn ⚔ */
        if ((pk.satu || []).length > 1) {
          txt = "\u2694 " + (pk.satu || []).map(function (x) {
            return (x.by || "?") + (x.side ? " " + x.side : "");
          }).join(" \u2694 ") + " \u00b7 " + (STT[pk.status] || "Menunggu");
          b.classList.add("duel");
        } else b.classList.remove("duel");
        if (!adminEl) { adminEl = el("b", "bbadmin", txt); b.appendChild(adminEl); }
        else if (adminEl.textContent !== txt) adminEl.textContent = txt;
      } else if (adminEl && adminEl.parentNode) adminEl.parentNode.removeChild(adminEl);
      if (on) {
        if (!b.dataset.ob) { b.dataset.ob = b.style.border || ""; b.dataset.os = b.style.boxShadow || ""; }
        var dia = b.offsetWidth || 40;
        b.style.border = "2px solid #ffd54f";
        b.style.boxShadow = "0 0 " + Math.round(dia * .45) + "px rgba(255,213,84,.42)"
          + ", inset 0 0 " + Math.round(dia * .22) + "px rgba(255,255,255,.06)";
      } else if (b.dataset.ob) {
        b.style.border = b.dataset.ob; b.style.boxShadow = b.dataset.os;
      }
    });
  }
  var bbRaf = null, bb24 = null, bbPx = null, bb24Ts = 0, bb24Fail = false;
  var bb24Src = -1, bbSrcName = ["Binance futures", "Binance spot", "CoinGecko", "CoinPaprika"];
  /* 15 Okt (permintaan user) — bubbles = SINYAL SEMUA ENGINE, SEMINGGU
     TERAKHIR (bukan per-tab engine). Update langsung tiap render (sidik
     jari); sinyal baru dapat animasi ring "ping" saat muncul. */
  function bubbleSig() {
    var rows = bubbleData(bMode) || [];
    return rows.map(function (d) { return d.tf + "|" + d.sym + "@" + d.ts; }).sort().join(",");
  }
  var bbSig = null;
  function bubbleData(mode, tf) {
    /* batas = 7 hari lalu (tanggal WIB) */
    var n = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000);
    n.setDate(n.getDate() - 7);
    var p = n.getFullYear() + "-" + ("0" + (n.getMonth() + 1)).slice(-2) + "-" + ("0" + n.getDate()).slice(-2);
    var out = [];
    ord().forEach(function (t) {
      /* 15 Okt v2 — filter per-tab: "all" = gabungan semua engine,
         tab lain = satu engine saja (permintaan user). */
      if (tf && tf !== "all" && t !== tf) return;
      var L = (DATA.live || {})[t], src = mode === "sinyal" ? L && L.sinyal : L && L.pantau;
      if (!src) return;
      src.forEach(function (r) {
        var ts = r.ts || "";
        if (ts.slice(0, 10) < p) return;        // seminggu terakhir saja
        out.push({ sym: r.sym, dir: r.dir, e: r.e, s: r.s, t: r.t, ts: ts,
          st: r.st, r: r.pnl, slp: num(r.slp), tf: t, egn: (L.nama || t).replace(/^[^\w]+/, "") });
      });
    });
    var seen = {};
    out.forEach(function (d) { seen[d.sym] = (seen[d.sym] || 0) + 1; });
    out.forEach(function (d) { d.n = seen[d.sym]; });
    out.sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });
    return out.slice(0, 40);                    // maks 40 bubble terbaru
  }
  /* 24 jam dari Binance fapi — sudah dicek CORS-nya terbuka (*). Cache
     60 detik: 455 ticker per request, jangan dipanggil tiap render. */
  function bbTicker(sym) {
    if (bb24 && bb24[sym] !== undefined) return bb24[sym];
    return null;
  }
  /* ── cache %24j di localStorage (permintaan 19 Sep): saat reload, chip &
     ukuran langsung tampil dari data terakhir sebelum fetch selesai. */
  var BB_CACHE_KEY = "qkuk_bb24_v1";
  function bbCacheSave() {
    try {
      var s = {};
      for (var k in bb24) if (Object.prototype.hasOwnProperty.call(bb24, k)) s[k] = bb24[k];
      localStorage.setItem(BB_CACHE_KEY, JSON.stringify({ t: Date.now(), src: bb24Src, m: s }));
    } catch (e) {}
  }
  function bbCacheLoad() {
    try {
      var j = JSON.parse(localStorage.getItem(BB_CACHE_KEY) || "null");
      if (!j || !j.m) return false;
      var age = Date.now() - (j.t || 0);
      if (age > 24 * 3600e3) return false;        // lebih dari sehari → buang
      bb24 = j.m; bb24Ts = 0;                     // t=0 → fetch segar tetap jalan
      bb24Src = (typeof j.src === "number" && j.src >= 0) ? j.src : -1;
      var h = $("#bubbles .hint");
      if (h && bb24Src >= 0) h.textContent = "coins detected by this engine only — % change is live 24h via "
        + bbSrcName[bb24Src] + " (cache)";
      return true;
    } catch (e) { return false; }
  }
  /* ── fallback %24j (permintaan 19 Sep): kalau fapi.binance.com diblokir
     jaringan, coba Binance spot, lalu CoinGecko — persen tetap tampil.
     Semua gagal → bb24Fail, ukuran bubble fallback ke jumlah engine. */
  function bbFetch(url, ms) {                 // fetch dgn batas waktu 6 dtk —
    var ctl = new AbortController();          // host diblokir tidak boleh menggantung
    var t = setTimeout(function () { ctl.abort(); }, ms || 6000);
    return fetch(url, { signal: ctl.signal }).finally(function () { clearTimeout(t); });
  }
  function bbFromBinance(host, path) {
    return bbFetch("https://" + host + path)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var m = {}, px = {};
        j.forEach(function (t) {
          m[t.symbol] = parseFloat(t.priceChangePercent);
          px[t.symbol] = parseFloat(t.lastPrice);
        });
        return { m: m, px: px };
      });
  }
  function bbFromPaprika() {                  // sumber ke-4: jarang diblokir ISP
    return bbFetch("https://api.coinpaprika.com/v1/tickers?limit=500")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var m = {}, px = {};
        (j || []).forEach(function (c) {
          var u = c.quotes && c.quotes.USD;
          if (!u) return;
          var s = (c.symbol || "").toUpperCase() + "USDT";
          m[s] = parseFloat(u.percent_change_24h);
          px[s] = parseFloat(u.price);
        });
        return { m: m, px: px };
      });
  }
  function bbFromGecko() {                    // 2 halaman x 250 koin teratas
    var get = function (pg) {
      return bbFetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
        + "&order=market_cap_desc&per_page=250&page=" + pg + "&price_change_percentage=24h")
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    };
    return Promise.all([get(1), get(2)]).then(function (ps) {
      var m = {}, px = {};
      ps.forEach(function (arr) { (arr || []).forEach(function (c) {
        var s = (c.symbol || "").toUpperCase() + "USDT";
        m[s] = parseFloat(c.price_change_percentage_24h);
        px[s] = parseFloat(c.current_price);
      }); });
      return { m: m, px: px };
    });
  }
  function bbLoad24(cb) {
    if (Date.now() - bb24Ts < 60000) { btcUpd(); cb(); return; }
    var chain = [
      function () { return bbFromBinance("fapi.binance.com", "/fapi/v1/ticker/24hr"); },
      function () { return bbFromBinance("api.binance.com", "/api/v3/ticker/24hr"); },
      bbFromGecko,
      bbFromPaprika
    ];
    var i = 0;
    (function next() {
      if (i >= chain.length) { bb24Fail = true; bb24Ts = Date.now(); btcUpd(); cb(); return; }
      var step = i++;
      chain[step]()
        .then(function (d) {
          if (!d || !Object.keys(d.m).length) throw new Error("kosong");
          bb24 = d.m; bbPx = d.px; bb24Ts = Date.now(); bb24Fail = false; bb24Src = step;
          bbCacheSave();
          var h = $("#bubbles .hint");                      // transparansi sumber
          if (h) h.textContent = "coins detected by this engine only — % change is live 24h via "
            + bbSrcName[step];
          btcUpd(); bbChips(); cb();
        })
        .catch(next);
    })();
  }
  /* BTC live di top bar — satu request ticker yang sama dengan bubbles,
     jadi nol request tambahan. Gagal fetch → tampil "—". */
  function btcUpd() {
    var b = $("#btcpx"); if (!b) return;
    /* ⚠️ isFinite(null) = true — cek null dulu, bukan isFinite saja */
    var p = bbPx ? bbPx.BTCUSDT : null, c = bb24 ? bb24.BTCUSDT : null;
    if (p == null || !isFinite(p)) { b.textContent = "—"; b.style.color = ""; return; }
    var s = p >= 1000 ? Math.round(p).toLocaleString("en-US") : p.toFixed(2);
    b.textContent = "$" + s + (c != null && isFinite(c) ? " " + (c > 0 ? "+" : "") + c.toFixed(2) + "%" : "");
    b.style.color = c > 0 ? "var(--up)" : c < 0 ? "var(--dn)" : "";
  }
  function bubbleChg(d) {                     // %24j atau null kalau tak ada data
    var c = bbTicker(d.sym);
    return (c === null || !isFinite(c)) ? null : c;
  }
  function bubbleRes(d) {
    var c = bubbleChg(d);
    if (c === null) return bb24Fail ? "id" : "id";
    return c > 0 ? "up" : c < 0 ? "dn" : "id";
  }
  /* ── ukuran bubble dari %24j live (permintaan 19 Sep): naik/turun makin
     besar % makin besar bubble — avax +30% besar, -30% juga besar tapi merah.
     Skala akar-kuadrat biar perbedaannya terasa tapi 20 koin tetap muat. */
  var bbNMax = 1;                             // fallback skala lama saat Binance tak terjangkau
  /* ── 7 TINGKAT dikurangi 30% (revisi 19 Sep): 34 → 43 → 57 → 74 → 96 →
     125 → 162px. Ambil 20/30/40% tetap terpisah jelas. */
  var BB_TIERS = [
    { m: 0,  dia: 34,  lab: "~0%" },
    { m: 1,  dia: 43,  lab: "±2%" },
    { m: 3,  dia: 57,  lab: "±5%" },
    { m: 7,  dia: 74,  lab: "±10%" },
    { m: 15, dia: 96,  lab: "±20%" },
    { m: 25, dia: 125, lab: "±30%" },
    { m: 35, dia: 162, lab: "±40%+" }
  ];
  function bbTier(c) {
    var a = Math.abs(c), t = 0;
    for (var i = BB_TIERS.length - 1; i >= 0; i--) {
      if (a >= BB_TIERS[i].m) { t = i; break; }
    }
    return t;
  }
  function bbDia(d) {                         // %24j -> diameter px (tier)
    var c = bb24 ? bubbleChg(d) : null;
    if (c !== null) return BB_TIERS[bbTier(c)].dia;
    if (!bb24) {                              // offline: pakai skala jumlah engine (perilaku lama)
      return 34 + Math.min(1, ((d.n || 1) - 1) / Math.max(1, bbNMax - 1)) * 34;
    }
    return BB_TIERS[0].dia;                   // sumber OK tapi koin tak terdaftar
  }
  function bbApplyDia(body, dia) {            // tulis ukuran baru ke badan fisik
    body.r = dia / 2;
    body.el.style.width = body.el.style.height = dia.toFixed(1) + "px";
    var fs = dia > 56 ? 11.5 : dia > 44 ? 10 : 8.5;
    body.el.style.fontSize = fs + "px";
  }
  /* ── chip koin teraktif: 6 koin dengan |%24j| terbesar di kanal aktif,
     satu klik = sorot bubble-nya (klik lagi = lepas sorot). Digenerate
     ulang tiap data 24j segar, jadi selalu mengikuti kondisi pasar. */
  function bbChips() {
    var host = $("#b-chips");
    if (!host) return;
    /* koin yang dipilih user di CSV (kolom picked) — dapat badge bintang.
       15 Okt: bubbles gabungan semua engine → picked diambil dari SEMUA kanal. */
    var picked = {};
    ord().forEach(function (tf) {
      var L2 = (DATA && DATA.live && DATA.live[tf]) || {};
      (L2.sinyal || []).forEach(function (r) { if (r.pick) picked[r.sym] = true; });
      (L2.pantau || []).forEach(function (r) { if (r.pick) picked[r.sym] = true; });
    });
    var seen = {}, list = [];
    bbBodies.forEach(function (b) {
      if (seen[b.sym]) return; seen[b.sym] = 1;
      var c = bubbleChg({ sym: b.sym });
      if (c === null || !isFinite(c)) {
        /* picked tanpa data %24j tetap masuk (di urutan depan), tanpa persen */
        if (picked[b.sym]) list.push({ sym: b.sym, c: null, pick: true });
        return;
      }
      list.push({ sym: b.sym, c: c, pick: !!picked[b.sym] });
    });
    list.sort(function (a, b) {                 // picked user selalu tampil,
      return (b.pick ? 1 : 0) - (a.pick ? 1 : 0)
        || Math.abs(b.c == null ? -1 : b.c) - Math.abs(a.c == null ? -1 : a.c);
    });
    host.innerHTML = "";
    list.slice(0, 8).forEach(function (d) {
      var nm = d.sym.replace(/USDT$/, "");
      var pct = d.c == null ? "" : " " + (d.c > 0 ? "+" : "") + d.c.toFixed(1) + "%";
      var ch = el("button", "chip" + (d.pick ? " pick" : ""),
        (d.pick ? "★ " : "") + nm + pct);
      ch.style.color = d.c == null ? "var(--fg-2)" : d.c > 0 ? "var(--up)" : "var(--dn)";
      ch.title = "sorot bubble " + nm + (d.pick ? " — picked by you" : "");
      ch.addEventListener("click", function () {
        var box = $("#b-q");
        if (bq === nm) { bq = ""; if (box) box.value = ""; }
        else { bq = nm; if (box) box.value = bq; }
        bbSorot();
      });
      host.appendChild(ch);
    });
    if (!list.length) host.appendChild(el("span", "chip-empty", "menunggu data %24j…"));
  }
  /* ── sorot hasil pencarian bubble: yang cocok dapat ring berdenyut,
     sisanya diredupkan. Kosongkan kotak → semua normal lagi. */
  function bbSorot() {
    bbBodies.forEach(function (body) {
      var el = body.el;
      if (!bq) { el.classList.remove("dim", "hit"); return; }
      var nm = (body.sym || "").replace(/USDT$/, "");
      var hit = nm.indexOf(bq) !== -1 || (body.sym || "").indexOf(bq) !== -1;
      el.classList.toggle("hit", hit);
      el.classList.toggle("dim", !hit);
    });
  }
  function bubbleAura(d) {                    // koin ada di catatan engine hari ini?
    var hariIni = (function () {
      var n = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000);
      return n.getFullYear() + "-" + ("0" + (n.getMonth() + 1)).slice(-2) + "-" + ("0" + n.getDate()).slice(-2);
    })();
    return (d.ts || "").slice(0, 10) === hariIni;
  }
  function bbStop() { if (bbRaf) { cancelAnimationFrame(bbRaf); bbRaf = null; } }
  function bbTick() {
    var plot = $("#bb-plot");
    if (!plot || !bbBodies.length) { bbRaf = null; return; }
    var W = plot.clientWidth, H = plot.clientHeight;
    var i, j, a, b2, dx, dy, dist, min, ov, nx, ny, imp;
    for (i = 0; i < bbBodies.length; i++) {
      a = bbBodies[i];
      if (a.drag) continue;                   // yang dipegang tidak digerakkan fisika
      a.vx += (Math.random() - .5) * .028;    // gaya melayang lembut
      a.vy += (Math.random() - .5) * .028;    // tanpa gravitasi — targetnya
      a.vx *= .992; a.vy *= .992;             // distribusi merata, bukan menggumpal
      var sp = Math.hypot(a.vx, a.vy);
      if (sp > .55) { a.vx *= .55 / sp; a.vy *= .55 / sp; }
      // jaga jarak dari dinding: di dekat tepi, dorong balik ke tengah secara halus
      var cx = W / 2, cy = H / 2;
      if (a.x < W * .18) a.vx += (W * .18 - a.x) / W * .12;
      if (a.x > W * .82) a.vx -= (a.x - W * .82) / W * .12;
      if (a.y < H * .22) a.vy += (H * .22 - a.y) / H * .12;
      if (a.y > H * .78) a.vy -= (a.y - H * .78) / H * .12;
      a.x += a.vx; a.y += a.vy;
      if (a.x < a.r) { a.x = a.r; a.vx = Math.abs(a.vx) * .8; }
      if (a.x > W - a.r) { a.x = W - a.r; a.vx = -Math.abs(a.vx) * .8; }
      if (a.y < a.r) { a.y = a.r; a.vy = Math.abs(a.vy) * .8; }
      if (a.y > H - a.r) { a.y = H - a.r; a.vy = -Math.abs(a.vy) * .8; }
    }
    for (i = 0; i < bbBodies.length; i++) {
      for (j = i + 1; j < bbBodies.length; j++) {
        a = bbBodies[i]; b2 = bbBodies[j];
        dx = b2.x - a.x; dy = b2.y - a.y;
        dist = Math.hypot(dx, dy) || .01;
        min = a.r + b2.r;
        if (dist < min) {
          nx = dx / dist; ny = dy / dist;
          ov = (min - dist) / 2;
          if (!a.drag) { a.x -= nx * ov; a.y -= ny * ov; }
          if (!b2.drag) { b2.x += nx * ov; b2.y += ny * ov; }
          imp = (a.vx - b2.vx) * nx + (a.vy - b2.vy) * ny;   // tumbukan elastis
          if (imp > 0) {
            if (!a.drag) { a.vx -= imp * nx; a.vy -= imp * ny; }
            if (!b2.drag) { b2.vx += imp * nx; b2.vy += imp * ny; }
          }
        }
      }
    }
    for (i = 0; i < bbBodies.length; i++) {
      a = bbBodies[i];
      a.el.style.transform = "translate(" + (a.x - a.r).toFixed(1) + "px," + (a.y - a.r).toFixed(1) + "px)";
    }
    bbRaf = requestAnimationFrame(bbTick);
  }
  function bubbleDraw() {
    var plot = $("#bb-plot"), tip = $("#bb-tip");
    if (!plot) return;   // 8 Okt: section Bubbles dihapus dari index.html — biarkan mati
    bbStop(); bbBodies = [];
    plot.innerHTML = ""; tip.classList.remove("on");
    /* 15 Okt v2 — filter per-engine dikembalikan (permintaan user):
       tab "SEMUA" = gabungan seminggu (revisi sebelumnya), tab lain =
       satu engine. Jendela 7 hari & maks 40 bubble tetap berlaku. */
    var tf = bTf && (bTf === "all" || DATA.live[bTf]) ? bTf : "all";
    bTf = tf;
    var rows = bubbleData(bMode, tf);
    bbSig = bubbleSig();                      // sidik jari untuk deteksi perubahan
    var tabsEl = $("#b-tabs");
    if (tabsEl) {
      tabsEl.innerHTML = "";
      var mk = el("button", "tab" + (tf === "all" ? " on" : ""), "SEMUA");
      mk.setAttribute("role", "tab");
      mk.setAttribute("aria-selected", tf === "all" ? "true" : "false");
      mk.addEventListener("click", function () { bTf = "all"; bubbleDraw(); });
      tabsEl.appendChild(mk);
      ord().forEach(function (t) {
        var b = el("button", "tab" + (tf === t ? " on" : ""), TAB_NAME[t] || t.toUpperCase());
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", tf === t ? "true" : "false");
        b.addEventListener("click", function () { bTf = t; bubbleDraw(); });
        tabsEl.appendChild(b);
      });
    }
    if (!rows.length) {
      plot.appendChild(el("div", "empty", tf === "all" ? "Belum ada sinyal seminggu terakhir." : kosong(tf, "sinyal")));
      return;
    }
    var W = plot.clientWidth || 900, H = plot.clientHeight || 480;
    var nMax = Math.max.apply(null, rows.map(function (d) { return d.n || 1; }));
    bbNMax = nMax;
    // koin unik diposisikan sekali; koin yang muncul berulang membesarkan
    // gelembungnya, bukan menggandakannya (satu koin = satu gelembung).
    var uniq = {};
    rows.forEach(function (d) {
      var u = uniq[d.sym];
      if (!u) { u = uniq[d.sym] = Object.assign({}, d); u.tries = 0; }
      else {
        u.n = Math.max(u.n || 1, d.n || 1);
        if ((d.ts || "") > (u.ts || "")) Object.assign(u, { ts: d.ts, dir: d.dir,
          lv: d.lv, h: d.h, r: d.r, e: d.e, s: d.s, t: d.t, st: d.st, slp: d.slp });
      }
    });
    var list = Object.keys(uniq).map(function (k) { return uniq[k]; });
    list.sort(function (a, b) {                 // besar dulu; tie → |%| asli menentukan
      var ca = bb24 ? bubbleChg(a) : null, cb = bb24 ? bubbleChg(b) : null;
      return bbDia(b) - bbDia(a)
        || Math.abs(cb == null ? 0 : cb) - Math.abs(ca == null ? 0 : ca);
    });  // → z stabil & bola panas selalu milik mover % tertinggi
    var placed = [];
    /* ── permintaan 19 Sep: mover terbesar di tengah panggung supaya
       langsung mencolok. Sel grid yang dekat tengah dicadangkan (tidak
       dipakai koin lain), 3 terbesar diletakkan segitiga golden-angle
       mengelilingi pusat; sisanya disebar ke sel luar seperti sebelumnya. */
    var cols = Math.max(1, Math.floor(W / 90)), rowsN = Math.max(1, Math.floor(H / 90));
    var cells = [];
    for (var ci = 0; ci < cols; ci++) for (var cj = 0; cj < rowsN; cj++)
      cells.push({ gx: (ci + .5) / cols, gy: (cj + .5) / rowsN });
    var ccx = W / 2, ccy = H / 2, keep = Math.min(W, H) * .16;   // zona pusat kosong
    var outer = cells.filter(function (c) { return Math.hypot(c.gx * W - ccx, c.gy * H - ccy) > keep; });
    var slots = outer.length >= Math.max(0, list.length - 3) ? outer : cells;
    var TOPN = Math.min(3, list.length);
    list.forEach(function (d, li) {
      var base = bbDia(d);                                    // diameter dari %24j live (cache 60 dtk)
      var r = base / 2;
      var x, y;
      if (li < TOPN) {
        /* pusat panggung: #1 tepat di tengah, #2 & #3 mengapit golden-angle */
        var ang = li * 2.39996 + .35, rad = li === 0 ? 0 : Math.min(W, H) * .09;
        x = ccx + Math.cos(ang) * rad;
        y = ccy + Math.sin(ang) * rad;
      } else {
        var c = slots[(li - TOPN) % slots.length];
        x = c.gx * W + (Math.random() - .5) * 24;
        y = c.gy * H + (Math.random() - .5) * 24;
      }
      x = Math.max(r + 4, Math.min(W - r - 4, x));
      y = Math.max(r + 4, Math.min(H - r - 4, y));
      var tries = 0, ok = false;
      while (tries++ < 40 && !ok) {
        ok = placed.every(function (p) { return Math.hypot(p.x - x, p.y - y) > (p.r + r) * 1.02; });
        if (!ok) {
          x = r + 4 + Math.random() * Math.max(1, W - 2 * (r + 4));
          y = r + 4 + Math.random() * Math.max(1, H - 2 * (r + 4));
        }
      }
      placed.push({ x: x, y: y, r: r });
      d._x = x; d._y = y; d._r = r; d._dia = base;   // _top tidak dipakai lagi (api dihapus)
    });
    var tsTerbaru = rows.length ? rows[0].ts : "";   // sinyal terbaru → animasi ping
    list.forEach(function (d) {
      var res = bubbleRes(d);
      var C = BB[res];
      var b = el("div", "bb" + (tsTerbaru && d.ts === tsTerbaru ? " baru" : ""));
      b.style.width = b.style.height = d._dia.toFixed(1) + "px";
      b.style.background = "radial-gradient(circle at 32% 26%, rgba(255,255,255,.20), "
        + C.fill + " 46%, rgba(255,255,255,.03) 100%)";
      b.style.border = "1px solid " + C.edge;
      b.style.boxShadow = "0 0 " + Math.round(d._dia * .3) + "px " + C.glow
        + ", inset 0 0 " + Math.round(d._dia * .22) + "px rgba(255,255,255,.06)";
      b.style.color = C.txt;
      var fs = d._dia > 56 ? 11.5 : d._dia > 44 ? 10 : 8.5;
      b.style.fontSize = fs + "px";
      b.dataset.sym = d.sym;                    // dipakai sorot pencarian & resize
      if (bubbleAura(d)) {
        var au = el("span", "aura");
        au.style.background = "radial-gradient(circle, " + C.glow + " 0%, transparent 70%)";
        au.style.animationDelay = (Math.random() * 1200).toFixed(0) + "ms";
        b.appendChild(au);
      }
      /* aura bola panas dihapus (revisi 19 Sep) — kanvas bersih tanpa api */
      var nm = d.sym.replace(/USDT$/, "");
      b.appendChild(el("b", null, nm));
      b.appendChild(el("em", "bb-tag", d.tf.toUpperCase()));   // tag engine (2H/OB/WHALE/…)
      var chg = bubbleChg(d);
      b.appendChild(el("i", null,
        chg === null ? "n/a" : (chg > 0 ? "+" : "") + chg.toFixed(2) + "%"));
      plot.appendChild(b);
      var body = { el: b, x: d._x, y: d._y, vx: (Math.random() - .5) * .3,
        vy: (Math.random() - .5) * .3, r: d._r, drag: false, sym: d.sym };
      bbBodies.push(body);
      /* ── drag: tekan-tahan, mouse & sentuh ──
         Lepas setelah MENGESER = tidak membuka apa pun (user cuma ingin
         geser). TradingView hanya terbuka kalau gelembung DITEKAN SAJA
         (total geseran < 6px) — jadi hold-and-drag aman dari buka-tab
         tak sengaja. */
      function grab(ev) {
        body.drag = true; b.classList.add("drag");
        plot.classList.add("dragging");
        tip.classList.remove("on");
        var pt = ev.touches ? ev.touches[0] : ev;
        var lx = pt.clientX, ly = pt.clientY, movedPx = 0;
        function move(e2) {
          var p2 = e2.touches ? e2.touches[0] : e2;
          var vx = (p2.clientX - lx), vy = (p2.clientY - ly);
          movedPx += Math.hypot(vx, vy);
          lx = p2.clientX; ly = p2.clientY;
          body.x = Math.max(body.r, Math.min(plot.clientWidth - body.r, body.x + vx));
          body.y = Math.max(body.r, Math.min(plot.clientHeight - body.r, body.y + vy));
          body.vx = Math.max(-2, Math.min(2, vx * .35));      // lempar saat dilepas
          body.vy = Math.max(-2, Math.min(2, vy * .35));
          e2.preventDefault();
        }
        function up() {
          body.drag = false; b.classList.remove("drag");
          plot.classList.remove("dragging");
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
          window.removeEventListener("touchmove", move);
          window.removeEventListener("touchend", up);
          /* bubble yang sedang DISOROT pencarian langsung buka TradingView
             walau sempat digeser (permintaan 19 Sep); sorotan dibersihkan
             kalau tab-nya benar-benar terbuka. Tap biasa: aturan lama (<6px). */
          var tersorot = b.classList.contains("hit");
          if (movedPx < 6 || tersorot) {
            var w = null;
            try { w = window.open(tvUrl(d.sym, d.tf), "_blank", "noopener"); } catch (e) {}
            if (tersorot && w) {
              bq = ""; var bi = $("#b-q"); if (bi) bi.value = "";
              bbSorot();
            }
          }
        }
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
        window.addEventListener("touchmove", move, { passive: false });
        window.addEventListener("touchend", up);
        ev.preventDefault();
      }
      b.addEventListener("mousedown", grab);
      b.addEventListener("touchstart", grab, { passive: false });
      /* tooltip detail engine */
      b.addEventListener("mouseenter", function (ev) {
        if (body.drag) return;
        tip.innerHTML = "";
        var hd = el("div", "hd", nm + " · " + d.dir.toUpperCase() + " · "
          + ((d.egn || d.tf) + " · " + (d.tf || "").toUpperCase()));
        tip.appendChild(hd);
        var t = el("div", "t");
        function rw(l, v2, cls) {
          t.appendChild(el("span", "l", l)); t.appendChild(el("span", "d"));
          t.appendChild(el("span", "v " + (cls || ""), v2));
        }
        var c24 = bubbleChg(d);
        rw("24h", c24 === null ? "no data" : (c24 > 0 ? "+" : "") + c24.toFixed(2) + "%",
           c24 === null ? "" : c24 > 0 ? "pos" : c24 < 0 ? "neg" : "");
        rw("time", d.ts || "—");
        {
          rw("entry", fp(d.e)); rw("stop", fp(d.s)); rw("target", fp(d.t));
          rw("stop width", num(d.slp) === null ? "—" : num(d.slp).toFixed(2) + "%");
          var rr = (d.st === "fired") ? null : num(d.r);
          rw("result", rr === null ? "open" : sgn(rr, 2) + "R",
             rr === null ? "" : rr > 0 ? "pos" : "neg");
        }
        rw("seen", String(d.n || 1) + "x on " + tf.toUpperCase());
        tip.appendChild(t);
        tip.classList.add("on");
      });
      b.addEventListener("mousemove", function (ev) {
        if (body.drag) { tip.classList.remove("on"); return; }
        var rc = plot.getBoundingClientRect();
        var tx = ev.clientX - rc.left + 14, ty = ev.clientY - rc.top + 14;
        if (tx + 260 > rc.width) tx = ev.clientX - rc.left - 264;
        if (ty + 150 > rc.height) ty = Math.max(4, ty - 160);
        tip.style.left = tx.toFixed(0) + "px"; tip.style.top = ty.toFixed(0) + "px";
      });
      b.addEventListener("mouseleave", function () { tip.classList.remove("on"); });
    });
    bbRaf = requestAnimationFrame(bbTick);
    bbChips();                    // placeholder chip langsung tampil;
    bbPickedMark();               // tanda admin untuk render awal (kalau picks sudah ada)
                                  // digenerate ulang saat %24j tiba
    bbLoad24(function () {        // angka %24j datang belakangan — pasang saat tiba
      if (!DATA) return;
      bbBodies.forEach(function (body) {
        var d2 = list.filter(function (q) { return q.sym === body.sym; })[0];
        if (!d2) return;        var res = bubbleRes(d2), C = BB[res];
        bbApplyDia(body, bbDia(d2));             // ukuran mengikuti %24j yang baru tiba
        body.el.classList.remove("hot");         // api dihapus — tidak ada status hot lagi
        body.el.style.background = "radial-gradient(circle at 32% 26%, rgba(255,255,255,.20), "
          + C.fill + " 46%, rgba(255,255,255,.03) 100%)";
        body.el.style.border = "1px solid " + C.edge;
        body.el.style.boxShadow = "0 0 " + Math.round(body.r * 2 * .3) + "px " + C.glow
          + ", inset 0 0 " + Math.round(body.r * 2 * .22) + "px rgba(255,255,255,.06)";
        body.el.style.color = C.txt;
        var chg = bubbleChg(d2);
        var iEl = body.el.querySelector("i");
        if (iEl && chg !== null)
          iEl.textContent = (chg > 0 ? "+" : "") + chg.toFixed(2) + "%";
      });
      bbPickedMark();           // border di-reset saat %24j tiba — tanda admin dipasang ulang
    });
  }

  /* ── live chrome ── */
  function clock() {
    var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    $("#clock").textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    $("#cd").textContent = LEFT + "s";
    if (--LEFT < 0) LEFT = 60;
  }
  function stamp() {
    var s = DATA.dibuat || "";
    $("#stamp").textContent = s.replace(/^\d{2} \w{3} \d{4} · /, "");
    $("#foot").textContent = "engine data written " + s;
    /* ⚠️ Cara lama membandingkan jam WIB di string `dibuat` dgn jam WIB di
       komputer pembaca — kalau jam komputer salah zona (mis. mesin Windows
       dianggap WIB padahal bukan), data baru pun dilabel "stale". Sekarang
       umur file diukur dari header Date respons HTTP (jam server Pages,
       akurat): fallback ke jam-string hanya kalau header tak terbaca. */
    var age = stamp.ageMs != null ? stamp.ageMs / 60000 : null;
    if (age == null) {
      var m = /(\d{2}):(\d{2})\s*WIB/.exec(s);
      if (!m) return;
      var now = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000);
      var mins = (now.getHours() * 60 + now.getMinutes()) - (+m[1] * 60 + +m[2]);
      if (mins < 0) mins += 1440;
      age = mins;
    }
    var stale = age > 180;
    $("#dot").classList.toggle("stale", stale);
    $("#state").textContent = stale ? "stale" : "live";
    /* 14 Okt (prioritas #3) — BANNER DATA BASI: statis di topbar bila data
       lebih tua dari 3 jam & belum ada banner. Hilang sendiri setelah poll
       mendapat data segar (stale → false). Tidak menutupi UI (posisi absolute). */
    var st = $("#stalebar");
    if (stale) {
      if (!st) {
        // inject topbar div — ada di index.html
        st = el("div", "stalebar"); st.id = "stalebar";
        var host_ = document.querySelector(".bar-in") || document.body;
        host_.parentNode.insertBefore(st, host_);
      }
      st.textContent = "⚠️ data basi · terakhir: " + (age >= 60 ? (age / 60).toFixed(1) + " jam" : Math.round(age) + " mnt")
                     + " lalu — bot mati? cek grup/mesin";
      st.title = "data.json tertulis " + (DATA.dibuat || "?") + " (umur dari header server)";
    } else if (st && st.parentNode) {
      st.parentNode.removeChild(st);
    }
  }
  /* 5 Okt — badge riset backtest (logs/bt_final_kanal.csv via data.json.bt).
     Data hilang → strip disembunyi.
     5 Okt — ⚡ SNIPER 1h DIHAPUS dari tampilan (mati permanen 3 Okt).
     5 Okt — sumber angka DIGANTI total: 18 bulan (Apr 2025–Sep 2026), TP 2R
     (bukan 1R seperti bt_bandeng_dart.csv lama), dan SETELAH gate arah rezim
     BTC dipasang. Karena itu tiap kartu kini menampilkan CI bootstrap + label
     "belum terbukti" bila rentang 95% memotong nol — menampilkan totalR
     positif tanpa itu akan terbaca seperti edge yang tak terbukti. */
  function btBadges() {
    var host = $("#bt-badges");
    if (!host) return;
    var bt = DATA && DATA.bt;
    var wh = DATA && DATA.bt_whale;
    /* 6 Okt malam (permintaan user): REVERSAL 30m dihapus dari strip (kanal
       mati), dan kartu 🐳 WHALE yang terpisah DILEBUR ke sini — semua kanal
       satu desain badge; detail riset WHALE (jendela, populasi, resep,
       IS→OOS)       pindah ke tooltip badge-nya.
     7 Okt — kartu lain dimatikan & DIHAPUS dari strip (EV-nya negatif) dan
       penggantinya 🧱 BRICK masuk: kanal 30m MSS→IDM→zona OB+mantul,
       gerbang searah BTC 24 jam, TP 3R (data.json.bt_engine_ob).
     7 Okt (kemudian) — 🧵 SWING (Sweep+Reclaim 4h) masuk strip lagi; strip
       kini 4 engine = HARVEST · BRICK · SWING · WHALE (data.json.bt_swing,
       JSON statis dari duel RCL: n=112 · WR 59,8% · EV +0,333R · 10/12 bln).
     8 Okt — rebrand "🧷 ENGINE OB" DIBATALKAN (hasil live buruk, keputusan
       user) → label kembali 🧱 BRICK. */
    if (!bt || !bt["2h"]) {
      var s = document.getElementById("btstrip"); if (s) s.style.display = "none";
      return;
    }
    host.innerHTML = "";
    var list = [];
    if (bt["2h"]) list.push({ nama: "🩸 HARVEST", chip: "2H", d: bt["2h"] });
    if (wh && wh.n) list.push({ nama: "🐳 WHALE", chip: "WHALE",
      d: { wr: wh.wr, ev: wh.ev, totr: wh.totr, n: wh.n }, w: wh });
    var ek = DATA && DATA.bt_engine_ob;
    if (ek && ek.n) list.push({ nama: "🧱 BRICK", chip: "BRICK",
      d: { wr: ek.wr, ev: ek.ev, totr: ek.totr, n: ek.n,
           ci: ek.ci, significant: ek.significant, per_arah: ek.per_arah },
      w: ek });
    var sw = DATA && DATA.bt_swing;
    if (sw && sw.n) list.push({ nama: "🧵 SWING", chip: "4h",
      d: { wr: sw.wr, ev: sw.ev, totr: sw.totr, n: sw.n,
           ci: sw.ci, significant: sw.significant, per_arah: sw.per_arah },
      w: sw });
    list.sort(function (a, b) { return (b.d.ev || 0) - (a.d.ev || 0); });
    list.forEach(function (it, i) {
      var d = it.d;
      var b = el("div", "bt-badge" + (i === 0 ? " is-1" : ""));
      b.appendChild(el("span", "bt-rank", "#" + (i + 1)));
      var nm = el("div", "bt-nama");
      nm.appendChild(document.createTextNode(it.nama));
      nm.appendChild(el("span", "bt-tf t" + it.chip.toLowerCase(), it.chip));
      b.appendChild(nm);
      if (it.w) {
        var w = it.w;
        b.title = "Riset " + it.nama + ": " + (w.jendela || "?") + " · " + (w.populasi || "?")
          + " · resep " + (w.resep || "?")
          + (w.is && w.oos && w.is.n && w.oos.n
              ? " · IS WR " + w.is.wr.toFixed(1) + "% (EV " + sgn(w.is.ev, 3) + ", n=" + w.is.n + ")"
                + " → OOS WR " + w.oos.wr.toFixed(1) + "% (EV " + sgn(w.oos.ev, 3) + ", n=" + w.oos.n + ")"
              : "");
      }
      var an = el("div", "bt-angka");
      [["winrate", (d.wr != null ? d.wr.toFixed(1) : "—") + "%", d.wr >= 50 ? "pos" : "neg"],
       ["totR", (d.totr >= 0 ? "+" : "") + d.totr + "R", d.totr >= 0 ? "pos" : "neg"],
       ["EV/R", (d.ev >= 0 ? "+" : "") + d.ev.toFixed(3), d.ev >= 0 ? "pos" : "neg"],
       ["n", d.n.toLocaleString("id-ID"), ""]].forEach(function (q) {
        var c = el("div");
        c.appendChild(el("span", "k", q[0]));
        var v = el("span", "v " + q[2], String(q[1]));
        c.appendChild(v); an.appendChild(c);
      });
      b.appendChild(an);
      /* bukti, bukan kosmetik: rentang CI + status per arah. Tanpa ini
         totalR +125R akan terbaca sama bobotnya dengan +543R padahal yang
         pertama CI-nya memotong nol. */
      if (d.ci) {
        var ci = el("div", "bt-ci");
        ci.appendChild(el("span", "k", "EV 95% CI"));
        var sci = d.significant;
        ci.appendChild(el("span", "v " + (sci ? "pos" : "warn"),
          (d.ci[0] >= 0 ? "+" : "") + d.ci[0].toFixed(3) + " … " +
          (d.ci[1] >= 0 ? "+" : "") + d.ci[1].toFixed(3) +
          (sci ? "" : d.ci[1] < 0 ? "  ❌ terbukti negatif" : "  ⚠️ belum terbukti")));
        b.appendChild(ci);
      }
      if (d.per_arah) {
        var pa = el("div", "bt-arah");
        ["long", "short"].forEach(function (a) {
          var x = d.per_arah[a];
          if (!x) return;
          var s2 = el("span", "bt-a " + (x.ev >= 0 ? "pos" : "neg") +
                               (x.significant ? "" : " warn"));
          s2.textContent = a + " " + x.wr.toFixed(1) + "% · " +
                           (x.ev >= 0 ? "+" : "") + x.ev.toFixed(3) + "R" +
                           (x.significant ? "" : " ⚠");
          s2.title = a + ": n=" + x.n.toLocaleString("id-ID") +
                     " · EV " + (x.ev >= 0 ? "+" : "") + x.ev.toFixed(3) +
                     "R · " + (x.significant
                       ? "bootstrap 95% seluruhnya di atas nol"
                       : "bootstrap 95% memotong nol — belum terbukti unggul");
          pa.appendChild(s2);
        });
        b.appendChild(pa);
      }
      host.appendChild(b);
    });
    var lg = $("#bt-lg");
    if (lg && bt.jendela) {
      lg.textContent = (bt.total_setup || 0).toLocaleString("id-ID") +
                       " setup · " + bt.jendela +
                       (bt.gate ? " · " + bt.gate : "");
    }
  }

  /* 6 Okt malam — kartu 🐳 WHALE terpisah DIHAPUS (permintaan user: "jangan
     beda sendiri"): angkanya kini badge di strip backtest atas, detail
     risetnya di tooltip. Fungsi lama whaleCard() dibuang. */
  function render(first) {
    liveScoreMount();       // 11 Okt: live score klasemen — PALING ATAS halaman
    stamp(); gauge(); strip(); kamu(); applyPicks(); btBadges();
    scanNotif();
    if (!DATA || !DATA.live) return;
    var _bsig = bubbleSig();                  // data segar bisa menambah sinyal baru
    if (first || !bbBodies.length || _bsig !== bbSig) bubbleDraw();
    rerenderTables();
  }
  /* 8 Okt — render ulang tabel #s-table sesuai mode (sinyal / watchlist).
     Pemanggil lama "if (wTf) watch(wTf); if (sTf) signals(sTf);" memakai ini. */
  function rerenderTables() {
    var tf = sTf && DATA.live[sTf] ? sTf : ord()[0];
    if (sMode === "watch") watch(tf); else signals(tf);
  }
  /* 27 Sep — baris kembar (sym+ts sama) dalam satu kanal dibuang saat data
     tiba: pickKey baris kembar identik sehingga satu pick admin "menimpa"
     baris kembarnya dan pick tampak ganda/hilang. Sumbernya CSV engine yang
     tertulis ulang; publish_site.py juga mendedup — ini jaring pengaman web. */
  function dedupRows() {
    if (!DATA || !DATA.live) return;
    ord().forEach(function (tf) {
      ["pantau", "sinyal"].forEach(function (jenis) {
        var arr = DATA.live[tf] && DATA.live[tf][jenis];
        if (!arr || !arr.length) return;
        var seen = {}, out = [];
        arr.forEach(function (r) {
          var k = (r.ts || "") + "|" + (r.sym || "");
          if (seen[k]) return;
          seen[k] = 1; out.push(r);
        });
        if (out.length !== arr.length) DATA.live[tf][jenis] = out;
      });
    });
  }
  function load(first) {
    fetch("data.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        var d = r.headers.get("last-modified") || r.headers.get("date"); // umur file = kapan file terakhir ditulis (bukan jam cache CDN)
        if (d) { var t = Date.parse(d); if (isFinite(t)) stamp.ageMs = Date.now() - t; }
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (j) {
        // Penjaga anti-loop: hanya kalau penanaman versi BERHASIL, keduanya ada
        // dan berbeda, dan belum memuat ulang untuk versi itu barusan.
        if (BUILD.indexOf("BUILD") === -1 && j.build && j.build !== BUILD) {
          var k = "rl:" + j.build, t = 0;
          try { t = +(sessionStorage.getItem(k) || 0); } catch (e) {}
          if (Date.now() - t > 30000) {
            try { sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
            location.reload();
            return;
          }
        }
        /* ⚠️ JANGAN reset NOTE.seen di sini — kalau baseline di-reset tiap
           poll, baris baru selalu terserap diam-diam dan tidak pernah
           dibunyikan. Basis segar otomatis terbentuk saat halaman reload
           karena versi build berubah. */
        DATA = j; dedupRows(); LEFT = 60; render(first);
      })
      .catch(function () {
        if (!DATA) { $("#state").textContent = "no data"; $("#dot").classList.add("stale"); }
      });
  }
  $("#s-q").addEventListener("input", function () {
    sQ = this.value.trim().toUpperCase(); rerenderTables();
  });
  /* 15 Okt (bug user: search bubbles tak ada response) — #b-q tidak punya
     listener sama sekali. Saat mengetik: sorot bubble yang cocok. Escape/klik
     X (type=search) membersihkan sorotan. */
  $("#b-q").addEventListener("input", function () {
    bq = this.value.trim().toUpperCase();
    bbSorot();
  });
  $("#b-q").addEventListener("search", function () {
    if (!this.value) { bq = ""; bbSorot(); }
  });
  $("#s-side").addEventListener("change", function () {
    sSide = this.value; rerenderTables();
  });
  $("#s-sort").addEventListener("change", function () {
    sSort = this.value; rerenderTables();
  });

  /* ── notifikasi watchlist / sinyal baru ──
     Toast kanan-atas + bunyi via Web Audio (tanpa file audio — CSP
     situs hanya mengizinkan 'self'). Klik badan toast = buka chart
     TradingView koin itu; tombol × = tutup notifikasi saja.
     Pembandingnya KUNCI (timestamp WIB + simbol + timeframe): timestamp
     tidak berubah saat resolver mengisi hasil, jadi baris yang sama tidak
     dibunyikan dua kali. Muatan pertama = baseline, tidak di-toast.

     23 Sep — 20 JENIS SUARA: pengguna bebas memilih karakter notifikasi
     (ding, bell, chip, pulse, digital, radar, drop, coin, chime, dst.)
     lewat panel ⚙ di samping tombol 🔔. Semuanya disintesis Web Audio
     realtime — tanpa file, tetap lolos CSP. Pilihan + volume tersimpan
     di localStorage per perangkat. Volume default jauh lebih keras dari
     versi lama (dulu puncak gain implisit ~0.09). */
  var NOTE = { seen: null, n: 0 };
  var MUTE = false;
  try { MUTE = localStorage.getItem("qkuk_mute") === "1"; } catch (e) {}

  /* ══ 20 JENIS SUARA NOTIFIKASI (Web Audio, tanpa file) ══════════════
     Setiap jenis = { id, label, wave: bentuk gelombang, seq: nada }.
     Nada: [mulai(detik), frekuensi-Hz, panjang(detik), volume-relatif,
            efek-opsional] — "glide" = frekuensi meluncur turun ke 55%
            di akhir nada (efek drop), "rise" = meluncur naik 2×. */
  var SOUNDS = [
    { id: "ding",    label: "Ding klasik",      wave: "sine",     seq: [[0, 880, .30, 1], [.09, 1318.5, .30, .8]] },
    { id: "bell",    label: "Bell lembut",      wave: "sine",     seq: [[0, 1046.5, .55, .9], [.02, 1568, .5, .4], [.02, 2093, .4, .25]] },
    { id: "chime",   label: "Chime cerah",      wave: "sine",     seq: [[0, 783.99, .22, .9], [.11, 1046.5, .22, .9], [.22, 1318.5, .34, .9]] },
    { id: "chip",    label: "Chip ceria",       wave: "square",   seq: [[0, 987.77, .09, .45], [.10, 1318.5, .16, .45]] },
    { id: "pulse",   label: "Pulse ganda",      wave: "triangle", seq: [[0, 587.33, .10, .9], [.13, 587.33, .10, .9]] },
    { id: "digital", label: "Digital LED",      wave: "square",   seq: [[0, 1174.66, .07, .4], [.09, 1174.66, .07, .4], [.18, 1567.98, .13, .4]] },
    { id: "swoosh",  label: "Swoosh naik",      wave: "sine",     seq: [[0, 392, .30, 1, "rise"], [.08, 587.33, .26, .7]] },
    { id: "radar",   label: "Radar ping",       wave: "sine",     seq: [[0, 1244.51, .42, .9]] },
    { id: "drop",    label: "Drop bas",         wave: "sine",     seq: [[0, 329.63, .38, 1, "glide"]] },
    { id: "coin",    label: "Koin (game)",      wave: "square",   seq: [[0, 987.77, .08, .5], [.09, 1318.5, .30, .5]] },
    { id: "harp",    label: "Harp arpeggio",    wave: "triangle", seq: [[0, 523.25, .2, .8], [.08, 659.25, .2, .8], [.16, 783.99, .3, .8], [.24, 1046.5, .36, .7]] },
    { id: "fanfare", label: "Fanfare naik",     wave: "triangle", seq: [[0, 523.25, .13, .9], [.14, 659.25, .13, .9], [.28, 783.99, .32, 1]] },
    { id: "alert",   label: "Alert tegas",      wave: "square",   seq: [[0, 880, .12, .5], [.16, 880, .12, .5], [.32, 880, .2, .5]] },
    { id: "buzz",    label: "Buzz pendek",      wave: "sawtooth", seq: [[0, 220, .20, .35]] },
    { id: "spark",   label: "Spark kilat",      wave: "sawtooth", seq: [[0, 1567.98, .06, .3], [.07, 2093, .14, .3]] },
    { id: "marimba", label: "Marimba hangat",   wave: "sine",     seq: [[0, 523.25, .16, 1], [.10, 783.99, .16, .9], [.20, 1046.5, .30, .9]] },
    { id: "crystal", label: "Crystal berkilau", wave: "sine",     seq: [[0, 1318.51, .3, .55], [.06, 1760, .3, .4], [.12, 2637, .44, .3]] },
    { id: "beacon",  label: "Beacon kapal",     wave: "triangle", seq: [[0, 622.25, .30, .9], [.34, 622.25, .30, .7]] },
    { id: "rocket",  label: "Rocket launch",    wave: "sawtooth", seq: [[0, 261.63, .45, .4, "rise"], [.10, 523.25, .4, .3]] },
    { id: "startup", label: "Startup terminal", wave: "triangle", seq: [[0, 392, .14, .8], [.15, 523.25, .14, .8], [.30, 659.25, .14, .8], [.45, 783.99, .42, .9]] },
    /* 15 Okt — 10 jenis baru (permintaan user): 20 → 30 pilihan */
    { id: "siren",   label: "Siren dua nada",   wave: "triangle", seq: [[0, 660, .14, .8], [.15, 880, .14, .8], [.30, 660, .14, .8], [.45, 880, .30, .8]] },
    { id: "horn",    label: "Klakson kapal",    wave: "sawtooth", seq: [[0, 440, .35, .55], [.02, 554.37, .35, .4], [.42, 440, .45, .5], [.44, 554.37, .45, .35]] },
    { id: "glass",   label: "Pecahan kaca",     wave: "sine",     seq: [[0, 1567.98, .12, .5], [.06, 2093, .12, .4], [.12, 2637.02, .16, .35], [.20, 3135.96, .30, .3]] },
    { id: "uke",     label: "Ukulele senang",   wave: "triangle", seq: [[0, 659.25, .10, .9], [.08, 880, .10, .9], [.16, 1318.51, .26, .8]] },
    { id: "phone",   label: "Telepon lama",     wave: "square",   seq: [[0, 1046.5, .06, .35], [.09, 1046.5, .06, .35], [.18, 1046.5, .06, .35], [.27, 1046.5, .06, .35]] },
    { id: "kasir",   label: "Kasir cha-ching", wave: "sine",     seq: [[0, 1318.51, .10, .9], [.10, 1760, .10, .9], [.20, 2637.02, .40, .8]] },
    { id: "genta",   label: "Genta kuil",      wave: "sine",     seq: [[0, 392, .60, .9], [.01, 587.33, .55, .45], [.02, 783.99, .50, .3]] },
    { id: "kick",    label: "Kick drum",       wave: "sine",     seq: [[0, 150, .16, 1, "glide"], [.10, 90, .18, .8, "glide"]] },
    { id: "morse",   label: "Kode morse",      wave: "square",   seq: [[0, 880, .07, .4], [.12, 880, .07, .4], [.24, 880, .22, .4]] },
    { id: "bintang", label: "Bintang jember",  wave: "sine",     seq: [[0, 523.25, .11, .9], [.12, 659.25, .11, .9], [.24, 783.99, .11, .9], [.36, 1046.5, .11, .9], [.48, 1318.51, .40, 1]] }
  ];
  var VOL = 0.8;                       // volume master 0–1
  try { var _v = parseFloat(localStorage.getItem("qkuk_vol")); if (!isNaN(_v) && _v >= 0 && _v <= 1) VOL = _v; } catch (e) {}
  var SIDX = 0;                        // indeks jenis suara terpilih
  try {
    var _s = localStorage.getItem("qkuk_sound"), _i = -1;
    for (var _k = 0; _k < SOUNDS.length; _k++) if (SOUNDS[_k].id === _s) { _i = _k; break; }
    if (_i >= 0) SIDX = _i;
  } catch (e) {}

  function unlockAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ding.ctx) ding.ctx = new AC();
      if (ding.ctx && ding.ctx.state === "suspended") ding.ctx.resume();
    } catch (e) {}
    document.removeEventListener("pointerdown", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
  }
  document.addEventListener("pointerdown", unlockAudio);
  document.addEventListener("keydown", unlockAudio);

  /* mesin sintesis: mainkan rangkaian nada `snd` pada konteks `ctx` */
  function playSeq(ctx, snd) {
    var t0 = ctx.currentTime, g = ctx.createGain();
    var last = snd.seq[snd.seq.length - 1];
    var tot = last[0] + last[2] + .25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(Math.max(.0002, .5 * VOL), t0 + .012);  // dulu puncak .09 — kini ±5× lebih keras
    g.gain.exponentialRampToValueAtTime(.0001, t0 + tot);
    g.connect(ctx.destination);
    snd.seq.forEach(function (nd) {
      var st = t0 + nd[0], f = nd[1], du = nd[2], rv = nd[3] || 1;
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = snd.wave;
      o.frequency.setValueAtTime(f, st);
      if (nd[4] === "glide") o.frequency.exponentialRampToValueAtTime(Math.max(30, f * .55), st + du);
      if (nd[4] === "rise")  o.frequency.exponentialRampToValueAtTime(f * 2, st + du);
      og.gain.setValueAtTime(rv, st);
      o.connect(og); og.connect(g);
      o.start(st); o.stop(st + du + .02);
    });
  }
  function ding() {
    if (MUTE) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ding.ctx) ding.ctx = new AC();
      if (ding.ctx.state === "suspended") { ding.ctx.resume(); return; }
      playSeq(ding.ctx, SOUNDS[SIDX]);
    } catch (e) {}
  }

  /* ══ PANEL PEMILIH SUARA (⚙ di header, samping 🔔) ══════════════════ */
  function sndIcon() {
    var m = $("#mute");
    if (!m) return;
    m.textContent = MUTE ? "🔇" : "🔊";   // 15 Okt: ikon suara ≠ 🔔 notifikasi (dulu kembar, samar)
    m.setAttribute("aria-pressed", MUTE ? "true" : "false");
    m.title = (MUTE ? "Suara notifikasi: MATI — klik untuk nyalakan"
      : "Suara notifikasi: NYALA — klik untuk mati")
      + " · jenis: " + SOUNDS[SIDX].label
      + (NOTE.n ? " · " + NOTE.n + " notifikasi sesi ini" : "");
  }
  function buildSoundPanel() {
    if (document.getElementById("snd-ov")) return;
    var ov = el("div", "snd-ov"); ov.id = "snd-ov";
    var bx = el("div", "snd-box");
    var hd = el("div", "snd-hd");
    hd.appendChild(el("b", "", "Suara notifikasi"));
    var xc = el("button", "snd-x"); xc.type = "button"; xc.textContent = "×";
    xc.setAttribute("aria-label", "Tutup pengaturan suara");
    hd.appendChild(xc);
    bx.appendChild(hd);
    bx.appendChild(el("p", "snd-sub", "30 jenis — contoh diputar saat dipilih."));
    var grid = el("div", "snd-grid");
    SOUNDS.forEach(function (s, i) {
      var b = el("button", "snd-opt" + (i === SIDX ? " on" : "")); b.type = "button";
      b.setAttribute("data-i", i);
      b.textContent = s.label;
      grid.appendChild(b);
    });
    bx.appendChild(grid);
    var vr = el("div", "snd-vrow");
    vr.appendChild(el("span", "snd-vlab", "Volume"));
    var sl = el("input", "snd-vol"); sl.type = "range"; sl.min = "0"; sl.max = "100";
    sl.id = "snd-vol"; sl.setAttribute("aria-label", "Volume notifikasi");
    sl.value = Math.round(VOL * 100);
    var vv = el("span", "snd-vval", sl.value + "%");
    vr.appendChild(sl); vr.appendChild(vv);
    bx.appendChild(vr);
    /* baris notifikasi desktop — izin Notification API diminta dari klik user */
    var dr = el("div", "snd-vrow");
    dr.appendChild(el("span", "snd-vlab", "Desktop"));
    var db = el("button", "snd-dbtn"); db.type = "button";
    function paintDesk() {
      if (!("Notification" in window)) {
        db.textContent = "Tidak didukung browser ini"; db.disabled = true;
        db.classList.remove("on"); return;
      }
      var p = Notification.permission;
      if (p === "denied") {
        db.textContent = "Diblokir — izinkan lewat ikon gembok di address bar";
        db.disabled = true; db.classList.remove("on"); return;
      }
      db.disabled = false;
      db.classList.toggle("on", DESK && p === "granted");
      db.textContent = p === "granted"
        ? (DESK ? "AKTIF — klik untuk mati" : "MATI — klik untuk nyalakan")
        : "Izinkan notifikasi desktop";
    }
    db.addEventListener("click", function () {
      if (!("Notification" in window) || Notification.permission === "denied") return;
      if (Notification.permission !== "granted") {
        var called = false;
        var done = function (np) {
          if (called) return; called = true;
          if (np === "granted") {
            DESK = true;
            try { localStorage.setItem("qkuk_desk", "1"); } catch (e) {}
            try {   // bukti izin langsung terlihat
              var t = new Notification("Qkuk Terminal",
                { body: "Notifikasi desktop aktif — akan muncul saat tab tidak aktif.", icon: QKUK_ICON });
              setTimeout(function () { try { t.close(); } catch (e) {} }, 4500);
            } catch (e) {}
          }
          paintDesk();
        };
        var rp = Notification.requestPermission(done);
        if (rp && rp.then) rp.then(done);
        return;
      }
      DESK = !DESK;
      try { localStorage.setItem("qkuk_desk", DESK ? "1" : "0"); } catch (e) {}
      paintDesk();
    });
    paintDesk();
    dr.appendChild(db);
    bx.appendChild(dr);
    /* 14 Okt (permintaan user) — TOGGLE NOTIFIKASI PER ENGINE: 4 kartu
       on/off utk BRICK/HARVEST/SWING/WHALE. Default semua ON. Preferensi
       tersimpan di localStorage "qkuk_nkanal" (JSON tf→0/1). */
    var nk = el("div", "nk-row");
    nk.appendChild(el("div", "nk-h", "Notifikasi per engine"));
    function paintNk() {
      nk.querySelectorAll(".nk-t").forEach(function (b) {
        b.classList.toggle("on", nn(b.dataset.tf));
      });
    }
    ["ob", "2h", "4h", "whale"].forEach(function (tf) {
      var b = el("button", "nk-t"); b.type = "button"; b.dataset.tf = tf;
      b.textContent = NN_ENG[tf] || tf;
      b.title = "Klik untuk hidup/matikan notifikasi engine ini";
      b.addEventListener("click", function () {
        NNOTE[tf] = nn(tf) ? 0 : 1;
        try { localStorage.setItem("qkuk_nkanal", JSON.stringify(NNOTE)); } catch (e) {}
        paintNk();
      });
      nk.appendChild(b);
    });
    paintNk();
    bx.appendChild(nk);
    /* 15 Okt (bug blank): kotak panel pernah HILANG baris `ov.appendChild(bx)`
       — overlay muncul sebagai layar gelap kosong. Kini kotak dipasang
       sebelum overlay di-append ke body. */
    ov.appendChild(bx);
    document.body.appendChild(ov);
    function close() {
      ov.classList.add("out");
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200);
    }
    xc.addEventListener("click", close);
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    document.addEventListener("keydown", function esch(ev) {
      if (ev.key === "Escape" && ov.parentNode) { close(); document.removeEventListener("keydown", esch); }
    });
    grid.addEventListener("click", function (ev) {
      var b = ev.target.closest(".snd-opt"); if (!b) return;
      SIDX = parseInt(b.getAttribute("data-i"), 10) || 0;
      try { localStorage.setItem("qkuk_sound", SOUNDS[SIDX].id); } catch (e) {}
      grid.querySelectorAll(".snd-opt").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      sndIcon();
      ding();                                  // dengarkan contohnya langsung
    });
    sl.addEventListener("input", function () {
      VOL = parseInt(sl.value, 10) / 100;
      vv.textContent = sl.value + "%";
      try { localStorage.setItem("qkuk_vol", String(sl.value)); } catch (e) {}
    });
    sl.addEventListener("change", function () { ding(); });   // contoh volume baru
  }
  var sbtn = $("#sndset");
  if (sbtn) sbtn.addEventListener("click", buildSoundPanel);

  /* ══ NOTIFIKASI DESKTOP (Notification API) — saat tab TIDAK aktif ════
     Toast cuma terlihat kalau tab terminal sedang dibuka; begitu user
     pindah tab, notifikasi native OS yang mengambil alih: klik = fokuskan
     terminal + buka chart TradingView koin itu. Izin diminta lewat panel
     ⚙ (harus dari klik user — kebijakan browser). Preferensi tersimpan
     di localStorage perangkat; tanpa izin, perilaku lama tetap jalan. */
  var QKUK_ICON = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="14" fill="#0D1411"/>' +
    '<text x="32" y="44" font-family="monospace" font-size="32" font-weight="bold" fill="#D8C89A" text-anchor="middle">Q</text></svg>');
  var DESK = false;
  try { DESK = localStorage.getItem("qkuk_desk") === "1"; } catch (e) {}
  function deskReady() {
    return ("Notification" in window) && Notification.permission === "granted" && DESK;
  }
  /* 14 Okt (permintaan user) — NOTIFIKASI PER ENGINE: 4 engine aktif
     (BRICK/HARVEST/SWING/WHALE) masing-masing punya toggle & emoji sendiri.
     Default SEMUA ON; preferensi di localStorage "qkuk_nkanal" (JSON tf→0/1).
     Judul notifikasi memakai emoji engine = beda visual di lock screen,
     dgn nama singkat agar muat di banner HP. */
  var NN_ENG = { "ob": "🧱 BRICK", "2h": "🩸 HARVEST", "4h": "🧵 SWING", "whale": "🐳 WHALE" };
  var NNOTE = {};
  try { NNOTE = JSON.parse(localStorage.getItem("qkuk_nkanal") || "{}") || {}; } catch (e) {}
  function nn(tf) { return NNOTE[tf] !== 0; }   // default ON dgn nn(tf)
  function deskNotify(kind, sym, tf, ts, dir) {
    if (!deskReady() || !document.hidden) return;   // tab aktif = toast cukup
    if (!nn(tf)) return;                            // 14 Okt: filter per engine
    notifKirim(kind, sym, tf, ts, dir);
  }
  /* 14 Okt — pengirim notifikasi dipisah dari deskNotify supaya tombol
     🧪 TEST bisa menembakkan notifikasi contoh kapan pun. */
  function notifKirim(kind, sym, tf, ts, dir) {
    var eng = NN_ENG[tf] || ("ENGINE " + (tf || "").toUpperCase());
    var judul = eng + " — SINYAL " + sym;
    var body = (dir === "long" || dir === "short" ? dir.toUpperCase() + " · " : "")
              + (tf || "").toUpperCase() + (ts ? " · " + ts : "")
              + " · klik untuk buka TradingView";
    notifikasiKirim(judul, { body: body, tag: "test-" + Date.now(), icon: QKUK_ICON,
                              badge: QKUK_ICON, renotify: true,
                              data: { url: tvUrl(sym, tf) } });
  }
  function notifikasiKirim(judul, opsi) {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.showNotification) reg.showNotification(judul, opsi);
          else baruNotif();
        }).catch(function () { baruNotif(); });
      } else baruNotif();
      function baruNotif() {
        var n = new Notification(judul, opsi);
        var u = opsi && opsi.data && opsi.data.url;
        n.onclick = function () {
          try { window.focus(); if (u) window.open(u, "_blank", "noopener"); } catch (e) {}
        };
        setTimeout(function () { try { n.close(); } catch (e) {} }, 9000);
      }
    } catch (e) {}
  }
  /* 14 Okt — tombol 🧪 TEST: menembakkan notifikasi contoh (HARVEST /
     BTCUSDT⚡TEST) SEKARANG juga, tanpa menunggu sinyal asli & tanpa
     syarat document.hidden — verifikasi langsung rantai PWA di
     perangkat (khusus iPhone: wajib via home screen, iOS 16.4+). */
  var TESTTF = "2h";
  function testNotify(tf) {
    if (!("Notification" in window)) { alert("Browser ini tidak punya Notification API."); return; }
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(function (s) {
        if (s === "granted") testNotify(tf);
        else alert("Izin notifikasi belum diberikan — ketuk 🔔 dulu.");
      });
      return;
    }
    TESTTF = tf || TESTTF;
    notifKirim("sinyal", "BTCUSDT\u26a1TEST", TESTTF, "sekarang", "long");
  }
  /* 13 Okt — PWA: daftarkan service worker + tombol langganan notifikasi watchlist.
     Beban zero-server: tanpa backend push, notifikasi dihosting dgn SW saat
     halaman (statusnya) terbuka di belakang.
    Admin dgn watchlist yang sering; user biasa aman (tidak apa intip). */
  function pwaInit(tbtnBar) {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      }
    } catch (e) {}
    /* 14 Okt (permintaan user — iPhone): NOTIFIKASI WEB-PUSH DI iOS hanya
       jalan di PWA yang sudah ditambahkan ke Home Screen (Safari 16.4+).
       Safari tab biasa = tidak ada notifikasi, itu batasan Apple. Deteksi:
       iPhone && bukan standalone → banner sekali sehari mengajak install. */
    try {
      var iOS    = /iphone|ipad|ipod/i.test(navigator.userAgent);
      var alone  = window.navigator.standalone === true
                || window.matchMedia("(display-mode: standalone)").matches;
      if (iOS && !alone && !("Notification" in window && Notification.permission === "denied")) {
        var KEY = "qkuk_ios_hint";
        var last = 0;
        try { last = +(localStorage.getItem(KEY) || 0); } catch (e) {}
        if (Date.now() - last > 86400000) {
          setTimeout(function () {
            try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
            toast("ios-hint", "iOS", "", "", "");
          }, 2500);
        }
      }
    } catch (e) {}
    try {
      var bar = document.querySelector(".bar-in");
      if (!bar || document.getElementById("qk-notif-btn")) return;
      var b = el("button", "adm-gear", "🔔"); b.id = "qk-notif-btn"; b.type = "button";
      b.title = "Aktifkan notifikasi watchlist/sinyal di latar (PWA)";
      function segar() {
        var st = Notification && Notification.permission;
        b.style.opacity = st === "granted" ? "1" : "0.55";
      }
      b.addEventListener("click", function () {
        if (!("Notification" in window)) { alert("Browser tidak mendukung Notification."); return; }
        if (Notification.permission === "denied") { b.title = "Notifikasi diblokir — buka izin situs di pengaturan browser"; return; }
        if (Notification.permission === "granted") {
          /* 15 Okt (keluhan user: bell terasa blank) — saat sudah granted,
             klik bell dulu secangkir bukti notifikasi, bukan jadi tidak beraksi. */
          notifikasiKirim("Qkuk Terminal",
            { body: "Izin notifikasi SUDAH aktif. Coba ikon 🧪 untuk tes ke lock screen.",
              icon: QKUK_ICON, badge: QKUK_ICON, tag: "bell-ok-" + Date.now() });
          return;
        }
        Notification.requestPermission().then(function (s) { segar(); });
      });
      bar.appendChild(b); segar();
      /* 14 Okt — tombol 🧪 TEST: menembakkan notifikasi contoh sekarang
         juga (HARVEST/BTCUSDT⚡TEST) — verifikasi langsung rantai PWA di
         perangkat tanpa menunggu sinyal asli. Di iOS wajib via home screen. */
      var tb = el("button", "adm-gear", "🧪"); tb.id = "qk-test-btn"; tb.type = "button";
      tb.title = "Tes notifikasi di perangkat ini (HARVEST/BTCUSDT contoh)";
      tb.addEventListener("click", function () { testNotify("2h"); });
      bar.appendChild(tb);
    } catch (e) {}
  }
  /* ═══════════════════════════════════════════════════════════════════
     20 Sep — LIVE PICKS ADMIN: ambil koin + koreksi + resolve manual
     ════════════════════════════════════════════════════════════════════
     Admin menandai koin yang benar-benar diambil di tabel Watchlist /
     Signals, mengoreksi arah (harusnya long/short), mengisi hasil naik/
     turun berapa %, dan menandai win/loss. Tersimpan ke picks.json di
     repo Pages lewat GitHub Contents API — token PAT disimpan LOKAL di
     browser admin (localStorage), tidak pernah dikirim ke mana pun
     selain api.github.com. Semua pengunjung mewarisi hasilnya, dan
     section "Picked by you" menampilkan WINRATE LIVE dari resolve ini
     — bukan backtest. */
  var TXTDB_ID = "qkuk-53bc732eb802f8c087142876"; // penyimpanan cloud live picks (textdb.dev)
  var PICKS = {};
  /* 11 Okt — DUA ADMIN (permintaan user): Qkuk + Admin2 (Gerry). Username
     disimpan DENGAN BESAR-KECIL persis apa adanya, tapi pencocokan login
     TIDAK PEDULI besar-kecil (jaga-jaga ketik "admin2"). Di kode hanya
     SHA-256 dari "username:password" — tidak ada kredensial mentah. Nama
     panggung ("Qkuk"/"Gerry") dipakai sbg penanda di pick, bubbles,
     live score & kotak analisis — KONSTAN, tidak boleh diganti. */
  var ADMINS = {
    "admin":  { who: "Qkuk",  hash: "d78f6114b477459dfaacf645a3d5453b33437cce560a016ffbc2051408d3caa0" },
    "Admin2": { who: "Gerry", hash: "b12039778e31e421be674d6b5f02b126b95f5fcd7fd506b142a56062bbf3e313" }
  };
  /* 26 Sep — CHECKLIST ALASAN AMBIL POSISI: setiap pick bisa dicatat alasannya
     (struktur/setup yang bikin admin ambil posisi) beserta TIMEFRAME masing2
     alasan. Label KONSTAN — jangan diubah, dipakai sbg kunci agregasi kotak
     analisis winrate & popup detail. Pick lama tanpa "alasan" tetap tampil
     normal (semua pembacaan undefined-safe). */
  /* limit upload gambar per pick (kvota user) — di-crop di sisi server cloud */
  var IMG_MAX = 4;
  var ALASAN = ["BOS", "EMA20-atas", "EMA20-bawah", "EMA200-atas", "EMA200-bawah",
                 "MSS", "FVG", "IFVG", "INDUCEMENT", "MACD", "OB", "Buyer", "Seller",
                 "SuperTrend-Buy", "SuperTrend-Sell"];
  var ALASAN_NAMA = { "EMA20-atas": "EMA20 di atas", "EMA20-bawah": "EMA20 di bawah",
                       "EMA200-atas": "EMA200 di atas", "EMA200-bawah": "EMA200 di bawah",
                       "INDUCEMENT": "Inducement", "MACD": "MACD", "OB": "OB (Order Block)", "BOS": "BOS",
                       "MSS": "MSS", "FVG": "FVG", "IFVG": "IFVG",
                       "Buyer": "List Buyer",
                       "Seller": "List Seller",
                       "SuperTrend-Buy": "SuperTrend Buy", "SuperTrend-Sell": "SuperTrend Sell" };
  /* 16 Okt (permintaan user): timeframe 2h masuk daftar lagi (kanal 2h hidup
     balik s/d klasemen fair-share) + alasan List Buyer/Seller baru. */
  var TF_OPTS = ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "1D"];  /* 2 Okt dulu 2h/4h dibgt; kini 2h kembali, 4h ikut utk alasan swing */
  function alasanNama(a) { return ALASAN_NAMA[a] || a; }
  /* 27 Sep — SATU alasan bisa dipilih di BANYAK timeframe (mis. MSS 1h + MSS 30m
     + MSS 5m dalam satu pick). Format baru: p.alasan = [{a:"MSS",tf:"1h"}, …].
     Format lama {label: tf} (26 Sep) tetap terbaca lewat alasanPairs. */
  function alasanPairs(p) {
    if (!p || !p.alasan) return [];
    var out = [], seen = {};
    if (Array.isArray(p.alasan)) {
      p.alasan.forEach(function (x) {
        if (x && x.a && x.tf && !seen[x.a + "|" + x.tf]) {
          seen[x.a + "|" + x.tf] = 1; out.push({ a: x.a, tf: x.tf });
        }
      });
    } else {
      Object.keys(p.alasan).forEach(function (a) {
        if (p.alasan[a] && !seen[a + "|" + p.alasan[a]]) {
          seen[a + "|" + p.alasan[a]] = 1; out.push({ a: a, tf: p.alasan[a] });
        }
      });
    }
    return out;
  }
  function alasanList(p) {   // daftar "ALASAN tf" — pemakai lama tetap jalan
    return alasanPairs(p).map(function (x) { return x.a + " " + x.tf; });
  }
  function alasanStr(p) { return alasanList(p).join(", "); }
  var AUTH = { user: "admin", hash: ADMINS["admin"].hash };
  function sha256hex(s) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
  }
  /* 21 Sep — penyimpanan sesi tahan-banting: kalau sessionStorage diblokir
     (WebView in-app, mode privat ketat, cookie pihak-ketiga off), login tetap
     TERSIMPAN di memori — menu edit admin tidak hilang lagi di device itu. */
  var SS = (function () {
    var mem = {};
    function ok() { try { var k = "__qk"; sessionStorage.setItem(k, "1"); sessionStorage.removeItem(k); return true; } catch (e) { return false; } }
    var good = ok();
    return {
      get: function (k) { if (good) { try { return sessionStorage.getItem(k); } catch (e) {} } return mem.hasOwnProperty(k) ? mem[k] : null; },
      set: function (k, v) { mem[k] = v; if (good) { try { sessionStorage.setItem(k, v); } catch (e) {} } },
      del: function (k) { delete mem[k]; if (good) { try { sessionStorage.removeItem(k); } catch (e) {} } }
    };
  })();
  function isLogged() { return SS.get("qkuk_admin_ok") === "1"; }
  function isAdmin() { return isLogged(); }
  /* 11 Okt — identitas admin aktif ("Qkuk" / "Gerry"). Disimpan di
     sessionStorage saat login; gagal ? fallback Qkuk (sesi lama sebelum
     fitur ini). Pick menyimpan nama ini sbg `by`, jadi live score,
     bubbles & riwayat tahu TANGAN SIAPA. */
  function meAdmin() {
    var a = SS.get("qkuk_admin_who");
    return a === "Qkuk" || a === "Gerry" ? a : "Qkuk";
  }
  function restoreWho() { if (!SS.get("qkuk_admin_who")) SS.set("qkuk_admin_who", "Qkuk"); }
  restoreWho();
  var PLOG = [];          // riwayat semua aksi admin (ambil/koreksi/hapus)
  /* 16 Okt — kunci pick punya DUA bentuk (bukti live score tak pernah
     menghitung pick Gerry: parser lama melirik [2] sbg ts, padahal di
     kunci 5-bagian [2] = jenis):
       4-bagian: '2h|sig|2026-10-09 13:00|OPGUSDT'        → [tf, jenis, ts, sym]
       5-bagian: 'Gerry|ob|sig|2026-10-08 15:04|JTOUSDT'  → [admin, tf, jenis, ts, sym]
     Satu pintu kpOf() dipakai SEMUA parser — admin lamanya tak lagi lenyap
     dr klasemen/riwayat/kurva. */
  function kpOf(k) {
    var kp = String(k || "").split("|");
    var five = kp.length >= 5;
    return { admin: five ? (kp[0] || null) : null,
             tf: five ? (kp[1] || "") : (kp[0] || ""),
             jenis: five ? (kp[2] || "") : (kp[1] || ""),
             ts: five ? (kp[3] || "") : (kp[2] || ""),
             sym: five ? (kp[4] || "") : (kp[3] || "") };
  }
  var AUTHCLOUD = null;   // hash password Qkuk hasil "ganti password" (dari cloud)
  var AUTH_HASHES = {};   // 11 Okt — hash per-akun dari cloud {"admin":…, "Admin2":…} (hasil ganti password)
  /* hash efektif akun k: hasil "ganti password" di cloud (jika ada),
     kalau tidak pakai bawaan di kode. */
  function $hashOke(k) { return AUTH_HASHES[k] || ADMINS[k].hash; }
  function curHash() { return AUTHCLOUD || AUTH.hash; }
  function wibStr(iso) {
    if (!iso) return "—";
    var d = new Date(new Date(iso).getTime() + 7 * 3600e3);
    var B = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    return ("0" + d.getUTCDate()).slice(-2) + " " + B[d.getUTCMonth()] + " "
      + ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2) + " WIB";
  }
  function wibDate(iso) {
    var d = new Date(new Date(iso).getTime() + 7 * 3600e3);
    return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
  }
  function plogAdd(act, key, p, r) {
    var kp = kpOf(key);                        // 16 Okt: kunci 5-bagian ikut benar
    PLOG.unshift({ t: new Date().toISOString(), act: act,
      sym: (r && r.sym) || kp.sym || "", tf: kp.tf || "", jenis: kp.jenis || "",
      dir0: (r && r.dir) || null, side: p ? (p.side || null) : null,
      pct: hasPct(p && p.pct) ? p.pct : null, win: p ? p.win : null,
      who: act && p && p.by ? p.by : meAdmin(),
      pickKey: key || null,
      imgN: p && Array.isArray(p.imgs) ? p.imgs.length : 0,
      note: p && p.note ? p.note : null });
    if (PLOG.length > 2000) PLOG.length = 2000;   // dulu 200 — riwayat harian cepat terpotong
  }
  /* 13 Okt — LIGHTBOX GAMBAR: klik gambar di popup detail / live pick
     = tampil SUPER JELAS menutupi layar (resolusi penuh, format apa pun
     data-URL/browser bisa baca). Dulu window.open(dataURL) diblokir
     Chrome → tab blank; kini modal di halaman yang sama. Tombol "buka
     tab" memakai blob URL yang diizinkan browser. */
  function lightboxImg(src) {
    var lb = el("div", "lbx");
    var bar = el("div", "lbx-bar");
    var bOpen = el("button", "hh-fchip lbx-open", "⤢ buka tab baru (ukuran penuh)"); bOpen.type = "button";
    var bX = el("button", "lbx-x", "×"); bX.type = "button";
    bar.appendChild(bOpen); bar.appendChild(bX);
    var im = document.createElement("img"); im.src = src; im.alt = "gambar chart";
    lb.appendChild(bar); lb.appendChild(im);
    lb.appendChild(el("div", "lbx-cap", "klik area gelap untuk menutup · scroll/geser untuk melihat detail"));
    function tutup() { if (lb.parentNode) lb.parentNode.removeChild(lb); }
    function bukaTab() {
      try {
        var pcs = String(src).split(","), mime = (/:(.*?);/.exec(pcs[0]) || [, "image/png"])[1];
        var bin = atob(pcs[1] || ""), n = bin.length, arr = new Uint8Array(n);
        while (n--) arr[n] = bin.charCodeAt(n);
        window.open(URL.createObjectURL(new Blob([arr], { type: mime || "image/png" })), "_blank");
      } catch (e2) { try { window.open(src, "_blank"); } catch (e3) {} }
    }
    bOpen.addEventListener("click", bukaTab);
    bX.addEventListener("click", tutup);
    lb.addEventListener("click", function (ev) {
      if (ev.target === lb || ev.target === im) tutup();
    });
    document.body.appendChild(lb);
    return lb;
  }
  /* popup DETAIL ALASAN — baca-saja, terlihat admin & pengunjung.
     27 Sep desain baru: pill arah/hasil + chip alasan×TF (satu alasan bisa
     punya beberapa chip TF). */
  function openAlasan(tf, jenis, r, p) {
    try {
    var box = el("div", "alview2");
    box.appendChild(admHead("Detail ambil posisi", (r.sym || "").replace(/USDT$/, "") + " · "
      + tf.toUpperCase() + " · " + (jenis === "sig" ? "sinyal" : jenis === "watch" ? "watchlist" : jenis)));
    var side = p.side || p.dir0 || r.dir || "—";
    var meta = el("div", "almeta2");
    meta.appendChild(el("span", "alpill " + (side === "long" ? "up" : "dn"),
      (side === "long" ? "▲ " : "▼ ") + side.toUpperCase()));
    meta.appendChild(el("span", "alpill " + (p.win === 1 ? "win" : p.win === 0 ? "loss" : "open"),
      p.win === 1 ? "WIN" : p.win === 0 ? "LOSS" : "OPEN"));
    /* 11 Okt — status pick dgn nama admin di popup dua-duanya */
    var STT = { menunggu: "MENUNGGU", entry: "AMBIL POSISI", tp: "TAKE PROFIT" };
    meta.appendChild(el("span", "alpill stat",
      (STT[p.status] || "MENUNGGU") + " · oleh " + (p.by || "admin")));
    /* fix 27 Sep: pct pick open = null → sebelumnya crash toFixed di sini */
    if (hasPct(p.pct))
      meta.appendChild(el("span", "alpct2 " + (p.pct > 0 ? "pos" : p.pct < 0 ? "neg" : "mut"),
        sgn(p.pct, 1) + "%"));
    meta.appendChild(el("span", "alwhen", wibStr(p.ts)));
    box.appendChild(meta);
    var pairs = alasanPairs(p);
    box.appendChild(el("div", "al-sect", "alasan mengambil posisi"));
    if (!pairs.length) {
      box.appendChild(el("div", "al-none", "belum ada alasan tercatat — pick lama sebelum fitur checklist"));
    } else {
      var chips = el("div", "al-chips");
      pairs.forEach(function (x) {
        var c = el("span", "al-chip");
        c.appendChild(el("b", null, alasanNama(x.a)));
        c.appendChild(el("i", "al-chip-tf", x.tf));
        chips.appendChild(c);
      });
      box.appendChild(chips);
    }
    if (p.note) box.appendChild(el("div", "alnote", p.note));
    /* 11 Okt — inducement + gambar: alasan lengkap kenapa posisi diambil */
    if (p.inducement) {
      box.appendChild(el("div", "al-sect", "inducement"));
      box.appendChild(el("div", "alnote", p.inducement));
    }
    var IMGList = (p.imgs || []).filter(function (d) { return typeof d === "string" && d.indexOf("data:image") === 0; });
    if (IMGList.length) {
      box.appendChild(el("div", "al-sect", "gambar chart saat ambil posisi"));
      var g = el("div", "pimg-grid view");
      IMGList.forEach(function (d) {
        var it = el("div", "pimg-it");
        var im = document.createElement("img"); im.src = d; im.alt = "gambar chart";
        im.addEventListener("click", function () { lightboxImg(d); });
        im.title = "klik untuk perbesar (tampil full layar)";
        it.appendChild(im); g.appendChild(it);
      });
      box.appendChild(g);
    }
    box.appendChild(el("div", "alfoot", "dicatat " + (p.by || "admin") + " · " + wibDate(p.ts)));
    admShow(box);
    } catch (err) { admFallback(err); }
  }
  /* 26 Sep — KOTAK ANALISIS: kombinasi alasan+TF dgn winrate live TERBAIK.
     Hitung dari picks resolved (win 1/0) via liveRows, per-alasan & per-pasangan
     (dua alasan pada pick yg sama). n minimal (MIN_AL_N) utk hindari derau;
     kalau belum ada yg lolos ambang, tampilkan "menunggu data" + tips.
     Dipanggil dari applyPicks → ikut segar tiap picks cloud berubah. */
  var MIN_AL_N = 3;
  /* ring glow singkat saat komposisi #1 BERUBAH (nama/winrate/jumlah pick):
     kotak analisis menyala mint 3.2 dtk supaya admin langsung sadar komposisi
     terbaik sudah lain sebelum ambil posisi. Render pertama & render ulang
     biasa (data sama) TIDAK menyala. */
  var AN_LAST_TOP = "";
  function anGlow(host) {
    host.classList.remove("an-glow");
    void host.offsetWidth;   // paksa reflow — animasi bisa diputar ulang
    host.classList.add("an-glow");
    clearTimeout(anGlow._t);
    anGlow._t = setTimeout(function () { host.classList.remove("an-glow"); }, 3200);
  }
  var AN_LAST_POS = {};
  function comboStats() {
    var c = {};
    function add(nama, win) {
      var e = c[nama];
      if (!e) { e = c[nama] = { n: 0, w: 0 }; }
      e.n++; if (win === 1) e.w++;
    }
    ord().forEach(function (tf) {
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p || (p.win !== 1 && p.win !== 0)) return;
          var L = alasanList(p);   // ["MSS 1h", "MSS 30m", …] — dari alasanPairs
          if (!L.length) return;
          L.forEach(function (x) { add(x, p.win); });
          for (var i = 0; i < L.length; i++)
            for (var j = i + 1; j < L.length; j++) add(L[i] + " + " + L[j], p.win);
        });
      });
    });
    return Object.keys(c).map(function (k) {
      var e = c[k]; return { nama: k, n: e.n, wr: e.w / e.n * 100 };
    });
  }
  function kotakAnalisis() {
    var host = document.getElementById("analisa-box");
    if (!host) return;
    host.innerHTML = "";
    var stats = comboStats().filter(function (s) { return s.n >= MIN_AL_N; });
    var chips = el("div", "an-chips");
    if (!stats.length) {
      chips.appendChild(el("span", "an-empty",
        "belum ada kombinasi alasan dgn cukup data (min " + MIN_AL_N
        + " pick resolved per kombinasi) — centang alasan & TF saat menekan \"ambil\", lalu resolve win/loss-nya"));
      host.appendChild(chips);
      if (AN_LAST_TOP) anGlow(host);   // #1 hilang semua — tetap layak disorot
      AN_LAST_TOP = ""; AN_LAST_POS = {};
      return;
    }
    stats.sort(function (a, b) { return (b.wr - a.wr) || (b.n - a.n); });
    var top = stats.slice(0, 3);
    var kTop = top[0].nama + "|" + top[0].wr.toFixed(0) + "|" + top[0].n;
    if (AN_LAST_TOP && AN_LAST_TOP !== kTop) anGlow(host);   // komposisi #1 berubah
    AN_LAST_TOP = kTop;
    top.forEach(function (s, i) {
      var chip = el("div", "an-chip" + (i === 0 ? " best" : ""));
      /* 15 Okt — chip #2/#3 dgn ring redup saat posisinya berubah antar render
         (nama yang tadinya #2 naik ke #1 dsb). Pembanding: posisi nama di top
         sebelumnya; pemain baru di #2/#3 juga berkedip redup karena merebut
         kursi pemain lama. Data render ulang tanpa perubahan = tidak menyala. */
      if (i > 0) {
        var posLama = AN_LAST_POS[s.nama];
        var pindah = posLama !== undefined && posLama !== i;
        /* pemain baru di #2/#3: berkedip redup bila slot itu sebelumnya diisi
           nama lain (merebut kursi pemain lama). Render pertama = tenang. */
        if (posLama === undefined) {
          var lama = null;
          for (var k3 in AN_LAST_POS) {
            if (AN_LAST_POS[k3] !== i) continue;
            lama = k3; break;
          }
          if (lama !== null) pindah = true;
        }
        if (pindah) {
          chip.classList.add("an-swap");
          setTimeout(function (c) {
            return function () { c.classList.remove("an-swap"); };
          }(chip), 2600);
        }
      }
      chip.title = "Klik untuk lihat " + s.n + " pick yang membentuk winrate " + s.nama;
      chip.addEventListener("click", function () { openKombo(s.nama); });   // drill-down pembentuk winrate
      chip.appendChild(el("span", "an-rank", i === 0 ? "#1" : "#" + (i + 1)));
      chip.appendChild(el("b", "an-nama", s.nama));
      chip.appendChild(el("span", "an-wr " + (s.wr >= 50 ? "pos" : "neg"), s.wr.toFixed(0) + "%"));
      chip.appendChild(el("span", "an-n", s.n + " pick"));
      chips.appendChild(chip);
    });
    AN_LAST_POS = {};   // rekam posisi top render ini — pembanding render berikutnya
    top.forEach(function (s, i) { AN_LAST_POS[s.nama] = i; });
    host.appendChild(chips);
    /* 11 Okt — TEKNIK-vs-TEKNIK Qkuk vs Gerry (permintaan user): winrate
       per alasan/teknik DIPECAH per admin; teknik dgn sampel cukup kedua
       sisi dinyatakan TEGAS siapa yang lebih akurat. Menang siapa-siapa
       yang pick sesuai teknik itu — kotak akurasi kolektif tidak berubah. */
    var teknik = {}, order = [];
    ord().forEach(function (tf) {
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p || (p.win !== 1 && p.win !== 0)) return;
          alasanList(p).forEach(function (x) {
            var e = teknik[x] || (teknik[x] = { Qkuk: [0, 0], Gerry: [0, 0] });
            var who = p.by === "Gerry" ? "Gerry" : "Qkuk";   // pick lama tanpa "by" = Qkuk
            e[who][0]++; if (p.win === 1) e[who][1]++;
            if (order.indexOf(x) < 0) order.push(x);
          });
        });
      });
    });
    var duo = order.filter(function (t) { return teknik[t].Qkuk[0] >= 2 && teknik[t].Gerry[0] >= 2; });
    if (duo.length) {
      var w2 = el("div", "an-duel");
      w2.appendChild(el("div", "an-duel-h", "teknik-vs-teknik \u2014 Qkuk vs Gerry (live resolve, min 2 pick per sisi)"));
      var tb = el("table", "an-t");
      var th = el("tr");
      ["teknik", "Qkuk wr", "Gerry wr", "lebih akurat"].forEach(function (x) { th.appendChild(el("th", null, x)); });
      var thead = el("thead"); thead.appendChild(th); tb.appendChild(thead);
      var tby = el("tbody");
      duo.sort(function (a, b) {
        var qa = teknik[a].Qkuk[1] / teknik[a].Qkuk[0], ga = teknik[a].Gerry[1] / teknik[a].Gerry[0];
        var qb = teknik[b].Qkuk[1] / teknik[b].Qkuk[0], gb = teknik[b].Gerry[1] / teknik[b].Gerry[0];
        return (qb - gb) - (qa - ga);
      }).forEach(function (t) {
        var e = teknik[t], tr = el("tr");
        tr.appendChild(el("td", null, alasanNama(t)));
        [[e.Qkuk, "qkuk"], [e.Gerry, "gerry"]].forEach(function (c) {
          var wr = c[0][1] / c[0][0] * 100;
          var tdW = el("td", "an-c " + (wr >= 50 ? "pos" : "neg"),
            wr.toFixed(0) + "% (" + c[0][1] + "W/" + (c[0][0] - c[0][1]) + "L)");
          tr.appendChild(tdW);
        });
        var qwr = e.Qkuk[1] / e.Qkuk[0] * 100, gwr = e.Gerry[1] / e.Gerry[0] * 100;
        var verdict = qwr === gwr ? "IMBANG"
          : qwr > gwr ? "QKUK ✓" : "GERRY ✓";
        tr.appendChild(el("td", "an-v " + (qwr === gwr ? "mut" : qwr > gwr ? "qq" : "gg"), verdict));
        tby.appendChild(tr);
      });
      tb.appendChild(tby); w2.appendChild(tb);
      w2.appendChild(el("div", "an-tip",
        "angka = winrate live masing-masing admin pada pick yang memakai teknik itu. "
        + "Kolom kanan menyatakan tegas siapa yang lebih akurat saat ini — berubah otomatis tiap resolve baru."));
      host.appendChild(w2);
    }
    var tip = el("div", "an-tip");
    tip.appendChild(el("b", null, "sebelum ambil posisi, ceklis: "));
    tip.appendChild(el("span", null,
      top[0].nama + " — komposisi dgn winrate live tertinggi saat ini ("
      + top[0].wr.toFixed(0) + "% dari " + top[0].n + " pick resolved). "
      + "Pastikan alasan & timeframe-nya tercentang di popup ambil; winrate ini berubah otomatis saat resolve admin diperbarui. "
      + "Klik chip kombinasi untuk melihat daftar pick pembentuknya."));
    host.appendChild(tip);
  }
  /* 16 Okt — DRILL-DOWN KOMBINASI: klik chip di kotak analisis membuka popup
     daftar pick yang membentuk winrate kombinasi itu. Sumber = PICKS (sama
     dgn sumber comboStats: hanya pick resolved win 1/0), dipasangkan lewat
     alasanList penuh — kombinasi "MSS 1h + FVG 15m" hanya menghitung pick
     yang memakai SEMUA pasangan itu. Klik baris → popup detail ambil posisi
     yang sudah ada (openAlasan), konsisten dgn alur di watchlist. */
  function openKombo(nama) {
    try {
      /* nama = pasangan-pasangan "ALASAN tf" dijool " + " — diurai balik dgn
         pemisahan di spasi TERAKHIR (nama alasan tak punya spasi: BOS, MSS,
         EMA20-atas, SuperTrend-Buy, …). */
      var pairs = nama.split(" + ").map(function (x) {
        var i = x.lastIndexOf(" ");
        return { a: x.slice(0, i), tf: x.slice(i + 1) };
      });
      /* sumber = liveRows per engine — SAMA dgn comboStats, supaya isi popup
         kongruen dgn angka pada chip. Jangan iterasi mentah PICKS: baris dgn
         kunci non-standar bisa masuk dan membuat jumlahnya beda. */
      var rows = [];
      ord().forEach(function (tf) {
        ["pantau", "sinyal"].forEach(function (jenis) {
          var rseg = jenis === "pantau" ? "watch" : "sig";   // utk label popup (watchlist/sinyal)
          liveRows(tf, jenis).forEach(function (r) {
            var p = r.apick; if (!p || (p.win !== 1 && p.win !== 0)) return;
            var have = {};
            alasanList(p).forEach(function (a) { have[a] = 1; });
            for (var i = 0; i < pairs.length; i++) if (!have[pairs[i].a + " " + pairs[i].tf]) return;
            rows.push({ tf: tf, rseg: rseg, sym: r.sym || "", p: p });
          });
        });
      });
      var W = rows.filter(function (r) { return r.p.win === 1; }).length;
      var box = el("div", "alview2");
      box.appendChild(admHead("Pick pembentuk kombinasi", nama));
      if (!rows.length) {
        box.appendChild(el("div", "alnote", "belum ada pick resolved yang memakai kombinasi ini."));
      } else {
        var wr = W / rows.length * 100;   // pasti kongruen dgn chip — sumber sama
        var meta = el("div", "almeta2");
        meta.appendChild(el("span", "alpill " + (wr >= 50 ? "up" : "dn"),
          wr.toFixed(0) + "% winrate · " + W + "W/" + (rows.length - W) + "L"));
        meta.appendChild(el("span", "alwhen", rows.length + " pick"));
        box.appendChild(meta);
        box.appendChild(el("div", "al-sect", "klik baris untuk detail ambil posisi"));
        var list = el("div", "ko-rows");
        rows.sort(function (a, b) { return ((b.p.ts || "").localeCompare(a.p.ts || "")); });
        rows.forEach(function (r) {
          var side = (r.p.side || r.p.dir0 || "").toLowerCase();
          var row = el("div", "ko-row");
          row.title = "detail ambil posisi " + (r.sym || "").replace(/USDT$/, "");
          row.appendChild(el("span", "ko-time", wibStr(r.p.ts)));
          row.appendChild(el("b", "ko-sym", (r.sym || "\u2014").replace(/USDT$/, "")));
          if (side)
            row.appendChild(el("span", "alpill " + (side === "long" ? "up" : "dn"), (side === "long" ? "\u25b2 " : "\u25bc ") + side.toUpperCase()));
          row.appendChild(el("span", "alpill " + (r.p.win === 1 ? "win" : "loss"), r.p.win === 1 ? "WIN" : "LOSS"));
          if (hasPct(r.p.pct))
            row.appendChild(el("b", "ko-pct " + (r.p.pct > 0 ? "pos" : r.p.pct < 0 ? "neg" : "mut"), sgn(r.p.pct, 1) + "%"));
          row.appendChild(el("span", "ko-by", "oleh " + (r.p.by || "admin") + " \u00b7 " + r.tf.toUpperCase()));
          row.addEventListener("click", function () {
            openAlasan(r.tf, r.rseg, { sym: r.sym, dir: side || null, ts: r.p.ts }, r.p);
          });
          list.appendChild(row);
        });
        box.appendChild(list);
      }
      admShow(box);
    } catch (err) { admFallback(err); }
  }
  function pickKey(tf, jenis, r) { return tf + "|" + jenis + "|" + (r.ts || "") + "|" + (r.sym || ""); }
  /* ── 11 Okt — LIVE SCORE / KLASMEN ADMIN (permintaan user, paling atas) ──
     Winrate per admin (Qkuk vs Gerry) dari resolve live, PERIODE BULAN
     BERJALAN — otomatis reset tiap akhir bulan karena agregasi difilter
     ke bulan ini, bukan dihapus dari sumber. Kolom: jumlah trade (tertutup),
     win, lose, winrate, net R (hasil % + fallback ±1R saat pct kosong).
     Barisan atas = total dua admin. */
  /* 16 Okt (permintaan user: "kemarin Gerry sudah isi namun tidak masuk
     live score") — klasemen kini MENGHITUNG pick yang admin ambil walau
     belum resolve: tampil sbg "terbuka". WR & net R TETAP hanya dari
     pick resolve (win 0/1) — sama dgn blok digest live_stats.py. */
  function bulanScoreRows(bln) {
    var out = { Qkuk: { ambil: 0, buka: 0, selesai: 0, win: 0, R: 0 },
                Gerry: { ambil: 0, buka: 0, selesai: 0, win: 0, R: 0 } };
    Object.keys(PICKS).forEach(function (k) {
      var p = PICKS[k];
      if (!p) return;
      if (kpOf(k).ts.slice(0, 7) !== bln) return;
      var who = (p.by || kpOf(k).admin) === "Gerry" ? "Gerry" : "Qkuk";
      var e = out[who]; e.ambil++;
      if (p.win !== 1 && p.win !== 0) { e.buka++; return; }   // terbuka: dihitung, belum dinilai
      e.selesai++; if (p.win === 1) e.win++;
      var pct = hasPct(p.pct) ? p.pct             /* 13 Okt: untung/rugi nett, tanpa flip short */
                : (p.win === 1 ? 1 : -1);                        // fallback ±1R
      e.R += pct;
    });
    return out;
  }
  var LSV_BULAN = null;   // null = bulan berjalan
  function lamaScoreRows() {
    var d = new Date(); d.setMonth(d.getMonth() - 1);
    return bulanScoreRows(d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2));
  }
  function tblLine(w, e) {
    return "<b>" + w + "</b> " + e.ambil + " trade" + (e.buka ? " (terbuka " + e.buka + ")" : "") + " · "
         + e.win + "W/" + (e.selesai - e.win) + "L · WR "
         + (e.selesai ? (e.win / e.selesai * 100).toFixed(0) + "%" : "—")
         + " · " + sgn(e.R, 2) + "R";
  }
  function liveScore(bln) {
    var host = document.getElementById("livescore");
    if (!host) {
      host = el("div", "card ls-card"); host.id = "livescore";
    }
    host.innerHTML = "";
    if (bln === undefined) bln = LSV_BULAN;
    var bulanSekarang = wibDate(new Date().toISOString()).slice(0, 7);
    if (!bln) bln = bulanSekarang;
    var h = el("div", "card-h");
    h.appendChild(el("h3", null, "Live score admin \u2014 klasemen bulan (reset otomatis tiap akhir bulan)"));
    /* 13 Okt — dropdown bulan (permintaan user): performa per bulan bisa
       ditinjau kapan pun — total trade/WR/net R dihitung ulang untuk bulan
       yang dipilih, DATA TIDAK PERNAH DIHAPUS. Amunisi = union bulan yang
       punya pick resolved. */
    var bulans = {};
    Object.keys(PICKS).forEach(function (k) {
      var p = PICKS[k];
      if (!p || (p.win !== 1 && p.win !== 0)) return;
      var b = kpOf(k).ts.slice(0, 7);             // 16 Okt: kunci 5-bagian ikut
      if (/^\d{4}-\d{2}$/.test(b)) bulans[b] = 1;
    });
    var ops = Object.keys(bulans).sort().reverse();
    if (ops.indexOf(bulanSekarang) < 0) ops.unshift(bulanSekarang);
    var sel = el("select", "lg lg-sel"); sel.title = "pilih bulan klasemen";
    ops.forEach(function (b) {
      var op = el("option"); op.value = b; op.textContent = b; sel.appendChild(op);
    });
    sel.value = bln; if (sel.value !== bln) sel.value = bulanSekarang;
    sel.addEventListener("change", function () { LSV_BULAN = sel.value; liveScoreMount(); });
    h.appendChild(sel);
    host.appendChild(h);
    var d = bulanScoreRows(bln);
    var tot = { ambil: 0, buka: 0, selesai: 0, win: 0, R: 0 };
    ["Qkuk", "Gerry"].forEach(function (w) {
      ["ambil", "buka", "selesai", "win", "R"].forEach(function (f) { tot[f] += d[w][f]; });
    });
    var rows = el("div", "rows");
    function baris(l, v, cls, sub) {
      var x = el("div", "row");
      x.appendChild(el("span", "l", l)); x.appendChild(el("span", "d"));
      var vs = el("span", "v " + (cls || ""), v);
      if (sub) vs.title = sub;
      x.appendChild(vs); rows.appendChild(x);
    }
    if (!tot.ambil) {
      baris("total", "belum ada trade bulan ini", "mut");
      baris("Qkuk · Gerry", "0 · 0", "mut");
    } else {
      if (tot.buka) {
        baris("total trade", tot.ambil + " (terbuka " + tot.buka + ") · win " + tot.win
              + " · lose " + (tot.selesai - tot.win), "");
      } else {
        baris("total trade", tot.ambil + " · win " + tot.win + " · lose " + (tot.selesai - tot.win), "");
      }
      if (tot.selesai) {
        var wr = tot.win / tot.selesai * 100;
        baris("total winrate", wr.toFixed(1) + "%", wr >= 50 ? "pos" : "neg");
      } else { baris("total winrate", "—", "mut"); }
      baris("total net R", sgn(tot.R, 2) + "R", tot.R > 0 ? "pos" : tot.R < 0 ? "neg" : "mut");
    }
    host.appendChild(rows);
    var grid = el("div", "ls-grid");
    ["Qkuk", "Gerry"].forEach(function (w) {
      var e = d[w], c = el("div", "ch ls-kartu " + (w === "Gerry" ? "gerry" : "qkuk"));
      var hh = el("div", "ch-h");
      hh.appendChild(el("span", "ch-n", w));
      hh.appendChild(el("span", "ch-tf", w === "Gerry" ? "Admin2" : "Admin"));
      c.appendChild(hh);
      var rw = el("div", "rows");
      function rr(a, b, cls) { var x2 = el("div", "row"); x2.appendChild(el("span", "l", a));
        x2.appendChild(el("span", "d")); x2.appendChild(el("span", "v " + (cls || ""), b)); rw.appendChild(x2); }
      if (!e.ambil) {
        rr("trade bulan ini", "belum ada", "mut");
      } else {
        /* 16 Okt — pick yang baru diambil & belum resolve TETAP tampil
           (dulu lenyap → user tahu "sudah isi" tapi live score kosong). */
        rr("jumlah trade", e.ambil + (e.buka ? " (terbuka " + e.buka + ")" : ""));
        rr("win · lose", e.win + " · " + (e.selesai - e.win), "mut");
        if (e.selesai) {
          var wrw = e.win / e.selesai * 100;
          rr("winrate", wrw.toFixed(1) + "%", wrw >= 50 ? "pos" : "neg");
        }
        rr("net R", sgn(e.R, 2) + "R", e.R > 0 ? "pos" : e.R < 0 ? "neg" : "mut");
      }
      c.appendChild(rw); grid.appendChild(c);
    });
    host.appendChild(grid);
    /* 12 Okt — prioritas-4: baris arsip bulan lalu (per admin + total) */
    var lam = (bln !== bulanSekarang)
      ? { Qkuk: { ambil:0, buka:0, selesai:0, win:0, R:0 }, Gerry: { ambil:0, buka:0, selesai:0, win:0, R:0 } }
      : lamaScoreRows();
    if (lam.Qkuk.ambil || lam.Gerry.ambil) {
      var barL = el("div", "ls-lama");
      function selL(w, e) { return tblLine(w, e); }
      barL.appendChild(el("span", "ls-lama-judul", "bulan lalu:"));
      barL.appendChild(el("span", null, tblLine("total", {
        ambil: lam.Qkuk.ambil + lam.Gerry.ambil, buka: lam.Qkuk.buka + lam.Gerry.buka,
        selesai: lam.Qkuk.selesai + lam.Gerry.selesai,
        win: lam.Qkuk.win + lam.Gerry.win, R: lam.Qkuk.R + lam.Gerry.R })));
      barL.appendChild(el("span", null, tblLine("Qkuk", lam.Qkuk)));
      barL.appendChild(el("span", null, tblLine("Gerry", lam.Gerry)));
      host.appendChild(barL);
    }
    host.appendChild(el("div", "cap",
      "WR & net R dari resolve admin (open dihitung terbuka, belum dinilai)."));
    return host;
  }
  function liveScoreMount() {
    var card = liveScore();
    var wrap = document.querySelector(".wrap");
    if (!wrap) return;
    if (card.parentNode !== wrap) wrap.insertBefore(card, wrap.firstChild);   // PALING ATAS
  }
  /* 23 Sep — SUMBER BARIS LIVE: jendela DATA.live + pick tersimpan.
     Baris engine tua tergeser rotasi CSV sehingga tak lagi muncul di
     data.json — dulu agregat winrate hanya menghitung baris jendela,
     jadi resolve berhari-hari lalu "hilang". Kini setiap pick yang
     tersimpan di cloud tetap dihitung walau barisnya sudah keluar
     jendela (metadata minimal direkonstruksi dari kunci pick). */
  function liveRows(tf, jenis) {
    var out = ((DATA.live[tf] || {})[jenis] || []).slice();   // salinan — JANGAN ubah DATA
    /* segmen kunci pick: "pantau"→"watch", "sinyal"→"sig" (pickKey lama) */
    var seg = jenis === "pantau" ? "watch" : jenis === "sinyal" ? "sig" : jenis;
    Object.keys(PICKS).forEach(function (k) {
      var kp = k.split("|");
      var kp = kpOf(k);
      if (kp.tf !== tf || kp.jenis !== seg) return;
      var p = PICKS[k]; if (!p) return;
      for (var i = 0; i < out.length; i++) {
        if (out[i].ts === kp.ts && out[i].sym === kp.sym) return;   // sudah ada di jendela
      }
      out.push({ ts: kp.ts || "", sym: kp.sym || "", dir: p.side || p.dir0 || null, apick: p });
    });
    return out;
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function loadPicks() {
    /* dua sumber digabung: picks.json di repo + cloud (mode login). Cloud menang. */
    var got = 0, done = false, repo = {}, repoLog = [], cloud = {}, cloudLog = [];
    function tick() {
      if (done) return;
      if (++got < 2) return;
      done = true;
      PICKS = Object.assign({}, repo, cloud);
      /* 2 Okt — RESET ANALISA (permintaan user): hanya pick bertanggal >=
         2 Okt 2026 WIB yang dipakai. Pick lama tidak dihapus dari sumber —
         cuma dibuang di sini, jadi SEMUA statistik (kanal, heatmap jam,
         equity, riwayat) otomatis mulai dari nol tanpa sentuhan lain. */
      (function () {
        var RST = "2026-10-02";
        function _wibd(t) {
          var d = new Date(t);
          if (isNaN(d)) return "";
          return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
        }
        Object.keys(PICKS).forEach(function (k) {
          var p = PICKS[k];
          if (!p || _wibd(p.ts) < RST) delete PICKS[k];
        });
      })();
      PLOG = cloudLog.length ? cloudLog : repoLog;
      /* 12 Okt — prioritas-3: SNAPSHOT LOKAL PICKS. Cloud textdb.dev satu
         payload; kalau salah hapus/timpa, tidak ada undo. Setiap muatan
         cloud yang berbeda dri sebelumnya disimpan ke localStorage (versi
         terakhir + versi harian) — recovery bencana, bukan sinkronisasi:
         admin bisa mengekspor kembali dari konsol. ≤ ~200 KB supaya tenang. */
      (function () {
        try {
          var blob = JSON.stringify({ picks: PICKS, log: PLOG });
          if (blob.length > 600000) return;   // jangan tumbuh tak terkendali
          var lama = localStorage.getItem("qkuk_snap_last") || "";
          if (blob !== lama) {
            localStorage.setItem("qkuk_snap_last", blob);
            localStorage.setItem("qkuk_snap_" + wibDate(new Date().toISOString()), blob);
          }
          var KUNCI = [];
          for (var i = 0; i < 14; i++) {
            var d = new Date(Date.now() - i * 864e5);
            KUNCI.push("qkuk_snap_" + d.getFullYear() + "-" + ("0" + (d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2));
          }
          Object.keys(localStorage).forEach(function (k) {
            if (k.indexOf("qkuk_snap_") === 0 && KUNCI.indexOf(k) < 0 && k !== "qkuk_snap_last") localStorage.removeItem(k);
          });
        } catch (e) {}
      })();
      /* riwayat kosong padahal ada pick? (mis. log tertimpa) — rekonstruksi
         dari pick itu sendiri supaya tabel riwayat tidak pernah blank */
      if (!PLOG.length && Object.keys(PICKS).length) {
        PLOG = Object.keys(PICKS).map(function (k) {
          var kp = kpOf(k), p = PICKS[k] || {};   // 16 Okt: kunci 5-bagian ikut
          return { t: p.ts || kp.ts || "", act: "ambil", sym: kp.sym || "", tf: kp.tf || "",
            jenis: kp.jenis || "", dir0: null, side: p.side || null,
            pct: (typeof p.pct === "number") ? p.pct : null,
            win: (p.win === 0 || p.win === 1) ? p.win : null, note: p.note || null };
        }).sort(function (a, b) { return (b.t || "").localeCompare(a.t || ""); });
      }
      applyPicks();
    }
    /* 21 Sep — timeout 8 dtk: kalau satu sumber menggantung (jaringan yang
       memblokir textdb.dev/picks.json), jangan biarkan tombol admin tidak
       pernah terpasang — pakai apa yang sudah ada. */
    setTimeout(function () { tick(); tick(); }, 8000);
    fetch("picks.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { repo = (j && j.picks) || {}; repoLog = (j && j.log) || []; tick(); })
      .catch(function () { tick(); });
    fetch("https://textdb.dev/api/data/" + TXTDB_ID + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (j && typeof j.value === "string") { try { j = JSON.parse(j.value); } catch (e) {} }
        cloud = (j && j.picks) || {}; cloudLog = (j && j.log) || [];
        if (j && j.auth && j.auth.hash) AUTHCLOUD = j.auth.hash;
        if (j && j.hashes && typeof j.hashes === "object") AUTH_HASHES = j.hashes;  // 11 Okt — hash per-akun
        /* 12 Okt — verifikasi tanda tangan pembaca (prioritas-2): payload
           dgn sig yang tidak cocok = kemungkinan ditulis pihak luar →
           tampilkan warnan chip sekali, jangan blok: kadang kunci pick
           terakhir berubah sah lewat edit admin lain. */
        if (j && j.sig) {
          var keys2 = Object.keys(j.picks || {}).sort();
          var akhir2 = keys2.length ? keys2[keys2.length - 1] : "-";
          var hari2 = wibDate(new Date().toISOString());
          var mat2 = "qkuk-tulisan|" + akhir2 + "|" + keys2.length + "|" + hari2 + "|" + (j.sigBy || "Qkuk");
          sha256hex(mat2).then(function (h2) {
            if (h2 !== j.sig) {
              var ada = document.getElementById("qk-err");
              if (ada) { ada.textContent = "\u26a0 picks cloud ditulis tanpa tanda tangan admin yang sah (" + (j.sigBy || "?") + ") — isi bisa jadi dari pihak luar."; ada.style.display = "block"; }
            }
          });
        }
        tick();
      })
      .catch(function () { tick(); });
  }
  function applyPicks() {
    if (!DATA || !DATA.live) return;
    ord().forEach(function (tf) {
      (DATA.live[tf].pantau || []).forEach(function (r) {
        r.apick = PICKS[pickKey(tf, "watch", r)] || null;
      });
      (DATA.live[tf].sinyal || []).forEach(function (r) {
        r.apick = PICKS[pickKey(tf, "sig", r)] || null;
      });
    });
    rerenderTables(); liveStats();
    kotakAnalisis();   // 26 Sep — kotak analisis winrate ikut segar tiap picks berubah
    bbPickedSync(); bbPickedMark();   // bintang & garis emas bubble ikut picks terbaru
    /* 23 Sep — grafik live (kurva kumulatif & winrate per jam) ikut
       digambar ulang saat picks tiba/berubah. Dulu charts() hanya jalan
       sekali di render pertama → kedua SVG selalu menampilkan
       "belum ada resolve" karena picks cloud tiba belakangan. */
    charts(); hourHeat(); dayWinrate();
    /* 13 Okt — LIVE SCORE & RINGKASAN AKURASI ikut segar: kartu dirender
       sekali saat init (SEBELUM picks cloud tiba) → selalu “belum ada
       trade”. Sekarang dirender ulang tiap picks datang/berubah. */
    liveScoreMount(); plogRender();
  }
  /* simpan picks — hanya lewat cloud (textdb.dev); wajib login admin.
     Jalur GitHub dihapus (token repot & rawan salah scope). */
  /* 12 Okt — prioritas-1b: SATU BERSIH-BERSIH gambar pick lama. Pick yang
     sudah resolved (win/loss) DAN lebih tua dari 21 hari tidak butuh
     gambarnya lagi di cloud — popup detail tetap menarik catatannya.
     Dipanggil saat setiap SAVE, cuma aktif setelah login admin. */
  function cairicitGambar() {
    if (!isLogged()) return 0;
    var batas = Date.now() - 60 * 864e5, pgalak = 0;   // 13 Okt: 21 hr → 60 hr (gambar bulan berjalan + bulan lalu tetap tampil)
    Object.keys(PICKS).forEach(function (k) {
      var p = PICKS[k];
      if (!p || !Array.isArray(p.imgs) || !p.imgs.length) return;
      if ((p.win !== 0 && p.win !== 1) || !p.ts || (new Date(p.ts).getTime() || 0) > batas) return;
      p.imgs = []; pgalak++;
    });
    return pgalak;
  }
  /* 12 Okt — prioritas-2: TAMBAHAN tanda tangan ringan. textdb.dev tidak
     bisa di-autentikasi, tapi payload kini membawa sig = SHA-256 dari
     "qkuk-tulisan|<pick key terakhir>|<jumlah pick>|<timestamp hari WIB>"
     plus identitas admin pembuatnya. Kode tidak bisa mencegah penulisan
     asing (limit textdb), TAPI browser pembaca bisa MENGALERT isi yang
     tanda tangannya tak cocok (dipaksa ditulis dari luar) — tamu tak
     teralert bila sudah terbiasa. Ini pengaman ringan, bukan gembok. */
  function sigAdmin() {
    var keys = Object.keys(PICKS).sort(), akhir = keys.length ? keys[keys.length-1] : "-";
    var hari = wibDate(new Date().toISOString());
    var mat = "qkuk-tulisan|" + akhir + "|" + keys.length + "|" + hari + "|" + meAdmin();
    return sha256hex(mat);
  }
  function cloudWrite() {
    cairicitGambar();
    return sigAdmin().then(function (sig) {
      /* 13 Okt — LINDUNGI DATA (akar masalah "kemarin ngisi malah ilang"):
         textdb.dev = satu slot last-write-wins — klien dgn salinan lama yang
         menyimpan menimpa SELURUH payload. Sekarang SEBELUM menulis: ambil
         payload yang ada, GABUNGKAN (pick key sama → versi baru menang;
         log digabung, duplikat dibuang, urut terbaru), baru tulis.
         Pick/log dari admin lain tidak pernah musnah lagi. */
      return fetch("https://textdb.dev/api/data/" + TXTDB_ID + "?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .catch(function () { return ""; })
        .then(function (t) {
          var lamas = null;
          try {
            var env = JSON.parse(t);
            var j = typeof (env && env.value) === "string" ? JSON.parse(env.value) : null;
            if (j && j.picks && typeof j.picks === "object") lamas = j;
          } catch (e) {}
          var picks2 = Object.assign({}, (lamas && lamas.picks) || {}, PICKS);
          var kd = function (e) { return (e.t || "") + "|" + (e.act || "") + "|" + (e.jenis || "") + "|" + (e.sym || "") + "|" + (e.win == null ? "" : e.win); };
          var kunci = {}, plog2 = [];
          PLOG.forEach(function (e) { var k2 = kd(e); if (!kunci[k2]) { kunci[k2] = 1; plog2.push(e); } });
          ((lamas && Array.isArray(lamas.log)) ? lamas.log : []).forEach(function (e) {
            var k2 = kd(e); if (!kunci[k2]) { kunci[k2] = 1; plog2.push(e); }
          });
          plog2.sort(function (a, b) { return String(b.t || "").localeCompare(String(a.t || "")); });
          var hashes2 = Object.assign({}, (lamas && lamas.hashes) || {}, AUTH_HASHES || {});
          return fetch("https://textdb.dev/api/data/" + TXTDB_ID, {
            method: "POST", headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ __id: TXTDB_ID, value: JSON.stringify({
              picks: picks2, log: plog2,
              auth: (AUTHCLOUD || AUTH_HASHES[AUTH.user]) ? { user: AUTH.user, hash: AUTHCLOUD || AUTH_HASHES[AUTH.user] } : (lamas && lamas.auth) || null,
              hashes: Object.keys(hashes2).length ? hashes2 : null,
              sig: sig, sigBy: meAdmin() }) })
          }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); });
        });
    });
  }
  function savePicks(st, done) {
    if (!isLogged()) { openAdmin(); return; }
    st.textContent = "menyimpan…";
    cloudWrite()
      .then(function () {
        st.textContent = "tersimpan ✓ (live seketika)";
        if (done) done();
      })
      .catch(function (e) {
        /* 27 Sep — pesan jelas: kenapa gagal, pick BELUM tersimpan, dan
           tombol COBA LAGI dgn satu klik (dulu cuma teks, admin harus
           buka-tutup popup utk mengulang). */
        var m = (e && e.message) || String(e);
        var net = m.indexOf("Failed to fetch") >= 0 || m.indexOf("NetworkError") >= 0;
        st.innerHTML = "";
        var sp = el("span", "sv-msg " + (net ? "warn" : "neg"),
          net ? "gagal: jaringan memblokir textdb.dev (VPN/DNS/ISP?) — pick BELUM tersimpan."
              : "gagal: server textdb.dev bermasalah (" + m + ") — pick BELUM tersimpan.");
        var b = el("button", "sv-retry", "coba lagi");
        b.type = "button";
        b.addEventListener("click", function () { savePicks(st, done); });
        st.appendChild(sp); st.appendChild(b);
      });
  }
  /* 21 Sep — jaring pengaman modal: kalau ada error apa pun saat membangun
     form edit, JANGAN diam-diam blank — tampilkan modal darurat bergaya
     inline (bebas CSS eksternal) yang memuat pesan errornya. */
  function admFallback(err) {
    try { if (window.console) console.error("openResolve:", err); } catch (e) {}
    var m = document.getElementById("adm-modal");
    if (!m) {
      m = document.createElement("div"); m.id = "adm-modal";
      document.body.appendChild(m);
    }
    m.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(4,7,6,.8);display:flex;"
      + "align-items:center;justify-content:center;z-index:9999;padding:16px";
    var b = document.createElement("div");
    b.style.cssText = "background:#101614;border:1px solid #2a3532;border-radius:10px;"
      + "padding:18px;width:min(430px,94vw);color:#e8efe9;font:12.5px/1.6 monospace";
    b.innerHTML = "<b>Form edit gagal dibuka.</b><br><br>Pesan error "
      + "(kirim ini bila masih bermasalah):<br><code style='color:#ffb4ab;word-break:break-all'></code>"
      + "<br><button type='button' style='margin-top:12px;padding:8px 14px;border-radius:6px;"
      + "border:1px solid #2a3532;background:#18201c;color:#e8efe9;cursor:pointer'>tutup</button>";
    b.querySelector("code").textContent = String((err && (err.stack || err.message)) || err).slice(0, 400);
    b.querySelector("button").onclick = function () { m.style.display = "none"; };
    m.innerHTML = ""; m.appendChild(b);
  }
  function admShow(inner) {
    var m = document.getElementById("adm-modal");
    if (!m) {
      m = el("div", "adm-modal"); m.id = "adm-modal";
      m.appendChild(el("div", "adm-box"));
      document.body.appendChild(m);
      m.addEventListener("click", function (ev) {
        if (ev.target === m) { m.classList.remove("in"); m.style.display = "none"; }
      });
    }
    var box = m.querySelector(".adm-box");
    if (!box) { box = el("div", "adm-box"); m.appendChild(box); }
    box.innerHTML = "";
    box.appendChild(inner);
    m.classList.add("in");
    m.style.display = "flex";
  }
  function admClose() { var m = document.getElementById("adm-modal");
    if (m) { m.classList.remove("in"); m.style.display = "none"; } }
  function admHead(title, sub) {
    var h = el("div", "adm-h");
    h.appendChild(el("b", null, title));
    if (sub) h.appendChild(el("span", "adm-sub", sub));
    var x = el("button", "adm-x", "\u00d7"); x.type = "button";
    x.addEventListener("click", admClose); h.appendChild(x);
    return h;
  }
  function openResolve(tf, jenis, r, p) {
    if (!isAdmin()) { openAdmin(); return; }
    try {
    var key = pickKey(tf, jenis, r), box = el("div");
    box.appendChild(admHead("Live pick \u2014 " + (r.sym || "").replace(/USDT$/, ""),
      tf.toUpperCase() + " \u00b7 " + jenis + " \u00b7 " + (r.ts || "")));
    var sideSel = el("select", "adm-in");
    [["", "arah: ikut engine (" + r.dir + ")"], ["long", "koreksi: LONG"], ["short", "koreksi: SHORT"]]
      .forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; sideSel.appendChild(op); });
    if (p && p.side) sideSel.value = p.side;
    var pctIn = el("input", "adm-in"); pctIn.type = "number"; pctIn.step = "0.01";
    pctIn.placeholder = "hasil: untung/rugi berapa % (mis. 8 = untung, -2.4 = rugi)";
    if (p && hasPct(p.pct)) pctIn.value = p.pct;
    var winSel = el("select", "adm-in");
    [["", "hasil: masih open / belum ditentukan"], ["win", "hasil: WIN"], ["loss", "hasil: LOSS"]]
      .forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; winSel.appendChild(op); });
    if (p && p.win === 1) winSel.value = "win"; else if (p && p.win === 0) winSel.value = "loss";
    /* 13 Okt — HASIL & % KONSISTEN: admin mengisi untung/rugi %, win/loss
       mengikuti otomatis (POSITIF = PROFIT, NEGATIF = LOSS — tanpa dibalik
       untuk short; dulu dibalik → “WR 100% tapi net R minus”). */
    function sinkronWin() {
      var pv = parseFloat(pctIn.value);
      if (isNaN(pv)) return;
      if (pv > 0) winSel.value = "win";
      else if (pv < 0) winSel.value = "loss";
      if (winSel.parentNode) {
        var hint = winSel.parentNode.querySelector(".sv-msg.winhint");
        if (!hint) {
          hint = el("span", "sv-msg winhint");
          winSel.parentNode.insertBefore(hint, winSel.nextSibling);
        }
        hint.textContent = "hasil win/loss mengikuti % × arah — pilih manual di dropdown bila memang beda maksud";
      }
    }
    pctIn.addEventListener("input", sinkronWin);
    var noteIn = el("input", "adm-in"); noteIn.type = "text";
    noteIn.placeholder = "catatan (alasan koreksi, dll)";
    if (p && p.note) noteIn.value = p.note;
    /* 11 Okt — STATUS PICK (permintaan user): menunggu / ambil posisi /
       take profit. Pick lama tanpa status = "menunggu" default tampilan,
       tak apa: pembacaan undefined-safe. */
    var stSel = el("select", "adm-in");
    [["menunggu", "status: MENUNGGU (menunggu konfirmasi / belum entry)"],
     ["entry", "status: AMBIL POSISI (posisi sudah dibuka)"],
     ["tp", "status: TAKE PROFIT (target tercapai / posisi ditutup)"]]
      .forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; stSel.appendChild(op); });
    stSel.value = p && p.status ? p.status : "menunggu";
    /* 11 Okt — INDUCEMENT: teks setup inducement terpisah dari checklist
       alasan (user minta field khusus di Live Pick). */
    var inducIn = el("input", "adm-in"); inducIn.type = "text";
    inducIn.placeholder = "inducement (z yang tersapu / level likuiditas…, kosong bila tidak ada)";
    if (p && p.inducement) inducIn.value = p.inducement;
    /* 11 Okt — UPLOAD GAMBAR maks 4 (kvota user). Gambar kini "difor-entity"
       ke data URL — sekaligus gambar berpindah bersama pick ke cloud, dan
       riwayat koreksi tetap bisa membukanya berbulan-bulan kemudian. */
    var imgWrap = el("div", "al-wrap");
    imgWrap.appendChild(el("div", "al-hdr", "gambar chart (maks " + IMG_MAX + ") — lihat riwayat koreksi: kenapa posisi diambil"));
    var imgs = [];
    ((p && p.imgs) || []).forEach(function (d) { if (typeof d === "string" && imgs.length < IMG_MAX) imgs.push(d); });
    var imgGrid = el("div", "pimg-grid");
    function renderImgs() {
      imgGrid.innerHTML = "";
      imgs.forEach(function (d, i) {
        var it = el("div", "pimg-it");
        var im = document.createElement("img"); im.src = d; im.alt = "pick " + (i + 1);
        im.title = "klik perbesar (full layar)";
        im.style.cursor = "zoom-in";
        im.addEventListener("click", function () { lightboxImg(d); });
        it.appendChild(im);
        var x = el("button", "pimg-x", "\u00d7"); x.type = "button";
        x.title = "buang gambar ini";
        x.addEventListener("click", function () { imgs.splice(i, 1); renderImgs(); });
        it.appendChild(x);
        imgGrid.appendChild(it);
      });
      up.style.display = imgs.length >= IMG_MAX ? "none" : "";
    }
    var up = el("input", "adm-in pimg-in"); up.type = "file";
    up.accept = "image/*"; up.multiple = false;
    /* 12 Okt — KOMPRES OTOMATIS (prioritas-1): screenshot chart mentah bisa
       2-4 MB; 4 gambar = ~13 MB per pick, dan SEMUA pengunjung mengunduh
       picks cloud tiap 60 detik. Kini setiap gambar dilewatkan canvas:
       sisi terpanjang dipangkas ke 800px, hasil diekspor JPEG q0.62 →
       umumnya 100-250 KB per gambar — ~10× lebih kecil tanpa
       kehilangan keterbacaan chart). PNG dgn transparansi tetap jadi JPEG
       (latar hitam) — chart TradingView tidak punya transparansi, aman. */
    function kompresGambar(file, cb) {
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          try {
            var MAXS = 800, w = im.naturalWidth, h = im.naturalHeight;
            var sk = Math.min(1, MAXS / Math.max(w, h));
            var cv = document.createElement("canvas");
            cv.width = Math.max(1, Math.round(w * sk));
            cv.height = Math.max(1, Math.round(h * sk));
            var cx = cv.getContext("2d");
            cx.fillStyle = "#000"; cx.fillRect(0, 0, cv.width, cv.height);
            cx.drawImage(im, 0, 0, cv.width, cv.height);
            cb(cv.toDataURL("image/jpeg", 0.62));
          } catch (err) { cb(null, "gambar gagal diproses: " + (err.message || err)); }
        };
        im.onerror = function () { cb(null, "bukan gambar yang bisa dibaca browser."); };
        im.src = String(rd.result || "");
      };
      rd.onerror = function () { cb(null, "file gagal dibaca."); };
      rd.readAsDataURL(file);
    }
    up.addEventListener("change", function () {
      var f = up.files && up.files[0]; up.value = "";
      if (!f) return;
      if (imgs.length >= IMG_MAX) { alert("maksimal " + IMG_MAX + " gambar per pick."); return; }
      if (f.size > 25 * 1024 * 1024) { alert("file terlalu besar (" + (f.size / 1048576).toFixed(1) + " MB) — bukan screenshot chart."); return; }
      var st0 = el("span", "sv-msg warn", "mengompres…");
      imgWrap.appendChild(st0);
      kompresGambar(f, function (d, err) {
        if (st0.parentNode) st0.parentNode.removeChild(st0);
        if (err) { alert(err); return; }
        if (!d) return;
        imgs.push(d); renderImgs();
      });
    });
    renderImgs(); imgWrap.appendChild(up); imgWrap.appendChild(imgGrid);
    /* 27 Sep — checklist v2: SATU alasan bisa dipilih di BANYAK timeframe
       (mis. MSS 1h + MSS 30m + MSS 5m). TF kini chip multi-pilih per alasan;
       tersimpan sbg array [{a, tf}, …]. Prefill dari pick lama tetap jalan. */
    var alWrap = el("div", "al-wrap");
    alWrap.appendChild(el("div", "al-hdr",
      "alasan mengambil posisi — centang, lalu klik timeframe (boleh lebih dari satu)"));
    var alState = {};
    alasanPairs(p).forEach(function (x) {
      (alState[x.a] = alState[x.a] || []).push(x.tf);
    });
    ALASAN.forEach(function (a) {
      var line = el("div", "al-line");
      var cb = el("input", "al-cb"); cb.type = "checkbox"; cb.value = a;
      cb.id = "al-" + a; cb.checked = !!alState[a];
      var lb = el("label", "al-lb", alasanNama(a)); lb.htmlFor = cb.id;
      var tfs = el("div", "al-tfs");
      var def = a.indexOf("Super") === 0 || a.indexOf("EMA") === 0 ? "1h" : "15m";
      TF_OPTS.forEach(function (t) {
        var ch = el("button", "al-tfchip" + (t === def ? " on" : ""), t);
        ch.type = "button"; ch.dataset.tf = t;
        ch.addEventListener("click", function () { ch.classList.toggle("on"); });
        tfs.appendChild(ch);
      });
      if (alState[a])   // prefill: hanya TF yang tersimpan yang ON
        tfs.querySelectorAll(".al-tfchip").forEach(function (ch) {
          ch.classList.toggle("on", alState[a].indexOf(ch.dataset.tf) >= 0);
        });
      function sync() { tfs.style.display = cb.checked ? "" : "none"; }
      cb.addEventListener("change", sync); sync();
      line.appendChild(cb); line.appendChild(lb); line.appendChild(tfs);
      alWrap.appendChild(line);
    });
    var st = el("div", "adm-status");
    var row = el("div", "adm-row");
    var save = el("button", "adm-save", p ? "update pick" : "ambil & simpan"); save.type = "button";
    var cancel = el("button", "adm-cancel", "batal"); cancel.type = "button";
    row.appendChild(save); row.appendChild(cancel);
    if (p) { var del = el("button", "adm-del", "hapus pick"); del.type = "button";
      row.insertBefore(del, cancel);
      del.addEventListener("click", function () {
        delete PICKS[key]; plogAdd("hapus", key, p, r);
        savePicks(st, function () { applyPicks(); admClose(); });
      });
    }
    box.appendChild(sideSel); box.appendChild(pctIn); box.appendChild(winSel);
    box.appendChild(stSel); box.appendChild(inducIn);
    box.appendChild(noteIn); box.appendChild(alWrap); box.appendChild(imgWrap);
    box.appendChild(row); box.appendChild(st);
    admShow(box);
    save.addEventListener("click", function () {
      var al = [];   // [{a, tf}, …] — satu alasan boleh banyak TF
      alWrap.querySelectorAll(".al-line").forEach(function (line) {
        var cb = line.querySelector("input.al-cb");
        if (!cb || !cb.checked) return;
        line.querySelectorAll(".al-tfchip.on").forEach(function (ch) {
          al.push({ a: cb.value, tf: ch.dataset.tf });
        });
      });        PICKS[key] = { taken: 1, side: sideSel.value || null,
        /* 15 Okt (arah "?") — pilihan "ikut engine" kini ikut merekam
           arah engine saat itu di dir0, biar riwayat tak perlu bertanda tanya. */
        dir0: (!sideSel.value && r && r.dir) ? r.dir : null,
        pct: pctIn.value === "" ? null : parseFloat(pctIn.value),
        win: winSel.value === "win" ? 1 : winSel.value === "loss" ? 0 : null,
        status: stSel.value || "menunggu",
        inducement: inducIn.value || null,
        note: noteIn.value || null, alasan: al, imgs: imgs.slice(0, IMG_MAX),
        ts: new Date().toISOString(), by: meAdmin() };
      plogAdd(p ? "koreksi" : "ambil", key, PICKS[key], r);
      savePicks(st, function () { applyPicks(); admClose(); });
    });
    cancel.addEventListener("click", admClose);
    } catch (err) { admFallback(err); }
  }
  function openAdmin() {
    var box = el("div");
    box.appendChild(admHead("Login admin"));
    function reapply() { rerenderTables(); liveStats(); }
    if (isLogged()) {
      box.appendChild(el("div", "adm-desc", "Login sebagai " + meAdmin() + " ✓ — tombol \"ambil\" aktif di semua tabel dan kamu bisa mengoreksi pick kapan pun. Pick yang kamu buat tertanda " + meAdmin() + "."));
      var row0 = el("div", "adm-row");
      var ganti = el("button", "adm-save", "ganti password"); ganti.type = "button";
      var out = el("button", "adm-del", "keluar"); out.type = "button";
      row0.appendChild(ganti); row0.appendChild(out); box.appendChild(row0);
      admShow(box);
      ganti.addEventListener("click", openChgPass);
      out.addEventListener("click", function () {
        admClose(); gateLogout();
      });
      return;
    }
    box.appendChild(el("div", "adm-desc", "Hanya admin yang bisa mengedit live picks — pengunjung lain hanya melihat hasilnya."));
    var uIn = el("input", "adm-in"); uIn.type = "text"; uIn.placeholder = "username";
    uIn.autocomplete = "username";
    var pIn = el("input", "adm-in"); pIn.type = "password"; pIn.placeholder = "password";
    pIn.autocomplete = "current-password";
    var st = el("div", "adm-status");
    var row = el("div", "adm-row");
    var btn = el("button", "adm-save", "masuk"); btn.type = "button";
    row.appendChild(btn);
    box.appendChild(uIn); box.appendChild(pIn); box.appendChild(row); box.appendChild(st);
    admShow(box);
    function tryLogin() {
      var u = (uIn.value || "").trim(), p = pIn.value || "";
      sha256hex(u + ":" + p)
        .then(function (h) {
          /* 11 Okt — dua admin. Pencocokan username tak peduli besar-kecil;
             identitas (Qkuk/Gerry) dikunci di sessionStorage untuk penandaan. */
          var hit = null;
          Object.keys(ADMINS).forEach(function (k) {
            if (!hit && k.toLowerCase() === u.toLowerCase() && h === $hashOke(k)) hit = ADMINS[k].who;
          });
          if (hit) {
            SS.set("qkuk_admin_ok", "1");
            SS.set("qkuk_admin_who", hit);
            /* 23 Sep — pegas penyelamat: hasilkan ulang picks.json repo dari
               cloud (sumber sebenarnya) setiap admin login. Tanpa ini,
               pengunjung yang jaringannya memblokir textdb.dev jatuh ke
               picks.json yang basi/kosong dan winrate live tampak hilang.
               GUARD: hanya bila PICKS tidak kosong — bila jaringan memblokir
               cloud DAN repo kosong, menulis berarti menghapus data; jangan. */
            if (Object.keys(PICKS).length) {
              cloudWrite().then(function () { try { console.info("picks.json disinkronkan dari cloud ✓"); } catch (e) {} })
                          .catch(function () {});
            }
            st.textContent = "selamat datang, " + hit + " ✓";
            setTimeout(function () { admClose(); reapply(); }, 450);
          } else st.textContent = "username / password salah";
        })
        .catch(function () { st.textContent = "gagal memverifikasi login"; });
    }
    btn.addEventListener("click", tryLogin);
    pIn.addEventListener("keydown", function (ev) { if (ev.key === "Enter") tryLogin(); });
    uIn.addEventListener("keydown", function (ev) { if (ev.key === "Enter") pIn.focus(); });
  }
  function openChgPass() {
    var box = el("div");
    box.appendChild(admHead("Ganti password admin (" + meAdmin() + ")"));
    box.appendChild(el("div", "adm-desc",
      "Password baru disimpan sebagai hash SHA-256 di cloud — berlaku untuk semua perangkat, tanpa edit kode. Minimal 6 karakter. Yang diganti = password " + meAdmin() + " saja; akun admin lain tidak terpengaruh."));
    var oIn = el("input", "adm-in"); oIn.type = "password"; oIn.placeholder = "password lama";
    var nIn = el("input", "adm-in"); nIn.type = "password"; nIn.placeholder = "password baru";
    var rIn = el("input", "adm-in"); rIn.type = "password"; rIn.placeholder = "ulangi password baru";
    var st = el("div", "adm-status");
    var row = el("div", "adm-row");
    var ok = el("button", "adm-save", "simpan password"); ok.type = "button";
    var cc = el("button", "adm-cancel", "batal"); cc.type = "button";
    row.appendChild(ok); row.appendChild(cc);
    box.appendChild(oIn); box.appendChild(nIn); box.appendChild(rIn); box.appendChild(row); box.appendChild(st);
    admShow(box);
    ok.addEventListener("click", function () {
      /* 11 Okt — ganti password kini PER ADMIN: hash lama dicek terhadap
         akun yang sedang login (meAdmin), bukan selalu "admin". Gerry
         (Admin2) mengganti password Admin2 — Qkuk tidak terpengaruh. */
      var acct = null, baseHash = null;
      Object.keys(ADMINS).forEach(function (k) {
        if (ADMINS[k].who === meAdmin()) { acct = k; baseHash = $hashOke(k); }
      });
      if (!acct) { st.textContent = "akun tidak dikenali"; return; }
      var o = oIn.value || "", n = nIn.value || "", r2 = rIn.value || "";
      if (n.length < 6) { st.textContent = "password baru minimal 6 karakter"; return; }
      if (n !== r2) { st.textContent = "ulangan password baru tidak sama"; return; }
      st.textContent = "memverifikasi…";
      sha256hex(acct + ":" + o)
        .then(function (h) {
          if (h !== baseHash) { st.textContent = "password lama salah"; return; }
          return sha256hex(acct + ":" + n);
        })
        .then(function (h2) {
          if (!h2) return;
          /* 11 Okt — hash per-akun di cloud: {"admin": …, "Admin2": …}.
             AUTHCLOUD (hash Qkuk) dipertahankan agar kompatibel dgn kode lama. */
          AUTH_HASHES[acct] = h2;
          if (acct === AUTH.user) AUTHCLOUD = h2;
          plogAdd("password", "", null, null);
          return cloudWrite().then(function () {
            st.textContent = "password " + meAdmin() + " diganti ✓ — aktif utk semua perangkat";
            setTimeout(admClose, 1000);
          });
        })
        .catch(function (e) { st.textContent = "gagal: " + (e.message || e); });
    });
    cc.addEventListener("click", admClose);
  }
  /* kolom KOREKSI ADMIN — tepat di samping kolom side supaya pengunjung
     tidak salah baca: arah engine tetap di kolom side, koreksian admin
     tampil TERPISAH di sini (mis. sinyal short dikoreksi jadi long). */
  function corrCell(r, tf, jenis) {
    var td = el("td", "st apick");
    var p = r.apick;
    if (!p) { td.textContent = "—"; td.classList.add("dim"); return td; }
    var fixed = p.side && p.side !== r.dir ? p.side : null;
    if (!fixed) {
      td.textContent = "ikut engine";
      td.classList.add("dim");
      if (isAdmin()) {
        td.style.cursor = "pointer";
        td.title = "admin: klik untuk koreksi arah";
        td.addEventListener("click", function () { openResolve(tf, jenis, r, p); });
      }
      return td;
    }
    var b = el("button", "apbadge corr " + (fixed === "long" ? "apwin" : "aploss"));
    b.type = "button";
    b.textContent = "⇄ " + fixed;
    b.title = "KOREKSI ADMIN: sinyal engine " + r.dir + " dikoreksi jadi " + fixed
      + (hasPct(p.pct) ? " · hasil " + sgn(p.pct, 1) + "%" : "")
      + (p.win === 1 ? " · WIN" : p.win === 0 ? " · LOSS" : " · open")
      + (p.note ? " — " + p.note : "");
    if (isAdmin()) b.addEventListener("click", function () { openResolve(tf, jenis, r, p); });
    td.appendChild(b);
    return td;
  }
  /* sel kolom "live" di tabel: tombol ambil (admin) / badge hasil (semua) */
  function pickCell(r, tf, jenis) {
    var td = el("td", "st apick");
    var p = r.apick;
    if (p) {
      var ku = pickKey(tf, jenis, r);
      td.dataset.tf = tf; td.dataset.jenis = jenis; td.dataset.key = ku;
    }
    if (!p) {
      if (isAdmin()) {
        var b = el("button", "apbtn", "ambil"); b.type = "button";
        b.addEventListener("click", function () { openResolve(tf, jenis, r, null); });
        td.appendChild(b);
      } else { td.textContent = "\u2014"; td.classList.add("dim"); }
      return td;
    }
    var side = p.side || p.dir0 || r.dir;
    var b2 = el("button", "apbadge " + (p.win === 1 ? "apwin" : p.win === 0 ? "aploss" : "apopen"));
    b2.type = "button";
    b2.textContent = (side === "long" ? "\u25b2" : "\u25bc")
      + (p.side && p.side !== r.dir ? "\u21c4" : "")
      + (p.win === 1 ? " W" : p.win === 0 ? " L" : " \u00b7")
      + (hasPct(p.pct) ? " " + sgn(p.pct, 1) + "%" : "");
    b2.title = (isAdmin() ? "klik untuk koreksi" : "live pick") + " \u2014 ambil " + side
      + (p.side && p.side !== r.dir ? " (arah dikoreksi dari " + r.dir + ")" : "")
      + (hasPct(p.pct) ? ", hasil " + sgn(p.pct, 1) + "%" : "")
      + (p.note ? " \u2014 " + p.note : "");
    if (isAdmin()) b2.addEventListener("click", function () { openResolve(tf, jenis, r, p); });
    /* 26 Sep — tombol "detail": popup alasan ambil posisi, TERLIHAT semua
       orang (admin & pengunjung) — klik badge tetap koreksi utk admin. */
    var d = el("button", "apdetail", "detail"); d.type = "button";
    d.title = "lihat detail alasan ambil posisi";
    d.addEventListener("click", function (ev) {
      ev.stopPropagation();
      openAlasan(tf, jenis, r, p);
    });
    td.appendChild(b2); td.appendChild(d);
    /* 12 Okt — TOMBOL CEPAT STATUS (prioritas-5): ⏳ menunggu · ▶ ambil
       posisi · TP take profit — klik LANGSUNG mengubah p.status & memperbarui
       bubbles/live score tanpa membuka popup. Pick yang sudah TP juga
       mengingatkan mengisi win/loss bila belum (klik kanan = popup). */
    if (isAdmin()) {
      var qst = p.status || "menunggu";
      var qw = el("span", "qst-row");
      if (qst === "menunggu")
        qw.appendChild(chipStatus("\u25b6", "entry", "klik ubah status: AMBIL POSISI"));
      if (qst === "entry")
        qw.appendChild(chipStatus("TP", "tp", "klik ubah status: TAKE PROFIT"));
      if (qst === "tp" && p.win !== 1 && p.win !== 0)
        qw.appendChild(chipStatus("win/loss?", "fix", "pick TP tapi win/loss belum diisi — klik untuk buka popup resolve"));
      td.appendChild(qw);
    }
    return td;
  }
  /* chip quick-status dibuat helper — dipakai pickCell di semua tabel */
  function chipStatus(teks, mode, judul) {
    var b = el("button", "qst-chip qst-" + mode, teks);
    b.type = "button"; b.title = judul;
    b.dataset.mode = mode;
    return b;
  }
  /* 12 Okt — aksi chip quick-status: pasang sekali di root, delegasi klik.
     data-tf/-jenis/-ts/-sym dibawa elemen td (lihat pickCell). */
  document.addEventListener("click", function (ev) {
    var t = ev.target instanceof Element && ev.target.closest(".qst-chip");
    if (!t) return;
    var td = t.closest("td");
    if (!td || !td.dataset.tf) return;
    var data = { tf: td.dataset.tf, jenis: td.dataset.jenis, key: td.dataset.key };
    var p = PICKS[data.key];
    if (!p) return;
    var mode = t.dataset.mode;
    if (mode === "fix") { openResolve(data.tf, data.jenis, { ts: (data.key.split("|")[2] || ""), sym: (data.key.split("|")[3] || ""), dir: p.side }, p); return; }
    var baru = mode === "entry" ? "entry" : "tp";
    p.status = baru;
    plogAdd(baru === "tp" ? "takeprofit" : "ambilposisi", data.key, p, null);
    var st = el("div", "adm-status");
    savePicks(st, function () {
      applyPicks();
      if (st.parentNode) st.parentNode.removeChild(st);
    });
    document.body.appendChild(st);
  });
  /* kartu winrate LIVE dari resolve admin — per engine, di section Picked by you */
  function liveStats() {
    var kamu = document.getElementById("kamu");
    if (!kamu) return;
    var host = document.getElementById("live-grid");
    if (!host) {
      host = el("div", "ak-grid"); host.id = "live-grid";
      var grid = document.getElementById("kamu-grid");
      if (grid && grid.parentNode === kamu) kamu.insertBefore(host, grid.nextSibling);
      else kamu.appendChild(host);
    }
    /* judul DI LUAR grid — kalau di dalam, ia makan kolom pertama dan kartu
       ketiga (swing) terdorong ke baris dua (kotak tidak sejajar) */
    var head = document.getElementById("live-grid-head");
    if (!head) {
      head = el("div", "pn-h lv-sub"); head.id = "live-grid-head";
      kamu.insertBefore(head, host);
    } else if (head.nextSibling !== host) kamu.insertBefore(head, host);
    head.textContent = "live resolve \u2014 pilihan admin (bukan backtest)";
    host.innerHTML = "";
    ord().forEach(function (tf) {
      var n = 0, w = 0, l = 0, open = 0, tot = 0;
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p) return;
          n++;
          if (p.win === 1) w++; else if (p.win === 0) l++; else open++;
          if (hasPct(p.pct)) tot += p.pct;   /* 13 Okt: % = untung/rugi nett — tanpa balik tanda short */
        });
      });
      var c = el("div", "ch"); var hh = el("div", "ch-h");
      hh.appendChild(el("span", "ch-n", "live " + (DATA.live[tf].nama || tf).toLowerCase()));
      hh.appendChild(el("span", "ch-tf", tf.toUpperCase()));
      c.appendChild(hh);
      var rows = el("div", "rows");
      function row(a, b, cls) { var x2 = el("div", "row"); x2.appendChild(el("span", "l", a));
        x2.appendChild(el("span", "d")); x2.appendChild(el("span", "v " + (cls || ""), b)); rows.appendChild(x2); }
      if (!n) {
        row("live picks", "belum ada", "mut");
        row("cara", "klik \"ambil\" di tabel", "mut");
      } else {
        var res = w + l, wr = res ? w / res * 100 : null;
        row("live picks", String(n));
        row("win rate", wr === null ? "\u2014" : wr.toFixed(1) + "%",
          wr === null ? "mut" : (wr >= 50 ? "pos" : "neg"));
        row("total hasil", sgn(tot, 1) + "%", tot > 0 ? "pos" : tot < 0 ? "neg" : "mut");
        row("avg / pick", sgn(tot / n, 2) + "%", tot / n > 0 ? "pos" : tot / n < 0 ? "neg" : "mut");
        row("W \u00b7 L \u00b7 open", w + " \u00b7 " + l + " \u00b7 " + open, "mut");
      }
      var E2 = DATA.live[tf] || {};
      var btN = E2.tutup || 0;
      var btWr = btN ? (E2.menang || 0) / btN * 100 : null;
      var bh = el("div", "row bt-h"); bh.appendChild(el("span", "l", "— vs backtest engine —"));
      rows.appendChild(bh);
      row("backtest win rate", btWr === null ? "—" : btWr.toFixed(1) + "% (" + btN + " tutup)",
        btWr === null ? "mut" : btWr >= 50 ? "pos" : "neg");
      row("backtest hasil", sgn(E2.totR, 2) + "R", E2.totR > 0 ? "pos" : E2.totR < 0 ? "neg" : "mut");
      c.appendChild(rows); host.appendChild(c);
    });
    plogRender();
    hourHeat();
    dayWinrate();
  }
  /* ── WINRATE HARIAN Senin–Minggu (23 Sep) ─────────────────────────
     Winrate per hari dari LIVE resolve admin (pantau+sinyal, 3 kanal).
     Hari diambil dari tanggal firing sinyal (r.ts, sudah WIB). Filter
     periode: minggu ini / bulan ini / minggu lalu / bulan lalu / semua.
     Penanda ✦ = hari terbaik periode terpilih. Minggu pakai konvensi
     bursa: Senin = awal minggu. */
  var DOW = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  var DOW_S = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
  function dowParseTs(ts) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T]/.exec(String(ts || ""));
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(String(ts || ""));
    return isNaN(d.getTime()) ? null : new Date(d.getTime() + 7 * 3600e3);
  }
  function weekIndex(d) {          // nomor minggu sejak epoch — Senin awal minggu
    var t = Math.floor((d - new Date(1970, 0, 5)) / 6048e5);   // 5 Jan 1970 = Senin
    return t;
  }
  function dayKey(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function kelasWr(wr, has) {      // sama dengan kelas() heat table, tapi top-level
    if (!has) return "hh-none";
    var a = Math.min(.75, .1 + Math.abs(wr - 50) / 66).toFixed(2);
    return (wr >= 50 ? "hh-w" : "hh-l") + a;
  }
  function dayWinrate() {
    var kamu = document.getElementById("kamu");
    if (!kamu) return;
    var host = document.getElementById("daywr");
    if (!host) {
      host = el("div", "plog-wrap"); host.id = "daywr";
      var hh = document.getElementById("hheat");
      if (hh && hh.parentNode === kamu) kamu.insertBefore(host, hh.nextSibling);
      else kamu.appendChild(host);
    }
    var MODE = "week";             // week | lastweek | month | lastmonth | all
    try { if (localStorage.getItem("qkuk_daywr")) MODE = localStorage.getItem("qkuk_daywr"); } catch (e) {}
    var now = new Date();
    function inMode(d) {
      if (MODE === "all") return true;
      if (MODE === "week") return weekIndex(d) === weekIndex(now);
      if (MODE === "lastweek") return weekIndex(d) === weekIndex(now) - 1;
      var tm = now.getMonth() - (MODE === "lastmonth" ? 1 : 0), ty = now.getFullYear();
      if (tm < 0) { tm += 12; ty -= 1; }            // rollover Desember → Januari tahun lalu
      return d.getFullYear() === ty && d.getMonth() === tm;
    }
    var per = {}, k;
    [0,1,2,3,4,5,6].forEach(function (i) { per[i] = [0, 0, 0]; });
    var bestKey = null, bestWr = -1, tot = 0;
    ord().forEach(function (tf) {
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p) return;
          if (p.win !== 0 && p.win !== 1) return;
          var d = dowParseTs(r.ts); if (!d) return;
          if (!inMode(d)) return;
          var i = d.getDay();
          var pct = hasPct(p.pct) ? p.pct   /* 13 Okt: untung/rugi nett — tanpa balik tanda short */
                    : (p.win === 1 ? 1 : -1);
          var c = per[i]; c[0]++; c[1] += p.win; c[2] += pct;
        });
      });
    });
    for (k = 0; k < 7; k++) {
      tot += per[k][0];
      if (per[k][0] >= 2) { var wr = per[k][1] / per[k][0]; if (wr > bestWr) { bestWr = wr; bestKey = k; } }
    }
    host.innerHTML = "";
    host.appendChild(el("div", "pn-h lv-sub", "winrate harian \u2014 hari terbaik Senin–Minggu (live resolve)"));
    (function () {
      var tg = el("div", "hh-toggle");
      function btn(id, lab) {
        var b = el("button", "hh-tg" + (MODE === id ? " on" : ""), lab);
        b.type = "button";
        b.addEventListener("click", function () {
          try { localStorage.setItem("qkuk_daywr", id); } catch (e) {}
          dayWinrate();                              // render ulang periode baru
        });
        return b;
      }
      ["week|minggu ini", "lastweek|minggu lalu", "month|bulan ini", "lastmonth|bulan lalu", "all|semua"].forEach(function (s) {
        var pp = s.split("|"); tg.appendChild(btn(pp[0], pp[1]));
        });
      host.appendChild(tg);
    })();
    if (!tot) {
      host.appendChild(el("div", "plog-empty",
        MODE === "all" ? "belum ada resolve — isi win/loss lewat tombol ambil, tabel terisi otomatis"
                       : "belum ada resolve pada periode ini — coba periode lain"));
      return;
    }
    var wrap = el("div", "plog-scroll");
    var tab = el("table", "hh-t daywr-t");
    var thead = el("thead"), trh = el("tr");
    ["hari", "picks", "winrate", "total %", "bar"].forEach(function (x) { trh.appendChild(el("th", null, x)); });
    thead.appendChild(trh); tab.appendChild(thead);
    var tby = el("tbody");
    [1,2,3,4,5,6,0].forEach(function (i) {              // Senin dulu, Minggu terakhir
      var c = per[i], has = c[0] > 0, tr = el("tr");
      var isToday = (MODE === "week" || MODE === "month") && now.getDay() === i;
      if (isToday) tr.className = "hh-active";
      tr.appendChild(el("td", "hh-jam", DOW[i] + (isToday ? " · hari ini" : "")));
      tr.appendChild(el("td", null, has ? String(c[0]) : "—"));
      var tdW = el("td", "hh-c");
      if (has) {
        var wr = c[1] / c[0] * 100;
        tdW.className = "hh-c " + kelasWr(wr, true);
        tdW.style.setProperty("--a", Math.min(.75, .1 + Math.abs(wr - 50) / 66).toFixed(2));
        tdW.appendChild(el("span", "hh-wr " + (wr >= 50 ? "pos" : "neg"), wr.toFixed(0) + "%"));
        tdW.appendChild(el("span", "hh-sub", c[1] + "W/" + (c[0] - c[1]) + "L"));
        if (bestKey === i) tdW.appendChild(el("span", "hh-star", "\u2726"));
        tdW.title = DOW[i] + " — " + c[0] + " pick, menang " + c[1] + " (" + wr.toFixed(1) + "%), total " + sgn(c[2], 1) + "%";
      } else {
        tdW.className = "hh-c hh-none"; tdW.title = "belum ada resolve di hari ini";
      }
      tr.appendChild(tdW);
      var tdP = el("td", "");
      if (has) {
        var sp = el("span", c[2] > 0 ? "pos" : c[2] < 0 ? "neg" : "mut", sgn(c[2], 1) + "%");
        tdP.appendChild(sp);
      } else { tdP.textContent = "—"; tdP.className = "mut"; }
      tr.appendChild(tdP);
      /* kolom bar mini proporsional winrate — posisi 50% ditandai ticks */
      var tdB = el("td", "daywr-bar");
      if (has) {
        var wr2 = c[1] / c[0];
        var bx = el("div", "daywr-bx");
        var f = el("div", "daywr-f " + (wr2 >= .5 ? "up" : "dn"));
        f.style.width = Math.max(6, Math.round(wr2 * 100)) + "%";
        bx.appendChild(f);
        bx.appendChild(el("i", "daywr-mid"));
        tdB.appendChild(bx);
        tdB.title = "winrate " + (wr2 * 100).toFixed(0) + "% — garis tengah = 50%";
      }
      tr.appendChild(tdB);
      tby.appendChild(tr);
    });
    tab.appendChild(tby); wrap.appendChild(tab); host.appendChild(wrap);
    host.appendChild(el("div", "pn-h lv-sub" + " daywr-note", "✦ = hari terbaik periode (min. 2 pick) · bar = winrate vs garis 50% · sumber: live resolve admin, bukan backtest"));
  }
  /* ── HEAT TABLE jam terbaik (22 Sep) ──────────────────────────────
     24 jam WIB × 3 kanal + kolom TOTAL. Sel = winrate dari LIVE resolve
     admin (picks, watch+sig); intensitas warna = kekuatan jam: hijau makin
     pekat makin bagus, merah makin pekat makin buruk, abu = belum ada data.
     Sel terbaik per kolom diberi bintang ✦. Waktu sinyal = r.ts (firing),
     bukan jam pick. Diarahkan render() agar table header sticky bekerja. */
  function hourHeat() {
    var kamu = document.getElementById("kamu");
    if (!kamu) return;
    var host = document.getElementById("hheat");
    if (!host) {
      host = el("div", "plog-wrap"); host.id = "hheat";
      var lg = document.getElementById("plog");
      if (lg && lg.parentNode === kamu) kamu.insertBefore(host, lg.nextSibling);
      else kamu.appendChild(host);
    }
    var TFH = [["ob", "BRICK"], ["2h", "HARVEST"], ["4h", "SWING"], ["whale", "WHALE"]];
    var per = {}, j;                       // per[jam][tf] = [n, w, sum%]
    if (typeof HH_FILTER === "undefined") window.HH_FILTER = null;   // jam terpilih (klik sel)
    for (j = 0; j < 24; j++) { per[j] = {}; TFH.forEach(function (t) { per[j][t[0]] = [0, 0, 0]; }); }
    ord().forEach(function (tf) {
      (DATA.live[tf] || {}).pantau || [];
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p) return;
          if (p.win !== 0 && p.win !== 1) return;   // terbuka: tidak dinilai
          var m = /(\d{2}):(\d{2})\s*$/.exec(String(r.ts || ""));   // ts = "YYYY-MM-DD HH:MM"
          if (!m) return;
          var h = parseInt(m[1], 10); if (!(h >= 0 && h < 24)) return;
          var pct = hasPct(p.pct) ? p.pct    /* 13 Okt: untung/rugi nett — tanpa balik tanda short */
                    : (p.win === 1 ? 1 : -1);        // fallback 1R
          var c = per[h][tf]; c[0]++; c[1] += p.win; c[2] += pct;
        });
      });
    });
    var TOT = 0; for (j = 0; j < 24; j++) TFH.forEach(function (t) { TOT += per[j][t[0]][0]; });
    /* 23 Sep — toggle pewarnaan: "wr" = winrate (default), "pct" = total % hasil.
       Tersimpan di localStorage supaya pilihan pembaca diingat antar kunjungan. */
    var HH_MODE = "wr";
    try { HH_MODE = localStorage.getItem("qkuk_hh_mode") === "pct" ? "pct" : "wr"; } catch (e) {}
    host.innerHTML = "";
    host.appendChild(el("div", "pn-h lv-sub", "jam terbaik \u2014 heat table (live resolve, 24 jam WIB)"));
    (function () {
      var tg = el("div", "hh-toggle");
      function btn(id, lab) {
        var b = el("button", "hh-tg" + (HH_MODE === id ? " on" : ""), lab);
        b.type = "button";
        b.addEventListener("click", function () {
          HH_MODE = id;
          try { localStorage.setItem("qkuk_hh_mode", id); } catch (e) {}
          tg.querySelectorAll(".hh-tg").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          hourHeat();                              // render ulang dgn metode baru
        });
        return b;
      }
      tg.appendChild(btn("wr", "winrate"));
      tg.appendChild(btn("pct", "total %"));
      /* 14 Okt (prioritas #5) — MODE "hari": 7 kolom Senin-Minggu, look jam × hari. */
      tg.appendChild(btn("hari", "× hari"));
      host.appendChild(tg);
    })();
    /* 14 Okt — mode 'hari': tabel 7 hari (Senin awal minggu, konvensi bursa)
       × 4 engine dari sumber pick yang sama — jawab cepat "Senin pagi selalu jelek?" */
    if (HH_MODE === "hari") {
      var PERH = {};     // per[hari_i][tf] = [n, w, sum%]
      var HMUL = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      var setb = {};     // set(hari_i, tf) → [n,w,pct]
      for (var di = 0; di < 7; di++) { setb[di] = {}; TFH.forEach(function (t) { setb[di][t[0]] = [0, 0, 0]; }); }
      ord().forEach(function (tf) {
        ["pantau", "sinyal"].forEach(function (jenis) {
          liveRows(tf, jenis).forEach(function (r) {
            var p = r.apick; if (!p) return;
            if (p.win !== 0 && p.win !== 1) return;
            var dd = dowParseTs(r.ts); if (!dd) return;
            var wi = (dd.getDay() + 6) % 7;                // Senin=0 … Minggu=6
            var pct = hasPct(p.pct) ? p.pct : (p.win === 1 ? 1 : -1);
            var cc = setb[wi][tf]; cc[0]++; cc[1] += p.win; cc[2] += pct;
          });
        });
      });
      var w2 = el("div", "plog-scroll"), t2 = el("table", "hh-t");
      var th2 = el("thead"), trh2 = el("tr");
      trh2.appendChild(el("th", "hh-jam", "hari"));
      TFH.map(function (t) { return t[1]; }).concat(["TOTAL"]).forEach(function (x) { trh2.appendChild(el("th", null, x)); });
      trh2.appendChild.apply(trh2.children || trh2.children, []);
      th2.appendChild(trh2); t2.appendChild(th2);
      var tb2 = el("tbody");
      var hTOT = 0;
      for (var dI = 0; dI < 7; dI++) {
        TFH.forEach(function (t) { hTOT += setb[dI][t[0]][0]; });
      }
      if (!hTOT) {
        host.appendChild(el("div", "plog-empty", "belum ada resolve — mode × hari terisi otomatis"));
        return;
      }
      for (var di2 = 0; di2 < 7; di2++) {
        var trr = el("tr");
        if (di2 === ((new Date().getDay() + 6) % 7)) trr.classList.add("hh-today");
        trr.appendChild(el("td", "hh-jam", HMUL[di2]));
        var tt2 = [0, 0, 0];
        TFH.forEach(function (t) {
          var c = setb[di2][t[0]]; tt2[0] += c[0]; tt2[1] += c[1]; tt2[2] += c[2];
        });
        var bestH2 = tt2[0] ? Math.max.apply(null, TFH.map(function (t) {
          var c = setb[di2][t[0]]; return c[0] ? c[1] / c[0] : -1;
        })) : 0;
        TFH.forEach(function (t) {
          var c = setb[di2][t[0]], td = el("td", "hh-c");
          if (c[0]) {
            var wr = c[1] / c[0] * 100;
            td.className = "hh-c " + kelas(wr, true);
            td.appendChild(el("span", "hh-wr " + (wr >= 50 ? "pos" : "neg"), wr.toFixed(0) + "%"));
            td.appendChild(el("span", "hh-sub", c[0] + " picks · " + sgn(c[2], 1) + "%"));
            if (c[0] && c[1] / c[0] === bestH2) td.appendChild(el("span", "hh-star", "\u2726"));
            td.title = t[1] + " @ " + HMUL[di2] + " \u2014 " + c[0] + " pick, menang " + c[1]+ " (" + wr.toFixed(1) + "), total " + sgn(c[2], 1) + "%";
          } else { td.classList.add("hh-none"); td.title = "belum ada resolve di hari ini"; }
          trr.appendChild(td);
        });
        var tdT2 = el("td", "hh-c");
        if (tt2[0]) {
          var wrT2 = tt2[1] / tt2[0] * 100;
          tdT2.className = "hh-c " + kelas(wrT2, true);
          tdT2.appendChild(el("span", "hh-wr " + (wrT2 >= 50 ? "pos" : "neg"), wrT2.toFixed(0) + "%"));
          tdT2.appendChild(el("span", "hh-sub", tt2[0] + " picks · " + sgn(tt2[2], 1) + "%"));
          tdT2.title = HMUL[di2] + " total \u2014 " + tt2[0] + " pick, menang " + tt2[1] + " (" + wrT2.toFixed(1) + "), total " + sgn(tt2[2], 1) + "%";
        } else { tdT2.classList.add("hh-none"); }
        trr.appendChild(tdT2);
        tb2.appendChild(trr);
      }
      t2.appendChild(tb2); w2.appendChild(t2);
      host.appendChild(w2);
      host.appendChild(el("div", "pn-h lv-sub", "hari terbaik — baris hari ini di-highlight"));
      return;                                            // selesai 7-hari
    }
    if (!TOT) {
      host.appendChild(el("div", "plog-empty", "belum ada resolve — isi win/loss lewat tombol ambil, heat table terisi otomatis"));
      return;
    }
    var wrap = el("div", "plog-scroll");
    var tab = el("table", "hh-t");
    var thead = el("thead"), trh = el("tr");
    trh.appendChild(el("th", "hh-jam", "jam"));
    TFH.map(function (t) { return t[1]; }).concat(["TOTAL"]).forEach(function (x) { trh.appendChild(el("th", null, x)); });
    thead.appendChild(trh); tab.appendChild(thead);
    var tby = el("tbody");
    /* warna sel: mode "wr" → intensitas dari jarak winrate ke 50%;
       mode "pct" → skala total % (netral di 0, pekat penuh di ±20%). */
    function kelas(wr, has) {
      if (!has) return "hh-none";
      var a = Math.min(.75, .1 + Math.abs(wr - 50) / 66).toFixed(2);
      return (wr >= 50 ? "hh-w" : "hh-l") + a;
    }
    function cell(tf, best, hour) {
      var c = per[j][tf], has = c[0] > 0;
      var td = el("td", "hh-c");
      if (has) {
        var wr = c[1] / c[0] * 100;
        if (HH_MODE === "pct") {
          var p = c[2], st = Math.ceil(Math.min(1, Math.abs(p) / 20) * 7);
          td.className = "hh-c " + (p >= 0 ? "hh-w" : "hh-l") + st;
        } else {
          td.className = "hh-c " + kelas(wr, has);
        }
        td.appendChild(el("span", "hh-wr " + (wr >= 50 ? "pos" : "neg"), wr.toFixed(0) + "%"));
        td.appendChild(el("span", "hh-sub", c[0] + " picks · " + sgn(c[2], 1) + "%"));
        if (best) td.appendChild(el("span", "hh-star", "\u2726"));
        td.title = tf.toUpperCase() + " @ " + ("0" + j).slice(-2) + ".00 WIB \u2014 " +
          c[0] + " pick, menang " + c[1] + " (" + wr.toFixed(1) + "%), total " + sgn(c[2], 1) + "%";
      } else {
        td.classList.add("hh-none");
        td.title = "belum ada resolve di jam ini";
      }
      /* 23 Sep — klik sel = saring riwayat koreksi ke pick jam ini
         (klik sel jam yang sama lagi = hapus filter) */
      td.style.cursor = "pointer";
      /* 23 Sep — jam disimpan di atribut sel & dibaca saat klik (this.dataset.j),
         imun terhadap closure var j yang sudah mencapai 24 saat klik terjadi */
      td.dataset.j = hour;
      td.addEventListener("click", function () {
        var h = parseInt(this.dataset.j, 10);
        HH_FILTER = (HH_FILTER === h) ? null : h;
        plogRender();
        var tb = host.querySelector("tbody");
        if (tb) {
          tb.querySelectorAll("tr").forEach(function (x) {
            x.classList.toggle("hh-sel", parseInt(x.getAttribute("data-j"), 10) === HH_FILTER);
          });
        }
      });
      return td;
    }
    for (j = 0; j < 24; j++) {
      var tr = el("tr");
      tr.dataset.j = j;
      if (HH_FILTER === j) tr.classList.add("hh-sel");   // filter bertahan saat re-render (toggle mode)
      if (j >= 9 && j <= 21) tr.classList.add("hh-active");   // 23 Sep: jam trading aktif 09–21
      tr.appendChild(el("td", "hh-jam", ("0" + j).slice(-2) + ".00"));
      var tt = [0, 0, 0];
      TFH.forEach(function (t) {
        var c = per[j][t[0]]; tt[0] += c[0]; tt[1] += c[1]; tt[2] += c[2];
      });
      var totHas = tt[0] > 0;
      var best3 = totHas ? Math.max.apply(null, TFH.map(function (t) {
        var c = per[j][t[0]]; return c[0] ? c[1] / c[0] : -1;
      })) : 0;
      TFH.forEach(function (t) {
        var c = per[j][t[0]];
        tr.appendChild(cell.call(null, t[0], c[0] > 0 && c[1] / c[0] === best3, j));
      });
      var tdT = el("td", "hh-c");
      tdT.dataset.j = j; tdT.style.cursor = "pointer";
      tdT.addEventListener("click", function () {
        var h = parseInt(this.dataset.j, 10);
        HH_FILTER = (HH_FILTER === h) ? null : h;
        plogRender();
        var tb = host.querySelector("tbody");
        if (tb) {
          tb.querySelectorAll("tr").forEach(function (x) {
            x.classList.toggle("hh-sel", parseInt(x.getAttribute("data-j"), 10) === HH_FILTER);
          });
        }
      });
      if (totHas) {
        var wrT = tt[1] / tt[0] * 100;
        if (HH_MODE === "pct") {
          var pT = tt[2];
          tdT.className = "hh-c " + (pT >= 0 ? "hh-w" : "hh-l") + Math.ceil(Math.min(1, Math.abs(pT) / 20) * 7);
        } else {
          tdT.className = "hh-c " + kelas(wrT, true);
        }
        tdT.appendChild(el("span", "hh-wr " + (wrT >= 50 ? "pos" : "neg"), wrT.toFixed(0) + "%"));
        tdT.appendChild(el("span", "hh-sub", tt[0] + " picks"));
      } else tdT.classList.add("hh-none");
      tr.appendChild(tdT);
      tby.appendChild(tr);
    }
    tab.appendChild(tby); wrap.appendChild(tab); host.appendChild(wrap);
    host.appendChild(el("div", "plog-empty hh-cap",
      (HH_MODE === "pct"
        ? "mode total %: hijau = hasil positif, merah = negatif · makin pekat makin besar · skala ±20% penuh"
        : "hijau = di atas 50%, merah = di bawah · makin pekat makin kuat") +
      " · baris teduh = jam trading aktif 09–21 · ✦ = jam terbaik baris itu · klik sel = riwayat koreksi jam itu"));
  }
  /* tabel riwayat semua aksi admin — ambil/koreksi/hapus/password, terbaru dulu,
     waktu ditampilkan WIB. Sumbernya log di cloud (PLOG), bukan backtest. */
  function plogRender() {
    /* 11 Okt — DIPINDAH ke bawah section Signals (permintaan user).
       Ada kolom BARU "admin" (Qkuk/Gerry) & baris bisa diklik → popup
       alasan detail (checklist teknik + inducement + gambar yang diambil). */
    var hostBox = document.getElementById("kor-bx");
    if (!hostBox) {
      hostBox = el("section", ""); hostBox.id = "kor-bx";
      var sh = el("div", "sec-h");
      var h2 = el("h2"); h2.innerHTML = "<i>&gt;</i> Riwayat koreksi admin";
      sh.appendChild(h2);
      sh.appendChild(el("span", "hint", "di bawah Signals — klik baris untuk detail alasan + gambar"));
      hostBox.appendChild(sh);
      var sig = document.getElementById("signals");
      if (sig && sig.parentNode) sig.parentNode.insertBefore(hostBox, sig.nextSibling);
      else (document.querySelector(".wrap") || document.body).appendChild(hostBox);
    }
    var host = document.getElementById("plog");
    if (!host) { host = el("div", "plog-wrap"); host.id = "plog"; hostBox.appendChild(host); }
    hostBox.style.display = "";   // selalu terlihat walau kosong
    host.innerHTML = "";
    var pHead = el("div", "pn-h lv-sub", "riwayat koreksi admin — ambil / koreksi / hapus, waktu WIB");
    /* 23 Sep — filter jam aktif dari klik sel heat table */
    var fJam = (typeof HH_FILTER !== "undefined") ? HH_FILTER : null;
    if (fJam !== null && fJam !== undefined) {
      var chip = el("button", "hh-fchip",
        "menampilkan jam " + ("0" + fJam).slice(-2) + ".00 WIB — klik untuk tampilkan semua");
      chip.type = "button";
      chip.title = "hapus filter jam";
      chip.addEventListener("click", function () {
        window.HH_FILTER = null;
        var tb = document.querySelector("#hheat tbody");
        if (tb) tb.querySelectorAll("tr.hh-sel").forEach(function (x) { x.classList.remove("hh-sel"); });
        plogRender();
      });
      pHead.appendChild(chip);
    }
    host.appendChild(pHead);
    /* 13 Okt — FILTER BULAN (permintaan user): riwayat & akurasi bertahan
       sebulan penuh + bisa ditinjau balik bulan lalu. PL_BULAN: null =
       bulan berjalan, "all" = semua bulan, atau "YYYY-MM". */
    var blnSekarang = wibDate(new Date().toISOString()).slice(0, 7);
    function wibBulan(t) {
      var st = String(t || "");
      var naive = /^(\d{4})-(\d{2})-(\d{2})[ T]/.exec(st);
      if (naive) return naive[1] + "-" + naive[2];   // string tanpa zona = sudah WIB
      var d = new Date(st);
      if (isNaN(d.getTime())) return "";
      var d2 = new Date(d.getTime() + 7 * 3600e3);
      return d2.getUTCFullYear() + "-" + ("0" + (d2.getUTCMonth() + 1)).slice(-2);
    }
    var PL_BULAN = (typeof window.PL_BULAN === "string") ? window.PL_BULAN : null;
    var bulanOps = [];
    PLOG.forEach(function (e2) { var b2 = wibBulan(e2.t); if (b2 && bulanOps.indexOf(b2) < 0) bulanOps.push(b2); });
    bulanOps.sort().reverse();
    if (bulanOps.indexOf(blnSekarang) < 0) bulanOps.unshift(blnSekarang);
    var selBln = el("select", "hh-fchip plog-bln");
    selBln.title = "pilih bulan riwayat, akurasi & unduhan CSV";
    [[blnSekarang, "bulan ini " + blnSekarang]].concat(bulanOps.filter(function (b) { return b !== blnSekarang; }).map(function (b) { return [b, b]; })).concat([["all", "semua bulan"]]).forEach(function (o) {
      var op = el("option"); op.value = o[0]; op.textContent = o[1]; selBln.appendChild(op);
    });
    selBln.value = PL_BULAN === "all" ? "all" : (PL_BULAN || blnSekarang);
    if (bulanOps.indexOf(selBln.value) < 0 && selBln.value !== "all") selBln.value = blnSekarang;
    selBln.addEventListener("change", function () { window.PL_BULAN = selBln.value; plogRender(); });
    pHead.appendChild(selBln);
    /* 13 Okt — RINGKASAN AKURASI PER ENGINE bulan terpilih: live resolve
       admin (bukan backtest), pemisahan per kanal engine × jenis. */
    (function () {
      var bln = PL_BULAN === "all" ? null : (/^\d{4}-\d{2}$/.test(PL_BULAN || "") ? PL_BULAN : blnSekarang);
      var tep = {}, urut = [];
      Object.keys(PICKS).forEach(function (k) {
        var p = PICKS[k];
        if (!p || (p.win !== 1 && p.win !== 0)) return;
        var kp = kpOf(k);
        if (bln && (kp.ts || "").slice(0, 7) !== bln) return;
        var con = hasPct(p.pct) ? p.pct : (p.win === 1 ? 1 : -1);   // 13 Okt: % = untung/rugi nett, tanpa balik tanda short
        var nm = ((kp.tf || "?") + "").toUpperCase() + " · " + (kp.jenis === "watch" ? "watchlist" : kp.jenis === "sig" ? "sinyal" : (kp.jenis || "?"));
        var e = tep[nm] || (tep[nm] = [0, 0, 0]);
        if (urut.indexOf(nm) < 0) urut.push(nm);
        e[0]++; if (p.win === 1) e[1]++; e[2] += con;
      });
      if (!urut.length) return;
      var wrapA = el("div", "plog-akk");
      wrapA.appendChild(el("div", "pn-h lv-sub", "akurasi live resolve per engine — " + (bln ? "bulan " + bln : "semua bulan") + " (bukan backtest)"));
      var tbA = el("table", "plog-t");
      var trh2 = el("tr");
      ["engine", "trade", "win · lose", "winrate", "net R"].forEach(function (x) { trh2.appendChild(el("th", null, x)); });
      var thA = el("thead"); thA.appendChild(trh2); tbA.appendChild(thA);
      var tbyA = el("tbody");
      urut.sort(function (a, b) { return tep[b][0] - tep[a][0]; }).forEach(function (nm) {
        var e = tep[nm], wr = e[1] / e[0] * 100, tr2 = el("tr");
        function td2(v, c) { tr2.appendChild(el("td", c || "", v)); }
        td2(nm); td2(String(e[0]), "mut"); td2(e[1] + " · " + (e[0] - e[1]), "mut");
        td2(wr.toFixed(1) + "%", wr >= 50 ? "pos" : "neg");
        td2(sgn(e[2], 2) + "R", e[2] > 0 ? "pos" : e[2] < 0 ? "neg" : "mut");
        tbyA.appendChild(tr2);
      });
      tbA.appendChild(tbyA); wrapA.appendChild(tbA); host.appendChild(wrapA);
    })();
    renderRekapBulan(host);
    /* entri riwayat difilter ke jam terpilih. Jam dibaca tahan-banting:
       "YYYY-MM-DD HH:MM" tanpa zona = sudah WIB; ISO berzona (hasil
       toISOString) digeser +7 jam ke WIB. Regex lama menuntut string
       berakhir HH:MM — selalu gagal pada t ISO dari plogAdd → filter kosong. */
    var daftar = PLOG;
    if (PL_BULAN !== "all") {
      var blnF = /^\d{4}-\d{2}$/.test(PL_BULAN || "") ? PL_BULAN : blnSekarang;
      daftar = daftar.filter(function (e) { return wibBulan(e.t) === blnF; });
    }
    if (fJam !== null && fJam !== undefined) {
      daftar = PLOG.filter(function (e) {
        var st = String(e.t || "");
        var naive = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(st);
        if (naive) return parseInt(naive[4], 10) === fJam;
        var d = new Date(st);
        if (isNaN(d.getTime())) return false;
        return new Date(d.getTime() + 7 * 3600e3).getUTCHours() === fJam;
      });
    }
    /* 13 Okt — TOMBOL UNDUH CSV: ikut filter bulan & jam aktif. Versi
       "CSV + foto" memasukkan gambar pick sebagai data-URI — rekapan
       analisis bisa dibuka lagi di Excel/analytic beserta bukti chart. */
    (function () {
      function csv(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
      function unduh(dgnFoto) {
        var baris = [["waktu_iso", "waktu_wib", "bulan_wib", "koin", "tf", "jenis", "admin", "aksi", "arah", "arah_engine", "hasil_pct", "win", "status_pick", "img_n", "pick_key", "catatan"]];
        if (dgnFoto) baris[0].push("foto_1", "foto_2", "foto_3", "foto_4");
        daftar.forEach(function (e) {
          var p = e.pickKey ? PICKS[e.pickKey] : null;
          var gmb = (p && Array.isArray(p.imgs)) ? p.imgs.filter(function (d2) { return typeof d2 === "string" && d2.indexOf("data:image") === 0; }) : [];
          var rek = [
            e.t || "", wibStr(e.t), wibBulan(e.t),
            (e.sym || "").replace(/USDT$/, ""), (e.tf || "").toUpperCase(),
            e.jenis || "", e.who || "Qkuk", e.act || "",
            e.side || "", e.dir0 || "",
            hasPct(e.pct) ? String(e.pct) : "",
            e.win === 1 ? "win" : e.win === 0 ? "loss" : (e.act === "hapus" || e.act === "password") ? "" : "open",
            p ? (p.status || "menunggu") : "",
            e.imgN != null ? String(e.imgN) : "",
            e.pickKey || "", e.note || ""
          ];
          if (dgnFoto) { for (var i2 = 0; i2 < 4; i2++) rek.push(gmb[i2] || ""); }
          baris.push(rek);
        });
        var isi = baris.map(function (r) { return r.map(csv).join(","); }).join("\n");
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff" + isi], { type: "text/csv;charset=utf-8" }));
        a.download = (dgnFoto ? "plog_qkuk_foto_" : "plog_qkuk_") + wibDate(new Date().toISOString()).replace(/-/g, "") + ".csv";
        document.body.appendChild(a); a.click(); a.remove();
      }
      var bEx = el("button", "hh-fchip", "\u2b07 unduh CSV"); bEx.type = "button";
      bEx.title = "unduh riwayat — mengikuti filter bulan & jam aktif";
      bEx.addEventListener("click", function () { unduh(false); });
      var bEx2 = el("button", "hh-fchip", "\u2b07 CSV + foto"); bEx2.type = "button";
      bEx2.title = "unduh riwayat + gambar pick sebagai data-URI (file besar, kolom foto_1..4)";
      bEx2.addEventListener("click", function () { unduh(true); });
      pHead.appendChild(bEx); pHead.appendChild(bEx2);
    })();
    if (!daftar.length) {
      host.appendChild(el("div", "plog-empty",
        !PLOG.length
          ? "belum ada koreksi — setiap ambil, koreksi, atau hapus pick tercatat di sini dengan waktu WIB-nya"
          : "tidak ada koreksi di jam " + ("0" + fJam).slice(-2) + ".00 WIB"));
      return;
    }
    var sc = el("div", "plog-scroll"), tb = el("table", "plog-t");
    var trh = el("tr");
    ["waktu", "koin", "engine", "jenis", "admin", "aksi", "arah", "hasil", "status", "catatan"]
      .forEach(function (x) { trh.appendChild(el("th", null, x)); });
    var thead = el("thead"); thead.appendChild(trh); tb.appendChild(thead);
    var tbody = el("tbody");
    daftar.slice(0, 50).forEach(function (e) {
      var tr = el("tr");
      var klik = e && (e.pickKey || null);   // rincian popup dgn gambar — hanya bila kunci pick ketahuan
      function td(v, cls) { tr.appendChild(el("td", cls || "", v)); }
      td(wibStr(e.t), "mut");
      td((e.sym || "").replace(/USDT$/, "") || "—");
      td((e.tf || "").toUpperCase() || "—", "mut");
      td(e.jenis === "sig" ? "sinyal" : e.jenis === "watch" ? "watchlist" : (e.jenis || "—"), "mut");
      /* kolom admin — Qkuk/Gerry dgn warna masing-masing; entri lama tanpa
         penanda ditampilkan netral (Qkuk) supaya riwayat tak terlihat kosong */
      td(e.who || "Qkuk", e.who === "Gerry" ? "who-g" : "who-q");
      td(e.act === "hapus" ? "hapus" : e.act === "koreksi" ? "koreksi" : e.act === "password" ? "password" : "ambil",
        e.act === "hapus" ? "neg" : e.act === "koreksi" ? "warn" : "mut");
      td(e.act === "hapus" ? "—"
        : e.side ? e.side + (e.dir0 && e.side !== e.dir0 ? " ← " + e.dir0 : "")
        : (e.dir0 || "—"));
      td(hasPct(e.pct) ? sgn(e.pct, 1) + "%" : "—",
        !hasPct(e.pct) ? "mut" : e.pct > 0 ? "pos" : e.pct < 0 ? "neg" : "mut");
      td(e.act === "hapus" || e.act === "password" ? "—"
        : e.win === 1 ? "WIN" : e.win === 0 ? "LOSS" : "open",
        e.win === 1 ? "pos" : e.win === 0 ? "neg" : "mut");
      td(e.note || "—", "mut");
      if (klik) {
        tr.style.cursor = "pointer";
        tr.title = "klik — lihat alasan lengkap: teknik, inducement & gambar chart"
          + (e.imgN > 0 ? " (" + e.imgN + " gambar)" : "");
        tr.addEventListener("click", function () { plogDetail(e); });
      }
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); sc.appendChild(tb); host.appendChild(sc);
    if (!PLOG.some(function (x) { return x.pickKey; }))
      host.appendChild(el("div", "plog-empty",
        "pick baru menyimpan kunci — barisnya diklik untuk detail; pick lama hanya catatan singkat."));
  }
  /* popup detail dari CLICK riwayat: pakai pick tersimpan (PICKS) supaya
     gambar & alasan selalu segar dari data paling terkini, bukan snapshot
     log yang basi. */
  function plogDetail(e) {
    if (!e || !e.pickKey) return;
    var kp = kpOf(e.pickKey), p = PICKS[e.pickKey];
    var r = { ts: kp.ts || "", sym: kp.sym || "", dir: (p && (p.side || p.dir0)) || e.side || null };
    try { openAlasan(kp.tf, kp.jenis, r, p || {}); }
    catch (err) { admFallback(err); }
  }
  /* 13 Okt — REKAP ANTAR-BULAN (permintaan user): grafik batang akumulasi
     SEMUA bulan dari live resolve admin — tinggi = net R bulan
     (hijau positif / merah negatif, skala bulan terbesar), label WR &
     jumlah trade. TIDAK terpengaruh filter bulan di atasnya: ini gambaran
     akumulasi penuh bulan demi bulan. Formula = untung/rugi nett
     (positif = untung), sama dgn klasemen & ringkasan di atasnya. */
  function renderRekapBulan(host) {
    var bulan = {};
    Object.keys(PICKS).forEach(function (k) {
      var p = PICKS[k];
      if (!p || (p.win !== 1 && p.win !== 0)) return;
      var b = (k.split("|")[2] || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(b)) return;
      var e = bulan[b] || (bulan[b] = [0, 0, 0]);
      var v = hasPct(p.pct) ? p.pct : (p.win === 1 ? 1 : -1);
      e[0]++; if (p.win === 1) e[1]++; e[2] += v;
    });
    var keys = Object.keys(bulan).sort();
    if (!keys.length) return;
    var maxV = 1;
    keys.forEach(function (b) { maxV = Math.max(maxV, Math.abs(bulan[b][2])); });
    var wrap = el("div", "rk-wrap");
    wrap.appendChild(el("div", "pn-h lv-sub",
      "rekap antar-bulan — akumulasi live resolve semua bulan (bukan backtest) · tinggi = net R, label = WR · trade"));
    var grid = el("div", "rk-bar");
    keys.forEach(function (b) {
      var e = bulan[b], v = e[2], wr = e[0] ? e[1] / e[0] * 100 : 0;
      var col = el("div", "rk-col " + (v >= 0 ? "pos" : "neg"));
      col.appendChild(el("span", "rk-v", sgn(v, 1) + "R"));
      var track = el("div", "rk-track");
      var bat = el("div", "rk-bat");
      bat.style.height = Math.max(3, Math.round(Math.abs(v) / maxV * 100)) + "%";
      track.appendChild(bat); col.appendChild(track);
      col.appendChild(el("span", "rk-wr", wr.toFixed(0) + "% · " + e[0]));
      col.appendChild(el("span", "rk-b", b));
      grid.appendChild(col);
    });
    wrap.appendChild(grid);
    host.appendChild(wrap);
  }
  function adminInit() {
    try { localStorage.removeItem("qkuk_admin_token"); localStorage.removeItem("qkuk_admin_pass"); } catch (e) {} // bersihkan sisa mode lama
    var bar = document.querySelector(".bar-in");
    if (bar && !document.getElementById("adm-gear")) {
      var g = el("button", "adm-gear", "\u2699"); g.id = "adm-gear"; g.type = "button";
      g.title = "Admin \u2014 live picks (login & koreksi)";
      g.addEventListener("click", openAdmin);
      bar.appendChild(g);
    }
    /* tombol keluar di header — hapus sesi & kembali ke gerbang login */
    if (bar && !document.getElementById("gate-out")) {
      var lo = el("button", "adm-gear gate-out", "\u23FB"); lo.id = "gate-out"; lo.type = "button";
      lo.title = "keluar — ganti akun";
      lo.addEventListener("click", gateLogout);
      bar.appendChild(lo);
    }
    loadPicks();
  }
  function gateLogout() {
    try {
      SS.del("qkuk_admin_ok"); SS.del("qkuk_user_ok");
    } catch (e) {}
    location.reload();                       // gerbang menyambut lagi dengan animasinya
  }

  var mbtn = $("#mute");
  if (mbtn) mbtn.addEventListener("click", function () {
    MUTE = !MUTE;
    try { localStorage.setItem("qkuk_mute", MUTE ? "1" : "0"); } catch (e) {}
    sndIcon();
    if (!MUTE) ding();                          // umpan balik: bunyi contoh
  });
  sndIcon();
  function toast(kind, sym, tf, ts, dir) {
    var host = $("#toasts"); if (!host) return;
    /* 14 Okt — toast petunjuk iOS: cara nyalakan notifikasi di iPhone. */
    if (kind === "ios-hint") {
      var tI = el("div", "toast t-wat t-hint");
      var bI = el("div", "tbody");
      bI.appendChild(el("span", "tkind", "📱 NOTIFIKASI DI iPHONE"));
      bI.appendChild(el("span", "tsub", "Safari biasa tidak bisa — buka menu Share → 'Add to Home Screen', lalu buka lewat ikon QKUK. Notifikasi lalu tampil di lock screen (iOS 16.4+)."));
      var xI = el("button", "tx"); xI.type = "button"; xI.textContent = "×";
      tI.appendChild(bI); tI.appendChild(xI);
      host.appendChild(tI);
      requestAnimationFrame(function () { requestAnimationFrame(function () { tI.classList.add("in"); }); });
      xI.addEventListener("click", function () { if (tI.parentNode) tI.parentNode.removeChild(tI); });
      setTimeout(function () { if (tI.parentNode) { tI.classList.remove("in"); setTimeout(function () { if (tI.parentNode) tI.parentNode.removeChild(tI); }, 320); } }, 14000);
      return;
    }
    var t = el("div", "toast " + (kind === "sinyal" ? "t-sig" : "t-wat"));
    var b = el("div", "tbody");
    b.appendChild(el("span", "tkind", kind === "sinyal" ? "SINYAL BARU" : "WATCHLIST BARU"));
    var row = el("div", "trow");
    row.appendChild(el("b", "", sym));
    var dTxt = dir === "long" ? "long" : dir === "short" ? "short" : "—";
    row.appendChild(el("span", "tdir " + dTxt, dTxt));
    row.appendChild(el("span", "ttf", (tf || "").toUpperCase()));
    b.appendChild(row);
    b.appendChild(el("span", "tsub", ts || ""));
    var x = el("button", "tx"); x.type = "button";
    x.setAttribute("aria-label", "Tutup notifikasi"); x.textContent = "×";
    t.appendChild(b); t.appendChild(x);
    host.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { t.classList.add("in"); });
    });
    var gone = false;
    function close() {
      if (gone) return; gone = true;
      t.classList.remove("in"); t.classList.add("out");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }
    t.addEventListener("click", function (ev) {  // klik badan = TradingView
      if (ev.target === x) return;
      try { window.open(tvUrl(sym, tf), "_blank", "noopener"); } catch (e) {}
      close();
    });
    x.addEventListener("click", function (ev) {
      ev.stopPropagation();                     // × = tutup saja, TIDAK buka TradingView
      close();
    });
  }
  function scanNotif() {
    if (!DATA || !DATA.live) return;
    var items = [];
    ord().forEach(function (tf) {
      var L = DATA.live[tf] || {};    /* ⚠️ 5 Okt (keputusan user): yang berbunyi HANYA SINYAL. Watchlist
       sengaja dibiarkan diam — ia jauh lebih sering (diuji: 5 baris baru
       per 21 mnt di kanal 30m) dan berbunyi nonstop kalau ikut. Watchlist
       tetap masuk TABEL seperti biasa — yang diam hanya suaranya.

     6 Okt sore: DART 15m sempat dibalik (watchlist bunyi, sinyal diam) —
     6 Okt malam DART dimatikan total, digantikan kanal "ob" —
     sejak 8 Okt kembali bernama 🧱 BRICK (rebrand ENGINE OB dibatalkan).
     Aturan 5 Okt berlaku lagi ke SEMUA kanal: sinyal-saja. */
      (L.sinyal || []).forEach(function (r) {
        if (r && r.sym) items.push({ k: "sinyal", key: r.ts + "|" + r.sym + "|" + tf, tf: tf, sym: r.sym, dir: r.dir, ts: r.ts });
      });
    });
    if (NOTE.seen == null) {                    // muatan pertama = baseline, tanpa banjir toast
      NOTE.seen = {}; items.forEach(function (it) { NOTE.seen[it.key] = 1; });
      return;
    }
    var fresh = items.filter(function (it) { return !NOTE.seen[it.key]; });
    items.forEach(function (it) { NOTE.seen[it.key] = 1; });
    fresh.forEach(function (it) {
      toast(it.k, it.sym, it.tf, it.ts, it.dir);
      deskNotify(it.k, it.sym, it.tf, it.ts, it.dir);   // native OS saat tab tidak aktif
      NOTE.n++;
    });
    if (fresh.length) { ding(); sndIcon(); }
  }
  /* ── 20 Sep: tata letak dipindah ke sini (runtime) ──
     Keluhan "masih sama kaya sebelumnya" terbukti dari cache HTML: GitHub Pages
     menyajikan index.html dengan cache 10 menit, dan beberapa jalur jaringan
     menggantungkannya lebih lama lagi — app.js selalu segar (ada ?v=), index.html
     tidak. Solusinya: urutan section TIDAK lagi dipercaya ke HTML. app.js yang
     memindahkan section ke urutan final saat halaman dibuka, jadi walau HTML
     cache-nya lama, tampilan tetap benar:
     1 gauge arah  2 bubbles  3 kotak analisis  4 watchlist  5 signals
     6 picked by you  7 cumulative R + winrate by hour
     8 winrate watchlist accuracy  9 kartu ringkasan kanal
     ⚠️ 30 Sep — #analisa WAJIB ada di daftar ini. Kotak analisis ditambahkan
     di HTML di antara bubbles dan watchlist, tapi karena ia tidak tercantum
     di sini, appendChild section lain melemparnya ke PALING ATAS wrap —
     persis keluhan "kotak analisis kembali ke atas, harusnya di bawah
     bubbles". #footer ikut dicantumkan supaya tidak nyangkut di tengah
     halaman saat section di atasnya dipindah.
     ⚠️ 5 Okt — kartu baru #whalestrip (riset 🐳 WHALE) juga HARUS ada di
     daftar ini. Section yang tidak tercantum tidak cuma tertinggal di tempat
     lama: begitu section lain di bawahnya dipindah dengan appendChild, ia
     tertinggal di ATAS. Dua strip riset ada di paling atas wrap, jadi
     dicantumkan paling depan agar posisinya pasti. */
  (function reOrder() {
    /* 11 Okt — #kor-bx (riwayat koreksi) dipindah ke bawah #signals */
    var ids  = ["btstrip", "dir", "bubbles", "analisa", "watch", "signals", "kor-bx", "kamu", "charts", "akurasi", "strip", "footer"];
    var host = document.querySelector(".wrap") || document.body;
    ids.forEach(function (id) {
      var s = document.getElementById(id);
      if (s) host.appendChild(s);          // appendChild = pindah, bukan duplikat
    });
    var ak = document.querySelector("#akurasi h2");
    if (ak) ak.innerHTML = "<i>&gt;</i> Winrate watchlist accuracy";
  })();

  /* ── GERBANG LOGIN PRIVAT (v25) ────────────────────────────────────────
     Seluruh terminal berada di balik gerbang: admin (kredensial lama) dan
     user biasa. Password diverifikasi SHA-256, sesi hidup sampai tab ditutup.
     Login sukses → animasi penautan blok blockchain → dashboard. */
  var USER_AUTH = { user: "user", hash: "7d1e87fd6803a1d1ae6069ecd635c81960d5af1629a1a0fc85912685f8f25196" };
  function gateInit() {
    var gate = document.getElementById("gate");
    if (!gate) return;
    var ok = SS.get("qkuk_admin_ok") === "1" || SS.get("qkuk_user_ok") === "1";
    var gate = document.getElementById("gate");
    if (!gate) return;
    var ok = SS.get("qkuk_admin_ok") === "1" || SS.get("qkuk_user_ok") === "1";
    if (ok) {                                   // pengunjung balik — langsung masuk, tanpa gerbang
      document.documentElement.classList.add("authed");
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      return;
    }
    var uIn = gate.querySelector("#gate-user"), pIn = gate.querySelector("#gate-pass"),
        btn = gate.querySelector("#gate-btn"), err = gate.querySelector("#gate-err"),
        sub = gate.querySelector(".gate-sub"), chain = gate.querySelector("#gate-chain"),
        hashEl = gate.querySelector("#gate-hash");
    /* partikel heksagon melayang — latar hidup bertema node blockchain */
    (function () {
      var host = gate.querySelector(".gparts");
      if (!host) return;
      for (var i = 0; i < 16; i++) {
        var p = el("span", "gp" + (Math.random() < .38 ? " mint" : ""));
        var sz = 6 + Math.random() * 12;
        p.style.width = p.style.height = sz.toFixed(1) + "px";
        p.style.left = (Math.random() * 96 + 2).toFixed(2) + "%";
        p.style.opacity = (0.05 + Math.random() * 0.12).toFixed(2);
        p.style.animationDuration = (14 + Math.random() * 16).toFixed(1) + "s";
        p.style.animationDelay = (-Math.random() * 30).toFixed(1) + "s";
        p.style.setProperty("--sway", (Math.random() * 90 - 45).toFixed(0) + "px");
        host.appendChild(p);
      }
    })();
    /* toggle lihat / sembunyikan password */
    var eye = gate.querySelector("#gate-eye");
    if (eye) {
      var EYE_ON = eye.innerHTML;
      var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      eye.addEventListener("click", function () {
        var show = pIn.type === "password";
        pIn.type = show ? "text" : "password";
        eye.classList.toggle("on", show);
        eye.innerHTML = show ? EYE_OFF : EYE_ON;
        eye.title = show ? "sembunyikan password" : "tampilkan password";
        eye.setAttribute("aria-label", eye.title);
      });
    }
    function finish() {
      err.textContent = "";
      gate.querySelector(".gate-form").style.display = "none";
      sub.textContent = "menautkan blok…";
      chain.classList.add("run");
      var bs = 1;
      var tick = setInterval(function () {          // efek hashing blok
        var hex = "", cs = "0123456789abcdef";
        for (var i = 0; i < 14; i++) hex += cs[Math.floor(Math.random() * 16)];
        hashEl.textContent = "0x" + hex + "  ▸ block #" + (bs++) + " … verifying";
      }, 85);
      setTimeout(function () {
        clearInterval(tick);
        hashEl.textContent = "0x… chain synced ✓";
        gate.classList.add("bye");
        document.documentElement.classList.add("authed");   // memicu reveal dashboard
        if (isLogged()) applyPicks();               // tombol admin muncul tanpa reload
        setTimeout(function () { if (gate.parentNode) gate.parentNode.removeChild(gate); }, 750);
      }, 2450);
    }
    function tryGate() {
      var u = (uIn.value || "").trim(), p = pIn.value || "";
      if (!u || !p) { err.textContent = "isi username dan password"; return; }
      sha256hex(u + ":" + p).then(function (h) {
        /* 11 Okt — dua admin: Qkuk (admin) & Gerry (Admin2). Identitas
           dikunci saat login supaya pick, bubbles & live score tahu
           TANGAN SIAPA. */
        var hit = null;
        Object.keys(ADMINS).forEach(function (k) {
          if (!hit && k.toLowerCase() === u.toLowerCase() && h === $hashOke(k)) hit = ADMINS[k].who;
        });
        if (hit) {                                       // admin
          SS.set("qkuk_admin_ok", "1");
          SS.set("qkuk_admin_who", hit);
          finish();
        } else if (u === USER_AUTH.user && h === USER_AUTH.hash) {   // user biasa
          SS.set("qkuk_user_ok", "1");
          finish();
        } else {
          err.textContent = "username / password salah";
          gate.classList.remove("shake"); void gate.offsetWidth; gate.classList.add("shake");
        }
      }).catch(function () { err.textContent = "gagal memverifikasi login"; });
    }
    btn.addEventListener("click", tryGate);
    pIn.addEventListener("keydown", function (ev) { if (ev.key === "Enter") tryGate(); });
    uIn.addEventListener("keydown", function (ev) { if (ev.key === "Enter") pIn.focus(); });
  }
  gateInit();

  /* ── MODE TAMPILAN HP (15 Okt — permintaan user) ─────────────────────
     Saat dibuka di HP, default tampilan kini "dinamis" (compact, kolom
     sempit, tabel sampai benar-benar muat), tetapi ada pilihan chip
     "dinamis / desktop" supaya orang yang suka tampilan penuh tetap bisa
     pakai mode desktop. Pilihan disimpan di localStorage. Di desktop asli
     chip tak muncul — selalu desktop.   ?tampilan=dinamis|desktop memaksa. */
  (function tampilanInit() {
    function isHP() {
      return window.matchMedia("(max-width:820px)").matches &&
             (window.matchMedia("(pointer:coarse)").matches ||
              /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    }
    function simpan(v) { try { localStorage.setItem("qkuk_tampilan", v); } catch (e) {} }
    function baca() {
      try {
        var q = (location.search || "").match(/tampilan=(dinamis|desktop)/);
        if (q) return q[1];
        return localStorage.getItem("qkuk_tampilan") || "dinamis";
      } catch (e) { return "dinamis"; }
    }
    function pasang(kel) {
      document.body.classList.toggle("mode-dinamis", kel === "dinamis");
      document.body.classList.toggle("mode-desktop", kel === "desktop");
    }
    if (!isHP()) return;                       // desktop asli: selalu desktop
    var kel = baca();
    pasang(kel);
    var chip = el("button", "tchip");
    chip.type = "button";
    chip.setAttribute("aria-label", "ganti mode tampilan");
    function label() {
      var sekarang = document.body.classList.contains("mode-dinamis");
      chip.textContent = sekarang ? "📱 dinamis · buka desktop" : "🖥 desktop · buka dinamis";
    }
    chip.addEventListener("click", function () {
      var ke = document.body.classList.contains("mode-dinamis") ? "desktop" : "dinamis";
      pasang(ke); simpan(ke); label();
    });
    label();
    document.body.appendChild(chip);
  })();

  adminInit();
  pwaInit();   // 13 Okt — daftarkan service worker + tombol 🔔 izin notifikasi PWA
  bbCacheLoad();   // %24j terakhir langsung hidup sebelum fetch pertama selesai
  load(true);
  setInterval(clock, 1000); clock();
  setInterval(function () { load(false); loadPicks(); }, 60000);
  setInterval(function () {                  // reload penuh per jam: HTML/CSS/JS ikut segar, bukan cuma data.json
    location.reload();
  }, 3600000);
  setInterval(function () {                  // segarkan %24j tiap 90 detik selama tab terbuka
    if (DATA && !document.hidden) { bb24Ts = 0; bbLoad24(function () {}); }
  }, 90000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) load(false); });
})();
