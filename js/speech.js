// Web Speech API wrapper — prefers a soft female voice; parents can override
// the choice from the dashboard (stored per device in settings).

let voice = null;
let preferredVoiceName = null;

// Ranked soft/female voices across platforms:
//   iOS/macOS: Serena, Kate, Stephanie, Martha, Shelley…
//   Chrome:    "Google UK English Female"
//   Windows:   Hazel (en-GB), Zira/Susan (en-US)
const FEMALE_PREFERENCES = [
  'serena', 'kate', 'stephanie', 'google uk english female', 'hazel',
  'shelley', 'sandy', 'flo', 'samantha', 'zira', 'susan', 'victoria',
  'moira', 'tessa', 'allison', 'ava', 'zoe', 'martha',
];

const isGB = v => /en[-_]GB/i.test(v.lang);

function findByHints(voices) {
  for (const hint of FEMALE_PREFERENCES) {
    const v = voices.find(x => x.name.toLowerCase().includes(hint));
    if (v) return v;
  }
  return null;
}

export function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

function pickVoice() {
  const vs = getVoices();
  if (!vs.length) return;
  // 1) parent's saved choice
  if (preferredVoiceName) {
    const chosen = vs.find(v => v.name === preferredVoiceName);
    if (chosen) { voice = chosen; return; }
  }
  // 2) British female first, then any soft female, then any British, then any English
  const gb = vs.filter(isGB);
  voice = findByHints(gb)
       || gb.find(v => /female|grandma|shelley|sandy|flo/i.test(v.name))
       || findByHints(vs)
       || vs.find(v => /female/i.test(v.name))
       || gb[0]
       || vs.find(v => /^en/i.test(v.lang))
       || vs[0];
}

export function setVoicePreference(name) {
  preferredVoiceName = name || null;
  pickVoice();
}

// Browsers load voices asynchronously — let screens re-populate when they arrive
const voiceListeners = new Set();
export function onVoicesChanged(fn) {
  voiceListeners.add(fn);
  return () => voiceListeners.delete(fn);
}

function handleVoicesChanged() {
  pickVoice();
  voiceListeners.forEach(fn => { try { fn(); } catch { /* listener gone */ } });
}

export function currentVoiceName() { return voice ? voice.name : null; }

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
  if (window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
  }
  // nudge browsers that defer loading the voice list (Chrome especially)
  getVoices();
  setTimeout(getVoices, 300);
}

// Emojis are for the screen only — strip them so the voice never reads out
// things like "glowing star" or "flexed biceps".
function stripEmoji(text) {
  return String(text)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Pick the nicest voice for another language (Spanish/French lessons),
// preferring a soft female voice when one exists on this device.
function voiceForLang(lang) {
  const prefix = String(lang).split('-')[0].toLowerCase();
  const vs = getVoices().filter(v => (v.lang || '').toLowerCase().startsWith(prefix));
  return findByHints(vs) || vs.find(v => /female/i.test(v.name)) || vs[0] || null;
}

export function speak(text, opts = {}) {
  text = stripEmoji(text);
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!opts.onend) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (opts.lang) {
    const lv = voiceForLang(opts.lang);
    if (lv) { u.voice = lv; u.lang = lv.lang; } else { u.lang = opts.lang; }
  } else if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-GB'; }
  u.rate = opts.rate ?? 0.85;    // gentle pace for little ears
  u.pitch = opts.pitch ?? 1.05;  // soft, warm tone
  if (opts.onend) u.onend = opts.onend;
  window.speechSynthesis.speak(u);
}

// Speak a sequence of parts, e.g. English instruction then a Spanish word:
//   speakSeq([{ text: 'Listen!' }, { text: 'gato', lang: 'es-ES' }])
export function speakSeq(parts) {
  if (!speechAvailable() || !parts || !parts.length) return;
  window.speechSynthesis.cancel();
  const run = i => {
    if (i >= parts.length) return;
    speak(parts[i].text, { lang: parts[i].lang, onend: () => run(i + 1) });
  };
  run(0);
}

export function stopSpeak() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
