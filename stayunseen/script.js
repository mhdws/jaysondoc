/* Stay Unseen — product site behaviour.
   Ported from the mheadowshtml.html template: accent switch, reveal observer,
   card tilt and the canvas particle/wire-cube field. Added here: the screenshot
   gallery's tabs. */

(function () {
  "use strict";

  var app = document.getElementById("psApp");
  if (!app) return;

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: null };

  /* --- accent switch ------------------------------------------------------ */

  /* All three hues are read off the extension icon: the periwinkle of its frame,
     the steel of the badge circle, the purple half of the shield. */
  var THEME_HUES = { steel: 209, periwinkle: 226, violet: 253 };
  var DEFAULT_THEME = "periwinkle";
  var STORE_KEY = "stayUnseenSiteAccent";
  var themeButtons = Array.prototype.slice.call(
    document.querySelectorAll("[data-ps-theme-btn]")
  );

  function applyTheme(name, remember) {
    if (!THEME_HUES.hasOwnProperty(name)) name = DEFAULT_THEME;

    app.setAttribute("data-ps-theme", name);
    // Mirrored onto <html> so the overscroll area and browser UI follow too.
    document.documentElement.setAttribute("data-ps-theme", name);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "hsl(" + THEME_HUES[name] + ", 100%, 67%)");

    themeButtons.forEach(function (btn) {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-ps-theme-btn") === name ? "true" : "false"
      );
    });

    if (remember) {
      try { localStorage.setItem(STORE_KEY, name); } catch (err) {}
    }
  }

  themeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(btn.getAttribute("data-ps-theme-btn"), true);
    });
  });

  var stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (err) {}
  applyTheme(stored || app.getAttribute("data-ps-theme") || DEFAULT_THEME, false);

  /* --- header entry ------------------------------------------------------- */

  requestAnimationFrame(function () {
    app.classList.add("is-ready");
  });

  /* --- reveals ----------------------------------------------------------- */

  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll(".ps-reveal-item, .ps-intro-content, .ps-popup-stage")
  );

  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach(function (node) { node.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach(function (node) { observer.observe(node); });
  }

  /* --- screenshot tabs --------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".ps-tab"));

  function selectTab(tab, focus) {
    tabs.forEach(function (other) {
      var active = other === tab;
      other.setAttribute("aria-selected", active ? "true" : "false");
      if (active) other.removeAttribute("tabindex");
      else other.setAttribute("tabindex", "-1");

      var panel = document.getElementById(other.getAttribute("aria-controls"));
      if (!panel) return;
      panel.classList.toggle("is-active", active);
      if (active) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { selectTab(tab, false); });

    tab.addEventListener("keydown", function (event) {
      var target = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        target = tabs[(index + 1) % tabs.length];
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        target = tabs[(index - 1 + tabs.length) % tabs.length];
      } else if (event.key === "Home") {
        target = tabs[0];
      } else if (event.key === "End") {
        target = tabs[tabs.length - 1];
      }

      if (!target) return;
      event.preventDefault();
      selectTab(target, true);
    });
  });

  /* --- hero card tilt ---------------------------------------------------- */
  /* Bound to the stage rather than the card: the pointer keeps steering while it
     is over the rings and badges, so the card does not snap back at its edge. */

  var stage = document.getElementById("psStage");
  var card = document.getElementById("psCard");

  if (stage && card && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    var frame = null;
    var pending = null;

    function updateTilt() {
      frame = null;
      if (!pending) return;

      var rect = stage.getBoundingClientRect();
      var x = (pending.clientX - rect.left) / rect.width - 0.5;
      var y = (pending.clientY - rect.top) / rect.height - 0.5;

      card.style.transform =
        "rotateY(" + (12 + x * 16).toFixed(2) + "deg) " +
        "rotateX(" + (6 - y * 14).toFixed(2) + "deg) " +
        "translateZ(30px)";
      // Drives the conic edge highlight, so the lit edge follows the pointer.
      card.style.setProperty(
        "--ps-edge-angle",
        (Math.atan2(y, x) * 180) / Math.PI + 90 + "deg"
      );
    }

    stage.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      pending = { clientX: event.clientX, clientY: event.clientY };
      if (!frame) frame = requestAnimationFrame(updateTilt);
    });

    stage.addEventListener("pointerleave", function () {
      pending = null;
      if (frame) { cancelAnimationFrame(frame); frame = null; }
      card.style.transform = "";
      card.style.removeProperty("--ps-edge-angle");
    });
  }

  /* --- background field -------------------------------------------------- */

  var canvas = document.getElementById("ps3dCanvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var particles = [];
  var cubes = [];
  var width = 0;
  var height = 0;
  var dpr = 1;
  var running = false;
  var raf = null;

  function hue() {
    var name = app.getAttribute("data-ps-theme") || DEFAULT_THEME;
    return THEME_HUES.hasOwnProperty(name) ? THEME_HUES[name] : THEME_HUES[DEFAULT_THEME];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = app.offsetWidth;
    height = app.offsetHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    // Density scales with area so a tall page is not sparser than a short one.
    var count = Math.min(150, Math.round((width * height) / 16000));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.85 + 0.15,
        r: Math.random() * 1.5 + 0.4,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        a: Math.random() * 0.5 + 0.12
      });
    }

    var cubeCount = height > 2600 ? 5 : 3;
    cubes = [];
    for (var c = 0; c < cubeCount; c++) {
      cubes.push({
        x: 120 + Math.random() * Math.max(1, width - 240),
        y: (height / cubeCount) * c + Math.random() * 240 + 120,
        size: 26 + Math.random() * 34,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        sx: (Math.random() - 0.5) * 0.006,
        sy: (Math.random() - 0.5) * 0.006,
        drift: Math.random() * Math.PI * 2
      });
    }
  }

  var CUBE_VERTS = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];

  var CUBE_EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  function drawWireCube(cube, h) {
    var cosX = Math.cos(cube.rx), sinX = Math.sin(cube.rx);
    var cosY = Math.cos(cube.ry), sinY = Math.sin(cube.ry);
    var points = [];

    for (var i = 0; i < CUBE_VERTS.length; i++) {
      var v = CUBE_VERTS[i];
      var x = v[0] * cube.size;
      var y = v[1] * cube.size;
      var z = v[2] * cube.size;

      var y1 = y * cosX - z * sinX;
      var z1 = y * sinX + z * cosX;
      var x2 = x * cosY + z1 * sinY;
      var z2 = -x * sinY + z1 * cosY;

      var scale = 320 / (320 + z2);
      points.push([cube.x + x2 * scale, cube.y + y1 * scale, scale]);
    }

    // Softer than the template's 0.22: this page carries long prose columns, and at
    // full strength an edge crossing a paragraph reads as a strikethrough.
    ctx.strokeStyle = "hsla(" + h + ", 100%, 72%, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var e = 0; e < CUBE_EDGES.length; e++) {
      var a = points[CUBE_EDGES[e][0]];
      var b = points[CUBE_EDGES[e][1]];
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  }

  function frameTick() {
    var h = hue();
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;

      if (p.x < -10) p.x = width + 10;
      else if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      else if (p.y > height + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
      ctx.fillStyle = "hsla(" + h + ", 100%, 78%, " + p.a * p.z + ")";
      ctx.fill();
    }

    for (var c = 0; c < cubes.length; c++) {
      var cube = cubes[c];
      cube.rx += cube.sx;
      cube.ry += cube.sy;
      cube.drift += 0.004;
      drawWireCube(
        { x: cube.x + Math.sin(cube.drift) * 18, y: cube.y + Math.cos(cube.drift * 0.7) * 12,
          size: cube.size, rx: cube.rx, ry: cube.ry },
        h
      );
    }

    raf = requestAnimationFrame(frameTick);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frameTick);
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function paintStill() {
    // Reduced motion still gets the field, just held still.
    var h = hue();
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
      ctx.fillStyle = "hsla(" + h + ", 100%, 78%, " + p.a * p.z + ")";
      ctx.fill();
    }
    for (var c = 0; c < cubes.length; c++) drawWireCube(cubes[c], h);
  }

  function apply() {
    if (reduceMotion.matches) { stop(); paintStill(); }
    else start();
  }

  resize();
  apply();

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion.matches) paintStill();
    }, 180);
  });

  // The page grows as reveals fire and the tab panels swap height; keep the
  // canvas matched to it rather than to the first layout pass.
  if ("ResizeObserver" in window) {
    var lastHeight = app.offsetHeight;
    new ResizeObserver(function () {
      if (Math.abs(app.offsetHeight - lastHeight) < 40) return;
      lastHeight = app.offsetHeight;
      resize();
      if (reduceMotion.matches) paintStill();
    }).observe(app);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else apply();
  });

  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", apply);
  else if (reduceMotion.addListener) reduceMotion.addListener(apply);
})();
