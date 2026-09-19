/* Delenie ťahov na znaky. Beží priamo v Node.
 *
 * Vzniklo z konkrétnej chyby: slovo „AHOJ" napísané na plochu sa prepísalo
 * ako „/)" + nový riadok + „MH0o" – písmeno A sa rozpadlo na dva znaky a
 * jeho prečiarknutie vyrobilo nový riadok. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { MW: {} };
new Function('window', readFileSync(resolve(root, 'js/letters.js'), 'utf8'))(sandbox);
const H = sandbox.MW.Handwriting;

let failed = 0;
function ok(name, cond, extra = '') {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) failed++;
}

// úsečka ako postupnosť bodov
const line = (x1, y1, x2, y2, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);

const ellipse = (cx, cy, rx, ry, n = 28) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  });

/* Tak, ako to bolo na snímke: veľké tlačené AHOJ, každé písmeno
 * z viacerých ťahov, medzi písmenami malé medzery. */
const AHOJ = [
  { ch: 'A', strokes: [line(395, 240, 345, 390), line(395, 240, 430, 385), line(362, 330, 418, 330)] },
  { ch: 'H', strokes: [line(437, 250, 437, 380), line(492, 240, 492, 375), line(437, 315, 492, 315)] },
  { ch: 'O', strokes: [ellipse(588, 305, 40, 65)] },
  { ch: 'J', strokes: [line(690, 245, 690, 330), line(690, 330, 640, 362)] }
];

/* Tá istá slučka, akou znaky delí appka – vrátane brania späť. */
function transcribe(letters, opts = {}) {
  const track = H.lineTracker();
  const seg = H.segmenter();
  const out = [];

  const emit = (done) => {
    if (!done) return;
    const m = track.metrics();
    const xh = m ? m.xh : Math.max(8, done.box.maxY - done.box.minY);
    const prev = out.length ? out[out.length - 1].box : null;
    out.push({ sep: H.gapKind(done.box, prev, xh), strokes: done.strokes.length, box: done.box });
    track.push(done.box);
  };

  for (const letter of letters) {
    for (const st of letter.strokes) {
      const b = H.box([st]);
      const scale = track.scale(Math.max(8, b.maxY - b.minY));
      const step = seg.feed(st, scale);
      for (let i = 0; i < step.retract; i++) { out.pop(); track.pop(); }
      emit(step.commit);
    }
    if (opts.pauseAfterLetter) emit(seg.flush());
  }
  emit(seg.flush());
  return out;
}

console.log('\n„AHOJ" napísané na jeden záťah');
const run = transcribe(AHOJ);
ok('rozdelilo sa na štyri znaky, nie viac', run.length === 4, `znakov=${run.length}`);
ok('žiadny znak navyše z prečiarknutia A', run.length <= 4);
ok('nevznikol žiadny nový riadok',
  run.every((g) => g.sep !== '\n'), JSON.stringify(run.map((g) => g.sep)));
ok('A drží všetky tri ťahy pohromade', run[0] && run[0].strokes === 3,
  `ťahov v prvom znaku=${run[0] && run[0].strokes}`);
ok('H drží všetky tri ťahy pohromade', run[1] && run[1].strokes === 3,
  `ťahov v druhom znaku=${run[1] && run[1].strokes}`);

console.log('\nkeď medzi písmenami nastane pauza');
const paused = transcribe(AHOJ, { pauseAfterLetter: true });
ok('aj tak sú to štyri znaky', paused.length === 4, `znakov=${paused.length}`);
ok('ani tu nevznikol nový riadok', paused.every((g) => g.sep !== '\n'));

console.log('\nmedzera medzi slovami');
const twoWords = transcribe([
  { ch: 'l', strokes: [line(100, 200, 100, 300)] },
  { ch: 'l', strokes: [line(130, 200, 130, 300)] },
  { ch: 'l', strokes: [line(320, 200, 320, 300)] }   // po veľkej medzere
]);
ok('blízke písmená zostali bez medzery', twoWords[1] && twoWords[1].sep === '',
  JSON.stringify(twoWords.map((g) => g.sep)));
ok('po veľkej medzere pribudla medzera', twoWords[2] && twoWords[2].sep === ' ',
  JSON.stringify(twoWords.map((g) => g.sep)));

console.log('\nnový riadok');
const twoLines = transcribe([
  { ch: 'l', strokes: [line(100, 200, 100, 300)] },
  { ch: 'l', strokes: [line(130, 200, 130, 300)] },
  { ch: 'l', strokes: [line(160, 200, 160, 300)] },
  { ch: 'l', strokes: [line(100, 360, 100, 460)] }   // zjavne nižšie a vľavo
]);
ok('presun nižšie a vľavo dal nový riadok',
  twoLines[3] && twoLines[3].sep === '\n', JSON.stringify(twoLines.map((g) => g.sep)));

console.log('\nbodka nad „i" patrí k písmenu');
const dotted = transcribe([
  { ch: 'i', strokes: [line(200, 250, 200, 320), [[201, 220], [203, 222]]] }
]);
ok('bodka sa nestala samostatným znakom', dotted.length === 1, `znakov=${dotted.length}`);

console.log(failed ? `\nPADLO: ${failed} kontrol` : '\nOK – všetko prešlo');
process.exit(failed ? 1 : 0);
