# Grapples unattended run: Stages 1b, 3 and 4a

2026-10-30 · Claude (Opus; the chat ran Opus, not Sonnet) · local commits, nothing pushed, `grapples` not promoted, nothing judged. Stage detail: [G1b entry](2026-10-30-claude-grapples-g1b.md). No stop rule fired.

## Watch in this order
1. [G1b: upper body only](../research/animation/grapples-2026-10/g1b/index.html) (today | G1 | new)
2. [G3: every exit](../research/animation/grapples-2026-10/g3/index.html)
3. [G4a: rope break and shove-off](../research/animation/grapples-2026-10/g4a/index.html)

Frames are local only (`.git/info/exclude`): the pages play on this machine.

## Misses first
- **Whip:** 119-121 px/frame when the defender turns to run, frame 9 (today 99-108). The only exit worse than today. A facing flip can't be eased.
- **The far hand is on the forearm, past the elbow,** not on the elbow. On the elbow Lou's hand misses by 30 px (rig elbow limit). Derek's call; `LOCKUP.elbowCup`.
- Under the belt: engage 81-378 px (frame 0 boots at the film's 90 px start; today has 82-267), break 5-139 px for a few frames as hands leave.
- Ankle daylight 6.3 once (target 8), first run after a page load, frame 0.
- George's attacker collar 2 engage frames over 3 px (9.3). Break step 44-55 (G1 33-42).
- Rope break planted slide 2.93 / 2.53 px/frame on the left-facing runs (limit 2.5).
- Guido and Kowalski at gap 80, untuned: torso on torso 50-166 px.
- A move's clock runs under the 0.14 s lead-in, so a fast hit can land while the picture still eases. Not measured per move.
- The G1b strips were filmed before T4a and show the plain break; seed 11 now gives a shove.

## Measured
- Hold (even, drive, steal, stall): 0 under the belt, 0 torso on torso, 12 of 12 runs. Lou 0 contact misses.
- Exits, first-frame step: G1 62-102, today 58-108, new 3-6 px on all eight. Worst in 0.2 s: suplex 28, slam 34, piledriver 22, hip toss 26, hammerlock 20-37, arm drag 28, headlock 31-35, whip 119-121.

## Choices made
- One lead-in for every exit, drawn only (`exitBlendPose`, `_applyExitBlend`, 0.14 s): pose and x go back after the draw, so hit timing and damage are untouched. Per-move entries are possible in `LOCKUP.exitBlend`, none needed yet.
- A turned man stays in his held facing through the lead-in.
- Rope break: attacker steps back 34 px, hands up, defender stays. Shove: defender 44 px, attacker 6 px, seeded one in three, no damage or stamina.
- Everything else is in the [G1b entry](2026-10-30-claude-grapples-g1b.md): `bend` not `lean`, gap 80 over the smallest 78, engage .30.

## Open for Derek
1. Is 1.4 s right? 2. Which hands fail as art (Stage 2 needs this list)? 3. Layering order? 4. Far hand on the forearm: keep? 5. Stage 4 order for the rest.

## Gates at 907fd53
Suite 1057/1057, build, coverage 22, flag-off identical incl. poses against 910e69f, `grapples_assert` 17/17.
