# Wrestling from Marigold — Build Log

---

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Phaser 4 (via CDN) | Loaded as global; ES module scene files served via Vite |
| Dev server | Vite | `npm run dev` — hot reload |
| Language | JavaScript (ES modules) |  |
| Hosting | GitHub Pages (planned) | Static, no server required |

**Key discovery:** Phaser 4 must be loaded via CDN `<script>` tag, not imported via npm/Vite. The ESM dist does not initialize correctly when bundled through Vite. Scene files use the global `Phaser` object.

---

## Sessions Log

### 2026-05-15 — Phase 1: Arena Environment

**Goal:** Prove the visual direction works before building any game logic.

**Built:**
- Project scaffolded — Vite dev server, Phaser 4 via CDN, ES module scene files
- `src/scenes/Arena.js` — full arena environment drawn with Phaser Graphics API
- Ring in perspective: trapezoid mat (wide near side, narrow far side), 3 rope levels, 4 corner posts, near apron with MWF banner block, MWF logo circle on canvas
- 10 rows of crowd silhouettes behind the far ropes — deterministic layout, signs held up, depth variation by row
- Dark arena background with warm light pooling over the ring area
- Broadcast filter stack:
  - Scanlines — generated once via `generateTexture`, displayed as static image at 18% alpha
  - Film grain — 1400 random 1×1 px dots redrawn every frame (700 white, 700 black)
  - Screen flicker — white overlay rect pulsing via sine wave + random noise
  - Grayscale + contrast — applied via Phaser 4 camera `ColorMatrix` filter
  - Vignette — applied via Phaser 4 camera `Vignette` filter (external)
- Broadcast title card — fades in on load, holds 3.2s, dissolves to arena:
  - "MIDWEST WRESTLING FEDERATION presents WRESTLING FROM MARIGOLD"
  - "LIVE FROM MARIGOLD ARENA · CHICAGO, ILLINOIS"
  - "WFM" moniker in dim type below

**Bugs fixed:**
- Black screen on load — root cause: `import Phaser from 'phaser'` via Vite does not correctly initialize the Phaser namespace. Fix: load Phaser via CDN `<script>` tag before the module entry point; scene files reference global `Phaser` object.
- `this.make.graphics({ add: false })` — does not exist in Phaser 4. Replaced with `this.add.graphics()` + `generateTexture()` + `destroy()` for the scanline texture.

**Known issues / next session:**
- Visual tweaks still needed (noted by Derek — details TBD)
- Grayscale filter may not be applying in all browsers depending on WebGL support — verify
- `generateTexture` behavior in Phaser 4 may differ from v3 — confirm scanlines render correctly

---

### 2026-05-16 — Phase 2: Core Engine (in progress)

**Goal:** Two playable wrestlers with movement, perspective scaling, ring boundary, and a working pin loop.

**Built:**
- `src/constants.js` — shared RING geometry, `ringBoundsAtY()`, `perspectiveScale()` extracted for use across modules
- `src/Wrestler.js` — Wrestler class: perspective-scaled Graphics figure, WASD/arrow key movement, ring boundary clamping, soft collision between wrestlers, body slam + pin loop
- Ring boundary constraint — trapezoid clamping using linear interpolation of near/far corners at any y
- Perspective scaling — figure dimensions multiply by `perspectiveScale(y)` (0.58 far → 1.0 near); wrestlers visibly grow and shrink as they move toward/away from camera
- Depth sorting — `gfx.setDepth(15 + y * 0.02)` keeps near wrestlers in front of far wrestlers
- Game loop in `Arena.js` — `_tickGame()`, `_tickPin()`, `_showWin()` handle state transitions
- Body slam: 500ms wind-up, opponent placed adjacent and enters 'down' state for 4.5s
- Pin: 3-count at 0.85s per count; defender mashes action key to kick out; win screen + match reset

**Controls:**
- P1: WASD + F (action)
- P2: Arrow keys + Enter (action)

**Decisions:**
- Wrestlers drawn at 6ft scale: 258px tall at near edge (43px/ft from ring proportions), scaling to ~150px at far edge
- Graphics API placeholder figures now; sprite system planned for Phase 3

**Known issues / next:**
- ~~No fall animation~~ — added 2026-05-17 (tween, 400ms Cubic.easeIn)
- Far ropes depth (24) means they always render over wrestlers — needs y-threshold logic in later pass
- Stamina system not yet implemented

---

### 2026-05-18 — Irish Whip + Move Set Architecture

**Goal:** Second move + per-wrestler move set foundation.

**Built:**
- Irish whip (`_doIrishWhip`) — sends opponent running to near rope at 340px/s, bounces back to far side
- Clothesline (`_doClothesline`) — intercept returning runner with grapple key; immediate fall
- `tickRun(dt)` — drives 'running' state: moves toward `runTarget`, bounces at rope, transitions to 'returning', then back to 'standing' if no intercept
- `moveSet` array on each `Wrestler` — passed at construction; `tryAction`/`tryPower` only execute moves in the set
- Two-key input model:
  - **Grapple key** (F / Enter): Irish whip vs standing, clothesline vs returning runner, pin vs down
  - **Power key** (G / Shift): body slam vs standing
- `tryPower(other)` — new method, mirrors `tryAction` but checks `keys.power`
- Full combo loop: Irish whip → opponent runs to rope and returns → clothesline → body slam → pin

**Controls (updated):**
- P1: WASD + F (grapple) + G (power)
- P2: Arrow keys + Enter (grapple) + Shift (power)

**Architecture decision:**
- `moveSet` is the per-wrestler customization hook — e.g., `['irishWhip', 'clothesline', 'pin']` for a technical wrestler; `['bodySlam', 'pin']` with a different grapple for a powerhouse
- Grapple / Power / (future: Finisher) as the three-key structure gives each character two signature slots without changing the control scheme

**Known issues / next:**
- Far ropes depth (24) means they always render over wrestlers — needs y-threshold logic
- Stamina system not yet implemented
- Running wrestler has no visual distinction from standing — lean/lean angle pose for Phase 3

---

### 2026-05-17 — Sprite Strategy Decision

**Decided:** 128px master sprite height for all wrestlers.

**Rationale:**
- Large enough that AI-assisted generation produces usable output
- Small enough to animate in a reasonable timeframe
- Phaser scales it down via `perspectiveScale` for depth — looks best near camera, still readable at far end
- Grayscale camera filter unifies color inconsistencies between characters, reducing art discipline required

**Planned workflow (per character):**
1. Reference photos of wrestler → Midjourney or Retro Diffusion with pixel art prompt
2. Import into Aseprite, scale to 128px height with nearest-neighbor, reduce to 4–8 color palette
3. Manual cleanup — silhouette, outline, proportion fix (~20–45 min per pose)
4. Animate base poses in Aseprite: idle (2–3 frames), walk (4–6 frames), grapple stance, down
5. Export sprite sheet → load into Phaser, replace Graphics figure

**Under consideration:** Skeletal animation (Spine or custom bone system) as alternative to frame-by-frame — see notes below.

---

## Phase Roadmap

### Phase 1 — Proof of Concept ✓ (in progress)
Ring on screen, filter stack applied, title card. Confirm the visual direction before building game logic.

### Phase 2 — Core Engine
Two wrestlers, movement, ring boundary, basic grapple, 5–6 moves, pin/kickout, stamina.

### Phase 3 — Full Roster + Polish
All 6–8 wrestlers, crowd reaction system, audio, entrances, title screen and menus.

### Phase 4 — Local Multiplayer
Two-player keyboard + gamepad support.

### Phase 5 — Story Mode + Accounts
- Player creates a wrestler (name, look, weight class)
- Story progresses through a card of opponents — prelims → midcard → title shot
- Win 5–6 matches to earn a championship opportunity
- Rivalries, promos, win/loss record tracked per account
- Account system: auth + persistent save state (backend TBD — likely Supabase given existing familiarity)
- Design constraint: all Phase 2–4 decisions should leave room for per-wrestler stats and match history

**Boss structure (confirmed):**
- **Gorgeous George** — midcard boss. Heel. Bleach blonde, robe, valets, perfume ritual before entering the ring. The original villain archetype. Fight style: stalling, dirty tricks, crowd manipulation. Beating him = defeating pure spectacle.
- **Lou Thesz** — final boss. NWA World Heavyweight Champion. Technical, methodical, submission-heavy. The legitimate wall at the end of the road. Beating him = winning the title and completing the story.

The contrast between the two is intentional — George is theater, Thesz is sport. The player faces both to prove themselves on both terms.

### Phase 6 — Launch
GitHub Pages (static builds) + backend deploy, public announcement.

---

## Running the Project

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or whichever port Vite assigns).

Phaser loads from CDN — internet connection required for dev. For offline dev or production, download `phaser.min.js` and serve locally.
