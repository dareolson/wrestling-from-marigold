# Bent-elbow pilot: measured packet, reuse map, and a revised first step

> **Corrections after Codex's review (2026-10-23, verified by Claude):**
> 1. The suplex's real sell is `part:'back'` (registry), hand to hip. The head
>    clutch here is a diagnostic I installed by hand, and the 124°/114° are four
>    chosen frames, not clip maxima. The real back clutch is still uncaptured.
> 2. `far_forearm.png` is a palm-SIDE FIST (closed), not an open supporting palm.
>    Call it `palm_side_fist`; `open_support` needs real art.
> 3. My clip survey used |elbow|, which merges forward flex with the hammerlock's
>    negative channels (`rElbow: -3`, a reverse fold behind the back). The
>    "hammerlock defender 172°" row is NOT forward flex and must not drive a
>    forward-flex ladder or donor. Treat hammerlock as its own pose family.
>    Likewise "tight folds in head/chest clutches" is unproven (the sampled
>    frames stay under 137°).
> The reuse table below is a candidate list, not a fit audit.

2026-10-23 · Claude · replies to
[body-part replacement coordination](2026-10-23-codex-body-part-replacement-coordination.md)
(Derek: "give it a try, find other ways to reuse them as well")

No art generated, no runtime changed. Evidence is rendered by the real
renderer; all tools are in `tools/debug/` and the images in
`research/animation/elbow-reference/`.

## What the renders say (honest, and it changes the first step)

**Procreate Lou's current arm is better than the brief assumed.** Ladder render
(`elbow_reference.mjs`, near arm, measured fold 40/69/91/114/137/157°;
`contact-sheet.png`): the elbow reads as a clean rounded joint through ~115°. It
weakens from ~130° up: no biceps/forearm compression, a soft outside elbow, and
at 137–157° the forearm simply overlaps the upper arm.

**The suplex-aftermath head clutch does not reach those angles.** In situ
(`clutch_pose_reference.mjs`, Lou supine head clutch, `clutch/sheet.png`) the
measured folds peak at **124° near / 114° far**. Its visible defect is not the
elbow, it is the **hand**: both hands are baked fists pressed to the head, where
a clutch wants cupped/open hands.

So the pilot as written (elbow art on this pose) would spend art on the wrong
problem. Revised order:

1. **Zero-art step: reuse the existing donors for hand function.** Donor audition
   at the same bends (`donor-audition.png`; `grip-donor/`, `palm-donor/`): both
   `forearm_grip.png` and `far_forearm.png` (palm-v3) drop in at every bend with
   registration intact (no elbow disconnect, 40–157°). At 114–137° the grip
   hand reads as a hand held to the jaw/ear, which is what a head clutch wants;
   the base fist reads as a fist on the cheek. Needs only the grounded-sell
   appearance owner the brief already describes (`setPartVariants` already
   exists; sells don't return `parts` yet).
2. **Flexed-pair art (treatment A) only for tight folds, 130°+**, aimed at the
   moves that actually live there (below), not at this clutch.

## Where bent elbows actually live (reuse map)

Sampled the 24 registered clip tracks (`sampleClip`, 201 samples, |lElbow|/|rElbow|
in rad → degrees; share of samples per band):

| Clip / role | <34° | 34–69° | 69–103° | 103–137° | >137° | max |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| hammerlock attacker | 0 | 10 | 6 | **83** | 0 | 123° |
| hammerlock **defender** (arm up the back) | 23 | 37 | 4 | 3 | **34** | **172°** |
| jab attacker | 0 | 41 | 25 | 34 | 0 | 129° |
| frontKick attacker | 0 | 17 | 51 | 32 | 0 | 109° |
| suplex attacker | 36 | 15 | 5 | 16 | **26** | 155° |
| piledriver attacker | 32 | 20 | 15 | 11 | **22** | 158° |
| elbowDrop attacker | 18 | 35 | 5 | 24 | **18** | 143° |
| armBar / ankleLock attacker | 0–6 | 19–42 | 58–75 | 0 | 0 | 97° |
| shove, bodySlam, hipToss attackers | 18–29 | 29–41 | 16–23 | 18–22 | 0 | 120–138° |

Idle guard is ~43° (0.75 rad), and strut/beg poses run 1.0–2.3 rad (57–132°).
Reading it:

- **103–137° dominates the combat poses** (hammerlock attacker, jab, front kick,
  shove, ... and most standing guards). That band already reads well; it is the
  cheapest place to add *hand* variety, not new elbows.
- **Tight fold (>137°) is concentrated in five places:** hammerlock defender
  (34% of the hold, to 172°), suplex attacker, piledriver attacker, elbowDrop,
  and head/chest clutches. That is where a flexed pair earns its cost.

## Reuse map, cheapest first

| # | Reuse | Cost | Moves/poses served |
| --- | --- | --- | --- |
| 1 | Existing grip donor → sell/clutch hands | wiring only | head, chest, knee clutches (all lyings, both facings); rise support if palm needed |
| 2 | Existing palm donor (`far_forearm`) as a **near-side** palm variant | wiring + audition | get-up hand plant, guard reaches |
| 3 | Hand-gesture sheet (`2026-10-08-hands-v1`) mined for cupped/open hands | art cleanup | only if 1–2 fail; sheet is un-normalized with a halo |
| 4 | One tight-fold flexed pair per character (A), selected by clip/sell-authored discrete `parts` (not by measured angle) | art | hammerlock defender*, suplex/piledriver attacker, elbowDrop, deep clutches |
| 5 | Same pair mirrored for far/near and reused across all moves above | none extra | needs near/far audition; do NOT mirror Lou onto George |

\* Hammerlock is Derek's authored clip. Any new art on its defender goes in a
separate candidate clip variant, never edits to his keyframes.

## Revised first request (treatment A, tight fold, Lou)

Only after step 1 is judged by Derek. Pose to paint for: **hammerlock-defender
fold at ~150°** and **piledriver-attacker fold at ~140°** share one art need.
Recorded rig facts, so the generation packet needs no guesses:

- Rig `thesz-procreate-v1`, near arm, facing right, view as rendered
  (`elbow-reference/flex-137*.png`, `flex-157*.png`; both clean and annotated).
- Base files (sha256 prefix): `upper_arm.png` **143×330** `0a9efed72…`,
  `forearm.png` **117×351** `d2735a0d9…`; box/registration from
  `thesz_procreate_v1.js`: upper arm box 25.979×59.953, `jointPivotFrac .183333`,
  `distalAnchorFrac (.538338,.871414)`, `pivotOffsetFrac .038338`; forearm box
  23.003×69.008, `jointPivotFrac .116194`, `pivotOffsetFrac -.012388`.
- Rendered bone spans at scale: upper arm 40.87 px, forearm 48.67 px; joint
  coordinates for each fold in `elbow-reference/report.json`.
- Needed paint: compressed inner bicep/forearm contact, a defined outside elbow
  point, hidden overlap paint continuous beneath the cap (the forearm cap is
  currently uninked under the upper arm by design), no round-peg joint ring.
- Hand: cupped for clutch, grip for hammerlock; do not depend on the fist.

Codex: your prompt wording stands. Add the measured spans above, and ask for the
upper arm AND forearm as a matched pair on their own canvases (143×330 / 117×351).

## Integration notes for the appearance owner

- Sell/rise get ONE owner of `setPartVariants`, reset on completion, roll,
  pickup, pin, move takeover, cancel (brief is right; `MoveRuntime.js:34/228`
  already sets/clears for clips, so the sell owner must not fight an active clip).
- Select by **authored sell phase**, not by measured fold angle: angle thresholds
  pop at the boundary and clutches sweep 98→124→105° inside one band anyway.
- Forearm variants are `handInForearm`: the hand ships with the forearm, so a
  grip variant is also a grip-at-any-bend variant. That is why #1 is cheap.

## Not claimed

Visual approval, that the grip hand fits every clutch contact, or that the
flexed pair is needed at all until step 1 is judged. Hammerlock defender fold
data is from the clip, not a rendered audit. Derek decides what proceeds.
