/* Zlepí celú appku do jediného HTML súboru, ktorý sa dá poslať mailom,
 * hodiť na USB a otvoriť dvojklikom aj bez internetu. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// V <script> sa nesmie objaviť koncová značka – rozbila by dokument.
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

// Písma KaTeXu zapečieme priamo do CSS.
function inlineFonts(css) {
  return css.replace(/url\(fonts\/([\w-]+\.woff2)\)/g, (_, file) => {
    const b64 = readFileSync(resolve(root, 'vendor/katex/fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${b64})`;
  });
}

let html = read('index.html');

// Náhrada musí byť funkcia: v reťazci by sa $' a $& v kóde brali ako vzory.
const swap = (tag, body) => {
  if (!html.includes(tag)) {
    console.error('V index.html chýba ' + tag);
    process.exit(1);
  }
  html = html.replace(tag, () => body);
};

swap('<link rel="stylesheet" href="vendor/katex/katex.min.css">',
  '<style>' + inlineFonts(read('vendor/katex/katex.min.css')) + '</style>');
swap('<link rel="stylesheet" href="css/style.css">',
  '<style>' + read('css/style.css') + '</style>');

for (const src of ['vendor/katex/katex.min.js', 'js/symbols.js', 'js/recognizer.js', 'js/app.js']) {
  swap(`<script src="${src}"></script>`, '<script>' + safe(read(src)) + '</script>');
}

if (/<(script|link)[^>]+(src|href)="(?!data:)/.test(html)) {
  console.error('Zostal odkaz na vonkajší súbor – build by nefungoval offline.');
  process.exit(1);
}

const out = resolve(root, 'math-workspace.html');
writeFileSync(out, html);
console.log(`${out}  (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
