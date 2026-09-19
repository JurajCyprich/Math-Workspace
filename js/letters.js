/* Písmená pre ručné písanie na plochu.
 *
 * Tvar sám o sebe nerozlíši „C" od „c" – po normalizácii sú to tie isté body.
 * Rozhoduje až to, ako vysoko ťah siaha voči ostatným napísaným znakom.
 * Na voľnej ploche žiadne linajky nie sú, takže si ich odhadujeme priebežne
 * z toho, čo už človek napísal. Rovnako sa oddelí „0" od „o" či „P" od „p".
 */
window.MW = window.MW || {};

(function () {
  'use strict';

  var LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var DIGITS = '0123456789';
  var PUNCT = '.,?!-+=()%:;\'"/';
  /* Písmená s diakritikou v sade zámerne nie sú. Ich glyf je písmeno plus
   * mäkčeň či dĺžeň, čo po normalizácii vyzerá ako „b" alebo „d" a vytláčalo
   * to bežné písmená z ponuky. Na klávesnici sa navyše píšu bez problémov –
   * na rozdiel od matematických symbolov, kvôli ktorým kreslenie vzniklo. */

  // Siaha nad strednú linajku.
  var TALL = UPPER + DIGITS + 'bdfhijklt' + '()/!?"\'';
  // Klesá pod základnú linajku.
  var DEEP = 'gjpqy' + '(),;/';

  // Znaky, ktoré sú len bodkou alebo čiarkou – tie poznáme podľa veľkosti,
  // tvarové porovnanie by z nich spravilo škvrnu podobnú čomukoľvek.
  var TINY = '.,:;\'';

  var LETTERS = [];
  (LOWER + UPPER + DIGITS + PUNCT).split('').forEach(function (ch) {
    LETTERS.push({
      tex: ch,
      ch: ch,
      name: ch,
      tall: TALL.indexOf(ch) >= 0,
      deep: DEEP.indexOf(ch) >= 0,
      tiny: TINY.indexOf(ch) >= 0
    });
  });

  var BY_CH = Object.create(null);
  LETTERS.forEach(function (l) { BY_CH[l.ch] = l; });

  function box(strokes) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(function (st) {
      st.forEach(function (p) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      });
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  /* Na voľnej ploche žiadne linajky nie sú, takže si ich odvodíme z toho,
   * čo človek práve napísal: základná linajka je spodok väčšiny znakov a
   * stredná výška je spodná tretina ich výšok (väčšina písmen je nízkych).
   * Kým nie je z čoho merať, radšej nehádame a výšku neberieme do úvahy. */
  function lineTracker(keep) {
    var boxes = [];
    var LIMIT = keep || 14;

    function percentile(list, p) {
      var a = list.slice().sort(function (x, y) { return x - y; });
      return a[Math.min(a.length - 1, Math.floor(p * a.length))];
    }

    function metrics() {
      if (boxes.length < 3) return null;
      return {
        base: percentile(boxes.map(function (b) { return b.maxY; }), 0.5),
        xh: Math.max(1, percentile(boxes.map(function (b) { return b.maxY - b.minY; }), 0.35))
      };
    }

    return {
      metrics: metrics,
      reset: function () { boxes = []; },
      push: function (b) {
        boxes.push(b);
        if (boxes.length > LIMIT) boxes.shift();
      },
      /* Odhad strednej výšky ešte pred tretím znakom – na delenie ťahov
       * treba nejakú mierku hneď od prvého písmena. */
      scale: function (fallback) {
        var m = metrics();
        if (m) return m.xh;
        if (boxes.length) {
          return Math.max(1, percentile(boxes.map(function (b) { return b.maxY - b.minY; }), 0.35));
        }
        return fallback;
      },
      classify: function (b) {
        var m = metrics();
        if (!m) return { unknown: true, tall: false, deep: false };
        return {
          unknown: false,
          tall: (m.base - b.minY) > 1.32 * m.xh,
          deep: (b.maxY - m.base) > 0.3 * m.xh
        };
      }
    };
  }

  /* Zvýhodní znaky, ktoré do nameraného pásma sedia. Zhodu iba zdražuje,
   * takže keď sa výška zmeria zle, správny znak zostane v ponuke. */
  function bias(cls) {
    if (!cls || cls.unknown) return null;      // nemeriame – nehádžeme váhu
    return function (ch) {
      var l = BY_CH[ch];
      if (!l) return 1;
      var penalty = 1;
      if (l.tall !== cls.tall) penalty *= 1.3;
      if (l.deep !== cls.deep) penalty *= 1.2;
      return penalty;
    };
  }

  /* Drobný ťah pri základnej linajke je interpunkcia, nie písmeno. */
  function tinyMark(b, guides) {
    var xh = Math.max(1, guides.base - guides.xTop);
    if (b.maxY - b.minY > 0.4 * xh || b.maxX - b.minX > 0.4 * xh) return null;
    if (b.minY < guides.base - 0.55 * xh) return null;
    return (b.maxY - b.minY) > (b.maxX - b.minX) * 1.4 ? ',' : '.';
  }

  MW.LETTERS = LETTERS;
  MW.Handwriting = {
    box: box,
    lineTracker: lineTracker,
    bias: bias,
    tinyMark: tinyMark,
    byChar: function (ch) { return BY_CH[ch]; }
  };
})();
