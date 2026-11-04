/* Qkuk Terminal portfolio — small, dependency-free behaviour layer.
   1) reveal sections on scroll
   2) draw the candlesticks in the indicator figure
   3) highlight the nav link for the section in view                        */
(function () {
  "use strict";

  /* ── 1. reveal ───────────────────────────────────────────────────── */
  var targets = document.querySelectorAll(".sec-head, .flow, .card, .figure, .mod, .op, .note, .feature");
  Array.prototype.forEach.call(targets, function (el) { el.classList.add("rv"); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add("in"); });
  }

  /* ── 2. candles for the indicator figure ─────────────────────────── */
  /* Deterministic OHLC so the illustration never changes between loads. */
  var bars = [
    [301, 292, 304, 288], [290, 296, 299, 287], [295, 284, 297, 280],
    [283, 288, 291, 279], [287, 276, 289, 272], [275, 268, 279, 262],
    [267, 274, 278, 264], [273, 262, 276, 258], [261, 254, 266, 250],
    [253, 260, 264, 249], [259, 248, 262, 244], [247, 240, 252, 236],
    [239, 246, 250, 234], [245, 232, 248, 226], [231, 218, 236, 212],
    [217, 206, 226, 198], [205, 214, 219, 202], [213, 222, 226, 210],
    [221, 232, 236, 218], [231, 240, 244, 228], [239, 231, 243, 226],
    [230, 224, 236, 219], [223, 216, 228, 211], [215, 208, 221, 203],
    [207, 198, 214, 194], [197, 190, 203, 186], [189, 182, 196, 178],
    [181, 190, 195, 176], [189, 196, 200, 184], [195, 188, 199, 182]
  ];
  var g = document.getElementById("candles");
  if (g) {
    var NS = "http://www.w3.org/2000/svg";
    var x0 = 54, step = 23, w = 12;
    bars.forEach(function (b, i) {
      var o = b[0], c = b[1], h = Math.min(b[2], b[3]), l = Math.max(b[2], b[3]);
      var x = x0 + i * step, up = c < o;              /* SVG y grows downward */
      var col = up ? "#6EE7B7" : "#FF7A6E";

      var wick = document.createElementNS(NS, "line");
      wick.setAttribute("x1", x + w / 2); wick.setAttribute("x2", x + w / 2);
      wick.setAttribute("y1", h); wick.setAttribute("y2", l);
      wick.setAttribute("stroke", col); wick.setAttribute("stroke-opacity", ".55");
      wick.setAttribute("class", "candle");
      g.appendChild(wick);

      var body = document.createElementNS(NS, "rect");
      body.setAttribute("x", x); body.setAttribute("width", w);
      body.setAttribute("y", Math.min(o, c));
      body.setAttribute("height", Math.max(3, Math.abs(o - c)));
      body.setAttribute("fill", col);
      body.setAttribute("fill-opacity", up ? ".22" : ".30");
      body.setAttribute("stroke", col); body.setAttribute("stroke-opacity", ".75");
      body.setAttribute("class", "candle");
      g.appendChild(body);
    });
  }

  /* ── 3. nav highlight ────────────────────────────────────────────── */
  var sections = document.querySelectorAll("main section[id]");
  var navLinks = document.querySelectorAll(".links a[href^='#']");
  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    var mo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(navLinks, function (a) {
          var on = a.getAttribute("href") === "#" + en.target.id;
          a.style.color = on ? "var(--fg)" : "";
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Array.prototype.forEach.call(sections, function (s) { mo.observe(s); });
  }
})();
