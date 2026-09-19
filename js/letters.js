/* Písmená pre ručné písanie na linajky.
 *
 * Tvar sám o sebe nerozlíši „C" od „c" – po normalizácii sú to tie isté body.
 * Rozhoduje až výška ťahu voči linajkám: čo siaha nad strednú linajku, je
 * veľké písmeno alebo písmeno s horným dotiahnutím; čo klesá pod základnú
 * linajku, má dolné dotiahnutie. To isté oddelí „0" od „o" či „P" od „p".
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

  /* Rozdelí ťahy na jednotlivé znaky podľa vodorovných medzier.
   * Ťahy jedného písmena sa prekrývajú alebo takmer dotýkajú – bodka nad „i"
   * aj prečiarknutie „t" tak zostanú pri svojom písmene. Väčšia medzera
   * znamená nový znak, ešte väčšia medzeru v texte. */
  function groupStrokes(strokes, opts) {
    opts = opts || {};
    var join = opts.join || 4;          // ešte to isté písmeno
    var space = opts.space || 40;       // medzera v texte

    var items = strokes
      .filter(function (st) { return st && st.length; })
      .map(function (st) { return { st: st, b: box([st]) }; })
      .sort(function (a, b) { return a.b.minX - b.b.minX; });

    var groups = [];
    items.forEach(function (it) {
      var last = groups[groups.length - 1];
      if (last && it.b.minX <= last.right + join) {
        last.strokes.push(it.st);
        last.right = Math.max(last.right, it.b.maxX);
        return;
      }
      groups.push({
        strokes: [it.st],
        left: it.b.minX,
        right: it.b.maxX,
        spaceBefore: !!last && (it.b.minX - last.right) > space
      });
    });

    groups.forEach(function (g) { g.box = box(g.strokes); });
    return groups;
  }

  /* Do akého pásma medzi linajkami znak siaha. */
  function classify(b, guides) {
    var xh = Math.max(1, guides.base - guides.xTop);
    var tol = 0.18 * xh;
    return {
      tall: b.minY < guides.xTop - tol,
      deep: b.maxY > guides.base + tol,
      height: b.maxY - b.minY,
      width: b.maxX - b.minX
    };
  }

  /* Zvýhodní znaky, ktoré do nameraného pásma sedia. Zhodu iba zdražuje,
   * takže keď sa výška zmeria zle, správny znak zostane v ponuke. */
  function bias(cls) {
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
    groupStrokes: groupStrokes,
    classify: classify,
    bias: bias,
    tinyMark: tinyMark,
    byChar: function (ch) { return BY_CH[ch]; }
  };
})();
