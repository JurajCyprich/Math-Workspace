/* Preklikanie celej aplikácie v prehliadači. */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const shots = resolve(root, 'tests', 'screenshots');
mkdirSync(shots, { recursive: true });

const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => existsSync(p));

const errors = [];
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failed++;
};

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

// TARGET=math-workspace.html preklikaním overí aj zlepený jednosúborový build
const url = 'file://' + resolve(root, process.env.TARGET || 'index.html');
await page.goto(url);
await page.waitForFunction(() => window.MW && window.MW.SYMBOLS);

/* 1. úvodná plocha ------------------------------------------------- */
const blocks = await page.locator('.block').count();
const katexBits = await page.locator('.block .katex').count();
check('úvodné bloky sa vykreslili', blocks === 3, `blokov=${blocks}`);
check('KaTeX vysádzal vzorce', katexBits > 8, `vzorcov=${katexBits}`);
check('načítalo sa bez chýb v konzole', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: resolve(shots, '01-plocha.png') });

/* 2. písanie a napovedanie po \ ------------------------------------ */
await page.locator('.block').first().locator('.render').click();
await page.waitForSelector('.block.editing textarea');
const ta = page.locator('.block.editing textarea');
await ta.press('Control+End');
await ta.type('\n\\alp');
await page.waitForSelector('#autocomplete:not([hidden])', { timeout: 3000 });
const acFirst = await page.locator('.ac-item.on .ac-tex').textContent();
check('po „\\alp" sa ponúkol \\alpha', acFirst === '\\alpha', `ponuka=${acFirst}`);
await page.screenshot({ path: resolve(shots, '02-napovedanie.png') });
await ta.press('Enter');
const afterAc = await ta.inputValue();
check('Enter doplnil príkaz', afterAc.includes('\\alpha '), JSON.stringify(afterAc.slice(-18)));

// šablóna s argumentom má kurzor v zátvorke
await ta.type('\\frac');
await page.waitForSelector('#autocomplete:not([hidden])');
await ta.press('Enter');
const [val, caret] = await ta.evaluate((el) => [el.value, el.selectionStart]);
check('\\frac sa vložil aj so zátvorkami', val.includes('\\frac{}{}'), JSON.stringify(val.slice(-12)));
check('kurzor skočil do prvej zátvorky', val[caret - 1] === '{' && val[caret] === '}', `caret=${caret}`);

/* 3. paleta symbolov ----------------------------------------------- */
await page.locator('#btn-palette').click();
await page.waitForSelector('#palette:not([hidden])');
await page.locator('#palette-search').fill('integrál');
await page.waitForTimeout(150);
const hitCount = await page.locator('#palette-body .sym').count();
check('vyhľadávanie v palete našlo integrál', hitCount > 0, `nájdených=${hitCount}`);
await page.screenshot({ path: resolve(shots, '03-paleta.png') });
await page.locator('#palette-body .sym').first().click();
const afterPalette = await page.locator('.block').first().locator('textarea').inputValue();
check('symbol z palety sa vložil do bloku', /\\i{0,2}nt|\\oint/.test(afterPalette),
  JSON.stringify(afterPalette.slice(-14)));
await page.locator('[data-close="palette"]').click();

/* 4. kreslenie symbolu --------------------------------------------- */
await page.locator('#btn-draw').click();
await page.waitForSelector('#draw:not([hidden])');
await page.waitForFunction(() => window.MW.Recognizer.ready, null, { timeout: 15000 });

const box = await page.locator('#draw-canvas').boundingBox();
// integrál: zvislá esíčkovitá krivka
const cx = box.x + box.width / 2, cy = box.y + box.height / 2, h = box.height * 0.36;
await page.mouse.move(cx + 26, cy - h);
await page.mouse.down();
for (let i = 0; i <= 40; i++) {
  const t = i / 40;
  const y = cy - h + 2 * h * t;
  const x = cx + 26 * Math.cos(Math.PI * t) - 10 * Math.sin(2 * Math.PI * t);
  await page.mouse.move(x, y);
}
await page.mouse.up();
await page.waitForSelector('#draw-results .hit', { timeout: 5000 });
const cands = await page.locator('#draw-results .hit .tx').allTextContents();
check('kreslenie vrátilo návrhy', cands.length > 0, cands.join(' '));
check('medzi návrhmi je integrál', cands.includes('\\int'), cands.slice(0, 5).join(' '));
await page.screenshot({ path: resolve(shots, '04-kreslenie.png') });

const before = await page.locator('.block').first().locator('textarea').inputValue();
await page.locator('#draw-results .hit').first().click();
const afterDraw = await page.locator('.block').first().locator('textarea').inputValue();
check('výber návrhu vložil symbol do bloku', afterDraw.length > before.length,
  JSON.stringify(afterDraw.slice(-12)));
const learned = await page.evaluate(() => window.MW.Recognizer.learnedCount());
check('rukopis sa uložil na neskôr', learned === 1, `uložených=${learned}`);
await page.locator('[data-close="draw"]').click();

/* 5. pero na ploche ------------------------------------------------ */
await page.locator('.tool[data-tool="pen"]').click();
await page.mouse.move(1050, 620);
await page.mouse.down();
for (let i = 0; i <= 25; i++) await page.mouse.move(1050 + i * 9, 620 + Math.sin(i / 3) * 34);
await page.mouse.up();
const paths = await page.locator('#ink path').count();
check('pero nakreslilo čiaru na plochu', paths === 1, `ťahov=${paths}`);

/* 6. guma ----------------------------------------------------------- */
await page.locator('.tool[data-tool="eraser"]').click();
await page.mouse.move(1050, 620);
await page.mouse.down();
await page.mouse.move(1070, 620);
await page.mouse.up();
check('guma čiaru zmazala', (await page.locator('#ink path').count()) === 0);

/* 7. pero znovu + uloženie a obnova --------------------------------- */
await page.locator('.tool[data-tool="pen"]').click();
await page.mouse.move(1050, 700);
await page.mouse.down();
for (let i = 0; i <= 20; i++) await page.mouse.move(1050 + i * 8, 700 + i * 2);
await page.mouse.up();

const expectText = await page.locator('.block').first().locator('textarea').inputValue();
await page.waitForTimeout(700);              // nech stihne autosave
await page.reload();
await page.waitForFunction(() => window.MW && window.MW.SYMBOLS);
const afterReload = {
  blocks: await page.locator('.block').count(),
  paths: await page.locator('#ink path').count(),
  text: await page.locator('.block').first().locator('textarea').inputValue()
};
check('po obnovení stránky zostali bloky', afterReload.blocks === 3, `blokov=${afterReload.blocks}`);
check('po obnovení zostala kresba', afterReload.paths === 1, `ťahov=${afterReload.paths}`);
check('po obnovení zostal text bloku', afterReload.text === expectText);

/* 8. zväčšenie a posun --------------------------------------------- */
await page.locator('#btn-zoom-in').click();
const zoomLabel = await page.locator('#btn-zoom-reset').textContent();
check('priblíženie funguje', zoomLabel.trim() === '120 %', `popis=${zoomLabel}`);
await page.locator('#btn-zoom-reset').click();

/* 9. textový režim bloku ------------------------------------------- */
await page.locator('.block').first().locator('.mode').click();
await page.waitForTimeout(100);
const textMode = await page.locator('.block').first().locator('.render .textline').count();
check('prepnutie na textový režim', textMode > 0, `textových riadkov=${textMode}`);
await page.locator('.block').first().locator('.mode').click();

/* 10. nápoveda ------------------------------------------------------ */
await page.locator('#btn-help').click();
await page.waitForSelector('#help:not([hidden])');
await page.screenshot({ path: resolve(shots, '05-napoveda.png') });
await page.keyboard.press('Escape');

check('žiadne chyby v konzole počas testu', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log(failed ? `\nPADLO: ${failed} kontrol` : '\nOK – všetko prešlo');
process.exit(failed ? 1 : 0);
