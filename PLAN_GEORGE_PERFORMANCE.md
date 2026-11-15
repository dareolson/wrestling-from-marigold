# George: strut and crowd performance

2026-11-15 · Codex · Requested by Derek after Opus's strut update. Implementation plan, not implemented choreography or visual approval.

## Starting point inspected

Commit `3fa3757` replaces the old sliding, positive-knee strut under `?light=v1`. In `src/Wrestler.js`, `_doTaunt` calls `_startStrut`, `_tickStrut` advances the real gait and finishes whole strides before settling. `STRUT` currently uses speed 70, nominal walk 1.6 seconds, settle .35, ease .25, arm swing .35, phase0 PI. `POSES.strutProud` supplies upper body only: arms .20/-.20, elbows .95/.95, lean -.12. Keep this planted locomotion as the foundation. Actual walking duration depends on stride completion and available ring room, so do not trigger a gesture at a fixed 1.6 seconds.

The updated source was inspected; a fresh visual playback has not been claimed by this plan. `tools/debug/strut_probe.mjs` already provides real-executor frames, travel, ankle jumps, knee flex and interruption/end-state evidence. Capture its current result as the comparison baseline before changes.

George's `FaceDriver` lives in `src/animation/faceTrial.js`, instantiated and ticked in Arena. It already provides three wear stages, automatic post-hit smug reactions, pain on damage, and occasional speech while standing over a downed opponent. A full performance needs to coordinate with that driver rather than run a second independent face timer. The current `_busy` checks reactions, not speech; fix arbitration as part of integration.

## The performance

George expects admiration. The main beat is a conspicuous pause to receive it, followed by offended disbelief and dismissal. He should look elegant and vain before he looks frantic. Keep small gestures readable in the full-ring view. Avoid frantic arm waving or constant mouth animation.

First implement **Admire me / how dare you**, a stationary sequence after the strut has finished and settled. Do not chain it after every taunt: the ordinary strut remains a short standalone option.

### A. Admire me / how dare you — 2.6 seconds after settled stance

| Time | Body action | Face | Purpose |
|---|---|---|---|
| 0–.30 | Settle weight evenly, straighten chest slightly, release elbows outward. Feet stay planted. | Resting smug expression for current wear stage. | Establish control. |
| .30–.70 | Open arms below shoulder height; near arm leads slightly, elbows softly bent. | Smirk into grin. | Invite admiration. |
| .70–1.35 | Hold the presentation with almost no motion. | Closed smirk; no speech loop. | Let the expectation of applause read. |
| 1.35–1.60 | Small backward chest recoil, elbows draw in; near hand approaches upper chest without crossing face. | Brief offended closed-mouth look; use talk frame 0 provisionally, flag need for a dedicated offended expression. | Register rejection. |
| 1.60–2.05 | Near forearm sweeps outward once, low and economical. Far arm settles. | One short talk burst, then sneer. | Dismiss the crowd. |
| 2.05–2.60 | Arms return smoothly to George's own idle, chest pride subsides. | Current worn resting head. | Hand control back cleanly. |

Initial upper-body tuning should start from `strutProud`, and reduce the existing `tauntArmsWide` amplitude rather than copy its overhead arm raise. Exact angles must come from a rig preview; the timing table is a choreography target, not a claim of calibrated joint values. Use no authored positive knee channels. With this first pass, root position and planted soles remain unchanged during the stationary sequence.

### B. Effortless superiority — .9–1.2 seconds, optional after a successful exchange

One small chest lift, near hand turns outward at waist height as if presenting the opponent, half-second self-satisfied pause, return to guard. Smug grin then rest. No traveling, hair touch or prolonged speech. This is the short alternative to the big crowd performance. Start only after move completion and a stable grounded stance; never interrupt a throw, grip, pin or recovery to boast. Leave current face-only post-hit reactions in place where a body gesture cannot safely start.

### C. My hair! — 1.5–1.9 seconds, later after contact art is ready

Lift near hand by a measured route to a visible forelock/temple; pause at contact, smooth backward once, inspect the hand briefly, look back at opponent with resentment, lower arm. Keep the arm in front of its shoulder and away from the face until the final contact. The hand must not tunnel through hair/head or stick out behind the skull. Hair state does not heal from this animation: he tries to restore it and fails.

For disheveled George the touch is a little quicker and the pause shorter. Battered George attempts the same gesture but aborts into irritation. Preserve limb lengths and contact geometry; change rhythm and expression rather than randomly shaking joints. Never automatically play immediately upon damage; pain owns that moment, and this gesture waits for an appropriate standing lull.

## What the rig can show now

- Both arms can pose from shoulder/elbow channels, and the current proud strut can be reused. Torso `bend`/`tilt` is supported.
- George's hand is baked into the forearm. Current variants are grip, collarTie, elbowCup and waistClasp. There is no calibrated open palm or independent wrist channel. A palms-up invitation or literal wrist flick needs new forearm/hand artwork. First pass uses an arm invitation and dismissive forearm sweep; never describe a fixed fist as an open palm.
- There is no authored independent head-yaw channel in the inspected upright pose path. Do not mirror only his face or rotate his flat torso toward camera to fake a turn. First pass performs to the camera-side audience from his normal three-quarter source view. A genuine camera-facing turn requires matching head/body view art and its own transition work.
- Do not simulate the chin lift by translating the head off its neck. Use a small proud torso posture with the registered head attached until a neck-pivot channel is deliberately added and checked.

Needed art for the fuller version: matched palm-up/open-hand forearm, dismissing hand, hair-smoothing forearm with a semantic hair-contact anchor; optionally an offended face across all three wear stages. Author these from current George, preserving rig canvas, anchors and joint overlap. No new art is required to preview the first arm-level version of A.

## Implementation order and ownership

1. Capture current strut in both facings with `strut_probe.mjs`. Keep `STRUT` values and gait math unchanged during this pass.
2. Author A as a stationary upper-body clip in `src/animation/clips/georgeCrowdTaunt.js`. Use clip events for presentation hold, rejection and dismissal, not a parallel stack of scene timers. Resolve arm roles through the rig's existing facing mapping. Retain George's idle lower body; validate through the normal clip builder.
3. Add an optional continuation at the actual end of `_tickStrut` settling. Do not alter the existing strut exit until a continuation is explicitly selected. The existing hurt/beg-off branch takes priority. Initial opt-in preview: `?light=v1&georgePerformance=1`, with a deterministic case selector in the preview. This flag is a proposed new switch, not an existing one.
4. Give `FaceDriver` an explicit performance request/clear interface that uses `headPerformance` state. Damage/pain wins; performance requests cannot replace active pain. Suppress autonomous downed-opponent speech during a body performance. Sync expression changes to clip phase; release ownership on completion/cancel and return to the current resting wear stage. Do not reset wear or resume canceled speech.
5. Add B as a separate short option only after A reads clearly. Reserve C until its contact route and hand art are validated. Do not implement procedural crowd-facing turns in this pass.
6. Add performance selection for George only. Start with explicit/manual preview invocation; tune AI frequency after visual approval. Avoid chaining the long routine after every strut or hit. It should be an event the player notices, not an idle loop.

## Interruptions and gameplay

Use the existing vulnerable taunting state and normal hit handling. No invulnerability, new damage modifier, stamina reward, forced crowd mechanic or unrequested strategic bonus. Cancel performance on hit, knockdown, state change, move start or scene reset. Restore face/part selection, facing lock and locomotion ownership without overwriting the incoming attack's pose. Do not finish queued callbacks after cancellation. Never start while a two-wrestler move owns either participant or while on ropes/turnbuckle.

Retain strut rope-room logic. If a continuation starts near ropes, stationary root must remain legal and arm paint clearance must be checked. Actual opponent proximity should prevent leisurely autonomous performances; manual taunting remains punishable under the existing controls. Do not silently change the established input behavior while adding presentation.

## Preview and acceptance

Provide three deterministic entry cases: standalone strut (unchanged), strut into A, and stationary A. Review George against Lou in both facings, center ring and near ropes, all three wear stages. Include a normal full-ring-speed loop and a scrubbed close view; the full-ring view determines whether gestures read.

Required checks:

- Strut step/sole/knee results match baseline until the chosen continuation starts. No root drift or ankle pop during stationary beats; stop and return use George's actual idle.
- No backwards knees, detached neck/shoulders, elbows through torso, wrist crossing head, face/hand texture jitter or scale changes. Check hand path, not just endpoints.
- The .65-second admiration hold is visible; rejection and dismissal are distinct; he looks imperious, not like a cheering babyface.
- Hurt/pain interrupt at presentation, hold and dismissal. Completion/cancellation leaves no stuck taunting state, facing lock, forced texture or scheduled speech. Wear remains monotonic and resets only on new match.
- Existing plain strut, low-stamina begging, non-George taunts and `?faces=0` still work. Performance can run without expression textures, using the normal head as fallback.
- Targeted clip-validity and lifecycle tests, then appropriate existing strut/face tests and build. On-body playback remains necessary; passing pose tests alone is not visual acceptance.

First deliverable: A in one opt-in live preview, with the original strut preserved as a comparison. Review that before commissioning more hand art or adding B/C to gameplay.

## Stage D: hair he visibly fixes (Opus, 2026-11-15)

Derek, after watching C: "he needs to check his hair more obviously, also when hair starts to get messy, he should be trying to fix it, he might need to use an alternate arm for that."

**Where to work:** the worktree `../wfm-george-hair`, branch `george/hair-fix`, never the shared folder (Codex is working there). Untracked `Sprite sheets` art is missing in a worktree; the 5 tests that need it fail there and are known. Commit locally per task, never push. Leave faces (`faceTrial.js`, `headPerformance.js`) and Stages 10-11 move code alone.

**Why C is hard to see now:** the far arm draws behind his head, so the hand is mostly hidden. The near arm draws in front of the head but cannot reach the hair on the base art (palm 19 px short, elbow on his head; `tools/debug/hair_touch_search.mjs`). The fix is a near-arm art pair from Codex ([brief](AI_HANDOFF_ENTRIES/2026-11-15-claude-george-hair-arm-brief.md)): `upperArm.hairReach` (foreshortened, elbow toward camera) + `forearm.hairFix`. The rig already takes upper-arm variants (`nearUpperArm`/`farUpperArm` → family `upperArm`, `src/rig/partVariants.js`).

- **T-D1 Bigger hair check on the current art.** In `georgeHairCheckClip`: hold the hand on the hair about 0.5 s (now 0.2), two strokes instead of one, chest and chin lifted toward the hand during the touch, a longer look at the fingers. Budget: up to 2.6 s at the clean stage. Check in a normal-speed full-ring loop, not just stills: the gesture has to show at game size.
- **T-D2 He fixes it when it gets messy.** When his wear stage goes up (`this.face.state.stage` 0→1, 1→2), queue a hair fix and play it at the next safe moment: standing, not in a move, not on the ropes, the other man down or at least 150 px away. Not tied to the taunt button. Stage 1: one fix, irritated. Stage 2: two hurried tries, the second breaks off with a snarl (the existing `abort` beat). Cooldown 8 s; the queued fix expires after 6 s if no safe moment comes. On taunt, the hair-check chance rises with wear: 0.35 / 0.5 / 0.6. A hit cancels it (existing `_playPerformance` path). Fixing never lowers wear. Tests: the queue, the safe-moment gate, expiry, cooldown, cancel on hit.
- **T-D3 Near arm, once Codex delivers.** Register `upperArm.hairReach` and `forearm.hairFix` in `george_roster_v1.js` (copy the files from `research/art/george-hair-arm-2026-11-15/`, anchor `hairContact` from its JSON). The hair smoothing moves to the l-channel arm (`lChannelSide`) with both variants on; solve the pose so `hairContact` sits on the hair in both facings (extend `hair_touch_search.mjs`). Keep the far-arm version when the art is missing (`textures.exists`). If the art isn't there when T-D1 and T-D2 are done, write `WAITING: art` in Progress and stop at the gate.
- **Gate GD:** one page: the hair check and the wear-triggered fix, both facings, all three wear stages, a normal-speed full-ring loop strip plus close stills. Numbers: root and ankle motion during the gesture, `hairContact` distance to the hair surface, any frame where the arm covers the eyes or mouth. STOP for Derek.

Progress:
- T-D1 27196d60: rest on the hair 0.45 s, two strokes, chest lifted, longer look; 2.6 s clean. T-D2 5163b434: `hairFixQueue.js` (6 s expiry, 8 s cooldown, safe gate 150 px / man down), one-stroke and two-try fix clips; started itself 50 ms after the stage change in the live game. A rise inside the 8 s cooldown cannot play (cooldown > expiry).
- T-D3 d63e8972: hairReach + hairFix registered (variant `binding: null` in partVariants.js keeps the foreshortened elbow); near arm lands hairContact 1.25 px from the forelock both facings; root drift 0, ankle step 0. Misses: the hand crosses the eye/mouth for 2-4 / 3-9 frames (60 fps) on the way in and down to the chin; far-arm version kept when the art is missing.
- GD page: [research/animation/george-performance-2026-11/gd/index.html](research/animation/george-performance-2026-11/gd/index.html) (videos and stills on disk only). STOP for Derek; no gameplay was changed beyond `?georgePerformance=1`.
- GD APPROVED by Derek 2026-11-15 ("the hair and chop look good"). The chop arm art (2afeba6c) approved with it.

## Stage E: a taunt set per wrestler, picked by direction (Opus, 2026-11-15)

Derek: "can we have multiple taunts, eventually i want to put this on a controller and I'll use the direction pad or analog stick for the different taunts, probably a minimum of two per wrestler". Same worktree and branch as Stage D; do E after T-D2 (both change `_doTaunt`), T-D3 can land whenever the art does.

Today the taunt is the finisher button with the other man out of reach (`tryFinisher` falls through to `_doTaunt`). George picks at random between strut, crowd taunt, hair check and superiority; Lou and Kowalski have one arms-wide pose sequence; Guido inherits George's strut flag (a known miss).

- **T-E1 Taunt table and input.** Each character gets `taunts: { neutral, up, down, forward, back }` → taunt ids (a registry of taunt executors, like the move kits; body-relative, reusable across wrestlers). Pressing the taunt reads the held direction at the press, relative to his facing, the way `tryPower` reads Up/Back/Forward. A direction with no entry falls back to `neutral`. Keep it one input layer so a controller's d-pad or stick maps onto the same five slots later: no keyboard-only logic in the taunt code. Context overrides stay: the begging heel at low stamina, George's superiority over a downed man. The AI picks at random from the wrestler's own slots. Existing near-range finisher inputs (Up/Down over a downed man) must still win: the taunt only plays where it plays now.
- **T-E2 At least two per wrestler.** DEFAULT TAKEN (Derek overrides at the gate):
  - George: neutral strut (half end in the crowd taunt; the random hair-check roll from T-D2 goes, the wear-triggered fix stays), up hair check, forward crowd taunt alone, down superiority when the man is down else strut.
  - Lou (babyface): neutral the existing arms wide, up hand to the ear for the crowd, forward point at the opponent and fist up.
  - Guido (babyface): neutral a fist pump to the crowd, up hand to the ear (shared with Lou); he loses George's strut.
  - Kowalski (monster heel): neutral the existing arms wide, up a two-fisted chest beat with a roar face, forward a throat-slash at the opponent.
  - New gestures are upper-body clips on the `georgeCrowdTaunt.js` pattern (lower body held from the stance, no knees authored, events drive `FaceDriver.perform` beats: babyfaces `talk`, Kowalski `talk` at the shouting row). Base fists are fine; list any hand art a gesture really needs as an art order instead of waiting on it.
- **T-E3 Tests and probes:** every character has ≥ 2 distinct taunts; every slot resolves; direction → taunt routing per facing; the AI never plays a slot the wrestler lacks; root and ankle motion during each gesture; no positive `lKnee`.
- **Gate GE:** one page: every wrestler's taunts, both facings, normal-speed loop strip plus stills, with the input that plays each. STOP for Derek.

Progress:
