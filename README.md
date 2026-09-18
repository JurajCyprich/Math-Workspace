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

**Písanie**
- Píšeš bežný zápis: `x^2 + 3x - 4 = 0`. Každý riadok bloku je samostatný riadok výpočtu.
- Riadok začínajúci `#` je obyčajný text – nadpis alebo poznámka.
- Blok sa dá prepnúť do textového režimu, kde je matematika medzi `$…$`.
- Sadzba je cez [KaTeX](https://katex.org/) (priložený v `vendor/`, funguje offline).

**Symboly, ktoré nie sú na klávesnici** – tri spôsoby:
1. **Nakresliť symbol** – nakreslíš znak myšou alebo prstom a appka ponúkne, čo to
   podľa nej je. Keď si zo zoznamu vyberieš, tvoj rukopis si **zapamätá**, takže
   nabudúce ten istý ťah trafí lepšie.
2. **Paleta** (`Ctrl+K`) – všetky symboly podľa kategórií, plus hotové vzorce
   z fyziky a matematiky a jednotky sústavy SI.
3. **Napovedanie** – napíšeš `\` a začneš písať názov; `\alp` → `\alpha`.
   Príkazy s argumentmi sa vložia aj so zátvorkami a kurzor skočí dovnútra.

**Skratky navyše**, aby sa fyzika písala kratšie:
`\dd` (diferenciál d), `\unit{m}`, `\dv{y}{x}`, `\pdv{f}{x}`, `\abs{x}`, `\norm{v}`,
`\grad`, `\divg`, `\curl`, `\ket{ψ}`, `\bra{ψ}`, `\braket{φ}{ψ}`, `\R \N \Z \Q \C`.

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

### Na internet cez GitHub Pages

Repozitár je statický web v koreňovom adresári, takže stačí v **Settings → Pages**
zvoliť *Deploy from a branch*, vetvu `main` a priečinok `/ (root)`. O pár minút
appka beží na `https://<meno>.github.io/Math-Workspace/`.

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
5. Vlastné predlohy, ktoré vzniknú tvojím výberom zo zoznamu, majú prednosť
   pred typografickými.

Postavenie predlôh trvá ~220 ms, jeden dopyt ~14 ms.

Úspešnosť merá `tests/recognizer.test.mjs`: predlohy postaví z pätkových písiem
a „kreslí" tvary z bezpätkového, ktoré predlohy nikdy nevideli. Na 40 bežných
symboloch trafí **33/40 na prvý pokus a 35/40 do prvej trojice**. Pri skutočnom
rukopise pomáha to, že si appka tvoje ťahy pamätá.

## Testy

```bash
npm install        # playwright (prehliadač je v obraze predinštalovaný)
npm test
```

- `tests/recognizer.test.mjs` – presnosť rozpoznávania naprieč písmami.
- `tests/ui.test.mjs` – preklikanie appky v prehliadači: vykreslenie vzorcov,
  napovedanie po `\`, paleta, kreslenie symbolu myšou, pero, guma, uloženie
  a obnova po obnovení stránky. Priebežne ukladá snímky do `tests/screenshots/`.
- `npm run test:bundle` – to isté preklikanie, ale na zlepenom jednom súbore.

## Štruktúra

```
index.html            rozloženie stránky
css/style.css         vzhľad
js/symbols.js         databáza symbolov, šablón, vzorcov a makier
js/recognizer.js      rozpoznávanie nakreslených symbolov
js/app.js             plátno, bloky, paleta, napovedanie, ukladanie
vendor/katex/         KaTeX 0.16.11 (MIT), aby appka fungovala aj offline
tools/build-single.mjs zlepenie do jedného súboru
tests/                testy v prehliadači
```

## Licencia

MIT. KaTeX vo `vendor/` má vlastnú licenciu MIT (`vendor/katex/LICENSE`).
