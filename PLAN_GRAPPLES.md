# Grapples: a lockup that reads as a real collar-and-elbow tie-up

2026-10-29 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
Handoff: [2026-10-29-claude-grapples-handoff.md](AI_HANDOFF_ENTRIES/2026-10-29-claude-grapples-handoff.md). Get-ups are closed (promoted 6bfb66c).

## Progress

(Sonnet: one line per task: id, commit, result, misses. ≤ 3 lines. Gate lines are written by Opus/Derek only.)

- T1.0: 72b380a [reference page](research/animation/grapples-2026-10/reference.html): Bret f130-139, f322-326, f345-350 and Haggar f3/f30/f98 beside lockup-now.png, a line per point.
  Misses: all sheets are one wrestler, so no frame shows a hand on a neck or elbow, heads, arrival, drive or a reversal (points 1-3, 6-10); Haggar (f0-179) has no lockup row; other Slam Masters not opened.
- T1.1: SHA1 `src/animation/lockup.js` + tests/lockup.test.js 13/13 (grab order, D4 sides both lSide x facing, collar point, step-only travel, stall, steal hitch, break, seeded tugs, 70/30 closure).
  Misses: pure math only, nothing drawn yet; lead leg = the near-side leg by my choice (not measured on a rig until T1.2); `holdGrips` has no `at` yet, so the collar entries (joint 'Neck') do nothing until T1.2.

## Why (Derek 2026-10-29)

"We need to know who grabbed who, who is dominant." And: "I want us to go as far as we can to honor what it means to be
locked up in a wrestling match. This is really important to the mechanics, as every move will emerge from a lockup, well
most moves, so if it looks cheesy, everything will look cheesy."

Today ([frame](research/animation/grapples-2026-10/lockup-now.png)): both wrestlers tween to the same `lockup` pose
(`src/Wrestler.js` ~278: arms 1.57 rad straight out). Their hands meet in the air and nobody touches a body. `_tickLockup`
(`src/scenes/Arena.js` ~3668) holds them at a fixed 100·s gap with no drive. A steal swaps roles and re-tweens the same pose,
so nothing visible changes. The lockup times out at 0.8 s, and the AI decides after 0.15-0.45 s.

## What a real lockup is (the bar)

1. **Someone arrives first.** The grabber steps in and his hands land first. The other man meets him a beat late.
2. **Collision.** Chests meet at the shoulders with a small jolt. Both bodies compress and settle; nobody stands still.
3. **Collar and elbow.** One hand goes behind the opponent's neck, with the forearm across his collarbone. The other hand
   cups the opponent's elbow on that same collar arm. Both men hold the same tie-up mirrored, so each has one hand on a
   neck and one on an elbow.
4. **Heads together.** Each head goes to the side, over the opponent's shoulder: ear to ear, foreheads close.
5. **Base.** Staggered stance with the lead foot forward, knees bent and hips back, so the weight goes into the other man.
6. **Jockeying.** Short irregular tugs and shoves while neither has control: weight shifts and short steps, not a smooth wobble.
7. **Dominance.** The man in control gets lower, his head comes over the other man's shoulder, and he drives with short
   steps. The other man goes upright with his chin up and heels down, and gives ground backward. **The pair travels.**
8. **Feet step, never slide.** The drive moves in pulses, one step each, with planted feet between steps.
9. **The ropes stop it.** Pinned against the ropes, the drive stalls. (A rope break comes in a later stage.)
10. **A reversal is a fight.** The loser drops his level and shoves. There is a hitch, then the drive flips the other way.

## Decisions (Opus; Derek can overrule at G1)

- **D1. Flag** `?grapples=v1`, **opt-in** (like `gait=v2`). Flag off is byte-identical, which a fixture checks. The
  reader is `grapplesCandidate()` beside the others in `Wrestler.js`. Arena imports it or gets it as a method.
- **D2. Longer lockup, flag on only.** The timeout goes from 0.8 to **1.4 s**. Follow-up input during the engage (D4)
  is **buffered** and fires when the engage ends: you can't suplex someone you haven't grabbed. The AI's decision beat
  starts at engage end and runs 0.35-0.9 s, so some lockups show the drive. Derek judges the length at G1. If it plays
  slow, the fallback is shorter phases, not losing them.
- **D3. Roles.** The attacker is the man in control. He drives, and he has the follow-up rights. A steal swaps control.
- **D4. Grabber's arm is the near arm.** The attacker's collar hand is his near (camera-side) arm, on the defender's neck.
  The defender's near hand cups the attacker's near elbow. Away from camera, the attacker's far hand is on the defender's
  far elbow, and the defender's far hand is behind the attacker's neck, mostly hidden by the attacker's head. Seen from
  camera, the attacker's arm reaches to the neck and the defender hangs on to that arm. That is the "who grabbed whom" read.
  Handedness swaps between facings; sprite games cheat this the same way. "Near" always comes from
  `skeleton.lChannelSide(facing)`, never a fixed `l`/`r`.
- **D5. Grips stay through a steal.** A real reversal doesn't re-grip, so the original grabber keeps the near collar arm.
  After a steal, dominance shows through posture and drive direction only. Derek may ask for a re-grip at G1.
- **D6. Phases** (times at 1.4 s; all are constants in `src/animation/lockup.js`):
  - `engage` 0-0.22 s: the attacker closes about 70 % of the distance and the defender about 30 %. Attacker grips land
    (weight 1) at 0.10 s on the collar and 0.13 s on the elbow. Defender grips land at 0.17 s and 0.20 s. The collision
    jolt at about 0.12 s compresses the pair about 3·s px and they rebound.
  - `even` until 0.55 s: seeded tugs. The pair x shifts 2-5·s px, with alternating direction at irregular 0.15-0.30 s
    intervals. The poses go between the even key and a small lean either way.
  - `drive` after that: the attacker's pose and the defender's pose. The pair moves toward the defender's back in step
    pulses, one step about every 0.30 s, roughly 0.35 × walk speed while a step is moving. Each pulse moves one foot per
    wrestler; the other foot stays planted.
  - `stall`: during the drive, if the defender is within `_nearRopes` range of the ropes behind him, the travel stops.
    The poses hold and the push keeps going (a small strain oscillation).
  - `steal`: a 0.12 s hitch where both stop and the stealer drops 0.06 crouch. Then the roles swap and the new attacker's
    drive starts. The poses cross-fade over 0.20 s.
  - `break` (timeout): grip weights ramp to 0 over 0.10 s, then each man takes one step back over 0.25 s, then idle.
- **D7. Contacts use `holdGrips`** (`Wrestler.js` ~643), the same two-bone IK the clips use. It gets an optional `at`
  (world point) in place of a partner joint. The collar point is the partner's `neck` attachment, moved toward the
  partner's back (−partner.facing) and down: two `·s` constants that Sonnet tunes so the hand sits behind the neck.
  The elbow cup is the partner's `${side}Elbow`. Run it after both wrestlers draw, beside `moveRuntime.afterDraw`
  (`Arena.js` ~3470).
- **D8. Layering** uses `layerDepths` from `src/animation/clipLayers.js` with limb names, resolved per facing. Default
  order, back to front: defender far arm, attacker far arm, attacker body, defender body, attacker near arm, defender
  near arm. The film shows the alternative too (defender near arm behind attacker near arm), and Derek picks.
- **D9. Gap from the arm, not a constant.** Pick the hold gap so the attacker's collar elbow bends 0.5-1.4 rad while the
  heads come close. Report the head gap in px. Measure it on Lou vs George. Lou is the bar: if the rigs conflict, tune for
  Lou and report George.
- **D10. Exits are not fixed in Stage 1.** The follow-ups (headlock, suplex, whip, hip toss / arm drag, hammerlock,
  piledriver / slam) start from the new pose, and their first-frame jumps are measured and reported. Stage 3 fixes them.
- **D11. Stage 1 uses existing art** (Lou `thesz-procreate-v1`, George). At G1 Derek names the hands that fail, and that
  becomes the Codex art request in Stage 2.

## Rules

- Lou `thesz-procreate-v1` is the bar. Ignore the old rigs `thesz` and `thesz-front3q-r1`.
- Never say a pose "reads" or "looks" right. Report the measurements and the misses; Derek judges.
- Focused tests per task. The full suite, build and coverage run only at the G1 stop. Node 22 (`nvm use`).
- Commit each task locally. Don't push. Keep `STORY_*.md` and `research/story/` out of every commit: another session is
  editing them.
- Use px/frame at 60 fps. The planted-foot limit is 2.5 px/frame (the get-ups' step limit).

## Stage 1: the tie-up, the drive and the steal, then STOP (G1)

### T1.0 Reference page (no code)

Find the lockup / tie-up frames in `Sprite sheets/reference/` (git-ignored, pose reference only, never shipped). Look at
Bret in `wwf-royal-rumble-snes` first: the suplex (357-374) and hip toss (345-356) start from a tie-up, so look just
before them. Then look at any `slam-masters-snes` character. Put the crops on
`research/animation/grapples-2026-10/reference.html` the way the G2a page did its Bret refs
(`tools/debug/getups_g2a_page.mjs`), with frame numbers, next to today's [frame](research/animation/grapples-2026-10/lockup-now.png).
Under each crop, write one line on what it shows for points 1-10 above: hands, heads, stance, which arm is near. Done when
the page opens and lists frame numbers. Don't pose from these yet.

### T1.1 `src/animation/lockup.js` (pure data and math) + `tests/lockup.test.js`

- `LOCKUP` constants: every D6 time, the tug range, the step period, the drive fraction, the steal hitch, the break, the
  hold gap factor, and the two collar-offset factors.
- Pose keys, as data in this module (not in `POSES`, so flag-off is untouched): `even`, `attacker`, `defender`,
  `stealDip`. Legs, knees, lean and crouch only; the arms come from the IK. Starting values to tune by eye on Lou:
  - `attacker`: lean .45, crouch .32, lead leg .35 / knee .45, rear leg −.30 / knee .10.
  - `defender`: lean .02, crouch .14, lead leg .10 / knee .20, rear leg −.15 / knee .30 (weight on the heels).
  - `even`: lean .32, crouch .24 for both.
  Which channel is the lead leg in each facing comes from `lChannelSide`. Record what you find.
- `lockupPhase(state)`: from `{ t, sinceSteal, nearRopes, ... }`, returns `{ phase, pose weights, grip weights per role
  and arm, pair dx this frame, step foot }`. Deterministic from a seed (the tugs use a seeded RNG, seed set at lockup start).
- `lockupGrips(attacker, defender, w)`: the D4 list in `holdGrips` form, near/far resolved per facing, collar entries
  with `at`.
- Tests: the grab order (the attacker's collar and elbow land before the defender's); the D4 sides in both facings; that
  the travel only happens during steps, so feet are planted between pulses; zero travel in the stall; the steal hitch
  then reversed travel; the same seed gives the same tugs.

### T1.2 Contacts on the real rigs

- `grapplesCandidate()` (D1). Add an optional `at` to `holdGrips` list items. Without `at`, the behaviour is unchanged, and
  the existing clip-grip tests prove it.
- In Arena, after `w1.draw(); w2.draw(); moveRuntime.afterDraw()`: if the flag is on and `lockupState` is set, call
  `holdGrips` per role with `lockupGrips`, then the D8 layer order.
- Flag-off fixture: record a forced lockup (pose and x for 60 frames) at the current HEAD, before any change, and assert
  it is identical after.
- Measure on Lou vs George, both facings, held in the `even` pose: hand-to-target px per grip (target ≤ 3 px when
  reachable; report unreachable frames), collar elbow flex, and head gap px. Pick the D9 gap here.

### T1.3 The lockup runs it (Arena + AI, flag on)

- `_tickLockup` flag branch: the engage closure, the phases from `lockupPhase`, the step-pulse travel with `_clamp`, the
  rope stall, the steal (D6) instead of the bare role swap, the break instead of the snap to idle, the 1.4 s timeout, and
  the follow-up input buffered during the engage. Flag off: today's code, untouched.
- The legs step during the pulses: tween the stepping foot's leg channels from back to front over the pulse, so the
  other foot doesn't move. Measure planted-foot slide, which must stay ≤ 2.5 px/frame.
- `AIHandler._handleLockup`: with the flag on, the beat starts at engage end and runs 0.35-0.9 s. The steal odds are unchanged.
- Focused tests: lockup.test.js and the Arena / AI tests you touch. The flag-off fixture stays green.

### T1.4 G1 film + page, then STOP

- `tools/debug/grapples_film.mjs` (start from `research/animation/grapples-2026-10/lockup_shot.mjs`: it sleeps the loop,
  nulls the AIs, forces the lockup). Scripted cases, each in both facings, with Lou as attacker vs George and George as
  attacker vs Lou:
  (a) **even**: no input to the timeout and break; (b) **driving**: from mid-ring; (c) **steal**: at 0.7 s, mid-drive;
  (d) **ropes**: starting 60·s px from the ropes behind the defender; (e) **each exit** the kit has, pressed at 0.8 s.
- Page: `research/animation/grapples-2026-10/g1/index.html`. Top: one **normal-speed loop strip** per case and facing,
  today | new side by side (CLAUDE.md: strip first). Below that, the D8 layering alternative for case (b). Then the
  table, per case and facing:
  - the grab order in ms (attacker collar, attacker elbow, defender collar, defender elbow);
  - hand-to-target px per grip (max over held frames), unreachable frames, collar elbow flex range, and head gap;
  - ring travel px; max planted-foot slide px/frame; max part step px/frame at engage, steal and break;
  - (e) the first-frame max part step into each exit (no target: this is the Stage 3 list);
  - +ms per frame, flag on vs off.
- Gates: full suite, `npm run build`, `npm run moves:coverage -- --check` (baseline 22).
- Handoff entry `AI_HANDOFF_ENTRIES/<date>-claude-grapples-g1.md`, the Progress line, and then **STOP for Derek (G1)**.
  Ask him: is 1.4 s the right length, which hands fail as art, and which layering order he wants.

## Later stages (outline, written in full after G1)

- **Stage 2: hands and the steal.** A Codex art request from Derek's G1 hand list. Likely: a hand gripping the back of a
  neck, partly hidden; a hand cupping an elbow; a forearm across the collarbone. Lou's `sellart` grip may cover some of
  these. Then the steal as a visible shove, with a re-grip if Derek wants D5 changed.
- **Stage 3: every exit starts from the tie-up.** Headlock, whip, suplex, hip toss / arm drag, hammerlock, and
  piledriver / slam each get a lead-in from the Stage 1 pose. The (e) jumps are the work list.
- **Stage 4: the lockup vocabulary**, so more moves can grow from it: rope break (clean break / cheap shot), shove-off,
  go-behind waistlock, wrist lock / arm wringer, side headlock takeover. Derek picks the order.
- **Stage 5: promote** `grapples` to default after Derek approves a live match.
