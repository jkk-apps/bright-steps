// ---------------------------------------------------------------------------
// Content: skills, levels and learning material (aligned to UK EYFS / KS1).
// ---------------------------------------------------------------------------

export const SKILLS = {
  numbers: {
    id: 'numbers', name: 'Numbers', icon: '🔢', colour: '#ff9f43', maxLevel: 5,
    levelNames: ['1 to 5', '0 to 9', '10 to 20', 'Tens to 100', '0 to 100'],
  },
  maths: {
    id: 'maths', name: 'Maths', icon: '➕', colour: '#ee5253', maxLevel: 7,
    levelNames: ['Adding to 5', 'Adding to 10', 'Taking away to 10', 'Add & take to 20', 'Times 2, 5, 10', 'Divide by 2, 5, 10', 'Missing numbers'],
  },
  letters: {
    id: 'letters', name: 'Letters', icon: '🔤', colour: '#10ac84', maxLevel: 6,
    levelNames: ['s a t p i n', 'adds m d g o c k', 'adds e u r h f b l', 'all small letters', 'big & small letters', 'all letters review'],
  },
  words: {
    id: 'words', name: 'SATPIN Words', icon: '📖', colour: '#5f27cd', maxLevel: 4,
    levelNames: ['satpin words', 'more CVC words', 'digraph words', 'blend words'],
  },
  colours: {
    id: 'colours', name: 'Colours', icon: '🎨', colour: '#00b8d4', maxLevel: 4,
    levelNames: ['4 colours', '8 colours', '11 colours', 'colour words'],
  },
  reading: {
    id: 'reading', name: 'Reading', icon: '📚', colour: '#2e86de', maxLevel: 6,
    levelNames: ['Lilac band', 'Pink band', 'Red band', 'Yellow band', 'Blue band', 'Green band'],
  },
  piano: {
    id: 'piano', name: 'Piano', icon: '🎹', colour: '#845ef2', maxLevel: 4,
    levelNames: ['C D E', 'C to G', 'one octave', 'two octaves'],
  },
  spanish: {
    id: 'spanish', name: 'Spanish', icon: '🇪🇸', colour: '#f59f00', maxLevel: 6,
    levelNames: ['greetings', 'numbers 1-5', 'numbers 6-10', 'colours', 'animals', 'food'],
  },
  french: {
    id: 'french', name: 'French', icon: '🇫🇷', colour: '#4dabf7', maxLevel: 6,
    levelNames: ['greetings', 'numbers 1-5', 'numbers 6-10', 'colours', 'animals', 'food'],
  },
};

// ---------------- piano ----------------
// Official Boomwhackers / Chroma-Notes colours — the de-facto standard in UK
// primary school music (C=red … B=magenta), so app learning transfers to
// classroom instruments. Source: funmusicco.com Boomwhacker colour chart.
export const NOTE_COLOURS = {
  C: '#EB2427', D: '#F6851F', E: '#FBED1B', F: '#6BBE46',
  G: '#0C9648', A: '#80539F', B: '#E14197',
};

// Letter-label text colour per key: dark on the light keys (E, F) so labels stay readable
export const NOTE_TEXT = {
  C: '#ffffff', D: '#ffffff', E: '#3d3d3d', F: '#3d3d3d',
  G: '#ffffff', A: '#ffffff', B: '#ffffff',
};

// Frequencies for two octaves (C4-B4, C5-B5)
export const PIANO_OCTAVES = [
  { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.00, A: 440.00, B: 493.88 },
  { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880.00, B: 987.77 },
];

export const PIANO_LEVEL_NOTES = {
  1: ['C', 'D', 'E'],
  2: ['C', 'D', 'E', 'F', 'G'],
  3: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  4: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], // across two octaves
};

// ---------------- languages ----------------
// Item shape: { w: word, en: English meaning, emoji?, num?, colour? }
export const LANG_CONTENT = {
  spanish: {
    lang: 'es-ES',
    levels: {
      1: [
        { w: 'hola', en: 'hello', emoji: '👋' },
        { w: 'adiós', en: 'goodbye', emoji: '🚪' },
        { w: 'gracias', en: 'thank you', emoji: '🙏' },
        { w: 'por favor', en: 'please', emoji: '🌈' },
        { w: 'sí', en: 'yes', emoji: '✅' },
        { w: 'no', en: 'no', emoji: '❌' },
      ],
      2: [
        { w: 'uno', en: 'one', num: 1 }, { w: 'dos', en: 'two', num: 2 },
        { w: 'tres', en: 'three', num: 3 }, { w: 'cuatro', en: 'four', num: 4 },
        { w: 'cinco', en: 'five', num: 5 },
      ],
      3: [
        { w: 'seis', en: 'six', num: 6 }, { w: 'siete', en: 'seven', num: 7 },
        { w: 'ocho', en: 'eight', num: 8 }, { w: 'nueve', en: 'nine', num: 9 },
        { w: 'diez', en: 'ten', num: 10 },
      ],
      4: [
        { w: 'rojo', en: 'red', colour: '#e74c3c' }, { w: 'azul', en: 'blue', colour: '#3498db' },
        { w: 'amarillo', en: 'yellow', colour: '#f1c40f' }, { w: 'verde', en: 'green', colour: '#2ecc71' },
        { w: 'naranja', en: 'orange', colour: '#e67e22' }, { w: 'rosa', en: 'pink', colour: '#ff8fb2' },
        { w: 'negro', en: 'black', colour: '#333333' }, { w: 'blanco', en: 'white', colour: '#fdfdfd' },
      ],
      5: [
        { w: 'gato', en: 'cat', emoji: '🐱' }, { w: 'perro', en: 'dog', emoji: '🐶' },
        { w: 'pájaro', en: 'bird', emoji: '🐦' }, { w: 'pez', en: 'fish', emoji: '🐟' },
        { w: 'caballo', en: 'horse', emoji: '🐴' }, { w: 'vaca', en: 'cow', emoji: '🐮' },
        { w: 'cerdo', en: 'pig', emoji: '🐷' }, { w: 'pato', en: 'duck', emoji: '🦆' },
      ],
      6: [
        { w: 'manzana', en: 'apple', emoji: '🍎' }, { w: 'leche', en: 'milk', emoji: '🥛' },
        { w: 'pan', en: 'bread', emoji: '🍞' }, { w: 'queso', en: 'cheese', emoji: '🧀' },
        { w: 'agua', en: 'water', emoji: '💧' }, { w: 'zumo', en: 'juice', emoji: '🧃' },
      ],
    },
  },
  french: {
    lang: 'fr-FR',
    levels: {
      1: [
        { w: 'bonjour', en: 'hello', emoji: '👋' },
        { w: 'au revoir', en: 'goodbye', emoji: '🚪' },
        { w: 'merci', en: 'thank you', emoji: '🙏' },
        { w: "s'il vous plaît", en: 'please', emoji: '🌈' },
        { w: 'oui', en: 'yes', emoji: '✅' },
        { w: 'non', en: 'no', emoji: '❌' },
      ],
      2: [
        { w: 'un', en: 'one', num: 1 }, { w: 'deux', en: 'two', num: 2 },
        { w: 'trois', en: 'three', num: 3 }, { w: 'quatre', en: 'four', num: 4 },
        { w: 'cinq', en: 'five', num: 5 },
      ],
      3: [
        { w: 'six', en: 'six', num: 6 }, { w: 'sept', en: 'seven', num: 7 },
        { w: 'huit', en: 'eight', num: 8 }, { w: 'neuf', en: 'nine', num: 9 },
        { w: 'dix', en: 'ten', num: 10 },
      ],
      4: [
        { w: 'rouge', en: 'red', colour: '#e74c3c' }, { w: 'bleu', en: 'blue', colour: '#3498db' },
        { w: 'jaune', en: 'yellow', colour: '#f1c40f' }, { w: 'vert', en: 'green', colour: '#2ecc71' },
        { w: 'orange', en: 'orange', colour: '#e67e22' }, { w: 'rose', en: 'pink', colour: '#ff8fb2' },
        { w: 'noir', en: 'black', colour: '#333333' }, { w: 'blanc', en: 'white', colour: '#fdfdfd' },
      ],
      5: [
        { w: 'chat', en: 'cat', emoji: '🐱' }, { w: 'chien', en: 'dog', emoji: '🐶' },
        { w: 'oiseau', en: 'bird', emoji: '🐦' }, { w: 'poisson', en: 'fish', emoji: '🐟' },
        { w: 'cheval', en: 'horse', emoji: '🐴' }, { w: 'vache', en: 'cow', emoji: '🐮' },
        { w: 'cochon', en: 'pig', emoji: '🐷' }, { w: 'canard', en: 'duck', emoji: '🦆' },
      ],
      6: [
        { w: 'pomme', en: 'apple', emoji: '🍎' }, { w: 'lait', en: 'milk', emoji: '🥛' },
        { w: 'pain', en: 'bread', emoji: '🍞' }, { w: 'fromage', en: 'cheese', emoji: '🧀' },
        { w: 'eau', en: 'water', emoji: '💧' }, { w: 'jus', en: 'juice', emoji: '🧃' },
      ],
    },
  },
};

export const NUM_EMOJI = ['🍎', '⭐', '🐟', '🎈', '🦆', '🍓', '🐞', '🌸'];

// Cumulative letter sets following UK phonics Phase 2 order (s a t p i n first)
export const LETTER_LEVELS = {
  1: 'satpin',
  2: 'satpinmdgock',
  3: 'satpinmdgockeurhfbl',
  4: 'abcdefghijklmnopqrstuvwxyz',
  5: 'abcdefghijklmnopqrstuvwxyz',
  6: 'abcdefghijklmnopqrstuvwxyz',
};

export const LETTER_EMOJI = {
  s: '🐍', a: '🍎', t: '🐯', p: '🐷', i: '🍦', n: '👃',
  m: '🐵', d: '🐶', g: '🦍', o: '🐙', c: '🐱', k: '🪁',
  e: '🐘', u: '☂️', r: '🐰', h: '🐴', f: '🐸', b: '🐻', l: '🦁',
  j: '🧃', v: '🌋', w: '🍉', x: '❌', y: '🪀', z: '🦓', q: '👑',
};

// Words to decode. Level 1 uses ONLY the letters s a t p i n (true SATPIN words).
// Level 2: full Phase 2 CVC. Level 3: Phase 3 digraphs. Level 4: Phase 4 blends.
export const WORD_LEVELS = {
  1: ['sat', 'sit', 'pat', 'pit', 'pin', 'pan', 'nap', 'nip', 'tap', 'tip',
      'tan', 'tin', 'sip', 'sap', 'spin', 'span', 'snap', 'spit', 'snip',
      'pins', 'pats', 'naps', 'taps', 'tips', 'nits'],
  2: ['cat', 'cap', 'can', 'dog', 'dig', 'dot', 'cot', 'mad', 'man', 'map',
      'mat', 'mug', 'mud', 'bag', 'bat', 'bed', 'big', 'bin', 'bus', 'but',
      'bun', 'cub', 'cup', 'cut', 'fed', 'fig', 'fin', 'fog', 'fun', 'gas',
      'get', 'got', 'gum', 'ham', 'hat', 'hen', 'him', 'hip', 'hit', 'hog',
      'hop', 'hot', 'hug', 'hut', 'kid', 'kit', 'leg', 'let', 'lid', 'lip',
      'log', 'lot', 'net', 'not', 'nut', 'peg', 'pen', 'pet', 'pig', 'pot',
      'rag', 'rat', 'red', 'rib', 'rip', 'rod', 'rub', 'rug', 'run', 'sad',
      'set', 'sob', 'sub', 'sun', 'tag', 'ten', 'top', 'tub', 'tug', 'bug',
      'sock', 'rock', 'duck', 'kick', 'back', 'neck', 'bell', 'doll', 'hill',
      'mess', 'miss', 'off', 'huff'],
  3: ['ship', 'shop', 'shed', 'fish', 'dish', 'chip', 'chin', 'chop', 'much',
      'rich', 'thin', 'that', 'this', 'then', 'bath', 'moth', 'ring', 'sing',
      'king', 'long', 'song', 'rain', 'pain', 'wait', 'tail', 'sail', 'see',
      'seed', 'feet', 'meet', 'boat', 'coat', 'road', 'soap', 'look', 'book',
      'cook', 'moon', 'soon', 'corn', 'born', 'night', 'light', 'right'],
  4: ['stop', 'step', 'trip', 'trap', 'frog', 'flag', 'clap', 'slip', 'grab',
      'plan', 'swim', 'jump', 'bump', 'hand', 'land', 'milk', 'desk', 'help',
      'lamp', 'tent', 'went', 'fast', 'belt', 'best', 'must', 'just', 'soft',
      'gift', 'lift', 'pink', 'crab', 'star', 'drum', 'fox'],
};

export const WORD_EMOJI = {
  // Level 1 (only satpin letters)
  pin: '📌', pan: '🍳', tin: '🥫',
  // Level 2
  cat: '🐱', dog: '🐶', pig: '🐷', hen: '🐔', rat: '🐀', bat: '🦇',
  hat: '🎩', map: '🗺️', bed: '🛏️', cup: '☕', pot: '🍲', net: '🥅',
  log: '🪵', bug: '🐛', sun: '☀️', bus: '🚌', nut: '🥜', sock: '🧦',
  rock: '🪨', duck: '🦆', bell: '🔔', doll: '🪆', ham: '🍖',
  // Level 3
  ship: '🚢', fish: '🐟', chip: '🍟', ring: '💍', king: '🤴', rain: '🌧️',
  sail: '⛵', moon: '🌙', book: '📖', cook: '🧑‍🍳', coat: '🧥', boat: '🚤',
  corn: '🌽', night: '🌃', light: '💡', bath: '🛁', moth: '🦋', song: '🎵',
  seed: '🌱', feet: '🦶', soap: '🧼',
  // Level 4
  frog: '🐸', flag: '🚩', hand: '✋', milk: '🥛', stop: '🛑', gift: '🎁',
  swim: '🏊', crab: '🦀', star: '⭐', drum: '🥁', fox: '🦊',
};

export const COLOURS = {
  red: '#e74c3c', blue: '#3498db', yellow: '#f1c40f', green: '#2ecc71',
  orange: '#e67e22', purple: '#9b59b6', pink: '#ff8fb2', black: '#333333',
  brown: '#8d5a2b', white: '#fdfdfd', grey: '#95a5a6',
};

export const COLOUR_LEVELS = {
  1: ['red', 'blue', 'yellow', 'green'],
  2: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'black'],
  3: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'black', 'brown', 'white', 'grey'],
  4: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'black', 'brown', 'white', 'grey'],
};

// General emoji pool for picture games
export const EMOJI_POOL = ['🐶', '🐱', '🐭', '🐰', '🦆', '🐸', '🐝', '🦋', '🌳', '🌸', '⚽', '🎈', '🍎', '🚗', '🐠', '🍪'];

// Reading material mapped to UK book bands.
// Lilac = wordless picture talk; Pink = Phase 2 captions; Red = Phase 3;
// Yellow = Phase 4; Blue/Green = Phase 5 and longer sentences.
export const READING_BANDS = [
  {
    level: 1, band: 'Lilac', wordless: true,
    items: [
      { scene: '🐶 🌳 ⚽', q: 'Tap the dog.', opts: ['🐶', '🌳', '⚽'], a: 0, huntSpeak: 'Tap all the dogs.' },
      { scene: '🍎 🍌 🍇', q: 'Tap the apple.', opts: ['🍎', '🍌', '🍇'], a: 0, huntSpeak: 'Tap all the apples.' },
      { scene: '🐱 🐭 🐰', q: 'Tap the rabbit.', opts: ['🐱', '🐭', '🐰'], a: 2, huntSpeak: 'Tap all the rabbits.' },
      { scene: '🚗 🚌 🚲', q: 'Tap the bus.', opts: ['🚗', '🚌', '🚲'], a: 1, huntSpeak: 'Tap all the buses.' },
    ],
  },
  {
    level: 2, band: 'Pink',
    items: [
      { text: 'The cat sat.', q: 'Who sat?', opts: ['🐱', '🐶', '🐰'], a: 0 },
      { text: 'A pin is in the tin.', q: 'What is in the tin?', opts: ['📌', '🍎', '🧦'], a: 0 },
      { text: 'The pig can dig.', q: 'Who can dig?', opts: ['🐷', '🐱', '🦆'], a: 0 },
      { text: 'The dog is hot.', q: 'Who is hot?', opts: ['🐶', '🐭', '🐍'], a: 0 },
    ],
  },
  {
    level: 3, band: 'Red',
    items: [
      { text: 'The ship is red.', q: 'What is red?', opts: ['🚢', '🚗', '🍎'], a: 0 },
      { text: 'I can see a fish.', q: 'What can you see?', opts: ['🐟', '🐸', '🦆'], a: 0 },
      { text: 'The king has a ring.', q: 'Who has a ring?', opts: ['🤴', '👸', '🐶'], a: 0 },
      { text: 'The moon is bright.', q: 'What is bright?', opts: ['🌙', '🍎', '🚗'], a: 0 },
    ],
  },
  {
    level: 4, band: 'Yellow',
    items: [
      { text: 'The frog jumps on the log.', q: 'Where does the frog jump?', opts: ['🪵', '🛏️', '🚌'], a: 0 },
      { text: 'A crab sat on the sand.', q: 'Who sat on the sand?', opts: ['🦀', '🐙', '🐟'], a: 0 },
      { text: 'The tent is on the hill.', q: 'What is on the hill?', opts: ['⛺', '🏠', '🌳'], a: 0 },
      { text: 'The girl has a pink hat.', q: 'What does the girl have?', opts: ['🎩', '👟', '🧤'], a: 0 },
    ],
  },
  {
    level: 5, band: 'Blue',
    items: [
      { text: 'The boy plays with his toy train.', q: 'What does the boy play with?', opts: ['🚂', '⚽', '🪁'], a: 0 },
      { text: 'A bird sings in the green tree.', q: 'Where does the bird sing?', opts: ['🌳', '🏠', '🚗'], a: 0 },
      { text: 'The mouse found some cheese.', q: 'What did the mouse find?', opts: ['🧀', '🍎', '🍞'], a: 0 },
      { text: 'My cake is sweet and round.', q: 'What is sweet and round?', opts: ['🎂', '⚽', '🧱'], a: 0 },
    ],
  },
  {
    level: 6, band: 'Green',
    items: [
      { text: 'On Sunday the children bake sweet cakes in the kitchen.', q: 'What do the children bake?', opts: ['🎂', '🍕', '🍞'], a: 0 },
      { text: 'The clever fox ran through the field and hid in a bush.', q: 'Where did the fox hide?', opts: ['🌳', '🏠', '🕳️'], a: 0 },
      { text: 'A little snail slid slowly down the garden path.', q: 'Who slid down the path?', opts: ['🐌', '🐍', '🦎'], a: 0 },
      { text: 'The queen wore a shiny crown and a green coat.', q: 'What did the queen wear?', opts: ['👑', '🧢', '🧤'], a: 0 },
    ],
  },
];
