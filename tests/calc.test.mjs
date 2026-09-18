/* Vyhodnocovač výrazov. Beží priamo v Node – nepotrebuje prehliadač. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { MW: {} };
new Function('window', readFileSync(resolve(root, 'js/calc.js'), 'utf8'))(sandbox);
const { evaluate, format, lineResult, lineExpression } = sandbox.MW.Calc;

let failed = 0;
const near = (a, b) => a !== null && Math.abs(a - b) < 1e-9;

function ok(name, cond, extra = '') {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) failed++;
}

function val(expr, want) {
  const got = evaluate(expr);
  ok(`${expr}  =  ${want}`, near(got, want), got === null ? 'null' : String(got));
}

function nope(expr, why) {
  ok(`${expr}  →  nedá sa (${why})`, evaluate(expr) === null, String(evaluate(expr)));
}

console.log('\nzáklady');
val('2+3', 5);
val('10 - 4 - 3', 3);
val('2 + 3 \\cdot 4', 14);          // násobenie pred sčítaním
val('(2 + 3) \\cdot 4', 20);
val('7 / 2', 3.5);
val('8 \\div 4', 2);
val('3 \\times 4', 12);
val('-5 + 2', -3);
val('-(3 + 4)', -7);
val('2 - -3', 5);

console.log('\nzlomky, mocniny, odmocniny');
val('\\frac{3}{2}', 1.5);
val('\\tfrac{1}{2} + \\tfrac{1}{2}', 1);
val('\\frac{5 + 1}{4}', 1.5);
val('2^3', 8);
val('2^{10}', 1024);
val('2^{-1}', 0.5);
val('3^2 + 4^2', 25);
val('2^3^2', 512);                   // mocnina je sprava: 2^(3^2)
val('\\sqrt{16}', 4);
val('\\sqrt[3]{8}', 2);
val('\\sqrt[3]{-27}', -3);           // nepárny stupeň zo záporného ide
val('\\sqrt{2}^2', 2);

console.log('\nkonštanty a skryté násobenie');
val('2\\pi', 2 * Math.PI);
val('\\pi', Math.PI);
val('e', Math.E);
val('2(3 + 4)', 14);
val('(1+1)(2+2)', 8);
val('\\frac{1}{2}4', 2);

console.log('\nfunkcie');
val('\\sin{0}', 0);
val('\\cos{0}', 1);
val('\\sin(30^\\circ)', 0.5);        // stupne
val('\\cos(60^{\\circ})', 0.5);
val('\\sin^2{0} + \\cos^2{0}', 1);   // mocnina patrí výsledku funkcie
val('\\ln{e}', 1);
val('\\log{100}', 2);
val('\\log_{2}{8}', 3);
val('\\abs{-7}', 7);
val('\\exp{0}', 1);

console.log('\ndesatinné čísla');
val('1{,}5 + 1', 2.5);               // KaTeXová čiarka
val('1,5 \\cdot 2', 3);
val('0.25 \\cdot 4', 1);

console.log('\nčo sa vyčísliť nedá');
nope('2x + 3', 'premenná');
nope('4ac', 'premenné');
nope('5 \\unit{m}', 'jednotka');
nope('\\text{ahoj}', 'text');
nope('x_1', 'premenná');
nope('5 \\pm 1', 'dve riešenia');
nope('\\int_0^1 x', 'integrál');
nope('1/0', 'delenie nulou');
nope('\\sqrt{-4}', 'záporné pod odmocninou');
nope('2 +', 'neúplný výraz');
nope('(2 + 3', 'neuzavretá zátvorka');
nope('', 'prázdny vstup');
nope('\\frac{1}{0}', 'delenie nulou');

console.log('\nformátovanie výsledku');
ok('celé číslo bez desatinnej časti', format(5, false) === '5', format(5, false));
ok('desatinná bodka po anglicky', format(1.5, false) === '1.5', format(1.5, false));
ok('desatinná čiarka po slovensky', format(1.5, true) === '1{,}5', format(1.5, true));
ok('nepresnosť plávajúcej čiarky sa zaokrúhli',
  format(0.1 + 0.2, false) === '0.3', format(0.1 + 0.2, false));
ok('veľké číslo v mocninovom tvare',
  format(1.5e14, false) === '1.5 \\cdot 10^{14}', format(1.5e14, false));
ok('malé číslo v mocninovom tvare',
  format(2.5e-9, false) === '2.5 \\cdot 10^{-9}', format(2.5e-9, false));
ok('mínus nula je nula', format(-0, false) === '0', format(-0, false));

console.log('\nriadky bloku');
ok('riadok bez „=" sa počíta celý', lineResult('2 + 3', false) === '5', lineResult('2 + 3', false));
ok('prázdno za „=" počíta ľavú stranu',
  lineResult('D = 25 - 24 =', false) === '1', lineResult('D = 25 - 24 =', false));
ok('počíta sa posledná strana rovnosti',
  lineResult('D = b = 25 - 24', false) === '1', lineResult('D = b = 25 - 24', false));
ok('hotový výsledok sa už neponúka', lineResult('2 + 3 = 5', false) === null);
ok('rovnica s nulou sa neponúka', lineResult('2x^2 - 5x + 3 = 0', false) === null);
ok('hotový desatinný výsledok sa neponúka', lineResult('x = 1{,}5', false) === null);
ok('poznámka pod „#" sa nepočíta', lineResult('# 2 + 3', false) === null);
ok('riadok s premennou sa nepočíta', lineResult('y = 2x', false) === null);
ok('výraz sa berie spoza posledného „="',
  lineExpression('a = b = 2+3') === '2+3', String(lineExpression('a = b = 2+3')));

console.log(failed ? `\nPADLO: ${failed} kontrol` : '\nOK – všetko prešlo');
process.exit(failed ? 1 : 0);
