// Screens: profile picker, profile creation, home, parent dashboard.
import { SKILLS } from './data.js';
import {
  state, save, resetAll,
  listProfiles, activeProfile, addProfile, switchProfile, updateProfile, removeProfile,
  overallAccuracy, getLevel, skillAccuracy, skillAnswered, methodRate, bestMethod,
  METHODS, METHOD_META, AVATARS,
} from './engine.js';
import { startSession } from './activities.js';

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function nav(where) {
  window.dispatchEvent(new CustomEvent('brightsteps:nav', { detail: where }));
}

// ---------------- home ----------------
export function renderHome() {
  const prof = activeProfile();
  if (!prof) { renderProfiles(); return; }

  const app = document.getElementById('app');
  app.innerHTML = `
    <h1 class="app-title">🌈 Bright Steps</h1>
    <p class="tagline">Learn your way — the app notices what works and gives you more of it!</p>
    <p class="greeting">${prof.avatar} Hello, <b>${esc(prof.name || 'friend')}</b>!
      <button class="switch-btn" id="switchBtn">👥 not you?</button>
    </p>
    <button class="btn smart-btn" id="smartBtn">✨ Smart Session</button>
    <div class="skill-grid">
      ${Object.values(SKILLS).map(sk => {
        const lvl = getLevel(sk.id, sk.maxLevel);
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
    <p class="parent-link"><button class="btn secondary" id="parentBtn">👨‍👩‍👧 Parent Dashboard</button></p>`;

  document.querySelectorAll('.skill-card').forEach(card => {
    card.onclick = () => startSession(card.dataset.id);
  });
  document.getElementById('smartBtn').onclick = () => startSession(pickSmartSkill());
  document.getElementById('parentBtn').onclick = () => nav('dashboard');
  document.getElementById('switchBtn').onclick = () => nav('profiles');
}

// Smart Session: prioritise the least-practised skill, then the lowest accuracy.
function pickSmartSkill() {
  return Object.keys(SKILLS).sort((a, b) => {
    const aa = skillAnswered(a), ab = skillAnswered(b);
    if (aa !== ab) return aa - ab;
    return (skillAccuracy(a) ?? 0.5) - (skillAccuracy(b) ?? 0.5);
  })[0];
}

// ---------------- profile picker ----------------
export function renderProfiles() {
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

  app.innerHTML = `
    <div class="topbar"><button class="home-btn" id="backBtn">←</button>
      <div class="session-title">New learner</div><span></span></div>
    <div class="dash-card" style="text-align:center">
      <p style="font-size:1.3rem;margin-top:4px">Pick an avatar:</p>
      <div class="avatar-row" id="avatarRow">
        ${AVATARS.map((a, i) => `<button class="avatar-btn ${i === 0 ? 'selected' : ''}" data-a="${a}">${a}</button>`).join('')}
      </div>
      <input class="name-input" id="newName" placeholder="Child's name" style="text-align:center;font-size:1.4rem" maxlength="20">
      <div class="btn-row"><button class="btn" id="saveBtn">Start! 🚀</button></div>
    </div>`;

  document.querySelectorAll('#avatarRow .avatar-btn').forEach(btn => {
    btn.onclick = () => {
      selected = btn.dataset.a;
      document.querySelectorAll('#avatarRow .avatar-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });
  const saveProfile = () => {
    const name = document.getElementById('newName').value;
    addProfile(name, selected);
    renderHome();
  };
  document.getElementById('saveBtn').onclick = saveProfile;
  document.getElementById('newName').onkeydown = e => { if (e.key === 'Enter') saveProfile(); };
  document.getElementById('backBtn').onclick = () => renderProfiles();
  document.getElementById('newName').focus();
}

// ---------------- parent dashboard ----------------
export function renderDashboard() {
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
        <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
          ${p.id !== state.active ? `<button class="mini-btn" data-switch="${p.id}">Switch</button>` : ''}
          <button class="mini-btn" data-rename="${p.id}">Rename</button>
          <button class="mini-btn" data-avatar="${p.id}">Avatar</button>
          <button class="mini-btn" data-delete="${p.id}">🗑</button>
        </span>
      </div>`;
  }).join('');

  const cards = prof ? Object.values(SKILLS).map(sk => {
    const lvl = getLevel(sk.id, sk.maxLevel);
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
    <div class="dash-card">
      <div class="settings-row">
        <label>Learning method:
          <select id="overrideSel">
            <option value="">✨ Adaptive (recommended)</option>
            ${METHODS.map(m => `<option value="${m}" ${state.settings.override === m ? 'selected' : ''}>${METHOD_META[m].icon} ${METHOD_META[m].name}</option>`).join('')}
          </select>
        </label>
      </div>
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
    <div class="btn-row"><button class="btn secondary" id="resetBtn">🗑 Reset everything (all children)</button></div>`;

  document.getElementById('homeBtn').onclick = () => nav('home');
  const sel = document.getElementById('overrideSel');
  sel.onchange = () => { state.settings.override = sel.value || null; save(); };
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
}
