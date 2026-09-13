/* ═══════════════════════════════════════════════════════════════════
   luthfihadi78.github.io — interaksi
   Tanpa framework, tanpa dependensi. Semuanya luruh dengan anggun:
   tanpa JS halaman tetap terbaca, dan seluruh gerak mati di
   prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var kurang = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── nav ─────────────────────────────────────────────────────── */
  var nav = document.getElementById("nav"), tick = false;
  function scr() {
    if (tick) return; tick = true;
    requestAnimationFrame(function () {
      if (nav) nav.classList.toggle("on", window.scrollY > 20);
      tick = false;
    });
  }
  window.addEventListener("scroll", scr, { passive: true }); scr();

  /* ── baris peran, gaya terminal ──────────────────────────────── */
  var role = document.getElementById("role");
  var BARIS = [
    "Java · Oracle · Kotlin · Python · Solidity",
    "QA on enterprise systems, by day",
    "500+ Web3 testnets since 2019",
    "Autonomous trading, on my own time"
  ];
  if (role) {
    var car = role.querySelector(".car");
    if (kurang) {
      role.insertBefore(document.createTextNode(BARIS[0]), car);
    } else {
      var w = 0, c = 0, hapus = false, node = document.createTextNode("");
      role.insertBefore(node, car);
      (function tik() {
        var s = BARIS[w];
        c += hapus ? -1 : 1;
        node.nodeValue = s.slice(0, c);
        var jeda = hapus ? 26 : 52;
        if (!hapus && c === s.length) { hapus = true; jeda = 2100; }
        else if (hapus && c === 0) { hapus = false; w = (w + 1) % BARIS.length; jeda = 340; }
        setTimeout(tik, jeda);
      })();
    }
  }

  /* ── reveal bertahap ─────────────────────────────────────────── */
  var rv = document.querySelectorAll(".rv");
  if (!("IntersectionObserver" in window) || kurang) {
    Array.prototype.forEach.call(rv, function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var idx = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        setTimeout(function () { el.classList.add("in"); }, Math.min(idx, 6) * 75);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(rv, function (el) { io.observe(el); });
  }

  /* ── hitung naik ─────────────────────────────────────────────── */
  function hitung(el) {
    var t = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (kurang) { el.textContent = t.toLocaleString(); return; }
    var t0 = null, dur = 1400;
    function f(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = Math.round(t * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  var cs = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { hitung(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(cs, function (el) { cio.observe(el); });
  } else { Array.prototype.forEach.call(cs, hitung); }

  /* ── penyaring galeri ────────────────────────────────────────── */
  var fbtn = document.querySelectorAll(".fbtn");
  var kartu = document.querySelectorAll(".pj");
  if (fbtn.length && kartu.length) {
    Array.prototype.forEach.call(fbtn, function (b) {
      var dasar = b.textContent.replace(/\s·\s\d+$/, "");
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-f");
        Array.prototype.forEach.call(fbtn, function (x) {
          x.setAttribute("aria-pressed", String(x === b));
        });
        var n = 0;
        Array.prototype.forEach.call(kartu, function (k) {
          var cocok = f === "all" ||
                      (k.getAttribute("data-cat") || "").split(" ").indexOf(f) >= 0;
          k.classList.toggle("off", !cocok);
          if (cocok) {                       // putar ulang reveal-nya
            n++;
            if (!kurang) { k.classList.remove("in"); void k.offsetWidth; }
            k.classList.add("in");
          }
        });
        b.textContent = dasar + " · " + n;
      });
    });
  }

  /* ── sorotan mengikuti kursor ────────────────────────────────── */
  Array.prototype.forEach.call(document.querySelectorAll(".pj"), function (k) {
    k.addEventListener("mousemove", function (ev) {
      var r = k.getBoundingClientRect();
      k.style.setProperty("--mx", ((ev.clientX - r.left) / r.width * 100) + "%");
      k.style.setProperty("--my", ((ev.clientY - r.top) / r.height * 100) + "%");
    });
  });

  /* ── pita sertifikat ─────────────────────────────────────────── */
  var mq = document.getElementById("mq");
  if (mq) {
    var SERT = [
      "Learn Jetpack Compose — Dicoding",
      "Android Fundamental Apps — Dicoding",
      "SOLID Principles — Dicoding",
      "Kotlin for Beginners — Dicoding",
      "Basic UX Design — Dicoding",
      "Basic Software Development — Dicoding",
      "Programming Logic 101 — Dicoding",
      "Git and GitHub — Dicoding",
      "Basic SQL — Dicoding",
      "Data 101 — Dicoding",
      "Basic Web Programming — Dicoding",
      "Career for Software Developer — Dicoding",
      "Kotlin Beginner to Expert — Udemy",
      "Full Stack Android Developer — BuildWithAngga",
      "Fundamental Android Developer — Kominfo Digitalent",
      "Intro to Programming — Hacktiv8 Jakarta"
    ];
    // digandakan supaya guliran -50% menyambung tanpa jeda
    SERT.concat(SERT).forEach(function (t) {
      var e = document.createElement("span");
      e.textContent = t;
      mq.appendChild(e);
    });
  }

  /* ── rantai blok ───────────────────────────────────────────────
     Blok-blok tertaut yang menggambar dirinya lalu hanyut pelan.
     Murni dekoratif — tidak mewakili data apa pun.
     ─────────────────────────────────────────────────────────────── */
  var cv = document.getElementById("chain");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d"), W = 0, H = 0, t = 0, raf = null, blok = [];

  function rng(seed) {                                  /* mulberry32 */
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function bangun() {
    // Sebaran ACAK membuat kelima blok kebetulan mengelompok di sepertiga
    // tengah dan kanvas terlihat kosong. Diganti GELOMBANG deterministik:
    // memakai penuh tinggi kanvas dan terbaca sebagai rantai, bukan taburan.
    var r = rng(20260913), out = [], n = 5;
    for (var i = 0; i < n; i++) {
      out.push({
        y: 0.50 + 0.30 * Math.sin(i * 1.25 - 0.6),
        fase: r() * Math.PI * 2,
        sib: 0.6 + r() * 0.6
      });
    }
    return out;
  }
  function ukur() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), b = cv.getBoundingClientRect();
    W = b.width; H = b.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function gambar() {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var n = blok.length, pad = 44, lebar = 44, gap = (W - pad * 2 - lebar) / (n - 1);

    var pos = blok.map(function (b, i) {
      var hanyut = kurang ? 0 : Math.sin(t * 0.0006 * b.sib + b.fase) * 9;
      return { x: pad + i * gap, y: H * b.y + hanyut };
    });

    // tautan antar blok
    ctx.strokeStyle = "rgba(110,231,183,.32)"; ctx.lineWidth = 1.5;
    for (var i = 0; i < n - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(pos[i].x + lebar, pos[i].y);
      ctx.lineTo(pos[i + 1].x, pos[i + 1].y);
      ctx.stroke();
      // paket yang berjalan di sepanjang tautan
      if (!kurang) {
        var p = ((t * 0.00045 + i * 0.25) % 1);
        ctx.beginPath();
        ctx.arc(pos[i].x + lebar + (pos[i + 1].x - pos[i].x - lebar) * p,
                pos[i].y + (pos[i + 1].y - pos[i].y) * p, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "#6EE7B7"; ctx.fill();
      }
    }
    // blok
    for (var j = 0; j < n; j++) {
      var b2 = pos[j], akhir = j === n - 1;
      ctx.beginPath();
      ctx.rect(b2.x - lebar / 2, b2.y - lebar / 2, lebar, lebar);
      ctx.fillStyle = akhir ? "rgba(110,231,183,.18)" : "rgba(110,231,183,.07)";
      ctx.fill();
      ctx.strokeStyle = akhir ? "#6EE7B7" : "rgba(110,231,183,.42)";
      ctx.lineWidth = akhir ? 1.6 : 1.1;
      ctx.stroke();
      // dua garis "isi" di dalam blok
      ctx.strokeStyle = "rgba(110,231,183,.28)"; ctx.lineWidth = 1;
      for (var k = 1; k <= 2; k++) {
        var yy = b2.y - lebar / 2 + (lebar * k / 3);
        ctx.beginPath();
        ctx.moveTo(b2.x - lebar / 2 + 8, yy);
        ctx.lineTo(b2.x + lebar / 2 - 8 - (k === 2 ? 11 : 0), yy);
        ctx.stroke();
      }
    }
  }
  function animasi(ts) { t = ts; gambar(); raf = requestAnimationFrame(animasi); }

  blok = bangun(); ukur(); gambar();
  window.addEventListener("resize", function () { ukur(); gambar(); }, { passive: true });
  if (!kurang) {
    if ("IntersectionObserver" in window) {
      var vio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(animasi); }
        else if (raf) { cancelAnimationFrame(raf); raf = null; }   // hemat baterai
      }, { threshold: 0.05 });
      vio.observe(cv);
    } else { raf = requestAnimationFrame(animasi); }
  }
})();
