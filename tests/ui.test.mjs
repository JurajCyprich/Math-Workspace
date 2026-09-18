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

/* 2b. napovedanie zo slovenského slova ------------------------------ */
await ta.press('Control+End');
await ta.type('\nodmocnina');
await page.waitForSelector('#autocomplete:not([hidden])', { timeout: 3000 });
const wordFirst = await page.locator('.ac-item.on .ac-tex').textContent();
check('slovo „odmocnina" ponúklo \\sqrt', wordFirst === '\\sqrt{}', `ponuka=${wordFirst}`);
check('pri slovách je vidieť, že dopĺňa Tab',
  (await page.locator('.ac-hint').count()) === 1);
await page.screenshot({ path: resolve(shots, '06-slovo.png') });

await ta.press('Tab');
const afterWord = await ta.inputValue();
check('Tab nahradil slovo symbolom', /\\sqrt\{\}$/.test(afterWord), JSON.stringify(afterWord.slice(-14)));
check('slovo v zdroji nezostalo', !afterWord.includes('odmocnina'));

// bez diakritiky aj s ňou musí ísť to isté
await ta.type('\nintegral');
await page.waitForSelector('#autocomplete:not([hidden])');
const noDia = await page.locator('.ac-item.on .ac-tex').textContent();
check('„integral" bez diakritiky nájde integrál', noDia === '\\int', `ponuka=${noDia}`);

// Enter pri slove robí nový riadok, nie doplnenie
// (kurzor je vnútri \sqrt{}, takže riadok pribudne tam, nie na konci)
const beforeEnter = await ta.inputValue();
await ta.press('Enter');
const afterEnter = await ta.inputValue();
check('Enter pri slove urobí nový riadok, nedopĺňa',
  afterEnter.length === beforeEnter.length + 1 && afterEnter.includes('integral'),
  JSON.stringify(afterEnter.slice(-12)));

// v poznámkovom riadku pod „#" sa okno nesmie otvárať
await ta.type('# vypocitaj odmocninu');
await page.waitForTimeout(150);
check('v poznámke pod „#" napovedanie mlčí',
  await page.locator('#autocomplete').isHidden());
await ta.press('Control+End');

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

await page.waitForTimeout(400);           // nech dobehne postupné nabiehanie
const faded = await page.locator('#draw-results .hit').evaluateAll(
  (els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length
);
check('všetky návrhy sú po animácii viditeľné', faded === 0, `priehľadných=${faded}`);

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

/* 10. krok späť a dopredu ------------------------------------------- */
await page.locator('.tool[data-tool="select"]').click();
// Mazanie bloku sa krátko animuje, takže na počet treba chvíľu počkať.
const settled = async (sel, n) => {
  await page.waitForFunction(
    ({ sel, n }) => document.querySelectorAll(sel).length === n, { sel, n }, { timeout: 3000}
  ).catch(() => {});
  return page.locator(sel).count();
};

const blocksBefore = await page.locator('.block').count();
await page.locator('.block').last().locator('.del').click();
check('blok sa zmazal', (await settled('.block', blocksBefore - 1)) === blocksBefore - 1);

await page.keyboard.press('Control+z');
check('Ctrl+Z vrátil zmazaný blok', (await settled('.block', blocksBefore)) === blocksBefore);

await page.keyboard.press('Control+Shift+z');
check('Ctrl+Shift+Z zmazanie zopakoval',
  (await settled('.block', blocksBefore - 1)) === blocksBefore - 1);
await page.keyboard.press('Control+z');
await settled('.block', blocksBefore);

// zmazanie kresby sa tiež dá vrátiť
await page.locator('.tool[data-tool="eraser"]').click();
await page.mouse.move(1050, 700);
await page.mouse.down();
await page.mouse.move(1090, 710);
await page.mouse.up();
check('guma zmazala uložený ťah', (await page.locator('#ink path').count()) === 0);
await page.locator('.tool[data-tool="select"]').click();
await page.keyboard.press('Control+z');
await page.waitForTimeout(120);
check('Ctrl+Z vrátil aj zmazanú kresbu', (await page.locator('#ink path').count()) === 1);

const undoDisabledAtStart = await page.evaluate(() => {
  const btn = document.querySelector('#btn-undo');
  return btn && !btn.disabled;
});
check('tlačidlo Späť je aktívne, keď je čo vrátiť', undoDisabledAtStart);

/* 11. prepínanie jazyka -------------------------------------------- */
await page.locator('.lang[data-lang="en"]').click();
check('angličtina prepla lištu',
  (await page.locator('.tool[data-tool="select"] i').textContent()) === 'Select');
await page.locator('#btn-palette').click();
await page.locator('#palette-search').fill('');
await page.waitForTimeout(150);
const enCat = await page.locator('#palette-body .cat-title').first().textContent();
check('paleta má anglické kategórie', enCat === 'Greek letters', `kategória=${enCat}`);

await page.locator('.lang[data-lang="sk"]').click();
await page.waitForTimeout(150);
check('slovenčina prepla lištu späť',
  (await page.locator('.tool[data-tool="select"] i').textContent()) === 'Výber');
const skCat = await page.locator('#palette-body .cat-title').first().textContent();
check('paleta má slovenské kategórie', skCat === 'Grécke písmená', `kategória=${skCat}`);
await page.locator('[data-close="palette"]').click();

await page.reload();
await page.waitForFunction(() => window.MW && window.MW.SYMBOLS);
check('jazyk prežil obnovenie stránky',
  (await page.locator('.tool[data-tool="select"] i').textContent()) === 'Výber');

/* 12. šablóna cez slovo a tretia odmocnina -------------------------- */
await page.locator('.block').first().locator('.render').click();
await page.waitForSelector('.block.editing textarea');
const ta2 = page.locator('.block.editing textarea');
await ta2.press('Control+End');
await ta2.type('\npytagor');
await page.waitForSelector('#autocomplete:not([hidden])', { timeout: 3000 });
await ta2.press('Tab');
const pyt = await ta2.inputValue();
check('slovo „pytagor" vložilo celý vzorec', pyt.includes('c^2 = a^2 + b^2'),
  JSON.stringify(pyt.slice(-22)));

await page.locator('#btn-palette').click();
await page.locator('#palette-search').fill('odmocnina');
await page.waitForTimeout(150);
const snipLabels = await page.locator('#palette-body .snip .lbl').allTextContents();
check('paleta ponúka tretiu odmocninu', snipLabels.includes('Tretia odmocnina'),
  snipLabels.join(' / '));
await page.locator('#palette-body .snip', { hasText: 'Tretia odmocnina' }).first().click();
const cube = await page.locator('.block').first().locator('textarea').inputValue();
check('tretia odmocnina sa vložila ako \\sqrt[3]{}', cube.includes('\\sqrt[3]{}'),
  JSON.stringify(cube.slice(-16)));
check('šablóna nevložila značku kurzora', !cube.includes('⟦'));
await page.locator('[data-close="palette"]').click();

/* 12b. kalkulačka ---------------------------------------------------- */
await page.locator('#btn-calc').click();
await page.waitForSelector('#calc:not([hidden])');
await page.locator('#calc-input').fill('\\frac{5+1}{4}');
await page.waitForTimeout(120);
check('kalkulačka počíta priebežne',
  (await page.locator('#calc-result').textContent()).includes('1,5'),
  await page.locator('#calc-result').textContent());

await page.locator('#calc-input').fill('2x + 1');
await page.waitForTimeout(120);
check('pri premennej kalkulačka nehádže výsledok',
  (await page.locator('#calc-result')).evaluate ? await page.locator('#calc-result').evaluate(
    (el) => el.classList.contains('bad')) : false);

// číselník vkladá na miesto kurzora a skáče do zátvorky
await page.locator('#calc-input').fill('');
await page.locator('#calc-keys button[data-key="\\\\sqrt{}"]').click();
await page.locator('#calc-keys button[data-key="9"]').click();
check('číselník vložil odmocninu a kurzor skočil dovnútra',
  (await page.locator('#calc-input').inputValue()) === '\\sqrt{9}',
  await page.locator('#calc-input').inputValue());
await page.waitForTimeout(120);
check('výsledok z číselníka sedí',
  (await page.locator('#calc-result').textContent()).includes('3'));

await page.locator('#calc-input').press('Enter');
await page.waitForTimeout(120);
check('história si výpočet zapamätala',
  (await page.locator('#calc-history .hit').count()) === 1,
  `položiek=${await page.locator('#calc-history .hit').count()}`);

const beforeInsert = await page.locator('.block').first().locator('textarea').inputValue();
await page.locator('#calc-insert').click();
const afterInsert = await page.locator('.block').first().locator('textarea').inputValue();
check('vloženie z kalkulačky dopísalo výraz aj výsledok',
  afterInsert.includes('\\sqrt{9} = 3') && afterInsert.length > beforeInsert.length,
  JSON.stringify(afterInsert.slice(-18)));
await page.screenshot({ path: resolve(shots, '08-kalkulacka.png') });
await page.locator('[data-close="calc"]').click();

/* 12c. dopočítanie riadku v bloku ----------------------------------- */
const calcBlock = page.locator('.block').first();
await calcBlock.locator('.render').click();
await page.waitForSelector('.block.editing textarea');
const ta3 = page.locator('.block.editing textarea');
await ta3.press('Control+End');
await ta3.type('\n25 - 24 =');
await page.waitForTimeout(150);

const calcButtons = await calcBlock.locator('.calc-line').count();
check('riadok na dopočítanie dostal tlačidlo', calcButtons >= 1, `tlačidiel=${calcButtons}`);
await calcBlock.locator('.calc-line').last().hover();
await page.screenshot({ path: resolve(shots, '09-dopocitat.png') });

await calcBlock.locator('.calc-line').last().click();
await page.waitForTimeout(150);
const solved = await calcBlock.locator('textarea').inputValue();
check('kliknutie dopísalo výsledok', /25 - 24 = 1$/.test(solved.trim()),
  JSON.stringify(solved.slice(-14)));
check('dvojité „=" sa nezdvojilo', !solved.includes('= = '));

await page.waitForTimeout(150);
const stillOffered = await calcBlock.locator('.calc-line').count();
check('hotový riadok už tlačidlo neponúka', stillOffered === calcButtons - 1,
  `pred=${calcButtons} po=${stillOffered}`);

/* 13. spätná väzba -------------------------------------------------- */
await page.locator('#btn-feedback').click();
await page.waitForSelector('#feedback:not([hidden])');
await page.locator('.star[data-value="4"]').click();
check('hodnotenie sa zapísalo',
  (await page.locator('#fb-score').textContent()).trim() === '4 z 5',
  await page.locator('#fb-score').textContent());
check('svietia štyri hviezdy', (await page.locator('.star.on').count()) === 4);
await page.locator('#fb-text').fill('Chýba mi tabuľka derivácií.');

// GitHub z tohto prostredia nie je dostupný, tak požiadavku zachytíme
// a odpovieme naň sami – zaujíma nás adresa, nie cieľová stránka.
let issueUrl = '';
await page.context().route('https://github.com/**', (route) => {
  issueUrl = route.request().url();
  return route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
});
const [issue] = await Promise.all([
  page.waitForEvent('popup'),
  page.locator('#fb-send').click()
]);
await issue.waitForLoadState().catch(() => {});
await issue.close();
check('odoslanie otvorí predvyplnenú stránku na GitHube',
  issueUrl.startsWith('https://github.com/JurajCyprich/Math-Workspace/issues/new') &&
  decodeURIComponent(issueUrl).includes('deriv') &&
  decodeURIComponent(issueUrl).includes('4/5'),
  issueUrl.slice(0, 96) || '(žiadna požiadavka)');

await page.reload();
await page.waitForFunction(() => window.MW && window.MW.SYMBOLS);
await page.locator('#btn-feedback').click();
check('rozpísaná spätná väzba sa nestratila',
  (await page.locator('#fb-text').inputValue()).includes('derivácií') &&
  (await page.locator('.star.on').count()) === 4);
await page.screenshot({ path: resolve(shots, '07-spatna-vazba.png') });

// Pri align-items:center majú prvky rôzne „top", ale rovnaký stred,
// takže riadky počítame podľa stredov.
const barRows = await page.locator('.topbar').evaluate((bar) => {
  const mids = [...bar.children].map((el) => {
    const r = el.getBoundingClientRect();
    return Math.round(r.top + r.height / 2);
  });
  return new Set(mids).size;
});
check('horná lišta sa vojde do jedného riadku', barRows === 1, `riadkov=${barRows}`);
await page.locator('[data-close="feedback"]').click();

/* 14. nápoveda ------------------------------------------------------ */
await page.locator('#btn-help').click();
await page.waitForSelector('#help:not([hidden])');
await page.screenshot({ path: resolve(shots, '05-napoveda.png') });
await page.keyboard.press('Escape');

check('žiadne chyby v konzole počas testu', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log(failed ? `\nPADLO: ${failed} kontrol` : '\nOK – všetko prešlo');
process.exit(failed ? 1 : 0);
