/* Rozpoznávanie ručne nakreslených symbolov.
 *
 * Funguje úplne offline a bez neurónovej siete:
 *   1. každý symbol z databázy sa vyrenderuje ako glyf do malého plátna,
 *   2. tvar sa stenčí na kostru (algoritmus Zhang–Suen), takže z hrubého
 *      písma zostane iba stredová čiara – tá je porovnateľná s ťahom myši,
 *   3. kostra aj nakreslené ťahy sa prevedú na mračno bodov v jednotkovom
 *      štvorci (pomer strán zostáva zachovaný, aby sa „−" nepomýlilo s „|"),
 *   4. podobnosť = obojsmerná priemerná vzdialenosť k najbližšiemu bodu.
 *
 * Používateľ môže rozpoznávanie doučiť – jeho vlastný ťah sa uloží ako
 * ďalšia predloha pre daný symbol a pri ďalšom kreslení má prednosť.
 */
window.MW = window.MW || {};

(function () {
  'use strict';

  var GRID = 72;                  // veľkosť plátna na renderovanie glyfu
  var TPL_POINTS = 140;           // koľko bodov si necháme z kostry
  var INK_POINTS = 120;           // na koľko bodov prevzorkujeme ťahy myši
  var GRID_N = 20;                // rozlíšenie mriežky hustoty
  var BLUR_SIGMA = 1.4;
  var BLUR_RADIUS = 3;
  var W_CLOUD = 2.0;              // váha mračna bodov oproti mriežke
  var FLAT_LIMIT = 0.18;          // pod týmto pomerom strán je tvar už čiara
  var STRETCH_PENALTY = 1.1;      // zhoda v natiahnutom pohľade platí menej
  var LEARNED_KEY = 'mw:ink-templates:v1';
  var LEARNED_BONUS = 0.82;       // vlastné predlohy sú dôveryhodnejšie
  var MAX_PER_SYMBOL = 8;

  // Znaky, ktoré sú len bodkou – po normalizácii tvaru z nich vznikne
  // veľká škvrna, ktorá sa podobá na čokoľvek. Do predlôh nepatria.
  var NO_TEMPLATE = { '\\cdot': 1, '\\bullet': 1 };

  // Predlohy staviame z viacerých písiem – ten istý symbol vyzerá v
  // pätkovom a bezpätkovom reze dosť odlišne a ručne písaný tvar padne
  // raz bližšie k jednému, raz k druhému.
  var FONT_STACKS = [
    '"Cambria Math","Latin Modern Math","STIX Two Math","DejaVu Serif","FreeSerif",serif',
    '"Segoe UI Symbol","Noto Sans Math","Noto Sans Symbols 2","DejaVu Sans","FreeSans",sans-serif',
    '"OpenSymbol","Symbola","Liberation Serif","Bitstream Charter",serif'
  ];

  var canvas = null, ctx = null;

  function getCtx() {
    if (!ctx) {
      canvas = document.createElement('canvas');
      canvas.width = GRID;
      canvas.height = GRID;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
    return ctx;
  }

  /* ── 1. render glyfu do binárnej mriežky ──────────────────────────── */

  function rasterize(ch, fontStack) {
    var c = getCtx();
    c.clearRect(0, 0, GRID, GRID);
    c.fillStyle = '#000';
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    var size = 46;
    c.font = size + 'px ' + fontStack;
    var w = c.measureText(ch).width;
    var limit = GRID - 14;
    if (w > limit && w > 0) {
      size = Math.max(10, Math.floor(size * limit / w));
      c.font = size + 'px ' + fontStack;
    }
    c.fillText(ch, GRID / 2, GRID / 2);

    var data = c.getImageData(0, 0, GRID, GRID).data;
    var grid = new Uint8Array(GRID * GRID);
    var count = 0;
    for (var i = 0, p = 0; i < grid.length; i++, p += 4) {
      if (data[p + 3] > 100) { grid[i] = 1; count++; }
    }
    return { grid: grid, count: count };
  }

  function sameGrid(a, b) {
    if (a.count !== b.count) return false;
    for (var i = 0; i < a.grid.length; i++) if (a.grid[i] !== b.grid[i]) return false;
    return true;
  }

  /* ── 2. stenčenie na kostru (Zhang–Suen) ──────────────────────────── */

  function thin(grid) {
    var g = Uint8Array.from(grid);
    var W = GRID, doomed = [], pass, changed = true, guard = 0;

    function at(x, y) { return g[y * W + x]; }

    while (changed && guard++ < 40) {
      changed = false;
      for (pass = 0; pass < 2; pass++) {
        doomed.length = 0;
        for (var y = 1; y < W - 1; y++) {
          for (var x = 1; x < W - 1; x++) {
            if (!at(x, y)) continue;
            var p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y),
              p5 = at(x + 1, y + 1), p6 = at(x, y + 1), p7 = at(x - 1, y + 1),
              p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
            var b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (b < 2 || b > 6) continue;
            var seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2], a = 0;
            for (var k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) a++;
            if (a !== 1) continue;
            if (pass === 0) {
              if (p2 * p4 * p6 !== 0) continue;
              if (p4 * p6 * p8 !== 0) continue;
            } else {
              if (p2 * p4 * p8 !== 0) continue;
              if (p2 * p6 * p8 !== 0) continue;
            }
            doomed.push(y * W + x);
          }
        }
        for (var d = 0; d < doomed.length; d++) g[doomed[d]] = 0;
        if (doomed.length) changed = true;
      }
    }

    return rasterPoints(g);
  }

  function rasterPoints(g) {
    var pts = [];
    for (var i = 0; i < g.length; i++) {
      if (g[i]) pts.push([i % GRID, (i / GRID) | 0]);
    }
    return pts;
  }

  /* ── 3. normalizácia na mračno bodov ──────────────────────────────── */

  function subsample(pts, target) {
    if (pts.length <= target) return pts;
    var out = [], stride = pts.length / target;
    for (var i = 0; i < target; i++) out.push(pts[Math.floor(i * stride)]);
    return out;
  }

  // Zmestí body do jednotkového štvorca so zachovaním pomeru strán.
  function normalize(pts) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    var s = Math.max(maxX - minX, maxY - minY);
    if (!isFinite(s) || s < 1e-6) s = 1;
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var out = new Float32Array(pts.length * 2);
    for (i = 0; i < pts.length; i++) {
      out[i * 2] = (pts[i][0] - cx) / s;
      out[i * 2 + 1] = (pts[i][1] - cy) / s;
    }
    return out;
  }

  // Ťahy myši prevzorkujeme rovnomerne po dĺžke, aby bola hustota bodov
  // rovnaká ako pri kostre glyfu (inak by pomalé ťahy mali väčšiu váhu).
  function resampleStrokes(strokes, target) {
    var lens = [], total = 0, i, j;
    for (i = 0; i < strokes.length; i++) {
      var L = 0;
      for (j = 1; j < strokes[i].length; j++) {
        L += Math.hypot(strokes[i][j][0] - strokes[i][j - 1][0],
          strokes[i][j][1] - strokes[i][j - 1][1]);
      }
      lens.push(L); total += L;
    }

    var pts = [];
    if (total < 1e-6) {                       // samé bodky bez dĺžky
      for (i = 0; i < strokes.length; i++) if (strokes[i].length) pts.push(strokes[i][0]);
      return pts;
    }

    for (i = 0; i < strokes.length; i++) {
      var st = strokes[i];
      if (!st.length) continue;
      var n = Math.max(1, Math.round(target * lens[i] / total));
      if (st.length === 1 || lens[i] < 1e-6) { pts.push(st[0]); continue; }
      var step = lens[i] / n, acc = 0, cur = st[0].slice();
      pts.push(cur);
      for (j = 1; j < st.length;) {
        var dx = st[j][0] - cur[0], dy = st[j][1] - cur[1];
        var d = Math.hypot(dx, dy);
        if (acc + d >= step && d > 1e-9) {
          var t = (step - acc) / d;
          cur = [cur[0] + dx * t, cur[1] + dy * t];
          pts.push(cur);
          acc = 0;
        } else {
          acc += d;
          cur = st[j].slice();
          j++;
        }
      }
    }
    return pts;
  }

  /* ── 4. príznaky a vzdialenosť ────────────────────────────────────── */

  /* Mriežka hustoty: body sa „rozmažú" do malej mriežky, takže sa
   * porovnáva rozloženie ťahov v ploche, nie len najbližší sused.
   * Toto rozlišuje tvary oveľa lepšie než samotné mračno bodov. */
  function densityGrid(cloud) {
    var g = new Float32Array(GRID_N * GRID_N), i;
    for (i = 0; i < cloud.length; i += 2) {
      var u = (cloud[i] + 0.5) * (GRID_N - 1);
      var v = (cloud[i + 1] + 0.5) * (GRID_N - 1);
      var x0 = Math.floor(u), y0 = Math.floor(v);
      var fx = u - x0, fy = v - y0;
      for (var dy = 0; dy < 2; dy++) {
        for (var dx = 0; dx < 2; dx++) {
          var x = x0 + dx, y = y0 + dy;
          if (x < 0 || y < 0 || x >= GRID_N || y >= GRID_N) continue;
          g[y * GRID_N + x] += (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
        }
      }
    }
    blur(g);
    var sum = 0;
    for (i = 0; i < g.length; i++) sum += g[i] * g[i];
    sum = Math.sqrt(sum) || 1;
    for (i = 0; i < g.length; i++) g[i] /= sum;
    return g;
  }

  var KERNEL = (function () {
    var k = [], r = BLUR_RADIUS, s = BLUR_SIGMA, sum = 0, i;
    for (i = -r; i <= r; i++) { var v = Math.exp(-(i * i) / (2 * s * s)); k.push(v); sum += v; }
    for (i = 0; i < k.length; i++) k[i] /= sum;
    return k;
  })();

  function blur(g) {
    var N = GRID_N, r = BLUR_RADIUS, tmp = new Float32Array(N * N), x, y, i, acc;
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        acc = 0;
        for (i = -r; i <= r; i++) {
          var xx = x + i;
          if (xx >= 0 && xx < N) acc += g[y * N + xx] * KERNEL[i + r];
        }
        tmp[y * N + x] = acc;
      }
    }
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        acc = 0;
        for (i = -r; i <= r; i++) {
          var yy = y + i;
          if (yy >= 0 && yy < N) acc += tmp[yy * N + x] * KERNEL[i + r];
        }
        g[y * N + x] = acc;
      }
    }
  }

  function gridDistance(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  }

  /* Druhý pohľad na ten istý tvar: osi sa škálujú nezávisle, takže tvar
   * vyplní celý štvorec. Ručne písaný znak býva oproti tlačenému natiahnutý
   * na výšku alebo do šírky a v tomto pohľade si zodpovedajú.
   * Pri tvaroch blízkych čiare to nemá zmysel – „−" by sa stalo „+". */
  function normalizeStretched(pts) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    var w = maxX - minX, h = maxY - minY;
    if (Math.min(w, h) < FLAT_LIMIT * Math.max(w, h)) return null;
    var out = new Float32Array(pts.length * 2);
    for (i = 0; i < pts.length; i++) {
      out[i * 2] = (pts[i][0] - minX) / w - 0.5;
      out[i * 2 + 1] = (pts[i][1] - minY) / h - 0.5;
    }
    return out;
  }

  // Popis tvaru = mračno bodov + mriežka hustoty, v oboch pohľadoch.
  function describe(pts) {
    var cloud = normalize(pts);
    var d = { cloud: cloud, grid: densityGrid(cloud), sCloud: null, sGrid: null };
    var s = normalizeStretched(pts);
    if (s) { d.sCloud = s; d.sGrid = densityGrid(s); }
    return d;
  }

  function shapeDistance(a, b) {
    var base = gridDistance(a.grid, b.grid) + W_CLOUD * cloudDistance(a.cloud, b.cloud);
    if (!a.sGrid || !b.sGrid) return base;
    var stretched = gridDistance(a.sGrid, b.sGrid) + W_CLOUD * cloudDistance(a.sCloud, b.sCloud);
    return Math.min(base, STRETCH_PENALTY * stretched);
  }

  function setCloudWeight(w) { W_CLOUD = w; }

  function directed(a, b) {
    var sum = 0, n = a.length / 2, m = b.length / 2;
    for (var i = 0; i < n; i++) {
      var ax = a[i * 2], ay = a[i * 2 + 1], best = Infinity;
      for (var j = 0; j < m; j++) {
        var dx = ax - b[j * 2], dy = ay - b[j * 2 + 1];
        var d = dx * dx + dy * dy;
        if (d < best) best = d;
      }
      sum += Math.sqrt(best);
    }
    return n ? sum / n : Infinity;
  }

  function cloudDistance(a, b) {
    if (!a.length || !b.length) return Infinity;
    return 0.5 * (directed(a, b) + directed(b, a));
  }

  /* ── jedna nezávislá sada predlôh ─────────────────────────────────── */

  /* Rozpoznávač je továrnička, nie jedináčik: matematické symboly a
   * písmená abecedy potrebujú vlastné predlohy aj vlastnú pamäť rukopisu,
   * inak by si „O" a „\circ" liezli do cesty.
   * learnedKey je kľúč, pod ktorým si sada pamätá naučené ťahy. */
  function makeRecognizer(learnedKey) {

    var templates = [];     // {tex, shape}
    var learned = [];       // {tex, shape, pts}
    var built = false;
    var skipped = [];

    function loadLearned() {
      learned = [];
      try {
        var raw = JSON.parse(localStorage.getItem(learnedKey) || '[]');
        for (var i = 0; i < raw.length; i++) {
          if (!raw[i].pts || raw[i].pts.length < 4) continue;
          learned.push({ tex: raw[i].tex, pts: raw[i].pts, shape: describe(raw[i].pts) });
        }
      } catch (e) { /* poškodené dáta ignorujeme */ }
    }

    function saveLearned() {
      try {
        localStorage.setItem(learnedKey, JSON.stringify(learned.map(function (t) {
          return { tex: t.tex, pts: t.pts };
        })));
      } catch (e) { /* plná pamäť – nevadí */ }
    }

    var Recognizer = {
      FONT_STACKS: FONT_STACKS,

      get ready() { return built; },
      get templateCount() { return templates.length; },
      get skipped() { return skipped.slice(); },

      /* Postaví predlohy zo znakov v MW.SYMBOLS. Beží po častiach, aby
       * neblokovala vykresľovanie stránky. */
      build: function (symbols, stacks, onProgress) {
        symbols = symbols || MW.SYMBOLS;
        stacks = stacks || FONT_STACKS;
        if (typeof stacks === 'string') stacks = [stacks];
        templates = [];
        skipped = [];
        loadLearned();

        // Predloha nedostupného znaku – takto spoznáme chýbajúce glyfy.
        var notdef = stacks.map(function (f) { return rasterize('￿', f); });

        var i = 0;
        return new Promise(function (resolve) {
          function chunk() {
            var end = Math.min(symbols.length, i + 12);
            for (; i < end; i++) {
              var s = symbols[i];
              if (!s.ch || NO_TEMPLATE[s.tex]) continue;
              var made = 0, seen = [];
              for (var f = 0; f < stacks.length; f++) {
                var raster = rasterize(s.ch, stacks[f]);
                if (raster.count < 6 || sameGrid(raster, notdef[f])) continue;
                var dup = false;
                for (var d = 0; d < seen.length; d++) if (sameGrid(raster, seen[d])) { dup = true; break; }
                if (dup) continue;
                seen.push(raster);

                var skeleton = thin(raster.grid);
                // Bodky a podobné drobné znaky sa stenčia takmer na nič –
                // pre ne použijeme rovno vyplnený tvar.
                if (skeleton.length < 6) skeleton = rasterPoints(raster.grid);
                if (skeleton.length < 2) continue;
                templates.push({
                  tex: s.tex,
                  shape: describe(subsample(skeleton, TPL_POINTS))
                });
                made++;
              }
              if (!made) skipped.push(s.tex);
            }
            if (onProgress) onProgress(i / symbols.length);
            if (i < symbols.length) {
              setTimeout(chunk, 0);
            } else {
              built = true;
              resolve(templates.length);
            }
          }
          chunk();
        });
      },

      /* strokes: pole ťahov, ťah = pole [x,y] v ľubovoľných súradniciach. */
      recognize: function (strokes, limit, bias) {
        if (!built) return [];
        var pts = resampleStrokes(strokes, INK_POINTS);
        if (pts.length < 2) return [];
        var ink = describe(pts);

        var best = Object.create(null), i, d;
        for (i = 0; i < templates.length; i++) {
          d = shapeDistance(ink, templates[i].shape);
          if (!(templates[i].tex in best) || d < best[templates[i].tex]) {
            best[templates[i].tex] = d;
          }
        }
        for (i = 0; i < learned.length; i++) {
          d = shapeDistance(ink, learned[i].shape) * LEARNED_BONUS;
          if (!(learned[i].tex in best) || d < best[learned[i].tex]) {
            best[learned[i].tex] = d;
          }
        }

        /* bias smie zhodu iba zdražiť, nie vylúčiť – pri písmenách ním
         * hovoríme, že ťah siahajúci nad stredné linajky skôr znamená „C"
         * než „c". Keď sa netrafí, správny znak stále zostane v ponuke. */
        var out = Object.keys(best).map(function (tex) {
          var d = best[tex] * (bias ? bias(tex) : 1);
          return {
            tex: tex,
            dist: d,
            confidence: Math.max(0, Math.min(1, 1 - d / 1.1))
          };
        });
        out.sort(function (a, b) { return a.dist - b.dist; });
        return out.slice(0, limit || 8);
      },

      /* Zapamätá si, že tento ťah znamená daný symbol. */
      learn: function (strokes, tex) {
        var pts = resampleStrokes(strokes, INK_POINTS).map(function (p) {
          return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
        });
        if (pts.length < 2) return false;
        learned.push({ tex: tex, pts: pts, shape: describe(pts) });
        var mine = learned.filter(function (t) { return t.tex === tex; });
        if (mine.length > MAX_PER_SYMBOL) {
          learned.splice(learned.indexOf(mine[0]), 1);
        }
        saveLearned();
        return true;
      },

      learnedCount: function () { return learned.length; },

      forgetAll: function () { learned = []; saveLearned(); },

      // pomocné funkcie pre testy
      _internals: {
        rasterize: rasterize, thin: thin, normalize: normalize, subsample: subsample,
        cloudDistance: cloudDistance, resampleStrokes: resampleStrokes,
        describe: describe, shapeDistance: shapeDistance, setCloudWeight: setCloudWeight,
        setStretchPenalty: function (v) { STRETCH_PENALTY = v; }
      }
    };

    return Recognizer;
  }

  MW.createRecognizer = makeRecognizer;

  // Matematické symboly – pôvodná sada, na ktorú sa odkazuje zvyšok appky.
  MW.Recognizer = makeRecognizer(LEARNED_KEY);
})();
