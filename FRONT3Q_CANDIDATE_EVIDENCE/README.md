# Front-three-quarter replacement limbs — review evidence

**Status: REJECTED as the production candidate (Derek, 2026-09-15), kept as the
diagnostic control.** It proved the pipeline end to end and exposed the
requirements for the next generation; it will not be tuned or repainted further.
Production Lou's art, config and offsets are unchanged, and no canonical-v2
runtime prerequisite is activated.

The brief for the next generation is
`AI_HANDOFF_ENTRIES/2026-09-15-derek-front3q-verdict-and-next-generation-brief.md`.
Read that before generating more art; this file is the evidence behind it.

These images are committed rather than left under `tools/debug/shots/` (which is
gitignored, `.gitignore:5`) so the review has something durable to point at, the
way `ARENA_LIGHTING_EVIDENCE/` does. Everything is reproducible from the commands
below.

## Derek's verdict, 2026-09-15

**Accept the engineering work; reject this art as the production candidate.**

1. It only partially looks like Lou — the face carries identity, the body is
   noticeably too lean and too tall.
2. The profile head on a three-quarter body is acceptable for testing, not for
   final approval.
3. The next candidate should be broader and more compact, closer to Pass-A.
4. Start from a revised generation prompt rather than repainting this candidate.

## The images

| file | what it shows |
| --- | --- |
| `01-v3-neutral-assembly.png` | the candidate as generated. Note both arms: the near forearm swings across the body at rest. |
| `02-v4-neutral-assembly.png` | the same paint with the four arm segments rotated upright. This is the candidate being offered. |
| `03-v4-neutral-broadcast.png` | the same, under the grayscale + screen-space scanline treatment. |
| `04-arms-v3-vs-v4.png` | the four arm parts, before (top) and after (bottom). Same paint, rotated. |
| `05-v3-scale-265-209-154.png` | v3 against the Pass-A master at the three real presentation heights. |
| `06-v4-scale-265-209-154.png` | v4 against the same. Candidate left, master right. |
| `07-torso-and-pelvis-layers.png` | torso, pelvis underlay, pelvis overlay. The torso already carries complete black trunks, which is why no pelvis layer is wired. |
| `08`/`09-live-idle-*.png` | in the running game, both facings. **Candidate left, shipped Lou right.** |
| `10-live-axehandle-overhead.png` | the worst overhead pose in the kit. |
| `11-live-lockup.png` | close range, both arms forward. |
| `12-live-pinhold.png` | dropped low. |

## What was found, and what it means

**Fixed, and it was the big one.** The candidate's four arm segments were painted
at an angle — the near arm with 31.7 degrees of elbow flex already in it. The rig
rotates a limb by the pose angle alone, so that angle added to every pose and the
arm was wrong in every frame. `npm run art:straighten-limbs` rotates each segment
about its own declared joint until the bone is vertical. Compare `01` with `02`.

**Not fixed, because a rotation cannot fix paint.** 15 of 16 joint-facings still
fail the articulation sweep, with numbers essentially unchanged. The pale
un-outlined attachment caps at every joint, the notched near-upper-arm
silhouette and the far fist's heavier outline are all still exactly where they
were. **These need new artwork.**

**Correction (Derek, 2026-09-15):** an earlier version of this list also named
the 8.2% torso-to-pelvis hip-span disagreement. That was misleading. It is a
property of pelvis layers the shipped legacy rig does not use, so while the
production track stays on that rig it is **not** an art requirement and must not
be carried into the next generation prompt. The same goes for the unregistered
`pelvis_overlay`.

**Two findings that turned out not to be on this track.** The black trunks baked
onto both thighs belongs to the *six-part* `production-limb-redesign/v1` board
(73.8% dark at the thigh top), not to this candidate (3.9%, outline only). And
the pelvis findings are properties of layers shipped Lou does not have.

**The `08`–`12` images were re-shot 2026-09-22** after a width error was found
in the binding: `_placePart` scales a part by `1/(1-jointPivotFrac)` and the
derivation ignored it, so every limb rendered 3-22% wider than the shipped limb
it was matching. Heights were unaffected and remain within 0.4% of shipped Lou.
The error made the candidate **thicker** than intended, so the "too lean"
verdict was reached in spite of it; the corrected images show the art leaner
still.

**One thing in `08`–`12` is the wiring, not the art.** Every screen-space offset
on the candidate is zero, deliberately, because shipped Lou's were tuned against
different paintings. That includes `legOffsetX` and `nearLegTilt`, which are what
separate shipped Lou's near and far legs — so the candidate's legs stack and read
as one leg. Judge the art; the tuner pass comes after.

## Answered

The four questions this file originally posed were answered by Derek on
2026-09-15; his answers are at the top and the consequences are in the brief.
The proportion drift visible in `06` — the candidate reading leaner and taller
than the Pass-A master beside it — is the finding that decided it.

## A tenth requirement, added 2026-09-25

The `v5-generated-draft` eight-part plate — generated after this candidate was
rejected — cut to exactly 8 clean components and maps 8/8, and its **torso is
still a full bust**. The rig places `head.png` at the torso's own neck socket,
so it would draw Lou's head twice. It needs re-generation rather than a repaint.

Requirement 10 measures it as a **neck pinch** in the torso's row-width profile:
the v5 draft reads 10.2%, while this candidate's control torso, shipped Lou,
shipped George and `thesz-front3q-r1` all read exactly 0.0%. Full reasoning in
the next-generation brief.

**Correction to this file's "Reproducing" section, same date.** The plate in
that draft arrived from the generator already carrying alpha and was never
hard-keyed, so its cut parts violate the transparent-RGB contract and carry a
glow that inflates every measurement taken from their bounding boxes. Run
`npm run art:key-plate -- IN.png OUT.png` before the cutter on any plate that
did not come through `remove-chroma-key.mjs`. It is a byte-identical no-op on a
plate that did, so it is safe to run unconditionally.

## Reproducing

```sh
nvm use 22    # 22.23.1; production commands refuse to run off it

npm run art:map-candidate    -- --parts "Sprite sheets/AI Pilot/Lou/production-front3q-modular/v3/parts" \
                                --landmarks "Sprite sheets/AI Pilot/Lou/production-front3q-modular/v2/landmarks.json"
npm run art:straighten-limbs -- --parts "Sprite sheets/AI Pilot/Lou/production-front3q-modular/v3/parts" \
                                --landmarks "Sprite sheets/AI Pilot/Lou/production-front3q-modular/v2/landmarks.json" \
                                --out "Sprite sheets/AI Pilot/Lou/production-front3q-modular/v4-straightened/parts"
npm run art:measure-joints   -- --parts "<v4>/parts" --landmarks "<v4>/parts/landmarks.json"
npm run art:proofs           -- --parts "<v4>/parts" --landmarks "<v4>/parts/landmarks.json" --out <dir> \
                                --compare "Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png"

node tools/debug/front3q_candidate_comparison.mjs      # the live A/B
```

The source art is under the gitignored `Sprite sheets/` tree and exists only on
Derek's disk. The candidate's own eight parts **are** committed, under
`src/assets/wrestlers/thesz-front3q-r1/`.
