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
  SHAPE_META, SHAPE_LEVELS, SHAPE_COLOURS,
  TRICKY_LEVELS, COINS, COIN_LEVELS, DAYS, MONTHS, SEASONS, SEASON_MONTHS,
} from './data.js';
import { METHOD_META, recordResult, pickMethod, getLevel, activeProfile, skillMax, awardSticker, awardCertificate } from './engine.js';
import { speak, speakSeq, stopSpeak, speechAvailable } from './speech.js';
import { playNote, playNotes, audioReady } from './audio.js';

// ---------- small helpers ----------
const escH = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

// 4+ readiness: "one more / one less" — show the base amount, ask for the neighbour.
function genOneMoreLess(level, method, pool) {
  const more = Math.random() < 0.5;
  const candidates = pool.filter(n => more ? n + 1 <= 20 : n - 1 >= 0);
  const base = pick(candidates.length ? candidates : [1]);
  const ans = more ? base + 1 : base - 1;
  const speak = more ? `What is one more than ${base}?` : `What is one less than ${base}?`;
  const prompt = method === 'look'
    ? {
        html: `<div class="emoji-row">${blocksFor(base, true)}</div>`,
        text: more ? 'One more! How many now?' : 'One less! How many now?',
        speak: `Here are ${base}. ${speak}`,
      }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the answer!', speak };
  return { type: 'choice', prompt, options: answerOptions(ans), answer: ans };
}

// 4+ readiness: number ordering — "what comes next" / "which number is missing".
function genNumberOrder(level, method) {
  const lo = level === 1 ? 1 : level === 2 ? 0 : 5;
  const hi = level === 1 ? 5 : level === 2 ? 9 : 20;
  const missingMid = Math.random() < 0.5;
  const start = rand(lo, hi - (missingMid ? 2 : 3));
  const ans = missingMid ? start + 1 : start + 3;
  const strip = missingMid ? [start, '?', start + 2] : [start, start + 1, start + 2, '?'];
  const spoken = missingMid ? `${start}, something, ${start + 2}. Which number is missing?`
                            : `${start}, ${start + 1}, ${start + 2}. What comes next?`;
  const prompt = method === 'look'
    ? {
        html: `<div class="big-letter" style="font-size:2.4rem">${strip.join(' , ')}</div>`,
        text: missingMid ? 'Which number is missing?' : 'What comes next?',
        speak: spoken,
      }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the answer!', speak: spoken };
  return { type: 'choice', prompt, options: answerOptions(ans), answer: ans };
}

function genNumbers(level, method) {
  const pool = numberPool(level);
  // Early levels mix in 4+ school-readiness skills: one more/less and ordering.
  if (level <= 3 && (method === 'look' || method === 'hear')) {
    const roll = Math.random();
    if (roll < 0.3) return genOneMoreLess(level, method, pool);
    if (roll < 0.55) return genNumberOrder(level, method);
  }
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
      prompt: {
        html: `<div class="word">${target}</div><button class="sound-out" data-soundout="${escH(target)}">🔤 Sound it out</button>`,
        text: 'Sound it out, then tap the picture!', speak: 'Sound out the word, then tap the picture. Tap the sound-it-out button if you need help.',
      },
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
      prompt: {
        html: `<div class="big-letter">👂</div><button class="sound-out" data-soundout="${escH(target)}">🔤 Sound it out</button>`,
        text: 'Listen, then tap the word!', speak: `Tap the word ${target}.`,
      },
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
      html: `${WORD_EMOJI[target] ? `<div class="emoji-row">${WORD_EMOJI[target]}</div>` : '<div class="big-letter">👂</div>'}<button class="sound-out" data-soundout="${escH(target)}">🔤 Sound it out</button>`,
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
// Flat fraction circle: the circle is divided into EQUAL slices with clear
// dividing lines, and the fraction's slices are shaded pink — so children can
// literally count the parts (denominator) and the shaded parts (numerator),
// exactly like the plastic fraction circles used in UK classrooms.
const fracPie = s => {
  const [n, d] = s.split('/').map(Number);
  const r = 46, cx = 50, cy = 50;
  let paths = '';
  for (let i = 0; i < d; i++) {
    const a0 = (-90 + (i * 360) / d) * Math.PI / 180;
    const a1 = (-90 + ((i + 1) * 360) / d) * Math.PI / 180;
    const x0 = (cx + r * Math.cos(a0)).toFixed(2), y0 = (cy + r * Math.sin(a0)).toFixed(2);
    const x1 = (cx + r * Math.cos(a1)).toFixed(2), y1 = (cy + r * Math.sin(a1)).toFixed(2);
    const large = 360 / d > 180 ? 1 : 0;
    paths += `<path d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z" fill="${i < n ? '#e84393' : '#ffffff'}" stroke="#c9c3d4" stroke-width="2"/>`;
  }
  return `<svg class="frac-pie" viewBox="0 0 100 100" width="72" height="72" role="img">${paths}<circle cx="50" cy="50" r="46" fill="none" stroke="#9a93aa" stroke-width="3"/></svg>`;
};
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
      pairs: three.map(n => ({ left: { html: fracTxt(n) }, right: { html: fracPie(n) } })),
    };
  }
  if (method === 'play') {
    const others = names.filter(n => n !== target);
    const tiles = shuffle([
      ...[0, 1, 2].map(() => ({ html: fracPie(target), match: true })),
      ...Array.from({ length: 6 }, () => ({ html: fracPie(pick(others)), match: false })),
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
  return { type: 'choice', prompt, options: opts.map(n => ({ html: fracPie(n), value: n })), answer: target };
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

// ---------- 2D shapes (4+ school readiness) ----------
// CSS-drawn shape in a random colour (and slight size jitter) so children learn
// the shape itself, not one picture of it.
function shapeHtml(key, px = 56) {
  const col = pick(SHAPE_COLOURS);
  return `<span class="shape shape-${key}" style="--sh-col:${col};font-size:${px}px"></span>`;
}

function genShapes(level, method) {
  const pool = SHAPE_LEVELS[level];
  const target = pick(pool);
  const others = pool.filter(s => s !== target);
  const opts = shuffle([target, ...sample(others, Math.min(3, others.length))]);

  if (method === 'match') {
    // match each shape to a real-world thing that looks like it
    const three = sample(pool, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each shape to something shaped like it!', speak: 'Match the shapes to the things that look like them.' },
      pairs: three.map(k => ({ left: { html: shapeHtml(k, 44) }, right: { html: pick(SHAPE_META[k].things) } })),
    };
  }
  if (method === 'play') {
    // hunt every shape of the target kind (all in different colours)
    const tiles = shuffle([
      ...[0, 1, 2].map(() => ({ html: shapeHtml(target, 46), match: true })),
      ...sample(others, Math.min(6, others.length)).map(k => ({ html: shapeHtml(k, 46), match: false })),
    ]);
    return {
      type: 'hunt',
      prompt: { speak: `Tap every ${SHAPE_META[target].n}.`, text: `Tap all the ${SHAPE_META[target].pl}!` },
      tiles,
    };
  }
  const options = opts.map(k => ({ html: shapeHtml(k, 60), value: k }));
  const prompt = method === 'look'
    // shape constancy: shown one, find the same shape whatever its colour
    ? { html: shapeHtml(target, 90), text: 'Tap the matching shape!', speak: `Here is a ${SHAPE_META[target].n}. Tap the ${SHAPE_META[target].n}.` }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the shape!', speak: `Tap the ${SHAPE_META[target].n}.` };
  return { type: 'choice', prompt, options, answer: target };
}

// ---------- tricky words (phonics "red words") ----------
function genTricky(level, method) {
  const pool = TRICKY_LEVELS[level];
  const target = pick(pool);
  const others = pool.filter(w => w !== target);

  if (method === 'match') {
    const ws = sample(pool, 3);
    return {
      type: 'match',
      prompt: { text: 'Match the same words!', speak: 'Match the words that are the same.' },
      pairs: ws.map(w => ({ left: { html: w, cls: 'sentence-mini', say: w }, right: { html: w, cls: 'sentence-mini' } })),
    };
  }
  if (method === 'play') {
    // spell the red word from letter tiles — the classic way to learn them
    return {
      type: 'build',
      prompt: { html: '<div class="big-letter">👂</div>', speak: `Spell the word ${target}.`, text: 'Tap the letters to build the word!' },
      tiles: target.split(''), answer: target.split(''),
    };
  }
  const options = shuffle([target, ...sample(others, 3)]).map(w => ({ html: w, value: w, cls: 'word-option' }));
  const prompt = method === 'look'
    ? { html: `<div class="word">${target}</div>`, text: 'Remember this word!', speak: `This word is ${target}. Tap ${target}.` }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the word!', speak: `Tap the word ${target}.` };
  return { type: 'choice', prompt, options, answer: target };
}

// ---------- telling the time (KS1: o'clock, half past; 7+ stretch: quarters) ----------
function fmtTime(h, m) {
  if (m === 0) return `${h} o'clock`;
  if (m === 30) return `half past ${h}`;
  if (m === 15) return `quarter past ${h}`;
  return `quarter to ${h === 12 ? 1 : h + 1}`;
}

function makeTime(level) {
  const mins = level === 1 ? [0] : level === 2 ? [0, 30] : [0, 15, 30, 45];
  const m = pick(mins);
  const h = rand(1, 12);
  return { h, m, key: `${h}:${m}` };
}

function clockSvg(h, m, size = 96) {
  const hand = (ang, len, w) => {
    const rad = (ang - 90) * Math.PI / 180;
    return `<line x1="50" y1="50" x2="${(50 + Math.cos(rad) * len).toFixed(1)}" y2="${(50 + Math.sin(rad) * len).toFixed(1)}" stroke="#333" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = i * 30 * Math.PI / 180;
    ticks += `<circle cx="${(50 + Math.sin(a) * 42).toFixed(1)}" cy="${(50 - Math.cos(a) * 42).toFixed(1)}" r="2.4" fill="#999"/>`;
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img">`
    + `<circle cx="50" cy="50" r="47" fill="#fff" stroke="#333" stroke-width="3"/>${ticks}`
    + hand((h % 12) * 30 + m * 0.5, 24, 5) + hand(m * 6, 36, 3.5)
    + `<circle cx="50" cy="50" r="3.5" fill="#333"/></svg>`;
}

function genTime(level, method) {
  const t = makeTime(level);
  const label = fmtTime(t.h, t.m);

  if (method === 'match') {
    const three = []; const seen = new Set(); let g = 0;
    while (three.length < 3 && g++ < 100) {
      const d = makeTime(level); const l = fmtTime(d.h, d.m);
      if (!seen.has(l)) { seen.add(l); three.push({ d, l }); }
    }
    return {
      type: 'match',
      prompt: { text: 'Match each clock to the time!', speak: 'Match the clocks to the times.' },
      pairs: three.map(x => ({ left: { html: clockSvg(x.d.h, x.d.m, 72) }, right: { html: x.l, cls: 'sentence-mini' } })),
    };
  }
  if (method === 'play') {
    const others = []; let g = 0;
    while (others.length < 6 && g++ < 120) {
      const d = makeTime(level);
      if (fmtTime(d.h, d.m) !== label) others.push(d);
    }
    const tiles = shuffle([
      ...[0, 1, 2].map(() => ({ html: clockSvg(t.h, t.m, 62), match: true })),
      ...others.map(d => ({ html: clockSvg(d.h, d.m, 62), match: false })),
    ]);
    return { type: 'hunt', prompt: { speak: `Tap every clock that shows ${label}.`, text: `Tap all the clocks showing ${label}!` }, tiles };
  }
  if (method === 'look') {
    const set = new Set([label]); let g = 0;
    while (set.size < 3 && g++ < 100) {
      const d = makeTime(level);
      set.add(fmtTime(d.h, d.m));
    }
    const options = shuffle([...set]).map(l => ({ html: l, value: l, cls: 'word-option' }));
    return {
      type: 'choice',
      prompt: { html: clockSvg(t.h, t.m, 140), text: 'What time is it?', speak: 'What time does this clock show?' },
      options, answer: label,
    };
  }
  // hear: spoken time, tap the right clock face
  const opts = new Map([[t.key, t]]); let g = 0;
  while (opts.size < 3 && g++ < 100) { const d = makeTime(level); if (!opts.has(d.key)) opts.set(d.key, d); }
  const options = shuffle([...opts.values()]).map(d => ({ html: clockSvg(d.h, d.m, 80), value: d.key }));
  return {
    type: 'choice',
    prompt: { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the clock!', speak: `Tap the clock that shows ${label}.` },
    options, answer: t.key,
  };
}

// ---------- UK coins (KS1 money) ----------
const coinHtml = (c, px = 56) =>
  `<span class="coin" style="--coin-col:${c.col};font-size:${px}px"><span>${c.label}</span></span>`;

function genCoinTotal(method) {
  const pool = COINS.filter(c => c.v <= 50);
  let a = pick(pool), b = pick(pool), guard = 0;
  while (a.v + b.v > 90 && guard++ < 60) { a = pick(pool); b = pick(pool); }
  const total = a.v + b.v;
  const speak = `What is ${a.say} add ${b.say}?`;

  if (method === 'match') {
    const pairs = []; const seen = new Set(); let g = 0;
    while (pairs.length < 3 && g++ < 120) {
      const x = pick(pool), y = pick(pool); const t = x.v + y.v;
      if (t <= 90 && !seen.has(t)) { seen.add(t); pairs.push({ x, y, t }); }
    }
    return {
      type: 'match',
      prompt: { text: 'Match the coins to the total!', speak: 'Match each pair of coins to how much they make altogether.' },
      pairs: pairs.map(p => ({ left: { html: `${coinHtml(p.x, 40)} ${coinHtml(p.y, 40)}` }, right: { html: `${p.t}p`, cls: 'sentence-mini' } })),
    };
  }
  if (method === 'play') return genMoney(2, 'play'); // coin hunts stay simple; totals are thinky
  const options = labelOptions(total, [10, -10, 5, -5, 2, -2, 1, -1], v => `${v}p`)
    .map(l => ({ html: l, value: l, cls: 'word-option' }));
  const prompt = method === 'look'
    ? { html: `<div class="emoji-row">${coinHtml(a, 64)} ➕ ${coinHtml(b, 64)}</div>`, text: 'How much altogether?', speak }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the total!', speak };
  return { type: 'choice', prompt, options, answer: `${total}p` };
}

function genMoney(level, method) {
  if (level === 3) return genCoinTotal(method);
  const pool = COINS.filter(c => COIN_LEVELS[level].includes(c.v));
  const target = pick(pool);
  const others = pool.filter(c => c !== target);

  if (method === 'match') {
    const three = sample(pool, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each coin to its value!', speak: 'Match the coins to how much they are worth.' },
      pairs: three.map(c => ({ left: { html: coinHtml(c, 48) }, right: { html: c.label, cls: 'sentence-mini' } })),
    };
  }
  if (method === 'play') {
    const tiles = shuffle([
      ...[0, 1, 2].map(() => ({ html: coinHtml(target, 48), match: true })),
      ...sample(others, Math.min(6, others.length)).map(c => ({ html: coinHtml(c, 48), match: false })),
    ]);
    return { type: 'hunt', prompt: { speak: `Tap every ${target.say} coin.`, text: `Tap all the ${target.label} coins!` }, tiles };
  }
  if (method === 'look') {
    const options = shuffle([target, ...sample(others, 3)]).map(c => ({ html: c.label, value: c.label, cls: 'word-option' }));
    return {
      type: 'choice',
      prompt: { html: coinHtml(target, 100), text: 'How much is this coin?', speak: 'How much is this coin worth?' },
      options, answer: target.label,
    };
  }
  const options = shuffle([target, ...sample(others, 3)]).map(c => ({ html: coinHtml(c, 60), value: c.label }));
  return {
    type: 'choice',
    prompt: { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the coin!', speak: `Tap the ${target.say} coin.` },
    options, answer: target.label,
  };
}

// ---------- days, months & seasons (EYFS / Y1 calendar language) ----------
function genCalendar(level, method) {
  if (level === 3 && method === 'match') {
    const seasons = sample(SEASONS, 3);
    return {
      type: 'match',
      prompt: { text: 'Match each season to one of its months!', speak: 'Match the seasons to their months.' },
      pairs: seasons.map(s => ({ left: { html: s, cls: 'sentence-mini' }, right: { html: pick(SEASON_MONTHS[s]), cls: 'sentence-mini' } })),
    };
  }
  const items = level === 1 ? DAYS : level === 2 ? MONTHS : SEASONS;
  const unit = level === 1 ? 'day' : level === 2 ? 'month' : 'season';

  if (method === 'play') {
    // put three in order — build type places them left to right
    const start = rand(0, items.length - 3);
    const trio = items.slice(start, start + 3);
    return {
      type: 'build',
      prompt: { html: '<div class="big-letter">📅</div>', speak: `Put the ${unit}s in the right order.`, text: `Tap the ${unit}s in order!` },
      tiles: shuffle([...trio]), answer: trio,
    };
  }
  if (method === 'match') {
    const starts = sample([...items.keys()], 3);
    return {
      type: 'match',
      prompt: { text: `Match each ${unit} to the one that comes next!`, speak: `Match the ${unit}s to what comes next.` },
      pairs: starts.map(i => ({ left: { html: items[i], cls: 'sentence-mini' }, right: { html: items[(i + 1) % items.length], cls: 'sentence-mini' } })),
    };
  }
  const idx = rand(0, items.length - 1);
  const before = Math.random() < 0.5;
  const ans = items[(idx + (before ? -1 : 1) + items.length) % items.length];
  const optSet = new Set([ans]);
  for (const d of shuffle([2, -2, 3, -3, 4])) {
    if (optSet.size >= 4) break;
    optSet.add(items[(idx + d + items.length) % items.length]);
  }
  const options = shuffle([...optSet]).map(w => ({ html: w, value: w, cls: 'word-option' }));
  const qSpeak = before ? `What ${unit} comes before ${items[idx]}?` : `What ${unit} comes after ${items[idx]}?`;
  const prompt = method === 'look'
    ? { html: `<div class="word" style="font-size:2.6rem">${items[idx]}</div>`, text: before ? 'What comes before?' : 'What comes next?', speak: qSpeak }
    : { html: '<div class="big-letter">👂</div>', text: 'Listen, then tap the answer!', speak: qSpeak };
  return { type: 'choice', prompt, options, answer: ans };
}

// ---------- tracing (finger letter/number formation — 4+ handwriting readiness) ----------
function genTracing(level) {
  const pool = level === 1 ? 'abcdefghijklmnopqrstuvwxyz' : '0123456789';
  const target = pick(pool.split(''));
  const kind = level === 1 ? 'letter' : 'number';
  return {
    type: 'trace', target,
    prompt: { text: `Trace the ${kind} with your finger!`, speak: `Trace the ${kind} ${target} with your finger. Then tap done.` },
  };
}

export function generateRound(skillId, level, method) {
  switch (skillId) {
    case 'numbers':   return genNumbers(level, method);
    case 'shapes':    return genShapes(level, method);
    case 'tricky':    return genTricky(level, method);
    case 'time':      return genTime(level, method);
    case 'money':     return genMoney(level, method);
    case 'calendar':  return genCalendar(level, method);
    case 'tracing':   return genTracing(level, method);
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

// ---------- tracing renderer (canvas: dotted guide + finger drawing + coverage check) ----------
function renderTrace(host, q, onDone) {
  host.innerHTML = `
    <div class="prompt"><div${speakable(q.prompt.speak)}>
      ${spkBtn(q.prompt.speak, true)}
      <div class="prompt-text">${q.prompt.text || ''}</div>
    </div></div>
    <div class="trace-wrap">
      <canvas class="trace-guide"></canvas>
      <canvas class="trace-draw"></canvas>
    </div>
    <div class="btn-row">
      <button class="btn secondary" id="traceClear">🧽 Rub out</button>
      <button class="btn" id="traceDone">✅ Done!</button>
    </div>`;
  speakPrompt(q.prompt);

  const size = Math.min((window.innerWidth || 400) - 60, 340);
  const guide = host.querySelector('.trace-guide');
  const draw = host.querySelector('.trace-draw');
  [guide, draw].forEach(c => { c.width = size; c.height = size; });

  // the guide: pale letter with a dashed outline, like tracing paper
  const g = guide.getContext('2d');
  g.font = `700 ${Math.round(size * 0.72)}px Fredoka, 'Comic Sans MS', sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const cy = size / 2 + size * 0.02;
  g.fillStyle = 'rgba(60,60,80,.16)';
  g.fillText(q.target, size / 2, cy);
  g.strokeStyle = 'rgba(60,60,80,.4)';
  g.setLineDash([3, 9]);
  g.lineWidth = 2;
  g.strokeText(q.target, size / 2, cy);

  const d = draw.getContext('2d');
  d.lineCap = 'round'; d.lineJoin = 'round';
  d.lineWidth = 26;
  d.strokeStyle = (getComputedStyle(document.documentElement).getPropertyValue('--theme') || '').trim() || '#5f27cd';

  let drawing = false, last = null, strokes = 0;
  const pos = e => {
    const r = draw.getBoundingClientRect();
    return [(e.clientX - r.left) * (size / r.width), (e.clientY - r.top) * (size / r.height)];
  };
  draw.addEventListener('pointerdown', e => {
    e.preventDefault();
    drawing = true; last = pos(e); strokes++;
    try { draw.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
  });
  draw.addEventListener('pointermove', e => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    d.beginPath(); d.moveTo(last[0], last[1]); d.lineTo(p[0], p[1]); d.stroke();
    last = p;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => draw.addEventListener(ev, () => { drawing = false; }));

  host.querySelector('#traceClear').onclick = () => d.clearRect(0, 0, size, size);

  let attempts = 0, finished = false;
  host.querySelector('#traceDone').onclick = () => {
    if (finished) return;
    // coverage: what fraction of the guide letter has drawing near it?
    const gi = g.getImageData(0, 0, size, size).data;
    const di = d.getImageData(0, 0, size, size).data;
    const step = 5, R = 16;
    let total = 0, covered = 0;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        if (gi[(y * size + x) * 4 + 3] < 40) continue;
        total++;
        let hit = false;
        outer: for (let dy = -R; dy <= R && !hit; dy += 4) {
          for (let dx = -R; dx <= R; dx += 4) {
            const yy = y + dy, xx = x + dx;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            if (di[(yy * size + xx) * 4 + 3] > 60) { hit = true; break; }
          }
        }
        if (hit) covered++;
      }
    }
    const ratio = total ? covered / total : 0;
    if (ratio >= 0.55) {
      finished = true;
      onDone(true);
    } else {
      attempts++;
      speak(strokes === 0 ? 'Trace over the dotted lines with your finger!' : 'Nearly there! Follow the dotted lines a little more.');
      if (attempts >= 3) { finished = true; onDone(false); }
    }
  };
}

const RENDER = { choice: renderChoice, match: renderMatch, hunt: renderHunt, build: renderBuild, piano: renderPiano, trace: renderTrace };

// ---------- session runner ----------
const PRAISE = ['Well done!', 'Amazing!', 'Super star!', 'Brilliant!', 'You did it!'];
const CHEER = ['Good try!', 'Nearly there!', 'Keep going!'];

let session = null;

export function startSession(skillId, rounds = 5) {
  if (!activeProfile()) { nav('profiles'); return; } // must know who is learning
  session = { skillId, round: 0, rounds, stars: 0, methods: {}, pendingCert: null };
  renderRound();
}

function renderRound() {
  const app = document.getElementById('app');
  const skill = SKILLS[session.skillId];
  const level = getLevel(session.skillId, skillMax(null, session.skillId)); // age-band capped
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
  const change = recordResult(session.skillId, method, correct, skillMax(null, session.skillId));
  // first time reaching a new level => certificate (shown after the session)
  if (change === 'up') {
    const cert = awardCertificate(session.skillId, level + 1);
    if (cert) session.pendingCert = cert;
  }
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

// Milestone certificate: full-screen, screenshot-friendly, then back to the summary.
function renderCertificate(cert, cb) {
  const app = document.getElementById('app');
  const prof = activeProfile();
  const skill = SKILLS[cert.skill];
  const name = prof?.name || 'Superstar';
  const date = new Date(cert.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  app.innerHTML = `
    <div class="certificate">
      <div class="cert-stars">🌟 🌟 🌟</div>
      <div class="cert-heading">🏅 Certificate 🏅</div>
      <div class="cert-avatar">${prof?.avatar || '🌟'}</div>
      <div class="cert-name">${escH(name)}</div>
      <div class="cert-text">has reached</div>
      <div class="cert-award">Level ${cert.level} · ${skill.levelNames[cert.level - 1]}</div>
      <div class="cert-text">in ${skill.icon} ${skill.name}</div>
      <div class="cert-date">${date}</div>
      <div class="btn-row"><button class="btn" id="certOk">🎉 Hooray!</button></div>
    </div>`;
  confetti();
  speak(`Amazing! ${name} has reached level ${cert.level} in ${skill.name}! Here is your certificate!`);
  document.getElementById('certOk').onclick = cb;
}

function renderSummary() {
  // A freshly earned certificate takes the stage first, then the normal summary.
  if (session.pendingCert) {
    const cert = session.pendingCert;
    session.pendingCert = null;
    renderCertificate(cert, renderSummary);
    return;
  }
  const app = document.getElementById('app');
  const skill = SKILLS[session.skillId];
  const { stars, rounds } = session;
  // Sticker album: perfect score = rare sticker, 3+/5 = common sticker.
  const sticker = stars === rounds ? awardSticker(true)
    : stars >= Math.ceil(rounds * 0.6) ? awardSticker(false) : null;
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
      ${sticker ? `
        <button class="sticker-reveal" id="stickerBtn" aria-label="See your sticker album">
          <span class="sticker-reveal-text">You earned a sticker!</span>
          <span class="sticker-big">${sticker}</span>
          <span class="sticker-reveal-sub">tap to see your album 🎁</span>
        </button>` : ''}
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
  speak(`${msg} ${sticker ? 'You earned a sticker for your album! ' : ''}Tap the big orange button to play again, or tap the house to try something else.`);
  document.getElementById('againBtn').onclick = () => startSession(skillId);
  document.getElementById('homeBtn').onclick = () => nav('home');
  const stickerBtn = document.getElementById('stickerBtn');
  if (stickerBtn) stickerBtn.onclick = () => nav('album');
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
