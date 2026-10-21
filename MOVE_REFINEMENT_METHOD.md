# Move refinement method

**Resume direction (2026-10-18):** Read the [current kinesiology and selling
audit](AI_HANDOFF_ENTRIES/2026-10-18-codex-kinesiology-selling-resume-audit.md)
after roster review. Judge the whole impact-to-recovery sequence, including
sustained pain, dazed/staggered recovery and targeted head/limb/torso donors.
The selling library below is implemented; it still needs this refinement pass.
Older status rows and proposed work below retain their original dates.

**Who this is for:** whoever refines a move next, Claude or Codex. Derek
approved the result on the suplex ("that suplex looks awesome") and on dropkick
v2. Follow this method for every remaining move.

**Background:**
- [MOVE_REFINEMENT_AUDIT.md](MOVE_REFINEMENT_AUDIT.md): Codex's original audit.
- [AI_HANDOFF_ENTRIES/2026-10-15-codex-impact-refinement-approach.md](AI_HANDOFF_ENTRIES/2026-10-15-codex-impact-refinement-approach.md): Codex's impact brief.
- [AI_HANDOFF_ENTRIES/2026-10-15-claude-impact-pass.md](AI_HANDOFF_ENTRIES/2026-10-15-claude-impact-pass.md): what the method produced.

**Worked examples to copy:**
- `tools/move-editor/author_suplex.mjs` with `suplex.constraints.mjs`: a paired
  throw.
- `tools/move-editor/author_dropkick_v2.mjs` with `dropkick_v2.constraints.mjs`:
  a solo strike whose travel is owned by the executor.
- `src/animation/clips/jab.js`: a handwritten solo strike.

## The method, in order

1. **Know the move's job.** Write one line on what the player should feel
   (Codex's table: "effort, a moment of suspense, a heavy crash"). Find:
   - the range the game fires it from, in `src/logic/moveDecision.js` and the
     `Arena.js` lockup branches;
   - whether its clip is paired (both bodies are staged by the clip) or solo
     (the executor tweens position, so the clip must have no transform);
   - what happens after it ends: `_layOnBack`, a sell, a stand-up.
2. **Film the current move in a real match first.** See [Commands](#commands).
   The editor preview is not the game. Solo moves, strike ranges and the
   aftermath only show up in a match.
3. **Block 6–12 beats by hand in a generator** (`author_<move>.mjs`):
   - use `pose()` and `buildDraft()` from `authoring.mjs`;
   - mark three readable silhouettes: loaded, committed, consequence;
   - give the attacker one leg stance through anything planted;
   - put every channel you animate on the first key.
4. **Stage the bodies, then the hands.** Write `<move>.constraints.mjs` and run
   `tools/move-critic/stage.mjs`. It works at the authored keys only, so the
   draft stays sparse and editable.
   - `plant`: slides the root so a sole stays put. Use it for squats and for
     falling back over the feet.
   - `stage`: moves the partner so a joint lands on a target. Use
     `frame: 'body'` once the target is tilting.
   - `hands`: drag IK onto the partner. It is branch-continuous and keeps the
     best of five attempts. Named points work too: `fist:near`, `face`.

   If a grip can't reach, change the choreography or the tableau. Don't force
   the arm.
5. **Act it with `bend`.** This is the torso channel, about the hips. `lean`
   renders nothing, so convert each move's lean intent to bend when you touch
   the move. Don't blanket-convert.
6. **Time it by phase, not by key.** Each key's ease shapes the segment
   arriving at it.
   - A continuous lift or fall keeps its speed through the keys inside it
     (`linear`).
   - Stop only where you mean to: the load, a balanced hold, the landing.
   - Give anticipation more time than the committed fall.
   - Use a 2–3 frame compression on impact, then settle the limbs at
     staggered times.
7. **Grade the whole clip**, between keys too:
   - critic report on a 60 Hz trace;
   - a key-pose sheet and a full strip;
   - then a match filmed in slow motion, in **both role orders** and, for a
     strike, at **near and far range**;
   - include the second after the last key (the grounded handoff, then the
     get-up).
8. **Presentation last.**
   - Foley comes from the confirmed-hit handler only:
     `this.scene.crowd?.impact?.(kind, size)`. For throws, use
     `_playPairedThrow`'s `foley` option. Submissions stay silent.
   - Keep damage and eligibility untouched. Balance changes are Derek's call:
     put them behind a URL flag as a comparison (as `?dropkick=v2` does).
9. **Install, test and commit:**
   - `export_draft.mjs` (add `--solo` for executor-owned travel);
   - update any test that pins old pose values, saying why;
   - `npm test`;
   - commit on `story/marigold-opening` and cherry-pick to
     `thesz-v2-profile-normalization`.
   - Never push without Derek.

## Joint direction and safety follow-up (2026-10-18)

Read the [rendered joint audit and limiter strategy](AI_HANDOFF_ENTRIES/2026-10-18-codex-joint-direction-and-limit-audit.md)
before changing elbow/knee limits. Existing local limits do not cover grounded
sells or every composed/legacy path; explicit knees and crouches use opposing
bend signs. Measure final chains, constrain IK branches and preserve support.
Derek's hammerlock remains the untouched compatibility control.

## Rig facts that bite

Each of these cost a round of rework.

| Fact | Consequence |
|---|---|
| `lean` does not move the rendered body | Use `bend` (upper body about the hips) or `tilt` (whole body) |
| An explicit `lKnee`/`rKnee` bends the knee **without lowering the hips** | The boots leave the mat. To squat on planted feet, use `crouch` alone. Explicit knees are right only for a step or a lifted foot |
| `crouch` keeps the hips fixed in x, so bent knees push the feet forward | Plant via the root (the `plant` constraint) |
| Tilting a standing body swings the feet forward | Plant through a fall-back; don't plant mid-air keys, which swings the hips |
| A channel missing on the first key takes the *next* key's value at t=0 | Frame-0 pop. `pose()` defaults every channel, including `bend: 0` |
| The hand is painted into the forearm image; the "wrist" joint is the knuckles | Fist = just behind the wrist (`fist:near`) |
| The boot is painted into the shin image; there is no foot joint | Ankle IK can't plant a sole |
| The head image's origin is at the neck | Aim at `face` (the front of the painted head) |
| In 3/4 view the `nearShoulder` sits toward the back | "In front of the chest" is a large dx (~40 px) |
| An inverted head hangs below the neck | The neck sits above the target for the head to land on it |
| Painted soles hang below the contact line in 3/4 view (George ~20 px) | The critic calibrates the floor from frame 0 |
| Wrestlers draw as whole layers by `transform.y` | Swap who is in front between beats when a face or grip must read |
| When hip and knee interpolate in opposite directions, the shin freezes, then whips | Check the shin angle per frame for reversals after contact |
| An upside-down body facing its attacker falls forward when let go | Lay it down prone (`_layDown`), or it lands on the attacker |
| Prone, a positive arm angle points into the mat | The front faces down; trail limp arms slightly back |
| Face down, the 3/4 shoulder and hip sockets swap sides of the spine | A roll's turnover moves the near shoulder ~45 px; keep limbs along the body there |
| Strikes fire at in-fighting range (jab ≤ 85 units; bodies nearly touching) | Pose strikes for the real distance, not a textbook silhouette |
| Play-scenario distances are screen px; wrestlers render at s≈0.81 | 150 px ≈ 185 rig units |
| Contact poses are cast-specific: Procreate Lou's legs land ~15 px higher than shipped Lou's | Judge on Procreate Lou (Derek, 2026-10-16: he is the art bar; original Lou's and George's art will both be replaced). Original Lou gets only the automated gates; George stays the opponent, but put cast differences in per-rig data (rigProfile, clip grips/contacts), never hand-tuned around his art |
| `lift` scales with each rig's hip height; trunks differ (inverted hip-to-crown: Lou 152, Procreate 136, George 138 rig units) | Hold a head-down contact with a clip `floorContacts` crown window, not by tuning lift per cast |
| stage.mjs solves grips on shipped Lou only | Declare clip `grips` (arm channel + partner joint, same/other side); `MoveRuntime.afterDraw` re-solves them by IK on every cast |
| Ring bounds used to clamp each actor separately | `Wrestler.stagingFit` shifts the shared origin (eased over 0.45 s) so a rope-side tableau keeps its geometry |

## Acceptance (per move)

**Feel:**
- Load, contact and consequence read at gameplay scale with no handles.
- Torso acting is visible.
- Head, shoulders, hips and limbs move at purposeful offsets.

**Contacts:**
- Declared grips and strikes hold over their whole window: critic gap under
  ~8% of body height.
- Strikes connect on the impact frame (`closestApproach ≈ 0`).

**Physicality:**
- Supporting feet stay planted until an intentional step.
- No floor penetration and no frame pops.
- No shin or arm reversal after contact, apart from an intended rebound.

**Gameplay:**
- Damage, sell, sound and visual contact land on the same beat, once.
- An interrupted move is silent and leaves no stale tilt, bend, travel or
  lock.

**Aftermath:** the clip's last pose matches what follows it (the grounded
lying pose, the idle), so there is no pop.

**Tests:** `npm test`, `move_participation_proof.mjs` (maxGap 0), and every
`play.mjs` scenario pass.

## Commands

Run everything under Node 22, with the dev server on 127.0.0.1:5173:

```sh
N=$(ls -d ~/.nvm/versions/node/v22.*/bin | tail -1); export PATH=$N:$PATH
npx vite --port 5173 --strictPort --host 127.0.0.1   # dev server (background)

# author → stage → install
node tools/move-editor/author_<move>.mjs /tmp/m.unstaged.json
node tools/move-critic/stage.mjs /tmp/m.unstaged.json tools/move-editor/<move>.constraints.mjs /tmp/m.json
node tools/move-editor/export_draft.mjs [--solo] /tmp/m.json <draft>.json <clip>.js

# look and measure (library id or a draft path; --cast thesz-procreate-v1,george)
node tools/move-critic/sample.mjs <id|draft.json> /tmp/t.json --times 0,0.2,... --zoom 0.62 --strip /tmp/s
python3 tools/move-critic/poses_sheet.py /tmp/s /tmp/poses.png 0,0.2,... --cols 6
node tools/move-critic/sample.mjs <id> /tmp/t.json --strip /tmp/f && python3 tools/move-critic/contact_sheet.py /tmp/f /tmp/strip.png --every 2
node tools/move-critic/report.mjs /tmp/t.json        # uses specs.mjs per move

# real match, slow motion, filmed (WFM_P1/WFM_P2 cast, WFM_QS extra params)
WFM_URL=http://127.0.0.1:5173 WFM_SHOTS=/tmp/film WFM_SHOTS_N=40 WFM_TS=0.2 node tools/debug/play.mjs <scenario>

# gates
npm test && npm run build
WFM_URL=http://127.0.0.1:5173 node tools/debug/move_participation_proof.mjs /tmp/j.json
node tools/debug/foley_render.mjs research/animation/impact-foley-<date>   # audition sounds
```

To watch a match in a browser:
`http://127.0.0.1:5173/?p1=thesz-procreate-v1&p2=george&arena=1&notitle=1`.

## Status (2026-10-15)

| Move | State |
|---|---|
| suplex | **Done**: v3, approved by Derek |
| jab | **Done**: v2, short punch to the jaw |
| dropkick | **v2 approved in look**, behind `?dropkick=v2`; promotion to live is Derek's decision |
| hammerlock | **Derek's draft. Do not edit.** Only a separate acting candidate, and only if he asks |
| selling library | **Built**: roll, writhe, Flair kick, clutch by body part; George theatrical, Lou economical; tagged on every knockdown move. Awaiting Derek's look |
| bodySlam | **v2 refined**: grips through an overhead press (the powerbomb look kept), one-way turnover, follow-through. Awaiting Derek's look |
| piledriver | **v2 refined** (+ 2026-10-15: crown held on the mat on every cast, waist grip held by runtime IK): grip from the lift to the drop, a suspense beat, the sit-out; Lou crumples forward face down (`_layDown(…, 'prone')`) while George rocks back out from under him. Awaiting Derek's look |
| hipToss | **v2 refined**: grip round the waist and on the arm, hips load and pop, George goes over the hip and lands flat *behind* Lou (v1 looped him back round to the front). Awaiting Derek's look |
| figureFour, armBar, ankleLock | Mat holds: purchase, brace, squeeze beats, resistance. Silent foley; the squeeze reads through the bodies |
| elbowDrop, kneeDrop, divingElbow/topDive, theszPress | Flights: the executor owns travel (solo clips). Add the grounded handoff for prone landings (`_layOnBack` covers supine only) |
| headbutt, kneeLift, clothesline, doubleAxeHandle, armDrag, backBodyDrop, sleeperHold, headlock, irishWhip, pin, taunts | Still pose sequences in `Wrestler.js`. Migrate each to a clip when it's refined |

## Shared selling library (Derek, 2026-10-15; built 2026-10-15)

**Built** in `src/animation/sells.js`. How to use it:

- **Tag a move:** a `sell: { part, intensity }` in `src/moves/registry.js`
  (parts: head, back, chest, knee, arm). Land its damage through
  `other._hurt(amount, moveId)` in the confirmed-hit handler; `_drain` alone
  sells nothing. An interrupted move never reaches that handler, so it never
  sells.
- **Playback:** `Wrestler._tickSell` plans the sells when he is down
  (`planSells`, sized to the down timer minus a 0.35 s lead and a 0.3 s
  tail), `_sellPose` samples them, `Skeleton.updateGroundedReach` draws them
  and solves clutching hands onto the hurt part with two-bone IK per cast.
- **Styles:** `sellStyle` per character preset. George is `theatrical`
  (writhe, Flair kick, roll, clutch, sometimes chained); everyone else is
  `economical` (a short clutch, or nothing).
- **Look at them:** `WFM_P1=… WFM_P2=… WFM_QS=lighting=0 SELL_CLIP='{"x":220,"y":325,"width":740,"height":150}' node tools/debug/sell_strip.mjs <dir>`.
- **Rig lesson:** face down, the torso art's 3/4 shoulder and hip sockets sit
  on the other side of the spine, so a roll's turnover moves the near
  shoulder ~45 px; keep the arms along the body at the swap.

The original plan, for reference:


After an impact, receivers currently lie still. Build three or four reusable
**down-state sells** that every character can play:

| Sell | What it shows |
|---|---|
| **roll** | Rolls onto his side or stomach, away from the attacker |
| **writhe** | Back arching, knees drawing up, a slow sway |
| **clutch** | A hand holding the hurt part, chosen by the move: knee (figure-four, ankle lock), arm or shoulder (arm bar, hammerlock), back (slam, suplex), head (piledriver) |
| **kick-out sell** | Flair-style kicking on his back (Flair sheet frames 298–306 in `Sprite sheets/reference/`) |

Design notes:

- **Format:** grounded keypose sequences played during `state === 'down'`,
  like `Skeleton.FALLS` and `GETUP_POSES`. Each sell starts from the grounded
  lying pose (or from the clip's last frame, through the
  `groundedPoseFrom` handoff) and **ends in a pose the get-up can start from**.
  No new pops.
- **Data:** add a `sell` tag to each move (registry or executor) for the
  hurt body part and the intensity, so the right clutch plays.
- **Variety:** pick per hit with some randomness. Weight per character:
  George theatrical (more writhing and kicking), Lou economical (a short
  clutch, then still). Keep the sell inside the existing down timer; it never
  changes how long a wrestler stays down.
- **Grounded rig limits:** the grounded renderer has no bend or tilt and
  poses limbs by absolute angles (`_applyGrounded`). A clutch needs a hand
  near a knee or shoulder, so solve those keyposes with a measured target the
  way `stage.mjs` does. Check both Lous and George.
- **Done when:** filmed in a match after several different moves, the sells
  read and vary, end cleanly into the get-up, and never fire on an
  interrupted move.

## Optional: hammerlock acting candidate

Only as a **separate copy** of Derek's draft (his stays live and untouched),
compared behind a URL flag, like `?dropkick=v2`. What it would add:

- Lou cranks: brace, then two pulses lifting the wrist up the back, chest
  leaning in with `bend`.
- George resists: shoulder counter-turn, straightening against it, a
  purposeful free-hand reach, and relief between cranks. Not one repeated
  flail.
- The declared wrist grip holds through the hold (it drifts now).
- A planted step through the turn at 0.3 s (it whips around in ~0.15 s now).

**Known engine gaps:**
- The get-up wrist and posture pop (32 px on Lou, 44 px on George).
- Torso donor art (an arched or folded trunk) waits for Derek's George redraw.
- `semanticAnchors` don't rotate with bend or tilt.


## Next Claude assignment: entanglement and remaining move defects

Derek assigned this work on 2026-10-15. Read the latest Claude handoff, then
[Codex's detailed brief](AI_HANDOFF_ENTRIES/2026-10-15-codex-entanglement-and-deep-move-review.md).
It covers reproducible cast/contact and renderer-transition defects, rope-side
staging, and the figure-four proof for leg entanglement. Build the locked hold
first, with shared cross-actor limb ordering and declared trapped contacts;
then animate threading, pressure, and release. Prove that slice before expanding
to toe holds. Preserve the current selling work and Derek's hammerlock draft.


### Figure-four: concrete existing-art refinement order (2026-10-18)

Follow the [locked-tableau-first strategy](AI_HANDOFF_ENTRIES/2026-10-18-codex-figure-four-existing-art-strategy.md):
solve leg roles and support → trapped contacts and cross-actor layering →
purchase/threading → pressure/resistance → release and knee-selling aftermath.
Choose replacement art from the demonstrated remaining silhouette failures.
