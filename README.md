# 🌈 Bright Steps — Learn Your Way

An adaptive early-years learning web app for children aged **4–7**, aligned to **UK EYFS / KS1**.

## Quick start

**Easiest:** double-click **`bright-steps.html`** — it is a single self-contained file
(HTML + CSS + JS) that works straight from disk in any modern browser. No server needed.

**Development version** (modular source in `js/`): serve the folder over HTTP, because
browsers block ES-module imports from `file://`:

```sh
# any static server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

## Hosting on GitHub Pages (+ installable app)

This repo is ready for GitHub Pages with PWA support (home-screen icon, full-screen
standalone display, offline caching via `sw.js`):

1. Create a new **public** repo on github.com (e.g. `bright-steps`).
2. Upload all files (web UI: "uploading an existing file") or `git push`.
3. Repo **Settings → Pages → Build and deployment**: Source = "Deploy from a branch",
   Branch = `main`, folder = `/ (root)` → Save.
4. Wait ~1 minute, then open `https://<your-username>.github.io/bright-steps/`.
5. **On iPhone/iPad:** open that URL in Safari → Share → **Add to Home Screen** —
   it installs with the ⭐ icon and runs full-screen like a native app, even offline.

## What it teaches

| Skill | Levels | UK alignment |
|---|---|---|
| 🔢 Number recognition | 1–5 → 0–9 → 10–20 → tens → 0–100 | EYFS / Year 1 |
| ➕ Maths | + to 5 → + to 10 → − to 10 → ± to 20 → ×2,5,10 → ÷2,5,10 → missing numbers | KS1 |
| 🔤 Letter recognition | s a t p i n → cumulative Phase 2 sets → full alphabet → case matching | Phonics Phase 2 |
| 📖 SATPIN words | satpin-only CVC → Phase 2 CVC → Phase 3 digraphs → Phase 4 blends | Phonics Phases 2–4 |
| 🎨 Colours | 4 → 8 → 11 colours → reading colour words | EYFS |
| 📚 Reading | Lilac (wordless) → Pink → Red → Yellow → Blue → Green | UK book bands |
| 🎹 Piano | C-D-E → C-G → one octave → two octaves (playable keyboard, ear training, copy-the-tune) | early music |
| 🇪🇸 Spanish | greetings → numbers 1-10 → colours → animals → food (native TTS voices) | early MFL |
| 🇫🇷 French | greetings → numbers 1-10 → colours → animals → food (native TTS voices) | early MFL |

**Language skills are gentler for young beginners** (Reception-style: listen first, read later,
spell last): levels 1–2 use only 👂 Listen and 👀 Look (with tappable 🔊 on every word and just
2 choices at level 1), 🧩 Match unlocks at level 3, and 🎈 spelling unlocks at level 5 — limited
to short words (≤5 letters). Listening rounds say the word twice.

## How the adaptivity works

Every question is tagged with a **learning method**:

- 👀 **Look & Find** — visual prompt, choose the answer
- 👂 **Listen & Find** — spoken prompt only (Web Speech API, en-GB voice)
- 🧩 **Match It** — matching pairs
- 🎈 **Tap & Play** — hands-on hunt/build games

The engine (`js/engine.js`):

1. **Counts** every attempt and success per skill × method (`localStorage`, nothing leaves the device).
2. **Chooses methods** by weighted success: `weight = successRate² + 0.12 exploration` —
   so better methods appear more often, but nothing is ever abandoned completely.
3. **Presents advanced material through the winning method**: 3 correct in a row levels the
   skill up, and new/harder content is then served preferentially via the child's most
   successful methods. 2 misses in a row drops back a level to consolidate.

## Multiple children

Each child gets their own **profile** (avatar + name) with fully separate stats, levels and
learned method preferences. **The whole app re-colours itself to match the chosen avatar**
(🦊 orange, 🐰 pink, 🐸 green, 🐧 blue…) — buttons, titles, highlights and even the
installed app's title-bar colour — and you see a live preview while picking the avatar.
On first launch the app asks who is learning; tap "👋 Bye" on the home screen to switch. Profiles can be added, renamed, re-avatared, switched and
deleted from the Parent Dashboard. Data from the original single-profile version is
migrated automatically on first run.

The **Parent Dashboard** (bottom of the home screen) shows per-method success rates, current
levels, the child's "preferred" method per skill, an optional method override, and a reset button.
It sits behind a **parent gate**: a deliberately plain grey "🔒 Grown-ups" link (kids are drawn to
big colourful buttons, not grey text) followed by a 3-second press-and-hold screen. Destructive
actions (delete profile, reset all) also ask for confirmation.

## Project structure

```
index.html        entry point (dev version)
styles.css        all styling
js/
  data.js         curriculum content: skills, levels, words, book bands
  engine.js       adaptivity: stats, method weighting, level progression
  speech.js       Web Speech API wrapper
  activities.js   question generators (6 skills × 4 methods) + session runner
  screens.js      home screen + parent dashboard
  main.js         routing/bootstrap
bright-steps.html single-file build (open this to play)
```

## Roadmap ideas

- Backend sync (accounts, cross-device progress)
- Response-time tracking per method
- More book bands (Orange → White) and trickier-word teaching
- Piano: black keys / sharps & flats level, famous nursery tunes to copy
- Languages: phrase-of-the-day, more themes (family, clothes, days)
- Recordable adult voice instead of TTS
