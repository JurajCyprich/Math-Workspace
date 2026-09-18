/* Test rozpoznávača: predlohy sa stavajú z pätkového písma, „nakreslené"
 * ťahy sa berú z iného písma. Ak sa správny symbol trafí aj naprieč
 * rôznymi rezmi písma, tvarové porovnanie funguje. */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome']
  .find((p) => existsSync(p));

const TEST_SYMBOLS = [
  '\\int', '\\sum', '\\prod', '\\infty', '\\partial', '\\nabla', '\\alpha',
  '\\beta', '\\pi', '\\lambda', '\\mu', '\\omega', '\\Omega', '\\Delta',
  '\\theta', '\\sqrt{}', '\\neq', '\\leq', '\\geq', '\\approx', '\\equiv',
  '\\pm', '\\times', '\\div', '\\to', '\\Rightarrow', '\\in', '\\subset',
  '\\forall', '\\exists', '\\emptyset', '\\cup', '\\cap', '\\perp',
  '\\angle', '\\oplus', '\\otimes', '\\hbar', '\\propto', '\\uparrow'
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console]', m.text()); });
await page.goto('file://' + resolve(here, 'harness.html'));
await page.waitForFunction(() => window.MW && window.MW.Recognizer);

const WEIGHTS = process.env.SWEEP ? [0, 1, 2, 4, 8, 20] : [Number(process.env.W ?? 2)];

const result = await page.evaluate(async ({ wanted, weights }) => {
  const R = window.MW.Recognizer;
  const SERIF = ["\"DejaVu Serif\",\"FreeSerif\",serif", "\"Liberation Serif\",\"Bitstream Charter\",serif", "\"OpenSymbol\",serif"];
  const SANS = '"FreeSans","DejaVu Sans",sans-serif';

  await R.build(window.MW.SYMBOLS, SERIF);

  const { rasterize, thin, setCloudWeight } = R._internals;

  // „Nakreslené" ťahy: kostra toho istého znaku v inom reze písma.
  // Body podávame ako samostatné jednobodové ťahy – poradie pixelov
  // v kostre nie je cesta pera, takže sa nesmú spájať do polyčiary.
  const inks = new Map();
  for (const tex of wanted) {
    const sym = window.MW.SYMBOLS.find((s) => s.tex === tex);
    if (!sym) continue;
    const skeleton = thin(rasterize(sym.ch, SANS).grid);
    if (skeleton.length >= 3) inks.set(tex, skeleton.map((p) => [p]));
  }

  const runs = [];
  for (const w of weights) {
    setCloudWeight(w);
    const rows = [];
    for (const tex of wanted) {
      const ink = inks.get(tex);
      if (!ink) { rows.push({ tex, rank: -2 }); continue; }
      const hits = R.recognize(ink, 8);
      rows.push({
        tex,
        rank: hits.findIndex((h) => h.tex === tex),
        top: hits.slice(0, 3).map((h) => h.tex + ':' + h.dist.toFixed(2))
      });
    }
    runs.push({ w, rows });
  }
  return { built: R.templateCount, skipped: R.skipped, runs };
}, { wanted: TEST_SYMBOLS, weights: WEIGHTS });

console.log(`Postavených predlôh: ${result.built}`);
if (result.skipped.length) console.log(`Preskočené (chýba glyf): ${result.skipped.join(' ')}`);

let pass = false;
for (const run of result.runs) {
  let top1 = 0, top3 = 0, top8 = 0;
  for (const r of run.rows) {
    if (r.rank === 0) top1++;
    if (r.rank >= 0 && r.rank < 3) top3++;
    if (r.rank >= 0) top8++;
  }
  const n = run.rows.length;
  if (result.runs.length === 1) {
    for (const r of run.rows) {
      const mark = r.rank === 0 ? '✓' : r.rank > 0 ? '~' : '✗';
      console.log(`  ${mark} ${r.tex.padEnd(12)} rank=${r.rank}  ${(r.top || []).join('  ')}`);
    }
    console.log('');
  }
  console.log(`váha mračna ${String(run.w).padStart(3)}:  top1 ${top1}/${n}   top3 ${top3}/${n}   top8 ${top8}/${n}`);
  if (top1 / n >= 0.75 && top3 / n >= 0.85) pass = true;
}

await browser.close();

if (!pass) { console.error('PADLO: príliš málo symbolov v top 3'); process.exit(1); }
console.log('OK');
