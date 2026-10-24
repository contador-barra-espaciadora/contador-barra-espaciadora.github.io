/* Barra Veloz — contador de barra espaciadora */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };

  var RANKS = [
    { min: 0,   name: "Perezoso",  icon: "🦥", text: "Calentando motores. Con práctica subirás rápido." },
    { min: 3,   name: "Tortuga",   icon: "🐢", text: "Ritmo tranquilo. Prueba a alternar los pulgares." },
    { min: 4.5, name: "Pingüino",  icon: "🐧", text: "Vas cogiendo ritmo. Relaja la muñeca y repite." },
    { min: 6,   name: "Conejo",    icon: "🐇", text: "Velocidad normal de una persona media. ¡Bien!" },
    { min: 7.5, name: "Canguro",   icon: "🦘", text: "Por encima de la media. Tienes buenos reflejos." },
    { min: 9,   name: "Caballo",   icon: "🐎", text: "Muy rápido. Nivel de jugador habitual." },
    { min: 11,  name: "Halcón",    icon: "🦅", text: "Velocidad de élite. Pocos llegan aquí." },
    { min: 13,  name: "Guepardo",  icon: "🐆", text: "Increíble. Estás entre los más rápidos." }
  ];

  var tool = $("#test");
  if (!tool) return;
  var el = {
    time: $("#s-time"), count: $("#s-count"), hps: $("#s-hps"), max: $("#s-max"), best: $("#s-best"),
    timeLabel: $("#s-time-label"),
    key: $("#key"), hint: $("#hint"), stop: $("#btn-stop"), reset: $("#btn-reset"),
    result: $("#result"), rIcon: $("#r-icon"), rRank: $("#r-rank"), rText: $("#r-text"), rDesc: $("#r-desc"),
    rRecord: $("#r-record"), chart: $("#chart"), share: $("#btn-share"), again: $("#btn-again"),
    recent: $("#recent-list"), recentEmpty: $("#recent-empty"), toast: $("#toast")
  };
  var durBtns = Array.prototype.slice.call(document.querySelectorAll(".dur"));

  var duration = 10, running = false, finished = false, count = 0, t0 = 0;
  var stamps = [], winStart = 0, maxWin = 0, raf = 0, total = 0, lastResult = null;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  function n2(x) { return x.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function n1(x) { return x.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function durLabel(d, t) {
    if (d === 0) return n1(t) + " s (sin límite)";
    return d + (d === 1 ? " segundo" : " segundos");
  }
  function rankFor(h) { var r = RANKS[0]; for (var i = 0; i < RANKS.length; i++) if (h >= RANKS[i].min) r = RANKS[i]; return r; }
  function bestKey(d) { return String(d); }

  function showBest() {
    var best = store.get("bv_best", {})[bestKey(duration)];
    if (!best) { el.best.textContent = "—"; return; }
    el.best.textContent = duration === 0 ? n2(best.hps) + "/s" : String(best.count);
  }

  function setDuration(d) {
    duration = d;
    durBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.d) === d)); });
    reset();
  }

  function reset() {
    cancelAnimationFrame(raf);
    running = false; finished = false; count = 0; stamps = []; winStart = 0; maxWin = 0; total = 0;
    el.timeLabel.textContent = duration === 0 ? "Tiempo" : "Quedan";
    el.time.textContent = duration === 0 ? "0,00" : n2(duration);
    el.count.textContent = "0"; el.hps.textContent = "0,00"; el.max.textContent = "0";
    el.key.classList.remove("running", "done");
    el.hint.innerHTML = "Pulsa la <kbd>barra espaciadora</kbd> o toca la tecla para empezar";
    el.stop.hidden = true;
    el.result.hidden = true;
    showBest();
  }

  function press() {
    if (finished) return;
    var now = performance.now();
    if (!running) {
      running = true; t0 = now;
      el.key.classList.add("running");
      el.hint.textContent = duration === 0 ? "Cuenta libre en marcha. Pulsa Detener cuando quieras." : "¡Más rápido! No mantengas la tecla pulsada.";
      if (duration === 0) el.stop.hidden = false;
      raf = requestAnimationFrame(loop);
    }
    count++;
    stamps.push(now);
    while (stamps[winStart] <= now - 1000) winStart++;
    var w = stamps.length - winStart;
    if (w > maxWin) maxWin = w;
    el.count.textContent = String(count);
    el.max.textContent = String(maxWin);
    el.count.classList.remove("pop"); void el.count.offsetWidth; el.count.classList.add("pop");
    el.key.classList.add("down");
    setTimeout(function () { el.key.classList.remove("down"); }, 70);
  }

  function loop() {
    var elapsed = (performance.now() - t0) / 1000;
    if (duration && elapsed >= duration) { finish(duration); return; }
    el.time.textContent = n2(duration ? Math.max(0, duration - elapsed) : elapsed);
    el.hps.textContent = n2(elapsed >= 0.5 ? count / elapsed : count);
    raf = requestAnimationFrame(loop);
  }

  function finish(t) {
    cancelAnimationFrame(raf);
    running = false; finished = true; total = t;
    var hps = count / t;
    el.time.textContent = duration ? "0,00" : n2(t);
    el.hps.textContent = n2(hps);
    el.key.classList.remove("running"); el.key.classList.add("done");
    el.stop.hidden = true;
    el.hint.innerHTML = "Prueba terminada. Pulsa <kbd>R</kbd> o «Reiniciar» para repetir.";

    var bests = store.get("bv_best", {});
    var prev = bests[bestKey(duration)];
    var isRecord = !prev || (duration === 0 ? hps > prev.hps : count > prev.count);
    if (isRecord) { bests[bestKey(duration)] = { count: count, hps: hps }; store.set("bv_best", bests); }
    showBest();

    var recent = store.get("bv_recent", []);
    recent.unshift({ d: duration, t: t, c: count, h: hps });
    recent = recent.slice(0, 6);
    store.set("bv_recent", recent);
    renderRecent(recent);

    var r = rankFor(hps);
    el.rIcon.textContent = r.icon;
    el.rRank.textContent = r.name;
    el.rText.textContent = count + " pulsaciones en " + durLabel(duration, t) + " · " + n2(hps) + " HPS · pico de " + maxWin + " en 1 s";
    el.rDesc.textContent = r.text;
    el.rRecord.hidden = !isRecord;
    lastResult = { count: count, hps: hps, label: durLabel(duration, t), rank: r.name };
    el.result.hidden = false;
    drawChart();
  }

  function renderRecent(list) {
    el.recent.innerHTML = "";
    el.recentEmpty.hidden = list.length > 0;
    list.forEach(function (it) {
      var li = document.createElement("li");
      var a = document.createElement("span");
      a.textContent = it.d === 0 ? "Sin límite (" + n1(it.t) + " s)" : it.d + " s";
      var b = document.createElement("span");
      var strong = document.createElement("b");
      strong.textContent = it.c + " pulsaciones";
      b.appendChild(strong);
      b.appendChild(document.createTextNode(" · " + n2(it.h) + " HPS"));
      li.appendChild(a); li.appendChild(b);
      el.recent.appendChild(li);
    });
  }

  function drawChart() {
    var c = el.chart, ctx = c.getContext("2d");
    if (!ctx) return;
    var n = Math.max(1, Math.ceil(total - 1e-6));
    var bins = []; for (var i = 0; i < n; i++) bins.push(0);
    stamps.forEach(function (s) { var k = Math.floor((s - t0) / 1000); if (k >= n) k = n - 1; bins[k]++; });
    var per = 1, data = bins;
    if (n > 60) {
      per = Math.ceil(n / 60); data = [];
      for (var j = 0; j < n; j += per) {
        var part = bins.slice(j, j + per);
        data.push(part.reduce(function (a, b) { return a + b; }, 0) / part.length);
      }
    }
    var cs = getComputedStyle(document.documentElement);
    var cAccent = cs.getPropertyValue("--accent").trim() || "#DC1E3C";
    var cLine = cs.getPropertyValue("--line").trim() || "#EEDDE0";
    var cMuted = cs.getPropertyValue("--muted").trim() || "#6B5257";
    var dpr = window.devicePixelRatio || 1;
    var W = c.clientWidth || 600, H = c.clientHeight || 130;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var top = 18, bottom = 20, left = 2, right = 2;
    var ch = H - top - bottom, cw = W - left - right;
    var mx = Math.max.apply(null, data.concat([1]));
    ctx.strokeStyle = cLine; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, top + ch + .5); ctx.lineTo(W - right, top + ch + .5); ctx.stroke();
    var slot = cw / data.length, bw = Math.max(2, Math.min(36, slot * .7));
    ctx.fillStyle = cAccent;
    data.forEach(function (v, idx) {
      var h = (v / mx) * ch;
      var x = left + idx * slot + (slot - bw) / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, top + ch - h, bw, h, Math.min(4, bw / 2)); else ctx.rect(x, top + ch - h, bw, h);
      ctx.fill();
    });
    ctx.fillStyle = cMuted;
    ctx.font = "600 11px " + (cs.getPropertyValue("--f-mono") || "monospace");
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("máx. " + n1(mx) + "/s", left, 0);
    ctx.textBaseline = "alphabetic";
    ctx.fillText("1 s", left, H - 4);
    ctx.textAlign = "right";
    ctx.fillText(n + " s", W - right, H - 4);
    c.setAttribute("aria-label", "Pulsaciones por segundo: " + bins.join(", "));
  }

  function toast(msg) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.toast.hidden = true; }, 2400);
  }

  function share() {
    if (!lastResult) return;
    var url = location.href.split("#")[0];
    var text = "He hecho " + lastResult.count + " pulsaciones en " + lastResult.label + " (" + n2(lastResult.hps) + " HPS, rango " + lastResult.rank + ") en el contador de barra espaciadora. ¿Me superas?";
    if (navigator.share) {
      navigator.share({ title: "Mi resultado", text: text, url: url }).catch(function () {});
      return;
    }
    var full = text + " " + url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(function () { toast("Resultado copiado. ¡Pégalo donde quieras!"); }, function () { toast(full); });
    } else { toast(full); }
  }

  function isField(t) {
    if (!t) return false;
    var tag = t.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
  }

  var inView = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.3 }).observe(tool);
  }

  document.addEventListener("keydown", function (e) {
    var isSpace = e.code === "Space" || e.key === " ";
    if (!isSpace) {
      if ((e.key === "Escape" || e.key === "r" || e.key === "R") && !isField(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey && (inView || running)) reset();
      return;
    }
    if (isField(e.target)) return;
    if (!inView && !running) return;
    e.preventDefault();
    if (e.repeat) return;
    var a = document.activeElement;
    if (a && a !== document.body && tool.contains(a) && a !== el.key) a.blur();
    press();
  });
  document.addEventListener("keyup", function (e) {
    if ((e.code === "Space" || e.key === " ") && !isField(e.target) && (inView || running || finished)) e.preventDefault();
  });

  el.key.addEventListener("pointerdown", function (e) { e.preventDefault(); press(); });
  el.key.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  el.stop.addEventListener("click", function () { if (running) finish((performance.now() - t0) / 1000); });
  el.reset.addEventListener("click", reset);
  el.again.addEventListener("click", function () { reset(); el.key.focus({ preventScroll: true }); });
  el.share.addEventListener("click", share);
  durBtns.forEach(function (b) { b.addEventListener("click", function () { setDuration(Number(b.dataset.d)); b.blur(); }); });
  window.addEventListener("resize", function () { if (finished) drawChart(); });

  renderRecent(store.get("bv_recent", []));
  setDuration(10);
})();
