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

### 2026-06-02 — Grapple Lockup, Turnbuckle System, Possum

**Goal:** Run button, running attack, richer grapple flow, turnbuckle climbing and diving, and play-possum.

**Built:**

**Run button**
- R (P1) / `/` (P2) — wrestler runs to the rope *behind* them, bounces back at full sprint
- InputHandler: `run: 1` added for B/Circle on gamepad
- Only fires once per press (`justDown`) so you don't spam-run

**Double axe handle**
- Power key while returning from the rope, opponent within 170*s — arms raise overhead in a triangle, smash down, always staggers
- `axeHandleUp` / `axeHandleDown` poses added; 280ms wind-up to sell the raise

**Elbow drop rewrite**
- Now a full horizontal body crash — wrestler goes airborne, becomes side-on (reuses `_drawDropkickFront`), crashes down, arm hangs toward mat
- Old version looked like a punch to empty space

**Directional Irish whip**
- Hold left or right while pressing grapple to choose which side the opponent gets sent

**Lockup system** (replaces direct grapple-on-standing)
- Grapple key near standing opponent → both enter `'lockup'` state, arms fully horizontal at shoulder level (`lockup` pose: `lArm/rArm: 1.57`), separated at arm's length
- Attacker has 0.8s to follow up: `up` + grapple = suplex, direction + grapple = Irish whip that way, grapple alone = body slam / piledriver
- Defender can steal control by pressing their grapple key first
- Timeout breaks the clinch cleanly

**Suplex**
- Delivered via lockup follow-up (up + grapple)
- Hoists opponent inverted overhead (reuses `_drawInverted` via `slamPhase='up'`), drops them behind — attacker takes a `startFall(1.5)` on the way down too
- STAMINA_DRAIN: 20

**Turnbuckle system**
- `_nearCorner()` detects all four corners (70px radius from mat position)
- **Near corners** (bottom of screen): press `S`/`↓` to climb in — intuitive, you push into the post
- **Far corners** (top of screen): press `W`/`↑` to climb in
- First press → middle rope (`onTurnbuckle`, `_ropeLevel=1`, 400ms tween)
- `W`/`↑` again → top rope (`_ropeLevel=2`, 250ms tween)
- `A`/`D` or `←`/`→` → climb back down

**Middle rope dive** (`_doDive`)
- `S`/`↓` or power key from turnbuckle → flying elbow toward opponent
- Targets standing or downed opponents; range cap 350*s (auto-climb-down if too far — no Van Terminator)
- Hit: clothesline fall (standing) or reset down timer (downed); attacker down 2s
- STAMINA_DRAIN: 18

**Top rope dive** (`_doTopDive`)
- Only fires on downed or possum opponents
- Range cap 560*s; 700ms arc, bigger camera shake (260/0.005)
- Hit: opponent down for DOWN_SEC + 2s; attacker down 3s
- STAMINA_DRAIN: 28

**Play possum**
- When down timer expires, hold `S`/`↓` → enter `'possum'` state (flat on mat, up to 4s)
- Press grapple or power from possum → quick spring (160ms vs normal 350ms)
- Opponent can still pin, elbow drop, or top dive a possum wrestler — real risk to the gamble
- Auto-rises normally if the window expires

**Controls (full):**

| | P1 | P2 |
|---|---|---|
| Move | WASD | Arrow keys |
| Grapple / lockup | F | Enter |
| Power / slam | G | Shift |
| Finisher | H | Space |
| Run | R | / |

**Architecture notes:**
- `'lockup'` state: managed by `Arena._tickLockup(dt)`; attacker/defender stored in `this.lockupState`
- `_ropeLevel` (0/1/2) on Wrestler tracks which rope; `_corner.topY` added to corner objects
- `_climbDown()` extracted as shared helper across all exit paths
- `tickPossum(dt)` / `_startQuickRise()` handle possum state; reuses `stateTimer` for the 4s window
- New states: `'lockup'`, `'climbing'`, `'onTurnbuckle'`, `'diving'`, `'possum'`

---

## Phase Roadmap

### Phase 1 — Proof of Concept ✓
Ring on screen, filter stack applied, title card. Confirm the visual direction before building game logic.

### Phase 2 — Core Engine ✓ (in progress)
Two wrestlers, movement, ring boundary, grapple system, moves, pin/kickout, stamina.

**Built:** Irish whip, clothesline, body slam, piledriver, elbow drop, dropkick, sleeper hold, stamina system, InputHandler abstraction, rope/post depth fix.

**Built:** Irish whip, clothesline, body slam, piledriver, elbow drop, dropkick, sleeper hold, stamina system, InputHandler abstraction, rope/post depth fix, stagger state, jab, headbutt, sell poses, idle pose system, taunt.

**Phase 2 complete.**

### Phase 3 — Full Roster + Polish
All 6–8 wrestlers with distinct identities, character-specific animations, crowd system, audio, entrances, title screen and menus.

- Character idle personalities — George preening, brawler bouncing on his toes, etc.; tuned per character using the idle pose system from Phase 2
- Character-specific sell variations — each wrestler reacts to damage differently; a tough babyface eats moves stoically, George is theatrical about everything
- Taunt personalities — character-specific taunt animations tied to their archetype
- Crowd heat meter — fed by taunts, big moves, nearfalls; affects crowd audio and energy
- Two-step grapple system (No Mercy style) — lock up first, then choose the move; worthwhile once each character has 8–10 moves to choose from; revisit when move sets are full
- Sprite skeleton rig — replace Graphics API figures with PNG body parts; elbow/knee joints added here, not before
- Piledriver attacker animation — current placeholder reads as the move but needs a proper seated sprite frame; the stick-figure side view can't show "sitting with legs spread" convincingly without a dedicated pose sprite
- AI live commentary — Claude API called on significant match events (knockdown, near-fall, finisher, pin); each wrestler has a biography and career history in the prompt so the announcer weaves in stories, feuds, and era context rather than just describing moves; commentary streamed to TTS (Web Speech API for dev, ElevenLabs for production); displayed as subtitle captions in the broadcast frame; event log groundwork already in Arena._tickGame from Phase 2

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
