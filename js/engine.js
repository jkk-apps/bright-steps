// Adaptive engine: multiple child profiles, each with its own stats and
// progress. Tracks success per skill per learning method, chooses methods
// weighted by success (with exploration), and moves levels up/down.

export const METHODS = ['look', 'hear', 'match', 'play'];
export const METHOD_META = {
  look:  { name: 'Look & Find',   icon: '👀', blurb: 'Seeing and choosing' },
  hear:  { name: 'Listen & Find', icon: '👂', blurb: 'Hearing and choosing' },
  match: { name: 'Match It',      icon: '🧩', blurb: 'Matching pairs' },
  play:  { name: 'Tap & Play',    icon: '🎈', blurb: 'Hands-on tapping games' },
};

export const AVATARS = ['🦊', '🐰', '🦁', '🐸', '🐼', '🦄', '🐯', '🐧', '🦉', '🐳'];

// Each avatar re-themes the whole app: main colour, dark "3D base" shade, soft tint.
export const DEFAULT_THEME = { c: '#5f27cd', dark: '#431b96', soft: '#f0e8ff' };
export const AVATAR_THEMES = {
  '🦊': { c: '#ff8c42', dark: '#d96a1e', soft: '#ffe8d6' }, // fox — orange
  '🐰': { c: '#ff6b9d', dark: '#d94f80', soft: '#ffe0eb' }, // bunny — pink
  '🦁': { c: '#f59f00', dark: '#c77e00', soft: '#ffedcc' }, // lion — golden
  '🐸': { c: '#10ac84', dark: '#0b8566', soft: '#d4f3e9' }, // frog — green
  '🐼': { c: '#576574', dark: '#3d4a5c', soft: '#e2e8f0' }, // panda — slate
  '🦄': { c: '#845ef2', dark: '#6741d9', soft: '#e9e2fd' }, // unicorn — purple
  '🐯': { c: '#f76707', dark: '#c94f00', soft: '#ffe3d1' }, // tiger — deep orange
  '🐧': { c: '#2e86de', dark: '#1d68b3', soft: '#d9eafb' }, // penguin — blue
  '🦉': { c: '#a1723f', dark: '#7d5730', soft: '#f1e4d4' }, // owl — brown
  '🐳': { c: '#00b8d4', dark: '#0090a8', soft: '#d3f3fa' }, // whale — cyan
};
export function themeFor(avatar) { return AVATAR_THEMES[avatar] || DEFAULT_THEME; }

const KEY = 'brightsteps.v2';
const OLD_KEY = 'brightsteps.v1'; // single-profile data from v1 is migrated

// localStorage with an in-memory fallback (also makes the engine testable in Node/JSC)
const mem = {};
const store = typeof localStorage !== 'undefined'
  ? localStorage
  : { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };

function uid() { return 'p' + Math.random().toString(36).slice(2, 9); }

function fresh() {
  return { active: null, profiles: {}, settings: { override: null, voiceName: null } };
}

function migrateV1(old) {
  const id = uid();
  return {
    active: id,
    profiles: {
      [id]: {
        id,
        name: old.profile?.name || '',
        avatar: AVATARS[0],
        stats: old.stats || {},
        progress: old.progress || {},
        hiddenSkills: [],
        createdAt: Date.now(),
      },
    },
    settings: old.settings || { override: null },
  };
}

function load() {
  try {
    const s = JSON.parse(store.getItem(KEY));
    if (s && s.profiles) return s;
  } catch { /* fall through */ }
  try {
    const old = JSON.parse(store.getItem(OLD_KEY));
    if (old && old.profile) {
      const migrated = migrateV1(old);
      store.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch { /* fall through */ }
  return fresh();
}

export let state = load();
export function save() { store.setItem(KEY, JSON.stringify(state)); }
export function resetAll() { state = fresh(); save(); }

// ---------------- profiles ----------------
export function listProfiles() { return Object.values(state.profiles); }
export function activeProfile() { return state.profiles[state.active] || null; }

export function addProfile(name, avatar) {
  const id = uid();
  state.profiles[id] = {
    id,
    name: (name || '').trim(),
    avatar: avatar || AVATARS[0],
    stats: {},
    progress: {},
    hiddenSkills: [],   // parent-controlled per-child module visibility
    createdAt: Date.now(),
  };
  state.active = id;
  save();
  return id;
}

export function switchProfile(id) {
  if (state.profiles[id]) { state.active = id; save(); }
}

export function updateProfile(id, patch) {
  const p = state.profiles[id];
  if (p) { Object.assign(p, patch); save(); }
}

export function removeProfile(id) {
  if (!state.profiles[id]) return;
  delete state.profiles[id];
  if (state.active === id) state.active = listProfiles()[0]?.id || null;
  save();
}

// Is a skill shown on this child's home screen? (default: yes)
export function isSkillVisible(profile, skillId) {
  const p = profile || activeProfile();
  if (!p) return true;
  return !(p.hiddenSkills || []).includes(skillId);
}

// Overall accuracy across all skills for one profile (or the active one)
export function overallAccuracy(profile) {
  const p = profile || activeProfile();
  if (!p) return null;
  let answered = 0, correct = 0;
  for (const s of Object.values(p.progress)) {
    answered += s.answered || 0;
    correct += s.correct || 0;
  }
  return answered ? correct / answered : null;
}

// ---------------- adaptivity (always scoped to the active profile) ----------------
export function getLevel(skill, maxLevel) {
  const p = activeProfile()?.progress[skill];
  return Math.min(p?.level || 1, maxLevel);
}

// Record one answer. 3 correct in a row => level up, 2 misses in a row => consolidate down.
export function recordResult(skill, method, correct, maxLevel) {
  const prof = activeProfile();
  if (!prof) return null;

  const s = (prof.stats[skill] ||= {});
  const m = (s[method] ||= { attempts: 0, correct: 0 });
  m.attempts++;
  if (correct) m.correct++;

  const p = (prof.progress[skill] ||= { level: 1, streak: 0, wrong: 0, answered: 0, correct: 0 });
  p.answered++;
  let change = null;
  if (correct) {
    p.correct++; p.streak++; p.wrong = 0;
    if (p.streak >= 3 && p.level < maxLevel) { p.level++; p.streak = 0; change = 'up'; }
  } else {
    p.streak = 0; p.wrong++;
    if (p.wrong >= 2 && p.level > 1) { p.level--; p.wrong = 0; change = 'down'; }
  }
  save();
  return change;
}

export function methodRate(skill, method) {
  const m = activeProfile()?.stats[skill]?.[method];
  if (!m || !m.attempts) return null;
  return m.correct / m.attempts;
}

// Weighted choice: (success rate)^2 + exploration floor. Unseen methods get a neutral 0.5
// so the app tries everything early, then converges on what works for this child.
// `allowed` optionally restricts the pool (e.g. language levels gate harder methods).
// A parent override outside the allowed pool is ignored.
export function pickMethod(skill, allowed = METHODS) {
  const pool = METHODS.filter(m => allowed.includes(m));
  if (state.settings.override && pool.includes(state.settings.override)) return state.settings.override;
  const weights = pool.map(m => {
    const r = methodRate(skill, m);
    return r == null ? 0.5 : r * r + 0.12;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function bestMethod(skill) {
  let best = null, bestR = -1;
  for (const m of METHODS) {
    const r = methodRate(skill, m);
    if (r != null && r > bestR) { bestR = r; best = m; }
  }
  return best;
}

export function skillAccuracy(skill) {
  const p = activeProfile()?.progress[skill];
  if (!p || !p.answered) return null;
  return p.correct / p.answered;
}

// How many sessions' worth of answers this skill has had (for Smart Session ordering)
export function skillAnswered(skill) {
  return activeProfile()?.progress[skill]?.answered || 0;
}
