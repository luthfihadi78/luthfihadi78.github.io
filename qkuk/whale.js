/* whale.js — tab Whale on-chain (24 Sep).
   Halaman TERPISAH dari terminal: gate login sama (kredensial & sesi sama,
   sessionStorage qkuk_admin_ok/qkuk_user_ok), tema sama, data dari data.json
   blok "onchain" yang dipoll server bot (browser tak memanggil API on-chain
   untuk FEED). Pengecualian: fitur "Cek arah koin" memanggil API publik
   langsung dari browser — Binance aggTrades (arus taker per menit) +
   GeckoTerminal (daftar transaksi DEX per wallet: alamat, BUY/SELL, jumlah,
   nilai USD) — keduanya gratis & diizinkan CSP whale.html. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var el = function (t, c, txt) {
    var x = document.createElement(t);
    if (c) x.className = c;
    if (txt != null) x.textContent = txt;
    return x;
  };
  var SS = (function () {
    var mem = {};
    function ok() { try { var k = "__qw"; sessionStorage.setItem(k, "1"); sessionStorage.removeItem(k); return true; } catch (e) { return false; } }
    var good = ok();
    return {
      get: function (k) { if (good) { try { return sessionStorage.getItem(k); } catch (e) {} } return mem.hasOwnProperty(k) ? mem[k] : null; },
      set: function (k, v) { mem[k] = v; if (good) { try { sessionStorage.setItem(k, v); } catch (e) {} } },
      del: function (k) { delete mem[k]; if (good) { try { sessionStorage.removeItem(k); } catch (e) {} } }
    };
  })();

  /* ── auth: hash identik dgn terminal (app.js) ── */
  var AUTH = { user: "admin", hash: "d78f6114b477459dfaacf645a3d5453b33437cce560a016ffbc2051408d3caa0" };
  var USER_AUTH = { user: "user", hash: "7d1e87fd6803a1d1ae6069ecd635c81960d5af1629a1a0fc85912685f8f25196" };
  function sha256hex(s) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
  }
  function isLogged() { return SS.get("qkuk_admin_ok") === "1" || SS.get("qkuk_user_ok") === "1"; }

  function gateInit() {
    var gate = document.getElementById("gate");
    if (!gate) return;
    if (isLogged()) {
      document.documentElement.classList.add("authed");
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      return;
    }
    var uIn = gate.querySelector("#gate-user"), pIn = gate.querySelector("#gate-pass"),
        btn = gate.querySelector("#gate-btn"), err = gate.querySelector("#gate-err"),
        sub = gate.querySelector(".gate-sub"), chain = gate.querySelector("#gate-chain"),
        hashEl = gate.querySelector("#gate-hash");
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
    var eye = gate.querySelector("#gate-eye");
    if (eye) {
      var EYE_ON = eye.innerHTML;
      var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      eye.addEventListener("click", function () {
        var show = pIn.type === "password";
        pIn.type = show ? "text" : "password";
        eye.classList.toggle("on", show);
        eye.innerHTML = show ? EYE_OFF : EYE_ON;
      });
    }
    function finish() {
      err.textContent = "";
      gate.querySelector(".gate-form").style.display = "none";
      sub.textContent = "menautkan blok…";
      chain.classList.add("run");
      var bs = 1;
      var tick = setInterval(function () {
        var hex = "", cs = "0123456789abcdef";
        for (var i = 0; i < 14; i++) hex += cs[Math.floor(Math.random() * 16)];
        hashEl.textContent = "0x" + hex + "  ▸ block #" + (bs++) + " … verifying";
      }, 85);
      setTimeout(function () {
        clearInterval(tick);
        hashEl.textContent = "0x… chain synced ✓";
        gate.classList.add("bye");
        document.documentElement.classList.add("authed");
        setTimeout(function () { if (gate.parentNode) gate.parentNode.removeChild(gate); }, 750);
        load(true);
      }, 2450);
    }
    function tryGate() {
      var u = (uIn.value || "").trim(), p = pIn.value || "";
      if (!u || !p) { err.textContent = "isi username dan password"; return; }
      sha256hex(u + ":" + p).then(function (h) {
        if (u === AUTH.user && h === AUTH.hash) { SS.set("qkuk_admin_ok", "1"); finish(); }
        else if (u === USER_AUTH.user && h === USER_AUTH.hash) { SS.set("qkuk_user_ok", "1"); finish(); }
        else {
          err.textContent = "username / password salah";
          gate.classList.remove("shake"); void gate.offsetWidth; gate.classList.add("shake");
        }
      }).catch(function () { err.textContent = "gagal memverifikasi login"; });
    }
    btn.addEventListener("click", tryGate);
    pIn.addEventListener("keydown", function (ev) { if (ev.key === "Enter") tryGate(); });
    uIn.addEventListener("keydown", function (ev) { if (ev.key === "Enter") pIn.focus(); });
  }

  /* ── format & warna ── */
  var WCH = {
    "bitcoin": "#F7931A", "ethereum": "#627EEA", "binance-smart-chains": "#F0B90B",
    "arbitrum": "#28A0F6", "sui": "#4DA2FF", "hyperliquid": "#97FCE4"
  };
  var WSYM = {
    "bitcoin": "BTC", "ethereum": "ETH", "binance-smart-chains": "BNB",
    "arbitrum": "ARB", "sui": "SUI", "hyperliquid": "HL"
  };
  function fmtUsd(v) {
    if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "M";
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "jt";
    if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "rb";
    return "$" + Math.round(v);
  }
  function chainBadge(c) {
    var s = el("span", "wch");
    var d = el("i", "wdot"); d.style.background = WCH[c] || "#8B968F";
    s.appendChild(d);
    s.appendChild(el("b", null, WSYM[c] || c));
    return s;
  }
  function arahBadge(a) {
    var m = { "JUAL": "wj jual", "BELI": "wj beli", "TRANSFER": "wj tra" };
    var s = el("span", m[a] || "wj tra", a);
    return s;
  }
  function toast(msg) {
    var t = el("div", "toast", msg);
    $("#toasts").appendChild(t);
    setTimeout(function () { t.classList.add("on"); }, 10);
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 400); }, 2200);
  }

  /* ── NOTIFIKASI DESKTOP MEGA (24 Sep, permintaan user) ─────────────
     Saat whale print ≥ $20jt masuk: notifikasi native OS (Notification
     API) — bukan cuma suara — sehingga tetap terlihat walau tab Whale
     tidak aktif. Izin: tombol 🖥 di header (harus dari klik user —
     kebijakan browser); preferensi tersimpan di localStorage. Berbeda
     dgn terminal: MEGA selalu dinotifikasikan walau tab aktif. */
  var W_ICON = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="14" fill="#0D1411"/>' +
    '<text x="32" y="46" font-size="34" text-anchor="middle">🐋</text></svg>');
  var W_DESK = false;
  try { W_DESK = localStorage.getItem("qkuk_desk") === "1"; } catch (e) {}
  function deskBtnPaint() {
    var b = document.getElementById("desk-btn");
    if (b) { b.textContent = W_DESK ? "🖥 ON" : "🖥"; b.title = W_DESK
      ? "Notifikasi desktop: ON — klik untuk mati"
      : "Notifikasi desktop saat whale MEGA masuk — klik untuk aktifkan"; }
  }
  function deskBtnInit() {
    var b = document.getElementById("desk-btn");
    if (!b) return;
    deskBtnPaint();
    b.addEventListener("click", function () {
      if (W_DESK) {
        W_DESK = false;
        try { localStorage.setItem("qkuk_desk", "0"); } catch (e) {}
        deskBtnPaint(); toast("notifikasi desktop mati");
        return;
      }
      if (!("Notification" in window)) { toast("browser tak mendukung Notification"); return; }
      if (Notification.permission === "granted") {
        W_DESK = true;
        try { localStorage.setItem("qkuk_desk", "1"); } catch (e) {}
        deskBtnPaint(); toast("notifikasi desktop nyala");
      } else if (Notification.permission === "denied") {
        toast("izin notifikasi diblokir di pengaturan browser");
      } else {
        Notification.requestPermission().then(function (p) {
          if (p === "granted") {
            W_DESK = true;
            try { localStorage.setItem("qkuk_desk", "1"); } catch (e) {}
            deskBtnPaint(); toast("notifikasi desktop nyala");
          } else { toast("izin notifikasi ditolak"); }
        });
      }
    });
  }
  function deskMega(b) {
    if (!("Notification" in window) || Notification.permission !== "granted" || !W_DESK) return;
    if (!b) return;
    try {
      var sel = (QACTIVE && QACTIVE.sel) || {};
      var n = new Notification(
        "🔥 WHALE BESAR — " + fmtUsd(b.usd) + " " + (b.buy ? "BELI" : "JUAL"),
        { body: b.amt.toFixed(2) + " " + (sel.baseSym || "")
              + " · " + (sel.name || "")
              + " · wallet " + (b.wallet ? b.wallet.slice(0, 10) + "…" : "—"),
          tag: "qkuk-mega-" + b.tx, icon: W_ICON, badge: W_ICON, renotify: true });
      n.onclick = function () {
        try { window.focus(); } catch (e) {}
        n.close();
      };
      setTimeout(function () { try { n.close(); } catch (e) {} }, 12000);
    } catch (e) {}
  }

  /* ── SUARA NOTIFIKASI (24 Sep, permintaan user) ────────────────────────
     Identik dgn terminal: baca qkuk_sound / qkuk_vol / qkuk_mute dari
     localStorage tiap kali main (perubahan setting di terminal langsung
     berlaku). Sintesis Web Audio tanpa file — SOUNDS & playSeq disalin
     dari app.js. Dibunyikan saat ada baris BARU ≥ $1jt di tabel cek koin
     (maks sekali per refresh, biar tak jadi deretan bunyi). */
  var WSOUNDS = [
    { id: "ding",    wave: "sine",     seq: [[0, 880, .30, 1], [.09, 1318.5, .30, .8]] },
    { id: "bell",    wave: "sine",     seq: [[0, 1046.5, .55, .9], [.02, 1568, .5, .4], [.02, 2093, .4, .25]] },
    { id: "chime",   wave: "sine",     seq: [[0, 783.99, .22, .9], [.11, 1046.5, .22, .9], [.22, 1318.5, .34, .9]] },
    { id: "chip",    wave: "square",   seq: [[0, 987.77, .09, .45], [.10, 1318.5, .16, .45]] },
    { id: "pulse",   wave: "triangle", seq: [[0, 587.33, .10, .9], [.13, 587.33, .10, .9]] },
    { id: "digital", wave: "square",   seq: [[0, 1174.66, .07, .4], [.09, 1174.66, .07, .4], [.18, 1567.98, .13, .4]] },
    { id: "swoosh",  wave: "sine",     seq: [[0, 392, .30, 1, "rise"], [.08, 587.33, .26, .7]] },
    { id: "radar",   wave: "sine",     seq: [[0, 1244.51, .42, .9]] },
    { id: "drop",    wave: "sine",     seq: [[0, 329.63, .38, 1, "glide"]] },
    { id: "coin",    wave: "square",   seq: [[0, 987.77, .08, .5], [.09, 1318.5, .30, .5]] },
    { id: "harp",    wave: "triangle", seq: [[0, 523.25, .2, .8], [.08, 659.25, .2, .8], [.16, 783.99, .3, .8], [.24, 1046.5, .36, .7]] },
    { id: "fanfare", wave: "triangle", seq: [[0, 523.25, .13, .9], [.14, 659.25, .13, .9], [.28, 783.99, .32, 1]] },
    { id: "alert",   wave: "square",   seq: [[0, 880, .12, .5], [.16, 880, .12, .5], [.32, 880, .2, .5]] },
    { id: "buzz",    wave: "sawtooth", seq: [[0, 220, .20, .35]] },
    { id: "spark",   wave: "sawtooth", seq: [[0, 1567.98, .06, .3], [.07, 2093, .14, .3]] },
    { id: "marimba", wave: "sine",     seq: [[0, 523.25, .16, 1], [.10, 783.99, .16, .9], [.20, 1046.5, .30, .9]] },
    { id: "crystal", wave: "sine",     seq: [[0, 1318.51, .3, .55], [.06, 1760, .3, .4], [.12, 2637, .44, .3]] },
    { id: "beacon",  wave: "triangle", seq: [[0, 622.25, .30, .9], [.34, 622.25, .30, .7]] },
    { id: "rocket",  wave: "sawtooth", seq: [[0, 261.63, .45, .4, "rise"], [.10, 523.25, .4, .3]] },
    { id: "startup", wave: "triangle", seq: [[0, 392, .14, .8], [.15, 523.25, .14, .8], [.30, 659.25, .14, .8], [.45, 783.99, .42, .9]] }
  ];
  function wUnlock() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !wDing.ctx) wDing.ctx = new AC();
      if (wDing.ctx && wDing.ctx.state === "suspended") wDing.ctx.resume();
    } catch (e) {}
    document.removeEventListener("pointerdown", wUnlock);
    document.removeEventListener("keydown", wUnlock);
  }
  document.addEventListener("pointerdown", wUnlock);
  document.addEventListener("keydown", wUnlock);
  function wPlaySeq(ctx, snd, vol) {
    var t0 = ctx.currentTime, g = ctx.createGain();
    var last = snd.seq[snd.seq.length - 1];
    var tot = last[0] + last[2] + .25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(Math.max(.0002, .5 * vol), t0 + .012);
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
  function wDing(level) {
    try {
      if (localStorage.getItem("qkuk_mute") === "1") return;
      var vol = 0.8;
      var _v = parseFloat(localStorage.getItem("qkuk_vol"));
      if (!isNaN(_v) && _v >= 0 && _v <= 1) vol = _v;
      var sid = 0, _s = localStorage.getItem("qkuk_sound");
      for (var i = 0; i < WSOUNDS.length; i++) if (WSOUNDS[i].id === _s) { sid = i; break; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!wDing.ctx) wDing.ctx = new AC();
      if (wDing.ctx.state === "suspended") { wDing.ctx.resume(); return; }
      if (level === "mega") {
        /* 24 Sep (permintaan user): whale print ≥ $20jt bunyi BEDA — alarm
           tegas 3 nada naik ×2 (tak mengikuti pilihan suara, biar tak
           tertukar dgn notifikasi biasa), volume lebih keras. */
        wPlaySeq(wDing.ctx, WSND_MEGA, Math.min(1, vol + 0.15));
        setTimeout(function () { if (wDing.ctx) wPlaySeq(wDing.ctx, WSND_MEGA, Math.min(1, vol + 0.15)); }, 1100);
      } else {
        wPlaySeq(wDing.ctx, WSOUNDS[sid], vol);
      }
    } catch (e) {}
  }
  var WSND_MEGA = { id: "megawhale", wave: "square",
                    seq: [[0, 440, .16, .8], [.18, 554.37, .16, .8], [.36, 659.25, .34, 1]] };
  function fmtPx(p) {
    p = +p;
    if (p >= 1000) return p.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.01) return p.toFixed(5);
    return p.toFixed(7);
  }

  /* ── state ── */
  var DATA = null, FILTER = "semua", LEFT = 0;

  function jamWib(tsWib) {
    if (!tsWib) return "—";
    var B = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    var p = tsWib.split(" ");
    if (p.length < 2) return tsWib;
    var d = p[0].split("-");
    var bulan = B[(+d[1] || 1) - 1] || d[1];
    return (+d[2]) + " " + bulan + " " + p[1].slice(0, 5);
  }

  function renderRingkas(oc) {
    var A = oc.alerts || [];
    var hari = A.filter(function (a) {
      return a.ts_wib && a.ts_wib.slice(0, 10) === (new Date(Date.now() + 7 * 3600e3)).toISOString().slice(0, 10);
    });
    var nJual = hari.filter(function (a) { return a.arah === "JUAL"; }).length;
    var nBeli = hari.filter(function (a) { return a.arah === "BELI"; }).length;
    var nMega = hari.filter(function (a) { return a.level === "MEGA"; }).length;
    $("#wg-24").textContent = String(hari.length);
    $("#wg-jual").textContent = String(nJual);
    $("#wg-beli").textContent = String(nBeli);
    $("#wg-mega").textContent = String(nMega);
    var big = $("#wg-bias"), sub = $("#wg-sub");
    if (!hari.length) {
      big.textContent = "TENANG";
      big.style.color = "var(--fg-2)";
      sub.textContent = "belum ada alert whale hari ini — data mengalir tiap siklus bot";
    } else if (nJual > nBeli) {
      big.textContent = "TEKANAN JUAL";
      big.style.color = "var(--dn)";
      sub.textContent = nJual + " indikasi jual vs " + nBeli + " beli — konfirmasi hati-hati utk long, verifikasi utk short";
    } else if (nBeli > nJual) {
      big.textContent = "TEKANAN BELI";
      big.style.color = "var(--up)";
      sub.textContent = nBeli + " indikasi beli vs " + nJual + " jual — akumulasi terpantau";
    } else {
      big.textContent = "SEIMBANG";
      big.style.color = "var(--gold)";
      sub.textContent = nJual + " jual vs " + nBeli + " beli — arah belum dominan";
    }
    var m = $("#wg-meta"); m.innerHTML = "";
    function r(l, v, c) {
      var x = el("div", "dr");
      x.appendChild(el("span", "l", l));
      x.appendChild(el("span", "d"));
      x.appendChild(el("span", "v " + (c || ""), v));
      m.appendChild(x);
    }
    r("sumber", "mempool.space · Etherscan V2 · publicnode SUI/BSC · Hyperliquid", "mut");
    r("threshold", "BTC/ETH ≥ $20jt · lainnya ≥ max(1% vol 24j, $2jt) · MEGA ≥ $100jt", "mut");
    r("arah dibaca", "deposit ke exchange = indikasi JUAL · withdrawal = indikasi BELI", "mut");
    r("total tercatat", A.length + " alert (CSV bot)", "mut");
  }

  function renderFilter() {
    var host = $("#w-filter"); host.innerHTML = "";
    ["semua", "jual", "beli", "transfer", "mega"].forEach(function (f) {
      var b = el("button", "tab" + (FILTER === f ? " on" : ""), f.toUpperCase());
      b.addEventListener("click", function () { FILTER = f; renderFilter(); renderRows(); });
      host.appendChild(b);
    });
  }

  function explorerUrl(oc, chain, what, id) {
    var e = (oc.explorer || {})[chain];
    if (!e) return "";
    return (what === "tx" ? e[1] : e[0]).replace("{h}", id).replace("{a}", id);
  }

  function renderRows() {
    var host = $("#wrows"); host.innerHTML = "";
    var oc = (DATA || {}).onchain || {};
    var A = oc.alerts || [];
    var f = FILTER;
    var show = A.filter(function (a) {
      if (f === "semua") return true;
      if (f === "mega") return a.level === "MEGA";
      return (a.arah || "").toLowerCase() === f;
    });
    $("#w-empty").hidden = show.length > 0;
    show.slice(0, 80).forEach(function (a) {
      var row = el("div", "wrow");
      row.appendChild(el("span", "wt", jamWib(a.ts_wib)));
      var c = el("span", "wc"); c.appendChild(chainBadge(a.chain)); row.appendChild(c);
      var w = el("span", "ww"); w.appendChild(arahBadge(a.arah));
      if (a.level === "MEGA") w.appendChild(el("b", "wmega", "MEGA"));
      row.appendChild(w);
      row.appendChild(el("span", "wn", a.nominal || "—"));
      row.appendChild(el("span", "wv" + (a.usd >= 1e8 ? " mega" : ""), fmtUsd(a.usd || 0)));
      var al = el("span", "wa", (a.alasan || "") + (a.sumber ? " · " + a.sumber : ""));
      al.title = (a.from || "") + " → " + (a.to || "");
      row.appendChild(al);
      var lk = el("span", "wl");
      var url = explorerUrl(oc, a.chain, "tx", a.txid);
      if (url) {
        var x = el("a", "wlink", "tx ↗"); x.href = url; x.target = "_blank"; x.rel = "noopener";
        lk.appendChild(x);
      }
      row.appendChild(lk);
      host.appendChild(row);
    });
  }

  function renderWallets(oc) {
    var host = $("#wlrows"); host.innerHTML = "";
    /* 24 Sep (permintaan user): urutkan di sisi web — nilai USD terbesar
       selalu di atas, tak bergantung urutan snapshot dari engine.
       Lapisan filter 2: wallet tanpa nilai terukur (gagal API / snapshot
       engine lama) TIDAK ditampilkan — dulu muncul sebagai saldo 0/$10. */
    var W = (oc.wallets || [])
      .filter(function (w) { return w.balance_usd != null && w.balance_usd >= 50000; })
      .sort(function (a, b) {
        return (b.balance_usd || 0) - (a.balance_usd || 0);
      });
    if (!W.length) {
      host.appendChild(el("div", "w-empty", "belum ada snapshot wallet"));
      return;
    }
    W.forEach(function (w) {
      var row = el("div", "wrow wrow-w");
      var c = el("span", "wc"); c.appendChild(chainBadge(w.chain)); row.appendChild(c);
      var ad = el("span", "waddr", w.addr_short || w.addr);
      ad.title = "klik utk salin alamat";
      ad.style.cursor = "pointer";
      ad.addEventListener("click", function () {
        try { navigator.clipboard.writeText(w.addr); toast("alamat disalin"); }
        catch (e) { toast("gagal menyalin"); }
      });
      row.appendChild(ad);
      /* Hyperliquid tak punya saldo token native — tampilkan nilai akun di
         kolom saldo sbg "(perp)" biar tak ada sel kosong yang membingungkan */
      row.appendChild(el("span", "wn", w.balance != null ? w.balance.toFixed(4)
        : (w.balance_usd != null ? "perp · " + fmtUsd(w.balance_usd) : "—")));
      row.appendChild(el("span", "wv", w.balance_usd != null ? fmtUsd(w.balance_usd) : "—"));
      row.appendChild(el("span", "wa", (w.posisi != null
        ? ("posisi ntl $" + Math.round(w.posisi).toLocaleString("id-ID"))
        : "spot/cefi") + (w.sumber ? " · via " + w.sumber : "")));
      var lk = el("span", "wl");
      var url = explorerUrl(oc, w.chain, "addr", w.addr);
      if (url) {
        var x = el("a", "wlink", "profil ↗"); x.href = url; x.target = "_blank"; x.rel = "noopener";
        x.title = "riwayat lengkap di explorer";
        lk.appendChild(x);
      }
      row.appendChild(lk);
      host.appendChild(row);
    });
  }

  function render() {
    var oc = (DATA || {}).onchain;
    if (!oc) {
      $("#state").textContent = "no data";
      $("#dot").classList.add("stale");
      $("#wg-sub").textContent = "blok onchain belum ada di data.json — menunggu siklus bot berikutnya";
      return;
    }
    $("#state").textContent = "live";
    $("#dot").classList.remove("stale");
    $("#stamp").textContent = oc.updated || "—";
    renderRingkas(oc);
    renderFilter();
    renderRows();
    renderWallets(oc);
  }

  function load(first) {
    fetch("data.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        DATA = j; LEFT = 60; render();
      })
      .catch(function () {
        if (!DATA) { $("#state").textContent = "no data"; $("#dot").classList.add("stale"); }
      });
  }

  /* ══════════════════════════════════════════════════════════════════
     CEK ARAH KOIN — LIVE (24 Sep v2, permintaan user)
     ──────────────────────────────────────────────────────────────────
     Ketik simbol (mis. ZEC) → dua sumber digabung:
     1. BINANCE FUTURES aggTrades → arus taker per menit (grafik besar).
        "buyer is maker" = taker agresif MENJUAL. Uang nyata yang sabar
        tidak — penekan arah paling jujur.
     2. GECKOTERMINAL → DAFTAR transaksi DEX terakhir: alamat wallet,
        BUY/SELL, jumlah token, nilai USD, pool/DEX-nya, link tx.
        INI yang menjawab "siapa saja, dari mana" — tabel live di bawah
        grafik, disegarkan tiap 30 detik selama simbol aktif.
     ══════════════════════════════════════════════════════════════════ */
  var GT = "https://api.geckoterminal.com/api/v2";
  var GT_NET_TX = {   // explorer tx per network GeckoTerminal
    "eth": "https://etherscan.io/tx/{h}", "bsc": "https://bscscan.com/tx/{h}",
    "arbitrum": "https://arbiscan.io/tx/{h}", "base": "https://basescan.org/tx/{h}",
    "polygon_pos": "https://polygonscan.com/tx/{h}", "solana": "https://solscan.io/tx/{h}",
    "sui": "https://suiscan.xyz/mainnet/tx/{h}", "avax": "https://snowtrace.io/tx/{h}",
    "optimism": "https://optimistic.etherscan.io/tx/{h}", "zksync": "https://explorer.zksync.io/tx/{h}",
    "linea": "https://lineascan.build/tx/{h}", "mantle": "https://mantlescan.xyz/tx/{h}",
    "blast": "https://blastscan.io/tx/{h}"
  };
  /* ⚠️ id pool GT = "<net>_<alamat>" — TAPI net bisa mengandung "_"
     (polygon_pos!). split("_")[0] salah — parse dgn daftar net dikenal,
     terpanjang dulu. (Bug nyata ditemukan saat bikin dropdown jaringan.) */
  var GT_NETS = ["polygon_pos", "binance-smart-chain", "arbitrum", "optimism",
                 "solana", "ethereum", "eth", "bsc", "base", "sui", "avax",
                 "zksync", "linea", "mantle", "blast", "cronos", "pulse"];
  function gtParseNet(id) {
    var order = GT_NETS.slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < order.length; i++) {
      if (id.indexOf(order[i] + "_") === 0) return { net: order[i], pid: id.substring(order[i].length + 1) };
    }
    var u = id.indexOf("_");
    return u > 0 ? { net: id.substring(0, u), pid: id.substring(u + 1) }
                 : { net: id, pid: id };
  }
  var QACTIVE = null;      // {symF, poolsP, sel, timer} — sel = pool terpilih
  var QCACHE = {};         // sym → {at, pools:[…]} (10 mnt)
  /* 24 Sep (permintaan user): sorot baris BARU sejak refresh terakhir.
     QSEEN = kunci trade yang sudah tampil; konteks = pool+filter, ganti
     konteks (search baru / pindah jaringan / ganti chip) → reset tanpa
     animasi, biar tidak seluruh tabel berkedip palsu. */
  var QSEEN = {}, QSEEN_CTX = "";
  /* Filter whale-print (24 Sep): default = chip TERENDAH $10rb (permintaan
     user — $100rb terlalu tinggi utk pool yang sedang tenang). Chip cepat
     $10rb/$100rb/$1jt/$5jt, tersimpan localStorage. */
  var QMIN = 1e4;
  try { QMIN = +(localStorage.getItem("qkuk_wmin")) || 1e4; } catch (e) {}
  function setMin(v) {
    QMIN = v;
    try { localStorage.setItem("qkuk_wmin", String(v)); } catch (e) {}
    refreshLive();   // ambil ulang daftar dengan ambang baru, segera
  }

  function gtGet(url, coba) {
    /* GeckoTerminal membatasi request agresif (terjadi nyata 24 Sep: tabel
       kosong diam-diam). Retry sekali utk 429/5xx, lalu error dgn pesan
       jelas — JANGAN pernah mengosongkan tabel tanpa keterangan. */
    coba = coba || 0;
    return fetch(url, { headers: { "Accept": "application/json" } }).then(function (r) {
      if (!r.ok) {
        if (coba < 1 && (r.status === 429 || r.status >= 500)) {
          return new Promise(function (res) { setTimeout(res, 1500); })
            .then(function () { return gtGet(url, coba + 1); });
        }
        throw new Error(r.status === 429
          ? "kena batas API GeckoTerminal — menunggu beberapa detik lalu segarkan lagi"
          : "HTTP " + r.status);
      }
      return r.json();
    });
  }
  function gtSearchPool(sym) {
    var cached = QCACHE[sym];
    if (cached && Date.now() - cached.at < 600000) {
      return Promise.resolve(cached.pools);
    }
    return gtGet(GT + "/search/pools?query=" + encodeURIComponent(sym) + "&include=base_token&page=1")
      .then(function (j) {
        var raw = (j.data || []).filter(function (p) {
          var a = p.attributes || {};
          var v = a.volume_usd;
          var h24 = (v && typeof v === "object") ? (+v.h24 || 0) : (+v || 0);
          return h24 > 0;
        });
        if (!raw.length) throw new Error("pool tidak ditemukan");
        raw.sort(function (x, y) {   // volume 24j terbesar = paling likuid
          var vx = x.attributes.volume_usd, vy = y.attributes.volume_usd;
          var nx = (vx && typeof vx === "object") ? (+vx.h24 || 0) : (+vx || 0);
          var ny = (vy && typeof vy === "object") ? (+vy.h24 || 0) : (+vy || 0);
          return ny - nx;
        });
        /* semua kandidat → daftar pilihan dropdown jaringan (24 Sep);
           satu simbol sering aktif di banyak chain (ARB: arbitrum+eth+solana) */
        var pools = [], seen = {};
        raw.slice(0, 20).forEach(function (p) {
          var np = gtParseNet(p.id);
          if (!np.pid || seen[np.net]) return;   // satu pool terbaik per jaringan
          seen[np.net] = 1;
          var baseAddr = null, baseSym = sym;
          try {
            var rel = p.relationships.base_token.data.id;
            (j.included || []).forEach(function (i) {
              if (i.type === "token" && i.id === rel) {
                baseAddr = i.id.substring(np.net.length + 1);
                baseSym = i.attributes.symbol || sym;
              }
            });
          } catch (e) {}
          pools.push({ net: np.net, pid: np.pid, name: p.attributes.name || sym,
                       baseAddr: baseAddr, baseSym: baseSym,
                       reserve: +((p.attributes || {}).reserve_in_usd || 0) });
        });
        if (!pools.length) throw new Error("pool tidak ditemukan");
        QCACHE[sym] = { at: Date.now(), pools: pools };
        return pools;
      });
  }
  function gtTrades(pool, minUsd) {
    /* ⚠️ tanpa clamp 50rb — dulu sisi API di-clamp ≥$50rb sehingga chip
       $10rb/$1rb tidak pernah menampilkan trade di bawah $50rb (bug) */
    var url = GT + "/networks/" + pool.net + "/pools/" + encodeURIComponent(pool.pid)
      + "/trades?trade_volume_in_usd_greater_than=" + Math.max(1000, Math.round(minUsd || 1000));
    return gtGet(url).then(function (j) {
      return (j.data || []).map(function (t) {
        var a = t.attributes || {};
        var buy = a.kind === "buy";
        var amt, usd;
        if (buy) { amt = +a.to_token_amount; usd = amt * (+a.price_to_in_usd || 0); }
        else     { amt = +a.from_token_amount; usd = amt * (+a.price_from_in_usd || 0); }
        // aman: hanya baris yang benar2 melibatkan base token pool
        var libat = pool.baseAddr &&
          (a.to_token_address === pool.baseAddr || a.from_token_address === pool.baseAddr);
        return { t: a.block_timestamp, wallet: a.tx_from_address || "", buy: buy,
                 amt: amt, usd: usd, tx: a.tx_hash || "", libat: !!libat };
      }).filter(function (r) { return r.libat && r.amt > 0; });
    });
  }
  function gtTxUrl(net, hash) {
    var t = GT_NET_TX[net];
    return t ? t.replace("{h}", hash)
             : "https://geckoterminal.com/" + net + "/pools";   // fallback halaman network
  }

  /* ── Binance arus taker per menit (chart) ── */
  function aggUrl(sym, ms) {
    return "https://fapi.binance.com/fapi/v1/aggTrades?symbol=" + sym
      + "&startTime=" + ms + "&limit=1000";
  }
  function fetchAll(sym, ms, acc, cb) {
    fetch(aggUrl(sym, ms)).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (arr) {
      acc = acc.concat(arr);
      if (arr.length >= 1000 && acc.length < 9000) {
        var next = arr[arr.length - 1].T + 1;
        if (Date.now() - next > 500) return fetchAll(sym, next, acc, cb);
      }
      cb(acc);
    }).catch(function () { cb(acc); });
  }
  function binanceFlow(sym, cb) {
    var sekarang = Date.now();
    fetchAll(sym, sekarang - 30 * 60e3, [], function (trades) {
      if (!trades.length) { cb(null); return; }
      var perMin = {}, lastPx = trades[trades.length - 1].p;
      trades.forEach(function (t) {
        var mnt = Math.floor(t.T / 60000) * 60000;
        var q = +t.q, m = t.m;
        var b = perMin[mnt] || (perMin[mnt] = { s: 0, b: 0, pv: 0 });
        if (m) b.s += q; else b.b += q;
        b.pv += q * (+t.p);
      });
      cb({ perMin: perMin, px: lastPx, n: trades.length });
    });
  }

  /* ── render hasil cek ── */
  /* 24 Sep (permintaan user): verdict = futures + DEX — DEX tak boleh
     diabaikan. Aturan jujur: futures arah (≥56/≤44) menang; kalau futures
     seimbang tapi DEX mayoritas (≥55/≤45 — jumlah trade lebih sedikit,
     ambang longgar), verdict = arah DEX dgn tanda "(DEX)"; bila saling
     berlawanan, sub menjelaskan divergensi. */
  function updateVerdict() {
    var Q = QACTIVE;
    if (!Q || Q.futPctB == null) return;
    var pctB = Q.futPctB;
    var fut = pctB >= 56 ? "beli" : pctB <= 44 ? "jual" : null;
    var dex = null, dexPctB = null;
    if (Q.dexPct && Q.dexPct.total > 0) {
      dexPctB = Q.dexPct.pctB;
      dex = dexPctB >= 55 ? "beli" : dexPctB <= 45 ? "jual" : null;
    }
    var arah, warna, kalimat;
    var LBL = { beli: "MAYORITAS BELI", jual: "MAYORITAS JUAL" };
    if (fut && dex && fut === dex) {
      arah = LBL[fut]; warna = fut === "beli" ? "var(--up)" : "var(--dn)";
      kalimat = "futures & DEX SEPAKAT — agresif " + fut + " dominan di dua sisi";
    } else if (fut) {
      arah = LBL[fut]; warna = fut === "beli" ? "var(--up)" : "var(--dn)";
      kalimat = "agresif " + fut + " dominan di futures"
        + (dex ? " — DEX berlawanan (" + dex + " " + dexPctB.toFixed(1) + "% beli), hati-hati" : "");
    } else if (dex) {
      arah = LBL[dex] + " (DEX)"; warna = dex === "beli" ? "var(--up)" : "var(--dn)";
      kalimat = "futures seimbang, tapi DEX mayoritas " + dex
        + " (" + dexPctB.toFixed(1) + "% beli) — didorong aliran on-chain";
    } else {
      arah = "SEIMBANG"; warna = "var(--gold)";
      kalimat = "futures & DEX hampir seimbang — arah belum dipilih, tunggu konfirmasi";
    }
    var big = document.getElementById("q-big"), sub = document.getElementById("q-sub");
    if (big) { big.textContent = arah; big.style.color = warna; }
    if (sub) sub.textContent = kalimat;
  }

  function paintChart(sym, f) {
    var host = $("#q-chart"); host.innerHTML = "";
    var keys = Object.keys(f.perMin).sort();
    var totS = 0, totB = 0, totPv = 0;
    keys.forEach(function (k) {
      totS += f.perMin[k].s; totB += f.perMin[k].b; totPv += f.perMin[k].pv;
    });
    var pctB = totB + totS > 0 ? 100 * totB / (totB + totS) : 50;
    if (QACTIVE && QACTIVE.symF === sym) QACTIVE.futPctB = pctB;
    /* kepala: simbol + harga + verdict (diisi updateVerdict — futures+DEX) */
    var hd = el("div", "qhead");
    var hL = el("div", "qhl");
    hL.appendChild(el("div", "qsym", sym));
    hL.appendChild(el("div", "qpx", "harga terakhir $" + fmtPx(f.px)));
    var hR = el("div", "qhr");
    var big = el("div", "qbig"); big.id = "q-big";
    var sub = el("div", "qsub"); sub.id = "q-sub";
    hR.appendChild(big); hR.appendChild(sub);
    hd.appendChild(hL); hd.appendChild(hR);
    host.appendChild(hd);
    updateVerdict();
    /* statistik 4 kotak */
    var st = el("div", "qstats");
    function stat(l, v, c) {
      var x = el("div", "qstat");
      x.appendChild(el("span", null, l));
      var b = el("b", c || "", v); x.appendChild(b);
      return x;
    }
    var cakup = Math.round((+keys[keys.length - 1] - +keys[0]) / 60000) + 1;
    st.appendChild(stat("dominasi beli", pctB.toFixed(1) + "%", pctB >= 56 ? "up" : pctB <= 44 ? "dn" : ""));
    st.appendChild(stat("volume futures", fmtUsd(totPv)));
    st.appendChild(stat("cakupan", cakup + " mnt"));
    st.appendChild(stat("harga sekarang", "$" + fmtPx(f.px)));
    host.appendChild(st);
    /* bar beli vs jual */
    var bar = el("div", "qbar");
    var bB = el("i", "qb"), bS = el("i", "qs");
    bB.style.width = pctB.toFixed(1) + "%";
    bS.style.width = (100 - pctB).toFixed(1) + "%";
    bar.appendChild(bB); bar.appendChild(bS);
    host.appendChild(bar);
    var bl = el("div", "qbarl");
    bl.appendChild(el("span", null, "beli " + pctB.toFixed(1) + "%"));
    bl.appendChild(el("span", null, "arus taker futures · " + keys.length + " menit aktif"));
    bl.appendChild(el("span", null, "jual " + (100 - pctB).toFixed(1) + "%"));
    host.appendChild(bl);
    /* GRAFIK BESAR: batang divergen dari garis nol — hijau ke atas (beli
       dominan menit itu), merah ke bawah (jual dominan). 140px, gradient,
       hover detail. */
    var maks = 1;
    keys.forEach(function (k) {
      var d = f.perMin[k];
      var net = Math.abs(d.b - d.s);
      if (net > maks) maks = net;
    });
    var wrap = el("div", "qchart-big");
    var mini = el("div", "qmini2");
    var p2 = function (n) { return ("0" + n).slice(-2); };
    keys.slice(-40).forEach(function (k) {
      var d = f.perMin[k];
      var net = d.b - d.s;
      var hPct = Math.max(4, Math.round(100 * Math.abs(net) / maks));
      var col = el("div", "qcol2");
      var barIn = el("i", net >= 0 ? "qu" : "qd");
      barIn.style.height = hPct + "%";
      col.appendChild(barIn);
      var jam = new Date(+k + 7 * 3600e3);
      var pB = 100 * d.b / (d.b + d.s || 1);
      col.title = p2(jam.getUTCHours()) + ":" + p2(jam.getUTCMinutes())
        + " — beli " + pB.toFixed(0) + "% · jual " + (100 - pB).toFixed(0) + "%"
        + " · " + fmtUsd(d.pv);
      mini.appendChild(col);
    });
    var zero = el("div", "qzero");
    wrap.appendChild(mini); wrap.appendChild(zero);
    host.appendChild(wrap);
    var cap = el("div", "qcap",
      "hijau = menit dgn agresif BELI lebih besar (naik dari garis) · merah = agresif JUAL (turun) · hover utk detail per menit");
    host.appendChild(cap);
    var leg = el("div", "qleg");
    leg.appendChild(el("span", null, "Sumber futures: Binance USDⓈ-M (aggTrades, live dari browser)"));
    host.appendChild(leg);
  }

  function paintTrades(pool, rows, err) {
    var host = $("#q-trades"); host.innerHTML = "";
    var hd = el("div", "qthd");
    var tL = el("div", "qtl");
    tL.appendChild(el("b", null, "Transaksi " + (pool.baseSym || "") + " di DEX"));
    tL.appendChild(el("span", "qvenue", pool.name + " · " + pool.net.toUpperCase()
      + (pool.reserve ? " · likuiditas " + fmtUsd(pool.reserve) : "")));
    var tR = el("div", "qtr");
    var live = el("span", "qlive");
    live.appendChild(el("i", "qdot"));
    live.appendChild(el("span", "qstamp", "live · segar " + new Date(Date.now() + 7 * 3600e3).toTimeString().slice(0, 8) + " WIB"));
    tR.appendChild(live);
    hd.appendChild(tL); hd.appendChild(tR);
    host.appendChild(hd);
    /* chip filter whale-print */
    var chips = el("div", "qchips");
    chips.appendChild(el("span", "qchipsl", "tampilkan hanya ≥"));
    [[1e3, "$1rb"], [1e4, "$10rb"], [1e5, "$100rb"], [1e6, "$1jt"], [5e6, "$5jt"]].forEach(function (p) {
      var c = el("button", "qchip" + (QMIN === p[0] ? " on" : ""), p[1]);
      c.type = "button";
      c.title = "filter transaksi minimal " + p[1];
      c.addEventListener("click", function () { setMin(p[0]); });
      chips.appendChild(c);
    });
    host.appendChild(chips);
    if (err) {
      host.appendChild(el("div", "qerr", "gagal memuat: " + (err.message || err)
        + " — tabel terakhir dipertahankan bila ada"));
      return;
    }
    if (!rows || !rows.length) {
      host.appendChild(el("div", "qerr", "tidak ada transaksi ≥ " + fmtUsd(QMIN)
        + " yang terbaca baru-baru ini di pool ini — turunkan filter di atas bila pool lebih tenang"));
      return;
    }
    var totB = 0, totS = 0;
    rows.forEach(function (r) { if (r.buy) totB += r.usd; else totS += r.usd; });
    var pctBd = totB + totS > 0 ? 100 * totB / (totB + totS) : 50;
    if (QACTIVE) QACTIVE.dexPct = { pctB: pctBd, total: totB + totS };
    var sum = el("div", "qsum");
    sum.appendChild(el("span", "qsu up", "DEX beli " + fmtUsd(totB)));
    var md = el("span", "qsm");
    var bar = el("i", "qsumbar");
    bar.style.background = "linear-gradient(90deg, var(--up) " + pctBd.toFixed(0) + "%, var(--dn) " + pctBd.toFixed(0) + "%)";
    md.appendChild(bar);
    sum.appendChild(md);
    sum.appendChild(el("span", "qsu dn", "jual " + fmtUsd(totS)));
    var vtxt = pctBd >= 55 ? "mayoritas BELI" : pctBd <= 45 ? "mayoritas JUAL" : "seimbang";
    var vcls = pctBd >= 55 ? "up" : pctBd <= 45 ? "dn" : "mid";
    sum.appendChild(el("b", "qsumv " + vcls, vtxt + " · " + pctBd.toFixed(1) + "% beli"));
    host.appendChild(sum);
    updateVerdict();
    /* tabel: waktu · wallet · aksi · jumlah · nilai · venue · tx */
    var tab = el("div", "wtable qtab");
    var head = el("div", "whead qgrid");
    ["waktu", "wallet", "aksi", "jumlah", "nilai", "venue", ""].forEach(function (h) {
      head.appendChild(el("span", null, h));
    });
    tab.appendChild(head);
    /* kunci konteks: pool + filter — ganti konteks = reset SENYAP (semua
       baris pertama dicatat tanpa animasi), biar hanya trade yang benar2
       BARU setelah refresh berikutnya yang berkedip */
    var ctx = pool.net + "|" + pool.pid + "|" + QMIN;
    var seed = QSEEN_CTX !== ctx;
    if (seed) { QSEEN = {}; QSEEN_CTX = ctx; }
    var body = el("div", null);
    var nWhaleBaru = 0, nMegaBaru = 0, megaFirst = null;
    rows.slice(0, 25).forEach(function (r) {
      var row = el("div", "wrow qgrid");
      var kunci = r.tx + ":" + r.wallet + ":" + Math.round(r.amt * 1e6);
      var baru = !QSEEN[kunci] && !seed;
      QSEEN[kunci] = 1;
      if (baru && r.usd >= 2e7) { nMegaBaru++; if (!megaFirst) megaFirst = r; }   // ≥ $20jt → alarm MEGA
      else if (baru && r.usd >= 1e6) nWhaleBaru++;   // ≥ $1jt → suara biasa
      if (baru) {
        row.classList.add("qnew", r.buy ? "qn-up" : "qn-dn");
      }
      var d = new Date(new Date(r.t).getTime() + 7 * 3600e3);
      var p2 = function (n) { return ("0" + n).slice(-2); };
      var wt = el("span", "wt", p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes()) + ":" + p2(d.getUTCSeconds()));
      if (baru) {
        wt.appendChild(el("b", "qnewtag", "BARU"));
        setTimeout(function () {   // tag hilang bersamaan dgn selesai animasi
          var t = wt.querySelector(".qnewtag");
          if (t) t.remove();
        }, 4000);
      }
      row.appendChild(wt);
      var wa = el("span", "waddr");
      wa.textContent = r.wallet ? (r.wallet.slice(0, 8) + "…" + r.wallet.slice(-6)) : "—";
      wa.title = "klik utk salin alamat";
      wa.addEventListener("click", (function (w) {
        return function () {
          try { navigator.clipboard.writeText(w); toast("alamat disalin"); } catch (e) { toast("gagal menyalin"); }
        };
      })(r.wallet));
      row.appendChild(wa);
      var wcell = el("span", "ww");
      wcell.appendChild(el("span", "wj " + (r.buy ? "beli" : "jual"), r.buy ? "BELI" : "JUAL"));
      /* 24 Sep (permintaan user): dua tingkat badge —
         ≥ $20jt : 🔥 WHALE BESAR (api menyala — whale print ekstrem)
         ≥ $10jt : 🐋 WHALE (merah) */
      if (r.usd >= 2e7) {
        var wb2 = el("b", "wmega2", "🔥 WHALE BESAR");
        wb2.title = "whale print ekstrem ≥ $20jt — nilai " + fmtUsd(r.usd);
        wcell.appendChild(wb2);
      } else if (r.usd >= 1e7) {
        var wb = el("b", "wwhale", "🐋 WHALE");
        wb.title = "whale print ≥ $10jt — nilai " + fmtUsd(r.usd);
        wcell.appendChild(wb);
      }
      row.appendChild(wcell);
      row.appendChild(el("span", "wn", (r.amt >= 1000 ? r.amt.toLocaleString("id-ID", { maximumFractionDigits: 0 }) : r.amt.toFixed(r.amt >= 1 ? 3 : 6)) + " " + (pool.baseSym || "")));
      row.appendChild(el("span", "wv" + (r.usd >= 1e5 ? " mega" : ""), fmtUsd(r.usd)));
      row.appendChild(el("span", "wa", pool.name + " · " + pool.net));
      var lk = el("span", "wl");
      var u = gtTxUrl(pool.net, r.tx);
      if (r.tx && u) {
        var x = el("a", "wlink", "tx ↗"); x.href = u; x.target = "_blank"; x.rel = "noopener";
        lk.appendChild(x);
      }
      row.appendChild(lk);
      body.appendChild(row);
    });
    tab.appendChild(body);
    host.appendChild(tab);
    if (nMegaBaru > 0) {
      wDing("mega");          // 🔥 alarm suara khusus
      deskMega([megaFirst]);  // 🖥 notifikasi desktop (walau tab aktif)
    } else if (nWhaleBaru > 0) wDing();      // suara terminal utk whale print biasa
    var ft = el("div", "qcap", "Semua transaksi on-chain DEX via GeckoTerminal — wallet = tx_from (pengirim sesungguhnya). Link tx mengarah ke explorer jaringan masing-masing (Etherscan utk ETH, Basescan utk Base, BscScan utk BSC, dst). 25 terbaru dari " + rows.length + " trade ≥ " + fmtUsd(QMIN) + ".");
    host.appendChild(ft);
  }

  function paintQError(msg) {
    var host = $("#q-chart"); host.innerHTML = "";
    host.appendChild(el("div", "qerr", msg));
    $("#q-trades").innerHTML = "";
  }

  function stopLive() {
    if (QACTIVE && QACTIVE.timer) { clearInterval(QACTIVE.timer); QACTIVE.timer = null; }
  }
  function refreshLive() {
    if (!QACTIVE) return;
    var symF = QACTIVE.symF, poolsP = QACTIVE.poolsP;
    poolsP.then(function (pools) {
      var pool = QACTIVE.sel || pools[0];
      if (pool) {
        QACTIVE.sel = pool;
        gtTrades(pool, QMIN).then(function (rows) { paintTrades(pool, rows); })
          .catch(function (e) {   // jaga tabel terakhir; error hanya bila kosong
            if (!document.querySelector("#q-trades .wrow")) paintTrades(pool, null, e);
          });
      }
    }).catch(function () {});
    binanceFlow(symF, function (f) { if (f) paintChart(symF, f); });
  }
  function cekKoin(silent) {
    var raw = ($("#q-coin").value || "").trim().toUpperCase();
    if (!raw) return;
    stopLive();
    var symF = raw.endsWith("USDT") ? raw : raw + "USDT";
    if (!silent) {
      $("#q-chart").innerHTML = "";
      $("#q-trades").innerHTML = "";
      $("#q-chart").appendChild(el("div", "qload", "menghitung arus taker " + symF + " & mencari pool DEX terlikuid …"));
    }
    var poolsP;
    try {
      poolsP = gtSearchPool(raw);
    } catch (e) { poolsP = Promise.reject(e); }
    QACTIVE = { symF: symF, poolsP: poolsP, sel: null, timer: null };
    poolsP.then(function (pools) {
      if (!QACTIVE || QACTIVE.symF !== symF) return;
      QACTIVE.pools = pools;   // ⚠️ wajib — paintTrades baca ini utk dropdown
      var pool = pools[0];
      QACTIVE.sel = pool;
      gtTrades(pool, QMIN).then(function (rows) { paintTrades(pool, rows); })
        .catch(function (e) { paintTrades(pool, null, e); });
    }).catch(function (e) {
      if (!QACTIVE || QACTIVE.symF !== symF) return;
      $("#q-trades").innerHTML = "";
      $("#q-trades").appendChild(el("div", "qerr",
        raw + " di DEX: " + (e && e.message ? e.message : "tidak ditemukan") +
        " — cek arah futures di panel tetap jalan"));
    });
    binanceFlow(symF, function (f) {
      if (!QACTIVE || QACTIVE.symF !== symF) return;
      if (!f) {
        if (!silent) paintQError(symF + ": tidak ada data futures (kode koin salah / tak ada di Binance USDⓈ-M)");
        return;
      }
      paintChart(symF, f);
    });
    QACTIVE.timer = setInterval(refreshLive, 30000);   // LIVE: segar tiap 30 dtk
  }

  /* ── jam & countdown ── */
  function clock() {
    var d = new Date(Date.now() + 7 * 3600e3);
    var p = function (n) { return ("0" + n).slice(-2); };
    $("#clock").textContent = p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds());
  }
  setInterval(function () {
    LEFT = Math.max(0, LEFT - 1);
    $("#cd").textContent = LEFT + "s";
  }, 1000);

  gateInit();
  clock();
  deskBtnInit();
  if (isLogged()) { load(true); setInterval(function () { load(false); }, 60000); }
  setInterval(clock, 1000);
  (function () {
    var qi = document.getElementById("q-coin"), qb = document.getElementById("q-btn");
    if (!qi || !qb) return;
    qb.addEventListener("click", function () { cekKoin(false); });
    qi.addEventListener("keydown", function (ev) { if (ev.key === "Enter") cekKoin(false); });
  })();
  /* ?soundtest=1 — mainkan suara terpilih sekali (uji volume/jenis tanpa
     menunggu whale print nyata). Autoplay policy: butuh satu interaksi
     (klik/keydown) lebih dulu, jadi diuji setelah gate MASUK diklik.
     Hook __wDingTest() tersedia di console utk uji manual. */
  if (location.search.indexOf("soundtest=1") > -1) {
    setTimeout(wDing, 800);
    if (location.search.indexOf("mega=1") > -1) {
      setTimeout(function () { wDing("mega"); }, 2200);   // preview alarm MEGA
    }
    window.__wDingTest = wDing;
  }
})();
