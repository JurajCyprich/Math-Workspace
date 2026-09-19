/* Presnosť rozpoznávania písmen. Predlohy sa stavajú z pätkových písiem,
 * „napísané" tvary prichádzajú z bezpätkového, ktoré predlohy nevideli. */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console]', m.text()); });
await page.goto('file://' + resolve(here, 'harness-letters.html'));
await page.waitForFunction(() => window.MW && window.MW.Recognizer && window.MW.LETTERS);

// bez premenných prostredia testujeme presne to, čo sa dodáva
const SLANTS = process.env.SLANTS ? process.env.SLANTS.split(',').map(Number) : null;
const TUNE = {
  sigma: Number(process.env.SIGMA || 0) || undefined,
  gridN: Number(process.env.GRIDN || 0) || undefined,
  wCloud: process.env.WCLOUD ? Number(process.env.WCLOUD) : undefined,
  stretch: process.env.STRETCH ? Number(process.env.STRETCH) : undefined,
  deslant: process.env.DESLANT ? Number(process.env.DESLANT) : undefined,
  deslantCap: process.env.DESLANTCAP ? Number(process.env.DESLANTCAP) : undefined,
  wCoarse: process.env.WCOARSE ? Number(process.env.WCOARSE) : undefined,
  coarseRatio: process.env.COARSERATIO ? Number(process.env.COARSERATIO) : undefined
};

const result = await page.evaluate(async ({ SLANTS, TUNE }) => {
  const SERIF = ['"DejaVu Serif","FreeSerif",serif',
    '"Liberation Serif","Bitstream Charter",serif'];
  const SANS = '"FreeSans","DejaVu Sans",sans-serif';

  const R = window.MW.createRecognizer('mw:test-letters', { deslant: 0.5, sigma: 1.8 });
  const shapes = window.MW.LETTERS.filter((l) => !l.tiny);
  R._internals.configure(TUNE);
  await R.build(shapes, SERIF, SLANTS || R.LETTER_SLANTS);

  const { rasterize, thin } = R._internals;
  const wanted = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  /* Nedbalý rukopis: písmeno sa málokedy trafí presne ako v knihe.
   * Skosíme ho ako pri šikmom písme, pretiahneme, pootočíme a roztrasieme.
   * Náhoda je odvodená od znaku, takže test dáva vždy rovnaký výsledok. */
  function sloppy(points, variant, seed) {
    let state = seed;
    const rnd = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff - 0.5;
    };
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);

    const v = [
      { slant: 0.30, sx: 1.00, sy: 1.00, rot: 0.00, jit: 0.03 },   // šikmé písmo
      { slant: -0.18, sx: 1.00, sy: 1.00, rot: 0.05, jit: 0.03 },  // doľava a pootočené
      { slant: 0.10, sx: 1.35, sy: 0.85, rot: 0.00, jit: 0.04 },   // rozťahané do šírky
      { slant: 0.12, sx: 0.80, sy: 1.25, rot: -0.06, jit: 0.05 }   // úzke a roztrasené
    ][variant];

    return points.map((p) => {
      let x = p[0] - cx, y = p[1] - cy;
      x += v.slant * -y;                       // skosenie
      x *= v.sx; y *= v.sy;
      const c = Math.cos(v.rot), s2 = Math.sin(v.rot);
      const rx = x * c - y * s2, ry = x * s2 + y * c;
      return [cx + rx + rnd() * size * v.jit, cy + ry + rnd() * size * v.jit];
    });
  }

  const rows = [];
  for (const ch of wanted) {
    const letter = window.MW.Handwriting.byChar(ch);
    const skeleton = thin(rasterize(ch, SANS).grid);
    if (skeleton.length < 3) { rows.push({ ch, plain: -2, guided: -2, sloppy: [] }); continue; }
    const ink = skeleton.map((p) => [p]);
    const hint = window.MW.Handwriting.bias({ tall: letter.tall, deep: letter.deep });

    const plain = R.recognize(ink, 8).findIndex((h) => h.tex === ch);
    const guided = R.recognize(ink, 8, hint);

    const sloppyRanks = [];
    for (let v = 0; v < 4; v++) {
      const warped = sloppy(skeleton, v, ch.charCodeAt(0) * 7919 + v * 104729);
      sloppyRanks.push(R.recognize(warped.map((p) => [p]), 8, hint).findIndex((h) => h.tex === ch));
    }

    rows.push({
      ch,
      plain,
      guided: guided.findIndex((h) => h.tex === ch),
      sloppy: sloppyRanks,
      top: guided.slice(0, 3).map((h) => h.tex).join('')
    });
  }
  return { templates: R.templateCount, rows };
}, { SLANTS, TUNE });

console.log(`Postavených predlôh: ${result.templates}`);

const score = (key) => {
  let t1 = 0, t3 = 0, t8 = 0;
  for (const r of result.rows) {
    if (r[key] === 0) t1++;
    if (r[key] >= 0 && r[key] < 3) t3++;
    if (r[key] >= 0) t8++;
  }
  return { t1, t3, t8 };
};

if (process.env.DETAIL) {
  for (const r of result.rows) {
    const mark = r.guided === 0 ? '✓' : r.guided > 0 ? '~' : '✗';
    console.log(`  ${mark} ${r.ch}   čisto=${String(r.guided).padStart(2)}   nedbalo=${(r.sloppy || []).join(',')}   ${r.top || ''}`);
  }
}

const n = result.rows.length;
const plain = score('plain'), guided = score('guided');

// nedbalý rukopis: každý znak v štyroch skomolených podobách
let s1 = 0, s3 = 0, s8 = 0, sN = 0;
for (const r of result.rows) {
  for (const rank of r.sloppy || []) {
    sN++;
    if (rank === 0) s1++;
    if (rank >= 0 && rank < 3) s3++;
    if (rank >= 0) s8++;
  }
}
const pct = (a, b) => (100 * a / b).toFixed(0) + ' %';

console.log(`\nčisté tvary:     top1 ${guided.t1}/${n} (${pct(guided.t1, n)})   top3 ${guided.t3}/${n}   top8 ${guided.t8}/${n}`);
console.log(`bez výšky:       top1 ${plain.t1}/${n} (${pct(plain.t1, n)})`);
console.log(`nedbalý rukopis: top1 ${s1}/${sN} (${pct(s1, sN)})   top3 ${s3}/${sN} (${pct(s3, sN)})   top8 ${s8}/${sN} (${pct(s8, sN)})`);

await browser.close();

if (guided.t1 <= plain.t1) {
  console.error('PADLO: linajky nepomáhajú, hoci majú rozlišovať veľkosť písmen');
  process.exit(1);
}
if (guided.t1 / n < 0.76) { console.error('PADLO: príliš málo čistých písmen naprvýkrát'); process.exit(1); }
if (s1 / sN < 0.70) { console.error('PADLO: nedbalý rukopis naprvýkrát'); process.exit(1); }
if (s3 / sN < 0.84) { console.error('PADLO: nedbalý rukopis do prvej trojice'); process.exit(1); }
console.log('OK');
