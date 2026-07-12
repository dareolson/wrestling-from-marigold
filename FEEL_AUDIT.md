# Feel Audit — Movement Physics, Momentum, Ring Psychology

Session 2026-07-08. Method: instrument first, opine second. All numbers measured
through the debug harness (per-frame position sampler hooked on the scene's
`postupdate` event) or read directly from the code with file:line citations.
Baseline `debug:play -- all` 12/12 before any measurement.

Reference points: WWF No Mercy (feel), real 1950s TV wrestling footage
(aesthetic pacing). Severity: ★★★ = actively hurts the game today,
★★ = leaves obvious feel on the table, ★ = polish.

---

## Part 1 — Movement & Momentum

### Measurement setup

Scripted P1 (P2 keyboard dummy), ts=1 so px/s are gameplay-true. Per-frame
velocity = Δx/Δdt across ~520 samples at 16.6ms avg frame time. Wrestlers at
y≈360 (perspective s=0.81); walk speed constant is 140 px/s unscaled, run 340.

### M1 ★★★ — Locomotion has no acceleration, no deceleration, no turn cost

**Evidence (measured):**

- Walk start: first six moving frames of vx = `111, 112, 119, 110, 108, 112` px/s.
  Full speed on frame 1. There is no ramp.
- Walk stop: `120, 107, 113, → 0, 0, 0` — dead stop in one frame.
- Turn-around: `-114, -114, -114` from the first frame of reversed input. Full
  speed in the opposite direction instantly; no pivot, no plant, no cost.

**Code:** [Wrestler.js:319-322](src/Wrestler.js#L319-L322) — position += SPEED·s·dt
directly from input; the only ramped quantity is `moveBlend` (dt·6), which
drives *visual* lean/bob only, never velocity. `facing` snaps to the opponent
side every frame ([Wrestler.js:300-303](src/Wrestler.js#L300-L303)).

**Why it matters:** constant-velocity movement is the #1 "floaty game" tell.
A 258px-tall body that reaches 112 px/s in 16ms weighs nothing. No Mercy sells
weight before any move happens — starting, stopping, and turning all cost a
few frames. This is also why circling/spacing (the neutral game) feels
inert: repositioning has no commitment, so feints mean nothing.

**Lever:** fun (weight), readability (movement intent).

### M2 ★★★ — No hitstop; light strikes have zero contact feedback

**Evidence (code, verified by grep over the whole tree):**

- `timeScale` is touched exactly once — the `?ts=` debug param
  ([Arena.js:63-67](src/scenes/Arena.js#L63-L67)). No move freezes time, ever.
- 14 `camera.shake` calls exist; **jab and headbutt have none**. The jab's
  entire impact feedback is the defender's 110ms sell tween
  ([Wrestler.js:718-730](src/Wrestler.js#L718-L730)).
- No impact audio exists — CrowdAudio is murmur/pops/bell only; contact itself
  is silent.
- Shake timing for knockdowns fires on the *fall-complete* callback, not at
  contact: `startFall` shakes after its 400ms tween
  ([Wrestler.js:1280](src/Wrestler.js#L1280)), `startClotheslineFall` after
  its 380ms arc ([Wrestler.js:1302](src/Wrestler.js#L1302)). The hardest hits
  in the game have their screen response ~0.4s late.

**Phase timing survey (MOVE_DEFS + impact callbacks)** — the 4-phase heavy/light
split is real and correct:

| move | wind-up | impact fires at | contact feedback |
|---|---|---|---|
| jab | 83ms | 83ms | none (sell tween only) |
| headbutt | 117ms | 117ms | none |
| doubleAxeHandle | 280ms | 280ms | shake 80ms/0.001 (barely visible) |
| clothesline | 100ms | 100ms sell | shake at flip END (+~530ms) |
| bodySlam | ~480ms | victim lands ~500ms | shake 200/0.003 at land ✓ |
| piledriver | ~450ms | crash | shake 220/0.0035 ✓ |
| topDive | 700ms flight | landing | shake 260/0.005 ✓ |

**Why it matters:** impact is sold by time manipulation more than by animation.
The slams get it half-right (shake at the landing); the strike game — which is
most of every match's volume — has literally nothing at the moment of contact.
A jab connecting and a jab whiffing look identical for the first 100ms.

**Lever:** fun (impact), drama (strikes currently feel like noise between slams).

### M3 ★★★ — Fall arcs are anti-gravity: bodies rise fast and float down

**Evidence (measured, clothesline knockback):** flipProgress tween is 380ms
`Cubic.easeOut` ([Wrestler.js:1285-1305](src/Wrestler.js#L1285-L1305)), arc
height = sin(p·π)·85s. Measured: **rise 83ms, fall 284ms** — the body takes
3.4× longer to come down than to go up, decelerating the whole way, and lands
at ~0 px/s. Horizontal profile of the same knockback:
`-494, -430, -372, -290, -222, -151, -85, -37, -10, -2` px/s — an exponential
glide to a stop, i.e. the hockey-puck slide. Real thrown bodies do the
opposite: slow up, *accelerate* down, hit with terminal speed, stop abruptly.

The plain `startFall` is better (400ms `Cubic.easeIn` — accelerates), but its
"arc" is a vertical height collapse with the head easing forward; nothing in
it reads as mass hitting the mat except the late shake (see M2).

**Lever:** readability (this is the single biggest "placeholder physics" tell
on screen), fun (bumps are the product being sold — they currently unsell
themselves).

### M4 ★★ — Momentum is not conserved through moves, and running hits no harder

**Evidence:**

- Measured: whip victim runs at a constant 274 px/s (= 340·s, zero decay);
  at clothesline contact he *full-stops for ~250ms* (100ms attacker wind-up +
  150ms sell at zero velocity), then launches at 494 px/s. Momentum vanishes,
  then reappears from nowhere, bigger.
- Knockback distance is a constant `80·s` px (~65px — a quarter of body height)
  regardless of the victim's speed ([Wrestler.js:1289](src/Wrestler.js#L1289)).
  A clotheslined sprinter and an armdragged stander travel the same distance.
- Damage ignores velocity everywhere: `STAMINA_DRAIN` is a constant table
  ([Wrestler.js:13-28](src/Wrestler.js#L13-L28)). The running double axe handle
  (12) hits *softer* than a standing dropkick (14). Nothing in the game rewards
  building speed.

**Why it matters:** the Irish whip is the era's signature physics statement —
"I gave you my speed and it came back as damage." Right now the rebound is
cosmetically fast but mechanically meaningless.

**Lever:** fun (momentum play), drama (running spots should be spots).

### M5 ★★ — Rope rebound is an instant velocity flip; the body never loads

**Evidence:** measured toRope and returning speeds are identical (274/274 px/s);
the direction reverses in a single frame ([Wrestler.js:417-423](src/Wrestler.js#L417-L423)
sets `runFacing = -dir` and continues at full speed the same tick). The *ropes*
visually sag on the bounce (`triggerRopeBounce`), but the body doesn't spend a
single frame compressing into them — the springiest object in the arena
transfers zero time to the runner.

**Lever:** readability (whips look like a video loop reversing), fun.

### M6 ★★ — No mass: brawler, George, and Thesz share one body

**Evidence:** `SPEED`, `RUN_SPEED`, all tween durations, knockback distances,
get-up curve, and stagger windows are module constants; the `PRESETS` table
([Arena.js:673-691](src/scenes/Arena.js#L673-L691)) carries only
name/personality/idle pose/colors/kit. Weight differentiation currently lives
entirely in the AI brain, which the player never feels in his hands.

**What per-wrestler mass would change** (one `mass` scalar, ~0.9 light /
1.0 / 1.15 heavy, applied as: walk/run speed ÷ mass, knockback distance ÷
receiver mass, bump/fall duration × receiver mass, get-up duration × mass,
whip-run speed ÷ mass, stagger window × mass): George should feel quicker and
bump bigger; Thesz should be a truck that barely moves when hit. Zero art.

**Lever:** character identity, fun.

### M7 ★★ — Knockback falls don't clamp (known bug, now characterized)

**Evidence:** `startClotheslineFall` tweens `x + 80·s` with no `_clamp()`
([Wrestler.js:1289-1295](src/Wrestler.js#L1289-L1295)), so a body knocked down
at a wall lands with its center past the movement clamp, and `_drawFlat`'s
200·s-wide body + head extends up to ~110px past the rope plane. Screenshot
evidence from AI matches: downed bodies visibly hanging through the ropes over
the apron (shots_bg/m0_t160, both probes — see Part 2 space section). The
piledriver also parks the *attacker* at `y = sy + 88·s`
([Wrestler.js:1001](src/Wrestler.js#L1001)) — up to y≈513 when delivered at the
near clamp (425), i.e. below the ring's near plane, before the 200ms roll-back.

**Measured (AI-vs-AI probes):** 100–150 out-of-bounds frames per match for
non-airborne states; worst cases captured: a `down` body at **y=509** (64px
below the ring's near plane — the reported y≈500 bug, reproduced) and
`flipping` bodies carried to **x=892** (~70px past the right rope plane at
that depth) before landing `down` outside the ring.

**Lever:** readability (ring feels permeable), correctness.

### M8 ★ — Walking pace context (not a defect by itself)

Walk covers 112 px/s against a ~725px-wide ring at mid-depth: ~6.5s to cross
the ring, 0.43 body-heights/s. That deliberate pace is period-plausible **if**
starting/stopping carry weight (M1); combined with instant accel it reads as
gliding, not walking. Fix M1 before judging the constant.

---

## Part 2 — Ring Psychology

**Method:** 5 AI-vs-AI matches through the harness at ts=3 — 3× brawler/George
(8:02 p1 pinfall, 6:53 p1 pinfall, 7:06 p1 pinfall) and 2× Thesz/George
(10:00 draw, 2:10 sleeper KO). Recorded: full event logs, 1s heat trace, 0.5s
position/stamina trace, per-frame state occupancy, out-of-bounds watch,
screenshots every ~75s. Caveat: the heat/position *traces* are only valid for
each probe's first match (a probe throttling bug ate the later traces); event
logs, state occupancy, kickout data, and OOB counts are valid for all five.
Damage arcs for all matches were reconstructed from the `defenderStamina`
field logged on every move.

### P1 ★★★ — The AI lockup mini-game is dead: every AI lockup self-resolves into a slam on the same frame

**Evidence (measured):** across all five matches, **179 of 186 AI lockups were
followed by their follow-up move within the same logged second**. Thesz — built
hold-centric (`holdOdds: 0.75`, `lockupPreference: 'headlock'`) — produced
**74 lockups → 72 body slams, 1 headlock, 0 Irish whips** in the 10:00 draw.

**Root cause (code, confirmed):** keyboard `justDown` goes through
`Phaser.Input.Keyboard.JustDown(key)`, which *consumes* the press
([InputHandler.js:46-49](src/InputHandler.js#L46-L49)). `AIHandler.justDown`
just reads a flag and leaves it set ([AIHandler.js:159](src/AIHandler.js#L159)).
So when the AI presses grapple: `tryAction` creates the lockup, then
`_tickLockup` runs **later the same frame**
([Arena.js:1022-1028](src/scenes/Arena.js#L1022-L1028)), sees the *same*
still-true `justDown('action')`, and instantly executes the no-direction
follow-up — piledriver/bodySlam. `_handleLockup` (the AI's actual lockup brain,
with the headlock rolls, the steal contest, and the whip-the-rope-clinger
counter) never runs. This is also the long-standing BUILDLOG 2026-07-03 quirk
("AI lockup intends headlock but piledriver comes out") — it wasn't a kit
mapping oddity, it was this.

**Blast radius:** kills the steal contest, headlock attrition (George's
supposed damage engine), directional whips, the whip-out-of-the-corner
relocation counter (see P3), and turns every AI grapple into the same slam —
the single biggest cause of move monotony (25–35 body slams per match).

**Lever:** drama, variety, space — this one bug feeds four other findings.

### P2 ★★★ — Matches decide early, then play a long zombie phase

**Evidence (event-reconstructed stamina arcs, per-minute averages of George's
stamina):**

| match | first time George <15 stamina | per-minute stamina arc |
|---|---|---|
| bg 1 (8:02) | t=376s — **78% of match** ✓ healthy | 87 89 55 80 77 53 12 8 0 |
| bg 2 (6:53) | t=99s — **24%** | 87 40 1 7 17 6 4 |
| bg 3 (7:06) | t=39s — **9%** | 44 37 2 42 65 47 29 2 |
| tg 1 (10:00) | t=49s — **8%** | 57 2 1 7 1 5 3 1 1 2 |
| tg 2 (2:10) | t=67s — 52% | 57 8 15 |

In 3 of 5 matches the loser is functionally dead inside the first quarter and
the remaining 5–9 minutes are attrition theater: George spends **55–77% of all
frames in down/gettingUp/grabbed**, P1 spends 54–75% just standing. P1's own
stamina never drops below 76 after the opening exchange — there is no heat
segment on the winner, so no comeback shape, no doubt about the ending. bg 3
shows the comeback machinery *can* lift him (minute arc 2→42→65 via kickout
refunds + taunt conversion) — but he starts dying at 0:39, which is a shine
that lasts one exchange.

**Why:** damage is linear and un-resisted, the kickout-refund comeback only
triggers on count ≥2 kickouts, which only happen near death (P5), and once
George is lowStam he's locked into beg-off/rope-wave loops that concede the
rest of the match.

**Lever:** drama (shine → heat → comeback → finish is currently shine →
collapse → paperwork), fun (nothing at stake for 2/3 of a match).

### P3 ★★★ — The action glues itself to the rope walls; the ring goes unused

**Evidence (valid traces + screenshots + occupancy):**

- tg 1: both wrestlers in the center third simultaneously **1%** of samples;
  George rope-adjacent **97%**; **6 of 32** ring grid cells ever visited;
  x-distribution by sixths: `0/0/1/2/20/76%`.
- bg 1 (the healthiest match): center-both 14%, cells 21/32, George
  rope-adjacent 53%.
- Screenshots at random timestamps show the same frame over and over: two
  figures stacked against the left or right ropes, an empty mat, downed
  bodies overhanging the ring boundary.

**Why (code):** every defensive behavior moves *away* — stall backs off,
beg-off backs off, rope-seek aims at a wall ([AIHandler.js:211-234](src/AIHandler.js#L211-L234)) —
and the attacker follows. Nothing ever moves the pair back toward center: the
one mechanic designed to do it (lockup → whip the rope-clinger across the
ring, [AIHandler.js:444-451](src/AIHandler.js#L444-L451)) is dead per P1, and
slams place the victim at `landX` clamped *at the wall* when delivered there
([Wrestler.js:840](src/Wrestler.js#L840)). Meanwhile the ropes are a
mechanical safe zone (pins auto-break), so the AI's optimal play and the
game's drama needs point in opposite directions. Position tells no story:
being cornered carries no extra danger, being center-ring no exposure.

**Lever:** readability (the 1950s wide shot is an empty ring with two men at
the edge of frame), drama (corners should mean trapped, center should mean
tested), and it visually amplifies M7 (bodies through ropes).

### P4 ★★ — Escalation is inverted: finishers open the match, and the 30th slam costs what the 1st did

**Evidence (first-use table from event logs):** piledriver first lands at
**0:05** (bg 2, defender at 70 stamina), 0:49 (bg 1), 3:54 (bg 3); body slam
at 0:03–0:42; sleeper at 0:48–1:13 on 55–65 stamina opponents. There is no
time, damage, or heat gate on any big move — George cashes the piledriver
whenever a lockup coincides with `opp.stamina < 40`, Thesz slams from the
first tie-up. And repetition is free: `_heatForMove` pays bodySlam 12 heat
every time — the chain multiplier actually *rewards* spamming the same slam
inside 4s windows ([Arena.js:844-854](src/scenes/Arena.js#L844-L854)).

**Lever:** drama (a piledriver at 0:05 makes minute 8's piledriver worthless).

### P5 ★★ — Nearfall rhythm is bimodal: trivial 1-counts all match, then a scripted 2.9

**Evidence:** kickout distribution across all five matches — **19 of 22
kickouts at count 1**; the only deep counts are the manufactured one-per-match
2.9 save and count-2s at ≤8 stamina. bg 3: 13 pin attempts → 11 count-1
kickouts → 1 nearfall. **Code:** `tryKickout` guarantees escape on the first
mash press above 15 stamina ([Wrestler.js:1130-1138](src/Wrestler.js#L1130-L1138)),
and the AI mashes at 7.2/s (~140ms to first press), so every cover above the
floor is a 1-count by construction. Escalating counts — the era's actual
heartbeat (1… 2… TWO-AND-A-HALF) — can't occur in the 15–100 stamina range,
which is where most covers happen.

**Lever:** drama (counts are the metronome of a wrestling match; ours only
ticks once).

### P6 ★★ — Heat: arcs when nearfalls fire, but the AI's main offense bypasses it entirely

**Evidence:**

- bg 1 (valid trace): quartile heat 51 → 71 → 73 → 76, peak 100 at the
  nearfall stretch — the retuned meter tracks a real arc. Good.
- tg 1 (valid trace): a 72-slam match produced quartiles **19 → 17 → 19 → 13,
  peak 44**. The meter correctly refuses to flatter a shapeless match — but
  partly for a wrong, load-bearing reason: **lockup follow-up moves never call
  `_heatForMove`**. `_tickLockup` logs bodySlam/piledriver/headlock/suplex/whip
  events directly ([Arena.js:1285-1304](src/scenes/Arena.js#L1285-L1304))
  without the heat bump every other move gets via `logMove`
  ([Arena.js:998-1015](src/scenes/Arena.js#L998-L1015)). Since P1 makes
  lockup-slams the AI's primary kill path, the biggest moves in AI matches are
  heat-invisible.
- tg 2: a **sleeper KO finish landed at heat 11** — the match-ending moment of
  a broadcast played to a silent room.
- George taunts 6–9% of all frames (15–23 taunts/match) because taunt→stamina
  conversion is his life support during the zombie phase — dramatic gesture
  reduced to a regen exploit.

**Lever:** drama, audio (the crowd bed is driven by this number).

### P7 ★★ — Dead air and a six-move vocabulary

**Evidence:** worst gap between meaningful beats (knockdown / nearfall /
kickout / pin / hold events — a stricter metric than sim.mjs's all-events
gap): **27–29s** in bg 2/3, 19s in tg 1. Move counts show AI matches run on
six moves: lockup-slam (25–35), jab (16–26), dropkick (7–20), elbowDrop
(5–19), taunt (10–23), pin — while **clothesline ≈1/match, irishWhip 3–4,
armDrag 0, suplex 0, dives 0** across all five matches. Code: the AI has no
code path that climbs a turnbuckle, plays possum, presses power in a lockup
(armDrag), or holds up+action (suplex) — [AIHandler.js](src/AIHandler.js)
simply never emits those inputs. The human player has a 17-move kit; the
broadcast the game shows itself is 6.

**Lever:** fun (variety), drama (no high spots in AI matches at all).

### P8 ★★ — Selling is coherent in dedicated systems, invisible everywhere else

**What sells (code verified):** walk slows up to 35% + wooze sway + stumble
rolls below 35 stamina, stagger tiers deepen, get-up stretches 0.85→1.6s,
hold-escape mash slows with stamina. Good coverage — *when the wrestler is in
those specific states*.

**What doesn't sell:** a 0-stamina wrestler still (a) sprints rope-to-rope at
full 340 px/s when whipped or running ([Wrestler.js:409](src/Wrestler.js#L409) —
no stamina term), (b) throws every attack at full animation speed (all
`MOVE_DEFS` durations are constants), (c) evades at full crispness, and
(d) climbs at full speed. The most jarring on screen: zombie-phase George
(P2) snapping off full-speed beg-off jabs and taunts between 1.6s crawls off
the mat — the get-up sells a dying man, then the next action un-sells him.

**Lever:** readability (damage should be visible in *everything* a beaten man
does), drama.

### What already works (keep, don't touch)

- The 4-phase heavy/light timing grammar is real and correct (M2 table) —
  heavies wind up slow and land fast.
- The 2.9 save fired in every single match, exactly as designed.
- Heat retune arcs properly when nearfalls actually happen (bg 1: 51→100).
- Stagger tiers, wooze, and the damage-scaled get-up read well in screenshots.
- Zero freezes, zero orphan rescues, zero stuck matches across ~35 minutes of
  probe matches — the stability work holds.

---

## Ranked findings

| # | finding | severity | lever |
|---|---|---|---|
| 1 | P1 — AI lockup self-resolves same frame (justDown not consumed) | ★★★ | drama, variety, space — feeds P3/P6/P7 |
| 2 | M1 — zero accel/decel/turn cost | ★★★ | fun (weight) |
| 3 | M2 — no hitstop; strikes have zero contact feedback | ★★★ | fun (impact) |
| 4 | M3 — anti-gravity falls (83ms up / 284ms down) | ★★★ | readability |
| 5 | P2 — early collapse → zombie phase (loser dead at 9–24% of match) | ★★★ | drama |
| 6 | P3 — action glued to walls (1–14% center time, 2–21/32 cells) | ★★★ | drama, readability |
| 7 | P5 — bimodal kickouts (19/22 at count 1) | ★★ | drama |
| 8 | P6 — lockup moves bypass heat; KO finish at heat 11 | ★★ | drama, audio |
| 9 | M4 — momentum not conserved; running hits no harder | ★★ | fun |
| 10 | M6 — no per-wrestler mass | ★★ | character |
| 11 | P4 — finishers at 0:05; free repetition | ★★ | drama |
| 12 | M5 — instant rope rebound, no body loading | ★★ | readability |
| 13 | P7 — 6-move AI vocabulary, 27–29s beat gaps | ★★ | fun |
| 14 | P8 — full-speed sprints/attacks at 0 stamina | ★★ | readability |
| 15 | M7 — knockback falls unclamped (measured y=509, x=892; 100–150 OOB frames/match) | ★★ | correctness |

---

## Proposed fixes

Every item: hypothesis → measurable/watchable acceptance check. Grouped into
batches; each item is one commit. `debug:play -- all` 12/12 after every
commit; sim batches vs the 6:02 baseline for anything touching pacing.
Everything stays per-second-rate × dt (ts=3-safe). Code only — no new art.

### Batch A — correctness (small diffs, big unlocks)

**A1. Consume AI `justDown` on read** (fixes P1). Make `AIHandler.justDown`
clear the flag it reads, mirroring `Phaser.Input.Keyboard.JustDown` semantics.
*Hypothesis:* the lockup mini-game comes back — headlocks/whips/steal contests
appear, slam monotony halves, the whip counter starts relocating wall fights.
*Accept:* AI probe shows lockup follow-ups arriving on a real `_handleLockup`
beat, not same-frame; Thesz 10-min match: headlocks ≥10, bodySlams ≤35,
irishWhips ≥5; 12/12.

**A2. Clamp knockback falls and the piledriver seat** (fixes M7). `_clamp()`
(with a wider margin for downed bodies, ~60px) on `startClotheslineFall`'s
target and at fall completion; clamp the piledriver attacker's crash tween.
*Accept:* OOB probe frames for down/flipping/gettingUp ≈ 0 (was 100–150 per
match); screenshot at a wall knockdown shows the body inside the ropes.

**A3. Route `_tickLockup` follow-ups through `_heatForMove`** (fixes half of
P6). *Accept:* a slam-heavy Thesz match no longer heat-flatlined (peak >60
with comparable knockdown count); brawler matches unchanged.

### Batch B — movement feel (Part 1)

**B1. Locomotion accel/decel/turn cost** (M1). Velocity ramps: ~120ms to full
walk speed, ~90ms to stop, direction reversal passes through the decel
(per-second accel rates × dt).
*Hypothesis:* weight appears in the hands immediately; spacing/feints become
real. *Accept:* kinematics probe shows a 3–5 frame ramp (e.g. ~45/85/105/112)
and a ≥2-frame stop; 12/12 (approach/jam scenarios tolerate the ~100ms shift).

**B2. Hitstop + contact-time feedback** (M2). A tiny shared freeze on contact
(jab ~40ms, headbutt ~60ms, slam landings ~100ms) implemented as an Arena
hitstop timer that gates `_tickGame` dt (naturally ts-safe); move the
knockdown camera shakes from fall-complete to contact; add a small shake to
jab/headbutt.
*Hypothesis:* strikes stop feeling like noise; slams gain punctuation.
*Accept:* sampler shows the expected frozen frames at contact; shake fires
within 1 frame of the impact callback; 12/12 (hitstop pauses both bodies
equally, so scenario timing windows shift together).

**B3. Falls obey gravity** (M3). Two-phase knockback arc: fast rise (~35% of
duration, easeOut), accelerating descent (easeIn) landing at speed; cut the
sub-50px/s horizontal crawl tail.
*Hypothesis:* bumps start selling the move that caused them.
*Accept:* measured rise:fall between 1:1 and 1:1.5 (was 1:3.4); landing
happens at speed (arc doesn't feather in); flip x-velocity reaches 0 within
~120ms of touchdown.

**B4. Momentum matters** (M4). Knockback distance scales with victim speed at
contact (standing ×1, whipped runner ×~2); rebound clothesline/axe-handle
drain ×1.4 on running victims.
*Hypothesis:* whips become the era's power statement instead of a cosmetic
loop. *Accept:* measured flip travel: running victim ≥1.8× standing victim;
event-log drains differ; sim duration still in the 5–8 min band.

**B5. Rope rebound loads the body** (M5). 80–100ms hold at the rope plane
(body compresses, existing rope-sag spike plays) before reversal.
*Accept:* sampler shows dwell frames at the clamp with vx=0 between opposite
signs; clothesline scenario still passes.

**B6. Per-wrestler mass** (M6). One `mass` scalar in PRESETS (george 0.92,
brawler 1.0, thesz 1.12): walk/run speed ÷mass, received knockback ÷mass,
bump/get-up duration ×mass, whip-run speed ÷mass.
*Hypothesis:* the roster stops sharing one body; Thesz feels like a wall
before he throws anything. *Accept:* kinematics per preset shows distinct
speeds/knockbacks; n=8 sim per matchup stays in the 5–8 min band; 12/12
(scenarios run default presets).

### Batch C — ring psychology (Part 2)

**C1. Kickout depth tracks damage** (P5). Replace the >15-stamina guaranteed
first-press escape with a continuous per-press success curve so covers on a
70-stamina man break at 1, on 40 at 2, on 20 at 2.7+ (tuned so fresh
wrestlers still never die to a cheap cover).
*Hypothesis:* counts escalate all match — the metronome starts ticking.
*Accept:* sim-batch kickout distribution: ≥30% of kickouts at count ≥2 (was
14%); avg duration within the 5–8 min band; no pin deaths above 50 stamina.

**C2. Kill the zombie phase** (P2). Two levers, measured together: (a)
beg-off/rope-wave states regen stamina ~2× so George cycles back into the
match instead of flat-lining, (b) below ~15 opponent stamina the AI hunts the
finish (cover/sleeper priority overrides stall/showboat) so decided matches
end.
*Hypothesis:* matches stay contested longer and end when they're over.
*Accept:* event-reconstructed arcs — median "first <15 stamina" moves from
~24% to >55% of match duration; time from first <15 to the bell ≤ 90s median;
avg duration still 5–8 min.

**C3. Escalation gates on big moves** (P4). AI won't throw
piledriver/sleeper/top-tier slams before damage+heat justify them (e.g.
piledriver odds ~0 until opp <55 stamina or heat >45, ramping after); pair
with per-move diminishing heat (bump × 0.65^(uses in last 60s)) so repetition
stops paying.
*Hypothesis:* big moves become chapter breaks, not filler.
*Accept:* first-piledriver median >2:30 (was 0:05–0:49); no move >20 uses per
match (was 35); heat still peaks ≥80 in closing stretches.

**C4. Fights use the ring** (P3). After downing an opponent at the ropes, the
AI repositions to the open side (pulling action inward); slams/whips delivered
at a wall aim their throw toward ring center; A1's restored whip counter does
the rest.
*Hypothesis:* center becomes the default stage, walls become punctuation.
*Accept:* probe space metrics — both-in-center-third >25% (was 0–14%), grid
cells ≥16/32 (was 2–21), loser rope-adjacent <50% (was 53–100%).

**C5. Damage shows in everything** (P8). Scale whip/self-run speed and attack
pose-sequence durations by stamina (full speed at 100, ~70% at 0), keeping
impact-callback timings proportional.
*Hypothesis:* a beaten man reads beaten in every action, not just get-ups.
*Accept:* measured whip-run speed at ≤10 stamina ≈ 30% slower than fresh;
12/12 (scenario dummies are fresh, timings unchanged); HEADED eyeball —
late-match exchanges visibly slower than the opening.

**C6. AI learns the rest of its kit** (P7). Give the AI suplex + armDrag from
lockup (directional variety), an occasional turnbuckle dive when the opponent
is down mid-ring and heat is high, and possum for George.
*Hypothesis:* AI matches show high spots and texture without new systems.
*Accept:* n=8 sim — dives ≥1 per 2 matches, suplex/armDrag present, no single
move >40% of all moves; duration/parity in band.

### Suggested order

A1→A2→A3 first (small, all measurable, and A1 alone reshapes AI matches —
worth re-probing psychology after it lands before committing to all of Batch
C). Then B1–B3 (the core feel trio — what your hands touch every session),
then C1+C2 (the drama pair), then the rest as taste dictates.

### Human playtest checklist (after whichever batch ships)

- Walk a lap: can you feel your feet catch when you stop? Does turning have a
  beat of commitment?
- Land a jab: does your thumb feel it (freeze + shake at contact)?
- Whip → clothesline: does the rebound body *arrive* with speed, and does the
  bump land like a sack of flour or drift down like a leaf?
- Steer a fight to the wall deliberately: does it find its way back to center
  without you forcing it?
- Late match: does the losing man look and *move* beaten — and do covers get
  to 2 before they break?
- Watch one full AI match start to finish: name the shine, the heat, the
  comeback, and the finish out loud. If you can't, Batch C isn't done.

---

## Batch A results (2026-07-09/10, commits 6d581d4…92815cd)

Method: same probe setup as the baselines (3× brawler/George + 2× Thesz/George
at ts=3), run twice — after A1–A3, then after the two follow-up fixes the
first re-probe demanded — plus a 2-match verification round. 12/12
`debug:play` after every commit.

### What the re-probe found (and forced)

**A1 exposed a second, older bug.** With lockups no longer self-resolving,
`_handleLockup` ran for the first time ever — and deadlocked: it gates on the
global `_cooldown`, which the grapple press that *creates* the lockup sets to
0.8–0.9s, longer than the 0.8s lockup timeout (and the timer gets a one-frame
head start). Result: Thesz threw 122 lockups with **zero** slams and zero
covers; all 5 matches went to 10:00 draws. Fixed in `3be9e3b` — follow-ups
run on a dedicated 0.15–0.45s `_lockupBeat`.

**A2's first pass wasn't enough.** OOB probes traced three more unclamped
positioners: the lockup arm's-length drift (Arena `_tickLockup` — bodies at
x≈890), the suplex landing (90·s behind the attacker), and the dropkick
attacker's landing (targets past a rope-hugging victim, then ends `down`
there). Fixed in `d761429` + `92815cd`.

### Acceptance checks

| check | target | result |
|---|---|---|
| A1: Thesz headlocks | ≥10 | **47–56** ✓ |
| A1: Thesz bodySlams | ≤35 | 0 — see C-batch note |
| A1: Thesz irishWhips | ≥5 | **62–67** ✓ |
| A1: slam monotony | halve | longest same-move streak 25–35 → **2–5** ✓ |
| A2: OOB down/flipping/gettingUp | ≈0 | **0** (one 1-frame standing blip / 2 matches; was 100–150/match) ✓ |
| A3: slam-heavy match heat | peak >60 | **peak 86–100** (was 44) ✓ |

### What changed in match quality (vs baseline probes)

- Heat: quartile arcs 74→89→86→88 peak 100 (bg), 79→92→94→92 (tg — was
  19→17→19→13).
- Space: grid cells 16–32/32 (was 2–21), both-in-center-third up, worst beat
  gaps 16–42s (was 27–111s post-A1-only).
- Nearfalls: bg matches now produce 1–4 real nearfalls + the 2.9 save;
  pin attempts 4–18/match.
- brawler/George: pinfalls at 1:37, 7:56, 8:08 + two hard-fought 10:00 draws
  across rounds (baseline: 3/3 pinfalls but vs a zombie).

### New headline problem → Batch C

**Nobody can close.** Thesz/George is now all Broadways: Thesz's plain-slam
branch requires `opp.stamina < 40`, his covers `< 60` — and George never gets
that low because headlock drain (4/s) roughly cancels his taunt regen. The
match is alive (heat 100, 30/32 cells) but endless. These thresholds are
booking knobs, not bugs; C1 (kickout depth curve) + C2 (finish hunting) are
the tools, exactly as the batch ordering predicted. Re-decide C scope with
these numbers, not the baseline's.

---

## Post-Thesz-press baseline (2026-07-11)

Method: 16 AI-vs-AI probe matches at ts=3 — 8× Thesz/George, 8× brawler/George —
measured on `baseline-post-thesz` (game code as of `9c9f18e`, i.e. with Batch A,
the Thesz press finisher + `slamAt`/`pressHuntAt` hunt logic, earlier covers
`coverStamina` 55/60 + tightened `pinWait`, and the `resolvePowerMove`
extraction). Probes ran in 2–4-match chunks against a dedicated Vite server
(port 5301) so no HMR could touch a live match. Before measuring, fixed a
psych_probe recorder bug (`7fdf25a`): heat/position traces froze after match 1
of any multi-match run (the match-boundary reset re-baselined the throttle
clocks while `_matchTime` was still parked at the old match's final value).
All 16 matches have valid event logs; 15 of 16 have valid traces (bg match 2
was captured pre-fix — its events count, its traces don't). Supplemental
analyzer: `tools/debug/psych_baseline.mjs` (`4ef5599`) — kickout depth,
offense share, first-finisher timing, per-minute stamina, below-15-to-bell.

### The headline: Thesz/George is still all Broadways — 8 for 8

Nothing that landed since Batch A moved the needle. The press, the earlier
covers, and the `slamAt: 60` throw window all gate on the same state — **a
standing opponent at low stamina — and that state does not exist.** Measured
across all eight tg matches, George is standing with stamina <60 in **0.3%**
of trace samples, and standing with stamina <42 (the `pressHuntAt` window) in
**0.0%**. His stamina does dip (event-time floors 18–68) — but every dip
happens mid-knockdown-chain while he's down or being covered, and the recovery
stack (taunt-to-stamina conversion at ~35 taunts/match, kickout comeback
refunds, natural regen) lifts him back over every threshold before he's on his
feet again. The kill windows are real in the code and vacant in the match.

Downstream of that, in 8 tg matches:

- Thesz threw **0 suplexes and 0 bodySlams** (the `slamAt: 60` branch needs
  George <60 at lockup-follow-up time: 509 of 511 follow-ups found him ≥60).
- The **Thesz press was attempted once** — 1 press in 8 matches (m6, 6:03,
  George at 25) — and it whiffed; George was back on offense a second later
  and taunt-regenned 25→37.
- **16 pin attempts total** (0–6 per match; three matches had zero), all 16
  kickouts at count 1. **Zero nearfalls. The 2.9 save never fired** — the
  "fired in every single match" claim from the original audit no longer holds
  for this matchup because no cover ever gets deep enough to trigger it.

### Per-matchup tables

**Thesz vs George (n=8):**

| metric | value |
|---|---|
| finishes | 8× 10:00 time-limit draw (0 pinfalls, 0 KOs) |
| offense share (Thesz) | 52–59% of attributed events |
| pin attempts / kickouts | 16 / 16 across all matches; 100% at count 1 |
| nearfalls / 2.9 saves / rope breaks | 0 / 0 / 0 |
| first major-finisher attempt | sleeper median 1:27 (0:40–8:57); press 1× in 8 matches |
| George stamina floor per match | 18–68; **never below 15 in any match** |
| below-15-to-bell | n/a — the trigger state never occurred |
| per-minute stamina averages | both sides 76–100 all match (full-regen equilibrium) |
| moves per match (both sides) | lockup 97, whip 52, jab 48, headlock 45, taunt 35, elbowDrop 28, dropkick 15, clothesline 11; suplex 0, bodySlam 0 |
| longest same-move streak | 4 (jab) |
| space | 24–32/32 grid cells (7 of 8 ≥31); center-both 12–26%; George rope-adjacent 43–67% |
| heat (quartile avg) | 59–81 → 85–94 → 90–93 → 90–94, peak 100 every match |
| worst beat gap per match | 38–98s (median ~51s) |
| OOB | 0–57 frames/match, all `standing` at the rope planes (x≈845/x≈121, ≤10px past the probe margin); down/flipping/gettingUp = 0 |

**Brawler vs George (n=8):**

| metric | value |
|---|---|
| finishes | 6× 10:00 draw, **2× brawler pinfall (9:44, 6:21)** |
| offense share (brawler) | 57–64% |
| pin attempts | 7–21 per match (115 total) |
| kickout depth (n=113) | count 1: 91% · count 2: 4% · 2.9 save: 4% · deep-mash "3": 2% |
| nearfalls / rope breaks | 0–2 per match (10 total) / 0 |
| first major-finisher attempt | sleeper only, 4 of 8 matches (0:34–6:38); George's sleeper hunt rarely arms (brawler stays >70) |
| George stamina floor per match | 0–5 in six matches — **hit 0 and still survived in 4 of those 6** |
| below-15-to-bell (n=7 traced) | 16–559s, median 219s |
| moves per match (both sides) | lockup 60, jab 44, elbowDrop 38, taunt 33, whip 29, dropkick 27, bodySlam 18, headlock 14, headbutt 9, clothesline 2 |
| longest same-move streak | 3–4 (jab) |
| space | 23–32/32 cells; center-both 8–20%; George rope-adjacent 29–66% |
| heat (quartile avg) | 57–83 → 82–93 → 86–92 → 91–93, peak 100 every match |
| worst beat gap per match | 36–52s |
| OOB | 0–99 frames/match, all `standing` at rope planes; down-state OOB = 0 |

Both pinfalls have the same anatomy: the brawler stacks bodySlam-grade burst
damage faster than the refund cycle can pay it back — e.g. the 9:44 finish is
slam (20→0), 2.9 save + refund to 23, immediate re-slam (23→1), pin inside
seven seconds. Burst can out-race the regen; drip (Thesz's headlock at 4/s)
cannot.

### Against the Batch A published numbers

| | Batch A (published above) | This baseline |
|---|---|---|
| tg finishes | all 10:00 Broadways | **still all Broadways (8/8)** |
| bg finishes | 3 pinfalls (1:37, 7:56, 8:08) + 2 draws across rounds | 2 pinfalls (6:21, 9:44) + 6 draws — closing got *rarer*, and later |
| heat arcs | bg 74→89→86→88; tg 79→92→94→92 | same shape: opens 57–83, sustains ~90, peak 100 in 16/16 |
| space | 16–32/32 cells | 23–32/32 — holds, slightly better floor |
| beat gaps | 16–42s | bg 36–52s; tg 38–98s (tg's worst gaps are hold/whip loops) |
| kickout depth | count-1 dominated (P5) | unchanged: 91–100% count-1 — C1 still untouched |
| 2.9 save | "fired in every single match" | bg only (4×); **never fires in tg** |
| OOB | ≈0 after A2 | small regression: ≤99 frames/match of `standing` bodies ~5–10px past the rope-plane margin (x≈845 / x≈115–121); nothing flat ever leaves the ring |

### Answer to the open question

**Can somebody close now?** Brawler: occasionally (2 of 8, vs 3 of 5 at Batch
A — if anything the earlier covers made George *harder* to pin, because every
extra count-1 kickout is another beat of taunt-regen). Thesz: **no — 0 for 8,
and structurally can't.** The C-batch levers are confirmed as the right ones,
with one sharpening from this data: C2's finish-hunting shouldn't gate on
"standing opponent below threshold" (that state is vacant — 0.0–2.7% of
samples); it has to either catch George *during* the down/getting-up window,
or suppress the recovery stack (taunt conversion + kickout refund) once a
wrestler has been driven under the threshold, or both. C1 (kickout depth
curve) is untouched by recent work and remains the other half.

### Anomalies and caveats

- Sample sizes: n=8 per matchup, single personality pairing per side; bg
  match 2's traces are invalid (pre-fix capture) so trace-derived bg metrics
  are n=7 (event-derived metrics are n=8).
- The event log's stagger-grab conversion logs move name `slam`
  ([Wrestler.js:527](src/Wrestler.js#L527)), which has no entry in
  `_heatForMove`'s bump table — those conversions (~1–2/match, bg) award no
  heat. One-line fix whenever someone's next in that file.
- Zero crashes, zero stuck matches, zero orphan rescues across all 16 probe
  matches (~2.7h of game time). One theszPress whiff (its only attempt).
- Runs were chunked (2–4 matches per probe invocation) after a prior session
  reported multi-match reliability issues; all chunks completed cleanly.
