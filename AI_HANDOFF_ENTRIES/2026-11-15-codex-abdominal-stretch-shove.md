# Abdominal stretch, arm struggle and rude send-off

Derek asked to move on from the wristlock, keeping a later revisit because it still did not look painful enough. That feedback is recorded in the wristlock handoff. Continued with the abdominal stretch. Work is uncommitted in `/Users/home/Documents/wfm-stage12` on `moves/stage12`; no merge or push.

Preview: http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=kowalski-roster-v1&def=thesz-procreate-v1 .

Rebuilt the entry so the attacker steps behind the staggered victim and turns on a straight pose, rather than snapping the victim into the same facing. The hold uses a trapped far arm over the attacker's shoulder, torso control and a far-leg hook. Receiver bends under successive pulls with the support leg still on the mat. Added central Neck grip targeting and camera-relative shin-only layering so the hooked calf can emerge in front without dragging its whole thigh over the receiver. New tests cover those shared contracts.

Visual staging reference: archived Johnny Weaver / Jumbo Tsuruta photograph in [Weaver's interview](https://midatlanticwrestling.net/resourcecenter/interviews/weaver/weaver_02.htm). Inspected the photograph; used its diagonal body/arm/leg relationship as an animation reference rather than copying exact poses or claiming video study.

Derek liked the revised hold, then requested two additions:

- Lou's free arm struggles for control: three brief attempts to grab/pry the actual controlling forearm, released under the next wrench. These use post-placement reach targets so they follow the drawn arm.
- Rude exit: unhook the leg, shove forward with both hands, receiver stumbles and falls face-first, short authored rebound, then remains prone. Stretch remains three 5-point squeeze events at 1.2/1.9/2.6s. Shove at 3.45s and mat impact at 4.0s add no damage. Mat impact has shake and foley. Clip duration 5s.

`_doMatMove` supports a prone ending, mat-impact presentation events and disabling hold escape once the shove has released the victim. Before the shove, the stretch retains the prior standing/stagger escape behavior via `escapeStanding`. The grounded handoff occurs after the authored fall/rebound. No new art.

The first attempt to publish the arm-struggle/shove was blocked when automatic approval review reported a usage limit. Those files stayed staged in `/private/tmp`. After the reported 8:24 PM reset time, the normal approval retry succeeded and the changes were applied. The latest preview includes both requested additions.

Validation: 56 focused tests pass, build and whitespace check pass. Full suite before the final standing-escape preservation tweak: 1373 pass, the same five existing art/fixture failures (landmarkFit, profileV2Normalization, two shipped-thigh checks, frozen profile-v4 identity). Real executor runs for Lou/George in both roles and facings: all four start, three squeeze hits/15 drain, no invalid joints, browser errors or stuck endings; finish standing/down-prone. Final focused tests and browser escape checks cover the later escape tweak. Evidence and scripts: `research/animation/abdominal-stretch-revision-2026-11-15/`.

Changed: `src/animation/clips/matMoves.js`, `src/animation/lockup.js`, `src/animation/AnimationClip.js`, `src/animation/clipLayers.js`, `src/Wrestler.js`, `tests/lockup.test.js`, `tests/clipLayers.test.js`. Keep prior move fixes in this worktree. Wristlock pain detail remains pending.
