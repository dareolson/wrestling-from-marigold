# 2026-09-15 — Claude: the front3q replacement limbs, and what was actually wrong with them

Derek's milestone was to take Lou's front-three-quarter replacement limbs to a
mechanically verified approval candidate on the shipped rig. The candidate is
built, wired and reviewable. It is **not approvable yet**, and the reason is
narrower and more fixable than the previous handoffs suggested.

Commits, all on `thesz-v2-profile-normalization`, none pushed:

| commit | what |
| --- | --- |
| `3493f98` | measure the joints that were never in frame |
| `4b06158` | encode Derek's three-quarter ruling; declare the borrowed head |
| `9aa0594` | draw proofs in the runtime's order; map parts to real slots |
| `4566c51` | straighten the arm segments painted at an angle |
| `9a437c0` | add the removable candidate for live comparison |
| `4516bfa` | the review evidence |

## The headline

**The candidate's arms were painted bent, and nothing had noticed.** Measured
from the declared landmarks and independently from the distal ink, which agree:
the near upper arm is baked at -13.4 degrees and the near forearm at +18.3, so
the near arm carries **31.7 degrees of elbow flex in the painting itself**. The
far arm carries 8.9.

Skeleton places a limb with its pivot on the joint and rotates it by the POSE
angle alone. A baked angle therefore adds to every pose, in every frame the game
draws. Wired into the running game the near forearm swung across the body at
rest. `NEW_ASSETS_SPEC.md` requires a "neutral/straight limb pose" bake for
exactly this reason, and nothing measured it.

`npm run art:straighten-limbs` corrects it deterministically — each segment
rotated about its own declared joint until the bone is vertical, landmarks
carried through the same rotation, legs left alone because they measure within a
few degrees of neutral. The result is
`production-front3q-modular/v4-straightened`. Compare
`FRONT3Q_CANDIDATE_EVIDENCE/01` with `02`.

**A rotation cannot fix paint, and the paint findings are all still there.** 15
of 16 joint-facings still fail, with numbers essentially unchanged from v3.

## Three instruments were lying, in the same way

Each reported a number that looked like a measurement and was not.

**1. Both knees had never been measured.** `art:measure-joints` reported "pass
nearKnee / pass farKnee" in both facings, and that was written into
`AI_HANDOFF.md` as "Knees pass in both facings". The canvas was a fixed 512px
square with the parent pivot hardcoded at its centre; the real thigh is 408px
tall with its hip pivot 41px down, so the knee landed at y=598 — 86px below the
bottom edge. Nothing was drawn there, and all three metrics took their perfect
default: `interior_bg` 0, `sharpest_deg` 180, `straight_run_px` 0. Those are also
the values a flawless joint produces.

This is the third defect of that family in this harness, after the crop that
measured its own rectangle and the ranking that reported the cleanest frame of a
failing sweep. The canvas is now fitted; scoring nothing is reported as
UNMEASURED and can never pass.

**There is a converse, and getting it wrong would have been a new defect.**
Scoring no contour means one of two opposite things and the metrics look
identical in both: `empty` (no paint in the joint region — the knee bug) or
`buried` (every pixel painted, the joint fully covered, the best outcome the art
can produce). The far hip is genuinely buried from 90 to 110 degrees. The two are
now separated by the disc's own coverage.

**2. The proof renderer's draw order inverted the runtime in four places** —
both elbows, the pelvis underlay, the pelvis overlay, and head/torso. The elbow
ones did the visible damage: it drew each forearm OVER its upper arm, so every
proof image showed the forearm's pale un-outlined attachment cap lying on top of
the arm, material the game keeps buried. The runtime does the opposite and says
why (Skeleton.js: if the forearm wins that tie its overlap band "sweeps across
the upper-arm end as the elbow bends"). An existing test asserted the
pelvis_overlay inversion, having taken it from `NEW_ASSETS_SPEC.md`; the shipped
runtime and Derek's instruction quoted beside it ("his near leg needs to stack on
top of his trunks") win over the document. The order is now checked against
Skeleton.js's own setDepth values.

**3. "Targeting the shipped legacy rig" was true of neither candidate.**

Shipped Lou loads six FILES — head, torso, upper_arm, forearm, thigh, shin — in
which the four limb families are each ONE painting placed twice with different
offsets, tilts and scales. "Six parts" and "six files" are not the same
statement, and the coincidence has been read as agreement for two sessions.

`npm run art:map-candidate` now answers it from the runtime rather than from a
document, reading the loader's filename table and Skeleton.js's own
`textures.farX ?? textures.X` opt-ins:

- **`production-front3q-modular/v3` — 8 of 12 map.** `near/far_upper_arm` are
  SHARED-ONLY (Skeleton assigns both arms from `textures.upperArm`; there is no
  opt-in for this family). `near/far_thigh` are NO-FILENAME (the renderer
  supports split thighs; `BASE_PART_FILES` has no name for them). Two different
  failures — fixing the wrong layer would waste a session.
- **`production-limb-redesign/v1` — 2 of 6 map.** `far-arm` and `far-leg` are
  single pieces spanning the elbow and the knee, which the rig articulates
  independently on the far side. **No offset bends one painting in the middle.**
  That board cannot drive the shipped rig's far elbow or far knee at all.

**8 of 12 is not a blocker.** Serving the shared `upperArm` and `thigh` slots
from the near paintings is exactly what shipped Lou does today. Parity, no
runtime change; the only thing given up is far-side perspective the shipped rig
has never been able to use for those families.

## Findings that turned out not to be on this track

- **The baked trunks belong to the other candidate.** `near-thigh` on the
  six-part board is 73.8% dark in its top rows and `far-leg` 51.8% — that is the
  black band. On front3q v3 both thighs are 3.4-3.9%, outline only. The v1
  generation prompt asked for "no trunk band on the thighs" and it worked.
- **The pelvis findings are properties of layers Lou does not have.** The 8.2%
  torso-to-pelvis hip-span disagreement (and the 4.5-degree hip-line tilt
  disagreement behind it — the torso's hip line is tilted, the underlay's is
  flat) and the `pelvis_overlay` with no registration landmarks are both real.
  Shipped Lou declares no pelvis layers at all; his torso carries its trunks, and
  so does this candidate's. Wiring the overlay would draw the same trunks twice.
  These block a George-style pelvis split, not this track.
- **Green fringe is 0 on every part.** The despill worked.

## What is wired, and what is deliberately not

`thesz-front3q-r1` is a third character — own id, own asset folder, own preset.
Shipped `thesz` is untouched and the default card is unchanged. It appears only
for `?p1=thesz-front3q-r1` / `WFM_P1=...`, or through
`node tools/debug/front3q_candidate_comparison.mjs`, which poses both figures
identically through eight poses in both facings. Deleting the module, its two
lines in `Arena.js` and its asset folder removes it.

Its eight parts are committed under `src/assets/wrestlers/thesz-front3q-r1/`, so
unlike everything under the gitignored `Sprite sheets/` tree this candidate
survives in the repository.

Every geometry number is derived, none hand-tuned: each `box.h` solved so the
bone span underneath equals shipped Lou's, each `box.w` so the on-screen ink
width does, so the comparison is about the art rather than about size.

**Hip sockets are omitted on purpose.** `Skeleton.js:549` switches a character to
the authored dynamic-pelvis leg path the moment its torso declares `nearHip` and
`farHip`. Declaring the candidate's measured ones would have made this a
comparison of two rig paths wearing different art.

**Every screen-space offset is zero, and one visible result of that is the
wiring rather than the art.** Shipped Lou's arm, leg, forearm and shin nudges and
tilts were tuned by Derek against the shipped paintings. Zero shows what the
measured landmarks alone produce. But `legOffsetX` and `nearLegTilt` are what
separate shipped Lou's near and far legs, so the candidate's legs stack and read
as one leg at gameplay scale. Do not read that as an art defect.

## The view contract now matches Derek's ruling

`views.profile.role` was `primary-gameplay-source` and `front3q.role` was
`front-turn-source` — the exact inverse of the 2026-09-13 ruling. Now
`front3q: primary-gameplay-source`, `profile: move-mechanics-source`, pinned by
tests so it cannot flip back.

`role` moved; **no `runtimeStatus` did**. Both views stay pending on what they
were pending on, and all seven `runtimePrerequisites` remain `pending`. Promoting
front3q is an art-direction decision and must not read as runtime progress.

The profile head on the three-quarter body is now declared in
`crossViewPartReuse` — part, target view, source view, transform, temporary, and
a validated reason — because the standard forbids filling a missing view by
silent fallback, and front3q as the primary view has no head art of its own.
There was no mechanism for cross-view reuse before; `bilateralSegmentReuse` only
covers left/right within one view.

## Verification

- `npm test` — **504/504 on Node 22.23.1, 0 skipped.** The real-art tests RAN,
  because `Sprite sheets/` is present on this machine. In a fresh checkout they
  fail for missing inputs; see the standing section in `AI_HANDOFF.md`.
- `npm run build` — clean.
- `npm run rig:validate` — clean for george, thesz and thesz-front3q-r1.
- `npm run art:measure-joints` on v4 — **15 of 16 joint-facings FAIL**, 0
  skipped, 0 with unmeasured frames. The one pass (`farKnee` facing +1) sits at
  `straight_run_px` 17 against a limit of 18; the metric is sensitive to
  rasterisation phase near threshold, so that is not a number to lean on.
- `npm run art:proofs` on v4 — 11/12 parts positioned, `pelvis_overlay` named as
  unregistered rather than guessed into place, no proof image clipping.
- `npm run rig:certify` — **NOT run.** It needs Chrome through `playwright-core`
  and was not exercised this session; the live comparison used the debug harness
  instead, which did work.

## Next

1. **Derek's visual call** on `FRONT3Q_CANDIDATE_EVIDENCE/`. The four open
   questions are in its README. Nothing else should proceed until that lands,
   because the remaining mechanical work is a paint pass and the paint is what
   he is judging.
2. **If the art is worth keeping**, the next generation needs: attachment caps
   painted as finished limb rather than pale un-outlined material (they are
   visible at the shoulders, elbows, hips and knees), the notched near-upper-arm
   silhouette resolved, and enough overlap to survive the articulation sweep.
   All of that is new artwork; no transform reaches it.
3. **Then** a rig-tuner pass on the candidate's offsets, which is where the leg
   separation comes back.
4. **Do not** repoint `validate_joints.py` at anything. Still broken, still
   untracked.
