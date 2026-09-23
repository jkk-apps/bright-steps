// Web Audio: gentle piano-like tones for the piano module.
// Two oscillators (fundamental + soft octave harmonic) with a plucked envelope.

let ctx = null;

function audioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = ctx || new AC();
    return ctx;
  } catch { return null; }
}

// Ask iOS to treat our audio like music playback, so it still sounds when the
// phone's silent/mute switch is on (supported iOS 17+, ignored elsewhere).
if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
  try { navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
}

// iOS can leave the context 'interrupted' or 'suspended' — especially after
// text-to-speech has run — so always resume first, and only schedule the note
// once the context is actually running.
function whenRunning(fn) {
  const c = audioCtx();
  if (!c) return;
  if (c.state === 'running') { fn(c); return; }
  c.resume().then(() => { if (c.state === 'running') fn(c); }).catch(() => {});
}

// Warm up the audio context on any user touch so autoplay policies are
// satisfied before the first note needs to play.
export function unlockAudio() { whenRunning(() => {}); }

// Is audio actually able to produce sound right now? (Used for the free-play
// "no sound" hint when the device is muted/interrupted.)
export function audioReady() { return !!ctx && ctx.state === 'running'; }

function scheduleNote(c, freq, dur) {
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

export function playNote(freq, dur = 0.8) {
  whenRunning(c => scheduleNote(c, freq, dur));
}

// Play a little tune: array of frequencies spaced by `gap` ms
export function playNotes(freqs, gap = 600) {
  freqs.forEach((f, i) => setTimeout(() => playNote(f), i * gap));
}
