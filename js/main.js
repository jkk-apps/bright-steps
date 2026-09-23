// App entry point: routing + global speaker-button handling.
import { renderHome, renderDashboard, renderProfiles } from './screens.js';
import { speak, stopSpeak, setVoicePreference } from './speech.js';
import { state, save } from './engine.js';
import { unlockAudio } from './audio.js';

// Apply the saved voice choice (parent dashboard) before anything speaks.
// The picker only offers Daniel, downloaded Enhanced/Premium voices, or the
// automatic soft female — clear any older saved choice so the default takes over.
if (state.settings.voiceName && !/daniel|\(enhanced\)|\(premium\)/i.test(state.settings.voiceName)) {
  state.settings.voiceName = null;
  save();
}
setVoicePreference(state.settings.voiceName ?? null);

function route(where) {
  stopSpeak();
  if (where === 'dashboard') renderDashboard();
  else if (where === 'profiles') renderProfiles();
  else renderHome();
}

if (typeof window !== 'undefined') {
  window.addEventListener('brightsteps:nav', e => route(e.detail));
}

// Anything with a data-say attribute speaks its text when tapped —
// 🔊 buttons AND the task prompt itself (so children can tap the
// instruction to hear it again). Event delegation survives re-renders.
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-say]');
    if (s && s.dataset.say) speak(decodeURIComponent(s.dataset.say), { lang: s.dataset.lang || undefined });
  });

  // Stop accidental zooming from little fingers: pinch (iOS gesture events)
  // and double-tap. (body already has touch-action: manipulation; the viewport
  // meta locks scale when launched from the home-screen icon.)
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

  // Wake/unlock the audio context on every touch — iOS can suspend or interrupt
  // it (especially after text-to-speech), and a gesture is the way to revive it.
  document.addEventListener('pointerdown', unlockAudio);

  renderHome();
}
