# Math Workspace

Voľná plocha na písanie matematiky a fyziky. Nekonečné plátno, na ktoré si kamkoľvek
odložíš príklad, poznámku alebo náčrt – a symboly, ktoré nie sú na klávesnici, dostaneš
tak, že ich **nakreslíš myšou**.

Celá appka je jedna statická stránka. Žiadny build, žiadny server, žiadny účet.
Stačí otvoriť `index.html`.

## Čo to vie

**Plocha**
- Dvojklik kamkoľvek vytvorí nový blok, ťahaním prázdnej plochy sa posúvaš,
  `Ctrl` + koliesko približuje.
- Bloky sa ťahajú za horný pásik, dajú sa duplikovať a mazať.
- Pero kreslí priamo na plochu (náčrtky, grafy, schémy), guma maže ťahy.
- `Ctrl+Z` vráti späť čokoľvek – zmazaný blok, zmazanú kresbu aj vyčistenie plochy.

**Písanie**
- Píšeš bežný zápis: `x^2 + 3x - 4 = 0`. Každý riadok bloku je samostatný riadok výpočtu.
- Riadok začínajúci `#` je obyčajný text – nadpis alebo poznámka.
- Blok sa dá prepnúť do textového režimu, kde je matematika medzi `$…$`.
- Sadzba je cez [KaTeX](https://katex.org/) (priložený v `vendor/`, funguje offline).

**Symboly, ktoré nie sú na klávesnici** – štyri spôsoby:
1. **Nakresliť symbol** – nakreslíš znak myšou alebo prstom a appka ponúkne, čo to
   podľa nej je. Keď si zo zoznamu vyberieš, tvoj rukopis si **zapamätá**, takže
   nabudúce ten istý ťah trafí lepšie.
2. **Paleta** (`Ctrl+K`) – všetky symboly podľa kategórií, plus hotové vzorce
   z fyziky a matematiky a jednotky sústavy SI.
3. **Napovedanie slovom** – napíšeš `odmocnina` a stlačíš `Tab`, vo vzorci je `√`.
   Funguje na `zlomok`, `integral`, `suma`, `nekonecno`, `stupen`, `vektor`,
   `limita`, `derivacia`, `matica`, `nerovna`… – na názov ktoréhokoľvek symbolu,
   s diakritikou aj bez nej, po slovensky aj po anglicky. Ponúkajú sa aj celé
   šablóny: `pytagor` + `Tab` vloží `c^2 = a^2 + b^2`. `Enter` si pritom necháva
   svoj bežný význam, takže písanie viacriadkového výpočtu to neruší.
   V poznámkových riadkoch pod `#` okno nevyskakuje vôbec.
4. **Spätná lomka** – napíšeš `\` a začneš písať názov príkazu; `\alp` → `\alpha`.
   Príkazy s argumentmi sa vložia aj so zátvorkami a kurzor skočí dovnútra.

**Skratky navyše**, aby sa fyzika písala kratšie:
`\dd` (diferenciál d), `\unit{m}`, `\dv{y}{x}`, `\pdv{f}{x}`, `\abs{x}`, `\norm{v}`,
`\grad`, `\divg`, `\curl`, `\ket{ψ}`, `\bra{ψ}`, `\braket{φ}{ψ}`, `\R \N \Z \Q \C`.

**Poznámky z rukopisu** (`Ctrl+H`) – otvorí sa textové okno a prepne sa na pero.
Píšeš rukou **priamo na plochu** a každé písmeno sa prepíše hneď, ako začneš
ďalšie – nečaká sa na dopísanie slova. Písmená z viacerých ťahov to zvláda:
keď ťah preklenie už zapísané znaky (prečiarknutie „H" ide cez obe zvislice),
appka ich vezme z textu späť a prečíta ich dokopy. Ťahy zostanú na ploche ako kresba, takže
máš aj rukopis, aj text. Keď sa znak netrafí, vedľa je ponuka ďalších možností;
výberom správneho si appka tvoj rukopis zapamätá. Prvé písmeno vety sa píše
veľkým samo. Poznámky sa dajú uložiť ako `.txt`, načítať späť, skopírovať alebo
vložiť na plochu ako blok, a držia sa v prehliadači.

**Počítanie** – dve cesty:
- **Priamo v bloku**: pri riadku, ktorý sa dá vyčísliť, sa vpravo ukáže `=`.
  Klikneš a výsledok sa dopíše na koniec riadku. Pri riadku s premennou,
  jednotkou alebo už hotovým výsledkom sa tlačidlo neponúka vôbec.
- **Kalkulačka** (`Ctrl+E`) – panel s číselníkom, priebežným výsledkom
  a históriou posledných desiatich výpočtov.

Výraz sa píše tak, ako sa píše vzorec: `\frac{5+1}{4}`, `\sqrt[3]{8}`, `2\pi`,
`\sin(30^\circ)`, `\log_{2}{8}`, `1{,}5`. Desatinná čiarka aj bodka fungujú a
výsledok sa vypíše podľa zvoleného jazyka.

**Riešenie rovníc** – rovnica s dvomi stranami a jednou neznámou dostane vpravo
tlačidlo s menom tej neznámej, napríklad `x=`. Po kliknutí pribudne riešenie na
**nový riadok pod rovnicou**, aby zadanie ostalo nedotknuté:

```
2x + 3 = 7
x = 2
```

Obe strany sa prečítajú ako mnohočleny a ich rozdiel sa položí rovný nule.
Podľa stupňa ide o lineárnu alebo kvadratickú rovnicu – tá dá dva korene
(`x_{1} = 1{,}5 \quad x_{2} = 1`), pri dvojnásobnom koreni jeden. Keď reálne
riešenie neexistuje, vypíše sa `x \notin \mathbb{R}`; keď platí rovnica vždy,
`x \in \mathbb{R}`. Neznáma sa nemusí volať `x` – `0,5t = 10` dá `t = 20`.

Čo sa neponúka: viac neznámych naraz (`y = 2x + 1`), tretí a vyšší stupeň,
riadky s indexmi či jednotkami a fyzikálne vzťahy ako `c = \lambda f` – grécke
písmená sú príkazy, nie neznáme. Rovnica, ktorá už má riešenie hneď pod sebou,
tlačidlo nedostane, takže sa nedá dopisovať dookola.

Rovnicu rieši aj kalkulačka: keď do nej napíšeš `2x + 3 = 7`, ukáže `x = 2`
a *Vložiť do plochy* vloží rovnicu aj s riešením pod ňou.

Vyhodnocovanie má vlastný tokenizer a parser (`js/calc.js`) – zámerne **nie**
`eval()`. Do plochy sa dá napísať čokoľvek a nič z toho sa nesmie spustiť ako kód.

**Odmocniny vyššieho stupňa** – stupeň sa píše do hranatých zátvoriek:
`\sqrt[3]{8}` dá ∛8. V palete to nájdeš ako *Tretia odmocnina* alebo *n-tá odmocnina*.

**Dva jazyky** – prepínač `SK` / `EN` v lište. Prepne sa celé rozhranie, názvy
symbolov aj šablón. Hľadať a dopĺňať sa pritom dá v oboch jazykoch naraz, takže
`odmocnina` funguje aj v anglickom režime a `root` v slovenskom.

**Spätná väzba** – tlačidlo ☆ otvorí panel s hodnotením a poľom na text.
*Odoslať cez GitHub* otvorí predvyplnenú stránku nového issue; rozpísaný text
sa medzitým drží v prehliadači, takže sa nestratí.

**Ukladanie** – plocha sa priebežne ukladá do prehliadača. Tlačidlom *Uložiť* si ju
stiahneš ako `.json`, tlačidlom *Načítať* vrátiš späť.

## Ako to spustiť

Otvor `index.html` v prehliadači. Nič viac.

Ak chceš lokálny server (napr. kvôli testom):

```bash
npm run serve      # http://localhost:8080
```

### Jeden súbor na poslanie

```bash
npm run build      # vyrobí math-workspace.html (~0,7 MB)
```

Celá appka vrátane KaTeXu a jeho písiem zlepená do jediného HTML. Dá sa poslať
mailom, hodiť na USB a otvoriť dvojklikom – funguje aj úplne bez internetu.

### Na internet cez Vercel

Na [vercel.com/new](https://vercel.com/new) vyber tento repozitár a daj *Deploy*.
Nič sa nenastavuje – `vercel.json` v repozitári hovorí, že ide o statickú stránku
bez kompilácie, takže sa nič neinštaluje ani nebuilduje. Každý ďalší push do
`main` sa nasadí sám.

### Alebo cez GitHub Pages

Repozitár je statický web v koreňovom adresári, takže stačí v **Settings → Pages**
zvoliť *Deploy from a branch*, vetvu `main` a priečinok `/ (root)`. Prvé
zostavenie trvá aj pár minút – kým dobehne, adresa vracia 404.

## Ako funguje rozpoznávanie kresby

Bez neurónovej siete a bez internetu, celé v prehliadači (`js/recognizer.js`):

1. Každý symbol z databázy sa vyrenderuje ako glyf do malého plátna – a to
   v troch rôznych rezoch písma, aby predlohy pokryli aj rozdiely medzi pätkovým
   a bezpätkovým tvarom.
2. Tvar sa **stenčí na kostru** (algoritmus Zhang–Suen), takže z hrubého písma
   zostane len stredová čiara – tá je porovnateľná s ťahom pera.
3. Kostra aj nakreslené ťahy sa prevedú na mračno bodov v jednotkovom štvorci.
   Pomer strán sa zachováva, aby sa `−` nepomýlilo s `|`.
4. Porovnávajú sa dva príznaky naraz: **rozmazaná mriežka hustoty ťahov**
   (20 × 20, ktorá nesie rozloženie kresby v ploche) a **obojsmerná priemerná
   vzdialenosť k najbližšiemu bodu**.
5. To isté sa počíta ešte raz v **natiahnutom pohľade**, kde sa osi škálujú
   nezávisle – ručne písaný znak býva oproti tlačenému vyšší alebo širší.
   Pri tvaroch blízkych čiare sa natiahnutie vynecháva, aby sa `−` nestalo `+`.
6. Vlastné predlohy, ktoré vzniknú tvojím výberom zo zoznamu, majú prednosť
   pred typografickými.

Postavenie predlôh trvá ~220 ms, jeden dopyt ~14 ms.

Písmená používajú ten istý stroj, len s vlastnou sadou predlôh a vlastnou
pamäťou rukopisu – rozpoznávač je továrnička, nie jedináčik.

Navyše sa pri nich rovnajú dve veci, ktoré pri tlačených symboloch nehrozia.
**Sklon rukopisu**: tvar sa nakloní späť tak, aby x a y prestali spolu súvisieť,
takže šikmo písané „a" sa dostane na ten istý tvar ako kolmé. Naprávame len
polovicu a s hornou hranicou – inak by sa z „/" stalo „|". A **predlohy sa
stavajú aj naklonené** na obe strany, plus z rukopisných rezov písma tam, kde
ich prehliadač má. Rozmazanie mriežky je pri písmenách hrubšie než pri
symboloch, lebo na jemných rozdieloch tu nezáleží tak ako na celkovom tvare.

Ďalej im pomáha **výška ťahu**: tvar sám o sebe nerozlíši „C" od „c", lebo po
normalizácii sú to tie isté body. Na voľnej ploche ale žiadne linajky nie sú,
tak sa odhadujú priebežne z posledných napísaných znakov – základná linajka je
spodok väčšiny z nich a stredná výška spodná tretina ich výšok. Na tom istom
meraní stojí aj „0" verzus „o" či „P" verzus „p". Výška zhodu iba zdražuje,
nikdy nevylučuje, takže keď sa zmeria zle, správny znak zostane v ponuke; kým
nie je z čoho merať, výška sa neberie do úvahy vôbec. Samotná výška posúva úspešnosť zo 42/62 na 50/62.

Meria sa to na dvoch sadách. Na **čistých tvaroch** (glyf z písma, ktoré
predlohy nevideli) trafí 50/62 naprvýkrát. Dôležitejšia je ale sada
**nedbalého rukopisu**: ten istý znak skosený ako pri šikmom písme,
pretiahnutý, pootočený a roztrasený – teda tak, ako ho človek naozaj napíše.
Tam trafí **74 % naprvýkrát, 88 % do prvej trojice a 100 % do zoznamu ôsmich**.
Narovnávanie sklonu a naklonené predlohy na tejto sade pridali 4 body
naprvýkrát a 5 bodov do trojice; hrubšie rozmazanie na dvoch úrovniach naraz
som skúsil tiež, ale nedbalému pridalo bod a čistým zobralo tri, tak v kóde
nie je.

Slovenská diakritika v sade zámerne nie je – mäkčeň či dĺžeň robí z glyfu tvar
podobný „b" alebo „d" a vytláčal bežné písmená z ponuky; na klávesnici sa píše
bez problémov.

Úspešnosť merá `tests/recognizer.test.mjs`: predlohy postaví z pätkových písiem
a „kreslí" tvary z bezpätkového, ktoré predlohy nikdy nevideli. Na 40 bežných
symboloch trafí **35/40 naprvýkrát, 37/40 do prvej trojice a 39/40 do zoznamu**.
Zvyšné omyly sú väčšinou dvojice, ktoré aj človek rozlíši len podľa veľkosti
(`∑` vs `Σ`, `∏` vs `Π`) – v ponuke sú aj tak obe. Pri skutočnom rukopise navyše
pomáha to, že si appka tvoje ťahy pamätá.

## Testy

```bash
npm install        # playwright (prehliadač je v obraze predinštalovaný)
npm test
```

- `tests/recognizer.test.mjs` – presnosť rozpoznávania naprieč písmami.
- `tests/ui.test.mjs` – preklikanie appky v prehliadači: vykreslenie vzorcov,
  napovedanie po `\`, paleta, kreslenie symbolu myšou, pero, guma, uloženie
  a obnova po obnovení stránky. Priebežne ukladá snímky do `tests/screenshots/`.
- `tests/calc.test.mjs` – vyhodnocovač výrazov, beží priamo v Node.
- `tests/segmentation.test.mjs` – delenie ťahov na znaky, tiež priamo v Node.
- `tests/letters.test.mjs` – presnosť rozpoznávania písmen s linajkami aj bez nich.
- `npm run test:bundle` – to isté preklikanie, ale na zlepenom jednom súbore.

## Štruktúra

```
index.html            rozloženie stránky
css/style.css         vzhľad
js/symbols.js         databáza symbolov, šablón, vzorcov a makier
js/i18n.js            slovenčina a angličtina, register slov na dopĺňanie
js/calc.js            vyhodnocovanie výrazov (vlastný parser, žiadny eval)
js/letters.js         abeceda, delenie ťahov na znaky, odhad linajok
js/recognizer.js      rozpoznávanie nakreslených symbolov
js/app.js             plátno, bloky, paleta, napovedanie, ukladanie
vendor/katex/         KaTeX 0.16.11 (MIT), aby appka fungovala aj offline
tools/build-single.mjs zlepenie do jedného súboru
tests/                testy v prehliadači
```

## Licencia

MIT. KaTeX vo `vendor/` má vlastnú licenciu MIT (`vendor/katex/LICENSE`).
