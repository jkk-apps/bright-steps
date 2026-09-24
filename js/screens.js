// Screens: profile picker, profile creation, home, parent dashboard.
import { SKILLS, AGE_BANDS, STICKERS } from './data.js';
import {
  state, save, resetAll,
  listProfiles, activeProfile, addProfile, switchProfile, updateProfile, removeProfile,
  overallAccuracy, getLevel, skillAccuracy, skillAnswered, methodRate, bestMethod,
  isSkillVisible, profileBand, skillMax, isValidBackup, replaceState,
  METHODS, METHOD_META, AVATARS, themeFor, DEFAULT_THEME,
} from './engine.js';
import { startSession, renderPianoFreePlay, renderCertificate } from './activities.js';
import { speak, getVoices, setVoicePreference, onVoicesChanged, isHighQuality } from './speech.js';

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function nav(where) {
  window.dispatchEvent(new CustomEvent('brightsteps:nav', { detail: where }));
}

// Re-colour the whole app to match a child's avatar (or the default purple).
function applyTheme(theme) {
  const t = theme || themeFor(activeProfile()?.avatar);
  const root = document.documentElement.style;
  root.setProperty('--theme', t.c);
  root.setProperty('--theme-dark', t.dark);
  root.setProperty('--theme-soft', t.soft);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.c);
}

let unsubscribeVoices = null;

function refreshVoiceList() {
  const vsel = document.getElementById('voiceSel');
  if (!vsel) return; // dashboard not open any more
  const current = state.settings.voiceName || '';
  vsel.innerHTML = `<option value="">🎀 Soft female (automatic)</option>${voiceOptions()}`;
  vsel.value = current;
}

function subscribeVoiceList() {
  if (unsubscribeVoices) unsubscribeVoices();
  unsubscribeVoices = onVoicesChanged(refreshVoiceList);
}

// Voices offered in the dashboard: the automatic soft female (which now prefers
// downloaded Enhanced/Premium voices), any enhanced/premium voices found on this
// device, and Daniel (British male). Basic voices stay hidden to keep it simple.
function voiceOptions() {
  const vs = getVoices();
  const fancy = vs.filter(v => isHighQuality(v) && /^en/i.test(v.lang || ''));
  const daniel = vs.filter(v => /daniel/i.test(v.name));
  const seen = new Set();
  return [...fancy, ...daniel]
    .filter(v => !seen.has(v.name) && seen.add(v.name))
    .map(v => `<option value="${esc(v.name)}" ${state.settings.voiceName === v.name ? 'selected' : ''}>${esc(v.name)} (${v.lang})</option>`).join('');
}

// ---------------- home ----------------
export function renderHome() {
  const prof = activeProfile();
  if (!prof) { renderProfiles(); return; }
  applyTheme();

  const app = document.getElementById('app');
  app.innerHTML = `
    <h1 class="app-title">🌈 Bright Steps</h1>
    <p class="tagline">Learn your way!</p>
    <p class="greeting">${prof.avatar} Hello, <b>${esc(prof.name || 'friend')}</b>!
      <button class="switch-btn" id="switchBtn" title="Switch child">👋 Bye</button>
    </p>
    <button class="btn smart-btn" id="smartBtn">✨ Smart Session</button>
    <div class="skill-grid">
      ${Object.values(SKILLS).filter(sk => isSkillVisible(prof, sk.id)).map(sk => {
        const lvl = getLevel(sk.id, skillMax(prof, sk.id));
        const acc = skillAccuracy(sk.id);
        return `
          <div class="skill-card" style="--c:${sk.colour}" data-id="${sk.id}">
            <div class="skill-icon">${sk.icon}</div>
            <div class="skill-name">${sk.name}</div>
            <div class="skill-level">Level ${lvl} · ${sk.levelNames[lvl - 1]}</div>
            <div class="skill-level">${acc == null ? 'Not played yet' : `Accuracy ${Math.round(acc * 100)}%`}</div>
          </div>`;
      }).join('')}
    </div>
    <p class="free-piano-row">
      <button class="btn secondary" id="albumBtn">🎁 My Stickers (${(prof.stickers || []).length})</button>
      <button class="btn secondary" id="freePianoBtn">🎹 Just play the piano</button>
    </p>
    <p class="parent-link"><button class="parent-gate-link" id="parentBtn">🔒 Grown-ups</button></p>`;

  document.querySelectorAll('.skill-card').forEach(card => {
    card.onclick = () => startSession(card.dataset.id);
  });
  document.getElementById('smartBtn').onclick = () => startSession(pickSmartSkill());
  document.getElementById('freePianoBtn').onclick = () => renderPianoFreePlay();
  document.getElementById('albumBtn').onclick = () => renderAlbum();
  document.getElementById('parentBtn').onclick = () => renderParentGate();
  document.getElementById('switchBtn').onclick = () => nav('profiles');
}

// Smart Session: prioritise the least-practised skill, then the lowest accuracy.
// (Only skills the parent has left visible for this child are considered.)
function pickSmartSkill() {
  const visible = Object.keys(SKILLS).filter(id => isSkillVisible(null, id));
  return visible.sort((a, b) => {
    const aa = skillAnswered(a), ab = skillAnswered(b);
    if (aa !== ab) return aa - ab;
    return (skillAccuracy(a) ?? 0.5) - (skillAccuracy(b) ?? 0.5);
  })[0];
}

// ---------------- sticker album ----------------
export function renderAlbum() {
  const prof = activeProfile();
  if (!prof) { renderProfiles(); return; }
  applyTheme();
  const stickers = prof.stickers || [];
  const counts = {};
  stickers.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  const earned = Object.keys(counts);
  // uncollected stickers show as faint silhouettes so there's something to aim for
  const all = [...STICKERS.rare, ...STICKERS.common];
  const missing = all.filter(s => !counts[s]);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="topbar"><button class="home-btn" id="homeBtn">🏠</button>
      <div class="session-title">🎁 ${esc(prof.name || 'My')}'s Stickers</div><span></span></div>
    <p class="greeting">You have collected <b>${stickers.length}</b> sticker${stickers.length === 1 ? '' : 's'}!
      ${stickers.length === 0 ? 'Finish a game to earn your first one!' : 'Get 5 stars for a rare one!'}</p>
    <div class="sticker-grid">
      ${earned.map(s => `
        <div class="sticker-cell ${STICKERS.rare.includes(s) ? 'rare' : ''}">${s}
          ${counts[s] > 1 ? `<span class="sticker-count">×${counts[s]}</span>` : ''}
        </div>`).join('')}
      ${missing.map(s => `<div class="sticker-cell empty">${s}</div>`).join('')}
    </div>`;
  document.getElementById('homeBtn').onclick = () => nav('home');
}

// ---------------- profile picker ----------------
export function renderProfiles() {
  applyTheme(DEFAULT_THEME); // neutral colour while nobody is picked
  const app = document.getElementById('app');
  const profiles = listProfiles();

  app.innerHTML = `
    <h1 class="app-title">🌈 Bright Steps</h1>
    <p class="greeting">Who is learning today?</p>
    <div class="profile-grid">
      ${profiles.map(p => {
        const acc = overallAccuracy(p);
        return `
          <div class="profile-card" data-id="${p.id}">
            <div class="profile-avatar">${p.avatar}</div>
            <div class="profile-name">${esc(p.name || 'Unnamed')}</div>
            <div class="profile-sub">${acc == null ? 'new learner' : Math.round(acc * 100) + '% overall'}</div>
          </div>`;
      }).join('')}
      <div class="profile-card add" id="addCard">
        <div class="profile-avatar">➕</div>
        <div class="profile-name">Add child</div>
        <div class="profile-sub">create a profile</div>
      </div>
    </div>
    ${state.active ? '<p class="parent-link"><button class="btn secondary" id="backHome">← Back</button></p>' : ''}`;

  document.querySelectorAll('.profile-card[data-id]').forEach(card => {
    card.onclick = () => { switchProfile(card.dataset.id); renderHome(); };
  });
  document.getElementById('addCard').onclick = () => renderProfileForm();
  const back = document.getElementById('backHome');
  if (back) back.onclick = () => renderHome();
}

// ---------------- new profile form ----------------
function renderProfileForm() {
  const app = document.getElementById('app');
  let selected = AVATARS[0];
  let band = '4-7';
  applyTheme(themeFor(selected));

  app.innerHTML = `
    <div class="topbar"><button class="home-btn" id="backBtn">←</button>
      <div class="session-title">New learner</div><span></span></div>
    <div class="dash-card" style="text-align:center">
      <p style="font-size:1.3rem;margin-top:4px">Pick an avatar:</p>
      <div class="avatar-row" id="avatarRow">
        ${AVATARS.map((a, i) => `<button class="avatar-btn ${i === 0 ? 'selected' : ''}" data-a="${a}">${a}</button>`).join('')}
      </div>
      <p style="font-size:1.3rem;margin-bottom:2px">How old are they?</p>
      <div class="band-row" id="bandRow">
        ${Object.entries(AGE_BANDS).map(([id, b]) => `
          <button class="band-btn ${id === band ? 'selected' : ''}" data-band="${id}">
            ${b.icon} ${b.label}<small>${b.blurb}</small>
          </button>`).join('')}
      </div>
      <input class="name-input" id="newName" placeholder="Child's name" style="text-align:center;font-size:1.4rem" maxlength="20">
      <div class="btn-row"><button class="btn" id="saveBtn">Start! 🚀</button></div>
    </div>`;

  document.querySelectorAll('#avatarRow .avatar-btn').forEach(btn => {
    btn.onclick = () => {
      selected = btn.dataset.a;
      document.querySelectorAll('#avatarRow .avatar-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      applyTheme(themeFor(selected)); // live preview: app re-colours as they pick
    };
  });
  document.querySelectorAll('#bandRow .band-btn').forEach(btn => {
    btn.onclick = () => {
      band = btn.dataset.band;
      document.querySelectorAll('#bandRow .band-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });
  const saveProfile = () => {
    const name = document.getElementById('newName').value;
    addProfile(name, selected, band);
    renderHome();
  };
  document.getElementById('saveBtn').onclick = saveProfile;
  document.getElementById('newName').onkeydown = e => { if (e.key === 'Enter') saveProfile(); };
  document.getElementById('backBtn').onclick = () => renderProfiles();
  document.getElementById('newName').focus();
}

// ---------------- parent gate ----------------
// Young children tap anything big and colourful, so the dashboard sits behind
// a plain grey link + a 3-second press-and-hold (plus a written instruction
// pre-readers can't follow). Destructive actions keep their confirm() dialogs.
function renderParentGate() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="topbar"><button class="home-btn" id="gateBack">←</button>
      <div class="session-title">Grown-ups</div><span></span></div>
    <div class="dash-card gate-card">
      <div class="gate-lock">🔒</div>
      <p class="gate-title">Grown-ups only</p>
      <p class="gate-sub">Press and hold the button below for 3 seconds to open the Parent Dashboard.</p>
      <button class="gate-hold" id="gateBtn"><span class="gate-fill"></span><span class="gate-label">🔒 Hold to open</span></button>
    </div>`;

  const btn = document.getElementById('gateBtn');
  let timer = null;
  const start = e => {
    e.preventDefault();
    if (timer) return;
    btn.classList.add('holding');
    timer = setTimeout(() => { timer = null; renderDashboard(); }, 3000);
  };
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    btn.classList.remove('holding');
  };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('contextmenu', e => e.preventDefault()); // no long-press menu on iOS
  document.getElementById('gateBack').onclick = () => nav('home');
}

// ---------------- parent dashboard ----------------
export function renderDashboard() {
  applyTheme(); // dashboard follows the current child's colour
  const app = document.getElementById('app');
  const prof = activeProfile();

  const profileRows = listProfiles().map(p => {
    const acc = overallAccuracy(p);
    return `
      <div class="profile-row">
        <span style="font-size:1.8rem">${p.avatar}</span>
        <b>${esc(p.name || 'Unnamed')}</b>
        ${p.id === state.active ? '<span class="chip">current</span>' : ''}
        <span class="profile-sub">${acc == null ? 'no plays yet' : Math.round(acc * 100) + '% overall'}</span>
        <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <label class="profile-sub">Age band
            <select data-ageband="${p.id}" style="font-size:.9rem;padding:5px 8px">
              ${Object.entries(AGE_BANDS).map(([id, b]) => `
                <option value="${id}" ${profileBand(p) === id ? 'selected' : ''}>${b.icon} ${b.label}</option>`).join('')}
            </select>
          </label>
          ${p.id !== state.active ? `<button class="mini-btn" data-switch="${p.id}">Switch</button>` : ''}
          <button class="mini-btn" data-rename="${p.id}">Rename</button>
          <button class="mini-btn" data-avatar="${p.id}">Avatar</button>
          <button class="mini-btn" data-delete="${p.id}">🗑</button>
        </span>
        <span class="profile-sub" style="width:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          Show on their home screen:
          ${['spanish', 'french'].map(sid => `
            <label class="skill-toggle">
              <input type="checkbox" data-toggle="${sid}" data-pid="${p.id}" ${(p.hiddenSkills || []).includes(sid) ? '' : 'checked'}>
              ${SKILLS[sid].icon} ${SKILLS[sid].name}
            </label>`).join('')}
        </span>
      </div>`;
  }).join('');

  const cards = prof ? Object.values(SKILLS).map(sk => {
    const lvl = getLevel(sk.id, skillMax(prof, sk.id));
    const acc = skillAccuracy(sk.id);
    const best = bestMethod(sk.id);
    const bars = METHODS.map(m => {
      const r = methodRate(sk.id, m);
      const mm = METHOD_META[m];
      const pct = r == null ? 0 : Math.round(r * 100);
      return `
        <div class="bar-row">
          <div>${mm.icon} ${mm.name} ${best === m ? '<span class="best-badge">⭐ preferred</span>' : ''}</div>
          <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-label">${r == null ? 'no data yet' : pct + '%'}</div>
        </div>`;
    }).join('');
    return `
      <div class="dash-card">
        <div class="dash-head">
          <span class="icon">${sk.icon}</span><span class="name">${sk.name}</span>
          ${prof && !isSkillVisible(prof, sk.id) ? '<span class="chip">🙈 hidden from child</span>' : ''}
          <span class="level-pill">Level ${lvl}: ${sk.levelNames[lvl - 1]}</span>
        </div>
        <div class="bar-label" style="margin-bottom:8px">Overall accuracy: ${acc == null ? '—' : Math.round(acc * 100) + '%'}</div>
        ${bars}
      </div>`;
  }).join('') : '<div class="dash-card">No profile selected.</div>';

  app.innerHTML = `
    <div class="topbar">
      <button class="home-btn" id="homeBtn">🏠</button>
      <div class="session-title">👨‍👩‍👧 Parent Dashboard</div><span></span>
    </div>
    <div class="dash-card">
      <div class="dash-head"><span class="icon">🧒</span><span class="name">Children</span></div>
      ${profileRows || '<p class="dash-note">No profiles yet.</p>'}
      <div class="btn-row" style="justify-content:flex-start;margin-top:12px">
        <button class="btn small secondary" id="addProfileBtn">➕ Add child</button>
      </div>
    </div>
    ${prof ? `
    <div class="dash-card">
      <div class="dash-head"><span class="icon">🏅</span><span class="name">Certificates — ${prof.avatar} ${esc(prof.name || 'Unnamed')}</span></div>
      ${(prof.certificates || []).length ? (prof.certificates || []).map((c, i) => ({ c, i })).slice(-8).reverse().map(({ c, i }) => `
        <button class="cert-row" data-cert="${i}">
          ${SKILLS[c.skill]?.icon || '⭐'} Level ${c.level} · ${SKILLS[c.skill]?.levelNames[c.level - 1] || ''}
          <span class="profile-sub" style="margin-left:auto">${new Date(c.at).toLocaleDateString('en-GB')}</span>
          <span class="cert-view">view ›</span>
        </button>`).join('') : '<p class="dash-note">No certificates yet — one is earned the first time each new level is reached.</p>'}
    </div>` : ''}
    <div class="dash-card">
      <div class="settings-row">
        <label>Learning method:
          <select id="overrideSel">
            <option value="">✨ Adaptive (recommended)</option>
            ${METHODS.map(m => `<option value="${m}" ${state.settings.override === m ? 'selected' : ''}>${METHOD_META[m].icon} ${METHOD_META[m].name}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="settings-row">
        <label>Reading voice:
          <select id="voiceSel">
            <option value="">🎀 Soft female (automatic)</option>
            ${voiceOptions()}
          </select>
        </label>
        <button class="mini-btn" id="testVoiceBtn">🔊 Test voice</button>
      </div>
      <p class="dash-note">🎙 <b>Want a more human voice?</b> Download an <i>Enhanced</i> voice
        on this device (iPhone/iPad: Settings → Accessibility → <i>Read &amp; Speak</i> — called
        <i>Spoken Content</i> on older iOS — → Voices → English; Mac: System Settings →
        Accessibility → Spoken Content → System Voice → Manage Voices).
        It appears in this list afterwards and is used automatically.</p>
      <p class="dash-note">
        Showing stats for <b>${prof ? `${prof.avatar} ${esc(prof.name || 'Unnamed')}` : '—'}</b>.
        <b>How adaptivity works:</b> every answer is counted per child, per skill and per learning method.
        Methods with higher success rates are chosen more often, and harder (higher-level)
        material is served preferentially through the child's most successful methods —
        with a little exploration kept so the app keeps learning too.
        Three correct answers in a row move up a level; two misses move back down to consolidate.
      </p>
    </div>
    ${cards}
    <div class="dash-card">
      <div class="dash-head"><span class="icon">💾</span><span class="name">Backup &amp; move device</span></div>
      <p class="dash-note">All progress is stored only on this device. To move every child to a new
        phone or tablet: <b>export</b> here, send the file to the new device (AirDrop, email, Files…),
        open Bright Steps there, then <b>import</b>.</p>
      <div class="btn-row" style="justify-content:flex-start;margin-top:10px">
        <button class="btn small secondary" id="exportBtn">⬇️ Export progress</button>
        <button class="btn small secondary" id="importBtn">⬆️ Import progress</button>
      </div>
    </div>
    <div class="btn-row"><button class="btn secondary" id="resetBtn">🗑 Reset everything (all children)</button></div>`;

  document.getElementById('homeBtn').onclick = () => nav('home');
  const sel = document.getElementById('overrideSel');
  sel.onchange = () => { state.settings.override = sel.value || null; save(); };
  const vsel = document.getElementById('voiceSel');
  vsel.onchange = () => {
    state.settings.voiceName = vsel.value || null;
    save();
    setVoicePreference(vsel.value || null);
  };
  document.getElementById('testVoiceBtn').onclick = () =>
    speak('Hello! Shall we read a story together?');

  // Voices load asynchronously in most browsers — repopulate the dropdown
  // as soon as they arrive (or after a short nudge if no event fires)
  subscribeVoiceList();
  if (!getVoices().length) setTimeout(refreshVoiceList, 600);
  document.getElementById('addProfileBtn').onclick = () => renderProfileForm();

  document.querySelectorAll('[data-switch]').forEach(b => {
    b.onclick = () => { switchProfile(b.dataset.switch); renderDashboard(); };
  });
  document.querySelectorAll('[data-rename]').forEach(b => {
    b.onclick = () => {
      const p = state.profiles[b.dataset.rename];
      const name = prompt('New name:', p?.name || '');
      if (name !== null) { updateProfile(b.dataset.rename, { name: name.trim() }); renderDashboard(); }
    };
  });
  document.querySelectorAll('[data-avatar]').forEach(b => {
    b.onclick = () => {
      const p = state.profiles[b.dataset.avatar];
      if (!p) return;
      const next = AVATARS[(AVATARS.indexOf(p.avatar) + 1) % AVATARS.length];
      updateProfile(p.id, { avatar: next });
      renderDashboard();
    };
  });
  document.querySelectorAll('[data-ageband]').forEach(selB => {
    selB.onchange = () => { updateProfile(selB.dataset.ageband, { ageBand: selB.value }); renderDashboard(); };
  });
  document.querySelectorAll('[data-toggle]').forEach(cb => {
    cb.onchange = () => {
      const p = state.profiles[cb.dataset.pid];
      if (!p) return;
      const set = new Set(p.hiddenSkills || []);
      if (cb.checked) set.delete(cb.dataset.toggle); else set.add(cb.dataset.toggle);
      updateProfile(p.id, { hiddenSkills: [...set] });
    };
  });
  document.querySelectorAll('[data-delete]').forEach(b => {
    b.onclick = () => {
      const p = state.profiles[b.dataset.delete];
      if (confirm(`Delete profile "${p?.name || 'Unnamed'}" and all its progress?`)) {
        removeProfile(b.dataset.delete);
        renderDashboard();
      }
    };
  });
  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Reset EVERYTHING — all children, progress and statistics?')) { resetAll(); renderDashboard(); }
  };

  // tap a certificate row to view it full-screen (quiet mode — no confetti/speech)
  document.querySelectorAll('[data-cert]').forEach(b => {
    b.onclick = () => {
      const cert = (activeProfile()?.certificates || [])[+b.dataset.cert];
      if (cert) renderCertificate(cert, () => renderDashboard(), { celebrate: false, backLabel: '← Back to dashboard' });
    };
  });

  // ---- backup: export all progress as a JSON file / import it on another device ----
  document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bright-steps-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  document.getElementById('importBtn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); } catch { data = null; }
        if (!isValidBackup(data)) {
          alert('That file does not look like a Bright Steps backup — nothing was changed.');
          return;
        }
        if (!confirm('This replaces ALL progress on this device with the backup file. Continue?')) return;
        replaceState(data);
        setVoicePreference(state.settings.voiceName || null);
        renderDashboard();
      };
      reader.readAsText(file);
    };
    input.click();
  };
}
