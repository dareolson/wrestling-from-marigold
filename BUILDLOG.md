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

### 2026-06-10 — Skeleton Rig + Foot Planting Attempts

**Goal:** Replace Graphics stick-figure with per-part Image skeleton, then implement foot planting so feet feel grounded rather than "swimming."

**Built:**

**Skeleton rig** (`src/Skeleton.js`)
- 13 Phaser Image game objects per wrestler — white `sk_pixel` (2×2) texture tinted per part
- Parts: farThigh/Shin/Boot, farUpArm/Forearm, torso, trunks, nearThigh/Shin/Boot, nearUpArm/Forearm, head (Graphics circle)
- `_place(img, px, py, w, h, angle)` — pivot at `setOrigin(0.5, 0)` (top-center), rotated; `_end()` computes chain endpoint
- `updateUpright(x, y, s, facing, pose, walkPhase, combatBlend, lean)` — full FK leg/arm chain each frame
- Knee bend (KNEE_BEND=0.22) and elbow lag (ELBOW_LAG=0.14) — shin/forearm trail the thigh/upper-arm during swing
- Boot flattening — planted foot's boot sits flat rather than tipping backward with shin
- Sub-depth layering: far→torso→near→head within each wrestler depth slot
- Combat guard blend: arms tween from idle → L-shape guard (upper 0.60 rad, forearm 1.50 rad) as opponents close within 240px
- Lean: shoulders/head shift forward in facing direction while hips stay put
- ARM_FWD offset (0.09 rad) breaks perfect left/right symmetry

**Foot planting — three attempts, all reverted**

*Attempt 1 — Two-bone IK (law-of-cosines):*
Added `_solveIK` to Skeleton, passed foot world-space positions from Wrestler. Root cause failure: both thighs originate at `wrestler.x` (body center). Foot targets at `wrestler.x ± STRIDE` forced extreme outward thigh angles. Skin-colored thigh/shin segments spread across the mat, invisible against the similar gray. Reverted.

*Attempt 2 — Base-angle + fixed shin offset:*
Replaced law-of-cosines with `thighAngle = baseAngle + kneeSide * 0.18`. Looked worse — wrestler hopped, no walk cycle, 3 floating boot squares. Reverted.

*Attempt 3 — FK phase gating (step-event-driven walkPhase):*
Removed continuous walkPhase advance from `move()` and `tickRun()`. Instead: each foot step fires `_walkTarget += π`; walkPhase chases `_walkTarget` at π/STEP_DUR per second. Goal: one half-sine bump per step, legs vertical between steps. Result: legs vibrated rapidly and knees splayed in opposite directions. Steps fire too fast relative to the phase-chase rate, especially at run speed. Reverted — walkPhase advance restored to both `move()` and `tickRun()`.

**Current state:** Skeleton rig fully working with original FK walk cycle. `_feet` tracking infrastructure remains in Wrestler.js (decoupled from rendering). `updateFeet()` called each frame from Arena but has no visual effect.

**Root constraint (important for future attempts):** Both legs are drawn from `wrestler.x`. Any system that spreads feet wide of center makes the thigh/shin invisible against the mat. Future foot planting approaches must either: keep feet near-vertical (very small stride), or rework the skeleton to use split hip X positions, or accept that planting is purely a phase/timing effect rather than world-space positioning.

---

### 2026-06-10 (cont.) — Foot-Locking IK Gait (4th attempt — the real fix)

**Goal:** Stop the "swimming feet" once and for all. Diagnosed *why* the previous three attempts failed and rebuilt the walk on the canonical technique.

**Root-cause diagnosis (the thing the earlier attempts missed):**
The legs were a pair of compass arms hinged at one pin (`wrestler.x`), driven by a pure symmetric `sin(walkPhase)`. A pure sine makes the stance and swing halves identical, so the foot is *always* sliding and never sticks to the mat — that's the swimming. And the earlier foot-planting attempts tried to plant feet at world positions **without giving the legs real IK**, so a planted foot was just a straight skin-colored pole = invisible splay, not a leg. Researched the canonical fix (Little Polygon two-bone IK, Rain World / Overgrowth foot-ellipse, Trifox foot-planting).

**Built (`src/Skeleton.js`):**
- **Foot-locking gait** (`footGait`) — each foot has a real cycle: a **stance** phase where it's planted and sweeps backward at exactly ground speed, and a **swing** phase where it lifts in a sine arc and eases forward to re-plant ahead. Two feet half a cycle apart.
- **Stride tuned so the foot can't skate.** `WALK_FREQ` is now *derived*, not guessed: `STANCE·2π / STRIDE`. That makes the planted foot's backward sweep exactly cancel body forward speed — verified **0.0000px world-drift within a stance**, and it's speed-independent so the lock holds at run pace too. `GAIT` constants live at the top of Skeleton.js (STRIDE/STANCE/LIFT) and `Wrestler.js` imports `GAIT.WALK_FREQ`.
- **Two-bone IK** (`solveLeg`, law of cosines) — knee solved from hip→foot, pointing forward. This is what was missing; the knee now bends properly so the leg reads as a leg.
- **Body bob is emergent**, not bolted on — the hip rides whichever leg bears weight (`hipY = ankleGround − min(legReach)`), so it dips at footfall and peaks at passing automatically. Removed the old `abs(sin)` bob from Wrestler.js.
- **Moves untouched** — pose-driven leg stances (slam, lockup, sleeper, etc.) keep the original FK path. Gait only runs when walking or plain idle (`useGait = moveBlend > 0.2 || legs-idle`).

**Fixed a pre-existing crash:** the committed code (`c1e7cb2`) was black-screen-on-load — the reverted attempt-3 deleted `updateFeet()` from Wrestler.js but left two calls to it in `Arena._tickGame`. Removed the dead calls; the new gait tracks feet internally.

**Tuning still in progress (NOT yet visually signed off):**
- Tried dark "tights" leg tint to fix the skin-on-gray-mat invisibility — user rejected it (looked worse), reverted to skin. **The mat-contrast readability problem is still open** and should be solved with the real PNG art (DRAWING_GUIDE), not by recoloring blocks.
- Tried a stance-width split (near leg lower/closer, far higher) — it scattered the leg blocks to different heights and looked broken; reverted to single-hip.
- Boot was rotating into a floating diamond (`facing·0.9`); now continues the shin line with a small toe.
- Current constants: STRIDE 56, STANCE 0.55, LIFT 22 → WALK_FREQ ≈ 0.062. Earlier 42px stride made cadence too fast (user feedback); 64px lunged. 56 is the current compromise — **needs eyeball confirmation next session.**

**State at session end:** Math verified (lock = 0px, hips above feet, knees bend, no IK clamping). Renders without crashing. Walk legibility against the mat is the open item — judge the silhouette against the dark crowd until real leg art exists.

---

### 2026-06-18 — ROM Analysis, 4-Phase Animations, Headlock/Arm Drag, Stagger, Collision, Scale Fixes

**Goal:** Richer animations, new grapple moves, physical depth collision, and two visual bugs.

**ROM disassembly of WWF Raw (SNES/Genesis)**
- Disassembled 68000 binary via capstone Python library looking for move tables
- A promising address (0x13EEE) turned out to be ASCII text ("It's an all-out assault in a / One-on-One") — data layout read wrong
- Usable insight extracted anyway: WWF Raw uses a consistent **4-phase animation structure** — heavy moves have slow wind-up + fast impact; light moves have fast wind-up + slow recovery. Landed hits always have a distinct impact frame before recovery.

**All moves expanded to 4–6 phases** (was 2–3)
Added ~20 new POSES: `jabCock`, `jabRecoil`, `headbuttCock`, `headbuttRecoil`, `clotheslineCock`, `clotheslineFollow`, `whipGrab`, `whipLoad`, `whipFollow`, `slamGrab`, `slamPeak`, `elbowCrouch`, `elbowLand`, `axeHandleImpact`, `axeHandleFollow`, `staggerMed`, `staggerHeavy`, `staggerCollapse`, `staggerBack`, `headlockHold`, `headlocked`, `armDragGrab`, `armDragPull`, `armDragFollow`.

**Delayed sell timing** — added `delayedCall` on jab, headbutt, clothesline so defender reacts at the impact frame, not on wind-up.

**Headlock + arm drag**
- `_doHeadlock(other)` — attacker wraps other's head; both set to same facing direction (side-by-side, not kissing)
- `_doArmDrag(other)` — grabs wrist, pulls through, flings behind; delayed sell at 90ms
- `Arena._tickHeadlock(dt)` — positions attacker beside defender each frame, drains 3.0 stamina/s, auto-releases after 3s timeout or `tryHeadlockEscape()`
- `_tickLockup`: `goDown` → headlock; `power` → arm drag

**Progressive stagger** (4 tiers based on stamina)
- Fresh (>60%): short stumble, quick recovery — `stagger` pose, 0.8s
- Tired (>35%): wider wobble — `staggerMed`, 1.3s
- Spent (>15%): dramatic reel — `staggerHeavy`, 2.0s
- Exhausted (≤15%): legs buckle, near-fall — `staggerCollapse` + `staggerBack` sequence, 2.8s

**2.5D depth collision fix**
- Separation logic was running on full Euclidean distance — blocked wrestlers at different ring depths from crossing paths
- Fix: gate separation on `depthDiff < 26`. If wrestlers are on clearly different Y tracks, let them pass freely
- Same gate applied to `updateCombatBlend`
- Threshold set to 26px (half the original 52px) based on user feedback

**Top rope dive on standing opponents**
- Removed hard `return false` blocking dive if opponent wasn't down/possum
- Added standing opponent path in `_doTopDive`: flying cross-body → opponent `startClotheslineFall`, attacker down 3s

**Scale bug fixes**
- **Turnbuckle taunt tiny:** `onRopes` check in `draw()` excluded `'taunting'` state. Near corners have `matY=445` (s=1.0) but `topY=251` (s=0.58 — outside ring, clamped minimum). Taunting dropped from full-size to 58% instantly. Fix: include `state === 'taunting' && this._ropeLevel > 0` in the `onRopes` condition.
- **Dropkick tiny:** horizontal `_drawDropkickFront` figure is only ~44px tall vs ~250px for the upright skeleton at the same scale factor. Looks dramatically smaller on transition. Fix: draw the airborne figure at `s * 1.3` to better match the visual weight of the standing skeleton.

**Controls clarification (no code change)**
- Lockup → headlock: `goDown` (S/↓)
- Lockup → arm drag: `power` (G/Shift)
- Irish whip: grapple near standing opponent, then direction key

**Deferred (user-requested, not yet built):**
- Hip toss
- Arm wringer
- Grapple hold states to full-body drawn view (headlock looks like a hug due to skeleton rig limitations — needs dedicated draw method like `_drawDropkickFront`)

---

### 2026-07-03 — George AI Enabled + Pacing Fixes

**George AI re-enabled** — P2 now defaults to `AIHandler('george')`. Press **2** to toggle P2 between AI and keyboard anytime; a label top-right shows the current mode and fades after a few seconds.

**Why he felt too aggressive before, and the fixes:**

1. **Global offense cooldown** (`_attack()` helper) — every offensive press now sets a randomized 1.1–2.0s `_offense` timer on top of the per-action cooldown. Attacks come in beats instead of machine-gun bursts. The AI can still move/stall between attacks.
2. **Per-frame probability saturation** — `_chooseAction` runs every frame once cooldowns clear, so any "odds" roll saturates: the old 50% dropkick roll at medium range hit ~99.8% within one second, which is why George always opened with a dropkick. Failed rolls now set a short cooldown (0.4–0.5s) so odds are per-beat. Dropkick odds now a personality field (`dropkickOdds`: george 0.10, brawler 0.40).
3. **Showboat beat** (`showboatAfter: 2`) — after landing 2 moves George breaks rhythm: backs off ~1s, then taunts if at safe distance (guarded so a close-range finisher press can't accidentally become a sleeper). Naturally caps his offense rate and reads as character.
4. **Reaction delay** — 150–350ms pause before pouncing on a downed opponent, so he reads as human instead of frame-perfect.
5. **Jab → headbutt combo** — staggered-opponent follow-up moved ahead of the offense gate (rolled at 55% per beat) so roughly half his staggers convert to knockdowns before the stagger wears off.
6. **Desperate cheap shot** — while begging off at low stamina, if you walk into jab range there's a 40% roll he sucker-punches you. Classic George.
7. **AI paused during win banner** — new `Arena.matchOver` flag set in `_showWin`, cleared on reset; `_tickGame` skips `w2.input.tick()` while set. Previously the AI kept jabbing the loser during "PLAYER 2 WINS".

**Verified headless** (playwright-core + system Chrome against the Vite dev server, polling game state via new `window.__WFM_GAME` debug handle in main.js): 45s AFK match arc was taunt → paced dropkick (t=21, not t=2) → elbow drops with showboat taunts between → lockup → piledriver → pin → pinfall, zero AI inputs during the banner, clean reset after.

**Known quirks noticed while verifying:**
- ~~Taunts get logged to `matchEvents` as `type: 'knockdown'`~~ — fixed same night in `logMove`.
- AI lockup follow-up holds down+action intending headlock but piledriver comes out (w2's kit maps that input to piledriver). Reads fine in practice — not fixed.
- ~~A favicon 404 appears in the console after first input~~ — fixed with an empty data-URI icon in index.html.

### 2026-07-04 — Playwright Debug Harness

The ad-hoc verification setup from the AI session is now a permanent tool. `playwright-core` (devDependency, ~4MB — drives the installed system Chrome via `channel: 'chrome'`, no browser downloads) + the `window.__WFM_GAME` handle in main.js.

- `tools/debug/harness.mjs` — `launch()` spawns Vite on port 5199 (or attaches to `WFM_URL`), opens the game in Chrome, clicks the canvas for focus/audio unlock, and returns `{ page, snap, events, screenshot, close }`. `snap()` = both wrestlers' position/state/stamina + clock + heat + matchOver. `HEADED=1` shows the browser.
- `npm run debug:watch [-- seconds]` — live terminal feed: wrestler states every 500ms, every matchEvents entry as it lands. This is how the AI pacing bugs were found.
- `npm run debug:shot [-- seconds]` — screenshot after N seconds into `tools/debug/shots/` (gitignored).
- HUD vignette fix verified with this harness same night: meters/clock now render on a second vignette-free camera with its own grayscale filter.

**Scripted P1 scenario player** (`tools/debug/play.mjs`) — `npm run debug:play -- <scenario|all>`. Drives P1 with real key presses (P2 toggled to keyboard dummy first) and asserts the expected entry lands in `matchEvents` — each scenario is a regression test for a move. 10 scenarios, all passing: jab, combo (jab→headbutt), elbow, dropkick, lockup, headlock, whip, clothesline, sleeper, pin (full arc to pinfall).

Timing/geometry facts encoded in the scenarios (useful beyond testing):
- Collision separation clamps standing wrestlers at `80*s` (~65px center ring); jab reach is `85*s` (~69px) — the point-blank window only opens while walking *into* the opponent (`jam()` primitive).
- Lockup auto-releases at 0.8s; directional follow-ups (headlock S, whip left/right, suplex W) must land inside that window.
- Clothesline connects at `xDist < 160*s` with `pastDist < 45*s` on a returning runner only (`runPhase === 'returning'`, now exposed in harness `snap()`).
- Move events log before the delayed sell, so `type` can be 'stagger'/'move' even for moves that knock down — assert on `move`, not `type`.

### 2026-07-04 — Rendering Depth Fixes + Pose Lean/Crouch Channels

**Three depth-sorting bugs fixed** (wrestler depth formula is `12 + y * 0.03`, range 19.7–25.35):

1. **Near ropes vanished behind wrestlers at the bottom of the ring** — a wrestler past y≈417 out-depthed `nearRopeGfx` (24.5). Near ropes sit between the camera and everything in the ring, so they now render at 25.5 (near posts 25.7).
2. **Side ropes drew over wrestler heads** — each side rope was two straight halves at two fixed depths, but the rope spans the ring's whole depth. Now drawn as 8 banded segments, each depth-sorted with the wrestler formula at its ground position along the ring edge (`sideRopeBands` in `_setupDynamicRopes`; width tapers 2.4→1.4 with distance). Note: bands are created before the HUD camera so they're auto-ignored by it.
3. **Far post bases painted over the mat** — far posts were depth 8 vs mat 3. Now 2.5: above crowd (1) and far apron (2), behind the mat, so the ring covers their bases.

Also: a climbing wrestler's depth now locks to his corner's `matY` (like scale already did) — his y tweens up the post but his ring depth doesn't change.

**Pose system gains `lean` and `crouch` channels** — the readability fix. Poses previously moved only four limb angles; the torso never pitched and the hips never dropped, so moves read as limb-waving on a vertical stick. Now:

- `lean` (radians, facing-relative, + = forward) shifts shoulders/head ahead of the hips — wind-ups coil back (negative), impacts drive forward.
- `crouch` (0..1) bends the knees and drops the hip by the vertical extent the bent legs lose, feet staying planted (`cThigh = c*0.85`, `cShin = c*0.75` in Skeleton FK branch; milder hip-drop + IK in gait mode). Boot angle excludes the crouch shin rotation so boots stay flat — without that, toes point skyward when kneeling.
- `tweenPose` normalizes every target so poses that omit the channels tween back to 0; idle drift covers them too.
- ~35 poses updated: slamGrab bends low (crouch 0.45), pinHold drops over the opponent (0.75), headbuttCock coils back (lean −0.28) before the lunge (+0.48), lockup leans both wrestlers into the tie-up, stagger tiers sink progressively (0 → 0.42 crouch), etc.
- Body slam and suplex gained a `stumble` recovery frame after the throw instead of snapping to idle.

Verified with zoomed pose-gallery screenshots via the harness; `debug:play -- all` still 10/10 after the changes.

### 2026-07-04 — AI vs AI Spectator Mode

**P1 gets a brawler AI** — press **1** to toggle P1 keyboard/AI (mirrors P2's **2**), label top-left. Turn both on to watch a match. `_togglePlayer(n)`/`_showPlayerMode(n)` replace the P2-only versions; `_tickGame` ticks both inputs (both paused by `matchOver`).

Watching AI vs AI exposed four deadlocks/bugs, all fixed in AIHandler:

1. **Infinite pin ↔ rope-break loop** — AI re-covered instantly forever when the defender was at the ropes. Now: `_pinWait` cooldown (2.2–3.4s) after any cover, and no covers at all near the ropes (`_nearRopes`, same geometry as the game's rope-break check).
2. **Elbow-drop chains** — the downed-opponent pounce skipped the global offense gate and each drop re-downed the opponent, keeping them on the mat indefinitely. Now offense-gated, capped at 2 per down-spell (`_pounces`, reset when they rise), never chained at the ropes — the AI steps back and lets them up.
3. **Lockup steal war** — both AIs ran the lockup handler; the defender pressing grapple *steals* the lockup, so two AIs traded steals for 30+ seconds. Defenders now contest at most once per lockup (35%).
4. **George camped the ropes forever at low stamina** — unpinnable by rule 1, so matches never ended. Rope-seeking now comes in waves (~2.5–4s on, ~3–5s off); between waves he re-engages. Plus the brawler counters rope-clinging properly: hurt opponent at the ropes → lockup → whip across the ring → **clothesline the rebound** (AI previously ignored running opponents entirely and never cashed in its own whips) → knockdown and pin happen mid-ring.

Full AI-vs-AI match now runs to a clean pinfall (verified headless: knockdown mid-ring → cover → three count → banner at ~1:15). `debug:play -- all` still 10/10.

**Balance telemetry** — `npm run debug:sim -- <N>` runs N AI-vs-AI matches headless and prints per-match winner, duration, offense share, nearfalls, and longest dead-air gap, plus totals. This is the baseline every balance change gets measured against.

**Balance/fun roadmap (from AI-vs-AI observation, next session):**
- Comeback mechanic: kicking out of a pin / surviving a hold refunds stamina + bumps heat — creates match arcs instead of squashes (helps human matches identically; right now whoever falls behind stays behind)
- George's real win conditions: sleeper + headlock attrition — his AI barely uses either; jabs (~5 dmg) can't compete with slams (~20)
- Nearfall drama: always-survive-the-first-cover rule (or heat-scaled kickouts) to manufacture 2.9-count moments
- Fun proxies to watch in sim stats: momentum swings, nearfalls per match, offense share (~55/45 for a good heel match), dead air

**Match clock + time-limit draw** (same night) — TV-graphic clock top-center counts up (`this._matchTime`, already ticking since Phase 2). At `matchLimit` (10 min default; 30-min Broadway becomes a story-mode setting) the match ends "TIME LIMIT — DRAW" — deferred while a pin or sleeper is mid-resolution so a count at the bell finishes. `_showWin` refactored through a shared `_endMatch(message)`; clock pauses during the banner and resets with the match.

**Crowd audio** (same night) — `src/CrowdAudio.js`, zero asset files, pure Web Audio API:
- **Murmur bed:** 4s looped pink noise (Paul Kellet one-pole stack) → bandpass (Q 0.6) → gain. Heat meter drives both volume (0.06→0.36) and bandpass center (400→1100Hz) via `setTargetAtTime` — the crowd gets louder *and brighter* as heat rises.
- **Event pops:** every `_logEvent` type has a swell size in `POP_SIZES` (pinfall/sleeperKO 1.0 → move 0.18). Pop = multiplier gain on the murmur chain: fast swell (τ 0.06s), slow settle (τ 0.8s).
- **Timekeeper's bell:** three inharmonic sine partials (960/1420/2620Hz) with staggered exponential decays. 3 strikes at match end, 1 at the restart.
- Whole chain runs through a 3.2kHz lowpass to sit inside the vintage-broadcast aesthetic.
- Browsers block audio until a user gesture — `crowd.start()` is bound to first keydown/pointerdown, idempotent.
- Verified headless (Chrome `--autoplay-policy=no-user-gesture-required`): murmur gain 0.138→0.334 and filter 581→1039Hz on a heat bump to 90, nearfall pop spiked the pop gain to 3.2× then settled, bell plays without error.

### 2026-07-04 (second session) — Fun Pass: match freeze fix, comeback arcs, George's win conditions, readability

**Match-freeze deadlock (user-reported, reproduced in baseline sim).** A delayed sell callback (jab sell fires 83ms after the press, synced to the impact frame) could land while its target was mid-body-slam, yanking the attacker out of `slamming` — and every slam-phase guard was `if (state !== 'slamming') return`, which silently stranded the victim in `grabbed`, a state with no ticker and no timeout. Match dead until the 10-minute draw. Three-layer fix:
1. `_doSell` no-sells when the target is in any paired state (`UNSELLABLE_STATES`: slamming/grabbed/pinning/pinned/holding/sleeping/headlocked/lockup).
2. Slam/suplex/piledriver phase guards call `_releaseGrabbed(other)` (drop to `down`) instead of returning silently.
3. `Arena._orphanWatchdog` — generic net: any wrestler in a paired state whose counterpart is gone gets freed after 0.6s and logs an `orphanRescue` event. Zero rescues fired across ~45 min of post-fix AI-vs-AI sim — the root-cause fixes hold; the watchdog is insurance for future moves.

**Overlap melding (user-reported).** Two causes: (a) slams/lockups set `other.x = attacker.x`, and the separation clamp's `dist > 0` guard skipped the dist === 0 case entirely — wrestlers locked at identical coordinates until someone walked (screenshot-confirmed); fixed with a facing-based fallback push. (b) The `depthDiff < 26` gate ignored the 26–48px band where sprites (~150–260px tall) still overlap heavily; added a soft y-push (90px/s, fading with depth, only between two upright wrestlers, only when |dx| < 60·s) so deliberate walk-bys still slide through. Plus old-TV booking contrast: P1 skin/trunks lightened (0xe0b088/0x8c9cc8), P2 darkened (0xa87858/0x1a1a1a) so the grayscale filter never reads two bodies as one.

**Comeback mechanic** (`Arena._comeback`) — surviving a big spot refunds stamina at the moment the crowd is hottest: deep kickout (count ≥ 2) +15, sleeper escape +10, headlock escape +5, each with a heat bump. Matches arc instead of snowballing.

**Nearfall drama — the 2.9 save.** One per wrestler per match: the first cover that *would* finish them instead forces a kickout at 2.9 (logged as `kickout atCount 2.9` + `nearfall`, big heat). Every match now has at least one heartstopper. Reset with the match; `debug:play` pin scenario updated to cover twice.

**George's win conditions.** Sleeper/headlock escapes are now stamina-gated (guaranteed when fresh; sleeper drops to ~14%/press when drained, headlock milder), a full 4s sleeper is a real KO finish (`_showWin` — previously it logged a winner but the match kept going), AI mash rate scales with stamina, and George's AI: hunts the sleeper below 60% opponent stamina, takes the headlock from 70% of lockups, cashes in with the piledriver on opponents under 40%, retreats at 35 instead of 45, stops showboating when the opponent is under 50 (posing was letting them recover everything his holds drained), headlock drain 3→4/s. Per-personality `cooldownScale` paces engagement (brawler 1.35 slow heavy hitter, George 0.85 busy hands).

**Balance telemetry across the session** (`tools/debug/probe.mjs` — streaming AI-vs-AI probe with stuck-match detection; sim.mjs stats derivable from its event log):
- Baseline: 1 finished match in 15 min (the deadlock ate the rest); winner match was a 51s squash, ~0 nearfalls, sleeper escaped in <1s.
- After fun pass round 1: 4 matches/15 min, avg 2:19, 2 nearfalls/match, dead air ≤9s — but p1 4-0, offense 68/32, sleepers ~0 (attrition gate unreachable).
- After round 2 (headlock 4/s, piledriver cash-in, retreat 35): matches lengthen to avg 4:42, piledrivers land 1–2/match — still p1 3-0, 71/29; George's showboat habit was refunding all his attrition damage.
- Round 3 (cooldownScale, showboat killer-instinct gate): 4 matches, still p1 4-0, offense 69/31, sleepers 0 — but every match has its 2.9 save + 1–2 nearfalls, dead air ≤7s, and George lands up to 3 piledrivers.
- **Open problem — win parity.** Diagnosis after 3 rounds: p1 only drops below George's finisher thresholds late, by which point George is under 35 and begging off — his own heel logic eats the win window. Next lever is the brawler's kit (pounce budget 2→1, dropkickOdds 0.4→0.25) and/or letting George's beggingOff actively recover him faster, NOT more George offense. Target ~55/45 offense.

`debug:play -- all` 10/10 after every round.

### 2026-07-04 (second session, continued) — Stumble mechanics, heat with teeth, pacing

**Hurt wrestlers stumble (user request).** Below 35 stamina: walking slows up to 35% (gait phase scales with it so feet stay planted), the torso sways on a slow sine (`wooze` added to the lean channel in draw, per-wrestler phase seed), and each walking step risks a genuine stumble (`0.45 * hurt * dt` → about one per 2.2s of walking at zero stamina). Hurt-tier stagger windows lengthened 1.1/1.35/1.65s → 1.35/1.9/2.6s with extra sway steps so the critical tier wobbles on rubber legs the whole window.

**Staggers are slam windows — with a freshness gate.** The engine's grab-a-staggered-opponent slam (tryAction) is now central: AI converts staggers into the kit's big slam (`staggerSlamOdds`: George 0.40 — jab → stagger → piledriver is his damage engine — brawler 0.25), but a defender at ≥60 stamina resists the snatch and it becomes a lockup instead. The gate exists because ungated 50% conversion produced a 34-second George blitz KO. AI also refuses to down a staggered opponent at the ropes (waits for the stand → lockup → whip counter); without that check one sim match was a 10-minute draw containing 52 body slams at the ropes.

**Heat now has teeth (user: "not sure how it affects the match").** Previously heat only drove crowd audio. Now: (1) all `_comeback` refunds scale 50%→150% with heat — a hot crowd fuels comebacks; (2) taunts convert heat to stamina (`_comeback(attacker, 4)` on taunt/turnbuckleTaunt) — George's preening is finally strategically coherent; (3) audio as before. Heat meter redrawn readable: 200×7 bordered frame, fill luminance 90→230, brighter CROWD label (was a bare dark bar lost in the vignette).

**Pacing (user: matches too short).** Freshness gate above + AI base offense beat 1.1–2.0s → 1.35–2.35s. Probe results: durations went 0:34–3:20 (volatile) → 2:50/6:13/2:57, no blitzes, no grind draws. Offense slipped to 64/36 (the ≥60 gate nerfed George asymmetrically — p1 usually sits above 60 so George's grabs become lockups, George sits below so p1 keeps his slams); countered with the BUILDLOG-flagged brawler trims: `pounceBudget` 1 (was 2 elbow drops per knockdown), dropkickOdds 0.28.

**End-of-session findings + now/later decisions (final probe: one 7:57 match, p1 pinfall, 63/37, 6 George piledrivers, 0 freezes):**
- ✅ SOLVED, shipping: stability (0 freezes / 0 orphan rescues in ~90 min of AI-vs-AI), melding/readability, drama beats (2.9 save every match, dead air ≤11s), heat with gameplay teeth, stumble mechanics.
- ⏳ LATER — match-length calibration: the three stacked pacing changes took matches from ~3–6 min to ~8 min (n=1). 5–8 min is period-authentic against a 10-min TV limit, but whether it *feels* right is a controller question, not a sim question. Decide after human playtesting; the knobs are `_attack` beat (1.35–2.35s), `pounceBudget`, and the ≥60 freshness gate.
- ⏳ LATER — win parity: p1 still favored (~63/37). George lands piledrivers now but converts poorly; next hypothesis is his pin pressure (long `_pinWait`, no-cover-at-ropes discipline) rather than more damage. Needs bigger samples than n=1–4.
- ⏳ LATER — telemetry scale: 8-min matches × ~2× headless slowdown makes 10-match batches take hours. Add a debug time-scale (Phaser `time.timeScale` + physics dt multiplier) so `debug:sim -- 20` is feasible before the next tuning session.
- ⏳ LATER — move-texture monotony: long matches re-expose repetition (32 body slams in the 7:57 match). Wants AI move-variety memory (recent-move penalty), pairs well with the two-step grapple roadmap item.

### 2026-07-04 (third session) — Defensive moves (No Mercy style), debug time-scale, zombie-input fix

**Defense mixup triangle (user request: No Mercy-style back-away + grapple block).** Two new defensive inputs per player — P1 **E** (evade) / **T** (block), P2 **comma** (evade) / **period** (block), gamepad LB/RB:

- **Evade (tap)** — quick backstep (110·s px away from the opponent, 320ms, `evading` state). Dodge frames: strike impacts whiff — jab/headbutt/double-axe-handle now apply drain + sell at the *impact* callback and skip both if the defender is evading (logged as `dodge` event, heat +3); the dropkick hit test treats `evading` as a miss; grapple attempts find nothing to grab (state check fails silently). Costs 2 stamina + 0.55s cooldown so it can't be spammed into a permanent retreat.
- **Block (hold)** — braced stance (`blocking` state, new `block` pose). A grapple or sleeper attempt on a blocker gets **stuffed**: the attacker is shoved back and staggered (`grappleBlocked` → logged as `grappleBlock` credited to the blocker, heat +6, crowd pop) — the stagger is a real punish window (headbutt knockdown, or a slam if the attacker is under 60 stamina). The cost: strikes hit blockers **normally** (jab/dropkick accept `blocking` targets), and stamina doesn't recover while turtling (blocking isn't `standing`, so the regen branch never runs).
- The triangle: **strike beats block, block beats grapple, evade beats strike** — evade concedes ground, block holds it but eats strikes.

**AI defense.** Personalities get `evadeOdds`/`blockOdds` (George 0.22/0.14 — slippery; brawler 0.06/0.14 — plants and trades). Defense is rolled per beat (`_defWait`) at grapple range *before* the offense-cooldown gate — the AI defends between its own attack beats, not instead of them. Blocks are held via `_blockTimer` (re-pressed each tick since the key map clears per frame) and dropped instantly when the block stuffs someone (punish over turtle). George matador-sidesteps charging whip-rebound runners at 1.5× his evadeOdds instead of clotheslining. AI respects the triangle: jabs blockers, never grapples them.

**Debug time-scale (was a LATER item).** `?ts=N` URL param (env `WFM_TS=N` through the harness): scales `_tickGame` dt, `tweens.timeScale`, and `time.timeScale` together so tween-vs-delayedCall sync is preserved. All AI per-frame dice rolls converted to per-second rates (× dt): hold mash 4.8/s scaled by stamina, pin mash 7.2/s, stallChance × 60dt, far-taunt odds × 0.3dt — behavior is now frame-rate- and time-scale-stable. `WFM_TS=3` verified: ~3× game-time, sims that took 16 wall-min/match now take ~5.

**Zombie-input bug (pre-existing, caught by the ts=3 probe).** Pausing AI ticks during the win banner froze the AI key map with its last presses *down* — a frozen `justDown('action')` re-fired every frame, so the winning AI chained lockup→piledriver→pin on the loser during the banner, and that stale `pinState` survived into the next match (burning a wrestler's 2.9 save at 0:01). Fixed: `AIHandler.clear()` called while `matchOver`, and `_endMatch` nulls pin/sleeper/headlock/lockup states + hides pinText immediately.

**Regression:** `debug:play -- all` now 12 scenarios (added `dodge` — sidestep the axe handle inside its 280ms wind-up; and `block` — stuff P1's grapple, assert the stagger). 12/12 passing. Note: the jab's 83ms window is too tight for scripted back-to-back keys under headless slowdown — the dodge scenario uses the axe handle instead; humans dodge reads, not reactions.

**Balance rounds** (`WFM_TS=3 debug:sim -- 8` — sim now reports dodges/blocks per match; first real n=8 batches thanks to the time-scale):

- **Round 1 (defense shipped, no tuning):** p1 **8/8**, avg 5:07 (range 3:07–7:42), offense 65/35, 1–2 nearfalls/match, dead air ≤14s, blocks 3 total across 8 matches, **dodges 0**. Zero freezes. Dodge count is structural, not broken: AI-vs-AI has no telegraphs to read — neither AI self-runs, so the 280ms axe handle never comes out, and an 83ms jab dodge is pure luck. Evade is a *read* tool for humans; George still uses it for spacing. Win parity confirmed the BUILDLOG hypothesis — George lands piledrivers but doesn't convert.
- **Round 2 (George pin pressure):** per-personality cover discipline — `coverStamina` 55 (was flat 45), `pinWait` 1.2–2.0s (was flat 2.2–3.4s), `attritionAt` 70 so the sleeper hunt opens while George still has gas (below 35 he's begging off, which is why sleepers never fired). Interim n=3 before being folded into the overnight soak: p1 3-0 but trending tighter (5:21/5:50/8:34, offense 74/26 → 66/34 → 56/44, first AI-vs-AI dodge logged). George converts more, still can't close.
- **Round 3 = overnight soak:** same config, `WFM_TS=3 debug:sim -- 30` wrapped in `caffeinate -is`, run unattended overnight for a trustworthy parity number + rare-bug soak across ~30 match resets. First attempt died 6 matches in — headless Chrome lost the renderer and `snap()` returned null; sim.mjs now rides out brief null-snap gaps and reloads the page after 6s (fresh instance, counter continues). Partial n=6: p1 6-0, durations 2:44–8:39 (avg ~6:26), offense avg ~63/37 (best 55/45), 1–4 nearfalls/match, dead air ≤11s, 2 blocks, 0 dodges, 0 freezes.

**Soak final (combined n=30):** p1 **28-0-2** — the two non-losses are 10-minute **time-limit draws**, i.e. George twice stalled to the bell (peak George, and evidence the Broadway matters as a heel outcome). Avg duration 6:02 (spread 2:03–10:00), offense avg 62/38 (George out-landed p1 53/47 in one match and still lost — he can't close, confirming conversion not damage is his gap), ≥1 nearfall every match, worst dead air 17s, blocks ~1 per 3 matches, 3 dodges total, **zero freezes / stuck matches across ~3 wall-hours** — stability soak passed. Verdict per the parity framing above: George is competitive-but-not-closing against the placeholder brawler; stop tuning him here, revisit when Lou Thesz (a personality with exploitable patience) is his opponent. Remaining post-defense knobs if wanted later: George's `staggerSlamOdds`/piledriver → cover chaining, or a brawler mistake rate.

**Parity framing (user insight, 2026-07-05):** George may be "losing" partly because only he has a personality — the brawler is a placeholder sparring kit that never stalls, never showboats, never gives George's stall-and-sting rhythm an opening. Don't over-tune George against the test dummy: get him *competitive*, then treat true parity as a per-matchup booking question. **Next AI personality: Lou Thesz** (technical, methodical, submission-heavy — works holds, takes his time; his patience is exactly the opening George's kit wants). Not built tonight — design work for a future session.

**Roadmap note (user request):** get-up sequence states — flat → **sitting up** → **all fours** → standing — instead of the current single risingUp tween. Unlocks ground attacks and No Mercy-style ground grapples, plus wear-down selling (a spent wrestler crawling to the ropes). This is **code, not art**: no new drawings needed — the same six skeleton parts posed at new angles. Requires extending the skeleton beyond `updateUpright()` (torso pitch + limb roots for horizontal orientations), which also covers the flat/falling/grabbed migration. Buildable now with the placeholder tinted-block parts, before any PNGs land; character PNGs drop in afterward unchanged. (Only two-wrestler entangled holds — figure four, head scissors — truly need bespoke illustrations.)

### 2026-07-05 (day session) — Lou Thesz AI, character presets, skeleton get-up sequence

**Pushed to GitHub** (through 91c98b8). Git identity now set globally (`dareolson2@gmail.com`) — all prior commits (including pushed history) used the auto-guessed machine identity, so nothing was rewritten; future commits are correct.

**Character preset system.** Arena `PRESETS` map (brawler / george / thesz) bundling name, AI personality, idle pose, colors, and kit. `?p1=` / `?p2=` URL params (or `WFM_P1` / `WFM_P2` through the harness) swap either side; defaults unchanged (brawler vs George). Mode labels and AI constructors read the preset, so matchup sims are one env var: `WFM_P1=thesz WFM_TS=3 npm run debug:sim -- 8`.

**Lou Thesz AI personality** (the roster's final boss gets his brain first — he's the parity experiment). Design: never stalls or showboats (`stallChance` 0.001, `showboatAfter` 0), doesn't beg off (`retreatStamina` 12), clean (cheapShot 0.15), hold-centric (`holdOdds` 0.75, headlock preference), converts staggers relentlessly (`staggerSlamOdds` 0.45), best grapple-stuff in the game (`blockOdds` 0.26), and ruthless cover discipline (`coverStamina` 60, `pinWait` 0.9–1.6s) — the closer George isn't. Kit: technical (suplex/slam conversions, dropkick, no headbutt, no piledriver).

**Skeleton get-up sequence (user request; code-only, no new art).** New `Skeleton.updateGetUp(x, y, s, facing, t)` interpolating grounded keyposes — **flat → sitting up (hands propped behind) → all fours → standing** — through a new `_applyGrounded()` that roots the rig at the hip and lets the torso pitch anywhere from lying to vertical (the one thing `updateUpright` can't do). All angles facing-relative; mirroring is a sign flip. Wrestler's `_startRiseUp` becomes state `gettingUp` driving `riseT` 0→1; **duration scales with damage** (0.85s fresh → 1.6s drained) so the get-up itself sells the wear. Possum's quick kip-up keeps the old fast 160ms rise (`risingUp`). `gettingUp` is untargetable like `risingUp` was (no state check matches it) — knockdown recovery is ~1s longer overall, which reads as selling, not stalling. Verified visually via phase screenshots (flat/sit/crawl/stand all read at placeholder-block fidelity) and `debug:play -- all` 12/12.

**Thesz vs George sim batch** (`WFM_P1=thesz`, n=8): **Thesz 3, George 0, draws 5** — five of eight went the full 10 minutes to a time-limit draw. Avg duration 8:06, offense avg 73/27 Thesz, dead air ≤12s, zero freezes. Reading: the user's parity framing holds — against a real personality George *survives* (his begging-off + rope waves outlast even Thesz's cover discipline), while against the placeholder brawler he went 0-28-2. Thesz dominates offense but converts only when he corners George mid-ring early; a George who reaches his beg-off phase near the ropes rides out the clock. This is period-authentic booking (the champ retains on a Broadway; the heel survives) and arguably *correct* for a final-boss-vs-midcard-boss card. Open question for a future tuning pass: whether 5/8 Broadways is too many for story mode — likely lever is Thesz whipping George off the ropes during beg-off (he already does this under 45 stamina; could extend it to beg-off detection) rather than more damage.

### 2026-07-05 (evening) — Ring aesthetics pass (user-directed, from classic-footage study)

Iterated live with hot reload + `debug:shot` screenshots, one commit per step:

- **Rope sag** (`aae469e`): permanent gravity droop — bottom rope loosest (6px) → top tightest (3px), far side scaled by perspective, side ropes carry 80%. Bounce spring rides on top. Slightly thicker lines (near 3→4px, far 1.5→2, sides +25%).
- **Rope tearing fix** (`e80ab93`): Phaser Graphics strokes have no line joins — thicker curved strokes cracked at every segment. Ropes are now filled quad-strip **ribbons** (per-vertex normals, tapered width); side-rope edges computed once per span so adjacent depth bands share exact vertices.
- **Edge softening** (`2416a1a`): post-filter framebuffers discard MSAA, so ribbon edges stair-stepped. A 0.9px-wider faint **halo pass** under the solid core fakes the lost antialiasing (`AA` constant).
- **Dark ropes** (`e94b3ff`): period-correct taped look — 0x32322e near / 0x3c3c38 far / 0x36362f sides. Reads against the canvas, melts into crowd shadow.
- **Lit top edge** (`a199705`): dark ropes got lost against the crowd — thin bright strip along each strand's visually-upper edge (picked by midpoint y comparison) reads as arena light raking the rope. Keeps them traceable everywhere.
- **Side crowd pushed back** (`b323313`): first heads started <1 head-radius off the apron; now 3.4 radii out, leaving a bare ringside strip (press row) so the crowd stops encroaching on the action.

### 2026-07-06 — Rope physics: press detection, local bowing, near-rope depth bands

Items 1 + 2 of the declared goal, shipped together because they share one mechanism.

**Press detection** (`Arena._ropePresses`): each frame, each wrestler's distance to all four rope walls maps to a press strength — 0 at 34px inside the plane, 1 at the movement clamp (20px) — so contact peaks exactly where whip bounces, rope breaks, and cornered stalling put a body. Airborne/held/climbing states (`climbing/onTurnbuckle/diving/grabbed/falling/flipping/slamming/dropkicking`) don't press; grounded states (`down/gettingUp/possum/pinned/sleeping/pin/elbowDrop`) get per-strand weights `[1, 0.15, 0]` (only the bottom rope moves for a body on the mat) vs upright `[0.8, 1, 0.85]`.

**Local bowing**: presses deform the strands around the wrestler's position with a smooth cosine falloff (`bump()`), riding on top of the uniform spring sag — near ropes bow toward the camera (9px peak, 85px radius), far ropes away (4.5px, 55px, perspective-scaled), side ropes outward in x (8px tapering with depth, radius 0.28 in t). `archPts` grew an optional `warp(x)`; `sidePoint` an optional `warpX(t)`. A downed body against the ropes now dents just the bottom strand — reads great.

**Near-rope depth bands**: the horizontal near ropes were one graphics at fixed depth 25.5, slicing across any wrestler standing at the near plane (strands drawn cleanly through neck/waist/knees — the reported bug). They're now **24 x-bands** (mirroring the side ropes' depth bands, same shared-vertex ribbon trick via new `fillRibbonBands` helper, which the side ropes also use now — dedupes the per-band fill loop). Default depth stays 25.5 (broadcast look: ropes cross in front of the ring), but at full contact (press ≥ 0.55) the bands inside the bow radius re-sort to just below the presser's depth — his body renders in front of the strands at his back while everyone deeper still sorts behind them, because depth is monotonic in ground y. Same re-sort for side bands (`_baseDepth` restored each frame). The flip lands while the bow already reads as touching, so no visible pop. Far ropes stay a single graphics at depth 2 — a wrestler pressed into them has his back to the strands, camera side, so "always behind" is already correct.

**Verified**: harness screenshots of standing press at near/side/far walls (body unbroken, strands bow and pass behind), downed-body bottom-strand dent, mid-ring wrestler still correctly behind un-pressed bands; `debug:play -- all` 12/12; 50s `WFM_TS=3` AI-vs-AI watch with zero page errors.

**Noticed in passing (pre-existing, not fixed)**: a knocked-down wrestler can end up at y≈500 — below the near plane, outside the ring — because knockback falls don't `_clamp()`. Harmless to the new code (his bands sort above everyone anyway) but worth a look someday.

**NEXT: crowd heat meter** (item 3 of the declared goal). Heat sits near zero all match (user: "makes the matches seem pretty boring") — flat 3/s decay bleeds out the small one-shot bumps between spots. Ideas: slower/asymmetric decay (fast above 70, slow below), a floor that ratchets up with match milestones (nearfalls, comebacks), bigger bumps for chained spots, rolling-average display. Heat has gameplay teeth (comeback scaling 50–150%, taunt conversion) — retune together.

### 2026-07-07 — Crowd heat retune (rounds 1+2) + match-restart heat reset

The heat meter now tells the story of a match instead of flatlining. Replaced the flat 3/s linear decay with three mechanisms in `bumpHeat`/`_updateHeat`:

- **Floor ratchet**: spots with bump ≥ 8 raise `heatFloor` by 45% of the bump (cap 60) — once the crowd has seen a nearfall they never go back to cold silence. Floor itself cools at 0.15/s, so a long dead stretch does slowly lose the room. Drawn as a dim under-fill on the meter (how much of the room the match has permanently won).
- **Exponential decay toward the floor** (not zero): `heat = floor + (heat − floor)·e^(−0.08·dt)` — a roar dies down over ~20s but settles at the simmer the match earned.
- **Chain multiplier**: bumps landing within 4s of the previous build ×(1 + 0.18/link), cap 5 links — a sequence heats the room faster than the same moves spread across dead air.

Round 1 (decay 0.12, ratchet threshold 12 / factor 0.35, tested last session) still read flat: mid-match ~15–25. Round 2 (decay 0.08, threshold 8, factor 0.45) lands the arc — `WFM_TS=3` watch runs show cold open mid-20s, mid-match 40s–50s tracking the spots, closing nearfall stretch 80–99, banner in the 70s.

**Match-restart heat carryover (found & fixed)**: `_endMatch`'s restart callback reset stamina/clock/pin saves but not heat state — match 2 opened at heat ~74 with the floor still ratcheted. Worse: `_lastBumpT` outlived the match clock it's compared against (`_matchTime` resets to 0, so `_matchTime − _lastBumpT` goes negative → chain check always true → stale multiplier on the next match's first bump). Restart now resets `heat`/`heatFloor`/`_heatChain`/`_lastBumpT` to create() values. Verified across three consecutive AI-vs-AI match boundaries: each new match opens at 29.

**Regression**: `debug:play -- all` 12/12.

**Watch next**: comeback refunds scale 50–150% with heat — sustained higher heat means bigger kickout refunds, which may lengthen matches. Compare a future `debug:sim` batch against the 6:02 baseline avg (n=30 soak) before trusting old duration tuning.

**Still open (pre-existing)**: knockback falls don't `_clamp()` — a downed wrestler can land at y≈500, outside the ring plane.

**Same session, playtest feedback — horizontal ropes no longer bend.** User: the near/far rope bow "looks weird when they move," and since movement is mostly side-to-side, bodies rarely brush those planes anyway. Removed `nearWarp`/`farWarp` (and the unused far-press collection in `_ropePresses`); side ropes keep their outward bow. The near-band depth re-sort **stays** — that's what keeps strands from slicing through a body at the near plane, independent of bending. Verified: 12/12 `debug:play`, harness screenshots of near-wall press (strands straight, body unbroken) and side-wall press.

**NEXT SESSION: gamepad support** (user request after playtesting — this is the opening move of Phase 4). Current state: `main.js` already enables the plugin (`input.gamepad: true`) and `InputHandler.js` already has a gamepad branch with the full mapping (A=grapple, B=run, X=power, Y=finisher, LB=evade, RB=block, d-pad + left stick with 0.4 deadzone) — but Arena never constructs a `'gamepad'` handler, so that branch has never executed. Plan:

1. **Verify the Phaser 4 gamepad API first** (read `node_modules`-free — Phaser is CDN; check the Phaser 4 docs/source for `Input.Gamepad`). Known suspects in the never-run branch: Phaser's gamepad `Button` exposes `.pressed`/`.value` (not `.isDown`), and there is no `justDown` on pad buttons — `justDown(action)` needs per-frame edge detection (snapshot previous button state each update, likely a small `poll()` the Arena calls once per frame, mirroring how AIHandler keys work).
2. **Pad assignment**: "press any button to join" — on Phaser's `gamepad.connected` event (or first button press), assign pad 0 → whichever player is currently on keyboard (P1 first), pad 1 → the other. Store handlers as `this._p1Pad`/`_p2Pad` alongside the existing keyboard/AI handlers.
3. **Extend the 1/2 toggle cycle**: keyboard → gamepad (if a pad is assigned) → AI → keyboard. `_showPlayerMode` labels gain a `GAMEPAD` state. Handle `disconnected` (drop back to keyboard, update label).
4. **Audio unlock**: `this.input.keyboard.once('keydown', unlockAudio)` never fires for a pad-only player — also unlock on the first gamepad button event.
5. **Mash mechanics check**: pin kickout / hold escapes count `justDown` presses — confirm they feel right on a pad once edge detection exists (mash rate on a face button differs from a keyboard key).
6. **Verification**: real-controller playtest is the primary check (user has the pad). For the harness, optionally inject a fake `navigator.getGamepads` via an init script so `debug:play` can drive the gamepad path headlessly — worth it only if the manual test surfaces bugs worth regression-locking.
7. MOVES.md controls table + BUILDLOG.

Risks: Phaser 4's gamepad plugin may have its own breakages vs v3 (the whole project has hit v4 API drift before — scanlines, graphics); browsers only surface a pad after user interaction with it (expect "no pad until you press a button" — that's the join gesture, not a bug).

### 2026-07-08 — Feel audit (diagnosis only — no game code touched)

Instrument-first audit of movement physics, momentum, and ring psychology.
**Full findings + fix list in `FEEL_AUDIT.md`** — 15 ranked findings, each with
measured evidence, severity, and the lever it pulls; fixes grouped into batches
A (correctness) / B (movement feel) / C (psychology), every item with a
hypothesis and an acceptance check. **Next session: Derek picks the batch,
then implement one concern per commit (12/12 after each, sim vs the 6:02
baseline for pacing changes).**

Method: per-frame kinematics sampler (hooked on the scene's `postupdate`) +
5 AI-vs-AI probe matches (3× brawler/George, 2× Thesz/George, ts=3) with
event/heat/position/occupancy/OOB traces. Baseline `debug:play -- all` 12/12
before measuring. Probe scripts live in the session scratchpad (not committed);
caveat noted in the audit: the probe's per-match heat/pos traces are only valid
for match 1 of a run — events/occupancy/OOB are valid for all.

**Headline discovery — the AI lockup mini-game has never executed.**
`AIHandler.justDown` doesn't consume presses (keyboard goes through
`Phaser.Input.Keyboard.JustDown`, which does), so the press that creates a
lockup is still down when `_tickLockup` runs later the same frame → instant
plain follow-up. Measured 179/186 AI lockups resolving same-second; Thesz
(holdOdds 0.75) got 74 lockups → 72 body slams, 1 headlock, 0 whips. This is
the real cause of the 2026-07-03 "intends headlock but piledriver comes out"
quirk, and it disables the steal contest, headlock attrition, and the
whip-out-of-the-corner counter (which explains a lot of the wall-hugging).

Other headline numbers: walk reaches full speed in 1 frame / stops in 1 /
reverses in 1 (zero acceleration anywhere); no hitstop, no shake or sound on
jab/headbutt contact, knockdown shakes fire at fall-complete (~0.4s late);
knockback arcs rise 83ms / fall 284ms (anti-gravity) and land at ~0 px/s;
whipped runner full-stops 250ms then launches at a fixed 80·s knockback
regardless of speed; loser functionally dead at 9–24% of match in 3/5 probes
then a 5–9 min zombie phase; both-in-center-third 0–14% of samples (as few as
2/32 grid cells used); 19/22 kickouts at count 1; `_tickLockup` follow-ups
bypass `_heatForMove` (slam matches flatline ~17, one sleeper-KO finish landed
at heat 11); y≈500 bug reproduced (down body at y=509 — unclamped
`startClotheslineFall` + the piledriver attacker's crash seat).

### 2026-07-09/10 — FEEL_AUDIT Batch A + the two bugs it uncovered

Six commits, `debug:play -- all` 12/12 after each, verified by three probe
rounds (results table in FEEL_AUDIT.md "Batch A results" addendum):

- **A1 (`6d581d4`)** — `AIHandler.justDown` consumes on read, mirroring
  `Phaser.Input.Keyboard.JustDown`. Killed the same-frame lockup self-resolve.
- **A2 (`82c7aac`)** — clamp `startClotheslineFall` landings (60·s downed-body
  margin) + cap the piledriver seat at the near plane (the y≈500 bug).
- **A3 (`e78e10d`)** — `_tickLockup` follow-ups now bump heat via
  `_heatForMove` (shared `followUp` helper; armDrag too).
- **A1 follow-up (`3be9e3b`)** — first re-probe found `_handleLockup` (newly
  reachable thanks to A1) gated on the global `_cooldown`, which the
  lockup-initiating grapple press itself sets to 0.8–0.9s — longer than the
  0.8s lockup window, so the AI could never follow up (Thesz: 122 lockups,
  0 slams, 0 covers, all 5 matches 10:00 draws). Follow-ups now run on a
  dedicated 0.15–0.45s `_lockupBeat`.
- **A2 residuals (`d761429`, `92815cd`)** — probes traced the remaining OOB to
  three more unclamped positioners: the lockup arm's-length drift (bodies
  walked to x≈890), the suplex landing (drops victim 90·s behind the
  attacker), and the dropkick attacker's landing (flies past a rope-hugging
  victim). All clamped; final probe: OOB ≈ 0 (one 1-frame blip in 2 matches).

**Outcome:** AI matches transformed. Move monotony gone (longest same-move
streak 25–35 → 2–4), the lockup mini-game is real (headlocks/whips/steals all
firing), heat arcs 74→100 instead of flatlining, ring usage up (16–32/32 grid
cells vs 2–21), beat gaps halved. brawler/George now splits pinfalls and
hard-fought 10:00 draws with real nearfall stretches.

**Open question for Derek (C-batch scoping):** Thesz/George is now ALL
Broadways — Thesz throws zero slams and zero covers because his slam branch
needs `opp.stamina < 40` and his covers need `< 60`, and George never gets
that low now that headlock attrition (4/s) competes with George's taunt regen.
The plain-slam branch in `_handleLockup` and the cover thresholds are booking
knobs, not bugs — they belong to Batch C (C1 kickout depth, C2 finish-hunting,
C3 escalation gates), which is exactly where the audit said to re-decide after
A. Matches are now dramatic but nobody can close; C1+C2 are the closing tools.

### 2026-07-10 (session close-out) — landed pending multi-session work + AI_HANDOFF Phase 0 Task 1

Picked up a working tree with two other sessions' verified-but-uncommitted
work sitting in it (Thesz press finisher + George head texture wiring) plus
`AI_HANDOFF.md`'s own pending log entries. Re-verified the combined state
(`debug:play -- all` 12/12, `npm run build`) and committed it (`a6938ac`,
`0bc37a5`), then deleted the rejected `WrestlerPNGs/` Codex art drop that
`AI_HANDOFF.md` had already flagged as safe to remove.

**AI_HANDOFF.md's queued "Active assignment — Phase 0, Task 1"** (extract the
decision logic out of `Wrestler.tryPower` into a pure, engine-free
`resolvePowerMove()`) was delegated to a Sonnet subagent working in its own
git worktree — not the shared working directory — specifically to avoid the
interleaved-uncommitted-diffs problem this same file documents from earlier
sessions. First attempt mis-targeted the wrong repo entirely (isolation
defaulted to the orchestrating session's own cwd, a different project) and
was caught and discarded before it touched anything; second attempt, pointed
explicitly at a worktree of this repo, succeeded.

Result (`9c9f18e`): `src/logic/moveDecision.js` (new, zero Phaser
dependency), `Wrestler.tryPower` now gathers context and dispatches on the
resolver's return value via `switch`, `tests/moveDecision.test.js` (43
`node:test` cases — every branch, fallback order, unavailable-move
fallthrough, and below/at/above boundary checks on all three reach
thresholds at two scales), `package.json`'s `test` script wired to
`node --test`. Reviewed the diff personally against every constraint in
`AI_HANDOFF.md`'s assignment (no Phaser import, `<=` and branch order
preserved verbatim, guard clauses stayed in `Wrestler.js`, nothing in
`AIHandler.js`/animations/timing/damage touched) and independently re-ran
`npm test` (43/43), `debug:play -- all` (12/12), and `npm run build` rather
than trusting the subagent's report. Fast-forward merged to master, worktree
and branch removed. Full account in `AI_HANDOFF.md`'s 2026-07-10 entry.

Skipped deliberately: Batch C (still an open design call for Derek), Batch B
(broad, needs human playtest, not this file's one active assignment), the
George head redraw and `DRAWING_GUIDE.md` naming-prefix fix (both minor/art,
left open). No new Active Assignment queued — needs Derek/Codex to set one.

### 2026-07-11 — Codex brief executed: toolchain, doc drift, B1 locomotion, post-Thesz baseline

Codex queued a consolidated audit/brief in `AI_HANDOFF.md`; this session
executed it as PM/reviewer with three Sonnet subagents in dedicated git
worktrees (own branch + own Vite port each — the fix for the concurrent
shared-working-directory mess of 2026-07-10). Every deliverable was reviewed
against the brief and independently re-verified before merging; one (docs) was
sent back once for revision. All pushed to origin/master.

**Toolchain (`e51dc59`)** — `.nvmrc` 22 + `engines >=20.19`. Codex's Node
19.8.1 test/build failures were its shell resolving nvm's stale default, not
regressions. Also fixed hardcoded absolute harness imports in
`psych_probe.mjs`/`kinematics.mjs` (`64bc0b2`) — they'd silently test the main
checkout when run from a worktree.

**Doc drift (merge `7a00c5c`)** — PRD.md Phaser 3→4, real controls table,
gamepad claims corrected in PRD/MOVES (mapping exists, never wired),
DRAWING_GUIDE naming fixed to plain `head.png` (prefix is the texture key,
not the filename), BUILDLOG roadmap heat-meter staleness fixed. Only 1 of
Codex's 4 claimed BUILDLOG staleness examples was actually stale.

**FEEL_AUDIT B1 shipped (merge `bd89598`)** — walk accel/brake/turn
commitment: per-wrestler `vx/vy` ramps ~130ms to full speed, ~90ms brake,
reversals pass through zero; `walkPhase` fed from actual travel speed so feet
stay planted through ramps; velocity zeroed on non-standing states; run/whip
path verified untouched (275 px/s unchanged). Kinematics before/after in the
commit; 43/43 + 12/12 + build verified independently post-merge. **Awaiting
Derek's playtest for feel sign-off.**

**Post-Thesz-press baseline (`02562b1..6618ce1`)** — 16 probe matches (8
Thesz/George, 8 brawler/George), full addendum in FEEL_AUDIT.md, raw data
gzipped in `tools/debug/baselines/`. Headline: **Thesz/George is still 8/8
Broadways and structurally can't close** — every closing tool (`slamAt`,
`pressHuntAt`, `coverStamina`) gates on a standing low-stamina opponent, and
George is standing-below-60 in 0.3% of samples (below-42: 0.0%); the recovery
stack (taunt regen + kickout refunds) outpaces drip damage every time. Brawler
closes 2/8 (burst slams outrun the refund cycle). C-batch design implication:
C2 must catch the down/getting-up window or suppress the recovery stack, not
wait for a standing worn opponent. Also fixed a psych_probe recorder bug that
froze heat/pos traces after match 1 (`02562b1`) and added
`psych_baseline.mjs` (kickout depth, first-finisher, below-15-to-bell).

**New bugs found, not fixed (logged for next session):** stagger-grab slams
log move `slam`, which has no `_heatForMove` entry — those conversions award
zero heat (Wrestler.js:527); standing bodies can sit 5–10px past the
rope-plane probe margin (≤99 frames/match, down-states never leave the ring).

### 2026-07-11 — George's full body lands: 5 PNG textures + textured-part rig sizing

**Goal:** Land Derek's 7 hand-drawn George layers (`Sprite sheets/GeorgeParts/`)
as in-game textures. Directed by one Claude session, built by Sonnet subagents
in a dedicated worktree (`art/george-body-parts`), merged as `3d46a4f`
(commits `e473b39`, `b0e8e4a`), pushed.

**Built:**
- `src/assets/wrestlers/george/{torso,upper_arm,forearm,thigh,shin}.png` —
  all 6 rig textures now live (head landed 2026-07-10). Trunks baked into
  torso, boot baked into shin (the rig nulls its placeholder trunks/boot
  blocks when those textures exist). Forearm rotated 25.7° to vertical
  (was drawn diagonal); all parts mirrored to face right per the head
  convention; 4 sources had no alpha (opaque white bg) — white-keyed +
  alpha-decontaminated to kill the halo.
- `tools/wrestler-cutter/process-parts.mjs` — deterministic CLI pipeline
  (playwright-core headless-Chrome canvas, no new deps) encoding every
  lesson to date: pivot-centered cropping (not bbox), speck removal,
  composite rules, cap flattening, bottom-flush + fillFrac metrics. Reuse
  for the remaining roster.
- `src/Skeleton.js`: `TEX` display-box map + `_placePart` seam — textured
  parts render at art-derived proportions (placeholder blocks are 20–26px
  wide; stretching real art into them was never going to work), shin box
  spans shinH+bootH so the boot sole hits the ground line, and textured
  parts now `setFlipX(facing < 0)` like the head (limb PNGs previously
  never mirrored with facing). Placeholder rendering byte-identical.

**Verified:** npm test 43/43; `debug:play -- all` 12/12; runtime assertion on
merged master that all 10 skeleton image parts (near+far) carry `george_*`
texture keys; screenshot review of idle/walk both facings, grabbed, get-up,
and George-vs-Thesz scale.

**Open (art, non-blocking):** neck-slack blob visible over the chest in some
walk frames (narrow the neck art, or experiment with head depth below torso);
knee/shin line weight faint under the grayscale filter; next character's
export checklist — background layer OFF, and don't draw second arms/legs
(no per-side texture keys in the rig yet).

### 2026-07-12 — Lou Thesz fully textured (same night as George)

**Goal:** Derek drew Thesz immediately after seeing George in-game
(`~/Downloads/louThesz/`, 6 layers). Merge `0ed0cbc` (commit `dcadb95`),
pushed.

**Built:**
- `src/assets/wrestlers/thesz/` — all 6 textures. Cleaner drop: real alpha
  everywhere (no keying), trunks connected to torso, trunks cuff on thigh,
  boot attached to lower leg → zero composites. Head went through the
  pipeline for the first time (neck-centered crop, caught 20px bbox skew);
  lower leg mirrored (per-part flip config, new); forearm rotated 42.4°.
- Rig: textures-map entries now `'key'` or `{ key, box }` — per-character
  shin display boxes (george 44×68 / thesz 42×65 per fillFrac) moved into
  character configs; no character-specific constants left in Skeleton.js.
- `src/characters/thesz.js` + Arena wiring (CHARACTERS preload,
  PRESETS.thesz textures).

**Verified:** 43/43; debug:play 12/12; build clean; runtime assertions on
merged master — Thesz-vs-George match with all 20 skeleton parts carrying
the right `thesz_*`/`george_*` keys; screenshot review both facings.

Both Phase-5 bosses now have full art. Remaining roster is
drop-a-folder-per-character; the pipeline and rig need no further changes.

---

## Phase Roadmap

### Phase 1 — Proof of Concept ✓
Ring on screen, filter stack applied, title card. Confirm the visual direction before building game logic.

### Phase 2 — Core Engine ✓ (in progress)
Two wrestlers, movement, ring boundary, grapple system, moves, pin/kickout, stamina.

**Built:** Irish whip, clothesline, body slam, piledriver, elbow drop, dropkick, sleeper hold, stamina system, InputHandler abstraction, rope/post depth fix.

**Built:** Irish whip, clothesline, body slam, piledriver, elbow drop, dropkick, sleeper hold, stamina system, InputHandler abstraction, rope/post depth fix, stagger state, jab, headbutt, sell poses, idle pose system, taunt.

**Phase 2 complete.**

### Phase 3 — Full Roster + Polish (in progress)
All 6–8 wrestlers with distinct identities, character-specific animations, crowd system, audio, entrances, title screen and menus.

**Built:**

**Skeleton rig** (`src/Skeleton.js`) — replaces Graphics API stick figures with 13 independent Phaser Image game objects per wrestler: far thigh/shin/boot, far upper-arm/forearm, torso, trunks, near thigh/shin/boot, near upper-arm/forearm, head (still a Graphics circle). All body parts are white `sk_pixel` textures tinted with the wrestler's skin/trunks color. Swapping to PNG art = changing the texture key per part.

- Sub-depth layering: far limbs at base depth, torso +0.001, trunks +0.002, near limbs +0.003–0.004, head +0.005 — enforces correct draw order within a wrestler's depth slot
- `Skeleton.updateUpright(x, y, s, facing, pose, walkPhase, combatBlend)` — positions and rotates all parts each frame
- Knee joints: shin angle trails thigh during swing phase (`KNEE_BEND = 0.22`) — fades naturally as walkPhase decays when standing
- Elbow joints: forearm trails upper arm (`ELBOW_LAG = 0.14`) — same fade behaviour
- `_place(img, px, py, w, h, angle)` / `_end(px, py, h, angle)` helpers chain pivot → endpoint down the limb hierarchy
- Non-upright states (falling, flat, grabbed, dropkick air, etc.) still use the original Graphics API draw methods — migration deferred to later sessions

**Proximity combat stance** — `Wrestler.updateCombatBlend(dt, opponent)` (called from `Arena._tickGame`) smoothly ramps `combatBlend` 0→1 as wrestlers close within ~240px, reaching full guard at ~130px. `combatBlend = 0` when not in a neutral standing/staggered state. The skeleton blends upper-arm angles toward `facing * 0.60` rad (arms forward at ~34°) and forearm angles toward `facing * 1.50` rad (near-horizontal L-shape guard) — classic wrestling/boxing ready stance as opponents circle each other.

**Crowd heat meter** — shipped and retuned; see the 2026-07-04 sessions (heat given gameplay teeth: comeback scaling, taunt-to-stamina conversion) and the 2026-07-07 session (floor ratchet, exponential decay toward the floor, chain multiplier) below for the full history.

**Movement naturalness — 2026-06-08:**

Three techniques implemented to eliminate the "gliding on ice" look:

1. **Vertical body bob** (`Wrestler.js` draw) — `bobY = abs(sin(walkPhase)) * 6 * s * moveBlend` subtracted from Y before passing to skeleton. Produces two bobs per stride (one per step plant). Shadow stays anchored at ground Y. `moveBlend` (new field, 0→1 driven in `tickStanding`/`tickRun`) gates the effect so it fades in/out smoothly when starting and stopping.

2. **Torso lean** (`Skeleton.js` `updateUpright`) — new `lean` param (default 0). `leanX = sin(lean) * torsoH * 0.6` shifts `shoulderX` forward from the hip pivot. Arms and head follow `shoulderX`; legs and trunks stay at `x`. Lean value = `facing * 0.07 * moveBlend` — about 4° forward in direction of travel, fades to upright at rest.

3. **`moveBlend` signal** (`Wrestler.js`) — `this.moveBlend` ramps up at `dt*6` when moving, down at `dt*6` when stopped (run: `dt*8`). Used by both bob and lean so all secondary motion shares a single smooth gate.

**Next movement step** — proper foot planting (currently both feet arc continuously like swimming). Technique: store each foot's world-space position; trigger a step when the foot drifts past a distance threshold; lerp to new position along a parabolic arc (`midPos = start + (end-start)/2 + (0, stepHeight)`); alternate feet so one completes before the other begins. See research reference below.

---

### Movement Animation Research Reference

Compiled 2026-06-08. Sources used to plan natural character movement.

**Trifox devlog** — https://www.trifox-game.com/exploring-procedural-animation-in-trifox/
Best single reference for foot planting + body bob. Key techniques:
- Bob = average current height of each foot relative to base height → use as vertical offset each frame
- Weight shift = average angle offsets of all feet relative to root position; apply as torso rotation with dampening
- Foot planting: compare foot distance from reference position; trigger step when threshold exceeded; overshoot = `referencePosition + movementDirection × predictionOffset`; lift arc = normalized vertical offset curve at lerp progress 0→1 (foot lifts then plants)
- Directional offset curves via dot product — backward step allows greater extension than forward

**Rain World procedural animation** (Merxon22, Medium) — https://medium.com/@merxon22/recreating-rain-worlds-2d-procedural-animation-part-2-f5faef82aa50
Best for balance-based stepping logic:
- Balance check: `isBalanced = centerOfMass.x is between leftFoot.x and rightFoot.x`; when center of mass exits range, trigger step
- Overshoot factor (0.8): plant foot slightly ahead of center of mass to anticipate momentum
- Step easing: sigmoid `1 / (1 + exp(-10 * (x - 0.5)))` for natural ease-in/ease-out
- Parabolic foot arc: `midPos = startPos + posDiff/2 + (0, stepSize * 0.8)` — nested lerp for quadratic Bézier

**Little Polygon procedural locomotion** — https://blog.littlepolygon.com/posts/loco1/
Best for body lean and hip sway math:
- Lean = cross product of up vector with acceleration → quaternion → damped spring (0.25s), max 45°, multiplier 0.64
- Hip vertical bob: `HipOffset.Z = amplitude * sin(phase * 2π)`, phase advances with normalized speed; amplitude 20 units, bias -17 units
- Hip lateral sway at half bob frequency: `HipRotation.Roll = rollMag * sin(0.5 * phase * 2π)`, 8° max
- All secondary amplitude modulated by stick tilt magnitude, filtered through damped spring

**Alan Zucconi — Introduction to Procedural Animations** — https://www.alanzucconi.com/2017/04/17/procedural-animations/
Good conceptual overview. Key: Rain World and Grow Home use hybrid approach — specific endpoints moved by code, remaining joints linked by hinge constraints.

---

**Movement animation tuning — 2026-06-12:**

Four gait refinements made during this session:

1. **Backward walk gait** (`Wrestler.js` `move()`) — added `backward` detection: if `dx !== 0` and `Math.sign(dx) !== this.facing`, phase advances in reverse (`phaseDir = -1`). Feet now step correctly rearward rather than doing a forward stride played backward.

2. **Walk vs run knee lift** (`Skeleton.js` `_gaitLeg`, `Wrestler.js` `draw()`) — new `liftScale` param (0.5 walk, 1.0 run). Walk no longer over-lifts knees; the high knee snap is now exclusively a running characteristic. `runBlend` param (0→1) also passed for arm differentiation.

3. **Run arm elbows** (`Skeleton.js` `updateUpright`) — running forearm now tracks arm swing: `lArmAng * 2.3 + facing * RUN_ELBOW`. The `lArmAng * k` term goes negative when the arm swings back, pulling the elbow behind the body. Walk gets a milder version: `lArmAng * 1.1 + facing * 0.10`. Both eliminated the "arms always in front" problem.

4. **Leg segment rendering root cause** (`Skeleton.js` `_place()`) — discovered Phaser's `applyITRS` puts the bottom of a rotated image at `(px − h·sin(rotation), py + h·cos(rotation))`. The existing code used `setRotation(angle)` (skeleton convention: 0=down, positive=right), but Phaser expected the negated angle. Every limb's endpoint was mirrored on x, causing segments to fly apart at any non-zero angle. Fix: `setRotation(-angle)`. One character change; large visible impact.

**Turnbuckle system tuning — 2026-06-12:**

1. **Corner climb trigger** (`Wrestler.js` `_nearCorner()`) — replaced absolute corner-post distance check with rope-boundary check. Old code: `abs(this.x - c.x) < 28`. Near corners (x=40, x=920) are at the ring's widest point; the ring clamp keeps the player ≥20px from the boundary at y=425, placing them ~38px from the post — over the 28px threshold. Fix: compute `ringBoundsAtY(this.y)`, then check `abs(this.x - edgeX) < 35` where `edgeX` is the left or right boundary. This is geometrically correct at all depths. `dy` threshold: `abs(this.y - c.matY) < 40`.

2. **Top rope auto-bail** (`Wrestler.js` `tryDive()`) — pressing attack while on the top rope when opponent is out of range/position previously called `_climbDown()`. Fixed to `return false` so the player holds position and waits.

3. **Turnbuckle scale fix** (`Wrestler.js` `draw()`) — climbing up the post was shrinking the wrestler by half at the middle rope and again at the top because `perspectiveScale(y)` was evaluated at the tween's animated y (rope y values: 316 mid, 251 top vs 445 mat). Fix: during `climbing` and `onTurnbuckle` states, lock scale to `perspectiveScale(this._corner.matY)` — the wrestler's depth in the ring doesn't change when ascending the post. Shadow also anchored to `corner.matY` so it stays on the mat.

---

**Still to do in Phase 3:**
- Character idle personalities — George preening, brawler bouncing on his toes, etc.; tuned per character using the idle pose system from Phase 2
- Character-specific sell variations — each wrestler reacts to damage differently; a tough babyface eats moves stoically, George is theatrical about everything
- Taunt personalities — character-specific taunt animations tied to their archetype
- Two-step grapple system (No Mercy style) — lock up first, then choose the move; worthwhile once each character has 8–10 moves to choose from; revisit when move sets are full
- Migrate remaining draw methods (flat, falling, flip, dropkick, elbow air, grabbed/piledriver) to use skeleton parts — enables proper poses for those states and makes PNG swap complete
- Piledriver attacker animation — needs a proper seated sprite frame; can't be done convincingly without skeleton parts for that state
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

*(Note 2026-07-07: Derek is leaning Vercel + a custom domain instead of GitHub
Pages, and is eager to host the game early as a build-in-public playable demo —
but wants to polish it a bit more first. Revisit when it feels ready; don't rush.)*

---

## Running the Project

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or whichever port Vite assigns).

Phaser loads from CDN — internet connection required for dev. For offline dev or production, download `phaser.min.js` and serve locally.
