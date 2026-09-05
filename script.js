/* ═══════════════════════════════════════════════════════════════════
   Qkuk Terminal — portfolio interactions
   No framework, no dependencies. Everything degrades to a readable
   static page if JS or motion is unavailable.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── current year ─────────────────────────────────────────────── */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── nav: solid once scrolled ─────────────────────────────────── */
  var nav = document.getElementById("nav");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (nav) nav.classList.toggle("solid", window.scrollY > 24);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── typing role line ─────────────────────────────────────────── */
  var roleEl = document.getElementById("role");
  var ROLES = [
    "Software Engineer",
    "Web3 & AI",
    "Android · Kotlin · Flutter",
    "Building autonomous systems"
  ];
  if (roleEl) {
    var caret = roleEl.querySelector(".caret");
    if (reduced) {
      roleEl.insertBefore(document.createTextNode(ROLES[0]), caret);
    } else {
      var ri = 0, ci = 0, deleting = false;
      var textNode = document.createTextNode("");
      roleEl.insertBefore(textNode, caret);
      (function tick() {
        var word = ROLES[ri];
        ci += deleting ? -1 : 1;
        textNode.nodeValue = word.slice(0, ci);
        var wait = deleting ? 34 : 62;
        if (!deleting && ci === word.length) { deleting = true; wait = 1900; }
        else if (deleting && ci === 0) { deleting = false; ri = (ri + 1) % ROLES.length; wait = 320; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ── scroll reveal + staggered pipeline ───────────────────────── */
  var revealables = document.querySelectorAll(".rv");
  if (!("IntersectionObserver" in window) || reduced) {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add("in"); });
    Array.prototype.forEach.call(document.querySelectorAll(".step"), function (el) { el.classList.add("lit"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        var delay = Math.min(sibs, 6) * 70;
        setTimeout(function () {
          el.classList.add("in");
          if (el.classList.contains("step")) el.classList.add("lit");
        }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });
  }

  /* ── count-up numbers ─────────────────────────────────────────── */
  var counters = document.querySelectorAll("[data-count]");
  function runCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduced) { el.textContent = target.toLocaleString(); return; }
    var start = null, dur = 1500;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           /* ease-out cubic */
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(counters, function (el) { cio.observe(el); });
  } else {
    Array.prototype.forEach.call(counters, runCount);
  }

  /* ── card hover glow follows the cursor ───────────────────────── */
  Array.prototype.forEach.call(document.querySelectorAll(".card"), function (card) {
    card.addEventListener("mousemove", function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((ev.clientX - r.left) / r.width * 100) + "%");
      card.style.setProperty("--my", ((ev.clientY - r.top) / r.height * 100) + "%");
    });
  });

  /* ── hero sparkline ───────────────────────────────────────────────
     A deterministic pseudo-random walk drawn progressively. It is an
     illustration of movement, not a record of performance — no real
     numbers are implied or displayed against it.
     ───────────────────────────────────────────────────────────────── */
  var cv = document.getElementById("spark");
  if (cv && cv.getContext) {
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, pts = [], progress = 0, raf = null;

    function rng(seed) {                        /* mulberry32 */
      return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function build() {
      var rand = rng(20260906);
      var n = 132, v = 0.5, out = [];
      for (var i = 0; i < n; i++) {
        v += (rand() - 0.455) * 0.085;
        v = Math.max(0.08, Math.min(0.94, v));
        out.push(v);
      }
      return out;
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);

      /* baseline grid */
      ctx.strokeStyle = "rgba(59,74,112,.30)";
      ctx.lineWidth = 1;
      for (var g = 1; g < 4; g++) {
        var gy = Math.round(H * g / 4) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      var shown = Math.max(2, Math.floor(pts.length * progress));
      var stepX = W / (pts.length - 1);
      function px(i) { return i * stepX; }
      function py(i) { return H - (pts[i] * (H - 26)) - 13; }

      /* area fill */
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(245,158,11,.26)");
      grad.addColorStop(1, "rgba(245,158,11,0)");
      ctx.beginPath();
      ctx.moveTo(px(0), H);
      for (var a = 0; a < shown; a++) ctx.lineTo(px(a), py(a));
      ctx.lineTo(px(shown - 1), H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      /* line */
      ctx.beginPath();
      for (var b = 0; b < shown; b++) {
        if (b === 0) ctx.moveTo(px(b), py(b)); else ctx.lineTo(px(b), py(b));
      }
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      /* leading dot */
      var li = shown - 1;
      ctx.beginPath();
      ctx.arc(px(li), py(li), 3.4, 0, Math.PI * 2);
      ctx.fillStyle = "#FBBF24";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px(li), py(li), 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(251,191,36,.16)";
      ctx.fill();
    }

    function animate() {
      progress += (1 - progress) * 0.085;
      draw();
      if (progress < 0.999) raf = requestAnimationFrame(animate);
      else { progress = 1; draw(); }
    }

    pts = build();
    window.addEventListener("resize", function () {
      if (raf) cancelAnimationFrame(raf);
      resize();
      if (!reduced && progress < 1) { raf = requestAnimationFrame(animate); }
    }, { passive: true });

    resize();
    if (reduced) { progress = 1; draw(); }
    else {
      progress = 0;
      if ("IntersectionObserver" in window) {
        var sio = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { raf = requestAnimationFrame(animate); sio.disconnect(); }
        }, { threshold: 0.25 });
        sio.observe(cv);
      } else { raf = requestAnimationFrame(animate); }
    }
  }
})();
