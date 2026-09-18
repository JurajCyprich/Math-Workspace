/* Databáza symbolov, šablón a fyzikálnych vzorcov. */
window.MW = window.MW || {};

(function () {
  'use strict';

  // [latex, znak, názov, kľúčové slová, kategória]
  var RAW = [
    // ── grécka abeceda ────────────────────────────────────────────────
    ['\\alpha', 'α', 'alfa', 'alfa alpha a', 'greek'],
    ['\\beta', 'β', 'beta', 'beta b', 'greek'],
    ['\\gamma', 'γ', 'gama', 'gama gamma g', 'greek'],
    ['\\delta', 'δ', 'delta', 'delta d', 'greek'],
    ['\\epsilon', 'ϵ', 'epsilon', 'epsilon e', 'greek'],
    ['\\varepsilon', 'ε', 'epsilon (varianta)', 'epsilon varepsilon permitivita', 'greek'],
    ['\\zeta', 'ζ', 'zéta', 'zeta', 'greek'],
    ['\\eta', 'η', 'éta', 'eta ucinnost', 'greek'],
    ['\\theta', 'θ', 'théta', 'theta uhol', 'greek'],
    ['\\vartheta', 'ϑ', 'théta (varianta)', 'theta vartheta', 'greek'],
    ['\\iota', 'ι', 'jóta', 'iota', 'greek'],
    ['\\kappa', 'κ', 'kapa', 'kappa', 'greek'],
    ['\\lambda', 'λ', 'lambda', 'lambda vlnova dlzka', 'greek'],
    ['\\mu', 'μ', 'mí', 'mu mikro trenie', 'greek'],
    ['\\nu', 'ν', 'ný', 'nu frekvencia', 'greek'],
    ['\\xi', 'ξ', 'ksí', 'xi ksi', 'greek'],
    ['\\pi', 'π', 'pí', 'pi ludolfovo', 'greek'],
    ['\\rho', 'ρ', 'ró', 'rho ro hustota', 'greek'],
    ['\\sigma', 'σ', 'sigma', 'sigma napatie vodivost', 'greek'],
    ['\\tau', 'τ', 'tau', 'tau perioda moment', 'greek'],
    ['\\upsilon', 'υ', 'ypsilon', 'upsilon', 'greek'],
    ['\\phi', 'ϕ', 'fí', 'phi fi tok', 'greek'],
    ['\\varphi', 'φ', 'fí (varianta)', 'phi varphi fi uhol', 'greek'],
    ['\\chi', 'χ', 'chí', 'chi', 'greek'],
    ['\\psi', 'ψ', 'psí', 'psi vlnova funkcia', 'greek'],
    ['\\omega', 'ω', 'omega', 'omega uhlova rychlost', 'greek'],
    ['\\Gamma', 'Γ', 'veľká gama', 'gamma velke', 'greek'],
    ['\\Delta', 'Δ', 'veľká delta', 'delta velke zmena rozdiel', 'greek'],
    ['\\Theta', 'Θ', 'veľká théta', 'theta velke', 'greek'],
    ['\\Lambda', 'Λ', 'veľká lambda', 'lambda velke', 'greek'],
    ['\\Xi', 'Ξ', 'veľké ksí', 'xi velke', 'greek'],
    ['\\Pi', 'Π', 'veľké pí', 'pi velke sucin', 'greek'],
    ['\\Sigma', 'Σ', 'veľká sigma', 'sigma velke suma', 'greek'],
    ['\\Phi', 'Φ', 'veľké fí', 'phi velke tok', 'greek'],
    ['\\Psi', 'Ψ', 'veľké psí', 'psi velke', 'greek'],
    ['\\Omega', 'Ω', 'veľká omega (ohm)', 'omega velke ohm odpor', 'greek'],

    // ── relácie ───────────────────────────────────────────────────────
    ['\\neq', '≠', 'nerovná sa', 'nerovna neq rozne', 'rel'],
    ['\\approx', '≈', 'približne rovné', 'priblizne approx asi', 'rel'],
    ['\\equiv', '≡', 'identicky rovné', 'equiv identicky kongruentne', 'rel'],
    ['\\sim', '∼', 'podobné', 'sim podobne tilda', 'rel'],
    ['\\simeq', '≃', 'približne / podobné', 'simeq', 'rel'],
    ['\\cong', '≅', 'zhodné', 'cong zhodne kongruentne', 'rel'],
    ['\\propto', '∝', 'je úmerné', 'propto umerne priama umera', 'rel'],
    ['\\leq', '≤', 'menšie alebo rovné', 'mensie rovne leq', 'rel'],
    ['\\geq', '≥', 'väčšie alebo rovné', 'vacsie rovne geq', 'rel'],
    ['\\ll', '≪', 'oveľa menšie', 'ovela mensie ll', 'rel'],
    ['\\gg', '≫', 'oveľa väčšie', 'ovela vacsie gg', 'rel'],
    ['\\doteq', '≐', 'približne rovné (bod)', 'doteq', 'rel'],
    ['\\parallel', '∥', 'rovnobežné', 'rovnobezne parallel', 'rel'],
    ['\\perp', '⊥', 'kolmé', 'kolme perp kolmica', 'rel'],
    ['\\angle', '∠', 'uhol', 'uhol angle', 'rel'],
    ['\\pm', '±', 'plus mínus', 'plus minus pm', 'rel'],
    ['\\mp', '∓', 'mínus plus', 'minus plus mp', 'rel'],

    // ── operátory ─────────────────────────────────────────────────────
    ['\\times', '×', 'krát (vektorový súčin)', 'krat times nasobenie vektorovy sucin', 'op'],
    ['\\div', '÷', 'delené', 'delene div delenie', 'op'],
    ['\\cdot', '⋅', 'krát (bodka)', 'krat bodka cdot skalarny sucin', 'op'],
    ['\\ast', '∗', 'hviezdička', 'hviezda ast konvolucia', 'op'],
    ['\\star', '⋆', 'hviezda', 'hviezda star', 'op'],
    ['\\circ', '∘', 'zložené zobrazenie', 'kruzok circ skladanie', 'op'],
    ['\\bullet', '∙', 'plná bodka', 'bodka bullet', 'op'],
    ['\\oplus', '⊕', 'plus v krúžku', 'oplus priama suma', 'op'],
    ['\\ominus', '⊖', 'mínus v krúžku', 'ominus', 'op'],
    ['\\otimes', '⊗', 'tenzorový súčin', 'otimes tenzor', 'op'],
    ['\\odot', '⊙', 'bodka v krúžku', 'odot', 'op'],
    ['\\cup', '∪', 'zjednotenie', 'zjednotenie cup union', 'op'],
    ['\\cap', '∩', 'prienik', 'prienik cap prienik mnozin', 'op'],
    ['\\setminus', '∖', 'rozdiel množín', 'rozdiel mnozin setminus', 'op'],
    ['\\sqrt{}', '√', 'odmocnina', 'odmocnina sqrt druha', 'op'],
    ['\\sum', '∑', 'suma', 'suma sum sigma sucet', 'op'],
    ['\\prod', '∏', 'súčin', 'sucin prod produkt', 'op'],
    ['\\int', '∫', 'integrál', 'integral int', 'op'],
    ['\\iint', '∬', 'dvojný integrál', 'dvojny integral iint', 'op'],
    ['\\oint', '∮', 'krivkový integrál', 'krivkovy integral oint uzavrety', 'op'],
    ['\\partial', '∂', 'parciálna derivácia', 'parcialna derivacia partial', 'op'],
    ['\\nabla', '∇', 'nabla (gradient)', 'nabla gradient del', 'op'],
    ['\\infty', '∞', 'nekonečno', 'nekonecno infty infinity', 'op'],
    ['^\\circ', '°', 'stupeň', 'stupen degree uhol', 'op'],
    ['\\%', '%', 'percento', 'percento percent', 'op'],

    // ── šípky ─────────────────────────────────────────────────────────
    ['\\to', '→', 'šípka doprava', 'sipka doprava to rightarrow limita', 'arrow'],
    ['\\gets', '←', 'šípka doľava', 'sipka dolava gets leftarrow', 'arrow'],
    ['\\leftrightarrow', '↔', 'obojsmerná šípka', 'obojsmerna sipka', 'arrow'],
    ['\\Rightarrow', '⇒', 'implikácia', 'implikacia vyplyva rightarrow dvojita', 'arrow'],
    ['\\Leftarrow', '⇐', 'spätná implikácia', 'implikacia dolava', 'arrow'],
    ['\\Leftrightarrow', '⇔', 'ekvivalencia', 'ekvivalencia prave vtedy iff', 'arrow'],
    ['\\mapsto', '↦', 'zobrazuje sa na', 'mapsto zobrazenie', 'arrow'],
    ['\\uparrow', '↑', 'šípka hore', 'sipka hore uparrow', 'arrow'],
    ['\\downarrow', '↓', 'šípka dole', 'sipka dole downarrow', 'arrow'],
    ['\\nearrow', '↗', 'šípka šikmo hore', 'sipka sikmo rastie', 'arrow'],
    ['\\searrow', '↘', 'šípka šikmo dole', 'sipka sikmo klesa', 'arrow'],

    // ── množiny a logika ──────────────────────────────────────────────
    ['\\in', '∈', 'patrí do', 'patri in element prvok', 'set'],
    ['\\notin', '∉', 'nepatrí do', 'nepatri notin', 'set'],
    ['\\ni', '∋', 'obsahuje prvok', 'ni obsahuje', 'set'],
    ['\\subset', '⊂', 'podmnožina', 'podmnozina subset', 'set'],
    ['\\subseteq', '⊆', 'podmnožina alebo rovná', 'podmnozina subseteq', 'set'],
    ['\\supset', '⊃', 'nadmnožina', 'nadmnozina supset', 'set'],
    ['\\supseteq', '⊇', 'nadmnožina alebo rovná', 'nadmnozina supseteq', 'set'],
    ['\\emptyset', '∅', 'prázdna množina', 'prazdna mnozina emptyset nula', 'set'],
    ['\\forall', '∀', 'pre každé', 'pre kazde forall vsetky', 'set'],
    ['\\exists', '∃', 'existuje', 'existuje exists', 'set'],
    ['\\nexists', '∄', 'neexistuje', 'neexistuje nexists', 'set'],
    ['\\neg', '¬', 'negácia', 'negacia neg not nie', 'set'],
    ['\\land', '∧', 'a zároveň (konjunkcia)', 'konjunkcia and land a zaroven', 'set'],
    ['\\lor', '∨', 'alebo (disjunkcia)', 'disjunkcia or lor alebo', 'set'],
    ['\\therefore', '∴', 'teda / preto', 'teda preto therefore', 'set'],
    ['\\because', '∵', 'pretože', 'pretoze because', 'set'],
    ['\\mathbb{R}', 'ℝ', 'reálne čísla', 'realne cisla R', 'set'],
    ['\\mathbb{N}', 'ℕ', 'prirodzené čísla', 'prirodzene cisla N', 'set'],
    ['\\mathbb{Z}', 'ℤ', 'celé čísla', 'cele cisla Z', 'set'],
    ['\\mathbb{Q}', 'ℚ', 'racionálne čísla', 'racionalne cisla Q', 'set'],
    ['\\mathbb{C}', 'ℂ', 'komplexné čísla', 'komplexne cisla C', 'set'],
    ['\\aleph', 'ℵ', 'alef', 'alef aleph mohutnost', 'set'],

    // ── ostatné ───────────────────────────────────────────────────────
    ['\\ldots', '…', 'tri bodky', 'tri bodky ldots vypustka', 'misc'],
    ['\\cdots', '⋯', 'bodky v strede', 'cdots bodky', 'misc'],
    ['\\vdots', '⋮', 'zvislé bodky', 'vdots zvisle bodky', 'misc'],
    ['\\ddots', '⋱', 'šikmé bodky', 'ddots diagonalne bodky', 'misc'],
    ['\\dagger', '†', 'krížik (adjungovanie)', 'dagger krizik hermitovsky', 'misc'],
    ['\\prime', '′', 'čiarka (derivácia)', 'prime ciarka derivacia', 'misc'],
    ['\\hbar', 'ℏ', 'redukovaná Planckova konštanta', 'hbar planck kvantova', 'misc'],
    ['\\ell', 'ℓ', 'malé l', 'ell dlzka l', 'misc'],
    ['\\Re', 'ℜ', 'reálna časť', 'realna cast Re', 'misc'],
    ['\\Im', 'ℑ', 'imaginárna časť', 'imaginarna cast Im', 'misc'],
    ['\\triangle', '△', 'trojuholník', 'trojuholnik triangle', 'misc'],
    ['\\square', '□', 'štvorec', 'stvorec square', 'misc'],
    ['\\diamond', '◇', 'kosoštvorec', 'kosostvorec diamond', 'misc'],
    ['\\bigcirc', '◯', 'kružnica', 'kruznica kruh circle', 'misc'],
    ['\\checkmark', '✓', 'fajka', 'fajka ok spravne check', 'misc'],
    ['\\top', '⊤', 'pravda', 'top pravda', 'misc'],
    ['\\vdash', '⊢', 'dokazuje', 'vdash odvodi', 'misc'],
    ['\\lceil', '⌈', 'horná celá časť (ľavá)', 'ceil horna cela', 'misc'],
    ['\\rceil', '⌉', 'horná celá časť (pravá)', 'ceil horna cela', 'misc'],
    ['\\lfloor', '⌊', 'dolná celá časť (ľavá)', 'floor dolna cela', 'misc'],
    ['\\rfloor', '⌋', 'dolná celá časť (pravá)', 'floor dolna cela', 'misc'],
    ['\\langle', '⟨', 'ľavá lomená zátvorka', 'langle bra zatvorka', 'misc'],
    ['\\rangle', '⟩', 'pravá lomená zátvorka', 'rangle ket zatvorka', 'misc']
  ];

  MW.SYMBOLS = RAW.map(function (r, i) {
    return { id: i, tex: r[0], ch: r[1], name: r[2], kw: r[3], cat: r[4] };
  });

  MW.CATEGORIES = [
    { id: 'greek', label: 'Grécke písmená' },
    { id: 'rel', label: 'Relácie' },
    { id: 'op', label: 'Operátory' },
    { id: 'arrow', label: 'Šípky' },
    { id: 'set', label: 'Množiny a logika' },
    { id: 'misc', label: 'Ostatné' }
  ];

  // Šablóny – vkladajú sa ako celok, ⟦⟧ označuje kam skočí kurzor.
  MW.SNIPPETS = [
    {
      label: 'Matematika', items: [
        ['Zlomok', '\\frac{⟦⟧}{}'],
        ['Odmocnina', '\\sqrt{⟦⟧}'],
        ['n-tá odmocnina', '\\sqrt[⟦⟧]{}'],
        ['Mocnina', '⟦⟧^{2}'],
        ['Index', '⟦⟧_{i}'],
        ['Suma', '\\sum_{i=1}^{n} ⟦⟧'],
        ['Súčin', '\\prod_{i=1}^{n} ⟦⟧'],
        ['Integrál', '\\int_{a}^{b} ⟦⟧ \\dd x'],
        ['Neurčitý integrál', '\\int ⟦⟧ \\dd x'],
        ['Limita', '\\lim_{x \\to ⟦⟧} '],
        ['Derivácia', '\\dv{y}{x}'],
        ['Parciálna derivácia', '\\pdv{f}{x}'],
        ['Absolútna hodnota', '\\abs{⟦⟧}'],
        ['Kombinačné číslo', '\\binom{n}{k}'],
        ['Matica 2×2', '\\begin{pmatrix} ⟦⟧ & \\\\ & \\end{pmatrix}'],
        ['Matica 3×3', '\\begin{pmatrix} ⟦⟧ & & \\\\ & & \\\\ & & \\end{pmatrix}'],
        ['Determinant', '\\begin{vmatrix} ⟦⟧ & \\\\ & \\end{vmatrix}'],
        ['Sústava rovníc', '\\begin{cases} ⟦⟧ \\\\ \\end{cases}'],
        ['Zarovnané riadky', '\\begin{aligned} ⟦⟧ &= \\\\ &= \\end{aligned}'],
        ['Vektor so šípkou', '\\vec{⟦⟧}'],
        ['Text vo vzorci', '\\text{⟦⟧}'],
        ['Veľké zátvorky', '\\left( ⟦⟧ \\right)']
      ]
    },
    {
      label: 'Fyzika – vzorce', items: [
        ['Rýchlosť', 'v = \\frac{s}{t}'],
        ['Zrýchlenie', 'a = \\frac{\\Delta v}{\\Delta t}'],
        ['Rovnomerne zrýchlený pohyb', 's = v_0 t + \\tfrac{1}{2} a t^2'],
        ['Okamžitá rýchlosť', 'v = v_0 + a t'],
        ['Newtonov zákon sily', 'F = m a'],
        ['Hybnosť', 'p = m v'],
        ['Práca', 'W = F s \\cos\\alpha'],
        ['Výkon', 'P = \\frac{W}{t}'],
        ['Kinetická energia', 'E_k = \\tfrac{1}{2} m v^2'],
        ['Potenciálna energia', 'E_p = m g h'],
        ['Gravitačná sila', 'F = \\kappa \\frac{m_1 m_2}{r^2}'],
        ['Dostredivé zrýchlenie', 'a_d = \\frac{v^2}{r}'],
        ['Uhlová rýchlosť', '\\omega = \\frac{2\\pi}{T}'],
        ['Hustota', '\\rho = \\frac{m}{V}'],
        ['Tlak', 'p = \\frac{F}{S}'],
        ['Hydrostatický tlak', 'p = h \\rho g'],
        ['Stavová rovnica plynu', 'p V = n R T'],
        ['Ohmov zákon', 'U = R I'],
        ['Elektrický výkon', 'P = U I'],
        ['Coulombov zákon', 'F = \\frac{1}{4\\pi\\varepsilon_0} \\frac{q_1 q_2}{r^2}'],
        ['Vlnová dĺžka', 'c = \\lambda f'],
        ['Energia fotónu', 'E = h f'],
        ['Einsteinov vzťah', 'E = m c^2'],
        ['Kyvadlo', 'T = 2\\pi \\sqrt{\\frac{\\ell}{g}}']
      ]
    },
    {
      label: 'Matematika – vzorce', items: [
        ['Kvadratická rovnica', 'x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'],
        ['Diskriminant', 'D = b^2 - 4ac'],
        ['Pytagorova veta', 'c^2 = a^2 + b^2'],
        ['Goniometrická jednotka', '\\sin^2\\alpha + \\cos^2\\alpha = 1'],
        ['Sínusová veta', '\\frac{a}{\\sin\\alpha} = \\frac{b}{\\sin\\beta} = \\frac{c}{\\sin\\gamma}'],
        ['Kosínusová veta', 'c^2 = a^2 + b^2 - 2ab\\cos\\gamma'],
        ['Obsah kruhu', 'S = \\pi r^2'],
        ['Objem gule', 'V = \\tfrac{4}{3}\\pi r^3'],
        ['Aritmetická postupnosť', 'a_n = a_1 + (n-1)d'],
        ['Geometrická postupnosť', 'a_n = a_1 q^{n-1}'],
        ['Logaritmus', '\\log_a x = \\frac{\\ln x}{\\ln a}'],
        ['Derivácia mocniny', "(x^n)' = n x^{n-1}"],
        ['Eulerova rovnosť', 'e^{i\\pi} + 1 = 0']
      ]
    },
    {
      label: 'Jednotky', items: [
        ['meter', '\\unit{m}'],
        ['sekunda', '\\unit{s}'],
        ['kilogram', '\\unit{kg}'],
        ['m/s', '\\unit{m\\cdot s^{-1}}'],
        ['m/s²', '\\unit{m\\cdot s^{-2}}'],
        ['newton', '\\unit{N}'],
        ['joule', '\\unit{J}'],
        ['watt', '\\unit{W}'],
        ['pascal', '\\unit{Pa}'],
        ['hertz', '\\unit{Hz}'],
        ['volt', '\\unit{V}'],
        ['ampér', '\\unit{A}'],
        ['ohm', '\\,\\Omega'],
        ['coulomb', '\\unit{C}'],
        ['kelvin', '\\unit{K}'],
        ['stupeň Celzia', '{}^\\circ\\mathrm{C}'],
        ['mol', '\\unit{mol}'],
        ['tesla', '\\unit{T}'],
        ['elektrónvolt', '\\unit{eV}']
      ]
    },
    {
      label: 'Fyzika – zápis', items: [
        ['Vektor', '\\vec{F}'],
        ['Jednotkový vektor', '\\hat{n}'],
        ['Priemer', '\\bar{x}'],
        ['Derivácia podľa času', '\\dot{x}'],
        ['Druhá derivácia podľa času', '\\ddot{x}'],
        ['Gradient', '\\grad ⟦⟧'],
        ['Divergencia', '\\divg \\vec{E}'],
        ['Rotácia', '\\curl \\vec{B}'],
        ['Ket', '\\ket{\\psi}'],
        ['Bra', '\\bra{\\psi}'],
        ['Braket', '\\braket{\\phi}{\\psi}'],
        ['Diferenciál d', '\\dd x'],
        ['Zmena veličiny', '\\Delta ⟦⟧']
      ]
    }
  ];

  // Vlastné makrá pre KaTeX – skratky, ktoré sa v bežnom LaTeXu píšu zdĺhavo.
  MW.MACROS = {
    '\\dd': '\\,\\mathrm{d}',
    '\\unit': '\\,\\mathrm{#1}',
    '\\abs': '\\left|#1\\right|',
    '\\norm': '\\left\\|#1\\right\\|',
    '\\dv': '\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}',
    '\\pdv': '\\frac{\\partial #1}{\\partial #2}',
    '\\grad': '\\nabla',
    '\\divg': '\\nabla\\cdot',
    '\\curl': '\\nabla\\times',
    '\\ket': '\\left|#1\\right\\rangle',
    '\\bra': '\\left\\langle#1\\right|',
    '\\braket': '\\left\\langle#1\\middle|#2\\right\\rangle',
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}'
  };

  // Autocomplete ponúka aj makrá a bežné príkazy, ktoré nemajú vlastný znak.
  MW.COMMANDS = MW.SYMBOLS.filter(function (s) {
    return /^\\[a-zA-Z]+$/.test(s.tex);
  }).map(function (s) {
    return { tex: s.tex, name: s.name, kw: s.kw, ch: s.ch };
  }).concat([
    { tex: '\\frac', name: 'zlomok', kw: 'zlomok frac delenie', ch: '' },
    { tex: '\\tfrac', name: 'malý zlomok', kw: 'zlomok tfrac', ch: '' },
    { tex: '\\sqrt', name: 'odmocnina', kw: 'odmocnina sqrt', ch: '√' },
    { tex: '\\lim', name: 'limita', kw: 'limita lim', ch: '' },
    { tex: '\\log', name: 'logaritmus', kw: 'logaritmus log', ch: '' },
    { tex: '\\ln', name: 'prirodzený logaritmus', kw: 'logaritmus ln', ch: '' },
    { tex: '\\sin', name: 'sínus', kw: 'sinus sin', ch: '' },
    { tex: '\\cos', name: 'kosínus', kw: 'kosinus cos', ch: '' },
    { tex: '\\tan', name: 'tangens', kw: 'tangens tan tg', ch: '' },
    { tex: '\\cot', name: 'kotangens', kw: 'kotangens cot cotg', ch: '' },
    { tex: '\\arcsin', name: 'arkussínus', kw: 'arcsin', ch: '' },
    { tex: '\\arccos', name: 'arkuskosínus', kw: 'arccos', ch: '' },
    { tex: '\\arctan', name: 'arkustangens', kw: 'arctan', ch: '' },
    { tex: '\\exp', name: 'exponenciála', kw: 'exp e', ch: '' },
    { tex: '\\vec', name: 'vektor so šípkou', kw: 'vektor vec sipka', ch: '' },
    { tex: '\\hat', name: 'strieška', kw: 'hat strieska jednotkovy', ch: '' },
    { tex: '\\bar', name: 'pruh (priemer)', kw: 'bar pruh priemer', ch: '' },
    { tex: '\\dot', name: 'bodka (derivácia)', kw: 'dot bodka derivacia', ch: '' },
    { tex: '\\ddot', name: 'dve bodky', kw: 'ddot dve bodky', ch: '' },
    { tex: '\\overline', name: 'čiara nad', kw: 'overline ciara nad', ch: '' },
    { tex: '\\underline', name: 'čiara pod', kw: 'underline ciara pod', ch: '' },
    { tex: '\\overrightarrow', name: 'šípka nad (vektor AB)', kw: 'overrightarrow vektor AB', ch: '' },
    { tex: '\\text', name: 'bežný text', kw: 'text slovo', ch: '' },
    { tex: '\\mathrm', name: 'vzpriamené písmo', kw: 'mathrm rovne pismo', ch: '' },
    { tex: '\\mathbb', name: 'dvojité písmo', kw: 'mathbb mnozina', ch: '' },
    { tex: '\\left', name: 'roztiahnuteľná zátvorka', kw: 'left zatvorka', ch: '' },
    { tex: '\\right', name: 'roztiahnuteľná zátvorka', kw: 'right zatvorka', ch: '' },
    { tex: '\\begin', name: 'začiatok prostredia', kw: 'begin matica cases', ch: '' },
    { tex: '\\end', name: 'koniec prostredia', kw: 'end', ch: '' },
    { tex: '\\dd', name: 'diferenciál d', kw: 'dd diferencial integral', ch: 'd' },
    { tex: '\\unit', name: 'jednotka', kw: 'unit jednotka', ch: '' },
    { tex: '\\abs', name: 'absolútna hodnota', kw: 'abs absolutna hodnota', ch: '' },
    { tex: '\\dv', name: 'derivácia dy/dx', kw: 'dv derivacia', ch: '' },
    { tex: '\\pdv', name: 'parciálna derivácia', kw: 'pdv parcialna', ch: '' },
    { tex: '\\ket', name: 'ket |ψ⟩', kw: 'ket kvantova', ch: '' },
    { tex: '\\bra', name: 'bra ⟨ψ|', kw: 'bra kvantova', ch: '' }
  ]);
})();
