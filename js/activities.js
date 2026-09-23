// ---------------------------------------------------------------------------
// Activity engine: generates a question for (skill, level, method) and runs
// sessions of rounds with feedback, stars and adaptive level changes.
//
// Question shapes (rendered by generic renderers):
//   choice: { type, prompt:{html,speak,text}, options:[{html,cls,value}], answer }
//   match:  { type, prompt:{text,speak}, pairs:[{left:{html,cls}, right:{html,cls}}] }
//   hunt:   { type, prompt:{html,speak,text}, tiles:[{html, match}] }
//   build:  { type, prompt:{html,speak,text}, tiles:[str], answer:[str] }
// ---------------------------------------------------------------------------

import {
  SKILLS, NUM_EMOJI, LETTER_LEVELS, LETTER_EMOJI, WORD_LEVELS, WORD_EMOJI,
  COLOURS, COLOUR_LEVELS, READING_BANDS, EMOJI_POOL,
  NOTE_COLOURS, NOTE_TEXT, PIANO_OCTAVES, PIANO_LEVEL_NOTES, LANG_CONTENT, LANG_METHOD_GATES,
  FRACTION_META, FRACTION_LEVELS, FRACTION_EQUIV,
  REASON_SHAPES, ODD_ONE_OUT, GO_TOGETHER, ANALOGIES,
} from './data.js';
import { METHOD_META, recordResult, pickMethod, getLevel, activeProfile } from './engine.js';
import { speak, speakSeq, stopSpeak, speechAvailable } from './speech.js';
import { playNote, playNotes, audioReady } from './audio.js';

// ---------- small helpers ----------
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const sample = (a, n) => shuffle(a).slice(0, n);
const spkBtn = (text, big = false, lang = null) =>
  text ? `<button class="speaker${big ? ' big' : ''}" data-say="${encodeURIComponent(text)}"${lang ? ` data-lang="${lang}"` : ''} aria-label="Hear it">🔊</button>` : '';

// span version for use INSIDE option buttons (nested <button> is invalid HTML)
const spkMini = (text, lang = null) =>
  text ? `<span class="speaker mini-spk" data-say="${encodeURIComponent(text)}"${lang ? ` data-lang="${lang}"` : ''} role="button" aria-label="Hear it">🔊</span>` : '';

// Makes an element replay its spoken instruction when tapped
const speakable = (text, lang = null) =>
  text ? ` class="speakable" data-say="${encodeURIComponent(text)}"${lang ? ` data-lang="${lang}"` : ''}` : '';

// Auto-speak a prompt: bilingual sequence if present, else plain/lang speech
function speakPrompt(p) {
  if (!p) return;
  if (p.speakSeq) speakSeq(p.speakSeq);
  else if (p.speak) speak(p.speak, { lang: p.lang });
}

function nav(where) {
  stopSpeak();
  window.dispatchEvent(new CustomEvent('brightsteps:nav', { detail: where }));
}

// ---------- shared builders ----------
function answerOptions(ans, count = 3) {
  const set = new Set([ans]);
  for (const d of shuffle([1, -1, 2, -2, 3, -3, 10, -10, 100, -100])) {
    if (set.size >= count) break;
    const v = ans + d;
    if (v >= 0 && !set.has(v)) set.add(v);
  }
  let extra = ans + 4;
  while (set.size < count) { if (!set.has(extra)) set.add(extra); extra++; }
  return shuffle([...set]).map(v => ({ html: `${v}`, value: v }));
}

// Numbers shown as real circled groups of ten items + loose ones —
// no abstract key needed: children can see ten inside every circle and
// simply count in tens (10, 20, 30...) then count on the ones.
function blocksFor(n, big = false) {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10), ones = n % 10;
  const size = big ? (n > 12 ? '1rem' : '2.6rem') : (n > 12 ? '0.7rem' : '1.3rem');
  let s = '';
  if (hundreds) {
    // 10×10 "hundred flats" — the place-value blocks children use at school
    for (let i = 0; i < hundreds; i++) s += '<span class="hundred-flat"></span>';
  }
  if (tens) {
    const emo = pick(NUM_EMOJI);
    for (let i = 0; i < tens; i++) {
      s += `<span class="ten-group">${emo.repeat(10)}</span>`;
    }
  }
  if (ones) s += `<span class="ones-group">${pick(NUM_EMOJI).repeat(ones)}</span>`;
  if (!s) s = '<span style="font-size:1.1rem;color:#999">(none)</span>';
  return `<span class="mini" style="font-size:${size};line-height:1.9;display:inline-block;max-width:${big ? '640px' : '300px'}">${s}</span>`;
}

// ---------- numbers ----------
function numberPool(level) {
  if (level === 4) return [10, 20, 30, 40, 50, 60, 70, 80, 90];
  if (level === 6) return [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const ranges = { 1: [1, 5], 2: [0, 9], 3: [10, 20], 5: [0, 99] };
  const [a, b] = ranges[level];
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function genNumbers(level, method) {
  const pool = numberPool(level);
  const target = pick(pool);

  if (method === 'look') {
    return {
      type: 'choice',
      prompt: {
        html: `<div class="emoji-row">${blocksFor(target, true)}</div>`,
        text: 'How many can you see?',
        speak: level >= 4 ? 'How many? Count in tens!' : 'How many can you see?',
      },
      options: answerOptions(target), answer: target,
    };
  }
  if (method === 'hear') {
    return {
      type: 'choice',
      prompt: { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap!', speak: `Tap the number ${target}.` },
      options: answerOptions(target), answer: target,
    };
  }
  if (method === 'match') {
    const nums = sample(pool, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each number to its amount!', speak: 'Match the numbers to the amounts.' },
      pairs: nums.map(n => ({ left: { html: `${n}` }, right: { html: blocksFor(n) } })),
    };
  }
  // play → number hunt
  const others = pool.filter(n => n !== target);
  const tiles = shuffle([
    ...[0, 1, 2].map(() => ({ html: `${target}`, match: true })),
    ...sample(others, Math.min(6, others.length)).map(n => ({ html: `${n}`, match: false })),
  ]);
  return { type: 'hunt', prompt: { speak: `Tap every number ${target}.`, text: `Tap all the ${target}s!` }, tiles };
}

// ---------- maths ----------
function makeEq(level) {
  let a, b, op;
  if (level === 1) { a = rand(1, 4); b = rand(1, 5 - a); op = '+'; }
  else if (level === 2) { a = rand(1, 9); b = rand(0, 10 - a); op = '+'; }
  else if (level === 3) { a = rand(2, 10); b = rand(1, a); op = '−'; }
  else if (level === 4) {
    if (Math.random() < 0.5) { a = rand(2, 15); b = rand(1, 20 - a); op = '+'; }
    else { a = rand(5, 20); b = rand(1, a); op = '−'; }
  } else if (level === 5) {
    a = pick([2, 5, 10]); b = rand(1, 5);
    if (Math.random() < 0.5) [a, b] = [b, a];
    op = '×';
  } else if (level === 6) {
    b = pick([2, 5, 10]);
    const ans = rand(1, 5);
    return { a: b * ans, b, op: '÷', ans, text: `${b * ans} ÷ ${b}`, speak: `What is ${b * ans} divided by ${b}?` };
  } else if (level === 7) { // missing number
    a = rand(1, 9);
    const ans = rand(1, 10 - a);
    const c = a + ans;
    if (Math.random() < 0.5) return { a, b: ans, op: '+', ans, missing: true, text: `${a} + ? = ${c}`, speak: `${a} add what makes ${c}?` };
    return { a: c, b: ans, op: '−', ans, missing: true, text: `${c} − ? = ${a}`, speak: `${c} take away what makes ${a}?` };
  } else if (level === 8) { // 7+ stretch: ± to 100
    if (Math.random() < 0.5) { a = rand(15, 80); b = rand(11, 99 - a); op = '+'; }
    else { a = rand(30, 99); b = rand(11, a - 10); op = '−'; }
  } else if (level === 9) { // ± to 1000, in tens and hundreds (mental maths)
    const u = pick([10, 10, 100]);
    if (Math.random() < 0.5) {
      a = rand(2, Math.floor(900 / u)) * u;
      b = rand(1, Math.floor((1000 - a) / u)) * u;
      op = '+';
    } else {
      a = rand(3, Math.floor(990 / u)) * u;
      b = rand(1, Math.floor((a - u) / u)) * u;
      op = '−';
    }
  } else if (level === 10) { // times 3, 4, 6
    a = pick([3, 4, 6]); b = rand(2, 9);
    if (Math.random() < 0.5) [a, b] = [b, a];
    op = '×';
  } else if (level === 11) { // times 7 to 12 (up to 12×12)
    a = pick([7, 8, 9, 11, 12]); b = rand(2, 12);
    if (Math.random() < 0.5) [a, b] = [b, a];
    op = '×';
  } else if (level === 12) { // divide using any table to 12
    b = rand(2, 12);
    const ans = rand(2, 12);
    return { a: b * ans, b, op: '÷', ans, text: `${b * ans} ÷ ${b}`, speak: `What is ${b * ans} divided by ${b}?` };
  } else { // level 13: mixed review — anything from levels 8–12, plus bigger missing numbers
    if (Math.random() < 0.3) {
      a = rand(2, 9) * pick([1, 10]);
      const ans = rand(2, 9) * pick([1, 10]);
      const c = a + ans;
      if (Math.random() < 0.5) return { a, b: ans, op: '+', ans, missing: true, text: `${a} + ? = ${c}`, speak: `${a} add what makes ${c}?` };
      return { a: c, b: ans, op: '−', ans, missing: true, text: `${c} − ? = ${a}`, speak: `${c} take away what makes ${a}?` };
    }
    return makeEq(rand(8, 12));
  }
  const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
  const word = op === '+' ? 'add' : op === '−' ? 'take away' : 'times';
  return { a, b, op, ans, text: `${a} ${op} ${b}`, speak: `What is ${a} ${word} ${b}?` };
}

function eqVisual(e) {
  if (e.missing || e.a > 12 || e.b > 12) return '';
  const emo = pick(NUM_EMOJI);
  if (e.op === '+') return `<div class="emoji-row" style="font-size:1.8rem">${emo.repeat(e.a)} ➕ ${emo.repeat(e.b)}</div>`;
  if (e.op === '−') return `<div class="emoji-row" style="font-size:1.8rem">${emo.repeat(e.a - e.b)}<span style="opacity:.35;text-decoration:line-through">${emo.repeat(e.b)}</span></div>`;
  if (e.op === '×' && e.a * e.b <= 20) {
    const groups = [];
    for (let i = 0; i < e.a; i++) groups.push(emo.repeat(e.b));
    return `<div class="emoji-row" style="font-size:1.4rem">${groups.join(' · ')}</div>`;
  }
  return '';
}

function genMaths(level, method) {
  if (level >= 14) return genWordProblem(level, method); // money / measure & two-step
  const eq = makeEq(level);

  if (method === 'look' || method === 'hear') {
    const prompt = method === 'look'
      ? { html: `<div class="big-letter" style="font-size:3.2rem">${eq.text}${eq.missing ? '' : ' = ?'}</div>${eqVisual(eq)}`, text: 'What is the answer?', speak: eq.speak }
      : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the answer!', speak: eq.speak };
    return { type: 'choice', prompt, options: answerOptions(eq.ans), answer: eq.ans };
  }
  if (method === 'match') {
    const eqs = []; const texts = new Set(); let guard = 0;
    while (eqs.length < 3 && guard++ < 300) {
      const e = makeEq(level);
      if (!texts.has(e.text)) { texts.add(e.text); eqs.push(e); }
    }
    return {
      type: 'match',
      prompt: { text: 'Match each sum to its answer!', speak: 'Match the sums to the answers.' },
      pairs: eqs.map(e => ({ left: { html: `${e.text}${e.missing ? '' : ' = ?'}`, cls: 'sentence-mini' }, right: { html: `${e.ans}` } })),
    };
  }
  // play → hunt all equations equal to a target
  let base = makeEq(level), guard = 0;
  while (base.missing && guard++ < 50) base = makeEq(level);
  if (base.missing) return genMaths(level, 'look');
  const target = base.ans;
  const texts = new Set([base.text]);
  const matchTiles = [{ html: base.text, match: true }];
  guard = 0;
  while (matchTiles.length < 3 && guard++ < 400) {
    const e = makeEq(level);
    if (!e.missing && e.ans === target && !texts.has(e.text)) { texts.add(e.text); matchTiles.push({ html: e.text, match: true }); }
  }
  if (matchTiles.length < 3) return genMaths(level, 'look');
  const otherTiles = []; guard = 0;
  while (otherTiles.length < 6 && guard++ < 400) {
    const e = makeEq(level);
    if (e.ans !== target && !texts.has(e.text)) { texts.add(e.text); otherTiles.push({ html: e.text, match: false }); }
  }
  if (otherTiles.length < 6) return genMaths(level, 'look');
  return {
    type: 'hunt',
    prompt: { speak: `Tap all the sums that make ${target}.`, text: `Tap all the sums that make ${target}!` },
    tiles: shuffle([...matchTiles, ...otherTiles]),
  };
}

// ---------- word problems (7+ style: money, measure, two-step) ----------
const WP_NAMES = ['Sam', 'Mia', 'Lily', 'Tom', 'Ava', 'Kofi', 'Ruby', 'Max'];
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const WP_ITEMS = [
  { n: 'apple' }, { n: 'lolly' }, { n: 'pencil' }, { n: 'juice box' },
  { n: 'biscuit' }, { n: 'balloon' }, { n: 'banana' }, { n: 'sticker' },
];

// 4 answer labels: the correct one + near-value distractors, rendered by `fmt`
function labelOptions(correct, deltas, fmt) {
  const set = new Set([correct]);
  for (const d of shuffle(deltas)) {
    if (set.size >= 4) break;
    const v = correct + d;
    if (v > 0 && !set.has(v)) set.add(v);
  }
  let extra = correct + 3;
  while (set.size < 4) { set.add(extra); extra += 3; }
  return shuffle([...set]).map(fmt);
}

function makeMoneyProblem() {
  const who = pick(WP_NAMES), item = pick(WP_ITEMS);
  const kind = pick(['coins', 'change', 'many']);
  if (kind === 'coins') {
    const coin = pick([2, 5, 10, 20]);
    const k = rand(2, 5);
    const total = coin * k;
    return {
      story: `${who} has ${k} coins of ${coin}p. How much is that altogether?`,
      speak: `${who} has ${NUM_WORDS[k]} ${coin} p coins. How much money is that altogether?`,
      options: labelOptions(total, [10, -10, 5, -5, 2, -2, 20], v => `${v}p`),
      answer: `${total}p`,
    };
  }
  if (kind === 'change') {
    const price = pick([15, 20, 25, 30, 35, 40, 60, 70]);
    const pay = price < 50 ? 50 : 100;
    return {
      story: `A ${item.n} costs ${price}p. ${who} pays with ${pay === 100 ? '£1' : 'a 50p coin'}. How much change does ${who} get?`,
      speak: `A ${item.n} costs ${price} p. ${who} pays with ${pay === 100 ? 'one pound' : 'a fifty p coin'}. How much change does ${who} get?`,
      options: labelOptions(pay - price, [10, -10, 5, -5, 20, -20], v => `${v}p`),
      answer: `${pay - price}p`,
    };
  }
  const price = pick([10, 20, 30]);
  const k = rand(2, 4);
  return {
    story: `One ${item.n} costs ${price}p. How much do ${NUM_WORDS[k]} ${item.n}s cost?`,
    speak: `One ${item.n} costs ${price} p. How much do ${NUM_WORDS[k]} ${item.n}s cost?`,
    options: labelOptions(price * k, [price, -price, 10, -10, 5, -5], v => `${v}p`),
    answer: `${price * k}p`,
  };
}

function makeMeasureProblem() {
  const who = pick(WP_NAMES);
  const kind = pick(['length', 'time', 'capacity', 'twostep']);
  if (kind === 'length') {
    const len = pick([5, 10, 20]);
    const k = rand(2, 4);
    return {
      story: `A pencil is ${len} cm long. How long are ${NUM_WORDS[k]} pencils placed end to end?`,
      speak: `A pencil is ${len} centimetres long. How long are ${NUM_WORDS[k]} pencils placed end to end?`,
      options: labelOptions(len * k, [len, -len, 5, -5, 10, -10], v => `${v} cm`),
      answer: `${len * k} cm`,
    };
  }
  if (kind === 'time') {
    const start = rand(1, 5);
    const dur = pick([1, 2, 3]);
    return {
      story: `The film starts at ${start} o'clock. It is ${NUM_WORDS[dur]} hour${dur > 1 ? 's' : ''} long. What time does it end?`,
      speak: `The film starts at ${start} o'clock. It is ${NUM_WORDS[dur]} hour${dur > 1 ? 's' : ''} long. What time does it end?`,
      options: labelOptions(start + dur, [1, -1, 2, -2], v => `${v} o'clock`),
      answer: `${start + dur} o'clock`,
    };
  }
  if (kind === 'capacity') {
    const cup = pick([100, 200, 250]);
    return {
      story: `A cup holds ${cup} ml. How much do two cups hold altogether?`,
      speak: `A cup holds ${cup} millilitres. How much do two cups hold altogether?`,
      options: labelOptions(cup * 2, [100, -100, 50, -50, cup / 2, -cup / 2], v => `${v} ml`),
      answer: `${cup * 2} ml`,
    };
  }
  // two-step: multiply then subtract — the classic 7+ extension question
  const bags = rand(2, 4);
  const per = pick([2, 5, 10]);
  const eaten = rand(1, per);
  const left = bags * per - eaten;
  return {
    story: `${who} has ${NUM_WORDS[bags]} bags with ${per} sweets in each bag. ${who} eats ${NUM_WORDS[eaten]} sweet${eaten > 1 ? 's' : ''}. How many sweets are left?`,
    speak: `${who} has ${NUM_WORDS[bags]} bags with ${per} sweets in each bag. ${who} eats ${NUM_WORDS[eaten]}. How many sweets are left?`,
    options: labelOptions(left, [1, -1, 2, -2, per, -per, 10, -10], v => `${v}`),
    answer: `${left}`,
  };
}

function genWordProblem(level, method) {
  const make = level === 14 ? makeMoneyProblem : makeMeasureProblem;
  if (method === 'match') {
    const probs = []; const seen = new Set(); let guard = 0;
    while (probs.length < 3 && guard++ < 200) {
      const p = make();
      if (!seen.has(p.story)) { seen.add(p.story); probs.push(p); }
    }
    return {
      type: 'match',
      prompt: { text: 'Match each problem to its answer!', speak: 'Listen to each problem, then match it to the answer.' },
      pairs: probs.map(p => ({ left: { html: p.story, cls: 'sentence-mini', say: p.speak }, right: { html: p.answer } })),
    };
  }
  const p = make();
  const options = p.options.map(v => ({ html: v, value: v, cls: 'word-option' }));
  // look + play: problem card is on screen AND read aloud (tappable to replay).
  // hear: audio only, like a mental maths question.
  const prompt = method === 'hear'
    ? { html: '<div class="big-letter">👂</div>', text: 'Listen carefully, then tap the answer!', speak: p.speak }
    : {
        html: `<div class="sentence-card speakable" data-say="${encodeURIComponent(p.speak)}">${p.story} ${spkBtn(p.speak)}</div>`,
        text: 'Solve the problem, then tap the answer!',
        speak: p.speak,
      };
  return { type: 'choice', prompt, options, answer: p.answer };
}

// ---------- letters ----------
function genLetters(level, method) {
  const pool = LETTER_LEVELS[level].split('');
  const target = pick(pool);
  const others = pool.filter(l => l !== target);

  if (method === 'look') {
    const upper = level >= 5 && Math.random() < 0.5;
    const options = shuffle([target, ...sample(others, 3)])
      .map(l => ({ html: upper ? l.toUpperCase() : l, value: l }));
    return {
      type: 'choice',
      prompt: {
        html: `<div class="big-letter">${upper ? target.toUpperCase() : target}</div>`,
        text: 'Find the matching letter!', speak: `Find the letter ${target}.`,
      },
      options, answer: target,
    };
  }
  if (method === 'hear') {
    const options = shuffle([target, ...sample(others, 3)]).map(l => ({ html: l, value: l }));
    return {
      type: 'choice',
      prompt: { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the letter!', speak: `Tap the letter ${target}.` },
      options, answer: target,
    };
  }
  if (method === 'match') {
    if (level >= 5) {
      const letters = sample(pool, 3);
      return {
        type: 'match',
        prompt: { text: 'Match the big and small letters!', speak: 'Match the big letters to the small letters.' },
        pairs: letters.map(l => ({ left: { html: l.toUpperCase() }, right: { html: l } })),
      };
    }
    const letters = sample(pool.filter(l => LETTER_EMOJI[l]), 3);
    return {
      type: 'match',
      prompt: { text: 'Match each letter to its picture!', speak: 'Match the letters to the pictures.' },
      pairs: letters.map(l => ({ left: { html: l }, right: { html: LETTER_EMOJI[l] } })),
    };
  }
  // play → letter hunt
  const useUpper = level >= 5 && Math.random() < 0.5;
  const show = l => (useUpper ? l.toUpperCase() : l);
  const tiles = shuffle([
    ...[0, 1, 2].map(() => ({ html: show(target), match: true })),
    ...sample(others, 6).map(l => ({ html: show(l), match: false })),
  ]);
  return { type: 'hunt', prompt: { speak: `Tap all the letter ${target}.`, text: `Tap all the '${show(target)}' letters!` }, tiles };
}

// ---------- SATPIN words ----------
function genWords(level, method) {
  const pool = WORD_LEVELS[level];
  const withEmoji = pool.filter(w => WORD_EMOJI[w]);

  if (method === 'look') {
    // read the word (no audio giveaway), then choose the matching picture
    const target = pick(withEmoji);
    const options = shuffle([target, ...sample(withEmoji.filter(w => w !== target), 2)])
      .map(w => ({ html: WORD_EMOJI[w], value: w }));
    return {
      type: 'choice',
      prompt: { html: `<div class="word">${target}</div>`, text: 'Sound it out, then tap the picture!', speak: 'Sound out the word, then tap the picture.' },
      options, answer: target,
    };
  }
  if (method === 'hear') {
    const target = pick(pool);
    const sameLen = pool.filter(w => w !== target && w.length === target.length);
    const distract = sample(sameLen.length >= 2 ? sameLen : pool.filter(w => w !== target), 2);
    const options = shuffle([target, ...distract]).map(w => ({ html: w, value: w, cls: 'word-option' }));
    return {
      type: 'choice',
      prompt: { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the word!', speak: `Tap the word ${target}.` },
      options, answer: target,
    };
  }
  if (method === 'match') {
    const words = sample(withEmoji, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each word to its picture!', speak: 'Read each word and match it to the picture.' },
      pairs: words.map(w => ({ left: { html: w, cls: 'sentence-mini' }, right: { html: WORD_EMOJI[w] } })),
    };
  }
  // play → build the word from letter tiles
  const target = pick(pool);
  return {
    type: 'build',
    prompt: {
      html: WORD_EMOJI[target] ? `<div class="emoji-row">${WORD_EMOJI[target]}</div>` : '<div class="big-letter">👂</div>',
      speak: `Spell the word ${target}.`,
      text: 'Tap the letters to build the word!',
    },
    tiles: target.split(''), answer: target.split(''),
  };
}

// ---------- colours ----------
function genColours(level, method) {
  const names = COLOUR_LEVELS[level];
  const swatch = n => `<span class="swatch" style="background:${COLOURS[n]}"></span>`;
  const target = pick(names);

  if (method === 'look' || method === 'hear') {
    const options = shuffle([target, ...sample(names.filter(n => n !== target), 3)])
      .map(n => ({ html: swatch(n), value: n, cls: 'swatch-option' }));
    const prompt = method === 'look'
      ? {
          // the word is always plain dark grey — never printed in its own colour,
          // so the child can't just match the ink to the swatch
          html: `<div class="word" style="color:#333">${target}</div>`,
          text: 'Find this colour!', speak: `Find the colour ${target}.`,
        }
      : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the colour!', speak: `Tap the colour ${target}.` };
    return { type: 'choice', prompt, options, answer: target };
  }
  if (method === 'match') {
    const cols = sample(names, 3);
    return {
      type: 'match',
      prompt: {
        text: level >= 4 ? 'Match each colour to its name!' : 'Match the same colours!',
        speak: level >= 4 ? 'Match the colours to their names.' : 'Match the colours that are the same.',
      },
      pairs: cols.map(n => (level >= 4
        ? { left: { html: swatch(n) }, right: { html: n, cls: 'sentence-mini' } }
        : { left: { html: swatch(n) }, right: { html: swatch(n) } })),
    };
  }
  // play → colour hunt
  const otherNames = names.filter(n => n !== target);
  const tiles = shuffle([
    ...[0, 1, 2].map(() => ({ html: swatch(target), match: true })),
    ...[0, 1, 2, 3, 4, 5].map(() => ({ html: swatch(pick(otherNames)), match: false })),
  ]);
  return { type: 'hunt', prompt: { speak: `Tap all the ${target} ones.`, text: `Tap all the ${target} ones!` }, tiles };
}

// ---------- reading (UK book bands) ----------
function genReading(level, method) {
  const band = READING_BANDS[level - 1];
  const item = pick(band.items);

  if (band.wordless) {
    if (method === 'match') {
      return {
        type: 'match',
        prompt: { text: 'Match the same pictures!', speak: 'Match the pictures that are the same.' },
        pairs: item.opts.map(e => ({ left: { html: e }, right: { html: e } })),
      };
    }
    if (method === 'play') {
      const tgt = item.opts[item.a];
      const others = EMOJI_POOL.filter(e => !item.opts.includes(e));
      const tiles = shuffle([
        ...[0, 1, 2].map(() => ({ html: tgt, match: true })),
        ...sample(others, 6).map(e => ({ html: e, match: false })),
      ]);
      return { type: 'hunt', prompt: { speak: item.huntSpeak, text: item.huntSpeak }, tiles };
    }
    const options = shuffle(item.opts.map((e, i) => ({ html: e, value: i })));
    return { type: 'choice', prompt: { html: `<div class="emoji-row">${item.scene}</div>`, text: item.q, speak: item.q }, options, answer: item.a };
  }

  if (method === 'match') {
    const items = sample(band.items, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each sentence to its answer!', speak: 'Read each sentence and match it to the answer.' },
      pairs: items.map(it => ({
        left: { html: it.text, cls: 'sentence-mini', say: it.text },
        right: { html: it.opts[it.a], cls: it.wordOpts ? 'sentence-mini' : '' },
      })),
    };
  }
  if (method === 'play' && level < 7) {
    const words = item.text.replace(/[.!?]$/, '').split(' ');
    return {
      type: 'build',
      prompt: { html: `<div class="emoji-row">${item.opts[item.a]}</div>`, speak: item.text, text: 'Listen, then build the sentence!' },
      tiles: words, answer: words,
    };
  }
  // play at Orange+ bands falls through to a comprehension question instead
  const options = shuffle(item.opts.map((e, i) => ({ html: e, value: i, cls: item.wordOpts ? 'word-option' : '' })));
  if (method === 'hear') {
    return {
      type: 'choice',
      prompt: { html: '<div class="big-letter">👂</div>', text: item.q, speak: `${item.text} ${item.q}` },
      options, answer: item.a,
    };
  }
  // look: child reads the sentence (audio only on request); the question is spoken.
  // The sentence card itself is tappable to hear the sentence read aloud.
  return {
    type: 'choice',
    prompt: { html: `<div class="sentence-card speakable" data-say="${encodeURIComponent(item.text)}">${item.text} ${spkBtn(item.text)}</div>`, text: item.q, speak: item.q },
    options, answer: item.a,
  };
}

// ---------- fractions (7+ stretch) ----------
// Pie visual: conic-gradient fills exactly the fraction — no ambiguity.
const fracPie = f => `<span class="frac-pie" style="--fill:${Math.round(f * 100)}%"></span>`;
// Stacked fraction notation with a vinculum line, like real 7+ papers.
const fracTxt = s => {
  const [n, d] = s.split('/');
  return `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
};

function genFractions(level, method) {
  if (level === 3) return genFractionEquiv(method);
  const names = FRACTION_LEVELS[level];
  const target = pick(names);

  if (method === 'match') {
    const three = sample(names, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each fraction to its pie!', speak: 'Match the fractions to the pies.' },
      pairs: three.map(n => ({ left: { html: fracTxt(n) }, right: { html: fracPie(FRACTION_META[n].f) } })),
    };
  }
  if (method === 'play') {
    const others = names.filter(n => n !== target);
    const tiles = shuffle([
      ...[0, 1, 2].map(() => ({ html: fracPie(FRACTION_META[target].f), match: true })),
      ...Array.from({ length: 6 }, () => ({ html: fracPie(FRACTION_META[pick(others)].f), match: false })),
    ]);
    return {
      type: 'hunt',
      prompt: { speak: `Tap all the pies showing ${FRACTION_META[target].s}.`, text: `Tap all the ${target}s!` },
      tiles,
    };
  }
  // look: notation shown; hear: spoken only. Both choose the matching pie.
  const opts = shuffle([target, ...sample(names.filter(n => n !== target), 2)]);
  const prompt = method === 'look'
    ? { html: `<div class="big-letter" style="font-size:3rem">${fracTxt(target)}</div>`, text: 'Tap the matching pie!', speak: `Tap the pie that shows ${FRACTION_META[target].s}.` }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the pie!', speak: `Tap the pie that shows ${FRACTION_META[target].s}.` };
  return { type: 'choice', prompt, options: opts.map(n => ({ html: fracPie(FRACTION_META[n].f), value: n })), answer: target };
}

function genFractionEquiv(method) {
  const pair = pick(FRACTION_EQUIV);
  const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
  const all = [...new Set(FRACTION_EQUIV.flat())];
  const wrongPool = all.filter(n => n !== a && n !== b && FRACTION_META[n].f !== FRACTION_META[a].f);

  if (method === 'match') {
    const three = sample(FRACTION_EQUIV, 3);
    return {
      type: 'match',
      prompt: { text: 'Match the fractions that are equal!', speak: 'Match the fractions that mean the same amount.' },
      pairs: three.map(p => {
        const [x, y] = Math.random() < 0.5 ? p : [p[1], p[0]];
        return { left: { html: fracTxt(x) }, right: { html: fracTxt(y) } };
      }),
    };
  }
  if (method === 'play') {
    const equals = all.filter(n => FRACTION_META[n].f === FRACTION_META[a].f);
    const tiles = shuffle([
      ...sample(equals, Math.min(3, equals.length)).map(n => ({ html: fracTxt(n), match: true })),
      ...sample(wrongPool, 6).map(n => ({ html: fracTxt(n), match: false })),
    ]);
    return {
      type: 'hunt',
      prompt: { speak: `Tap every fraction equal to ${FRACTION_META[a].s}.`, text: `Tap all the fractions equal to ${a}!` },
      tiles,
    };
  }
  const options = shuffle([b, ...sample(wrongPool, 2)]).map(n => ({ html: fracTxt(n), value: n, cls: 'frac-option' }));
  const prompt = method === 'look'
    ? { html: `<div class="big-letter" style="font-size:2.6rem">${fracTxt(a)} = ?</div>`, text: 'Tap the fraction that is equal!', speak: `Which fraction equals ${FRACTION_META[a].s}?` }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap!', speak: `Tap the fraction that equals ${FRACTION_META[a].s}.` };
  return { type: 'choice', prompt, options, answer: b };
}

// ---------- reasoning (7+ verbal & non-verbal) ----------
function makePattern() {
  const unit = sample(REASON_SHAPES, pick([2, 2, 3]));
  const strip = [...unit, ...unit, ...unit.slice(0, rand(0, unit.length - 1))];
  const next = unit[strip.length % unit.length];
  return { strip, next, unit };
}

function genPattern(method) {
  if (method === 'match') {
    const pats = [makePattern(), makePattern(), makePattern()];
    return {
      type: 'match',
      prompt: { text: 'Match each pattern to what comes next!', speak: 'Say each pattern, then match it to the shape that comes next.' },
      pairs: pats.map(p => ({ left: { html: p.strip.map(s => s.e).join(' '), cls: 'sentence-mini' }, right: { html: p.next.e } })),
    };
  }
  if (method === 'play') {
    // build the next TWO items of the pattern from tiles
    // (build questions require tiles to be exactly the answer pieces — no distractors)
    const p = makePattern();
    const n2 = p.unit[(p.strip.length + 1) % p.unit.length];
    const tiles = shuffle([p.next, n2]).map(s => s.e);
    return {
      type: 'build',
      prompt: {
        html: `<div class="emoji-row">${p.strip.map(s => s.e).join(' ')} <b>➜ ?</b></div>`,
        text: 'Build the next two!',
        speak: `${p.strip.map(s => s.n).join(', ')}. Tap the next two shapes.`,
      },
      tiles, answer: [p.next.e, n2.e],
    };
  }
  const p = makePattern();
  const options = shuffle([p.next, ...sample(REASON_SHAPES.filter(s => s !== p.next), 2)])
    .map(s => ({ html: s.e, value: s.e }));
  const prompt = method === 'hear'
    ? { html: '<div class="big-letter">👂</div>', text: 'Listen to the pattern!', speak: `${p.strip.map(s => s.n).join(', ')}. What comes next?` }
    : { html: `<div class="emoji-row">${p.strip.map(s => s.e).join(' ')} <b>➜ ?</b></div>`, text: 'What comes next?', speak: `${p.strip.map(s => s.n).join(', ')}. What comes next?` };
  return { type: 'choice', prompt, options, answer: p.next.e };
}

function genOddOneOut(method) {
  if (method === 'match') {
    const pairs = sample(GO_TOGETHER, 3);
    return {
      type: 'match',
      prompt: { text: 'Match the things that go together!', speak: 'Match the things that go together.' },
      pairs: pairs.map(([a, b]) => ({ left: { html: a }, right: { html: b } })),
    };
  }
  const set = pick(ODD_ONE_OUT);
  const oddIdx = set.items.length - 1; // odd item is always stored last
  if (method === 'play') {
    const same = set.items.slice(0, oddIdx);
    const tiles = shuffle([
      { html: set.items[oddIdx], match: true },
      ...Array.from({ length: 8 }, () => ({ html: pick(same), match: false })),
    ]);
    return { type: 'hunt', prompt: { speak: 'Tap the one that does not belong!', text: 'Tap the odd one out!' }, tiles };
  }
  const options = shuffle(set.items.map((e, i) => ({ html: e, value: i })));
  const prompt = method === 'hear'
    ? { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the odd one out!', speak: `${set.names}. Which one does not belong?` }
    : { html: `<div class="emoji-row">${set.items.join(' ')}</div>`, text: 'Tap the odd one out!', speak: `${set.names}. Tap the odd one out.` };
  return { type: 'choice', prompt, options, answer: oddIdx };
}

function genAnalogy(method) {
  if (method === 'match') {
    const pairs = sample(GO_TOGETHER, 3);
    return {
      type: 'match',
      prompt: { text: 'Match the things that belong together!', speak: 'Match the things that belong together.' },
      pairs: pairs.map(([a, b]) => ({ left: { html: a }, right: { html: b } })),
    };
  }
  const an = pick(ANALOGIES);
  const options = shuffle(an.opts).map(e => ({ html: e, value: e }));
  const prompt = method === 'hear'
    ? { html: '<div class="big-letter">👂</div>', text: 'Listen carefully!', speak: an.qSpeak }
    : { html: `<div class="big-letter" style="font-size:2.4rem">${an.strip}</div>`, text: 'What finishes it?', speak: an.qSpeak };
  return { type: 'choice', prompt, options, answer: an.ans };
}

function makeSequence() {
  const A = 'abcdefghijklmnopqrstuvwxyz';
  const kind = pick(['num', 'num', 'let', 'code']);
  if (kind === 'let') {
    const step = pick([1, 2]);
    const start = rand(0, 26 - 4 * step - 1);
    const strip = [0, 1, 2, 3].map(i => A[start + i * step]);
    const next = A[start + 4 * step];
    const near = A.split('').filter(l => l !== next && Math.abs(A.indexOf(l) - (start + 4 * step)) <= 3);
    return {
      html: strip.join(' , '), speakText: strip.join(', '),
      options: shuffle([next, ...sample(near, 2)]).map(l => ({ html: l, value: l, cls: 'word-option' })),
      answer: next,
    };
  }
  if (kind === 'code') {
    const idx = rand(2, 7); // C .. H
    const letter = A[idx].toUpperCase();
    return {
      html: `A=1 , B=2 , C=3 … ${letter}=?`,
      speakText: `If A is 1, B is 2 and C is 3, what number is ${letter}?`,
      options: answerOptions(idx + 1), answer: idx + 1,
      plainSpeak: true,
    };
  }
  const step = pick([2, 3, 5, 10]);
  const start = rand(1, 10);
  const strip = [0, 1, 2, 3].map(i => start + i * step);
  const next = start + 4 * step;
  return { html: strip.join(' , '), speakText: strip.join(', '), options: answerOptions(next), answer: next };
}

function genSequence(method) {
  if (method === 'match') {
    const seqs = [makeSequence(), makeSequence(), makeSequence()];
    return {
      type: 'match',
      prompt: { text: 'Match each sequence to what comes next!', speak: 'Match each sequence to what comes next.' },
      pairs: seqs.map(s => ({ left: { html: s.html, cls: 'sentence-mini' }, right: { html: `${s.answer}` } })),
    };
  }
  const s = makeSequence();
  const sayText = s.plainSpeak ? s.speakText : `What comes next: ${s.speakText}?`;
  const prompt = method === 'hear'
    ? { html: '<div class="big-letter">👂</div>', text: 'What comes next?', speak: sayText }
    : { html: `<div class="big-letter" style="font-size:2.2rem">${s.html} <b>➜ ?</b></div>`, text: 'What comes next?', speak: sayText };
  return { type: 'choice', prompt, options: s.options, answer: s.answer };
}

function genReasoning(level, method) {
  if (level === 1) return genPattern(method);
  if (level === 2) return genOddOneOut(method);
  if (level === 3) return genAnalogy(method);
  return genSequence(method);
}

// ---------- dispatcher ----------
// ---------- languages (Spanish / French) ----------
function genLanguage(level, method, content) {
  const L = content.lang;
  const items = content.levels[level];
  const target = pick(items);
  const others = items.filter(i => i !== target);
  const visual = it => it.colour
    ? `<span class="swatch" style="background:${it.colour}"></span>`
    : (it.num != null ? `${it.num}` : it.emoji);
  const bigVisual = it => it.colour
    ? `<span class="swatch" style="background:${it.colour};width:110px;height:110px"></span>`
    : (it.num != null ? `<div class="emoji-row">${pick(NUM_EMOJI).repeat(it.num)}</div>` : `<div class="emoji-row">${it.emoji}</div>`);

  if (method === 'look') {
    // picture/count/colour shown; choose the matching word (options can be heard first)
    // level 1: just 2 choices so brand-new learners build confidence
    const options = shuffle([target, ...sample(others, level === 1 ? 1 : 2)]).map(it => ({
      html: `<span class="opt-word">${it.w}</span>${spkMini(it.w, L)}`,
      value: it.w, cls: 'word-option',
    }));
    // number items show a row of things to count, so ask for counting instead
    const isNum = target.num != null;
    return {
      type: 'choice',
      prompt: isNum
        ? { html: bigVisual(target), text: 'Count and tell me the number!', speak: 'Count the pictures, and tell me the number!' }
        : { html: bigVisual(target), text: 'Tap the word that matches!', speak: 'Tap the word that matches the picture.' },
      options, answer: target.w,
    };
  }
  if (method === 'hear') {
    const options = shuffle([target, ...sample(others, level === 1 ? 1 : 2)]).map(it => ({
      html: visual(it), value: it.w, cls: it.colour ? 'swatch-option' : '',
    }));
    return {
      type: 'choice',
      prompt: {
        html: '<div class="big-letter">👂</div>', text: 'Listen, then tap!',
        speak: target.w, lang: L,
        // little ears need repetition: instruction, then the word twice
        speakSeq: [{ text: 'Listen, then tap what you hear!' }, { text: target.w, lang: L }, { text: target.w, lang: L }],
      },
      options, answer: target.w,
    };
  }
  if (method === 'match') {
    const three = sample(items, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each word to its picture!', speak: 'Match the words to the pictures. Tap a word to hear it!' },
      pairs: three.map(it => ({
        left: { html: it.w, cls: 'sentence-mini', say: it.w, lang: L },
        right: { html: visual(it) },
      })),
    };
  }
  // play → build the word from letter tiles (short single words only —
  // long spellings like "caballo" are too hard for emergent writers)
  let buildPool = items.filter(i => !i.w.includes(' ') && !i.w.includes("'") && i.w.length <= 5);
  if (!buildPool.length) buildPool = items.filter(i => !i.w.includes(' ') && !i.w.includes("'"));
  const t = buildPool.includes(target) ? target : pick(buildPool);
  return {
    type: 'build',
    prompt: {
      html: bigVisual(t),
      text: 'Build the word!',
      speak: t.w, lang: L,
      speakSeq: [{ text: `Build the word for ${t.en}!` }, { text: t.w, lang: L }],
    },
    tiles: t.w.split(''), answer: t.w.split(''),
  };
}

// ---------- piano ----------
function pianoKeysFor(level) {
  const names = PIANO_LEVEL_NOTES[level];
  const octaves = level >= 4 ? 2 : 1;
  const keys = [];
  for (let o = 0; o < octaves; o++) {
    names.forEach(n => keys.push({ n, freq: PIANO_OCTAVES[o][n], colour: NOTE_COLOURS[n] }));
  }
  return keys;
}

function genPiano(level, method) {
  const keys = pianoKeysFor(level);
  const names = PIANO_LEVEL_NOTES[level];
  if (method === 'match') {
    const notes = sample(names, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each note to its colour!', speak: 'Match the notes to their colours.' },
      pairs: notes.map(n => ({
        left: { html: n },
        right: { html: `<span class="swatch" style="background:${NOTE_COLOURS[n]}"></span>` },
      })),
    };
  }
  if (method === 'play') {
    const len = level === 1 ? 2 : level <= 3 ? 3 : 4;
    const sequence = Array.from({ length: len }, () => pick(names));
    return {
      type: 'piano', mode: 'copy', keys, sequence, labelKeys: level <= 2,
      prompt: { text: 'Listen, then copy my tune!', speak: 'Listen to my tune, then copy it!' },
    };
  }
  const target = pick(names);
  if (method === 'hear') {
    return {
      type: 'piano', mode: 'find', keys, target, hearOnly: true, labelKeys: level <= 2,
      prompt: { text: 'Listen, then find the note!', speak: 'Listen to the note, then find it on the piano!' },
    };
  }
  return {
    type: 'piano', mode: 'find', keys, target, labelKeys: level <= 2,
    prompt: { html: `<div class="big-letter">${target}</div>`, text: 'Find this key!', speak: `Find the key ${target}.` },
  };
}

export function generateRound(skillId, level, method) {
  switch (skillId) {
    case 'numbers':   return genNumbers(level, method);
    case 'maths':     return genMaths(level, method);
    case 'fractions': return genFractions(level, method);
    case 'reasoning': return genReasoning(level, method);
    case 'letters': return genLetters(level, method);
    case 'words':   return genWords(level, method);
    case 'colours': return genColours(level, method);
    case 'reading': return genReading(level, method);
    case 'piano':   return genPiano(level, method);
    case 'spanish': return genLanguage(level, method, LANG_CONTENT.spanish);
    case 'french':  return genLanguage(level, method, LANG_CONTENT.french);
    default: throw new Error(`Unknown skill: ${skillId}`);
  }
}

// ---------- renderers ----------
function renderChoice(host, q, onDone) {
  host.innerHTML = `
    <div class="prompt"><div${speakable(q.prompt.speak, q.prompt.lang)}>
      ${q.prompt.html || ''}
      ${q.prompt.speak ? spkBtn(q.prompt.speak, false, q.prompt.lang) : ''}
      <div class="prompt-text">${q.prompt.text || ''}</div>
    </div></div>
    <div class="options">
      ${q.options.map((o, i) => `<button class="option ${o.cls || ''}" data-i="${i}">${o.html}</button>`).join('')}
    </div>`;
  speakPrompt(q.prompt);

  let answered = false;
  host.querySelectorAll('.option').forEach(btn => {
    btn.onclick = e => {
      if (e.target.closest('[data-say]')) return; // tapped a 🔊 inside the option — hear it, don't answer
      if (answered) return;
      answered = true;
      const o = q.options[+btn.dataset.i];
      if (o.value === q.answer) {
        btn.classList.add('correct');
        setTimeout(() => onDone(true), 1000);
      } else {
        btn.classList.add('wrong');
        host.querySelectorAll('.option').forEach(b => {
          if (q.options[+b.dataset.i].value === q.answer) b.classList.add('correct');
        });
        setTimeout(() => onDone(false), 1900);
      }
    };
  });
}

function renderMatch(host, q, onDone) {
  const cards = shuffle(q.pairs.flatMap((p, i) => [
    { html: p.left.html, cls: p.left.cls || '', say: p.left.say, lang: p.left.lang, pair: i },
    { html: p.right.html, cls: p.right.cls || '', say: p.right.say, lang: p.right.lang, pair: i },
  ]));
  host.innerHTML = `
    <div class="prompt"><div${speakable(q.prompt.speak, q.prompt.lang)}><div class="prompt-text">${q.prompt.text || 'Match the pairs!'}</div></div></div>
    <div class="match-grid">
      ${cards.map((c, i) => `<button class="match-card ${c.cls}" data-i="${i}"${c.say ? ` data-say="${encodeURIComponent(c.say)}" data-lang="${c.lang || ''}"` : ''}>${c.html}</button>`).join('')}
    </div>`;
  speakPrompt(q.prompt);

  let sel = null, matched = 0, errors = 0;
  host.querySelectorAll('.match-card').forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains('matched') || btn === sel) return;
      if (!sel) { sel = btn; btn.classList.add('selected'); return; }
      const a = cards[+sel.dataset.i], b = cards[+btn.dataset.i];
      if (a.pair === b.pair) {
        sel.classList.remove('selected');
        sel.classList.add('matched');
        btn.classList.add('matched');
        sel = null;
        matched++;
        if (matched === q.pairs.length) setTimeout(() => onDone(errors <= 1), 900);
      } else {
        errors++;
        const s = sel; sel = null;
        s.classList.remove('selected');
        s.classList.add('wrong');
        btn.classList.add('wrong');
        setTimeout(() => { s.classList.remove('wrong'); btn.classList.remove('wrong'); }, 650);
      }
    };
  });
}

function renderHunt(host, q, onDone) {
  const total = q.tiles.filter(t => t.match).length;
  // When speech is available the target is AUDIO-ONLY (big 🔊 replay button),
  // so children must listen/remember rather than shape-match the text.
  // The written prompt is the fallback for devices without sound.
  const listening = !!q.prompt.speak && speechAvailable();
  host.innerHTML = `
    <div class="prompt"><div${speakable(q.prompt.speak, q.prompt.lang)}>
      ${q.prompt.html || ''}
      ${listening ? spkBtn(q.prompt.speak, true, q.prompt.lang) : ''}
      ${listening ? '' : `<div class="prompt-text">${q.prompt.text || ''}</div>`}
    </div></div>
    <div class="hunt-grid">
      ${q.tiles.map((t, i) => `<button class="hunt-tile" data-i="${i}">${t.html}</button>`).join('')}
    </div>`;
  speakPrompt(q.prompt);

  let found = 0, errors = 0, finished = false;
  host.querySelectorAll('.hunt-tile').forEach(btn => {
    btn.onclick = () => {
      if (finished) return;
      const t = q.tiles[+btn.dataset.i];
      if (t.done) return;
      t.done = true;
      if (t.match) {
        btn.classList.add('found');
        found++;
        if (found === total) { finished = true; setTimeout(() => onDone(errors <= 1), 900); }
      } else {
        btn.classList.add('missed');
        errors++;
      }
    };
  });
}

function renderBuild(host, q, onDone) {
  host.innerHTML = `
    <div class="prompt"><div${speakable(q.prompt.speak, q.prompt.lang)}>
      ${q.prompt.html || ''}
      ${q.prompt.speak ? spkBtn(q.prompt.speak, true, q.prompt.lang) : ''}
      <div class="prompt-text">${q.prompt.text || ''}</div>
    </div></div>
    <div class="build-slots"></div>
    <div class="tiles"></div>`;
  speakPrompt(q.prompt);

  const slotsEl = host.querySelector('.build-slots');
  const tilesEl = host.querySelector('.tiles');
  const tiles = shuffle(q.tiles.map((t, i) => ({ t, id: i, used: false })));
  let slots = [], attempts = 0, finished = false;

  function draw() {
    slotsEl.innerHTML = q.answer.map((_, i) =>
      `<button class="slot ${slots[i] ? 'filled' : ''}" data-i="${i}">${slots[i] ? slots[i].t : '&nbsp;'}</button>`).join('');
    tilesEl.innerHTML = tiles.map(t =>
      `<button class="tile" data-id="${t.id}" ${t.used ? 'disabled' : ''}>${t.t}</button>`).join('');
  }
  draw();

  host.onclick = e => {
    if (e.target.closest('.speaker')) return; // handled by global listener
    const tileBtn = e.target.closest('.tile');
    if (tileBtn && !tileBtn.disabled && !finished) {
      const t = tiles.find(x => x.id === +tileBtn.dataset.id);
      t.used = true;
      slots.push(t);
      draw();
      check();
      return;
    }
    const slotBtn = e.target.closest('.slot');
    if (slotBtn && !finished) {
      const i = +slotBtn.dataset.i;
      if (slots[i]) { slots[i].used = false; slots.splice(i, 1); draw(); }
    }
  };

  function check() {
    if (slots.length < q.answer.length) return;
    const ok = slots.every((s, i) => s.t === q.answer[i]);
    if (ok) {
      finished = true;
      slotsEl.querySelectorAll('.slot').forEach(s => s.classList.add('correct'));
      setTimeout(() => onDone(true), 1000);
    } else {
      attempts++;
      slotsEl.querySelectorAll('.slot').forEach(s => s.classList.add('wrong'));
      setTimeout(() => {
        if (attempts >= 2) {
          finished = true;
          onDone(false);
        } else {
          slots.forEach(s => { s.used = false; });
          slots = [];
          draw();
        }
      }, 900);
    }
  }
}

// ---------- piano renderer ----------
function renderPiano(host, q, onDone) {
  host.innerHTML = `
    <div class="prompt"><div${speakable(q.prompt.speak)}>
      ${q.prompt.html || ''}
      ${q.prompt.speak ? spkBtn(q.prompt.speak) : ''}
      <div class="prompt-text">${q.prompt.text || ''}</div>
    </div></div>
    <div class="piano-replay">
      ${q.mode === 'copy' ? '<button class="btn secondary" id="replayBtn">🎵 Hear the tune</button>' : ''}
      ${q.hearOnly ? '<button class="btn secondary" id="replayBtn">🎵 Hear the note</button>' : ''}
    </div>
    <div class="piano">
      ${q.keys.map((k, i) => `<div class="piano-key" data-i="${i}" data-note="${k.n}" style="background:${k.colour};color:${NOTE_TEXT[k.n]}">${q.labelKeys ? k.n : ''}</div>`).join('')}
    </div>`;

  const keyEls = [...host.querySelectorAll('.piano-key')];
  const keyFreq = n => q.keys.find(k => k.n === n).freq;
  const playTune = () => playNotes(q.sequence.map(keyFreq), 600);

  // Play notes only AFTER the spoken instruction finishes, so they never overlap.
  // (Safety-net timer covers devices where speech is unavailable or onend doesn't fire.)
  const startPlayback = () => {
    if (q.mode === 'copy') playTune();
    else if (q.hearOnly) playNote(keyFreq(q.target));
  };
  if (q.mode === 'copy' || q.hearOnly) {
    let played = false;
    const start = () => { if (!played) { played = true; startPlayback(); } };
    if (q.prompt.speak && speechAvailable()) {
      stopSpeak(); // clear any leftover praise/instruction from the previous screen
      speak(q.prompt.speak, { onend: () => setTimeout(start, 300) });
      setTimeout(start, 4500); // safety net
    } else {
      setTimeout(start, 600);
    }
  } else {
    speakPrompt(q.prompt);
  }

  const replay = host.querySelector('#replayBtn');
  if (replay) replay.onclick = () => { if (q.mode === 'copy') playTune(); else playNote(keyFreq(q.target)); };

  if (q.mode === 'find') {
    let answered = false;
    keyEls.forEach(el => {
      el.onclick = () => {
        const k = q.keys[+el.dataset.i];
        playNote(k.freq);
        if (answered) return;
        answered = true;
        if (k.n === q.target) {
          el.classList.add('hit');
          setTimeout(() => onDone(true), 1000);
        } else {
          el.classList.add('bad');
          keyEls.filter(e => e.dataset.note === q.target).forEach(e => e.classList.add('target-flash'));
          setTimeout(() => playNote(keyFreq(q.target)), 700); // let them hear the right note
          setTimeout(() => onDone(false), 2000);
        }
      };
    });
  } else {
    // copy mode: repeat the tune note-by-note; a mistake restarts the sequence
    let idx = 0, errors = 0, finished = false;
    keyEls.forEach(el => {
      el.onclick = () => {
        const k = q.keys[+el.dataset.i];
        playNote(k.freq);
        if (finished) return;
        if (k.n === q.sequence[idx]) {
          el.classList.add('hit');
          setTimeout(() => el.classList.remove('hit'), 450);
          idx++;
          if (idx === q.sequence.length) { finished = true; setTimeout(() => onDone(errors === 0), 1000); }
        } else {
          errors++;
          el.classList.add('bad');
          setTimeout(() => el.classList.remove('bad'), 500);
          idx = 0;
          setTimeout(playTune, 1100); // hear it again and retry
        }
      };
    });
  }
}

// ---------- free-play piano ----------
// Open piano for exploration: Boomwhacker colours + letter labels always on,
// no testing, no scoring — just making music and getting familiar with the keys.
export function renderPianoFreePlay() {
  const app = document.getElementById('app');
  const keys = Object.keys(NOTE_COLOURS).map(n => ({ n, freq: PIANO_OCTAVES[0][n], colour: NOTE_COLOURS[n] }));
  app.innerHTML = `
    <div class="topbar">
      <button class="home-btn" id="homeBtn">🏠</button>
      <div class="session-title">🎹 Just play!</div>
      <span></span>
    </div>
    <div class="prompt"><div class="prompt-text">Tap the keys and make some music!</div></div>
    <div class="piano free">
      ${keys.map((k, i) => `<div class="piano-key" data-i="${i}" style="background:${k.colour};color:${NOTE_TEXT[k.n]}">${k.n}</div>`).join('')}
    </div>
    <p class="sound-note">🔔 Make sure the phone is set to <b>ring</b> (not silent) and the volume is up, so you can hear the notes.</p>
    <p class="sound-hint" id="soundHint">🔇 No sound? Check the device's silent/mute switch and volume.</p>`;

  // pure music-making: no voice-over on key presses, just the note itself
  app.querySelectorAll('.piano-key').forEach(el => {
    el.onclick = () => {
      const k = keys[+el.dataset.i];
      playNote(k.freq);
      el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 300);
      // if audio still isn't running after the tap, the device is probably muted — tell the grown-up
      setTimeout(() => {
        const hint = document.getElementById('soundHint');
        if (hint) hint.classList.toggle('show', !audioReady());
      }, 400);
    };
  });
  document.getElementById('homeBtn').onclick = () => nav('home');
  speak('Tap the keys and make some music!');
}

const RENDER = { choice: renderChoice, match: renderMatch, hunt: renderHunt, build: renderBuild, piano: renderPiano };

// ---------- session runner ----------
const PRAISE = ['Well done!', 'Amazing!', 'Super star!', 'Brilliant!', 'You did it!'];
const CHEER = ['Good try!', 'Nearly there!', 'Keep going!'];

let session = null;

export function startSession(skillId, rounds = 5) {
  if (!activeProfile()) { nav('profiles'); return; } // must know who is learning
  session = { skillId, round: 0, rounds, stars: 0, methods: {} };
  renderRound();
}

function renderRound() {
  const app = document.getElementById('app');
  const skill = SKILLS[session.skillId];
  const level = getLevel(session.skillId, skill.maxLevel);
  // language skills unlock harder methods as the child levels up
  const gates = (session.skillId === 'spanish' || session.skillId === 'french') ? LANG_METHOD_GATES[level] : undefined;
  const method = pickMethod(session.skillId, gates);
  const q = generateRound(session.skillId, level, method);
  session.current = { method, level };
  const mm = METHOD_META[method];

  app.innerHTML = `
    <div class="topbar">
      <button class="home-btn" id="homeBtn">🏠</button>
      <div class="session-title">${skill.icon} ${skill.name}</div>
      <div class="round-pill">⭐ ${session.stars} · ${session.round + 1}/${session.rounds}</div>
    </div>
    <div class="method-tag-wrap"><span class="method-tag">${mm.icon} ${mm.name} · Level ${level} (${skill.levelNames[level - 1]})</span></div>
    <div id="qhost"></div>`;
  document.getElementById('homeBtn').onclick = () => nav('home');
  RENDER[q.type](document.getElementById('qhost'), q, done);
}

function done(correct) {
  const { method, level } = session.current;
  const change = recordResult(session.skillId, method, correct, SKILLS[session.skillId].maxLevel);
  const rec = (session.methods[method] ||= { a: 0, c: 0 });
  rec.a++;
  if (correct) { rec.c++; session.stars++; }
  showFeedback(correct, change, () => {
    session.round++;
    if (session.round >= session.rounds) renderSummary();
    else renderRound();
  });
}

function showFeedback(correct, change, cb) {
  const o = document.createElement('div');
  o.className = 'feedback-overlay';
  const word = correct ? pick(PRAISE) : pick(CHEER);
  o.innerHTML = `
    <div class="feedback-emoji">${correct ? '🌟' : '💪'}</div>
    <div class="feedback-word">${word}</div>
    ${change === 'up' ? '<div class="level-up">⬆️ Level up! Amazing!</div>' : ''}`;
  document.body.appendChild(o);
  speak(correct ? word : (change === 'down' ? "Let's try something a little easier." : word));
  setTimeout(() => { o.remove(); cb(); }, change === 'up' ? 2100 : 1400);
}

function renderSummary() {
  const app = document.getElementById('app');
  const skill = SKILLS[session.skillId];
  const { stars, rounds } = session;
  const msg = stars === rounds ? 'Perfect! You are a superstar! 🌟'
    : stars >= rounds / 2 ? 'Great work! Keep it up! 💪'
    : 'Good try! Practice makes perfect! 🌱';
  // Child-facing summary: stars + celebration + big friendly buttons only.
  // (Method results live in the Parent Dashboard.)
  const skillId = session.skillId;

  app.innerHTML = `
    <div class="summary-card">
      <div class="summary-stars">${'⭐'.repeat(stars)}${'☆'.repeat(rounds - stars)}</div>
      <div class="summary-msg">${msg}</div>
      <div class="btn-row">
        <button class="btn again-big" id="againBtn" aria-label="Play again">
          <span class="big-emoji">🔁</span><span class="btn-label">Play again</span>
        </button>
        <button class="btn secondary home-big" id="homeBtn" aria-label="Home">
          <span class="big-emoji">🏠</span><span class="btn-label">Home</span>
        </button>
      </div>
    </div>`;
  if (stars === rounds) starRain(); else confetti();
  speak(`${msg} Tap the big orange button to play again, or tap the house to try something else.`);
  document.getElementById('againBtn').onclick = () => startSession(skillId);
  document.getElementById('homeBtn').onclick = () => nav('home');
}

function confetti() {
  const emos = ['🎉', '⭐', '🌟', '✨', '🎈'];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = pick(emos);
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    s.style.fontSize = (1 + Math.random() * 1.4) + 'rem';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 4200);
  }
}

// Perfect score (5/5): a sky full of glowing stars rains down over ~5 seconds
function starRain() {
  const emos = ['⭐', '🌟', '✨', '💫'];
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('span');
    s.className = 'confetti star';
    s.textContent = pick(emos);
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = (Math.random() * 2.5) + 's';
    s.style.animationDuration = (2.5 + Math.random() * 2) + 's';
    s.style.fontSize = (1.2 + Math.random() * 2) + 'rem';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 8000);
  }
}
