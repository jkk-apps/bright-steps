// App entry point: routing + global speaker-button handling.
import { renderHome, renderDashboard, renderProfiles } from './screens.js';
import { speak, stopSpeak, setVoicePreference } from './speech.js';
import { state, save } from './engine.js';

// Apply the saved voice choice (parent dashboard) before anything speaks.
// Only Daniel or the automatic soft female voice are offered now — clear any
// older saved choice so the default takes over.
if (state.settings.voiceName && !/daniel/i.test(state.settings.voiceName)) {
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
  renderHome();
}
