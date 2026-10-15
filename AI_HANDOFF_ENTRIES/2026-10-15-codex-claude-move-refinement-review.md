# Codex audit of Claude's integrated fixes and refinement prototype

2026-10-15. Requested by Derek. Review only; no runtime, move, art or tool source
was changed. Claude's files remained available for his work. Testing used an
isolated snapshot at `/tmp/marigold-claude-audit` on port 5219.

## Verdict

The integrated repair improves reliability. The four moves still need artistic
refinement. Keep the engine fixes; do not promote the current automated cleanup
outputs wholesale. Testing the cleanup on copies produced some local wins but
regressed complete moves.

At the reviewed snapshot:

- The shared Skeleton, Wrestler, MoveRuntime, and three character configs match
  the tested joint-repair implementation byte for byte. It is now integrated,
  despite the previous main-handoff status saying it was still isolated.
- All 658 unit tests pass when rerun on this snapshot.
- The joint/participation proof passes: zero measured elbow/knee gaps or
  uncovered central pixels, including both Lou presets and George. This proves
  the sampled attachment cases, not contact between wrestlers or good acting.
- The four pilot clip/draft files have no further changes relative to `4974be8`.
  The new work in `tools/move-critic/` is tooling and proposed cleanup plans.
  It has not become a new shipped four-move choreography pass.
- Claude's committed jab retiming is a real improvement: cock at .040s,
  extension/contact at .083s, recoil at .166s. Elbow-drop damage now lands at
  landing and is not applied when the flight is cancelled. Keep both changes.

## Which moves look better?

| Move | Improvement in the current game | Still missing |
|---|---|---|
| Jab | Extension now matches the existing damage beat; unrelated gait/joint history no longer contaminates the clip | In the inspected Lou→George tableau it is an open-hand chest touch while gameplay uses a head sell. Need a real fist/face contact point, body lead and recoil |
| Hammerlock | Connected elbows/knees, exclusive paired ownership, cleaner entry/recovery | The declared wrist grip still separates; the defender's free arm and torso do not establish convincing resistance. The turn needs a readable planted step |
| Suplex | Attached body parts and authored legs survive prior walking state | The hook/support is unclear, bodies overlap, feet drift during the lift, and torso shapes still read as stiff slabs rotating. This is the strongest candidate for an artist-led pose rebuild |
| Dropkick | Readable extension survives; cancelled travel stops; existing successful-hit chest sell/fall remains | In the inspected editor tableau the boots are high into the upper chest/face. Need contact on an actual boot surface and chest surface, then purposeful recoil and landing |
| Elbow drop (outside the four pilots) | Damage timing/cancellation behavior is corrected | No new artistic landing/compression pass is demonstrated by this change |

The jab/dropkick editor defenders are staging dummies. Their static poses do
not prove the game lacks a sell: Wrestler already triggers sellHead/sellChest.
The editor does not reproduce executor-owned solo travel, live hit eligibility,
or a whole match. These are sampled visual findings, not full-speed approval of
every gameplay range or role order.

## Experiment: run Claude's existing cleanup plans on copies

I ran `refine.mjs` at its default 30Hz bake rate on jab, Derek's hammerlock,
suplex and dropkick; then resampled every output at 60Hz using `sample.mjs` and
graded with `report.mjs`. Cast: original Lou attacker, George defender. No
experimental draft was exported into the game. These are audit-generated
outputs of the reviewed tool, not a claim that Claude had shipped them.

Measurements are editor pixels or fractions of the first-frame body height.
The critic's head/torso centroid distances and fast-frame "pop" detector are
diagnostic proxies, not authoritative strike contact or proof of broken joints.

| Experiment | Measured change | Judgment |
|---|---|---|
| Jab | Wrist-to-head proxy gap 19.3%→11.2% of body height; aggregate foot-slide proxy 9.3%→7.6% | Partial numeric improvement. The inspected result still targets the chest/neck and looks like a bent-arm touch |
| Hammerlock | Worst declared wrist grip gap 14.4%→17.5%; defender floor penetration 0.3%→13.1% | Regressed. The final image sinks the defender into an unintended deep seated/kneeling shape |
| Suplex | Attacker slide proxy 31.8%→22.1%; worst far-hand/waist gap 38.1%→87.1%; discontinuity flags 0→19 | Regressed overall despite a better slide score. The hold must remain believable between keys, not only on the individually solved poses |
| Dropkick | Travel is pulled back 21.1 rig units; ankle-to-torso-centroid distances increase | Surface clearance may improve, but this metric cannot approve the strike. The boots still read high in the inspected pose, and the output needs explicit runtime transport integration |

The hammerlock operation log reports a local wrist improvement to about .5px,
yet the final trace is worse. This is the clearest demonstration that checking
each operation's selected endpoint at its edited keys is not sufficient.
Later leg edits change body/shoulder placement, and interpolation can introduce
problems absent at the solved keys.

## Findings in the refinement tooling

1. **The solving target and scoring target differ.** `refine.mjs:92` returns
   an Image's `x/y` as its centre. `metrics.mjs:208` uses the average of painted
   outline points. For a head registered at the neck these are different
   locations. Define named painted face, fist, boot-contact and chest targets,
   and use the same definition in solving and grading. Do not optimize a punch
   toward the neck-origin while calling it a head hit.
2. **Accept/reject is too local.** `refine.mjs:158–185` accepts a pose when the
   selected endpoint improves at that key. It does not protect earlier contact
   fixes, floor clearance, support or temporal continuity after all operations.
   Evaluate the final entire clip and reject an edit that breaks a protected
   contact/support or introduces inter-key discontinuity.
3. **An ankle lock is not a sole lock.** Current plant operations constrain
   ankle points. Rotating a boot around that ankle still slides or penetrates
   the painted sole; leg IK can also reposition the body above it. Use measured
   sole contact patches during weight-bearing intervals. Allow intentional
   steps and release instead of trying to freeze every foot through the move.
4. **Dense bake can change runtime ownership.** `refine.mjs:67–73` creates both
   actor tracks and explicit transform.x/y on every key. Jab/dropkick are solo
   runtime paths whose travel is currently executor-owned. Exporting the
   generated transforms unchanged would make the clip claim root placement
   while `_doDropkick` still creates a travel tween after play. Preserve the
   original ownership topology, or migrate travel and remove its old owner
   deliberately. The experimental draft is not a drop-in production clip.
5. **Independent keys do not preserve the motion branch.** The suplex output
   demonstrates discontinuities after baking/IK. Preserve elbow/knee solution
   branch and intentional angle winding over time; sample the interpolated
   spans after the last edit. Do not apply a global shortest-angle rule that
   destroys deliberate turns or the hammerlock's reverse elbow fold.
6. **Surface contact needs a surface measurement.** A wrist is not the end of
   a fist; an ankle is not the front of a boot; distance to a torso centroid
   does not measure distance to its chest. Conversely, finding the extreme
   outline X anywhere on the whole torso ignores the actual contact height.
   Use annotated contact landmarks or local surface queries.

## Recommended next approach

Use an artist-led paired pose pass with constrained cleanup. The critic remains
useful as a diagnostic and regression check. The final animation should be
directed around force, support, silhouette and acting.

**One visual proof first: rebuild the existing suplex.** Block six to eight
paired poses: approach/hook, planted load, controlled lift, brief balanced
vertical position, committed backward rotation, first mat contact, compression,
and release/settle. Judge them with no references, handles, audio or camera shake.
Both bodies must visibly explain where the weight is carried at every beat.

For each phase, author the shared actor staging and main shoulder/hip shapes
before solving the hands. Declare the required grip and supporting sole patches
together. Where the arms cannot reach, change the tableau/body posture; do not
force a solitary wrist solve into an implausible shoulder shape. Apply cleanup
offline, bake only after the motion is approved, and test the full outcome after
every change rather than accepting isolated per-key wins.

Then direct the timing: anticipation slower than the committed fall, a short
balanced lift, accelerating turnover, brief compression, delayed limb settling.
Offset head, chest, hips and legs intentionally. Increasing the key count alone
does not provide weight.

Generate or draw only the art the approved poses require: gripping forearm,
effort/strain heads, an arched attacker torso and a folded/inverted defender
torso. Preserve existing identity and proportions. Torso variants must preserve
calibrated sockets or implement their geometry overrides explicitly; a texture
swap cannot silently relocate shoulder/hip paint. A small number of painted
extremes combined with the connected rig should express volume and twist better
than repeatedly rotating the same upright trunk.

Reuse the proved method on hammerlock, then jab and dropkick. For jab specifically,
author a closed fist plus real face-contact target; for dropkick, correct chest
height and boot contact, then coordinate the receiver's recoil with landing.

Acceptance: retained joint-proof pass, continuous grip/support, no unintended
floor penetration, credible silhouettes at gameplay scale, intentional role
and facing changes, and a before/after full-speed gameplay review in both role
orders. The cleaned draft must also have a verified production export path.

## Evidence and reproducibility

Evidence: [research/animation/claude-review-2026-10-15](../research/animation/claude-review-2026-10-15/).
It includes source hashes, original and experimental critic reports, experiment
logs, experimental drafts, joint proof, unit-test log and selected clean frames.
The full dense traces remain under `/tmp/marigold-claude-review` for this session.

No reviewed source hash changed during the audit. Production clip refinements
that land afterward need a new comparison; this review does not pre-judge them.
