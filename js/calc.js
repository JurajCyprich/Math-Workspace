/* Vyhodnocovanie výrazov napísaných v LaTeXu.
 *
 * Vlastný tokenizer a rekurzívny parser – zámerne nie eval(): do plochy sa
 * dá napísať čokoľvek a nič z toho sa nesmie spustiť ako kód.
 *
 * Čo pozná: + − · ×, zlomky, mocniny, odmocniny aj vyššieho stupňa, zátvorky,
 * goniometriu, logaritmy, absolútnu hodnotu, π a e, stupne (30^\circ) aj
 * desatinnú čiarku. Čokoľvek neznáme – premenná, jednotka, text – znamená
 * „toto sa vyčísliť nedá" a appka sa k tomu nevyjadruje.
 */
window.MW = window.MW || {};

(function () {
  'use strict';

  function NotNumeric(msg) { this.message = msg || 'nedá sa vyčísliť'; }

  /* ── mnohočleny ───────────────────────────────────────────────────── */

  /* Vyhodnocovač nepočíta s číslami, ale s mnohočlenmi v jednej neznámej:
   * pole koeficientov [c0, c1, c2] znamená c0 + c1·x + c2·x².  Číslo je len
   * mnohočlen nultého stupňa, takže bežné počítanie funguje ako predtým –
   * a „2x + 3" prestane byť chyba. Rozdiel strán rovnice potom priamo dáva
   * mnohočlen, ktorý stačí položiť rovný nule. */
  var EPS = 1e-10;

  function trimPoly(p) {
    while (p.length > 1 && Math.abs(p[p.length - 1]) < EPS) p.pop();
    return p;
  }

  function degree(p) { return trimPoly(p.slice()).length - 1; }

  function addPoly(a, b, sign) {
    var n = Math.max(a.length, b.length), out = [];
    for (var i = 0; i < n; i++) out.push((a[i] || 0) + sign * (b[i] || 0));
    return trimPoly(out);
  }

  function mulPoly(a, b) {
    var out = new Array(a.length + b.length - 1).fill(0);
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
    }
    return trimPoly(out);
  }

  function divPoly(a, b) {
    if (degree(b) > 0) throw new NotNumeric('delenie neznámou');
    if (Math.abs(b[0]) < EPS) throw new NotNumeric('delenie nulou');
    return trimPoly(a.map(function (c) { return c / b[0]; }));
  }

  function powPoly(base, exp) {
    var n = constant(exp);
    if (degree(base) === 0) return [Math.pow(base[0], n)];
    if (Math.abs(n - Math.round(n)) > EPS || n < 0 || n > 8) {
      throw new NotNumeric('neznáma v takejto mocnine');
    }
    var out = [1];
    for (var i = 0; i < Math.round(n); i++) out = mulPoly(out, base);
    return out;
  }

  // Hodnota, ktorá musí byť číslo – napríklad argument sínusu.
  function constant(p) {
    if (degree(p) > 0) throw new NotNumeric('tu nesmie byť neznáma');
    return p[0];
  }

  function wrap(fn) {
    return function (p) { return [fn(constant(p))]; };
  }

  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    cot: function (x) { return 1 / Math.tan(x); },
    sec: function (x) { return 1 / Math.cos(x); },
    csc: function (x) { return 1 / Math.sin(x); },
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    exp: Math.exp, ln: Math.log
  };

  // Príkazy, ktoré sa správajú ako operátor medzi dvoma hodnotami.
  var INFIX = { cdot: '*', times: '*', div: '/' };

  // Príkazy, pri ktorých výraz nemá číselný zmysel (jednotky, text, prostredia).
  var OPAQUE = /\\(unit|mathrm|text|textrm|begin|end|vec|hat|bar|dot|ddot|overline|underline|ket|bra|braket|infty|pm|mp|approx|neq|leq|geq|to|in|partial|nabla|sum|prod|int|lim|binom)\b/;

  /* ── tokenizer ────────────────────────────────────────────────────── */

  function tokenize(src) {
    var s = String(src)
      .replace(/\{,\}/g, '.')                       // KaTeXová desatinná čiarka
      .replace(/\\(?:left|right|quad|qquad)\b/g, ' ')   // len medzery a zátvorky
      .replace(/\\[!,;:]/g, ' ')
      .replace(/\\\s/g, ' ');

    var out = [], i = 0;
    while (i < s.length) {
      var c = s.charAt(i);

      if (c === ' ' || c === '\t') { i++; continue; }

      if (c === '\\') {
        var m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
        if (!m) throw new NotNumeric('neznámy príkaz');
        out.push({ t: 'cmd', v: m[1] });
        i += m[0].length;
        continue;
      }

      if (c >= '0' && c <= '9') {
        var num = /^\d+(?:[.,]\d+)?/.exec(s.slice(i))[0];
        out.push({ t: 'num', v: parseFloat(num.replace(',', '.')) });
        i += num.length;
        continue;
      }

      if (c === '.' && /\d/.test(s.charAt(i + 1))) {
        var frac = /^\.\d+/.exec(s.slice(i))[0];
        out.push({ t: 'num', v: parseFloat(frac) });
        i += frac.length;
        continue;
      }

      if (/[a-zA-Z]/.test(c)) { out.push({ t: 'id', v: c }); i++; continue; }

      if ('+-*/^(){}[]_'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }

      throw new NotNumeric('neznámy znak ' + c);
    }
    return out;
  }

  /* ── parser ───────────────────────────────────────────────────────── */

  function parser(tokens) {
    var pos = 0;
    var unknown = null;          // jedna neznáma na výraz, viac sa riešiť nedá

    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function isOp(v) { var t = peek(); return t && t.t === 'op' && t.v === v; }
    function eat(v) {
      if (!isOp(v)) throw new NotNumeric('chýba ' + v);
      pos++;
    }

    // Začína tu nová hodnota? Podľa toho poznáme skryté násobenie (2\pi).
    function startsValue() {
      var t = peek();
      if (!t) return false;
      if (t.t === 'num' || t.t === 'id') return true;
      if (t.t === 'op') return t.v === '(' || t.v === '{' || t.v === '[';
      if (t.t === 'cmd') return !(t.v in INFIX);
      return false;
    }

    function group() {
      if (isOp('{')) { eat('{'); var v = expr(); eat('}'); return v; }
      return primary();
    }

    function primary() {
      var t = next();
      if (!t) throw new NotNumeric('výraz končí predčasne');

      if (t.t === 'num') return [t.v];

      if (t.t === 'id') {
        if (t.v === 'e') return [Math.E];
        if (unknown && unknown !== t.v) throw new NotNumeric('viac neznámych naraz');
        unknown = t.v;
        return [0, 1];
      }

      if (t.t === 'op') {
        if (t.v === '(') { var a = expr(); eat(')'); return a; }
        if (t.v === '{') { var b = expr(); eat('}'); return b; }
        if (t.v === '[') { var c = expr(); eat(']'); return c; }
        if (t.v === '-') return addPoly([0], unary(), -1);
        if (t.v === '+') return unary();
        throw new NotNumeric('neočakávané ' + t.v);
      }

      // t.t === 'cmd'
      var name = t.v;
      if (name === 'pi') return [Math.PI];

      if (name === 'frac' || name === 'tfrac' || name === 'dfrac') {
        return divPoly(group(), group());
      }

      if (name === 'sqrt') {
        var root = 2;
        if (isOp('[')) { eat('['); root = constant(expr()); eat(']'); }
        var arg = constant(group());
        if (root === 2) {
          if (arg < 0) throw new NotNumeric('odmocnina zo záporného čísla');
          return [Math.sqrt(arg)];
        }
        if (arg < 0) {
          // nepárny stupeň zo záporného čísla má reálny výsledok
          if (Math.abs(root % 2) !== 1) throw new NotNumeric('odmocnina zo záporného čísla');
          return [-Math.pow(-arg, 1 / root)];
        }
        return [Math.pow(arg, 1 / root)];
      }

      if (name === 'abs') return [Math.abs(constant(group()))];

      if (name === 'log') {
        var base = 10;
        if (isOp('_')) { eat('_'); base = constant(group()); }
        return applyFunc(wrap(function (x) { return Math.log(x) / Math.log(base); }));
      }

      if (name in FUNCS) return applyFunc(wrap(FUNCS[name]));

      throw new NotNumeric('neznámy príkaz \\' + name);
    }

    // \sin^2(x) znamená (sin x)^2, nie sin(sin x) – mocnina patrí výsledku.
    function applyFunc(fn) {
      var exp = null;
      if (isOp('^')) { eat('^'); exp = group(); }
      var value = fn(group());
      return exp === null ? value : powPoly(value, exp);
    }

    function isCmd(v) { var t = peek(); return !!t && t.t === 'cmd' && t.v === v; }

    function power() {
      var base = primary();
      if (!isOp('^')) return base;
      eat('^');

      // 30^\circ aj 30^{\circ} je uhol v stupňoch, nie mocnina
      if (isCmd('circ')) { next(); return [constant(base) * Math.PI / 180]; }
      if (isOp('{')) {
        var mark = pos;
        eat('{');
        if (isCmd('circ')) { next(); eat('}'); return [constant(base) * Math.PI / 180]; }
        pos = mark;                    // nebol to stupeň, ide o bežnú mocninu
      }
      return powPoly(base, unary());
    }

    function unary() {
      if (isOp('-')) { eat('-'); return addPoly([0], unary(), -1); }
      if (isOp('+')) { eat('+'); return unary(); }
      return power();
    }

    function term() {
      var value = unary();
      for (;;) {
        var t = peek();
        if (!t) break;
        if (t.t === 'op' && (t.v === '*' || t.v === '/')) {
          next();
          var rhs = unary();
          value = t.v === '*' ? mulPoly(value, rhs) : divPoly(value, rhs);
          continue;
        }
        if (t.t === 'cmd' && t.v in INFIX) {
          next();
          var r2 = unary();
          value = INFIX[t.v] === '*' ? mulPoly(value, r2) : divPoly(value, r2);
          continue;
        }
        if (startsValue()) { value = mulPoly(value, unary()); continue; }   // skryté násobenie
        break;
      }
      return value;
    }

    function expr() {
      var value = term();
      for (;;) {
        if (isOp('+')) { next(); value = addPoly(value, term(), 1); continue; }
        if (isOp('-')) { next(); value = addPoly(value, term(), -1); continue; }
        break;
      }
      return value;
    }

    var result = expr();
    if (pos < tokens.length) throw new NotNumeric('zvyšok výrazu sa nedá prečítať');
    return { poly: trimPoly(result), unknown: unknown };
  }

  /* ── verejné API ──────────────────────────────────────────────────── */

  // Vyhodnotí výraz. Vráti číslo, alebo null, keď sa vyčísliť nedá.
  function evaluate(src) {
    if (!src || !String(src).trim()) return null;
    if (OPAQUE.test(src)) return null;
    try {
      var out = parser(tokenize(src));
      if (out.poly.length !== 1) return null;        // zostala neznáma
      var v = out.poly[0];
      return isFinite(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  // Číslo na zápis do vzorca. Desatinná čiarka sa v KaTeXu píše ako {,}.
  function format(value, comma) {
    if (value === null || !isFinite(value)) return null;

    var abs = Math.abs(value), out;
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
      var exp = Math.floor(Math.log10(abs));
      var mant = value / Math.pow(10, exp);
      out = trim(mant.toFixed(6)) + ' \\cdot 10^{' + exp + '}';
    } else {
      out = trim(value.toFixed(10));
    }
    return comma ? out.replace('.', '{,}') : out;
  }

  // Zbaví sa nulového chvosta aj drobnej nepresnosti plávajúcej čiarky.
  function trim(s) {
    if (s.indexOf('.') < 0) return s;
    s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }

  /* Z riadku bloku vytiahne to, čo sa dá dopočítať.
   * Pravidlá: za posledným „=" je to, čo nás zaujíma; ak je tam už hotové
   * číslo, nie je čo počítať; ak je za „=" prázdno, počítame to pred ním. */
  // Holé číslo – s bodkou, čiarkou aj v KaTeXovom zápise „1{,}5".
  function isNumber(text) {
    return /^-?\d+(?:[.,]\d+)?$/.test(text) || /^-?\d+\{,\}\d+$/.test(text);
  }

  // Rovnica, ktorá už je vyriešená: neznáma na jednej strane, číslo na druhej.
  function alreadySolved(line) {
    var parts = String(line).split('=');
    if (parts.length !== 2) return false;
    var a = parts[0].trim(), b = parts[1].trim();
    return (/^[a-zA-Z]$/.test(a) && isNumber(b)) || (/^[a-zA-Z]$/.test(b) && isNumber(a));
  }

  function lineExpression(line) {
    if (!line || /^\s*#/.test(line)) return null;
    var parts = String(line).split('=');
    var last = parts[parts.length - 1].trim();

    if (!last) {
      if (parts.length < 2) return null;
      var before = parts[parts.length - 2].trim();
      return before ? before : null;
    }
    if (isNumber(last)) return null;                     // už vypočítané
    return last;
  }

  /* Vyrieši rovnicu o jednej neznámej. Obe strany sa prečítajú ako mnohočleny
   * a ich rozdiel sa položí rovný nule; podľa stupňa ide o lineárnu alebo
   * kvadratickú rovnicu. Grécke písmená sú príkazy, nie neznáme, takže
   * fyzikálne vzťahy ako „c = \lambda f" sa riešiť nepokúša. */
  function solve(src) {
    if (!src || OPAQUE.test(src)) return null;
    var parts = String(src).split('=');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;

    try {
      var left = parser(tokenize(parts[0]));
      var right = parser(tokenize(parts[1]));
      if (left.unknown && right.unknown && left.unknown !== right.unknown) return null;
      var name = left.unknown || right.unknown;
      if (!name) return null;                    // rovnica bez neznámej

      var p = addPoly(left.poly, right.poly, -1);
      var deg = degree(p);

      if (deg === 0) {
        return { unknown: name, kind: Math.abs(p[0]) < EPS ? 'identity' : 'none', roots: [] };
      }
      if (deg === 1) {
        return { unknown: name, kind: 'linear', roots: [-p[0] / p[1]] };
      }
      if (deg === 2) {
        var c = p[0], b = p[1], a = p[2];
        var D = b * b - 4 * a * c;
        if (D < -EPS) return { unknown: name, kind: 'complex', roots: [], D: D };
        if (D <= EPS) return { unknown: name, kind: 'double', roots: [-b / (2 * a)], D: 0 };
        var r = Math.sqrt(D);
        return {
          unknown: name, kind: 'quadratic', D: D,
          roots: [(-b + r) / (2 * a), (-b - r) / (2 * a)]
        };
      }
      return null;                               // vyšší stupeň neriešime
    } catch (e) {
      return null;
    }
  }

  // Riešenie ako hotový zápis do vzorca.
  function solutionTex(sol, comma) {
    if (!sol) return null;
    var x = sol.unknown;
    if (sol.kind === 'identity') return x + ' \\in \\mathbb{R}';
    if (sol.kind === 'none' || sol.kind === 'complex') return x + ' \\notin \\mathbb{R}';
    if (sol.roots.length === 1) return x + ' = ' + format(sol.roots[0], comma);
    return x + '_{1} = ' + format(sol.roots[0], comma) +
      ' \\quad ' + x + '_{2} = ' + format(sol.roots[1], comma);
  }

  // Výsledok riadku ako hotový text do vzorca, alebo null.
  function lineResult(line, comma) {
    var expr = lineExpression(line);
    if (expr === null) return null;
    var value = evaluate(expr);
    if (value === null) return null;
    return format(value, comma);
  }

  /* Čo sa s riadkom dá spraviť: dopočítať hodnotu, alebo vyriešiť rovnicu.
   * Appka podľa toho ponúkne tlačidlo. */
  function lineAction(line, comma) {
    if (!line || /^\s*#/.test(line)) return null;
    var value = lineResult(line, comma);
    if (value !== null) return { kind: 'value', text: value };
    if (alreadySolved(line)) return null;
    var sol = solve(line);
    var tex = solutionTex(sol, comma);
    return tex ? { kind: 'solve', text: tex, unknown: sol.unknown } : null;
  }

  window.MW.Calc = {
    evaluate: evaluate,
    format: format,
    solve: solve,
    solutionTex: solutionTex,
    lineExpression: lineExpression,
    lineResult: lineResult,
    lineAction: lineAction
  };
})();
