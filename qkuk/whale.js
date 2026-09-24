/* whale.js — tab Whale on-chain (24 Sep).
   Halaman TERPISAH dari terminal: gate login sama (kredensial & sesi sama,
   sessionStorage qkuk_admin_ok/qkuk_user_ok), tema sama, data dari data.json
   blok "onchain" yang dipoll server bot (browser tak memanggil API on-chain). */
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

  /* ── state ── */
  var DATA = null, FILTER = "semua", LEFT = 0;

  function jamWib(tsWib) {
    // "2026-09-24 10:36" → "24 Sep 10:36"
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
    r("sumber", "mempool.space · Etherscan V2 · publicnode SUI · Hyperliquid", "mut");
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
    var W = oc.wallets || [];
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
      row.appendChild(el("span", "wn", w.balance != null ? w.balance.toFixed(4) : "—"));
      row.appendChild(el("span", "wv", w.balance_usd != null ? fmtUsd(w.balance_usd) : "—"));
      row.appendChild(el("span", "wa", w.posisi != null ? ("posisi ntl $" + Math.round(w.posisi).toLocaleString("id-ID")) : "spot/cefi"));
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
  if (isLogged()) { load(true); setInterval(function () { load(false); }, 60000); }
  setInterval(clock, 1000);
})();
