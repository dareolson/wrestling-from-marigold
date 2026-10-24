# Latest performance review and asset contract for Claude

2026-10-23 · Codex · reviewed HEAD `803478f` · requested by Derek

Derek asks us to audit Claude's latest work and communicate exact image-generation
requirements so the wrestling looks real and painful. This is a review and a
concrete shared work brief, not visual approval or a request to resume the parked
figure four. No runtime files or existing art were changed in this review.
There is no live Claude messaging endpoint in this session; this entry is the
repository handoff, not a claim that Claude has received or agreed to it.

## Verdict

Useful foundation, incomplete performance. Anatomical pain identity, grounded
slot mapping, compact fallback and pose ownership are good reusable work. The
new elbow limiter does not actually guarantee its stated maximum. The rise still
drops the protective performance before restoring a small standing overlay.
Do not promote `aftermath=v2` on tests alone.

### 1. High: the clutch IK can exceed its new elbow cap

`src/Skeleton.js:updateGroundedReach` clamps shoulder–target distance into `d`
and uses it to calculate the elbow, but calculates the final hand toward the
original `goal`. Those are different triangles when the target is inside the
minimum reach. The final forearm direction can therefore violate the cap.

Independent numerical reproduction of the current formula: upper arm = 50,
forearm = 50, shoulder–goal = 5, maximum flex = 2.75 radians. The solver uses
distance 19.45477 but the returned limb has flex **3.04189**, exceeding the cap.
This proves a solver defect independently of the diagnostic's anatomical-sign
heuristic; it does not claim those exact lengths occur on this cast.

Claude: project the goal onto the feasible reach annulus, then use that SAME
projected point for both elbow construction and hand placement. Verify measured
bone lengths and resulting fold angle for too-close, reachable and too-far
targets, both facings and both lyings. Keep branch continuity through the reach
envelope. Reach accuracy must yield to anatomy when the target is unreachable.
Do not compensate by shortening/repainting arms or increasing the cap.

Fresh existing-tool run on George roster / Procreate Lou: **62 aggregate cases,
29 flagged**, including head clutches with elbow readings above 2.75. Output:
[`limb-limits.txt`](../research/animation/codex-2026-10-23-audit/limb-limits.txt).
These 29 flags are a screening result, NOT 29 proven anatomical failures:
the tool explicitly acknowledges unreliable knee signs at deep folds, uses a
different elbow minimum from the global hammerlock-compatible range, and exits
zero even when cases are flagged. Fix/calibrate the measurement before making
it a pass/fail anatomical gate. Preserve Derek's hammerlock exception.

### 2. High: pain continuity is absent during the rise

`_startGetUp` / `_startQuickRise` clear `_sell`; `_painRising` preserves context,
but `_recoveryWeight` explicitly excludes the rise. The generic get-up completes,
then the recovery overlay ramps from zero over 200 ms. Context survives in data,
but the body does not continuously protect the hurt part.

The G3 suplex comparison sheet shows long flat intervals and only subtle standing
differences. This is a judgment from the existing phase sheets, not a fresh
normal-speed endorsement. Those sheets predate HEAD's joint fix. Next candidate:
carry a back-protection motif through side turn, hand plant, push-up and first
stance; let the hand/support lead the pelvis rather than rising as one board.
For knee pain, place load on the sound leg and keep the hurt knee unloaded.
Keep current damage, down timer and input availability. Preserve the economical
Lou / theatrical George distinction; pain does not require continuous flailing.

### 3. Medium: current evidence cannot settle the visual gate

G3's off/on captures are wall-clock samples, not aligned simulation instants.
The viewer advances the same frame number on each side; that does not make the
states synchronous. Refilm HEAD after the IK repair with a fixed seed and
event-relative game timestamps: contact, mat settle, clutch peak, rise start,
first standing frame, recovery +0.2/+1/+2 seconds. Show normal-speed muted
footage plus readable close-ups. Include rig IDs and commit in each manifest.

### 4. Parked figure four remains unproved

The v3 ledger reports trap errors of 6.9% on left-facing Procreate and
26.9%/27.7% for the roster pair against 5% tolerance. No new leg painting fixes
those positional errors. Keep it parked per Derek. When resumed, solve contacts
and over/under order on the actual cast before diagnosing donor needs.

## Claude ↔ Codex asset request protocol

Claude supplies one request per demonstrated art failure. Codex reviews the
geometry/contact contract; generation produces a donor; Derek's existing art
workflow controls cleanup and likeness. Record disagreement and revised specs
in this entry or a linked reply. Do not describe an unanswered handoff as agreement.

Each request must include:

- Exact character/rig, anatomical side, render slot, view and variant name.
- Move ID, phase and time; current screenshot at game scale plus enlarged crop.
- Existing source PNG and hash; same canvas dimensions, anchor coordinates and
  bone-axis orientation; preserve the original file.
- Painted contact point/patch and target surface, with required overlap order.
- A short explanation of why posing, staging, IK or layer order cannot fix it.
- Donor output path, variant-selection integration point and reset behavior.
- Same-scale A/B on the actual rig in both facings, including transitional frames.

Do not invent wrist coordinates for a baked fist. Annotate the wrist crease,
palm contact patch and finger contact patch on the source before generation.
Anchors are measured/normalized deterministically after generation; text prompts
alone do not guarantee pixel-perfect registration.

## First asset packets (candidate specifications, not generated assets)

| Packet | Source / normalized output size | Exact requirement | Runtime proof |
| --- | --- | --- | --- |
| Lou contact forearms | `src/assets/wrestlers/thesz-procreate-v1/forearm.png`, **117×351 RGBA**; existing `forearm_grip.png` is same size | First audition the existing grip donor. If inadequate, make `open_support` and `clutch_cup` variants of the forearm with hand baked in. Preserve elbow registration `(u=.487612,v=.116194)`, box `23.003×69.008`, arm axis, thickness, ink and wrist location. Open support has a palm that can visibly bear weight; clutch cup has fingers wrapping the knee silhouette. Do not draw a new whole arm. | Supine knee clutch, prone support and get-up, both facings; palm/knee contact must read at game scale. The grounded sell path needs explicit selection/reset wiring; merely adding a PNG or clip-only variant is insufficient. |
| George contact forearms | `src/assets/wrestlers/george-roster-v1/forearm.png`, **426×439 RGBA** | Same two functions with George's own paint and proportions. Lock proximal `(u=.5010400886,v=.1558773771)` and distal `(u=.5010400886,v=.5297511669)`; box `57.53539798×59.29117303`. Match George, not Lou. Near/far palm perspective must be auditioned rather than assumed mirrored. | George's clutch and support in both facings. Do not scale Lou's donor to George's canvas. |
| Lou hurt head | `src/assets/wrestlers/thesz-procreate-v1/head.png`, **197×241 RGBA** | Preserve existing view, neck paint/anchor, cranial silhouette and likeness. Tense brow, narrowed eyes and a restrained open jaw; keep facial detail readable at game scale. Add `hurt`, then `down` only if the first pilot needs a distinct exhausted face. | Suplex mat reaction → effort during rise → settling expression; no floating neck or abrupt scale change. |
| George hurt head | `src/assets/wrestlers/george-roster-v1/head.png`, **279×319 RGBA** | Same geometry lock, George's likeness/hair; more theatrical grimace without changing head size. Neck anchor `(u=.4266889774,v=.8690171880)`. Inspect existing expression donors before commissioning another. | Same timing proof, George receiving the suplex. |

Prompt core for contact donors (attach that character's source and phase crop):

> Edit only the supplied forearm's hand into [open weight-bearing palm / cupped
> knee-clutch hand]. Preserve this wrestler's anatomy, proportions, wrist position,
> forearm silhouette, existing view, monochrome drawn ink style and shading.
> Keep the elbow overlap region and attachment geometry unchanged. Show believable
> thumb/finger construction and a clear [palm support / wrapping finger] contact
> surface. One isolated part, transparent background, no labels or scenery.

Normalize to the specified source canvas after generation; retain donor provenance.
Do not stretch the result to force a contact that the bone chain cannot reach.

**Arms/legs/torso escalation:** no blanket replacement is justified yet. An arm
request must demonstrate remaining silhouette/foreshortening failure after IK
repair. A thigh/shin request must identify the exact hip/knee/ankle anchor family,
view and failing crossing after contact/layer correction. A torso donor must be
motivated by an inadequate compressed/arched silhouette after a pose test. Supply
the measured canvas/anchors then, rather than inventing dimensions now. Never
generate a whole-sheet body replacement to solve one interaction.

## Next execution order and acceptance

1. Repair and verify the feasible-target IK; calibrate joint diagnostics.
2. Complete one suplex receiver's continuous settle → clutch → supported rise →
   guarded stance using existing art, behind a candidate flag.
3. Audition existing grip/face donors; request only missing contact or expression
   assets using the packets above. Wire semantic selection and teardown.
4. Film both receiver roles/facings and roster rigs at game scale, normal speed,
   with event-aligned comparisons. No extra input locks or damage changes.
5. Derek judges whether weight, contact and consequence read before promotion.

Verification on reviewed HEAD: Node **22.23.1**, **778/778 tests pass**, production
build passes. Fresh local Chrome limb screening completed; fresh clutch stills
are under `research/animation/codex-2026-10-23-audit/clutch/`. Existing G3 sheets
and the figure-four ledger were inspected. Full catalog footage/audio was not
re-auditioned; this review covers the latest aftermath/limits work.
