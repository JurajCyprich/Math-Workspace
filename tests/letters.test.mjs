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

const result = await page.evaluate(async () => {
  const SERIF = ['"DejaVu Serif","FreeSerif",serif',
    '"Liberation Serif","Bitstream Charter",serif'];
  const SANS = '"FreeSans","DejaVu Sans",sans-serif';

  const R = window.MW.createRecognizer('mw:test-letters');
  const shapes = window.MW.LETTERS.filter((l) => !l.tiny);
  await R.build(shapes, SERIF);

  const { rasterize, thin } = R._internals;
  const wanted = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  const rows = [];
  for (const ch of wanted) {
    const letter = window.MW.Handwriting.byChar(ch);
    const skeleton = thin(rasterize(ch, SANS).grid);
    if (skeleton.length < 3) { rows.push({ ch, plain: -2, guided: -2 }); continue; }
    const ink = skeleton.map((p) => [p]);

    // bez pomoci linajok
    const plain = R.recognize(ink, 8).findIndex((h) => h.tex === ch);
    // s presne zmeranou výškou – strop, ktorý linajky môžu dať
    const guided = R.recognize(ink, 8,
      window.MW.Handwriting.bias({ tall: letter.tall, deep: letter.deep })
    );
    rows.push({
      ch,
      plain,
      guided: guided.findIndex((h) => h.tex === ch),
      top: guided.slice(0, 3).map((h) => h.tex).join('')
    });
  }
  return { templates: R.templateCount, rows };
});

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

for (const r of result.rows) {
  const mark = r.guided === 0 ? '✓' : r.guided > 0 ? '~' : '✗';
  console.log(`  ${mark} ${r.ch}   bez linajok=${String(r.plain).padStart(2)}   s linajkami=${String(r.guided).padStart(2)}   ${r.top || ''}`);
}

const n = result.rows.length;
const plain = score('plain'), guided = score('guided');
console.log(`\nbez linajok:  top1 ${plain.t1}/${n}   top3 ${plain.t3}/${n}   top8 ${plain.t8}/${n}`);
console.log(`s linajkami:  top1 ${guided.t1}/${n}   top3 ${guided.t3}/${n}   top8 ${guided.t8}/${n}`);

await browser.close();

if (guided.t1 <= plain.t1) {
  console.error('PADLO: linajky nepomáhajú, hoci majú rozlišovať veľkosť písmen');
  process.exit(1);
}
if (guided.t1 / n < 0.7) { console.error('PADLO: príliš málo písmen naprvýkrát'); process.exit(1); }
if (guided.t3 / n < 0.85) { console.error('PADLO: príliš málo písmen v prvej trojici'); process.exit(1); }
console.log('OK');
