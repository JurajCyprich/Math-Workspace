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

  /* ── lomené výrazy ────────────────────────────────────────────────── */

  /* Vyhodnocovač nepočíta s číslami, ale s podielom dvoch mnohočlenov v jednej
   * neznámej: pole koeficientov [c0, c1, c2] znamená c0 + c1·x + c2·x².  Číslo
   * je mnohočlen nultého stupňa delený jednotkou, takže bežné počítanie
   * funguje ako predtým – a „2x + 3" ani „\frac{1}{x}" už nie sú chyba.
   * Rozdiel strán rovnice po roznásobení menovateľov dáva mnohočlen, ktorý
   * stačí položiť rovný nule.
   *
   * Každé delenie výrazom s neznámou si odloží podmienku: hodnota, pri ktorej
   * by bol menovateľ nula, do riešenia patriť nesmie. */
  var EPS = 1e-10;

  function trimPoly(p) {
    while (p.length > 1 && Math.abs(p[p.length - 1]) < EPS) p.pop();
    return p;
  }

  function degree(p) { return trimPoly(p.slice()).length - 1; }

  function isZero(p) { return degree(p) === 0 && Math.abs(p[0]) < EPS; }

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

  function valueAt(p, x) {
    var out = 0;
    for (var i = p.length - 1; i >= 0; i--) out = out * x + p[i];
    return out;
  }

  // Hodnota výrazu: podiel n/d. Obyčajné číslo má menovateľa 1.
  function rat(n, d) { return { n: n, d: d || [1] }; }
  function num(v) { return rat([v]); }

  function rAdd(a, b, sign) {
    return rat(addPoly(mulPoly(a.n, b.d), mulPoly(b.n, a.d), sign), mulPoly(a.d, b.d));
  }

  function rMul(a, b) { return rat(mulPoly(a.n, b.n), mulPoly(a.d, b.d)); }

  function rNeg(a) { return rat(addPoly([0], a.n, -1), a.d); }

  function rIsNumber(a) { return degree(a.n) === 0 && degree(a.d) === 0; }

  /* ── tabuľky príkazov ─────────────────────────────────────────────── */

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
    var bans = [];               // menovatele, ktoré nesmú vyjsť na nulu

    // Hodnota, ktorá musí byť číslo – napríklad argument sínusu.
    function rConst(a) {
      if (!rIsNumber(a)) throw new NotNumeric('tu nesmie byť neznáma');
      if (Math.abs(a.d[0]) < EPS) throw new NotNumeric('delenie nulou');
      return a.n[0] / a.d[0];
    }

    function rDiv(a, b) {
      if (isZero(b.n)) throw new NotNumeric('delenie nulou');
      if (degree(b.n) > 0) bans.push(b.n);          // podmienka pre riešenie
      return rat(mulPoly(a.n, b.d), mulPoly(a.d, b.n));
    }

    function rPow(base, exp) {
      var e = rConst(exp);
      if (rIsNumber(base)) return num(Math.pow(rConst(base), e));
      if (Math.abs(e - Math.round(e)) > EPS || Math.abs(e) > 8) {
        throw new NotNumeric('neznáma v takejto mocnine');
      }
      e = Math.round(e);
      var step = e < 0 ? rDiv(num(1), base) : base;
      var out = num(1);
      for (var i = 0; i < Math.abs(e); i++) out = rMul(out, step);
      return out;
    }

    function wrap(fn) {
      return function (a) { return num(fn(rConst(a))); };
    }

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

      if (t.t === 'num') return num(t.v);

      if (t.t === 'id') {
        if (t.v === 'e') return num(Math.E);
        if (unknown && unknown !== t.v) throw new NotNumeric('viac neznámych naraz');
        unknown = t.v;
        return rat([0, 1]);
      }

      if (t.t === 'op') {
        if (t.v === '(') { var a = expr(); eat(')'); return a; }
        if (t.v === '{') { var b = expr(); eat('}'); return b; }
        if (t.v === '[') { var c = expr(); eat(']'); return c; }
        if (t.v === '-') return rNeg(unary());
        if (t.v === '+') return unary();
        throw new NotNumeric('neočakávané ' + t.v);
      }

      // t.t === 'cmd'
      var name = t.v;
      if (name === 'pi') return num(Math.PI);

      if (name === 'frac' || name === 'tfrac' || name === 'dfrac') {
        return rDiv(group(), group());
      }

      if (name === 'sqrt') {
        var root = 2;
        if (isOp('[')) { eat('['); root = rConst(expr()); eat(']'); }
        var arg = rConst(group());
        if (root === 2) {
          if (arg < 0) throw new NotNumeric('odmocnina zo záporného čísla');
          return num(Math.sqrt(arg));
        }
        if (arg < 0) {
          // nepárny stupeň zo záporného čísla má reálny výsledok
          if (Math.abs(root % 2) !== 1) throw new NotNumeric('odmocnina zo záporného čísla');
          return num(-Math.pow(-arg, 1 / root));
        }
        return num(Math.pow(arg, 1 / root));
      }

      if (name === 'abs') return num(Math.abs(rConst(group())));

      if (name === 'log') {
        var base = 10;
        if (isOp('_')) { eat('_'); base = rConst(group()); }
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
      return exp === null ? value : rPow(value, exp);
    }

    function isCmd(v) { var t = peek(); return !!t && t.t === 'cmd' && t.v === v; }

    function power() {
      var base = primary();
      if (!isOp('^')) return base;
      eat('^');

      // 30^\circ aj 30^{\circ} je uhol v stupňoch, nie mocnina
      if (isCmd('circ')) { next(); return num(rConst(base) * Math.PI / 180); }
      if (isOp('{')) {
        var mark = pos;
        eat('{');
        if (isCmd('circ')) { next(); eat('}'); return num(rConst(base) * Math.PI / 180); }
        pos = mark;                    // nebol to stupeň, ide o bežnú mocninu
      }
      return rPow(base, unary());
    }

    function unary() {
      if (isOp('-')) { eat('-'); return rNeg(unary()); }
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
          value = t.v === '*' ? rMul(value, rhs) : rDiv(value, rhs);
          continue;
        }
        if (t.t === 'cmd' && t.v in INFIX) {
          next();
          var r2 = unary();
          value = INFIX[t.v] === '*' ? rMul(value, r2) : rDiv(value, r2);
          continue;
        }
        if (startsValue()) { value = rMul(value, unary()); continue; }   // skryté násobenie
        break;
      }
      return value;
    }

    function expr() {
      var value = term();
      for (;;) {
        if (isOp('+')) { next(); value = rAdd(value, term(), 1); continue; }
        if (isOp('-')) { next(); value = rAdd(value, term(), -1); continue; }
        break;
      }
      return value;
    }

    var result = expr();
    if (pos < tokens.length) throw new NotNumeric('zvyšok výrazu sa nedá prečítať');
    if (isZero(result.d)) throw new NotNumeric('delenie nulou');
    return { value: result, unknown: unknown, bans: bans };
  }

  /* ── verejné API ──────────────────────────────────────────────────── */

  // Vyhodnotí výraz. Vráti číslo, alebo null, keď sa vyčísliť nedá.
  function evaluate(src) {
    if (!src || !String(src).trim()) return null;
    if (OPAQUE.test(src)) return null;
    try {
      var out = parser(tokenize(src));
      if (!rIsNumber(out.value)) return null;        // zostala neznáma
      var v = out.value.n[0] / out.value.d[0];
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

  // Hotová odpoveď: číslo alebo zlomok z celých čísel.
  function isExact(text) {
    return isNumber(text) || /^-?\\[dt]?frac\{-?\d+\}\{-?\d+\}$/.test(text);
  }

  // Rovnica, ktorá už je vyriešená: neznáma na jednej strane, odpoveď na druhej.
  function alreadySolved(line) {
    var parts = String(line).split('=');
    if (parts.length !== 2) return false;
    var a = parts[0].trim(), b = parts[1].trim();
    return (/^[a-zA-Z]$/.test(a) && isExact(b)) || (/^[a-zA-Z]$/.test(b) && isExact(a));
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

  /* Vyrieši rovnicu o jednej neznámej. Obe strany sa prečítajú ako lomené
   * výrazy a rovnosť Ln/Ld = Rn/Rd sa roznásobí na Ln·Rd − Rn·Ld = 0; podľa
   * stupňa ide o lineárnu alebo kvadratickú rovnicu. Korene, pri ktorých by
   * niektorý menovateľ vyšiel na nulu, do definičného oboru nepatria a
   * vyhadzujú sa. Grécke písmená sú príkazy, nie neznáme, takže fyzikálne
   * vzťahy ako „c = \lambda f" sa riešiť nepokúša. */
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

      var bans = left.bans.concat(right.bans);
      var p = addPoly(mulPoly(left.value.n, right.value.d),
        mulPoly(right.value.n, left.value.d), -1);
      var deg = degree(p);

      if (deg === 0) {
        if (Math.abs(p[0]) >= EPS) return { unknown: name, kind: 'none', roots: [], bans: bans };
        return { unknown: name, kind: 'identity', roots: [], bans: bans };
      }

      var roots = null;
      if (deg === 1) {
        roots = [-p[0] / p[1]];
      } else if (deg === 2) {
        var c = p[0], b = p[1], a = p[2];
        var D = b * b - 4 * a * c;
        if (D < -EPS) return { unknown: name, kind: 'complex', roots: [], D: D, bans: bans };
        if (D <= EPS) {
          roots = [-b / (2 * a)];
        } else {
          var r = Math.sqrt(D);
          roots = [(-b + r) / (2 * a), (-b - r) / (2 * a)];
        }
      } else {
        return null;                             // vyšší stupeň neriešime
      }

      roots = roots.filter(function (x) { return allowed(x, bans); });
      if (!roots.length) return { unknown: name, kind: 'none', roots: [], bans: bans };
      return {
        unknown: name, roots: roots, bans: bans,
        kind: roots.length === 1 ? (deg === 1 ? 'linear' : 'double') : 'quadratic'
      };
    } catch (e) {
      return null;
    }
  }

  // Koreň patrí do definičného oboru, len kým žiadny menovateľ nie je nula.
  function allowed(x, bans) {
    if (!isFinite(x)) return false;
    for (var i = 0; i < bans.length; i++) {
      if (Math.abs(valueAt(bans[i], x)) < 1e-8 * (1 + Math.abs(x))) return false;
    }
    return true;
  }

  // Hodnoty, pri ktorých by menovateľ vyšiel na nulu – na výpis definičného oboru.
  function banned(bans) {
    var out = [];
    for (var i = 0; i < bans.length; i++) {
      var p = bans[i], deg = degree(p), r = [];
      if (deg === 1) r = [-p[0] / p[1]];
      else if (deg === 2) {
        var D = p[1] * p[1] - 4 * p[2] * p[0];
        if (D < -EPS) r = [];
        else if (D <= EPS) r = [-p[1] / (2 * p[2])];
        else {
          var q = Math.sqrt(D);
          r = [(-p[1] + q) / (2 * p[2]), (-p[1] - q) / (2 * p[2])];
        }
      } else return null;                        // takýto menovateľ nevypíšeme
      for (var j = 0; j < r.length; j++) {
        if (out.every(function (v) { return Math.abs(v - r[j]) > EPS; })) out.push(r[j]);
      }
    }
    return out.sort(function (a, b) { return a - b; });
  }

  /* Koreň ako zlomok, nie ako desatinné číslo: pri rovnici je „x = \frac{3}{2}"
   * presná odpoveď, kým „1,5" je len jej zápis inak – a pri tretinách už len
   * priblíženie. Najjednoduchší podiel sa hľadá reťazovým zlomkom; keď taký
   * s rozumným menovateľom nesedí (iracionálny koreň), vráti sa null a číslo
   * sa vypíše desatinne. */
  function fraction(value) {
    if (!isFinite(value) || Math.abs(value - Math.round(value)) < EPS) return null;
    var sign = value < 0 ? '-' : '', x = Math.abs(value);
    var h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x;

    for (var i = 0; i < 24; i++) {
      var a = Math.floor(b);
      var h = a * h1 + h0, k = a * k1 + k0;
      h0 = h1; h1 = h; k0 = k1; k1 = k;
      if (k > 10000) return null;
      if (Math.abs(x - h / k) < 1e-12 * Math.max(1, x)) {
        return k === 1 ? null : sign + '\\frac{' + h + '}{' + k + '}';
      }
      var rest = b - a;
      if (rest < 1e-12) return null;
      b = 1 / rest;
    }
    return null;
  }

  function formatRoot(value, comma) { return fraction(value) || format(value, comma); }

  // Riešenie ako hotový zápis do vzorca.
  function solutionTex(sol, comma) {
    if (!sol) return null;
    var x = sol.unknown;

    if (sol.kind === 'identity') {
      var out = banned(sol.bans || []);
      if (!out || !out.length) return x + ' \\in \\mathbb{R}';
      return x + ' \\in \\mathbb{R} \\setminus \\{' + out.map(function (v) {
        return formatRoot(v, comma);
      }).join('; ') + '\\}';
    }
    if (sol.kind === 'none' || sol.kind === 'complex') return x + ' \\notin \\mathbb{R}';
    if (sol.roots.length === 1) return x + ' = ' + formatRoot(sol.roots[0], comma);
    return x + '_{1} = ' + formatRoot(sol.roots[0], comma) +
      ' \\quad ' + x + '_{2} = ' + formatRoot(sol.roots[1], comma);
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
