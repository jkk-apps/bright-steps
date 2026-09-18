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
