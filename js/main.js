// App entry point: routing + global speaker-button handling.
import { renderHome, renderDashboard, renderProfiles } from './screens.js';
import { speak, stopSpeak } from './speech.js';

function route(where) {
  stopSpeak();
  if (where === 'dashboard') renderDashboard();
  else if (where === 'profiles') renderProfiles();
  else renderHome();
}

if (typeof window !== 'undefined') {
  window.addEventListener('brightsteps:nav', e => route(e.detail));
}

// Any 🔊 button with data-say speaks its text (event delegation survives re-renders)
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const s = e.target.closest('.speaker');
    if (s && s.dataset.say) speak(decodeURIComponent(s.dataset.say));
  });
  renderHome();
}
