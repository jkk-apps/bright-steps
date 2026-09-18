// Web Audio: gentle piano-like tones for the piano module.
// Two oscillators (fundamental + soft octave harmonic) with a plucked envelope.

let ctx = null;

function audioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

export function playNote(freq, dur = 0.8) {
  const c = audioCtx();
  if (!c) return;
  try {
    const t = c.currentTime;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const o1 = c.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;

    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = c.createGain();
    g2.gain.value = 0.22;

    o1.connect(gain);
    o2.connect(g2);
    g2.connect(gain);
    gain.connect(c.destination);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  } catch { /* audio unavailable — ignore */ }
}

// Play a little tune: array of frequencies spaced by `gap` ms
export function playNotes(freqs, gap = 600) {
  freqs.forEach((f, i) => setTimeout(() => playNote(f), i * gap));
}
