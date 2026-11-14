/* panel.js — halaman riwayat debat panel bayangan Qkuk Terminal.
   Membaca data.json (bot.panel_riwayat + bot.panel_nilai), merender tabel
   yang bisa disaring. Tanpa dependensi, tanpa inline script (CSP halaman
   utama tetap aman). */
(function () {
  "use strict";

  var ROWS = [], ALL = [], NV = {}, META = {};
  var $ = function (id) { return document.getElementById(id); };

  function el(t, c, x) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (x != null) n.textContent = x;
    return n;
  }
  function num(v) { var f = parseFloat(v); return isFinite(f) ? f : null; }
  function sgn(v, d) {
    var f = num(v);
    return f === null ? "—" : (f > 0 ? "+" : "") + f.toFixed(d == null ? 2 : d);
  }
  function vonis(suara) {
    var s = num((suara || {}).setuju) || 0, t = num((suara || {}).tolak) || 0;
    return t > s ? "lawan" : s > t ? "dukung" : "netral";
  }
  function waktu(ts) {
    return String(ts || "").replace("T", " ").slice(5, 16);
  }
  function render() {
    var v = $("f-vonis").value, e = $("f-engine").value, q = ($("f-sym").value || "").toUpperCase();
    var rows = ROWS.filter(function (r) {
      if (v && r.vonis !== v) return false;
      if (e && r.kanal !== e) return false;
      if (q && String(r.sym || "").toUpperCase().indexOf(q) === -1) return false;
      return true;
    });
    var tbl = $("tbl"); tbl.innerHTML = "";
    if (!rows.length) { tbl.appendChild(el("div", "kosong", "tidak ada baris yang cocok")); return; }
    var table = el("table");
    var thead = el("thead"), tr = el("tr");
    ["waktu", "pair", "engine / arah", "skor", "5 analis", "debat", "agent (LLM)", "nyata"].forEach(function (h) {
      tr.appendChild(el("th", null, h));
    });
    thead.appendChild(tr); table.appendChild(thead);
    var tb = el("tbody");
    rows.forEach(function (r) {
      var row = el("tr");
      row.appendChild(el("td", "dim", waktu(r.ts)));
      var tdS = el("td"); tdS.appendChild(el("b", null, r.sym || "—")); row.appendChild(tdS);
      row.appendChild(el("td", null, (r.kanal || "—") + " · " + (r.dir || "—")));
      row.appendChild(el("td", "n", r.skor == null ? "—" : r.skor));
      var tdA = el("td");
      (r.klaim || []).forEach(function (c) {
        var ch = el("span", "pill " + (c.dukung === r.dir ? "pos" : c.dukung ? "neg" : "dim"),
          ({ technical: "T", microstructure: "µ", regime: "R", memory: "M", fade: "F" }[c.analis] || "?")
          + (c.dukung ? (c.dukung === r.dir ? "✓" : "✗") : "·"));
        ch.title = c.analis + " · yakin " + (c.yakin == null ? "—" : c.yakin) + " · " + (c.ringkas || "");
        tdA.appendChild(ch);
      });
      row.appendChild(tdA);
      var tdD = el("td");
      var key = num((r.debat || {}).keyakinan);
      tdD.appendChild(el("span", "n", key == null ? "—" : key));
      tdD.appendChild(el("span", "dim", " " + vonis(r.suara)));
      var bl = ((r.debat || {}).bull || [])[0], br = ((r.debat || {}).bear || [])[0];
      if (bl || br) {
        var cap = el("div", "alasan");
        if (bl) { var a = el("div", "pos", "▲ " + bl); cap.appendChild(a); }
        if (br) { var b = el("div", "neg", "▼ " + br); cap.appendChild(b); }
        tdD.appendChild(cap);
      }
      row.appendChild(tdD);
      var tdL = el("td");
      var la = r.llm || {};
      if (la.aksi) {
        tdL.appendChild(el("span", "pill " + (la.aksi === "setuju" ? "pos" : la.aksi === "tolak" ? "neg" : "warn"),
          la.aksi + (la.keyakinan != null ? " " + la.keyakinan : "")));
        var al = el("div", "alasan", la.alasan || "");
        tdL.appendChild(al);
      } else { tdL.appendChild(el("span", "dim", "—")); }
      row.appendChild(tdL);
      var tdN = el("td");
      var na = r.nyata || {};
      var cls = na.aksi === "eksekusi" ? "pos" : (na.aksi === "ditolak" || na.aksi === "diblokir risiko") ? "neg" : "dim";
      var pn = el("span", "pill " + cls, na.aksi || "—");
      if (na.alasan) pn.title = na.alasan;
      tdN.appendChild(pn);
      row.appendChild(tdN);
      tb.appendChild(row);
    });
    table.appendChild(tb); tbl.appendChild(table);
  }

  function isiFilter() {
    var eng = {};
    ROWS.forEach(function (r) { if (r.kanal) eng[r.kanal] = 1; });
    var sel = $("f-engine");
    Object.keys(eng).sort().forEach(function (k) {
      var o = document.createElement("option"); o.value = k; o.textContent = k; sel.appendChild(o);
    });
    ["f-vonis", "f-engine", "f-sym"].forEach(function (id) {
      $(id).addEventListener("input", render);
      $(id).addEventListener("change", render);
    });
    $("f-reset").addEventListener("click", function () {
      $("f-vonis").value = ""; $("f-engine").value = ""; $("f-sym").value = ""; render();
    });
  }

  function isiRingkas() {
    var host = $("sum"); host.innerHTML = "";
    function chipC(label, val, cls) {
      var c = el("span", "chip " + (cls || ""));
      c.appendChild(el("span", null, label));
      c.appendChild(el("b", null, val));
      host.appendChild(c);
    }
    chipC("kandidat dinilai", NV.n_kandidat == null ? "—" : NV.n_kandidat);
    chipC("trade cocok", (NV.n_tereksekusi == null ? 0 : NV.n_tereksekusi) + "/" + (NV.ambang || 20),
      NV.cukup ? (NV.r_dihindari <= -0.5 ? "pos" : NV.r_dihindari >= 0.5 ? "neg" : "") : "warn");
    if (NV.lawan && NV.lawan.n) chipC("panel lawan · WR", (NV.lawan.wr == null ? "—" : NV.lawan.wr + "%") + " · " + sgn(NV.lawan.r_total) + "R",
      NV.lawan.r_total < 0 ? "pos" : "neg");
    if (NV.dukung && NV.dukung.n) chipC("panel dukung · WR", (NV.dukung.wr == null ? "—" : NV.dukung.wr + "%") + " · " + sgn(NV.dukung.r_total) + "R",
      NV.dukung.r_total > 0 ? "pos" : "neg");
    $("vonis").textContent = NV.vonis || "belum ada penilaian";
    if (META.pelajaran) {
      var p = el("div", "cap", "pelajaran agent terakhir: " + META.pelajaran);
      p.style.marginTop = "6px"; $("vonis").appendChild(p);
    }
  }

  function bangun(data) {
    var b = (data || {}).bot || {};
    NV = b.panel_nilai || {};
    var riwayat = b.panel_riwayat || [];
    META = riwayat.length ? riwayat[riwayat.length - 1] : {};
    ALL = []; ROWS = [];
    riwayat.forEach(function (s) {
      (s.kandidat || []).forEach(function (k) {
        var r = {
          ts: s.ts, sym: k.sym, kanal: k.kanal, dir: k.dir, skor: k.skor,
          suara: k.suara || {}, debat: k.debat || {}, klaim: k.klaim || [],
          llm: k.llm || {}, nyata: k.nyata || {},
          vonis: vonis(k.suara),
          catatan: s.catatan || "", sumber: s.sumber || ""
        };
        ROWS.push(r);
      });
    });
    ROWS.reverse();  // terbaru di atas
    isiRingkas(); isiFilter(); render();
  }

  fetch("data.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(bangun)
    .catch(function (e) {
      $("tbl").innerHTML = "";
      $("tbl").appendChild(el("div", "kosong", "gagal memuat data: " + e));
    });
})();
