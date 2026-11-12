/* QKUK — halaman riwayat posisi bot (12 Nov 2026).
   Membaca data.json yang sama dengan panel utama (tanpa API tambahan), lalu
   menyaring `bot.riwayat_penuh` per engine / pair / hasil di sisi klien.
   Tidak ada state tersimpan: muat ulang halaman = saringan bersih. */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var DATA = null;

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function fp(v) {
    var n = num(v);
    if (n == null) return "—";
    if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return n.toPrecision(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  function usd(v) {
    var n = num(v);
    if (n == null) return "—";
    return (n < 0 ? "−$" : "+$") + Math.abs(n).toFixed(2);
  }
  function durasi(m) {
    var n = num(m);
    if (n == null) return "—";
    return n < 90 ? Math.round(n) + " mnt" : (n / 60).toFixed(1) + " jam";
  }
  function kelasUsd(v) {
    var n = num(v);
    return "n " + (n == null ? "dim" : n < 0 ? "neg" : "pos");
  }
  function kanalList(r) {
    var ks = (r.kanal_ikut && r.kanal_ikut.length) ? r.kanal_ikut : [r.kanal];
    return ks.filter(Boolean).map(function (k) { return String(k).toUpperCase(); });
  }

  function opsi(sel, daftar, semua) {
    sel.innerHTML = "";
    var o = el("option", null, semua);
    o.value = "";
    sel.appendChild(o);
    daftar.forEach(function (v) {
      var x = el("option", null, v);
      x.value = v;
      sel.appendChild(x);
    });
  }

  function cocok(r, eng, pair, hasil) {
    if (eng && kanalList(r).indexOf(eng) < 0) return false;
    if (pair && String(r.sym).toUpperCase() !== pair) return false;
    var n = num(r.r);
    if (hasil === "menang" && !(n > 0)) return false;
    if (hasil === "kalah" && !(n < 0)) return false;
    return true;
  }

  function ringkas(rows) {
    var n = rows.length, m = 0, r = 0, u = 0, adaUsd = false;
    rows.forEach(function (x) {
      var rr = num(x.r) || 0;
      if (rr > 0) m++;
      r += rr;
      var uu = num(x.usd);
      if (uu != null) { u += uu; adaUsd = true; }
    });
    return { n: n, m: m, wr: n ? m / n * 100 : null, r: r, usd: adaUsd ? u : null };
  }

  var KOLOM = [
    { h: "waktu", c: function (r) { return el("td", "dim", r.waktu || r.t || "—"); } },
    { h: "engine", c: function (r) { return el("td", "st", kanalList(r).join(" + ") || "—"); } },
    { h: "pair", c: function (r) { return el("td", null, r.sym || "—"); } },
    { h: "side", c: function (r) {
        var d = String(r.dir || "").toLowerCase();
        return el("td", d === "long" || d === "buy" ? "pos" : "neg",
                  d === "long" || d === "buy" ? "LONG" : "SHORT");
      } },
    { h: "entry", n: 1, c: function (r) { return el("td", "n dim", fp(r.entry)); } },
    { h: "exit", n: 1, c: function (r) { return el("td", "n dim", fp(r.exit)); } },
    { h: "umur", n: 1, c: function (r) { return el("td", "n dim", durasi(r.umur_menit)); } },
    { h: "R", n: 1, c: function (r) {
        var v = num(r.r);
        return el("td", "n " + (v == null ? "dim" : v < 0 ? "neg" : "pos"),
                  v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(2));
      } },
    { h: "$", n: 1, c: function (r) { return el("td", kelasUsd(r.usd), usd(r.usd)); } },
    { h: "status", c: function (r) {
        var td = el("td");
        var cls = r.status_kelas === "pos" ? "pos" : r.status_kelas === "neg" ? "neg"
                : r.status_kelas === "warn" ? "warn" : "dim";
        var p = el("span", "pill " + cls, r.status || "—");
        if (r.hasil) p.title = "hasil: " + r.hasil;
        td.appendChild(p);
        return td;
      } },
    { h: "mode", c: function (r) { return el("td", "dim st", r.mode || "—"); } },
    { h: "catatan", c: function (r) {
        var txt = "";
        if (r.agent && r.agent.alasan) txt = r.agent.alasan;
        else if (r.setup && r.setup.ringkas) txt = r.setup.ringkas;
        else if (r.alasan) txt = String(r.alasan);
        var short = txt ? (txt.length > 44 ? txt.slice(0, 44) + "…" : txt) : "—";
        var td = el("td", "dim", short);
        if (txt) {
          var tip = txt;
          if (r.agent && r.agent.aksi) tip += "  ·  agent: " + r.agent.aksi +
            (r.agent.yakin != null ? " (" + Math.round(r.agent.yakin) + "%)" : "");
          if (r.setup && r.setup.status) tip += "  ·  setup: " + r.setup.status;
          td.title = tip;
        }
        return td;
      } }
  ];

  function gambar(rows) {
    var host = $("#tbl");
    host.innerHTML = "";
    var s = ringkas(rows);
    var sum = $("#sum");
    sum.innerHTML = "";
    var chip = function (l, v, cls) {
      var c = el("span", "chip " + (cls || ""));
      c.appendChild(el("b", null, v));
      c.appendChild(el("span", null, l));
      sum.appendChild(c);
    };
    chip("trade", String(s.n), "mut");
    chip("menang", s.n ? s.m + "/" + s.n : "—", s.m ? "pos" : "mut");
    chip("winrate", s.wr == null ? "—" : s.wr.toFixed(1) + "%",
         s.wr == null ? "mut" : s.wr >= 50 ? "pos" : "neg");
    chip("total R", (s.r > 0 ? "+" : "") + s.r.toFixed(2), s.r >= 0 ? "pos" : "neg");
    if (s.usd != null) chip("total $", usd(s.usd), s.usd >= 0 ? "pos" : "neg");

    if (!rows.length) {
      host.appendChild(el("div", "kosong",
        "Tidak ada posisi tertutup yang cocok dengan saringan ini."));
      return;
    }
    var t = el("table");
    var thead = el("thead"), trh = el("tr");
    KOLOM.forEach(function (k) {
      var th = el("th", k.n ? "n" : null, k.h);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      KOLOM.forEach(function (k) { tr.appendChild(k.c(r)); });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    host.appendChild(t);
  }

  function pasang(rows) {
    var engines = {}, pairs = {};
    rows.forEach(function (r) {
      kanalList(r).forEach(function (k) { engines[k] = 1; });
      if (r.sym) pairs[String(r.sym).toUpperCase()] = 1;
    });
    var e = Object.keys(engines).sort();
    var p = Object.keys(pairs).sort();
    opsi($("#f-engine"), e, "semua engine");
    opsi($("#f-pair"), p, "semua pair");

    var terapkan = function () {
      var eng = $("#f-engine").value, pair = $("#f-pair").value, hasil = $("#f-hasil").value;
      gambar(rows.filter(function (r) { return cocok(r, eng, pair, hasil); }));
    };
    $("#f-engine").addEventListener("change", terapkan);
    $("#f-pair").addEventListener("change", terapkan);
    $("#f-hasil").addEventListener("change", terapkan);
    $("#f-reset").addEventListener("click", function () {
      $("#f-engine").value = "";
      $("#f-pair").value = "";
      $("#f-hasil").value = "";
      terapkan();
    });
    terapkan();
  }

  function muat() {
    fetch("data.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        DATA = d || {};
        var B = DATA.bot || {};
        var rows = (B.riwayat_penuh && B.riwayat_penuh.length) ? B.riwayat_penuh
                 : (B.riwayat || []);
        if (B.ts) $("#cap").textContent = "Sumber: journal bot (zenbnb/autotrade) · data terbit "
          + B.ts + " · " + rows.length + " posisi tertutup tersimpan.";
        pasang(rows.slice());
      })
      .catch(function (e) {
        $("#tbl").innerHTML = "";
        $("#tbl").appendChild(el("div", "kosong",
          "Data belum bisa dimuat (" + e.message + "). Coba muat ulang halaman."));
      });
  }

  muat();
})();
