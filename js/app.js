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

  function contentHtml(text, math) {
    if (!text.trim()) return '<div class="empty">prázdny blok – klikni a píš</div>';
    return text.split('\n').map(function (line) {
      if (!line.trim()) return '<div class="line">&nbsp;</div>';
      var t = line.trim();
      if (t.charAt(0) === '#') {
        return '<div class="line textline">' + mixedLine(t.replace(/^#\s?/, '')) + '</div>';
      }
      if (math) return '<div class="line">' + renderMath(line, true) + '</div>';
      return '<div class="line textline">' + mixedLine(line) + '</div>';
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
        '<button class="mode" title="Prepnúť: celý blok ako vzorec / text">∑</button>' +
        '<span class="grip">⠿⠿⠿</span>' +
        '<button class="dup" title="Duplikovať">⧉</button>' +
        '<button class="del" title="Zmazať blok">×</button>' +
      '</div>' +
      '<div class="render"></div>' +
      '<textarea spellcheck="false" wrap="off"></textarea>';

    var ta = el.querySelector('textarea');
    ta.value = data.text || '';
    data.el = el;
    data.ta = ta;

    el.querySelector('.mode').classList.toggle('on', data.math !== false);
    el.querySelector('.mode').addEventListener('click', function () {
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
      startEdit(data);
    });

    el.addEventListener('mousedown', function () { select(data); });

    ta.addEventListener('input', function () {
      data.text = ta.value;
      autosize(ta);
      paint(data);
      Autocomplete.update(ta);
      save();
    });
    ta.addEventListener('focus', function () {
      activeEditor = { block: data, ta: ta };
      el.classList.add('editing');
      autosize(ta);
    });
    ta.addEventListener('blur', function () {
      if (Autocomplete.busy) return;
      Autocomplete.hide();
      el.classList.remove('editing');
      paint(data);
    });
    ta.addEventListener('keydown', function (e) { onEditorKey(e, data, ta); });
    ta.addEventListener('click', function () { Autocomplete.update(ta); });

    dragBar(el.querySelector('.block-bar'), data);
    world.appendChild(el);
    paint(data);
    return data;
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
    var data = { id: uid(), x: Math.round(x), y: Math.round(y), text: text || '', math: math !== false };
    state.blocks.push(data);
    makeBlock(data);
    save();
    return data;
  }

  function removeBlock(data) {
    var i = state.blocks.indexOf(data);
    if (i >= 0) state.blocks.splice(i, 1);
    if (activeEditor && activeEditor.block === data) activeEditor = null;
    if (selected === data) selected = null;
    data.el.remove();
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

      function move(ev) {
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

    target.block.text = ta.value;
    autosize(ta);
    paint(target.block);
    save();
  }

  // Zo zápisu symbolu spraví to, čo sa má naozaj vložiť.
  function texToInsert(tex) {
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
    var items = [], idx = 0, anchor = null, from = 0;
    var api = { busy: false };

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
      }).join('');
      var on = box.querySelector('.ac-item.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
    }

    api.update = function (ta) {
      var before = ta.value.slice(0, ta.selectionStart);
      var m = /\\([a-zA-Z]*)$/.exec(before);
      if (!m) return api.hide();
      items = candidates(m[1]);
      if (!items.length) return api.hide();
      anchor = ta;
      from = m.index;
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
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (api.accept()) { e.preventDefault(); return true; }
      }
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
    if (hit) save();
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
      };
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerup', onUp);
      return;
    }

    if (tool === 'eraser' && e.button === 0 && !spaceDown) {
      stage.setPointerCapture(e.pointerId);
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
        esc(s.name + '  ' + s.tex) + '">' + esc(s.ch) + '</button>';
    }

    function snipButton(label, tex) {
      var preview = renderMath(tex.replace(CARET, '\\square'), false);
      return '<button class="snip" data-tex="' + esc(tex) + '">' +
        '<span class="lbl">' + esc(label) + '</span>' +
        '<span class="prev">' + preview + '</span></button>';
    }

    function full() {
      var html = '';
      MW.CATEGORIES.forEach(function (cat) {
        var list = MW.SYMBOLS.filter(function (s) { return s.cat === cat.id; });
        if (!list.length) return;
        html += '<div class="cat-title">' + esc(cat.label) + '</div><div class="sym-grid">' +
          list.map(symButton).join('') + '</div>';
      });
      MW.SNIPPETS.forEach(function (group) {
        html += '<div class="cat-title">' + esc(group.label) + '</div><div class="snip-list">' +
          group.items.map(function (it) { return snipButton(it[0], it[1]); }).join('') + '</div>';
      });
      body.innerHTML = html;
    }

    function find(q) {
      q = q.trim().toLowerCase();
      if (!q) return full();
      var syms = MW.SYMBOLS.filter(function (s) {
        return s.name.toLowerCase().indexOf(q) >= 0 || s.kw.indexOf(q) >= 0 ||
          s.tex.toLowerCase().indexOf(q) >= 0 || s.ch === q;
      });
      var snips = [];
      MW.SNIPPETS.forEach(function (g) {
        g.items.forEach(function (it) {
          if (it[0].toLowerCase().indexOf(q) >= 0 || it[1].toLowerCase().indexOf(q) >= 0) snips.push(it);
        });
      });
      var html = '';
      if (syms.length) {
        html += '<div class="cat-title">Symboly</div><div class="sym-grid">' +
          syms.map(symButton).join('') + '</div>';
      }
      if (snips.length) {
        html += '<div class="cat-title">Vzorce a šablóny</div><div class="snip-list">' +
          snips.map(function (it) { return snipButton(it[0], it[1]); }).join('') + '</div>';
      }
      body.innerHTML = html || '<div class="cat-title">Nič sa nenašlo</div>';
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
      var name = s ? s.name : tex;
      var ch = s ? s.ch : '';
      var bar = conf == null ? '' :
        '<span class="bar" style="opacity:' + (0.25 + 0.75 * conf).toFixed(2) + '"></span>';
      return '<button class="hit" data-tex="' + esc(tex) + '">' + bar +
        '<span class="ch">' + esc(ch) + '</span><span class="meta">' +
        '<span class="nm">' + esc(name) + '</span>' +
        '<span class="tx">' + esc(tex) + '</span></span></button>';
    }

    function recognise() {
      if (!MW.Recognizer.ready) { status.textContent = 'pripravujem…'; return; }
      var ink = strokes.filter(function (s) { return s.length; });
      if (!ink.length) { results.innerHTML = ''; return; }
      var hits = MW.Recognizer.recognize(ink, 8);
      if (!hits.length) {
        results.innerHTML = '<span class="panel-note">Nič podobné. Skús to nakresliť väčšie.</span>';
        return;
      }
      results.innerHTML = hits.map(function (h) { return hitHtml(h.tex, h.confidence); }).join('');
      status.textContent = strokes.length + ' ' + (strokes.length === 1 ? 'ťah' : 'ťahy');
    }

    function pick(tex) {
      insertText(texToInsert(tex));
      var ink = strokes.filter(function (s) { return s.length > 1; });
      if (ink.length) {
        MW.Recognizer.learn(ink, tex);
        toast('Vložené · rukopis zapamätaný');
      } else {
        toast('Vložené');
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
      var q = searchBox.value.trim().toLowerCase();
      if (!q) { searchOut.innerHTML = ''; return; }
      searchOut.innerHTML = MW.SYMBOLS.filter(function (s) {
        return s.name.toLowerCase().indexOf(q) >= 0 || s.kw.indexOf(q) >= 0 ||
          s.tex.toLowerCase().indexOf(q) >= 0;
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
          status.textContent = 'pripravujem predlohy…';
          MW.Recognizer.build().then(function (n) {
            status.textContent = n + ' symbolov pripravených';
          });
        }
      },
      clear: clear
    };
  })();

  /* ── ukladanie ────────────────────────────────────────────────────── */

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
    b.addEventListener('click', function () { $('#' + b.dataset.close).hidden = true; });
  });

  $('#btn-palette').addEventListener('click', function () {
    var p = $('#palette');
    if (p.hidden) Palette.show(); else p.hidden = true;
  });

  $('#btn-draw').addEventListener('click', function () {
    var p = $('#draw');
    if (p.hidden) Draw.show(); else p.hidden = true;
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
    toast('Uložené do súboru');
  });

  $('#btn-import').addEventListener('click', function () { $('#file-input').click(); });

  $('#file-input').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        load(JSON.parse(reader.result));
        save();
        toast('Načítané');
      } catch (err) {
        toast('Súbor sa nepodarilo prečítať');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#btn-clear').addEventListener('click', function () {
    if (!confirm('Naozaj vyprázdniť celú plochu? Táto akcia sa nedá vrátiť.')) return;
    load({ view: { x: 0, y: 0, k: 1 }, blocks: [], strokes: [] });
    save();
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !isTyping(e.target)) spaceDown = true;

    if (e.key === 'Escape') {
      $('#palette').hidden = true;
      $('#draw').hidden = true;
      $('#help').hidden = true;
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
      load({
        view: { x: 0, y: 0, k: 1 },
        blocks: [
          {
            x: 90, y: 130, math: true, text:
              '# Kvadratická rovnica\n' +
              '2x^2 - 5x + 3 = 0\n' +
              'D = b^2 - 4ac = 25 - 24 = 1\n' +
              'x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{5 \\pm 1}{4}\n' +
              'x_1 = \\frac{3}{2} \\quad x_2 = 1'
          },
          {
            x: 90, y: 430, math: true, text:
              '# Voľný pád – skús to prepísať\n' +
              'v = g t \\qquad s = \\tfrac{1}{2} g t^2\n' +
              'E_k = \\tfrac{1}{2} m v^2 = \\unit{J}\n' +
              '# Napíš \\ a začni písať názov symbolu'
          },
          {
            x: 560, y: 130, math: true, text:
              '# Symboly, čo nie sú na klávesnici\n' +
              '\\int_{0}^{\\pi} \\sin x \\dd x = 2\n' +
              '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}\n' +
              '\\hbar \\omega \\approx 2{,}5 \\unit{eV}\n' +
              '# Nakresli ich myšou – tlačidlo „Nakresliť symbol"'
          }
        ],
        strokes: []
      });
    }

    setTool('select');
    applyView();

    // Predlohy na rozpoznávanie postavíme hneď po načítaní písiem,
    // aby prvé kreslenie nečakalo.
    var start = function () { MW.Recognizer.build(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    else setTimeout(start, 400);
  }

  if (window.katex) boot();
  else window.addEventListener('load', boot);
})();
