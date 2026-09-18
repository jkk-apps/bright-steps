// Web Speech API wrapper — child-friendly en-GB voice where available.
let voice = null;

function pickVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const vs = window.speechSynthesis.getVoices();
  voice = vs.find(v => /en-GB/i.test(v.lang) && /female|google uk english female|kate|stephanie|serena/i.test(v.name))
       || vs.find(v => /en-GB/i.test(v.lang))
       || vs[0] || null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text, opts = {}) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = 'en-GB';
  u.rate = opts.rate ?? 0.9;   // slightly slower for little ears
  u.pitch = opts.pitch ?? 1.15;
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
