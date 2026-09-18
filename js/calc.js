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

      if (t.t === 'num') return t.v;

      if (t.t === 'id') {
        if (t.v === 'e') return Math.E;
        throw new NotNumeric('neznáma premenná ' + t.v);
      }

      if (t.t === 'op') {
        if (t.v === '(') { var a = expr(); eat(')'); return a; }
        if (t.v === '{') { var b = expr(); eat('}'); return b; }
        if (t.v === '[') { var c = expr(); eat(']'); return c; }
        if (t.v === '-') return -unary();
        if (t.v === '+') return unary();
        throw new NotNumeric('neočakávané ' + t.v);
      }

      // t.t === 'cmd'
      var name = t.v;
      if (name === 'pi') return Math.PI;

      if (name === 'frac' || name === 'tfrac' || name === 'dfrac') {
        var top = group(), bot = group();
        if (bot === 0) throw new NotNumeric('delenie nulou');
        return top / bot;
      }

      if (name === 'sqrt') {
        var degree = 2;
        if (isOp('[')) { eat('['); degree = expr(); eat(']'); }
        var arg = group();
        if (degree === 2) {
          if (arg < 0) throw new NotNumeric('odmocnina zo záporného čísla');
          return Math.sqrt(arg);
        }
        if (arg < 0) {
          // nepárny stupeň zo záporného čísla má reálny výsledok
          if (Math.abs(degree % 2) !== 1) throw new NotNumeric('odmocnina zo záporného čísla');
          return -Math.pow(-arg, 1 / degree);
        }
        return Math.pow(arg, 1 / degree);
      }

      if (name === 'abs') return Math.abs(group());

      if (name === 'log') {
        var base = 10;
        if (isOp('_')) { eat('_'); base = group(); }
        return applyFunc(function (x) { return Math.log(x) / Math.log(base); });
      }

      if (name in FUNCS) return applyFunc(FUNCS[name]);

      throw new NotNumeric('neznámy príkaz \\' + name);
    }

    // \sin^2(x) znamená (sin x)^2, nie sin(sin x) – mocnina patrí výsledku.
    function applyFunc(fn) {
      var power = null;
      if (isOp('^')) { eat('^'); power = group(); }
      var value = fn(group());
      return power === null ? value : Math.pow(value, power);
    }

    function isCmd(v) { var t = peek(); return !!t && t.t === 'cmd' && t.v === v; }

    function power() {
      var base = primary();
      if (!isOp('^')) return base;
      eat('^');

      // 30^\circ aj 30^{\circ} je uhol v stupňoch, nie mocnina
      if (isCmd('circ')) { next(); return base * Math.PI / 180; }
      if (isOp('{')) {
        var mark = pos;
        eat('{');
        if (isCmd('circ')) { next(); eat('}'); return base * Math.PI / 180; }
        pos = mark;                    // nebol to stupeň, ide o bežnú mocninu
      }
      return Math.pow(base, unary());
    }

    function unary() {
      if (isOp('-')) { eat('-'); return -unary(); }
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
          if (t.v === '/' && rhs === 0) throw new NotNumeric('delenie nulou');
          value = t.v === '*' ? value * rhs : value / rhs;
          continue;
        }
        if (t.t === 'cmd' && t.v in INFIX) {
          next();
          var r2 = unary();
          if (INFIX[t.v] === '/' && r2 === 0) throw new NotNumeric('delenie nulou');
          value = INFIX[t.v] === '*' ? value * r2 : value / r2;
          continue;
        }
        if (startsValue()) { value = value * unary(); continue; }   // skryté násobenie
        break;
      }
      return value;
    }

    function expr() {
      var value = term();
      for (;;) {
        if (isOp('+')) { next(); value = value + term(); continue; }
        if (isOp('-')) { next(); value = value - term(); continue; }
        break;
      }
      return value;
    }

    var result = expr();
    if (pos < tokens.length) throw new NotNumeric('zvyšok výrazu sa nedá prečítať');
    return result;
  }

  /* ── verejné API ──────────────────────────────────────────────────── */

  // Vyhodnotí výraz. Vráti číslo, alebo null, keď sa vyčísliť nedá.
  function evaluate(src) {
    if (!src || !String(src).trim()) return null;
    if (OPAQUE.test(src)) return null;
    try {
      var v = parser(tokenize(src));
      return (typeof v === 'number' && isFinite(v)) ? v : null;
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
  function lineExpression(line) {
    if (!line || /^\s*#/.test(line)) return null;
    var parts = String(line).split('=');
    var last = parts[parts.length - 1].trim();

    if (!last) {
      if (parts.length < 2) return null;
      var before = parts[parts.length - 2].trim();
      return before ? before : null;
    }
    if (/^-?\d+(?:[.,]\d+)?$/.test(last)) return null;   // už vypočítané
    if (/^-?\d+\{,\}\d+$/.test(last)) return null;
    return last;
  }

  // Výsledok riadku ako hotový text do vzorca, alebo null.
  function lineResult(line, comma) {
    var expr = lineExpression(line);
    if (expr === null) return null;
    var value = evaluate(expr);
    if (value === null) return null;
    return format(value, comma);
  }

  window.MW.Calc = {
    evaluate: evaluate,
    format: format,
    lineExpression: lineExpression,
    lineResult: lineResult
  };
})();
