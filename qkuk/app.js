if (window.top !== window.self) { try { window.top.location = window.self.location; }
  catch (e) { document.documentElement.style.display = "none"; } }

(function () {
  "use strict";
  var DATA = null, ORDER = ["1h", "2h", "4h"], LEFT = 60;
  /* ⚠️ GitHub Pages menyajikan index.html dgn cache-control 600 dtk, dan tab
     yang dibiarkan terbuka TIDAK PERNAH mengambil ulang HTML-nya sama sekali —
     ia hanya menarik data.json. Akibatnya pembaruan tampilan tak terlihat
     sampai pembaca menekan hard-reload, dan itu tidak masuk akal untuk halaman
     yang memang dimaksudkan ditinggal terbuka. Versi build ditanam saat terbit;
     kalau data.json membawa versi lain, halaman memuat ulang dirinya sendiri. */
  var BUILD = "qkuk-note-20260923a";   /* 23 Sep v27: heat table + toggle winrate/total% + baris aktif 09-21 + klik sel = filter riwayat */
  /* 23 Sep — warna kanal KONTRAS (permintaan user: 1h & 2h mirip):
     Kilat 1h = biru cyan · Scalp 2h = hijau · Swing 4h = emas terang */
  var COLOR = { "1h": "#4DC9F6", "2h": "#6EE7B7", "4h": "#F2C94C" };
  var TVI = { "1h": "60", "2h": "120", "4h": "240" };

  function $(s) { return document.querySelector(s); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function num(v) { var f = parseFloat(v); return isFinite(f) ? f : null; }
  function sgn(v, d) { var f = num(v); return f === null ? "—" : (f > 0 ? "+" : "") + f.toFixed(d == null ? 2 : d); }
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
  var GC = { long: "#6EE7B7", short: "#E8877C", netral: "#EEF4F1", deg: "#EEB44C" };
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
      var w = el("div", "dnote");
      w.textContent = "The engine published a data file without the altcoin-direction "
        + "block. Usually this means the running process still holds an older "
        + "dashboard_data module in memory and needs a restart.";
      $("#dmeta").appendChild(w);
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
    var note = el("div", "dnote");
    note.textContent = A.terukur === null || A.terukur === undefined
      ? "Direction comes from a theory table; the 365-day measurement has not confirmed it."
      : "365-day test: this regime averaged " + sgn(A.terukur, 2) + "% over 8 hours against a "
        + sgn(A.acuan, 2) + "% baseline \u2014 not significant. Context, not a verdict; "
        + "the engine does not trade on it.";
    m.appendChild(note);
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
  function gaugeLivePaint() {
    if (!DATA || !DATA.altdir) return;
    var A = DATA.altdir;
    function paint(V) {
      GLIVE = V;
      /* 23 Sep v32 — FRESHNESS GATE: input basi (BTC >15 mnt / gelombang grup
         >8 jam) → jarum netral + label DEGRADED, bukan arah palsu. Skor tetap
         dihitung engine (bot & logika tak berubah) — hanya tampilan yang jujur. */
      var DEG = !!V.degraded;
      var col = DEG ? GC.deg : (GC[V.bias] || GC.netral);
      var lab = DEG ? "DEGRADED"
        : (V.bias === "long" ? "LONG" : V.bias === "short" ? "SHORT" : "NETRAL");
      var v = DEG ? 0 : Math.max(-1, Math.min(1, V.score / 9)) * .85;
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
      var bA = $("#gbias"); bA.textContent = lab + " · LIVE"; bA.style.color = col;
      if (DEG && V.degrade_reason) bA.title = "input basi: " + V.degrade_reason;
      /* 21 Sep — gname = keterangan sumber arah, BUKAN rezim backtest.
         Dulu menampilkan nama rezim tabel stale (mis. "SANGAT BULLISH
         (altseason)" dari log berhari-hari lalu) persis di bawah label LIVE —
         terbaca seperti gauge berkata dua hal bertentangan sekaligus. */
      $("#gname").textContent = "arah live · 2×mayoritas grup + BTC 1h";
      var m = $("#dmeta"); m.innerHTML = "";
      function r(l, v2, c) {
        var x = el("div", "dr");
        x.appendChild(el("span", "l", l));
        x.appendChild(el("span", "d"));
        x.appendChild(el("span", "v " + (c || ""), v2));
        m.appendChild(x);
      }
      var ar = function (d) { return d > 0 ? "↑" : d < 0 ? "↓" : "→"; };
      if (DEG) {
        r("status data", "DEGRADED — " + (V.degrade_reason || "input basi"), "warn");
        r("skor terakhir", sgn(V.score, 0) + " (dari data basi — tidak dipakai)", "mut");
        var noteD = el("div", "dnote");
        noteD.textContent = "Gauge tidak menampilkan arah karena inputnya kedaluwarsa — "
          + "biar tidak salah baca arah dari data lama. Arah kembali otomatis begitu "
          + "BTC/gelombang grup segar lagi.";
        m.appendChild(noteD);
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
      if (V.pubTs) r("dihitung engine", V.pubTs + " WIB", "mut");
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
        "2×mayoritas " + sgn(V.maj, 0) + " + BTC " + ar(V.dirBtc)
        + " → skor " + sgn(V.score, 0),
        V.bias === "long" ? "pos" : V.bias === "short" ? "neg" : "mut");
      /* 21 Sep — momentum BTC 24 jam eksplisit: penyeimbang penalti dominan.
         Dulu tidak dirinci, jadi BTC naik kencang + dominan bergerak terlihat
         seperti "SHORT tanpa alasan" di panel. */
      var btcMom = (V.btc24h != null) ? V.btc24h
        : (isFinite(bp) ? bp : (A.btc_chg != null ? A.btc_chg : null));
      if (btcMom != null && isFinite(btcMom))
        r("momentum BTC", sgn(btcMom, 2) + "% (24 jam)", btcMom > 0 ? "pos" : btcMom < 0 ? "neg" : "mut");
      var note = el("div", "dnote");
      note.textContent = "Arah LIVE = 2× mayoritas watchlist+sinyal reclaim pada gelombang terakhir "
        + "yang terkirim ke grup (1h/2h/4h) + BTC 1h live — tanpa dominan. Gelombang sinyal "
        + "serentak satu arah langsung membalikkan gauge. Dihitung di SERVER bot (sama untuk "
        + "semua device; candle forming dibuang). Device yang bisa menjangkau Binance/CoinGecko "
        + "menyegarkan BTC real-time di atasnya.";
      m.appendChild(note);
    }
    /* 20 Sep v28: nilai arah dihitung JUGA di engine (dashboard_data →
       altdir_live, logika rcl identik) dan diterbitkan di data.json.
       Semua device sekarang mulai dari nilai yang SAMA; device yang bisa
       mencapai Binance/CoinGecko menyegarkan real-time di atasnya. */
    var pub = DATA.altdir_live;
    if (pub && (pub.src && (pub.src.btc || pub.src.maj || pub.src.dom))) {
      paint({ dirBtc: pub.dirBtc || 0, dirBtcd: pub.dirBtcd || 0,
              dirUsdtd: pub.dirUsdtd || 0, score: pub.score || 0,
              bias: pub.bias || "netral", dBtcd: pub.dBtcd || 0, dUsdtd: pub.dUsdtd || 0,
              maj: pub.maj || 0, nLong: pub.nLong || 0, nShort: pub.nShort || 0,
              nMaj: pub.nMaj || 0,
              pubTs: pub.ts, btc24h: pub.btc24h,
              degraded: !!pub.degraded, degrade_reason: pub.degrade_reason || "",
              ageBtc: pub.age_btc_s, ageMaj: pub.age_maj_s });
    }
    btc1h(function (rows) {
      /* 23 Sep v31 — penyegaran real-time: mayoritas diambil dari engine
         (browser tak punya CSV grup), dirBtc dihitung ulang dari klines live;
         dominan tak dihitung sama sekali. Kalau engine belum menerbitkan apa
         pun, layar tetap memakai hasil engine terakhir — bukan pura-pura. */
      var pub2 = DATA.altdir_live || {};
      var V = { dirBtc: 0, score: 0, bias: "netral",
                maj: pub2.maj || 0, nLong: pub2.nLong || 0, nShort: pub2.nShort || 0, nMaj: pub2.nMaj || 0,
                /* v32: status degraded engine selalu dihormati — refresh browser
                   tak boleh menyembunyikan gate (BTC segar di browser ≠ gelombang
                   grup segar di engine) */
                degraded: !!pub2.degraded, degrade_reason: pub2.degrade_reason || "" };
      if (rows && rows.length > 30) {
        V.dirBtc = rclSweep(rows.map(function (r) { return r.h; }),
                             rows.map(function (r) { return r.l; }),
                             rows.map(function (r) { return r.c; }), .01)
          || rclSlope(rows.map(function (r) { return r.c; }), 24, .3);
        if (rows.length > 25) V.btc24h = Math.round((rows[rows.length-1].c / rows[rows.length-25].c - 1) * 10000) / 100;
      }
      V.score = 2 * V.maj + V.dirBtc;                      // v31: 2×mayoritas + BTC 1h
      V.bias = V.score > 0 ? "long" : V.score < 0 ? "short" : "netral";
      if (rows && rows.length > 30 && !V.degraded) paint(V);   // v32: degraded tetap tampil dari engine
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
  /* 23 Sep v31 — seri dominan (BTC.D/USDT.D) DIHAPUS: gauge = BTC + mayoritas
     reclaim, titik. Tidak ada lagi fetch CoinGecko dominan di browser. */

  function strip() {
    var host = $("#strip"); host.innerHTML = "";
    ord().forEach(function (tf) {
      var L = DATA.live[tf], E = (DATA.engine || {})[tf], P = L.pantau_akurasi;
      var c = el("div", "ch");
      var h = el("div", "ch-h");
      h.appendChild(el("span", "ch-n", L.nama));
      h.appendChild(el("span", "ch-tf", tf.toUpperCase()));
      h.appendChild(el("span", "tag " + (L.uji ? "test" : "live"), L.uji ? "shadow" : "live"));
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

      if (E) {
        c.appendChild(blok("backtest reference", [
          ["entries", E.n.toLocaleString("en"), ""],
          ["win rate", E.wr.toFixed(1) + "%", ""],
          ["EV / trade", sgn(E.ev, 3) + "R", E.ev > 0 ? "pos" : "neg"],
          ["per month", String(E.per_bln), ""]
        ]));
      }
      host.appendChild(c);
    });
  }

  /* ── tables ── */
  function tabs(host, active, pick) {
    host.innerHTML = "";
    ord().forEach(function (tf) {
      var b = el("button", "tab", tf.toUpperCase());
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

  var wTf = null, sTf = null, sQ = "", sSort = "ts", wQ = "", wSide = "", sSide = "", bq = "";

  function watch(tf) {
    wTf = tf; tabs($("#w-tabs"), tf, watch);
    var rows = (DATA.live[tf].pantau || []).slice()
      .sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });
    if (wQ) rows = rows.filter(function (r) { return (r.sym || "").toUpperCase().indexOf(wQ) !== -1; });
    if (wSide) rows = rows.filter(function (r) { return r.dir === wSide; });
    table($("#w-table"), [
      { h: "", c: function (r) { return tvCell(r.sym, tf); } },
      { h: "time WIB", c: function (r) { return txt(r.ts); } },
      { h: "pair", c: function (r) { return pairCell(r.sym, wQ); } },
      { h: "side", c: function (r) { return side(r.dir); } },
      { h: "koreksi admin", c: function (r) { return corrCell(r, tf, "watch"); } },
      { h: "reclaimed level", n: true, c: function (r) { return txt(fp(r.lv), "n"); } },
      { h: "outcome", c: function (r) {
          var td = el("td", "st");
          td.textContent = r.h ? (r.h === "menang" ? "win" : r.h === "kalah" ? "loss" : "timeout") : "pending";
          if (r.h === "menang") td.style.color = "var(--up)";
          else if (r.h === "kalah") td.style.color = "var(--dn)";
          return td; } },
      { h: "R (1:1)", n: true, c: function (r) { return rcell(r.r, false); } },
      { h: "live", c: function (r) { return pickCell(r, tf, "watch"); } },
      { h: "★", c: function (r) {                 // dipilih user di CSV (kolom picked)
          var td = el("td", "st" + (r.pick ? " pickb" : " dim"));
          td.textContent = r.pick ? (r.flip ? "★⇄" : "★") : "—";
          if (r.pick) td.title = "picked by you"
            + (r.flip ? " — ARAH DIPERBAIKI: kamu ambil "
              + (r.dir === "long" ? "short" : "long") + ", R dihitung dari arahmu" : "")
            + (r.note ? " — " + r.note : "");
          return td; } }
    ], rows, "Nothing on the watchlist for this channel.");
  }

  function signals(tf) {
    sTf = tf; tabs($("#s-tabs"), tf, signals);
    var rows = (DATA.live[tf].sinyal || []).slice();
    if (sQ) rows = rows.filter(function (r) { return (r.sym || "").toUpperCase().indexOf(sQ) !== -1; });
    if (sSide) rows = rows.filter(function (r) { return r.dir === sSide; });
    if (sSort === "pick") {
      rows.sort(function (a, b) {               // pilihan user dulu, lalu terbaru
        return ((b.pick ? 1 : 0) - (a.pick ? 1 : 0)) || (b.ts || "").localeCompare(a.ts || "");
      });
    } else if (sSort === "sym") {
      rows.sort(function (a, b) { return (a.sym || "").localeCompare(b.sym || ""); });
    } else if (sSort !== "ts") {
      rows.sort(function (a, b) {            /* sinyal open (pnl null) selalu di bawah */
        var av = num(a.pnl), bv = num(b.pnl);
        if (av === null) av = sSort === "pnl" ? -Infinity : Infinity;
        if (bv === null) bv = sSort === "pnl" ? -Infinity : Infinity;
        return sSort === "pnl" ? bv - av : av - bv;
      });
    } else {
      rows.sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });
    }
    table($("#s-table"), [
      { h: "", c: function (r) { return tvCell(r.sym, tf); } },
      { h: "time WIB", c: function (r) { return txt(r.ts); } },
      { h: "pair", c: function (r) { return pairCell(r.sym, sQ); } },
      { h: "side", c: function (r) { return side(r.dir); } },
      { h: "koreksi admin", c: function (r) { return corrCell(r, tf, "sig"); } },
      { h: "entry", n: true, c: function (r) { return txt(fp(r.e), "n"); } },
      { h: "stop", n: true, c: function (r) { return txt(fp(r.s), "n"); } },
      { h: "target", n: true, c: function (r) { return txt(fp(r.t), "n"); } },
      { h: "status", c: function (r) {
          var td = el("td", "st" + (r.st === "fired" ? " open" : ""));
          td.textContent = r.st === "fired" ? "open" : r.st; return td; } },
      { h: "result R", n: true, c: function (r) { return rcell(r.pnl, r.st === "fired"); } },
      { h: "live", c: function (r) { return pickCell(r, tf, "sig"); } },
      { h: "★", c: function (r) {                 // dipilih user di CSV (kolom picked)
          var td = el("td", "st" + (r.pick ? " pickb" : " dim"));
          td.textContent = r.pick ? (r.flip ? "★⇄" : "★") : "—";
          if (r.pick) td.title = "picked by you"
            + (r.flip ? " — ARAH DIPERBAIKI: kamu ambil "
              + (r.dir === "long" ? "short" : "long") + ", R dihitung dari arahmu" : "")
            + (r.note ? " — " + r.note : "");
          return td; } }
    ], rows, sQ ? "No signal matches \u201C" + sQ + "\u201D on this channel."
      : DATA.live[tf].uji
      ? "Shadow channel — no entry signal recorded yet."
      : "No signals recorded on this channel yet.");
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
  var HR_NAME = { "1h": "Kilat 1h", "2h": "Scalp 2h", "4h": "Swing 4h" };
  function liveHourAgg() {
    var per = {}, h;
    for (h = 0; h < 24; h++) { per[h] = { "1h": [0, 0, 0], "2h": [0, 0, 0], "4h": [0, 0, 0] }; }
    ["1h", "2h", "4h"].forEach(function (tf) {
      ["pantau", "sinyal"].forEach(function (jenis) {
        liveRows(tf, jenis).forEach(function (r) {
          var p = r.apick; if (!p) return;
          if (p.win !== 0 && p.win !== 1) return;   // terbuka: tidak dinilai
          var m = /(\d{2}):(\d{2})\s*$/.exec(String(r.ts || ""));
          if (!m) return;
          var hh = parseInt(m[1], 10); if (!(hh >= 0 && hh < 24)) return;
          var dirEfektif = p.side || r.dir;
          var pct = isFinite(p.pct) ? (dirEfektif === "short" ? -p.pct : p.pct)
                    : (p.win === 1 ? 1 : -1);        // fallback 1R
          var c = per[hh][tf]; c[0]++; c[1] += p.win; c[2] += pct;
        });
      });
    });
    return per;
  }
  function eqLiveSeries() {
    return ["1h", "2h", "4h"].map(function (tf) {
      var rows = [];
      Object.keys(PICKS).forEach(function (k) {
        var kp = k.split("|"); if (kp[0] !== tf) return;
        var p = PICKS[k]; if (!p) return;
        if (p.win !== 0 && p.win !== 1) return;
        var pct = isFinite(p.pct) ? (p.side === "short" ? -p.pct : p.pct)
                  : (p.win === 1 ? 1 : -1);
        rows.push({ ts: kp[2] || "", pct: pct });
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
  function charts() {
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
    var ser = ["1h", "2h", "4h"].map(function (tf) {
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
    var W = 620, H = 190, P = { t: 14, r: 14, b: 26, l: 36 };
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
    for (var g2 = 0; g2 <= 4; g2++) {
      var vv = g2 * 25, yy = Y(vv);
      svg.appendChild(mk("line", { x1: P.l, x2: W - P.r, y1: yy, y2: yy, "class": g2 === 2 ? "z" : "g" }));
      var lb = mk("text", { x: P.l - 5, y: yy + 3, "text-anchor": "end" });
      lb.textContent = vv + "%"; svg.appendChild(lb);
    }
    for (var h2 = 0; h2 < 24; h2 += 3) {
      var tx = mk("text", { x: X(h2) + iw / 2, y: H - 8, "text-anchor": "middle" });
      tx.textContent = (h2 < 10 ? "0" : "") + h2; svg.appendChild(tx);
    }
    var ax = mk("text", { x: W - P.r, y: H - 8, "text-anchor": "end", "class": "hr-wib" });
    ax.textContent = "WIB"; svg.appendChild(ax);
    /* lollipop: per jam, tiga batang kanal berdampingan dari garis 50%.
       Naik = menang, turun = kalah; tinggi = |winrate − 50%|. */
    var y50 = Y(50), bw = iw / 3.4, gap = 1.5;
    for (var h3 = 0; h3 < 24; h3++) {
      var x0 = X(h3) + (iw - bw * 3 - gap * 2) / 2;
      ser.forEach(function (s, i) {
        for (var q = 0; q < s.pts.length; q++) {
          if (s.pts[q][0] !== h3) continue;
          var c = s.pts[q][2], wr = s.pts[q][1];
          var yv = Y(wr), up = wr >= 50;
          var by = Math.min(yv, y50), bh = Math.max(2, Math.abs(yv - y50));
          var bx = x0 + i * (bw + gap);
          var grp = mk("g");
          var tv = mk("title");
          tv.textContent = s.name + " @ " + ("0" + h3).slice(-2) + ".00 — WR "
            + wr.toFixed(0) + "% (" + c[1] + "W/" + (c[0] - c[1]) + "L)";
          grp.appendChild(tv);
          grp.appendChild(mk("rect", { x: bx.toFixed(1), y: by.toFixed(1),
            width: bw.toFixed(1), height: bh.toFixed(1), rx: 1.5,
            fill: "url(#hrg" + i + ")",
            stroke: up ? s.color : "rgba(232,135,124,.9)",
            "stroke-opacity": up ? .55 : .9, "stroke-width": .8 }));
          /* kepala lollipop = nilai winrate eksak */
          grp.appendChild(mk("circle", { cx: (bx + bw / 2).toFixed(1), cy: yv.toFixed(1),
            r: 2.2, fill: up ? s.color : "#E8877C" }));
          svg.appendChild(grp);
          break;
        }
      });
    }
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
      ["1h", "2h", "4h"].forEach(function (t) { totN += per[hq][t][0]; totW += per[hq][t][1]; });
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
  window.DBG = { get DATA() { return DATA; }, get PICKS() { return PICKS; }, get PLOG() { return PLOG; } };
  /* ── bubbles: gelembung FISIK koin hasil deteksi engine ──
     BUKAN pasar crypto seluruhnya — hanya koin yang tercatat di engine.
     Fisika ala bubblescrypto: tiap gelembung melayang (gaya acak lembut),
     bertumbukan elastis dgn sesamanya, memantul di dinding kanvas, dan
     BISA DIGESER dgn tekan-tahan (mouse & sentuh). Isi gelembung =
     perubahan harga 24 jam LIVE dari Binance fapi (CORS terbuka), bukan
     angka R. Warna: hijau naik, merah turun, kuning = tak ada data 24 jam.
     Aura api: koin yang memang ada di catatan engine hari ini. */
  var bMode = "pantau", bTf = null;
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
    var hari = wibDate(new Date().toISOString());
    Object.keys(PICKS).forEach(function (k) {
      var p = PICKS[k];
      if (!p || !p.taken) return;
      /* tanggal SINYAL di kunci (bukan waktu ambil) — pick untuk sinyal
         hari-hari sebelumnya tidak menandai bubble walau diedit hari ini */
      var tglSig = (k.split("|")[2] || "").slice(0, 10);
      if (!tglSig || tglSig !== hari) return;
      var sym = (k.split("|")[3] || "").toUpperCase();
      if (!sym) return;
      if (p.side === "long" || p.side === "short") bbPicked[sym] = p.side;
      else if (!bbPicked[sym]) bbPicked[sym] = true;
    });
  }
  function bbPickedMark() {
    var plot = $("#bb-plot"); if (!plot) return;
    Array.prototype.forEach.call(plot.children, function (b) {
      var sym = b.dataset && b.dataset.sym; if (!sym) return;
      var on = !!bbPicked[sym];
      b.classList.toggle("picked", on);
      var st = b.querySelector(".bbstar");
      if (on && !st) b.appendChild(el("span", "bbstar", "\u2605"));
      else if (!on && st && st.parentNode) st.parentNode.removeChild(st);
      /* label koreksi admin di dalam bubble (terlihat semua pengunjung):
         "short" merah / "long" hijau — arah yang admin ambil */
      var side = on && bbPicked[sym] !== true ? bbPicked[sym] : null;
      var fx = b.querySelector(".bbfix");
      if (side) {
        if (!fx) { fx = el("u", "bbfix " + side, side); fx.dataset.side = side; b.appendChild(fx); }
        else if (fx.dataset.side !== side) {
          fx.className = "bbfix " + side; fx.textContent = side; fx.dataset.side = side;
        }
      } else if (fx && fx.parentNode) fx.parentNode.removeChild(fx);
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
  function bubbleData(mode, tf) {
    var L = (DATA.live || {})[tf];
    var src = mode === "sinyal" ? (L && L.sinyal) : (L && L.pantau);
    if (!src) return [];
    var seen = {};
    return src.map(function (r) {
      var d = mode === "sinyal"
        ? { sym: r.sym, dir: r.dir, e: r.e, s: r.s, t: r.t, ts: r.ts,
            st: r.st, r: r.pnl, slp: num(r.slp) }
        : { sym: r.sym, dir: r.dir, lv: r.lv, ts: r.ts, h: r.h, r: r.r };
      seen[d.sym] = (seen[d.sym] || 0) + 1;
      return d;
    }).map(function (d) { d.n = seen[d.sym]; return d; });
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
    /* koin yang dipilih user di CSV (kolom picked) — dapat badge bintang */
    var picked = {};
    var L = (DATA && DATA.live && bTf && DATA.live[bTf]) || {};
    ((bMode === "sinyal" ? L.sinyal : L.pantau) || []).forEach(function (r) {
      if (r.pick) picked[r.sym] = true;
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
    bbStop(); bbBodies = [];
    plot.innerHTML = ""; tip.classList.remove("on");
    var tf = bTf && DATA.live[bTf] ? bTf : ord()[0];
    bTf = tf;
    var rows = bubbleData(bMode, tf);
    var modeTabs = $("#b-mode");
    modeTabs.innerHTML = "";
    [["pantau", "Watchlist"], ["sinyal", "Signals"]].forEach(function (m) {
      var b = el("button", "tab", m[1]);
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", bMode === m[0] ? "true" : "false");
      b.addEventListener("click", function () { bMode = m[0]; bb24Ts = 0; bubbleDraw(); });
      modeTabs.appendChild(b);
    });
    tabs($("#b-tabs"), tf, function (t) { bTf = t; bubbleDraw(); });
    if (!rows.length) {
      plot.appendChild(el("div", "empty", bMode === "sinyal"
        ? "No signals recorded on this channel yet."
        : "Nothing on the watchlist for this channel."));
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
    list.forEach(function (d) {
      var res = bubbleRes(d);
      var C = BB[res];
      var b = el("div", "bb");
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
            try { w = window.open(tvUrl(d.sym, tf), "_blank", "noopener"); } catch (e) {}
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
        var hd = el("div", "hd", nm + " · " + d.dir.toUpperCase() + " · " + tf.toUpperCase());
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
        if (bMode === "sinyal") {
          rw("entry", fp(d.e)); rw("stop", fp(d.s)); rw("target", fp(d.t));
          rw("stop width", num(d.slp) === null ? "—" : num(d.slp).toFixed(2) + "%");
          var rr = (d.st === "fired") ? null : num(d.r);
          rw("result", rr === null ? "open" : sgn(rr, 2) + "R",
             rr === null ? "" : rr > 0 ? "pos" : "neg");
        } else {
          rw("level", fp(d.lv));
          rw("outcome", d.h ? (d.h === "menang" ? "win" : d.h === "kalah" ? "loss" : "timeout")
            : "pending", d.h === "menang" ? "pos" : d.h === "kalah" ? "neg" : "");
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
  }
  function render(first) {
    stamp(); gauge(); strip(); akurasi(); kamu(); applyPicks();
    scanNotif();
    if (first) charts();
    if (first || !bbBodies.length) bubbleDraw();   // jangan bangun ulang saat data 60 dtk segar — fisika jalan terus
    watch(wTf && DATA.live[wTf] ? wTf : ord()[0]);
    signals(sTf && DATA.live[sTf] ? sTf : ord()[0]);
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
        DATA = j; LEFT = 60; render(first);
      })
      .catch(function () {
        if (!DATA) { $("#state").textContent = "no data"; $("#dot").classList.add("stale"); }
      });
  }
  $("#s-q").addEventListener("input", function () {
    sQ = this.value.trim().toUpperCase(); signals(sTf || ord()[0]);
  });
  $("#w-q").addEventListener("input", function () {
    wQ = this.value.trim().toUpperCase(); watch(wTf || ord()[0]);
  });
  $("#w-side").addEventListener("change", function () {
    wSide = this.value; watch(wTf || ord()[0]);
  });
  $("#s-side").addEventListener("change", function () {
    sSide = this.value; signals(sTf || ord()[0]);
  });
  $("#b-q").addEventListener("input", function () {
    bq = this.value.trim().toUpperCase(); bbSorot();
  });
  $("#s-sort").addEventListener("change", function () {
    sSort = this.value; signals(sTf || ord()[0]);
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
    { id: "startup", label: "Startup terminal", wave: "triangle", seq: [[0, 392, .14, .8], [.15, 523.25, .14, .8], [.30, 659.25, .14, .8], [.45, 783.99, .42, .9]] }
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
    m.textContent = MUTE ? "🔇" : "🔔";
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
    bx.appendChild(el("p", "snd-sub", "Pilih salah satu dari 20 jenis — contohnya langsung diputar saat dipilih. Notifikasi desktop muncul saat tab tidak aktif. Pilihan & volume tersimpan di perangkat ini."));
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
  function deskNotify(kind, sym, tf, ts, dir) {
    if (!deskReady() || !document.hidden) return;   // tab aktif = toast cukup
    try {
      var n = new Notification(
        (kind === "sinyal" ? "SINYAL BARU — " : "WATCHLIST BARU — ") + sym,
        { body: (dir === "long" || dir === "short" ? dir.toUpperCase() + " · " : "")
              + (tf || "").toUpperCase() + (ts ? " · " + ts : "")
              + " · klik untuk buka TradingView",
          tag: "qkuk-" + ts + "|" + sym + "|" + tf,
          icon: QKUK_ICON, badge: QKUK_ICON, renotify: true });
      n.onclick = function () {
        try { window.focus(); window.open(tvUrl(sym, tf), "_blank", "noopener"); } catch (e) {}
        n.close();
      };
      setTimeout(function () { try { n.close(); } catch (e) {} }, 9000);
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
  /* login admin tunggal — kredensial hanya diketahui pemilik situs */
  /* login admin tunggal — di kode hanya SHA-256 dari "username:password",
     jadi kredensial tidak terbaca mentah di view source. */
  var AUTH = { user: "admin", hash: "d78f6114b477459dfaacf645a3d5453b33437cce560a016ffbc2051408d3caa0" };
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
  var PLOG = [];          // riwayat semua aksi admin (ambil/koreksi/hapus)
  var AUTHCLOUD = null;   // hash password hasil "ganti password" (dari cloud)
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
    var kp = (key || "").split("|");
    PLOG.unshift({ t: new Date().toISOString(), act: act,
      sym: (r && r.sym) || kp[3] || "", tf: kp[0] || "", jenis: kp[1] || "",
      dir0: (r && r.dir) || null, side: p ? (p.side || null) : null,
      pct: p && isFinite(p.pct) ? p.pct : null, win: p ? p.win : null,
      note: p && p.note ? p.note : null });
    if (PLOG.length > 2000) PLOG.length = 2000;   // dulu 200 — riwayat harian cepat terpotong
  }
  function pickKey(tf, jenis, r) { return tf + "|" + jenis + "|" + (r.ts || "") + "|" + (r.sym || ""); }
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
      if (kp[0] !== tf || kp[1] !== seg) return;
      var p = PICKS[k]; if (!p) return;
      for (var i = 0; i < out.length; i++) {
        if (out[i].ts === kp[2] && out[i].sym === kp[3]) return;   // sudah ada di jendela
      }
      out.push({ ts: kp[2] || "", sym: kp[3] || "", dir: p.side || null, apick: p });
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
      PLOG = cloudLog.length ? cloudLog : repoLog;
      /* riwayat kosong padahal ada pick? (mis. log tertimpa) — rekonstruksi
         dari pick itu sendiri supaya tabel riwayat tidak pernah blank */
      if (!PLOG.length && Object.keys(PICKS).length) {
        PLOG = Object.keys(PICKS).map(function (k) {
          var kp = k.split("|"), p = PICKS[k] || {};
          return { t: p.ts || "", act: "ambil", sym: kp[3] || "", tf: kp[0] || "",
            jenis: kp[1] || "", dir0: null, side: p.side || null,
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
    if (wTf) watch(wTf); if (sTf) signals(sTf); liveStats();
    bbPickedSync(); bbPickedMark();   // bintang & garis emas bubble ikut picks terbaru
    /* 23 Sep — grafik live (kurva kumulatif & winrate per jam) ikut
       digambar ulang saat picks tiba/berubah. Dulu charts() hanya jalan
       sekali di render pertama → kedua SVG selalu menampilkan
       "belum ada resolve" karena picks cloud tiba belakangan. */
    charts(); hourHeat(); dayWinrate();
  }
  /* simpan picks — hanya lewat cloud (textdb.dev); wajib login admin.
     Jalur GitHub dihapus (token repot & rawan salah scope). */
  function cloudWrite() {
    return fetch("https://textdb.dev/api/data/" + TXTDB_ID, {
      method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ __id: TXTDB_ID, value: JSON.stringify({
        picks: PICKS, log: PLOG,
        auth: AUTHCLOUD ? { user: AUTH.user, hash: AUTHCLOUD } : null }) })
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); });
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
        st.textContent = (e.message && e.message.indexOf("Failed to fetch") >= 0)
          ? "gagal: jaringan memblokir textdb.dev — coba lagi / ganti jaringan"
          : "gagal: " + e.message;
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
    pctIn.placeholder = "hasil: naik/turun berapa % (mis. -2.4)";
    if (p && isFinite(p.pct)) pctIn.value = p.pct;
    var winSel = el("select", "adm-in");
    [["", "hasil: masih open / belum ditentukan"], ["win", "hasil: WIN"], ["loss", "hasil: LOSS"]]
      .forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; winSel.appendChild(op); });
    if (p && p.win === 1) winSel.value = "win"; else if (p && p.win === 0) winSel.value = "loss";
    var noteIn = el("input", "adm-in"); noteIn.type = "text";
    noteIn.placeholder = "catatan (alasan koreksi, dll)";
    if (p && p.note) noteIn.value = p.note;
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
    box.appendChild(noteIn); box.appendChild(row); box.appendChild(st);
    admShow(box);
    save.addEventListener("click", function () {
      PICKS[key] = { taken: 1, side: sideSel.value || null,
        pct: pctIn.value === "" ? null : parseFloat(pctIn.value),
        win: winSel.value === "win" ? 1 : winSel.value === "loss" ? 0 : null,
        note: noteIn.value || null, ts: new Date().toISOString(), by: "admin" };
      plogAdd(p ? "koreksi" : "ambil", key, PICKS[key], r);
      savePicks(st, function () { applyPicks(); admClose(); });
    });
    cancel.addEventListener("click", admClose);
    } catch (err) { admFallback(err); }
  }
  function openAdmin() {
    var box = el("div");
    box.appendChild(admHead("Login admin"));
    function reapply() { if (wTf) watch(wTf); if (sTf) signals(sTf); liveStats(); }
    if (isLogged()) {
      box.appendChild(el("div", "adm-desc", "Login sebagai admin ✓ — tombol \"ambil\" aktif di semua tabel dan kamu bisa mengoreksi pick kapan pun."));
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
          if (u === AUTH.user && h === curHash()) {
            SS.set("qkuk_admin_ok", "1");
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
            st.textContent = "selamat datang, admin ✓";
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
    box.appendChild(admHead("Ganti password admin"));
    box.appendChild(el("div", "adm-desc",
      "Password baru disimpan sebagai hash SHA-256 di cloud — berlaku untuk semua perangkat, tanpa edit kode. Minimal 6 karakter."));
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
      var o = oIn.value || "", n = nIn.value || "", r2 = rIn.value || "";
      if (n.length < 6) { st.textContent = "password baru minimal 6 karakter"; return; }
      if (n !== r2) { st.textContent = "ulangan password baru tidak sama"; return; }
      st.textContent = "memverifikasi…";
      sha256hex(AUTH.user + ":" + o)
        .then(function (h) {
          if (h !== curHash()) { st.textContent = "password lama salah"; return; }
          return sha256hex(AUTH.user + ":" + n);
        })
        .then(function (h2) {
          if (!h2) return;
          AUTHCLOUD = h2;
          plogAdd("password", "", null, null);
          return cloudWrite().then(function () {
            st.textContent = "password diganti ✓ — aktif untuk semua perangkat";
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
      + (isFinite(p.pct) ? " · hasil " + sgn(p.pct, 1) + "%" : "")
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
    if (!p) {
      if (isAdmin()) {
        var b = el("button", "apbtn", "ambil"); b.type = "button";
        b.addEventListener("click", function () { openResolve(tf, jenis, r, null); });
        td.appendChild(b);
      } else { td.textContent = "\u2014"; td.classList.add("dim"); }
      return td;
    }
    var side = p.side || r.dir;
    var b2 = el("button", "apbadge " + (p.win === 1 ? "apwin" : p.win === 0 ? "aploss" : "apopen"));
    b2.type = "button";
    b2.textContent = (side === "long" ? "\u25b2" : "\u25bc")
      + (p.side && p.side !== r.dir ? "\u21c4" : "")
      + (p.win === 1 ? " W" : p.win === 0 ? " L" : " \u00b7")
      + (isFinite(p.pct) ? " " + sgn(p.pct, 1) + "%" : "");
    b2.title = (isAdmin() ? "klik untuk koreksi" : "live pick") + " \u2014 ambil " + side
      + (p.side && p.side !== r.dir ? " (arah dikoreksi dari " + r.dir + ")" : "")
      + (isFinite(p.pct) ? ", hasil " + sgn(p.pct, 1) + "%" : "")
      + (p.note ? " \u2014 " + p.note : "");
    if (isAdmin()) b2.addEventListener("click", function () { openResolve(tf, jenis, r, p); });
    td.appendChild(b2);
    return td;
  }
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
          if (isFinite(p.pct)) tot += ((p.side || r.dir) === "short" ? -p.pct : p.pct);
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
          var dirEfektif = p.side || r.dir;
          var pct = isFinite(p.pct) ? ((dirEfektif === "short" ? -p.pct : p.pct))
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
    var TFH = [["1h", "KILAT"], ["2h", "SCALP"], ["4h", "SWING"]];
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
          var dirEfektif = p.side || r.dir;
          var pct = isFinite(p.pct) ? ((dirEfektif === "short" ? -p.pct : p.pct))
                    : (p.win === 1 ? 1 : -1);        // fallback 1R
          var c = per[h][tf]; c[0]++; c[1] += p.win; c[2] += pct;
        });
      });
    });
    var TOT = 0; for (j = 0; j < 24; j++) TOT += per[j]["1h"][0] + per[j]["2h"][0] + per[j]["4h"][0];
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
      host.appendChild(tg);
    })();
    if (!TOT) {
      host.appendChild(el("div", "plog-empty", "belum ada resolve — isi win/loss lewat tombol ambil, heat table terisi otomatis"));
      return;
    }
    var wrap = el("div", "plog-scroll");
    var tab = el("table", "hh-t");
    var thead = el("thead"), trh = el("tr");
    trh.appendChild(el("th", "hh-jam", "jam"));
    ["KILAT 1H", "SCALP 2H", "SWING 4H", "TOTAL"].forEach(function (x) { trh.appendChild(el("th", null, x)); });
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
      ["1h", "2h", "4h"].forEach(function (t) {
        var c = per[j][t]; tt[0] += c[0]; tt[1] += c[1]; tt[2] += c[2];
      });
      var totHas = tt[0] > 0;
      var best3 = totHas ? Math.max(per[j]["1h"][0] ? per[j]["1h"][1] / per[j]["1h"][0] : -1,
                                   per[j]["2h"][0] ? per[j]["2h"][1] / per[j]["2h"][0] : -1,
                                   per[j]["4h"][0] ? per[j]["4h"][1] / per[j]["4h"][0] : -1) : 0;
      ["1h", "2h", "4h"].forEach(function (t) {
        var c = per[j][t];
        tr.appendChild(cell.call(null, t, c[0] > 0 && c[1] / c[0] === best3, j));
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
    var kamu = document.getElementById("kamu");
    if (!kamu) return;
    var host = document.getElementById("plog");
    if (!host) {
      host = el("div", "plog-wrap"); host.id = "plog";
      var lg = document.getElementById("live-grid");
      if (lg && lg.parentNode === kamu) kamu.insertBefore(host, lg.nextSibling);
      else kamu.appendChild(host);
    }
    host.innerHTML = "";
    var pHead = el("div", "pn-h lv-sub", "riwayat koreksi admin");
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
    /* entri riwayat difilter ke jam terpilih. Jam dibaca tahan-banting:
       "YYYY-MM-DD HH:MM" tanpa zona = sudah WIB; ISO berzona (hasil
       toISOString) digeser +7 jam ke WIB. Regex lama menuntut string
       berakhir HH:MM — selalu gagal pada t ISO dari plogAdd → filter kosong. */
    var daftar = PLOG;
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
    if (!daftar.length) {
      host.appendChild(el("div", "plog-empty",
        !PLOG.length
          ? "belum ada koreksi — setiap ambil, koreksi, atau hapus pick tercatat di sini dengan waktu WIB-nya"
          : "tidak ada koreksi di jam " + ("0" + fJam).slice(-2) + ".00 WIB"));
      return;
    }
    var sc = el("div", "plog-scroll"), tb = el("table", "plog-t");
    var trh = el("tr");
    ["waktu", "koin", "engine", "jenis", "aksi", "arah", "hasil", "status", "catatan"]
      .forEach(function (x) { trh.appendChild(el("th", null, x)); });
    var thead = el("thead"); thead.appendChild(trh); tb.appendChild(thead);
    var tbody = el("tbody");
    daftar.slice(0, 50).forEach(function (e) {
      var tr = el("tr");
      function td(v, cls) { tr.appendChild(el("td", cls || "", v)); }
      td(wibStr(e.t), "mut");
      td((e.sym || "").replace(/USDT$/, "") || "—");
      td((e.tf || "").toUpperCase() || "—", "mut");
      td(e.jenis === "sig" ? "sinyal" : e.jenis === "watch" ? "watchlist" : (e.jenis || "—"), "mut");
      td(e.act === "hapus" ? "hapus" : e.act === "koreksi" ? "koreksi" : e.act === "password" ? "password" : "ambil",
        e.act === "hapus" ? "neg" : e.act === "koreksi" ? "warn" : "mut");
      td(e.act === "hapus" ? "—"
        : e.side ? e.side + (e.dir0 && e.side !== e.dir0 ? " ← " + e.dir0 : "")
        : (e.dir0 || "—"));
      td(isFinite(e.pct) ? sgn(e.pct, 1) + "%" : "—",
        !isFinite(e.pct) ? "mut" : e.pct > 0 ? "pos" : e.pct < 0 ? "neg" : "mut");
      td(e.act === "hapus" || e.act === "password" ? "—"
        : e.win === 1 ? "WIN" : e.win === 0 ? "LOSS" : "open",
        e.win === 1 ? "pos" : e.win === 0 ? "neg" : "mut");
      td(e.note || "—", "mut");
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); sc.appendChild(tb); host.appendChild(sc);
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
      var L = DATA.live[tf] || {};
      (L.pantau || []).forEach(function (r) {
        if (r && r.sym) items.push({ k: "watchlist", key: r.ts + "|" + r.sym + "|" + tf, tf: tf, sym: r.sym, dir: r.dir, ts: r.ts });
      });
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
     1 gauge arah  2 bubbles  3 watchlist  4 signals  5 picked by you
     6 cumulative R + winrate by hour  7 winrate watchlist accuracy
     8 winrate sinyal scalping kilat / scalping / swing trade (kartu ringkasan) */
  (function reOrder() {
    var ids  = ["dir", "bubbles", "watch", "signals", "kamu", "charts", "akurasi", "strip"];
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
    var ok = false;
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
        if (u === AUTH.user && h === curHash()) {           // admin
          SS.set("qkuk_admin_ok", "1");
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

  adminInit();
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
