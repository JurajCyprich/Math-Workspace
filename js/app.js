/* Math Workspace – nekonečná plocha na písanie matematiky a fyziky. */
(function () {
  'use strict';

  var STORAGE = 'mw:workspace:v1';
  var INK_OFF = 40000;          // posun SVG vrstvy, aby fungovali aj záporné súradnice
  var CARET = '⟦⟧';             // značka, kam skočí kurzor po vložení šablóny

  var $ = function (sel) { return document.querySelector(sel); };
  var stage = $('#stage'), world = $('#world'), inkSvg = $('#ink');

  var state = { blocks: [], strokes: [], view: { x: 0, y: 0, k: 1 } };
  var tool = 'select';
  var seq = 1;
  var activeEditor = null;      // {block, ta}
  var selected = null;

  /* ── drobnosti ────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }

  function uid() { return 'b' + (Date.now() % 1e7).toString(36) + (seq++); }

  /* ── sadzba vzorcov ───────────────────────────────────────────────── */

  function renderMath(tex, display) {
    if (!window.katex) return '<code>' + esc(tex) + '</code>';
    try {
      return window.katex.renderToString(tex, {
        displayMode: !!display,
        throwOnError: false,
        errorColor: '#ff6b81',
        strict: 'ignore',
        macros: Object.assign({}, MW.MACROS)
      });
    } catch (e) {
      return '<span class="bad">' + esc(tex) + '</span>';
    }
  }

  // Text s ostrovčekmi matematiky medzi $…$
  function mixedLine(line) {
    var parts = line.split('$'), out = '';
    for (var i = 0; i < parts.length; i++) {
      out += (i % 2) ? renderMath(parts[i], false) : esc(parts[i]);
    }
    return out;
  }

  function decimalComma() { return MW.lang() !== 'en'; }

  function contentHtml(text, math) {
    if (!text.trim()) return '<div class="empty">' + esc(MW.t('block.empty')) + '</div>';
    return text.split('\n').map(function (line, i) {
      if (!line.trim()) return '<div class="line">&nbsp;</div>';
      var t = line.trim();
      if (t.charAt(0) === '#') {
        return '<div class="line textline">' + mixedLine(t.replace(/^#\s?/, '')) + '</div>';
      }
      if (!math) return '<div class="line textline">' + mixedLine(line) + '</div>';

      // Riadok, ktorý sa dá vyčísliť, dostane tlačidlo na dopočítanie.
      var can = MW.Calc.lineResult(line, decimalComma()) !== null;
      return '<div class="line">' + renderMath(line, true) +
        (can ? '<button class="calc-line" data-line="' + i + '" title="' +
          esc(MW.t('calc.line.t')) + '">=</button>' : '') + '</div>';
    }).join('');
  }

  /* ── pohľad (posun a priblíženie) ─────────────────────────────────── */

  function applyView() {
    var v = state.view;
    world.style.transform = 'translate(' + v.x + 'px,' + v.y + 'px) scale(' + v.k + ')';
    $('#btn-zoom-reset').textContent = Math.round(v.k * 100) + ' %';
  }

  function zoomAt(sx, sy, factor) {
    var v = state.view;
    var k = Math.min(3, Math.max(0.25, v.k * factor));
    v.x = sx - (sx - v.x) * (k / v.k);
    v.y = sy - (sy - v.y) * (k / v.k);
    v.k = k;
    applyView();
    save();
  }

  function toWorld(sx, sy) {
    var v = state.view;
    return { x: (sx - v.x) / v.k, y: (sy - v.y) / v.k };
  }

  function viewCentre() {
    return toWorld(window.innerWidth / 2 - 130, window.innerHeight / 2 - 60);
  }

  /* ── bloky ────────────────────────────────────────────────────────── */

  function makeBlock(data) {
    var el = document.createElement('div');
    el.className = 'block';
    el.dataset.id = data.id;
    el.style.left = data.x + 'px';
    el.style.top = data.y + 'px';
    el.innerHTML =
      '<div class="block-bar">' +
        '<button class="mode" data-i18n-title="block.mode.t">∑</button>' +
        '<span class="grip">⠿⠿⠿</span>' +
        '<button class="dup" data-i18n-title="block.dup.t">⧉</button>' +
        '<button class="del" data-i18n-title="block.del.t">×</button>' +
      '</div>' +
      '<div class="render"></div>' +
      '<textarea spellcheck="false" wrap="off"></textarea>';

    var ta = el.querySelector('textarea');
    ta.value = data.text || '';
    data.el = el;
    data.ta = ta;

    el.querySelector('.mode').classList.toggle('on', data.math !== false);
    el.querySelector('.mode').addEventListener('click', function () {
      beginStep();
      commitStep();
      data.math = data.math === false;
      this.classList.toggle('on', data.math);
      paint(data);
      save();
    });
    el.querySelector('.del').addEventListener('click', function () { removeBlock(data); });
    el.querySelector('.dup').addEventListener('click', function () {
      var copy = addBlock(data.x + 26, data.y + 26, data.text, data.math);
      startEdit(copy);
    });

    el.querySelector('.render').addEventListener('mousedown', function (e) {
      e.stopPropagation();
      // Klik na „=" nemá otvárať úpravu, len dopočítať riadok.
      var calcBtn = e.target.closest('.calc-line');
      if (calcBtn) { e.preventDefault(); return; }
      startEdit(data);
    });

    el.querySelector('.render').addEventListener('click', function (e) {
      var calcBtn = e.target.closest('.calc-line');
      if (calcBtn) solveLine(data, Number(calcBtn.dataset.line));
    });

    el.addEventListener('mousedown', function () { select(data); });

    ta.addEventListener('input', function () {
      commitStep();            // stav spred začiatku písania, odložený pri fokuse
      data.text = ta.value;
      autosize(ta);
      paint(data);
      Autocomplete.update(ta, data.math !== false);
      save();
    });
    ta.addEventListener('focus', function () {
      activeEditor = { block: data, ta: ta };
      el.classList.add('editing');
      autosize(ta);
      beginStep();             // celé jedno písanie je jeden krok späť
    });
    ta.addEventListener('blur', function () {
      if (Autocomplete.busy) return;
      Autocomplete.hide();
      el.classList.remove('editing');
      paint(data);
    });
    ta.addEventListener('keydown', function (e) { onEditorKey(e, data, ta); });
    ta.addEventListener('click', function () { Autocomplete.update(ta, data.math !== false); });

    dragBar(el.querySelector('.block-bar'), data);
    world.appendChild(el);
    translate(el);
    paint(data);
    return data;
  }

  /* ── jazyk ────────────────────────────────────────────────────────── */

  // Preloží text, popisky a zástupné texty vnútri daného prvku.
  function translate(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.innerHTML = MW.t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = MW.t(el.dataset.i18nTitle);
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = MW.t(el.dataset.i18nPh);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', MW.t(el.dataset.i18nAria));
    });
  }

  function applyLang(next) {
    if (next) MW.setLang(next);
    document.documentElement.lang = MW.lang();
    MW.buildWords();
    translate(document);
    document.querySelectorAll('.lang').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === MW.lang());
    });
    state.blocks.forEach(paint);
    Palette.rebuild();
    Draw.relabel();
    Calculator.relabel();
    Notepad.relabel();
  }

  // Dopíše výsledok na koniec riadku. Prázdne „=" na konci nezdvojujeme.
  function solveLine(data, index) {
    var lines = data.text.split('\n');
    var result = MW.Calc.lineResult(lines[index], decimalComma());
    if (result === null) return;

    beginStep();
    commitStep();
    lines[index] = lines[index].replace(/\s*=\s*$/, '') + ' = ' + result;
    data.text = lines.join('\n');
    data.ta.value = data.text;
    autosize(data.ta);
    paint(data);
    save();
    toast(MW.t('toast.calc'));
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(46, ta.scrollHeight + 2) + 'px';
  }

  function paint(data) {
    var r = data.el.querySelector('.render');
    r.innerHTML = contentHtml(data.text, data.math !== false);
    r.classList.toggle('blank', !data.text.trim());
  }

  function addBlock(x, y, text, math) {
    beginStep();
    var data = { id: uid(), x: Math.round(x), y: Math.round(y), text: text || '', math: math !== false };
    state.blocks.push(data);
    makeBlock(data);
    data.el.classList.add('entering');
    setTimeout(function () { data.el.classList.remove('entering'); }, 220);
    commitStep();
    save();
    return data;
  }

  function removeBlock(data) {
    beginStep();
    commitStep();
    var i = state.blocks.indexOf(data);
    if (i >= 0) state.blocks.splice(i, 1);
    if (activeEditor && activeEditor.block === data) activeEditor = null;
    if (selected === data) selected = null;
    var el = data.el;
    el.classList.add('leaving');
    setTimeout(function () { el.remove(); }, 150);
    save();
  }

  function select(data) {
    if (selected && selected.el) selected.el.classList.remove('selected');
    selected = data;
    if (data) data.el.classList.add('selected');
  }

  function startEdit(data) {
    select(data);
    data.el.classList.add('editing');
    autosize(data.ta);
    setTimeout(function () {
      data.ta.focus();
      var end = data.ta.value.length;
      data.ta.setSelectionRange(end, end);
    }, 0);
  }

  function onEditorKey(e, data, ta) {
    if (Autocomplete.onKey(e, ta)) return;
    if (e.key === 'Escape') {
      ta.blur();
      e.stopPropagation();
    }
  }

  function dragBar(bar, data) {
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      e.stopPropagation();
      select(data);
      bar.setPointerCapture(e.pointerId);
      var sx = e.clientX, sy = e.clientY, ox = data.x, oy = data.y;
      beginStep();

      function move(ev) {
        commitStep();
        data.x = Math.round(ox + (ev.clientX - sx) / state.view.k);
        data.y = Math.round(oy + (ev.clientY - sy) / state.view.k);
        data.el.style.left = data.x + 'px';
        data.el.style.top = data.y + 'px';
      }
      function up() {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        save();
      }
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
  }

  /* ── vkladanie do práve písaného bloku ────────────────────────────── */

  function ensureEditor() {
    if (activeEditor && document.body.contains(activeEditor.ta)) return activeEditor;
    var c = viewCentre();
    var b = addBlock(c.x, c.y, '', true);
    startEdit(b);
    activeEditor = { block: b, ta: b.ta };
    return activeEditor;
  }

  function insertText(text) {
    var target = ensureEditor();
    var ta = target.ta;
    beginStep();
    var caretAt = text.indexOf(CARET);
    var clean = text.replace(CARET, '');

    var start = ta.selectionStart, end = ta.selectionEnd;
    var pos = start + (caretAt >= 0 ? caretAt : clean.length);

    ta.focus();
    // execCommand zachová natívne „späť", ale funguje len ak kurzor
    // naozaj sedí v tomto poli – po kliknutí do panelu to tak byť nemusí.
    var native = false;
    if (document.activeElement === ta) {
      ta.setSelectionRange(start, end);
      try { native = document.execCommand('insertText', false, clean); } catch (e) { native = false; }
    }
    if (!native) {
      ta.value = ta.value.slice(0, start) + clean + ta.value.slice(end);
    }
    ta.setSelectionRange(pos, pos);

    commitStep();
    target.block.text = ta.value;
    autosize(ta);
    paint(target.block);
    save();
  }

  // Zo zápisu symbolu spraví to, čo sa má naozaj vložiť.
  function texToInsert(tex) {
    if (tex.indexOf(CARET) >= 0) return tex;      // šablóna si značku nesie sama
    if (tex.indexOf('{}') >= 0) return tex.replace('{}', '{' + CARET + '}');
    if (/^\\[a-zA-Z]+$/.test(tex)) return tex + ' ';
    return tex;
  }

  /* ── napovedanie príkazov po „\" ──────────────────────────────────── */

  var ARG_TEMPLATES = {
    '\\frac': '\\frac{' + CARET + '}{}', '\\tfrac': '\\tfrac{' + CARET + '}{}',
    '\\dfrac': '\\dfrac{' + CARET + '}{}', '\\sqrt': '\\sqrt{' + CARET + '}',
    '\\vec': '\\vec{' + CARET + '}', '\\hat': '\\hat{' + CARET + '}',
    '\\bar': '\\bar{' + CARET + '}', '\\dot': '\\dot{' + CARET + '}',
    '\\ddot': '\\ddot{' + CARET + '}', '\\overline': '\\overline{' + CARET + '}',
    '\\underline': '\\underline{' + CARET + '}', '\\text': '\\text{' + CARET + '}',
    '\\mathrm': '\\mathrm{' + CARET + '}', '\\mathbb': '\\mathbb{' + CARET + '}',
    '\\overrightarrow': '\\overrightarrow{' + CARET + '}',
    '\\abs': '\\abs{' + CARET + '}', '\\norm': '\\norm{' + CARET + '}',
    '\\unit': '\\unit{' + CARET + '}', '\\ket': '\\ket{' + CARET + '}',
    '\\bra': '\\bra{' + CARET + '}', '\\dv': '\\dv{' + CARET + '}{x}',
    '\\pdv': '\\pdv{' + CARET + '}{x}', '\\binom': '\\binom{' + CARET + '}{}',
    '\\lim': '\\lim_{x \\to ' + CARET + '}', '\\sum': '\\sum_{i=1}^{n} ' + CARET,
    '\\prod': '\\prod_{i=1}^{n} ' + CARET, '\\int': '\\int_{' + CARET + '}^{} ',
    '\\left': '\\left( ' + CARET + ' \\right)',
    '\\begin': '\\begin{pmatrix} ' + CARET + ' & \\\\ & \\end{pmatrix}'
  };

  var Autocomplete = (function () {
    var box = $('#autocomplete');
    var items = [], idx = 0, anchor = null, from = 0, mode = 'cmd';
    var api = { busy: false };

    /* Zhoda so slovenským názvom symbolu – bez spätnej lomky.
     * Berieme len začiatky slov, aby „ka" nenašlo „odmocnina". */
    function wordMatches(q) {
      var n = MW.deaccent(q), starts = [], inside = [];
      for (var i = 0; i < MW.WORDS.length; i++) {
        var w = MW.WORDS[i], at = w.search.indexOf(n);
        if (at === 0) starts.push(w);
        else if (at > 0 && w.search.charAt(at - 1) === ' ') inside.push(w);
      }
      return starts.concat(inside).slice(0, 8);
    }

    function candidates(q) {
      var lower = q.toLowerCase(), starts = [], contains = [];
      for (var i = 0; i < MW.COMMANDS.length; i++) {
        var c = MW.COMMANDS[i], name = c.tex.slice(1).toLowerCase();
        if (!q) { starts.push(c); continue; }
        if (name.indexOf(lower) === 0) starts.push(c);
        else if (name.indexOf(lower) > 0 || c.kw.indexOf(lower) >= 0) contains.push(c);
      }
      starts.sort(function (a, b) { return a.tex.length - b.tex.length; });
      return starts.concat(contains).slice(0, 40);
    }

    // Pozícia kurzora v textovom poli – cez neviditeľnú kópiu jeho obsahu.
    function caretPoint(ta) {
      var cs = getComputedStyle(ta);
      var mirror = document.createElement('div');
      ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
        'paddingTop', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderTopWidth']
        .forEach(function (p) { mirror.style[p] = cs[p]; });
      mirror.style.cssText += ';position:fixed;top:-9999px;left:0;white-space:pre;visibility:hidden;';
      mirror.textContent = ta.value.slice(0, ta.selectionStart);
      var mark = document.createElement('span');
      mark.textContent = '\u200b';
      mirror.appendChild(mark);
      document.body.appendChild(mirror);
      var dx = mark.offsetLeft, dy = mark.offsetTop + mark.offsetHeight;
      mirror.remove();

      var r = ta.getBoundingClientRect(), k = state.view.k;
      return {
        x: Math.min(r.left + (dx - ta.scrollLeft) * k, window.innerWidth - 292),
        y: r.top + (dy - ta.scrollTop) * k + 4
      };
    }

    function draw() {
      box.innerHTML = items.map(function (c, i) {
        return '<div class="ac-item' + (i === idx ? ' on' : '') + '" data-i="' + i + '">' +
          '<span class="ac-ch">' + esc(c.ch || '') + '</span>' +
          '<span class="ac-tex">' + esc(c.tex) + '</span>' +
          '<span class="ac-name">' + esc(c.name) + '</span></div>';
      }).join('') + (mode === 'word' ? '<div class="ac-hint">' + esc(MW.t('ac.tab')) + '</div>' : '');
      var on = box.querySelector('.ac-item.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
    }

    api.update = function (ta, mathMode) {
      var before = ta.value.slice(0, ta.selectionStart);
      var m = /\\([a-zA-Z]*)$/.exec(before);

      if (m) {
        mode = 'cmd';
        from = m.index;
        items = candidates(m[1]);
      } else {
        // Slová ponúkame len vo vzorcových riadkoch – v poznámke pod „#"
        // by okno vyskakovalo pri každom druhom slove.
        var line = before.slice(before.lastIndexOf('\n') + 1);
        var w = (mathMode && !/^\s*#/.test(line)) ? /([a-zA-ZÀ-ž]{3,})$/.exec(before) : null;
        if (!w) return api.hide();
        mode = 'word';
        from = w.index;
        items = wordMatches(w[1]);
      }

      if (!items.length) return api.hide();
      anchor = ta;
      idx = 0;
      draw();
      var p = caretPoint(ta);
      box.style.left = Math.max(8, p.x) + 'px';
      box.style.top = Math.min(p.y, window.innerHeight - 260) + 'px';
      box.hidden = false;
    };

    api.hide = function () { box.hidden = true; items = []; anchor = null; };

    api.accept = function () {
      if (box.hidden || !items[idx] || !anchor) return false;
      var ta = anchor, c = items[idx];
      var tail = ta.value.slice(ta.selectionStart);
      var head = ta.value.slice(0, from);
      var ins = ARG_TEMPLATES[c.tex] || texToInsert(c.tex);
      var caretAt = ins.indexOf(CARET);
      var clean = ins.replace(CARET, '');
      var pos = head.length + (caretAt >= 0 ? caretAt : clean.length);

      ta.value = head + clean + tail;
      ta.setSelectionRange(pos, pos);
      api.hide();
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.setSelectionRange(pos, pos);
      return true;
    };

    api.onKey = function (e, ta) {
      if (box.hidden) return false;
      if (e.key === 'ArrowDown') { idx = (idx + 1) % items.length; draw(); e.preventDefault(); return true; }
      if (e.key === 'ArrowUp') { idx = (idx - 1 + items.length) % items.length; draw(); e.preventDefault(); return true; }
      // Pri slovách si Enter necháva svoj bežný význam – nový riadok výpočtu.
      if (e.key === 'Tab' || (e.key === 'Enter' && mode === 'cmd')) {
        if (api.accept()) { e.preventDefault(); return true; }
      }
      if (e.key === 'Enter') { api.hide(); return false; }
      if (e.key === 'Escape') { api.hide(); e.preventDefault(); e.stopPropagation(); return true; }
      return false;
    };

    box.addEventListener('mousedown', function (e) {
      var it = e.target.closest('.ac-item');
      if (!it) return;
      e.preventDefault();
      idx = +it.dataset.i;
      api.accept();
    });

    return api;
  })();

  /* ── kreslenie perom na plochu ────────────────────────────────────── */

  function strokePath(pts) {
    if (pts.length < 2) {
      return 'M ' + (pts[0][0] + INK_OFF) + ' ' + (pts[0][1] + INK_OFF) + ' l 0.01 0';
    }
    var d = 'M ' + (pts[0][0] + INK_OFF) + ' ' + (pts[0][1] + INK_OFF);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q ' + (pts[i][0] + INK_OFF) + ' ' + (pts[i][1] + INK_OFF) +
        ' ' + (mx + INK_OFF) + ' ' + (my + INK_OFF);
    }
    var last = pts[pts.length - 1];
    return d + ' L ' + (last[0] + INK_OFF) + ' ' + (last[1] + INK_OFF);
  }

  function drawStroke(s) {
    if (!s.el) {
      s.el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      inkSvg.appendChild(s.el);
    }
    s.el.setAttribute('d', strokePath(s.pts));
  }

  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  }

  function eraseAt(wx, wy) {
    var r = 12 / state.view.k, hit = false;
    for (var i = state.strokes.length - 1; i >= 0; i--) {
      var pts = state.strokes[i].pts, near = false;
      for (var j = 1; j < pts.length && !near; j++) {
        if (segDist(wx, wy, pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1]) < r) near = true;
      }
      if (pts.length === 1 && Math.hypot(wx - pts[0][0], wy - pts[0][1]) < r) near = true;
      if (near) {
        if (state.strokes[i].el) state.strokes[i].el.remove();
        state.strokes.splice(i, 1);
        hit = true;
      }
    }
    if (hit) { commitStep(); save(); }
  }

  /* ── udalosti na ploche ───────────────────────────────────────────── */

  var spaceDown = false;

  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.block')) return;
    $('#hint').classList.add('gone');

    var w = toWorld(e.clientX, e.clientY);

    if (tool === 'text' && e.button === 0 && !spaceDown) {
      startEdit(addBlock(w.x, w.y, '', true));
      return;
    }

    if (tool === 'pen' && e.button === 0 && !spaceDown) {
      beginStep();
      commitStep();
      var s = { pts: [[w.x, w.y]] };
      state.strokes.push(s);
      drawStroke(s);
      stage.setPointerCapture(e.pointerId);
      var onMove = function (ev) {
        var p = toWorld(ev.clientX, ev.clientY);
        var last = s.pts[s.pts.length - 1];
        if (Math.hypot(p.x - last[0], p.y - last[1]) * state.view.k < 1.6) return;
        s.pts.push([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
        drawStroke(s);
      };
      var onUp = function () {
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerup', onUp);
        save();
        Notepad.feed(s.pts);          // keď sú poznámky otvorené, prepíše sa to na text
      };
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerup', onUp);
      return;
    }

    if (tool === 'eraser' && e.button === 0 && !spaceDown) {
      stage.setPointerCapture(e.pointerId);
      beginStep();             // zapíše sa až pri prvom naozaj zmazanom ťahu
      eraseAt(w.x, w.y);
      var erase = function (ev) { var p = toWorld(ev.clientX, ev.clientY); eraseAt(p.x, p.y); };
      var stopErase = function () {
        stage.removeEventListener('pointermove', erase);
        stage.removeEventListener('pointerup', stopErase);
      };
      stage.addEventListener('pointermove', erase);
      stage.addEventListener('pointerup', stopErase);
      return;
    }

    // inak posúvame plochu
    select(null);
    stage.classList.add('panning');
    stage.setPointerCapture(e.pointerId);
    var sx = e.clientX, sy = e.clientY, ox = state.view.x, oy = state.view.y;
    var pan = function (ev) {
      state.view.x = ox + (ev.clientX - sx);
      state.view.y = oy + (ev.clientY - sy);
      applyView();
    };
    var stopPan = function () {
      stage.classList.remove('panning');
      stage.removeEventListener('pointermove', pan);
      stage.removeEventListener('pointerup', stopPan);
      save();
    };
    stage.addEventListener('pointermove', pan);
    stage.addEventListener('pointerup', stopPan);
  });

  stage.addEventListener('dblclick', function (e) {
    if (e.target.closest('.block')) return;
    var w = toWorld(e.clientX, e.clientY);
    startEdit(addBlock(w.x - 10, w.y - 16, '', true));
  });

  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    } else {
      state.view.x -= e.deltaX;
      state.view.y -= e.deltaY;
      applyView();
      save();
    }
  }, { passive: false });

  /* ── paleta symbolov ──────────────────────────────────────────────── */

  var Palette = (function () {
    var body = $('#palette-body'), search = $('#palette-search'), builtOnce = false;

    function symButton(s) {
      return '<button class="sym" data-tex="' + esc(s.tex) + '" title="' +
        esc(MW.symName(s) + '  ' + s.tex) + '">' + esc(s.ch) + '</button>';
    }

    function snipButton(label, tex) {
      var preview = renderMath(tex.replace(CARET, '\\square'), false);
      return '<button class="snip" data-tex="' + esc(tex) + '">' +
        '<span class="lbl">' + esc(MW.snipLabel(label)) + '</span>' +
        '<span class="prev">' + preview + '</span></button>';
    }

    function full() {
      var html = '';
      MW.CATEGORIES.forEach(function (cat) {
        var list = MW.SYMBOLS.filter(function (s) { return s.cat === cat.id; });
        if (!list.length) return;
        html += '<div class="cat-title">' + esc(MW.catLabel(cat.id)) + '</div><div class="sym-grid">' +
          list.map(symButton).join('') + '</div>';
      });
      MW.SNIPPETS.forEach(function (group) {
        html += '<div class="cat-title">' + esc(MW.groupLabel(group.label)) + '</div><div class="snip-list">' +
          group.items.map(function (it) { return snipButton(it[0], it[1]); }).join('') + '</div>';
      });
      body.innerHTML = html;
    }

    // Hľadá sa v oboch jazykoch naraz, s diakritikou aj bez nej.
    function find(q) {
      q = MW.deaccent(q.trim());
      if (!q) return full();
      var syms = MW.SYMBOLS.filter(function (s) {
        return MW.symSearch(s).indexOf(q) >= 0 || s.tex.toLowerCase().indexOf(q) >= 0 || s.ch === q;
      });
      var snips = [];
      MW.SNIPPETS.forEach(function (g) {
        g.items.forEach(function (it) {
          if (MW.snipSearch(it[0]).indexOf(q) >= 0 || it[1].toLowerCase().indexOf(q) >= 0) snips.push(it);
        });
      });
      var html = '';
      if (syms.length) {
        html += '<div class="cat-title">' + esc(MW.t('palette.symbols')) + '</div><div class="sym-grid">' +
          syms.map(symButton).join('') + '</div>';
      }
      if (snips.length) {
        html += '<div class="cat-title">' + esc(MW.t('palette.formulas')) + '</div><div class="snip-list">' +
          snips.map(function (it) { return snipButton(it[0], it[1]); }).join('') + '</div>';
      }
      body.innerHTML = html || '<div class="cat-title">' + esc(MW.t('palette.none')) + '</div>';
    }

    body.addEventListener('mousedown', function (e) {
      var b = e.target.closest('[data-tex]');
      if (!b) return;
      e.preventDefault();                 // nech blok nestratí kurzor
      var tex = b.dataset.tex;
      insertText(b.classList.contains('sym') ? texToInsert(tex) : tex);
    });

    search.addEventListener('input', function () { find(search.value); });

    return {
      rebuild: function () { if (builtOnce) find(search.value); },
      show: function () {
        if (!builtOnce) { full(); builtOnce = true; }
        $('#palette').hidden = false;
        search.focus();
        search.select();
      }
    };
  })();

  /* ── panel kreslenia ──────────────────────────────────────────────── */

  var Draw = (function () {
    var canvas = $('#draw-canvas'), ctx = canvas.getContext('2d');
    var strokes = [], drawing = false, dpr = 1;
    var results = $('#draw-results'), status = $('#draw-status');
    var searchBox = $('#draw-search'), searchOut = $('#draw-search-results');
    var byTex = {};

    MW.SYMBOLS.forEach(function (s) { byTex[s.tex] = s; });

    function fit() {
      dpr = window.devicePixelRatio || 1;
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      repaint();
    }

    function repaint() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#7c8cff';
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      strokes.forEach(function (st) {
        ctx.beginPath();
        st.forEach(function (p, i) {
          if (i) ctx.lineTo(p[0] * dpr, p[1] * dpr); else ctx.moveTo(p[0] * dpr, p[1] * dpr);
        });
        if (st.length === 1) ctx.lineTo(st[0][0] * dpr + 0.4, st[0][1] * dpr);
        ctx.stroke();
      });
    }

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      strokes.push([pos(e)]);
      repaint();
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var st = strokes[strokes.length - 1], p = pos(e), last = st[st.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
      st.push(p);
      repaint();
    });

    function finish() {
      if (!drawing) return;
      drawing = false;
      recognise();
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    canvas.addEventListener('pointerleave', finish);

    function hitHtml(tex, conf) {
      var s = byTex[tex];
      var name = s ? MW.symName(s) : tex;
      var ch = s ? s.ch : '';
      var bar = conf == null ? '' :
        '<span class="bar" style="opacity:' + (0.25 + 0.75 * conf).toFixed(2) + '"></span>';
      return '<button class="hit" data-tex="' + esc(tex) + '">' + bar +
        '<span class="ch">' + esc(ch) + '</span><span class="meta">' +
        '<span class="nm">' + esc(name) + '</span>' +
        '<span class="tx">' + esc(tex) + '</span></span></button>';
    }

    function recognise() {
      if (!MW.Recognizer.ready) { status.textContent = MW.t('draw.preparing'); return; }
      var ink = strokes.filter(function (s) { return s.length; });
      if (!ink.length) { results.innerHTML = ''; return; }
      var hits = MW.Recognizer.recognize(ink, 8);
      if (!hits.length) {
        results.innerHTML = '<span class="panel-note">' + esc(MW.t('draw.nothing')) + '</span>';
        return;
      }
      results.innerHTML = hits.map(function (h) { return hitHtml(h.tex, h.confidence); }).join('');
      status.textContent = MW.t(strokes.length === 1 ? 'draw.strokes1' : 'draw.strokes',
        { n: strokes.length });
    }

    function pick(tex) {
      insertText(texToInsert(tex));
      var ink = strokes.filter(function (s) { return s.length > 1; });
      if (ink.length) {
        MW.Recognizer.learn(ink, tex);
        toast(MW.t('toast.learned'));
      } else {
        toast(MW.t('toast.inserted'));
      }
      clear();
    }

    results.addEventListener('mousedown', function (e) {
      var b = e.target.closest('[data-tex]');
      if (b) { e.preventDefault(); pick(b.dataset.tex); }
    });

    searchOut.addEventListener('mousedown', function (e) {
      var b = e.target.closest('[data-tex]');
      if (b) { e.preventDefault(); pick(b.dataset.tex); }
    });

    searchBox.addEventListener('input', function () {
      var q = MW.deaccent(searchBox.value.trim());
      if (!q) { searchOut.innerHTML = ''; return; }
      searchOut.innerHTML = MW.SYMBOLS.filter(function (s) {
        return MW.symSearch(s).indexOf(q) >= 0 || s.tex.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 24).map(function (s) { return hitHtml(s.tex, null); }).join('');
    });

    function clear() {
      strokes = [];
      repaint();
      results.innerHTML = '';
      status.textContent = '';
    }

    $('#draw-clear').addEventListener('click', clear);
    $('#draw-undo').addEventListener('click', function () {
      strokes.pop();
      repaint();
      if (strokes.length) recognise(); else results.innerHTML = '';
    });

    window.addEventListener('resize', function () { if (!$('#draw').hidden) fit(); });

    return {
      show: function () {
        $('#draw').hidden = false;
        fit();
        if (!MW.Recognizer.ready) {
          status.textContent = MW.t('draw.preparing');
          MW.Recognizer.build().then(function (n) {
            status.textContent = MW.t('draw.ready', { n: n });
          });
        }
      },
      // Po zmene jazyka prepíšeme názvy vo výsledkoch, ktoré už visia na obrazovke.
      relabel: function () {
        if (strokes.length) recognise();
        if (searchBox.value) searchBox.dispatchEvent(new Event('input'));
      },
      clear: clear
    };
  })();

  /* ── poznámky z rukopisu ──────────────────────────────────────────── */

  /* Písanie prebieha priamo na ploche perom. Každý ťah sem pošle stage a
   * znak sa zapíše hneď, ako začne ďalší – netreba nič potvrdzovať.
   * Linajky tu nie sú, takže sa základná linajka a stredná výška odhadujú
   * priebežne z toho, čo už človek napísal. */
  var Notepad = (function () {
    var TEXT_KEY = 'mw:notes:v1';
    /* Kým človek kreslí ďalší ťah toho istého písmena, ľahko sa zamyslí na
     * sekundu. Krátka pauza preto rozbíjala „A" na dva znaky; znak sa
     * hlavne zapisuje podľa medzery napravo, čas je len poistka. */
    var IDLE = 1300;

    var text = $('#note-text'), status = $('#note-status');
    var alts = $('#note-alts'), altsLabel = $('#note-alts-label');
    var recBtn = $('#note-rec');
    var reader = MW.createRecognizer('mw:ink-letters:v1', { deslant: 0.5, sigma: 1.8 });
    var track = MW.Handwriting.lineTracker();

    var recording = false, building = false;
    var seg = MW.Handwriting.segmenter();
    var prevBox = null, timer = null, lastPick = null;
    var written = [];            // naposledy zapísané znaky, na braní späť
    var count = 1;

    try { text.value = localStorage.getItem(TEXT_KEY) || ''; } catch (e) { /* nevadí */ }

    function remember() {
      try { localStorage.setItem(TEXT_KEY, text.value); } catch (e) { /* nevadí */ }
    }

    function insert(s) {
      var at = text.selectionStart;
      text.value = text.value.slice(0, at) + s + text.value.slice(text.selectionEnd);
      text.setSelectionRange(at + s.length, at + s.length);
      remember();
      return at;
    }

    // Prvé písmeno vety veľkým – rovnako ako na telefóne.
    function shift(ch, sep) {
      if (!/^[a-z]$/.test(ch)) return ch;
      var before = text.value.slice(0, text.selectionStart) + sep;
      return /(^|[.!?]\s|\n)\s*$/.test(before) ? ch.toUpperCase() : ch;
    }

    function feed(pts) {
      if (!recording || !pts || !pts.length) return;
      var b = MW.Handwriting.box([pts]);
      var scale = track.scale(Math.max(8, b.maxY - b.minY));

      var step = seg.feed(pts, scale);
      // Ťah preklenul už zapísané znaky – vezmeme ich z textu späť,
      // prečítajú sa nanovo aj s ním.
      if (step.retract) retract(step.retract);
      if (step.commit) write(step.commit);

      clearTimeout(timer);
      timer = setTimeout(flush, IDLE);
    }

    function flush() {
      clearTimeout(timer);
      var done = seg.flush();
      if (done) write(done);
    }

    /* Zmaže z textu naposledy zapísané znaky aj s ich oddeľovačmi.
     * Keď človek medzitým do poznámok sám písal, radšej nesiahame na nič. */
    function retract(howMany) {
      var taken = written.splice(written.length - howMany, howMany);
      if (!taken.length) return;
      var from = taken[0].start, to = taken[taken.length - 1].end;
      var expect = taken.map(function (w) { return w.text; }).join('');
      if (text.value.slice(from, to) !== expect) return;

      text.value = text.value.slice(0, from) + text.value.slice(to);
      text.setSelectionRange(from, from);
      remember();
      taken.forEach(function () { track.pop(); });
      prevBox = written.length ? written[written.length - 1].box : null;
      lastPick = null;
      showAlts(null);
    }

    function write(group) {
      if (!reader.ready) { status.textContent = MW.t('note.preparing'); return; }

      var b = group.box, strokes = group.strokes;
      var m = track.metrics();
      var ch = null, hits = [];

      if (m) {
        ch = MW.Handwriting.tinyMark(b, { base: m.base, xTop: m.base - m.xh });
      }
      if (!ch) {
        hits = reader.recognize(strokes, 6, MW.Handwriting.bias(track.classify(b)));
        ch = hits.length ? hits[0].tex : '';
      }
      if (!ch) { status.textContent = MW.t('note.nothing'); return; }

      var sep = MW.Handwriting.gapKind(b, prevBox,
        m ? m.xh : Math.max(8, b.maxY - b.minY));
      if (sep === '\n') track.reset();      // nový riadok, nový odhad výšok
      track.push(b);
      prevBox = b;

      var piece = sep + shift(ch, sep);
      var start = insert(piece);
      written.push({
        start: start, end: start + piece.length, text: piece,
        ch: ch, box: b, strokes: strokes
      });
      if (written.length > 12) written.shift();

      lastPick = { at: start + sep.length, ch: ch, strokes: strokes };
      showAlts(hits);
      status.textContent = MW.t('note.read', { n: count });
      count++;
    }

    function showAlts(hits) {
      if (!hits || hits.length < 2) {
        alts.innerHTML = '';
        altsLabel.hidden = true;
        return;
      }
      altsLabel.hidden = false;
      alts.innerHTML = hits.map(function (h) {
        return '<button class="hit" data-ch="' + esc(h.tex) + '">' +
          '<span class="ch">' + esc(h.tex) + '</span></button>';
      }).join('');
    }

    // Oprava posledného znaku zároveň doučí rozpoznávanie.
    alts.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ch]');
      if (!b || !lastPick) return;
      var ch = b.dataset.ch;
      if (ch !== lastPick.ch) {
        text.value = text.value.slice(0, lastPick.at) + ch +
          text.value.slice(lastPick.at + lastPick.ch.length);
        text.setSelectionRange(lastPick.at + ch.length, lastPick.at + ch.length);
        remember();
      }
      reader.learn(lastPick.strokes, ch);
      // opravený znak je rovnako dlhý, takže pozície v texte držia ďalej
      var last = written[written.length - 1];
      if (last && last.ch === lastPick.ch) {
        last.text = last.text.slice(0, -1) + ch;
        last.ch = ch;
      }
      lastPick.ch = ch;
      showAlts(null);
      toast(MW.t('toast.noteLearned'));
    });

    text.addEventListener('input', remember);

    function setRecording(on) {
      recording = on;
      recBtn.classList.toggle('active', on);
      clearTimeout(timer);
      seg.reset();
      written = [];
      prevBox = null;
      if (!on) {
        status.textContent = MW.t('note.off');
      } else {
        track.reset();
        ensureReady();
      }
    }

    function ensureReady() {
      if (reader.ready || building) return;
      building = true;
      status.textContent = MW.t('note.preparing');
      reader.build(MW.LETTERS.filter(function (l) { return !l.tiny; }),
        reader.LETTER_STACKS, reader.LETTER_SLANTS).then(function (n) {
        building = false;
        status.textContent = MW.t('note.ready', { n: n });
      });
    }

    recBtn.addEventListener('click', function () { setRecording(!recording); });

    $('#note-save').addEventListener('click', function () {
      var blob = new Blob([text.value], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'poznamky-' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast(MW.t('toast.noteSaved'));
    });

    $('#note-load').addEventListener('click', function () { $('#note-file').click(); });

    $('#note-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var r = new FileReader();
      r.onload = function () {
        text.value = String(r.result);
        remember();
        toast(MW.t('toast.noteLoaded'));
      };
      r.onerror = function () { toast(MW.t('toast.badFile')); };
      r.readAsText(file);
      e.target.value = '';
    });

    $('#note-copy').addEventListener('click', function () {
      if (!text.value) return;
      var done = function () { toast(MW.t('toast.copied')); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.value).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        text.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* nedá sa */ }
      }
    });

    $('#note-board').addEventListener('click', function () {
      if (!text.value.trim()) return;
      var c = viewCentre();
      // Poznámky sú text, nie vzorec – blok necháme v textovom režime.
      startEdit(addBlock(c.x, c.y, text.value.trim(), false));
      toast(MW.t('toast.inserted'));
    });

    $('#note-clear-text').addEventListener('click', function () {
      if (!text.value) return;
      if (!confirm(MW.t('note.confirmClear'))) return;
      text.value = '';
      remember();
    });

    return {
      feed: feed,
      show: function () {
        $('#note').hidden = false;
        setTool('pen');              // aby sa dalo písať hneď
        setRecording(true);
      },
      stop: function () { if (recording) setRecording(false); },
      relabel: function () {
        showAlts(null);
        status.textContent = recording ? '' : MW.t('note.off');
      }
    };
  })();

  /* ── kalkulačka ───────────────────────────────────────────────────── */

  var Calculator = (function () {
    var KEY = 'mw:calc-history:v1';
    var input = $('#calc-input'), out = $('#calc-result'), list = $('#calc-history');
    var history = [];

    try { history = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { history = []; }

    function value() {
      var v = MW.Calc.evaluate(input.value);
      return v === null ? null : MW.Calc.format(v, decimalComma());
    }

    function show() {
      var r = value();
      if (!input.value.trim()) { out.innerHTML = ''; out.classList.remove('bad'); return; }
      out.classList.toggle('bad', r === null);
      out.innerHTML = r === null
        ? esc(MW.t('calc.bad'))
        : '= ' + renderMath(r, false);
    }

    function drawHistory() {
      list.innerHTML = history.map(function (h) {
        return '<button class="hit" data-expr="' + esc(h.expr) + '">' +
          '<span class="meta"><span class="nm">' + renderMath(h.expr, false) + '</span>' +
          '<span class="tx">= ' + esc(h.result) + '</span></span></button>';
      }).join('');
    }

    function remember(expr, result) {
      history = history.filter(function (h) { return h.expr !== expr; });
      history.unshift({ expr: expr, result: result });
      history = history.slice(0, 10);
      try { localStorage.setItem(KEY, JSON.stringify(history)); } catch (e) { /* nevadí */ }
      drawHistory();
    }

    // Klávesa z číselníka sa vloží na miesto kurzora; ak má zátvorky,
    // kurzor skočí dovnútra.
    function type(text) {
      var at = input.selectionStart, end = input.selectionEnd;
      var open = text.search(/[({]/);
      var caret = open >= 0 ? open + 1 : text.length;
      input.value = input.value.slice(0, at) + text + input.value.slice(end);
      input.focus();
      input.setSelectionRange(at + caret, at + caret);
      show();
    }

    input.addEventListener('input', show);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
    });

    function commit() {
      var r = value();
      if (r === null) { toast(MW.t(input.value.trim() ? 'calc.bad' : 'calc.empty')); return null; }
      remember(input.value.trim(), r);
      return r;
    }

    $('#calc-keys').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'calc-clear') { input.value = ''; show(); input.focus(); return; }
      if (b.id === 'calc-back') {
        var at = input.selectionStart;
        if (at > 0) {
          input.value = input.value.slice(0, at - 1) + input.value.slice(input.selectionEnd);
          input.focus();
          input.setSelectionRange(at - 1, at - 1);
          show();
        }
        return;
      }
      if (b.dataset.key) type(b.dataset.key);
    });

    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-expr]');
      if (!b) return;
      input.value = b.dataset.expr;
      show();
      input.focus();
    });

    $('#calc-forget').addEventListener('click', function () {
      history = [];
      try { localStorage.removeItem(KEY); } catch (e) { /* nevadí */ }
      drawHistory();
    });

    $('#calc-insert').addEventListener('click', function () {
      var r = commit();
      if (r === null) return;
      insertText(input.value.trim() + ' = ' + r);
      toast(MW.t('toast.inserted'));
    });

    return {
      show: function () {
        $('#calc').hidden = false;
        drawHistory();
        show();
        input.focus();
        input.select();
      },
      relabel: function () { show(); drawHistory(); }
    };
  })();

  /* ── spätná väzba ─────────────────────────────────────────────────── */

  var Feedback = (function () {
    var REPO = 'https://github.com/JurajCyprich/Math-Workspace';
    var KEY = 'mw:feedback:v1';
    var stars = $('#fb-stars'), text = $('#fb-text'), score = $('#fb-score');
    var rating = 0;

    function paint() {
      stars.querySelectorAll('.star').forEach(function (b) {
        b.classList.toggle('on', Number(b.dataset.value) <= rating);
        b.setAttribute('aria-checked', Number(b.dataset.value) === rating ? 'true' : 'false');
      });
      score.textContent = rating ? MW.t('fb.stars', { n: rating }) : '';
    }

    function remember() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ rating: rating, text: text.value }));
      } catch (e) { /* nevadí */ }
    }

    function recall() {
      try {
        var d = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (d) { rating = d.rating || 0; text.value = d.text || ''; }
      } catch (e) { /* nevadí */ }
      paint();
    }

    function body() {
      var out = [];
      if (rating) out.push(MW.t('fb.rating') + ': ' + rating + '/5');
      out.push('', text.value.trim());
      return out.join('\n');
    }

    stars.addEventListener('click', function (e) {
      var b = e.target.closest('.star');
      if (!b) return;
      // Druhý klik na tú istú hviezdu hodnotenie zruší.
      rating = (Number(b.dataset.value) === rating) ? 0 : Number(b.dataset.value);
      paint();
      remember();
    });

    text.addEventListener('input', remember);

    $('#fb-send').addEventListener('click', function () {
      if (!text.value.trim()) { toast(MW.t('fb.empty')); text.focus(); return; }
      var title = text.value.trim().split('\n')[0].slice(0, 60);
      window.open(REPO + '/issues/new?labels=feedback' +
        '&title=' + encodeURIComponent(title) +
        '&body=' + encodeURIComponent(body()), '_blank', 'noopener');
    });

    $('#fb-copy').addEventListener('click', function () {
      if (!text.value.trim()) { toast(MW.t('fb.empty')); text.focus(); return; }
      var done = function () { toast(MW.t('toast.copied')); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body()).then(done, function () { fallback(); });
      } else { fallback(); }

      function fallback() {
        text.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* nedá sa */ }
      }
    });

    recall();

    return {
      show: function () {
        $('#feedback').hidden = false;
        paint();
        text.focus();
      }
    };
  })();

  /* ── ukladanie ────────────────────────────────────────────────────── */

  /* ── história krokov ──────────────────────────────────────────────── */

  var past = [], futureSteps = [], pending = null, MAX_STEPS = 60;

  function snapshot() { return JSON.stringify(serialise()); }

  // Stav pred zásahom si odložíme a zapíšeme ho, až keď sa naozaj niečo
  // zmenilo – inak by kliknutie bez ťahu vyrobilo prázdny krok späť.
  function beginStep() { pending = snapshot(); }

  function commitStep() {
    if (pending === null) return;
    past.push(pending);
    if (past.length > MAX_STEPS) past.shift();
    futureSteps.length = 0;
    pending = null;
    refreshSteps();
  }

  function step(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    load(JSON.parse(from.pop()));
    pending = null;
    refreshSteps();
    save();
  }

  function refreshSteps() {
    $('#btn-undo').disabled = !past.length;
    $('#btn-redo').disabled = !futureSteps.length;
  }

  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORAGE, JSON.stringify(serialise())); } catch (e) { /* plno */ }
    }, 400);
  }

  function serialise() {
    return {
      v: 1,
      view: state.view,
      blocks: state.blocks.map(function (b) {
        return { id: b.id, x: b.x, y: b.y, text: b.text, math: b.math !== false };
      }),
      strokes: state.strokes.map(function (s) { return { pts: s.pts }; })
    };
  }

  function load(data) {
    state.blocks.forEach(function (b) { b.el.remove(); });
    state.strokes.forEach(function (s) { if (s.el) s.el.remove(); });
    state.blocks = [];
    state.strokes = [];
    activeEditor = null;
    selected = null;

    if (data && data.view) state.view = data.view;
    (data && data.blocks || []).forEach(function (b) {
      var copy = { id: b.id || uid(), x: b.x || 0, y: b.y || 0, text: b.text || '', math: b.math !== false };
      state.blocks.push(copy);
      makeBlock(copy);
    });
    (data && data.strokes || []).forEach(function (s) {
      if (!s.pts || !s.pts.length) return;
      var st = { pts: s.pts };
      state.strokes.push(st);
      drawStroke(st);
    });
    applyView();
  }

  /* ── lišta a klávesnica ───────────────────────────────────────────── */

  function setTool(name) {
    tool = name;
    stage.dataset.tool = name;
    document.querySelectorAll('.tool').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tool === name);
    });
  }

  document.querySelectorAll('.tool').forEach(function (b) {
    b.addEventListener('click', function () { setTool(b.dataset.tool); });
  });

  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('#' + b.dataset.close).hidden = true;
      if (b.dataset.close === 'note') Notepad.stop();
    });
  });

  $('#btn-palette').addEventListener('click', function () {
    var p = $('#palette');
    if (p.hidden) Palette.show(); else p.hidden = true;
  });

  $('#btn-draw').addEventListener('click', function () {
    var p = $('#draw');
    if (p.hidden) Draw.show(); else p.hidden = true;
  });

  $('#btn-note').addEventListener('click', function () {
    var p = $('#note');
    if (p.hidden) { Notepad.show(); } else { p.hidden = true; Notepad.stop(); }
  });

  $('#btn-calc').addEventListener('click', function () {
    var p = $('#calc');
    if (p.hidden) Calculator.show(); else p.hidden = true;
  });

  $('#btn-feedback').addEventListener('click', function () {
    var p = $('#feedback');
    if (p.hidden) Feedback.show(); else p.hidden = true;
  });

  document.querySelectorAll('.lang').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.lang); });
  });

  $('#btn-help').addEventListener('click', function () { $('#help').hidden = false; });
  $('#btn-zoom-in').addEventListener('click', function () { zoomAt(innerWidth / 2, innerHeight / 2, 1.2); });
  $('#btn-zoom-out').addEventListener('click', function () { zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.2); });
  $('#btn-zoom-reset').addEventListener('click', function () {
    state.view = { x: 0, y: 0, k: 1 };
    applyView();
    save();
  });

  $('#btn-export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(serialise(), null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'math-workspace-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast(MW.t('toast.saved'));
  });

  $('#btn-import').addEventListener('click', function () { $('#file-input').click(); });

  $('#file-input').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        beginStep();
        commitStep();
        load(parsed);
        save();
        toast(MW.t('toast.loaded'));
      } catch (err) {
        toast(MW.t('toast.badFile'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#btn-clear').addEventListener('click', function () {
    if (!confirm(MW.t('confirm.clear'))) return;
    beginStep();
    commitStep();
    load({ view: { x: 0, y: 0, k: 1 }, blocks: [], strokes: [] });
    save();
    toast(MW.t('toast.cleared'));
  });

  $('#btn-undo').addEventListener('click', function () { step(past, futureSteps); });
  $('#btn-redo').addEventListener('click', function () { step(futureSteps, past); });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !isTyping(e.target)) spaceDown = true;

    if (e.key === 'Escape') {
      $('#palette').hidden = true;
      $('#draw').hidden = true;
      $('#calc').hidden = true;
      $('#note').hidden = true;
      Notepad.stop();
      $('#feedback').hidden = true;
      $('#help').hidden = true;
      return;
    }
    // V textovom poli nechávame Ctrl+Z prehliadaču – vracia písmená.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
      e.preventDefault();
      if (e.shiftKey) step(futureSteps, past); else step(past, futureSteps);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isTyping(e.target)) {
      e.preventDefault();
      step(futureSteps, past);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      Draw.show();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      Palette.show();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      Calculator.show();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      Notepad.show();
      return;
    }
    if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;

    var map = { v: 'select', t: 'text', p: 'pen', e: 'eraser' };
    if (map[e.key.toLowerCase()]) { setTool(map[e.key.toLowerCase()]); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      removeBlock(selected);
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'Space') spaceDown = false;
  });

  function isTyping(el) {
    return el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
  }

  /* ── štart ────────────────────────────────────────────────────────── */

  function boot() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch (e) { saved = null; }

    if (saved && saved.blocks && saved.blocks.length) {
      load(saved);
    } else {
      var seed = MW.seedTexts();
      load({
        view: { x: 0, y: 0, k: 1 },
        blocks: [
          { x: 90, y: 130, math: true, text: seed[0] },
          { x: 90, y: 430, math: true, text: seed[1] },
          { x: 560, y: 130, math: true, text: seed[2] }
        ],
        strokes: []
      });
    }

    setTool('select');
    applyLang();
    applyView();
    refreshSteps();

    // Predlohy na rozpoznávanie postavíme hneď po načítaní písiem,
    // aby prvé kreslenie nečakalo.
    var start = function () { MW.Recognizer.build(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    else setTimeout(start, 400);
  }

  if (window.katex) boot();
  else window.addEventListener('load', boot);
})();
