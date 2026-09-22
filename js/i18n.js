/* Slovenčina a angličtina. Slovenčina je pôvodina, angličtina sa dopĺňa;
 * čo nie je preložené, zostane po slovensky namiesto toho, aby zmizlo. */
window.MW = window.MW || {};

(function () {
  'use strict';

  var LANG_KEY = 'mw:lang';

  var UI = {
    'tool.select': ['Výber', 'Select'],
    'tool.select.t': ['Výber a posun (V)', 'Select and pan (V)'],
    'tool.text': ['Písať', 'Write'],
    'tool.text.t': ['Nový blok (T)', 'New block (T)'],
    'tool.pen': ['Pero', 'Pen'],
    'tool.pen.t': ['Kreslenie (P)', 'Freehand drawing (P)'],
    'tool.eraser': ['Guma', 'Eraser'],
    'tool.eraser.t': ['Guma (E)', 'Eraser (E)'],

    'btn.draw': ['Nakresliť', 'Draw'],
    'btn.draw.t': ['Nakresli symbol myšou (Ctrl+D)', 'Draw a symbol with the mouse (Ctrl+D)'],
    'btn.palette': ['Symboly', 'Symbols'],
    'btn.palette.t': ['Paleta symbolov a vzorcov (Ctrl+K)', 'Symbol and formula palette (Ctrl+K)'],
    'btn.undo.t': ['Späť (Ctrl+Z)', 'Undo (Ctrl+Z)'],
    'btn.redo.t': ['Dopredu (Ctrl+Shift+Z)', 'Redo (Ctrl+Shift+Z)'],
    'btn.zoomOut.t': ['Oddialiť', 'Zoom out'],
    'btn.zoomReset.t': ['Pôvodná veľkosť', 'Reset zoom'],
    'btn.zoomIn.t': ['Priblížiť', 'Zoom in'],
    'btn.export': ['Uložiť', 'Save'],
    'btn.export.t': ['Uložiť do súboru', 'Save to a file'],
    'btn.import': ['Načítať', 'Load'],
    'btn.import.t': ['Načítať zo súboru', 'Load from a file'],
    'btn.clear': ['Vyčistiť', 'Clear'],
    'btn.clear.t': ['Vyprázdniť plochu', 'Empty the canvas'],
    'btn.feedback.t': ['Napíš, čo ti chýba', 'Tell us what is missing'],
    'btn.help.t': ['Nápoveda', 'Help'],
    'btn.lang.t': ['Jazyk / Language', 'Language / Jazyk'],

    'hint': ['Dvojklik kamkoľvek = nový blok · ťahaj myšou = posun plochy · Ctrl + koliesko = priblíženie',
      'Double-click anywhere = new block · drag = pan the canvas · Ctrl + wheel = zoom'],

    'block.empty': ['prázdny blok – klikni a píš', 'empty block – click and type'],
    'block.mode.t': ['Prepnúť: celý blok ako vzorec / text', 'Switch: whole block as formula / text'],
    'block.dup.t': ['Duplikovať', 'Duplicate'],
    'block.del.t': ['Zmazať blok', 'Delete block'],

    'palette.title': ['Symboly a vzorce', 'Symbols and formulas'],
    'palette.search': ['Hľadaj: suma, integrál, alfa, ohm…', 'Search: sum, integral, alpha, ohm…'],
    'palette.symbols': ['Symboly', 'Symbols'],
    'palette.formulas': ['Vzorce a šablóny', 'Formulas and templates'],
    'palette.none': ['Nič sa nenašlo', 'Nothing found'],

    'draw.title': ['Nakresli symbol', 'Draw a symbol'],
    'draw.note': ['Nakresli znak myšou alebo prstom. Viac ťahov je v poriadku.',
      'Draw the character with the mouse or your finger. Several strokes are fine.'],
    'draw.clear': ['Vymazať', 'Clear'],
    'draw.undo': ['Späť', 'Undo'],
    'draw.search': ['Nenašlo to? Hľadaj podľa názvu…', 'Not found? Search by name…'],
    'draw.preparing': ['pripravujem predlohy…', 'preparing templates…'],
    'draw.ready': ['{n} symbolov pripravených', '{n} symbols ready'],
    'draw.nothing': ['Nič podobné. Skús to nakresliť väčšie.', 'Nothing similar. Try drawing it larger.'],
    'draw.strokes1': ['{n} ťah', '{n} stroke'],
    'draw.strokes': ['{n} ťahy', '{n} strokes'],

    'ac.tab': ['Tab doplní symbol', 'Tab inserts the symbol'],

    'btn.note.t': ['Poznámky z rukopisu (Ctrl+H)', 'Notes from handwriting (Ctrl+H)'],
    'btn.note': ['Poznámky', 'Notes'],
    'note.title': ['Poznámky', 'Notes'],
    'note.note': ['Vezmi pero a píš rukou priamo na plochu – každé písmeno sa hneď prepíše sem.',
      'Grab the pen and write by hand straight on the canvas – every letter lands here at once.'],
    'note.rec': ['Zapisovať rukopis', 'Transcribe handwriting'],
    'note.rec.t': ['Prepisovať ťahy perom na text', 'Turn pen strokes into text'],
    'note.load': ['Načítať .txt', 'Load .txt'],
    'note.alts': ['Netrafilo? Vyber správny znak – appka si ho zapamätá:',
      'Wrong? Pick the right character – the app will remember it:'],
    'note.ph': ['Tu sa objaví prepísaný text. Dá sa tu aj normálne písať a opravovať.',
      'The converted text appears here. You can also type and fix it directly.'],
    'note.save': ['Uložiť ako .txt', 'Save as .txt'],
    'note.copy': ['Kopírovať', 'Copy'],
    'note.toBoard': ['Vložiť do plochy', 'Insert into the canvas'],
    'note.clearText': ['Vyprázdniť', 'Empty'],
    'note.read': ['prepísaných znakov: {n}', 'characters transcribed: {n}'],
    'note.preparing': ['pripravujem písmená…', 'preparing letters…'],
    'note.ready': ['{n} znakov pripravených', '{n} characters ready'],
    'note.nothing': ['Tento ťah som neprečítal.', 'That stroke could not be read.'],
    'note.off': ['Prepis je vypnutý – zapni ho tlačidlom vyššie.',
      'Transcribing is off – switch it on with the button above.'],
    'toast.noteLoaded': ['Poznámky načítané zo súboru', 'Notes loaded from a file'],
    'note.confirmClear': ['Naozaj vyprázdniť poznámky?', 'Really empty the notes?'],
    'toast.noteSaved': ['Poznámky uložené do súboru', 'Notes saved to a file'],
    'toast.noteLearned': ['Opravené · rukopis zapamätaný', 'Corrected · handwriting remembered'],

    'btn.calc.t': ['Kalkulačka (Ctrl+E)', 'Calculator (Ctrl+E)'],
    'btn.calc': ['Kalkulačka', 'Calculator'],
    'calc.title': ['Kalkulačka', 'Calculator'],
    'calc.note': ['Píš to ako do vzorca – zlomky, odmocniny, π aj uhly v stupňoch. Rovnicu o jednej neznámej rovno vyrieši.',
      'Type it the way you write a formula – fractions, roots, π and angles in degrees. An equation with one unknown is solved right away.'],
    'calc.ph': ['napr. \\frac{5+1}{4}', 'e.g. \\frac{5+1}{4}'],
    'calc.insert': ['Vložiť do plochy', 'Insert into the canvas'],
    'calc.history': ['História', 'History'],
    'calc.clearHistory': ['Vymazať históriu', 'Clear history'],
    'calc.bad': ['Toto sa vyčísliť nedá', 'This cannot be evaluated'],
    'calc.empty': ['Najprv napíš výraz.', 'Write an expression first.'],
    'calc.line.t': ['Dopočítať výsledok', 'Work out the result'],
    'calc.solve.t': ['Vyriešiť rovnicu', 'Solve the equation'],
    'toast.calc': ['Výsledok dopísaný', 'Result added'],
    'toast.solved': ['Riešenie dopísané', 'Solution added'],

    'toast.inserted': ['Vložené', 'Inserted'],
    'toast.learned': ['Vložené · rukopis zapamätaný', 'Inserted · handwriting remembered'],
    'toast.saved': ['Uložené do súboru', 'Saved to a file'],
    'toast.loaded': ['Načítané', 'Loaded'],
    'toast.badFile': ['Súbor sa nepodarilo prečítať', 'Could not read the file'],
    'toast.cleared': ['Plocha vyprázdnená · Ctrl+Z to vráti', 'Canvas emptied · Ctrl+Z brings it back'],
    'toast.copied': ['Skopírované do schránky', 'Copied to the clipboard'],
    'confirm.clear': ['Naozaj vyprázdniť celú plochu?', 'Really empty the whole canvas?'],

    'fb.title': ['Povedz, čo ti chýba', 'Tell us what is missing'],
    'fb.note': ['Ako sa ti s tým pracuje? Čo by pomohlo?',
      'How is it working for you? What would help?'],
    'fb.rating': ['Hodnotenie', 'Rating'],
    'fb.stars': ['{n} z 5', '{n} out of 5'],
    'fb.placeholder': ['Napr.: chýba mi tabuľka derivácií, alebo kreslenie mi nepozná ∂…',
      'For example: a table of derivatives is missing, or drawing does not recognise ∂…'],
    'fb.send': ['Odoslať cez GitHub', 'Send via GitHub'],
    'fb.copy': ['Skopírovať text', 'Copy the text'],
    'fb.how': ['Odoslanie otvorí nové okno s predvyplnenou stránkou na GitHube – treba tam účet. Bez účtu si text skopíruj a pošli, ako ti vyhovuje.',
      'Sending opens a prefilled page on GitHub in a new tab – an account is needed there. Without one, copy the text and send it however suits you.'],
    'fb.empty': ['Najprv napíš pár slov.', 'Write a few words first.'],

    'help.title': ['Ako to funguje', 'How it works'],
    'help.canvas': ['Plocha', 'Canvas'],
    'help.canvas.1': ['<b>Dvojklik</b> na prázdne miesto – nový blok', '<b>Double-click</b> empty space – new block'],
    'help.canvas.2': ['<b>Ťahanie</b> prázdnej plochy – posun', '<b>Drag</b> empty space – pan'],
    'help.canvas.3': ['<b>Ctrl + koliesko</b> – priblíženie', '<b>Ctrl + wheel</b> – zoom'],
    'help.canvas.4': ['<b>Medzerník + ťahanie</b> – posun kedykoľvek', '<b>Space + drag</b> – pan any time'],
    'help.canvas.5': ['Blok sa ťahá za horný pásik, <b>×</b> ho zmaže', 'Drag a block by its top bar, <b>×</b> deletes it'],

    'help.writing': ['Písanie', 'Writing'],
    'help.writing.1': ['Píš bežne: <code>x^2 + 3x - 4 = 0</code>', 'Type normally: <code>x^2 + 3x - 4 = 0</code>'],
    'help.writing.2': ['Každý riadok bloku je samostatný riadok výpočtu', 'Each line of a block is its own line of working'],
    'help.writing.3': ['Riadok začínajúci <code>#</code> je obyčajný text (nadpis, poznámka)',
      'A line starting with <code>#</code> is plain text (heading, note)'],
    'help.writing.4': ['V textovom režime je matematika medzi <code>$…$</code>',
      'In text mode, maths goes between <code>$…$</code>'],
    'help.writing.5': ['Napíš <code>odmocnina</code>, <code>zlomok</code>, <code>integral</code>… a stlač <code>Tab</code> – slovo sa zmení na symbol',
      'Type <code>root</code>, <code>fraction</code>, <code>integral</code>… and press <code>Tab</code> – the word becomes the symbol'],
    'help.writing.6': ['Alebo napíš <code>\\</code> a začni písať názov príkazu',
      'Or type <code>\\</code> and start typing a command name'],
    'help.writing.7': ['Odmocnina so stupňom: <code>\\sqrt[3]{8}</code> dá ∛8',
      'Root with a degree: <code>\\sqrt[3]{8}</code> gives ∛8'],
    'help.writing.8': ['Pri riadku, ktorý sa dá vyčísliť, sa vpravo ukáže <b>=</b> – klikni a výsledok sa dopíše',
      'A line that can be worked out shows <b>=</b> on the right – click it and the result is added'],
    'help.writing.9': ['Rovnicu s jednou neznámou vyrieši <b>x=</b> – riešenie pribudne pod ňu',
      'An equation with one unknown is solved by <b>x=</b> – the solution appears below it'],

    'help.symbols': ['Symboly, ktoré nie sú na klávesnici', 'Symbols that are not on the keyboard'],
    'help.symbols.1': ['<b>Nakresliť symbol</b> – nakresli ho myšou, appka ponúkne zhody',
      '<b>Draw a symbol</b> – draw it with the mouse and the app offers matches'],
    'help.symbols.2': ['Keď si vyberieš zo zoznamu, appka si tvoj rukopis <b>zapamätá</b>',
      'When you pick from the list, the app <b>remembers</b> your handwriting'],
    'help.symbols.3': ['<b>Symboly</b> – paleta so všetkým, aj hotové vzorce z fyziky',
      '<b>Symbols</b> – a palette with everything, including ready-made physics formulas'],
    'help.symbols.4': ['<b>Poznámky</b> – píš perom na plochu a písmená sa priebežne prepisujú na text',
      '<b>Notes</b> – write on the canvas with the pen and letters are transcribed as you go'],

    'help.keys': ['Skratky', 'Shortcuts'],
    'help.keys.1': ['<code>V</code> výber, <code>T</code> písanie, <code>P</code> pero, <code>E</code> guma',
      '<code>V</code> select, <code>T</code> write, <code>P</code> pen, <code>E</code> eraser'],
    'help.keys.2': ['<code>Ctrl+Z</code> späť, <code>Ctrl+Shift+Z</code> dopredu',
      '<code>Ctrl+Z</code> undo, <code>Ctrl+Shift+Z</code> redo'],
    'help.keys.3': ['<code>Ctrl+D</code> kreslenie symbolu', '<code>Ctrl+D</code> draw a symbol'],
    'help.keys.4': ['<code>Ctrl+K</code> paleta symbolov', '<code>Ctrl+K</code> symbol palette'],
    'help.keys.5': ['<code>Ctrl+E</code> kalkulačka, <code>Ctrl+H</code> poznámky',
      '<code>Ctrl+E</code> calculator, <code>Ctrl+H</code> notes'],
    'help.keys.6': ['<code>Esc</code> zavrie panely', '<code>Esc</code> closes panels'],

    'help.foot': ['Všetko sa priebežne ukladá do tohto prehliadača. Tlačidlom <b>Uložiť</b> si plochu stiahneš ako súbor.',
      'Everything is saved into this browser as you go. The <b>Save</b> button downloads the canvas as a file.'],

    'cat.greek': ['Grécke písmená', 'Greek letters'],
    'cat.rel': ['Relácie', 'Relations'],
    'cat.op': ['Operátory', 'Operators'],
    'cat.arrow': ['Šípky', 'Arrows'],
    'cat.set': ['Množiny a logika', 'Sets and logic'],
    'cat.misc': ['Ostatné', 'Other'],

    'grp.Matematika': ['Matematika', 'Mathematics'],
    'grp.Fyzika – vzorce': ['Fyzika – vzorce', 'Physics – formulas'],
    'grp.Matematika – vzorce': ['Matematika – vzorce', 'Mathematics – formulas'],
    'grp.Jednotky': ['Jednotky', 'Units'],
    'grp.Fyzika – zápis': ['Fyzika – zápis', 'Physics – notation']
  };

  // Anglické názvy symbolov: tex -> [názov, kľúčové slová]
  var EN_SYM = {
    '\\alpha': ['alpha', 'alpha a'], '\\beta': ['beta', 'beta b'],
    '\\gamma': ['gamma', 'gamma g'], '\\delta': ['delta', 'delta d'],
    '\\epsilon': ['epsilon', 'epsilon e'],
    '\\varepsilon': ['epsilon (variant)', 'epsilon varepsilon permittivity'],
    '\\zeta': ['zeta', 'zeta'], '\\eta': ['eta', 'eta efficiency'],
    '\\theta': ['theta', 'theta angle'], '\\vartheta': ['theta (variant)', 'theta vartheta'],
    '\\iota': ['iota', 'iota'], '\\kappa': ['kappa', 'kappa'],
    '\\lambda': ['lambda', 'lambda wavelength'], '\\mu': ['mu', 'mu micro friction'],
    '\\nu': ['nu', 'nu frequency'], '\\xi': ['xi', 'xi'], '\\pi': ['pi', 'pi'],
    '\\rho': ['rho', 'rho density'], '\\sigma': ['sigma', 'sigma stress conductivity'],
    '\\tau': ['tau', 'tau period torque'], '\\upsilon': ['upsilon', 'upsilon'],
    '\\phi': ['phi', 'phi flux'], '\\varphi': ['phi (variant)', 'phi varphi angle'],
    '\\chi': ['chi', 'chi'], '\\psi': ['psi', 'psi wave function'],
    '\\omega': ['omega', 'omega angular velocity'],
    '\\Gamma': ['capital gamma', 'gamma capital'],
    '\\Delta': ['capital delta', 'delta capital change difference'],
    '\\Theta': ['capital theta', 'theta capital'],
    '\\Lambda': ['capital lambda', 'lambda capital'],
    '\\Xi': ['capital xi', 'xi capital'],
    '\\Pi': ['capital pi', 'pi capital product'],
    '\\Sigma': ['capital sigma', 'sigma capital sum'],
    '\\Phi': ['capital phi', 'phi capital flux'],
    '\\Psi': ['capital psi', 'psi capital'],
    '\\Omega': ['capital omega (ohm)', 'omega capital ohm resistance'],

    '\\neq': ['not equal to', 'not equal neq different'],
    '\\approx': ['approximately equal', 'approximately approx about'],
    '\\equiv': ['identical to', 'equiv identical congruent'],
    '\\sim': ['similar to', 'sim similar tilde'],
    '\\simeq': ['approximately similar', 'simeq'],
    '\\cong': ['congruent to', 'cong congruent'],
    '\\propto': ['proportional to', 'propto proportional'],
    '\\leq': ['less than or equal', 'less equal leq'],
    '\\geq': ['greater than or equal', 'greater equal geq'],
    '\\ll': ['much less than', 'much less ll'],
    '\\gg': ['much greater than', 'much greater gg'],
    '\\doteq': ['approximately equal (dot)', 'doteq'],
    '\\parallel': ['parallel to', 'parallel'],
    '\\perp': ['perpendicular to', 'perpendicular perp'],
    '\\angle': ['angle', 'angle'],
    '\\pm': ['plus minus', 'plus minus pm'],
    '\\mp': ['minus plus', 'minus plus mp'],

    '\\times': ['times (cross product)', 'times multiply cross product'],
    '\\div': ['divided by', 'divide div division'],
    '\\cdot': ['dot (scalar product)', 'times dot cdot scalar product'],
    '\\ast': ['asterisk', 'asterisk ast convolution'],
    '\\star': ['star', 'star'],
    '\\circ': ['composition', 'circle circ compose'],
    '\\bullet': ['bullet', 'dot bullet'],
    '\\oplus': ['circled plus', 'oplus direct sum'],
    '\\ominus': ['circled minus', 'ominus'],
    '\\otimes': ['tensor product', 'otimes tensor'],
    '\\odot': ['circled dot', 'odot'],
    '\\cup': ['union', 'union cup'],
    '\\cap': ['intersection', 'intersection cap'],
    '\\setminus': ['set difference', 'set difference setminus'],
    '\\sqrt{}': ['square root', 'square root sqrt radical'],
    '\\sum': ['sum', 'sum sigma total'],
    '\\prod': ['product', 'product prod'],
    '\\int': ['integral', 'integral int'],
    '\\iint': ['double integral', 'double integral iint'],
    '\\oint': ['contour integral', 'contour integral oint closed'],
    '\\partial': ['partial derivative', 'partial derivative'],
    '\\nabla': ['nabla (gradient)', 'nabla gradient del'],
    '\\infty': ['infinity', 'infinity infty'],
    '^\\circ': ['degree', 'degree degrees angle'],
    '\\%': ['percent', 'percent'],

    '\\to': ['right arrow', 'arrow right to rightarrow limit'],
    '\\gets': ['left arrow', 'arrow left gets leftarrow'],
    '\\leftrightarrow': ['both ways arrow', 'arrow both leftrightarrow'],
    '\\Rightarrow': ['implies', 'implies rightarrow double'],
    '\\Leftarrow': ['implied by', 'implied leftarrow'],
    '\\Leftrightarrow': ['if and only if', 'equivalence iff leftrightarrow'],
    '\\mapsto': ['maps to', 'mapsto mapping'],
    '\\uparrow': ['up arrow', 'arrow up uparrow'],
    '\\downarrow': ['down arrow', 'arrow down downarrow'],
    '\\nearrow': ['rising arrow', 'arrow diagonal rising'],
    '\\searrow': ['falling arrow', 'arrow diagonal falling'],

    '\\in': ['element of', 'element in belongs member'],
    '\\notin': ['not an element of', 'not element notin'],
    '\\ni': ['contains element', 'ni contains'],
    '\\subset': ['subset of', 'subset'],
    '\\subseteq': ['subset or equal', 'subseteq subset'],
    '\\supset': ['superset of', 'superset supset'],
    '\\supseteq': ['superset or equal', 'supseteq superset'],
    '\\emptyset': ['empty set', 'empty set emptyset'],
    '\\forall': ['for all', 'for all forall every'],
    '\\exists': ['there exists', 'exists there'],
    '\\nexists': ['there is no', 'not exists nexists'],
    '\\neg': ['negation', 'negation neg not'],
    '\\land': ['and (conjunction)', 'and conjunction land'],
    '\\lor': ['or (disjunction)', 'or disjunction lor'],
    '\\therefore': ['therefore', 'therefore so'],
    '\\because': ['because', 'because'],
    '\\mathbb{R}': ['real numbers', 'real numbers R'],
    '\\mathbb{N}': ['natural numbers', 'natural numbers N'],
    '\\mathbb{Z}': ['integers', 'integers Z'],
    '\\mathbb{Q}': ['rational numbers', 'rational numbers Q'],
    '\\mathbb{C}': ['complex numbers', 'complex numbers C'],
    '\\aleph': ['aleph', 'aleph cardinality'],

    '\\ldots': ['three dots', 'three dots ldots ellipsis'],
    '\\cdots': ['centred dots', 'cdots dots'],
    '\\vdots': ['vertical dots', 'vdots vertical dots'],
    '\\ddots': ['diagonal dots', 'ddots diagonal dots'],
    '\\dagger': ['dagger (adjoint)', 'dagger hermitian adjoint'],
    '\\prime': ['prime (derivative)', 'prime derivative'],
    '\\hbar': ['reduced Planck constant', 'hbar planck quantum'],
    '\\ell': ['script l', 'ell length l'],
    '\\Re': ['real part', 'real part Re'],
    '\\Im': ['imaginary part', 'imaginary part Im'],
    '\\triangle': ['triangle', 'triangle'],
    '\\square': ['square', 'square'],
    '\\diamond': ['diamond', 'diamond'],
    '\\bigcirc': ['circle', 'circle big'],
    '\\checkmark': ['check mark', 'check tick correct ok'],
    '\\top': ['top (true)', 'top true'],
    '\\vdash': ['proves', 'vdash entails'],
    '\\lceil': ['left ceiling', 'ceiling ceil'],
    '\\rceil': ['right ceiling', 'ceiling ceil'],
    '\\lfloor': ['left floor', 'floor'],
    '\\rfloor': ['right floor', 'floor'],
    '\\langle': ['left angle bracket', 'langle bra bracket'],
    '\\rangle': ['right angle bracket', 'rangle ket bracket'],

    '\\frac': ['fraction', 'fraction frac divide over'],
    '\\tfrac': ['small fraction', 'fraction tfrac'],
    '\\sqrt': ['square root', 'square root sqrt radical'],
    '\\lim': ['limit', 'limit lim'],
    '\\log': ['logarithm', 'logarithm log'],
    '\\ln': ['natural logarithm', 'logarithm ln natural'],
    '\\sin': ['sine', 'sine sin'], '\\cos': ['cosine', 'cosine cos'],
    '\\tan': ['tangent', 'tangent tan'], '\\cot': ['cotangent', 'cotangent cot'],
    '\\arcsin': ['arcsine', 'arcsine arcsin'], '\\arccos': ['arccosine', 'arccosine arccos'],
    '\\arctan': ['arctangent', 'arctangent arctan'],
    '\\exp': ['exponential', 'exponential exp'],
    '\\vec': ['vector arrow', 'vector vec arrow'],
    '\\hat': ['hat (unit vector)', 'hat unit vector'],
    '\\bar': ['bar (mean)', 'bar mean average'],
    '\\dot': ['dot (derivative)', 'dot derivative'],
    '\\ddot': ['double dot', 'ddot double dot'],
    '\\overline': ['line above', 'overline line above'],
    '\\underline': ['line below', 'underline line below'],
    '\\overrightarrow': ['arrow above (vector AB)', 'overrightarrow vector AB'],
    '\\text': ['plain text', 'text word plain'],
    '\\mathrm': ['upright font', 'mathrm roman upright'],
    '\\mathbb': ['double struck', 'mathbb blackboard set'],
    '\\left': ['stretchy bracket', 'left bracket'],
    '\\right': ['stretchy bracket', 'right bracket'],
    '\\begin': ['begin environment', 'begin matrix cases environment'],
    '\\end': ['end environment', 'end environment'],
    '\\dd': ['differential d', 'differential dd integral'],
    '\\unit': ['unit', 'unit'],
    '\\abs': ['absolute value', 'absolute value abs'],
    '\\dv': ['derivative dy/dx', 'derivative dv'],
    '\\pdv': ['partial derivative', 'partial pdv'],
    '\\ket': ['ket', 'ket quantum'],
    '\\bra': ['bra', 'bra quantum']
  };

  // Anglické názvy šablón: slovenský názov -> anglický
  var EN_SNIP = {
    'Zlomok': 'Fraction', 'Odmocnina': 'Square root', 'n-tá odmocnina': 'nth root',
    'Tretia odmocnina': 'Cube root', 'Mocnina': 'Power', 'Index': 'Subscript',
    'Suma': 'Sum', 'Súčin': 'Product', 'Integrál': 'Integral',
    'Neurčitý integrál': 'Indefinite integral', 'Limita': 'Limit',
    'Derivácia': 'Derivative', 'Parciálna derivácia': 'Partial derivative',
    'Absolútna hodnota': 'Absolute value', 'Kombinačné číslo': 'Binomial coefficient',
    'Matica 2×2': '2×2 matrix', 'Matica 3×3': '3×3 matrix', 'Determinant': 'Determinant',
    'Sústava rovníc': 'System of equations', 'Zarovnané riadky': 'Aligned lines',
    'Vektor so šípkou': 'Vector with an arrow', 'Text vo vzorci': 'Text inside a formula',
    'Veľké zátvorky': 'Large brackets',

    'Rýchlosť': 'Speed', 'Zrýchlenie': 'Acceleration',
    'Rovnomerne zrýchlený pohyb': 'Uniformly accelerated motion',
    'Okamžitá rýchlosť': 'Instantaneous speed', 'Newtonov zákon sily': "Newton's second law",
    'Hybnosť': 'Momentum', 'Práca': 'Work', 'Výkon': 'Power',
    'Kinetická energia': 'Kinetic energy', 'Potenciálna energia': 'Potential energy',
    'Gravitačná sila': 'Gravitational force', 'Dostredivé zrýchlenie': 'Centripetal acceleration',
    'Uhlová rýchlosť': 'Angular velocity', 'Hustota': 'Density', 'Tlak': 'Pressure',
    'Hydrostatický tlak': 'Hydrostatic pressure', 'Stavová rovnica plynu': 'Ideal gas law',
    'Ohmov zákon': "Ohm's law", 'Elektrický výkon': 'Electric power',
    'Coulombov zákon': "Coulomb's law", 'Vlnová dĺžka': 'Wavelength',
    'Energia fotónu': 'Photon energy', 'Einsteinov vzťah': 'Mass–energy equivalence',
    'Kyvadlo': 'Pendulum',

    'Kvadratická rovnica': 'Quadratic formula', 'Diskriminant': 'Discriminant',
    'Pytagorova veta': 'Pythagorean theorem', 'Goniometrická jednotka': 'Pythagorean identity',
    'Sínusová veta': 'Law of sines', 'Kosínusová veta': 'Law of cosines',
    'Obsah kruhu': 'Area of a circle', 'Objem gule': 'Volume of a sphere',
    'Aritmetická postupnosť': 'Arithmetic sequence', 'Geometrická postupnosť': 'Geometric sequence',
    'Logaritmus': 'Change of base', 'Derivácia mocniny': 'Power rule',
    'Eulerova rovnosť': "Euler's identity",

    'meter': 'metre', 'sekunda': 'second', 'kilogram': 'kilogram', 'newton': 'newton',
    'joule': 'joule', 'watt': 'watt', 'pascal': 'pascal', 'hertz': 'hertz', 'volt': 'volt',
    'ampér': 'ampere', 'ohm': 'ohm', 'coulomb': 'coulomb', 'kelvin': 'kelvin',
    'stupeň Celzia': 'degree Celsius', 'mol': 'mole', 'tesla': 'tesla',
    'elektrónvolt': 'electronvolt',

    'Vektor': 'Vector', 'Jednotkový vektor': 'Unit vector', 'Priemer': 'Mean',
    'Derivácia podľa času': 'Time derivative',
    'Druhá derivácia podľa času': 'Second time derivative', 'Gradient': 'Gradient',
    'Divergencia': 'Divergence', 'Rotácia': 'Curl', 'Ket': 'Ket', 'Bra': 'Bra',
    'Braket': 'Braket', 'Diferenciál d': 'Differential d', 'Zmena veličiny': 'Change in a quantity'
  };

  var SEED = {
    sk: [
      '# Kvadratická rovnica\n2x^2 - 5x + 3 = 0\nD = b^2 - 4ac = 25 - 24 = 1\n' +
      'x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{5 \\pm 1}{4}\nx_1 = \\frac{3}{2} \\quad x_2 = 1',
      '# Voľný pád – skús to prepísať\nv = g t \\qquad s = \\tfrac{1}{2} g t^2\n' +
      'E_k = \\tfrac{1}{2} m v^2 = \\unit{J}\n# Napíš odmocnina a stlač Tab',
      '# Symboly, čo nie sú na klávesnici\n\\int_{0}^{\\pi} \\sin x \\dd x = 2\n' +
      '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}\n\\sqrt[3]{8} = 2\n' +
      '# Nakresli ich myšou – tlačidlo „Nakresliť symbol"'
    ],
    en: [
      '# Quadratic equation\n2x^2 - 5x + 3 = 0\nD = b^2 - 4ac = 25 - 24 = 1\n' +
      'x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{5 \\pm 1}{4}\nx_1 = \\frac{3}{2} \\quad x_2 = 1',
      '# Free fall – try retyping it\nv = g t \\qquad s = \\tfrac{1}{2} g t^2\n' +
      'E_k = \\tfrac{1}{2} m v^2 = \\unit{J}\n# Type root and press Tab',
      '# Symbols that are not on the keyboard\n\\int_{0}^{\\pi} \\sin x \\dd x = 2\n' +
      '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}\n\\sqrt[3]{8} = 2\n' +
      '# Draw them with the mouse – the "Draw a symbol" button'
    ]
  };

  var lang = 'sk';
  try {
    var saved = localStorage.getItem(LANG_KEY);
    if (saved === 'sk' || saved === 'en') lang = saved;
    else if ((navigator.language || '').slice(0, 2).toLowerCase() !== 'sk') lang = 'en';
  } catch (e) { /* bez pamäte ostaneme pri slovenčine */ }

  MW.LANGS = ['sk', 'en'];

  MW.lang = function () { return lang; };

  MW.setLang = function (next) {
    if (next !== 'sk' && next !== 'en') return;
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* nevadí */ }
  };

  MW.t = function (key, vars) {
    var row = UI[key];
    var s = row ? (row[lang === 'en' ? 1 : 0] || row[0]) : key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
    }
    return s;
  };

  // Názov symbolu v aktuálnom jazyku, s návratom k slovenčine.
  MW.symName = function (sym) {
    var en = EN_SYM[sym.tex];
    return (lang === 'en' && en) ? en[0] : sym.name;
  };

  /* Hľadať sa dá vždy v oboch jazykoch – kto prepne na angličtinu,
   * nemá prísť o to, že mu „odmocnina" stále funguje. */
  MW.symSearch = function (sym) {
    var en = EN_SYM[sym.tex];
    return MW.deaccent(sym.name + ' ' + (sym.kw || '') + (en ? ' ' + en[0] + ' ' + en[1] : ''));
  };

  MW.snipLabel = function (label) {
    return (lang === 'en' && EN_SNIP[label]) ? EN_SNIP[label] : label;
  };

  MW.snipSearch = function (label) {
    return MW.deaccent(label + ' ' + (EN_SNIP[label] || ''));
  };

  MW.catLabel = function (id) { return MW.t('cat.' + id); };
  MW.groupLabel = function (label) { return MW.t('grp.' + label); };
  MW.seedTexts = function () { return SEED[lang] || SEED.sk; };

  /* Register slov pre dopĺňanie bez spätnej lomky: symboly, príkazy aj
   * hotové šablóny. Hľadá sa v oboch jazykoch, zobrazuje sa v aktuálnom. */
  MW.buildWords = function () {
    var out = [], seen = Object.create(null);

    function add(tex, name, search, ch) {
      // \sqrt{} a \sqrt je ten istý príkaz – v ponuke má byť raz.
      var key = tex.replace(/\{\}/g, '');
      if (seen[key]) return;
      seen[key] = true;
      out.push({ tex: tex, name: name, ch: ch || '', search: search });
    }

    MW.SYMBOLS.forEach(function (s) { add(s.tex, MW.symName(s), MW.symSearch(s), s.ch); });
    MW.COMMANDS.forEach(function (c) { add(c.tex, MW.symName(c), MW.symSearch(c), c.ch); });
    MW.SNIPPETS.forEach(function (g) {
      g.items.forEach(function (it) {
        add(it[1], MW.snipLabel(it[0]), MW.snipSearch(it[0]), '');
      });
    });

    MW.WORDS = out;
    return out;
  };
})();
