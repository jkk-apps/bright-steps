// ---------------------------------------------------------------------------
// Content: skills, levels and learning material (aligned to UK EYFS / KS1).
// ---------------------------------------------------------------------------

export const SKILLS = {
  numbers: {
    id: 'numbers', name: 'Numbers', icon: '🔢', colour: '#ff9f43', maxLevel: 6,
    levelNames: ['1 to 5', '0 to 9', '10 to 20', 'Tens to 100', '0 to 100', 'Hundreds to 1000'],
  },
  maths: {
    id: 'maths', name: 'Maths', icon: '➕', colour: '#ee5253', maxLevel: 15,
    levelNames: [
      'Adding to 5', 'Adding to 10', 'Taking away to 10', 'Add & take to 20',
      'Times 2, 5, 10', 'Divide by 2, 5, 10', 'Missing numbers',
      // 7+ stretch (end Y3 / early Y4):
      'Add & take to 100', 'Add & take to 1000', 'Times 3, 4 & 6', 'Times 7 to 12',
      'Divide to 12', 'Mixed maths review', 'Money problems', 'Measure & two-step problems',
    ],
  },
  fractions: {
    id: 'fractions', name: 'Fractions', icon: '🍕', colour: '#e84393', maxLevel: 3,
    levelNames: ['halves & quarters', 'thirds & parts', 'equivalent fractions'],
  },
  reasoning: {
    id: 'reasoning', name: 'Reasoning', icon: '🧠', colour: '#ff6b81', maxLevel: 4,
    levelNames: ['patterns', 'odd one out', 'analogies', 'sequences & codes'],
  },
  shapes: {
    id: 'shapes', name: 'Shapes', icon: '🔷', colour: '#e17055', maxLevel: 2,
    levelNames: ['first shapes', 'more shapes'],
  },
  tricky: {
    id: 'tricky', name: 'Tricky Words', icon: '📕', colour: '#b71540', maxLevel: 4,
    levelNames: ['phase 2 red words', 'phase 3 red words', 'phase 4 red words', 'phase 5 red words'],
  },
  tracing: {
    id: 'tracing', name: 'Tracing', icon: '✍️', colour: '#596275', maxLevel: 2,
    levelNames: ['letters', 'numbers'],
  },
  money: {
    id: 'money', name: 'Money', icon: '🪙', colour: '#b7791f', maxLevel: 3,
    levelNames: ['coins to 10p', 'all coins', 'adding coins'],
  },
  time: {
    id: 'time', name: 'Time', icon: '🕐', colour: '#30336b', maxLevel: 3,
    levelNames: ["o'clock", 'half past', 'quarter hours'],
  },
  calendar: {
    id: 'calendar', name: 'Days & Months', icon: '📅', colour: '#38ada9', maxLevel: 3,
    levelNames: ['days of the week', 'months of the year', 'seasons'],
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
    id: 'reading', name: 'Reading', icon: '📚', colour: '#2e86de', maxLevel: 9,
    levelNames: ['Lilac band', 'Pink band', 'Red band', 'Yellow band', 'Blue band', 'Green band', 'Orange band', 'Turquoise band', 'Purple band'],
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

// ---------------- age bands ----------------
// Each child profile is either '2-4' (gentler: early levels only, stretch
// modules hidden) or '4-7' (the full curriculum up to 7+ standard).
export const AGE_BANDS = {
  '2-4': {
    label: '2–4+', icon: '🐣', blurb: 'gentler first steps',
    // Per-skill level cap for this band; 0 = hidden from the home screen.
    caps: {
      numbers: 3,   // up to counting to 20 (4+ upper boundary)
      shapes: 2,    // 2D shape naming — a 4+ school-readiness skill
      maths: 2,     // up to adding to 10
      letters: 4,   // up to all small letters
      words: 1,     // satpin words only
      colours: 3,   // up to 11 colours (no colour-word reading)
      reading: 2,   // wordless + Pink band
      piano: 2,     // C to G
      spanish: 2,   // greetings + numbers 1-5
      french: 2,    // greetings + numbers 1-5
      fractions: 0, // hidden
      reasoning: 2, // patterns + odd one out (no analogies/codes)
      tricky: 0,    // red words are Reception+
      money: 0,     // KS1 topic
      time: 0,      // KS1 topic
      calendar: 1,  // days of the week (preschool songs)
      tracing: 2,   // mark-making & letter formation — a 4+ skill
    },
  },
  '4-7': { label: '4–7+', icon: '🦁', blurb: 'full curriculum to 7+', caps: null },
};

// Highest level this age band allows for a skill (0 = hidden for this band).
export function bandCap(band, skillId) {
  const b = AGE_BANDS[band] || AGE_BANDS['4-7'];
  const full = SKILLS[skillId].maxLevel;
  if (!b.caps) return full;
  const c = b.caps[skillId];
  return c == null ? full : Math.min(c, full);
}

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
// Language skills unlock harder learning methods as the child levels up —
// listen & look first (Reception-style), matching later, spelling last.
// A 4-year-old beginner never sees reading/spelling tasks.
export const LANG_METHOD_GATES = {
  1: ['hear', 'look'],
  2: ['hear', 'look'],
  3: ['hear', 'look', 'match'],
  4: ['hear', 'look', 'match'],
  5: ['hear', 'look', 'match', 'play'],
  6: ['hear', 'look', 'match', 'play'],
};

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

// ---------------- 2D shapes (4+ school readiness) ----------------
// Drawn with CSS (not emoji) so children learn the shape itself, not a picture —
// and each appearance uses a random colour/size to teach shape constancy.
export const SHAPE_META = {
  circle:    { n: 'circle',    pl: 'circles',    things: ['⚽', '🍩', '🌝'] },
  square:    { n: 'square',    pl: 'squares',    things: ['🎁', '🪟', '🧊'] },
  triangle:  { n: 'triangle',  pl: 'triangles',  things: ['🍕', '⛺', '🎄'] },
  star:      { n: 'star',      pl: 'stars',      things: ['🌟', '⭐', '✨'] },
  heart:     { n: 'heart',     pl: 'hearts',     things: ['💝', '❤️', '💗'] },
  rectangle: { n: 'rectangle', pl: 'rectangles', things: ['📱', '🚪', '📦'] },
  oval:      { n: 'oval',      pl: 'ovals',      things: ['🥚', '🍈', '🪞'] },
  diamond:   { n: 'diamond',   pl: 'diamonds',   things: ['💎', '🔶', '🪁'] },
};
export const SHAPE_LEVELS = {
  1: ['circle', 'square', 'triangle', 'star', 'heart'],
  2: ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle', 'oval', 'diamond'],
};
export const SHAPE_COLOURS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#9b59b6', '#ff8fb2'];

// ---------------- tricky words (phonics "red words" — can't be sounded out) ----------------
export const TRICKY_LEVELS = {
  1: ['I', 'the', 'to', 'no', 'go', 'into'],
  2: ['he', 'she', 'we', 'me', 'be', 'was', 'you', 'they', 'all', 'are', 'my', 'her'],
  3: ['said', 'have', 'like', 'so', 'do', 'some', 'come', 'were', 'there', 'little', 'one', 'when', 'out', 'what'],
  4: ['oh', 'their', 'people', 'Mr', 'Mrs', 'looked', 'called', 'asked', 'could'],
};

// ---------------- UK coins (KS1 money) ----------------
export const COINS = [
  { v: 1,   label: '1p',  say: 'one p',      col: '#c77b4a', kind: 'bronze' },
  { v: 2,   label: '2p',  say: 'two p',      col: '#c77b4a', kind: 'bronze' },
  { v: 5,   label: '5p',  say: 'five p',     col: '#b8c0cc', kind: 'silver' },
  { v: 10,  label: '10p', say: 'ten p',      col: '#b8c0cc', kind: 'silver' },
  { v: 20,  label: '20p', say: 'twenty p',   col: '#b8c0cc', kind: 'silver' },
  { v: 50,  label: '50p', say: 'fifty p',    col: '#b8c0cc', kind: 'silver' },
  { v: 100, label: '£1',  say: 'one pound',  col: '#e8c15a', kind: 'gold' },
  { v: 200, label: '£2',  say: 'two pounds', col: '#e8c15a', kind: 'gold' },
];
export const COIN_LEVELS = { 1: [1, 2, 5, 10], 2: [1, 2, 5, 10, 20, 50, 100, 200] };

// ---------------- calendar language (EYFS / Y1) ----------------
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_MONTHS = {
  spring: ['March', 'April', 'May'], summer: ['June', 'July', 'August'],
  autumn: ['September', 'October', 'November'], winter: ['December', 'January', 'February'],
};

// ---------------- sticker album rewards ----------------
// Common stickers for a good session; rare ones reserved for a perfect 5/5.
export const STICKERS = {
  common: ['🦊', '🐰', '🦁', '🐸', '🐼', '🐨', '🐷', '🐥', '🦆', '🐢', '🐙', '🦋',
    '🐝', '🌻', '🌈', '🍓', '🍪', '⚽', '🚗', '✈️', '🚂', '🎈', '🎨', '🎸', '🥁', '🪁', '🧸', '🍦'],
  rare: ['🏆', '👑', '💎', '🦄', '🚀', '🌟', '🎆', '🐉'],
};

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
  // 7+ stretch: Year 2 bands introduce INFERENCE (reading between the lines)
  // and word-meaning questions, like real comprehension papers.
  {
    level: 7, band: 'Orange',
    items: [
      { text: 'Mia packed her umbrella and her boots before she left.', q: 'What was the weather like?', opts: ['🌧️', '☀️', '🌈'], a: 0 },
      { text: 'The dog hid under the bed when the thunder crashed.', q: 'How did the dog feel?', opts: ['😨', '😄', '😋'], a: 0 },
      { text: 'Ava put on her scarf, her hat and her gloves.', q: 'What season is it?', opts: ['❄️', '🌞', '🌷'], a: 0 },
      { text: 'Kofi licked his lips when he saw the birthday cake.', q: 'How did Kofi feel?', opts: ['😋', '😴', '😰'], a: 0 },
      { text: 'Gran smiled as she opened the little card from Ruby.', q: 'How did Gran feel?', opts: ['😊', '😠', '😨'], a: 0 },
    ],
  },
  {
    level: 8, band: 'Turquoise',
    items: [
      { text: 'The twins looked identical, so even their teacher mixed them up.', q: 'What does “identical” mean?', opts: ['the same', 'different', 'funny'], a: 0, wordOpts: true },
      { text: 'Sam tiptoed past the sleeping baby.', q: 'Who did Sam not want to wake?', opts: ['👶', '🐶', '👵'], a: 0 },
      { text: 'Lena’s wellies were muddy and her coat was soaked.', q: 'Where had Lena been playing?', opts: ['🌧️', '🛏️', '🏫'], a: 0 },
      { text: 'The museum was enormous — Max could not see everything in one day.', q: 'What does “enormous” mean?', opts: ['very big', 'very old', 'very dark'], a: 0, wordOpts: true },
      { text: 'Aisha was exhausted after swimming fifty lengths of the pool.', q: 'What does “exhausted” mean?', opts: ['very tired', 'very fast', 'very cold'], a: 0, wordOpts: true },
    ],
  },
  {
    level: 9, band: 'Purple',
    items: [
      { text: 'Kofi held the tiny shell in his palm. It shimmered like a rainbow.', q: 'What does “shimmered” mean?', opts: ['shone', 'hid', 'broke'], a: 0, wordOpts: true },
      { text: 'The whole class cheered when Mr Hill announced a trip to the zoo.', q: 'Why did the class cheer?', opts: ['🦁', '📚', '🧹'], a: 0 },
      { text: 'Without a torch, the cave was pitch black.', q: 'What does “pitch black” mean?', opts: ['very dark', 'very noisy', 'very cold'], a: 0, wordOpts: true },
      { text: 'Amara stared at her wobbly tooth. She did not want to pull it out.', q: 'How did Amara feel?', opts: ['😰', '😄', '😋'], a: 0 },
      { text: 'The parcel was so fragile that Dad carried it with two hands.', q: 'What does “fragile” mean?', opts: ['breaks easily', 'very heavy', 'brand new'], a: 0, wordOpts: true },
    ],
  },
];

// ---------------- fractions (7+ stretch: Y2–Y3) ----------------
// f = decimal fill of the pie visual; s = spoken name for TTS.
export const FRACTION_META = {
  '1/4': { f: 0.25, s: 'one quarter' },
  '1/2': { f: 0.5, s: 'one half' },
  '3/4': { f: 0.75, s: 'three quarters' },
  '1/3': { f: 1 / 3, s: 'one third' },
  '2/3': { f: 2 / 3, s: 'two thirds' },
  '2/4': { f: 0.5, s: 'two quarters' },
  '3/6': { f: 0.5, s: 'three sixths' },
  '4/8': { f: 0.5, s: 'four eighths' },
  '2/6': { f: 1 / 3, s: 'two sixths' },
  '2/8': { f: 0.25, s: 'two eighths' },
  '6/8': { f: 0.75, s: 'six eighths' },
  '4/6': { f: 2 / 3, s: 'four sixths' },
};
// Levels 1–2 use pie visuals with DISTINCT fill amounts so there is never ambiguity.
export const FRACTION_LEVELS = {
  1: ['1/4', '1/2', '3/4'],
  2: ['1/4', '1/3', '1/2', '2/3', '3/4'],
};
// Level 3: equivalent pairs (the actual 7+ skill).
export const FRACTION_EQUIV = [
  ['1/2', '2/4'], ['1/2', '3/6'], ['1/2', '4/8'],
  ['1/3', '2/6'], ['1/4', '2/8'], ['3/4', '6/8'], ['2/3', '4/6'],
];

// ---------------- reasoning (7+ verbal & non-verbal) ----------------
// Named shapes so patterns can be spoken aloud.
export const REASON_SHAPES = [
  { e: '🔴', n: 'red circle' }, { e: '🟠', n: 'orange circle' },
  { e: '🟡', n: 'yellow circle' }, { e: '🟢', n: 'green circle' },
  { e: '🔵', n: 'blue circle' }, { e: '🟣', n: 'purple circle' },
  { e: '⭐', n: 'star' }, { e: '❤️', n: 'heart' },
];

// Level 2: odd one out (odd is always the LAST entry in items).
export const ODD_ONE_OUT = [
  { items: ['🍎', '🍌', '🍇', '🐶'], names: 'apple, banana, grapes, dog' },
  { items: ['🚗', '🚌', '🚲', '🍕'], names: 'car, bus, bike, pizza' },
  { items: ['🐱', '🐶', '🐰', '🌳'], names: 'cat, dog, rabbit, tree' },
  { items: ['⚽', '🏀', '🎾', '🎸'], names: 'football, basketball, tennis ball, guitar' },
  { items: ['🥛', '🧃', '💧', '🍞'], names: 'milk, juice, water, bread' },
  { items: ['👟', '🥾', '🧦', '🧤'], names: 'shoe, boot, sock, glove' },
  { items: ['🦁', '🐯', '🐘', '🐟'], names: 'lion, tiger, elephant, fish' },
  { items: ['🌞', '⭐', '🌙', '🍎'], names: 'sun, star, moon, apple' },
];

// Things that belong together — used for match rounds in reasoning.
export const GO_TOGETHER = [
  ['🐶', '🦴'], ['🐱', '🐟'], ['🐰', '🥕'], ['🐝', '🍯'], ['🐦', '🪺'], ['🐔', '🥚'],
  ['🌧️', '☂️'], ['❄️', '🧥'], ['✏️', '📖'], ['🦷', '🪥'], ['⚽', '🥅'], ['🔒', '🔑'],
];

// Level 3: picture analogies. strip is shown; qSpeak is read aloud.
export const ANALOGIES = [
  { strip: '🐶 ➜ 🦴 &nbsp;•&nbsp; 🐱 ➜ ?', qSpeak: 'A dog loves a bone. What does a cat love?', ans: '🐟', opts: ['🐟', '🧀', '⚽'] },
  { strip: '🐦 ➜ 🪺 &nbsp;•&nbsp; 🐝 ➜ ?', qSpeak: 'A bird makes a nest. What does a bee make?', ans: '🍯', opts: ['🍯', '🏠', '🚗'] },
  { strip: '🌧️ ➜ ☂️ &nbsp;•&nbsp; ❄️ ➜ ?', qSpeak: 'When it rains, we use an umbrella. What do we wear when it snows?', ans: '🧥', opts: ['🧥', '🕶️', '🩴'] },
  { strip: '✋ ➜ 🧤 &nbsp;•&nbsp; 🦶 ➜ ?', qSpeak: 'A glove goes on a hand. What goes on a foot?', ans: '🧦', opts: ['🧦', '🎩', '👑'] },
  { strip: '🐄 ➜ 🥛 &nbsp;•&nbsp; 🐔 ➜ ?', qSpeak: 'A cow gives us milk. What does a hen give us?', ans: '🥚', opts: ['🥚', '🍞', '🧀'] },
  { strip: '🌱 ➜ 🌳 &nbsp;•&nbsp; 🥚 ➜ ?', qSpeak: 'A seed grows into a tree. What hatches from an egg?', ans: '🐔', opts: ['🐔', '🍳', '🐟'] },
];
