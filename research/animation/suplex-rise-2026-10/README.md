# Suplex receiver rise: G4 review package

Plan: [PLAN_SUPLEX_RISE.md](../../../PLAN_SUPLEX_RISE.md). Entry: `AI_HANDOFF_ENTRIES/2026-10-24-claude-suplex-rise-g4.md`.
Procreate Lou receives the suplex (George throws), both facings.

## Look at it

Open [viewer.html](viewer.html) in a browser (works from a clean checkout and from `file://`; it reads only
`g4/`). Three columns, same clock:

| column | flags | what it is |
|---|---|---|
| aft | `aftermath=v2` | the game before this work (compact sell + protective recovery, no sell art) |
| on | `sellart=v1&aftermath=v2` | the candidate: grip contact, lying hold, protected rise, carried standing hand (D5) |
| off | none | flag-off game |

Controls: play/pause (space), 1× and 0.5×, scrub, frame step (arrow keys), event jump buttons, facing select.
1× plays the manifest game time in real time (`requestAnimationFrame` + `performance.now`; frame shown = last
strip frame at or before the elapsed game ms). The clock is game ms from impact. Below the player: the near-hand to
back-waist curve, event close-ups for the three runs, and the measurement table.

`g4/` holds 480 px wide WebP (q80) frames, 30 fps, from impact −500 ms to recovery +2 s, plus the event close-ups
and `data.js` (frame times, events, curves, numbers). Size is printed by the packager (15.5 MB at the time of
writing). No mp4s: `ffmpeg` is not on PATH on this machine, so the command below is untested. With it installed:

```
cd research/animation/suplex-rise-2026-10/g4
for d in on-suplexReverse on-suplexReverseFlip; do ffmpeg -framerate 30 -pattern_type glob -i "$d/t*.webp" -c:v libx264 -pix_fmt yuv420p "$d.mp4"; done
```

(glob order is by name, which sorts the `t-` frames after the `t+` frames; rename or feed an explicit list.)

## Regenerate

Node 22 only, dev server running, from the repo root:

```
export PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH
npm run dev                          # 127.0.0.1:5173
export WFM_URL=http://127.0.0.1:5173 WFM_PROCREATE=1 WFM_GEORGE=george-roster-v1

# 1. film: 3 configs x 2 scenarios (suplexReverse = receiver faces left, suplexReverseFlip = right)
for c in aft on off; do for s in suplexReverse suplexReverseFlip; do
  node tools/debug/aftermath_film.mjs $s $c research/animation/suplex-rise-2026-10; done; done

# 2. hand-to-back curves, windows, handoff run and step (writes motif-curve-<tag>.json/.svg)
node tools/debug/motif_curve.mjs research/animation/suplex-rise-2026-10 aft,on suplexReverse,suplexReverseFlip t47

# 3. rise-end arm vs standing hand target (T4.5)
node tools/debug/rise_end_arm.mjs

# 4. downscale the frames and write g4/data.js (needs Pillow; run isolated)
python3 -I tools/debug/g4_package.py
```

`strip/` folders (full-size JPEGs) stay untracked; manifests, close-ups and the JSON stay tracked.
The film pins the clock (`game.step` at 1/60 s, tween clock pinned, `Math.random` seeded), so a re-run at the same
commit reproduces the event times; the clutch-peak time differs by up to 183 ms between runs (the sell plan),
rise start (5516.67 ms) and standing (6550 ms) do not.

## Numbers (T4.7, facing −1 / +1)

| ms with hand > 15 px from the back / window ms | aft | on, before D5 (T4.3) | on, D5 (T4.7) |
|---|---|---|---|
| lying: clutch end → rise start | 4200 / 4200 | 0 / 4200 | 0 / 4200, 0 / 4716.7 |
| rise: start → riseT .85 | 766.7 / 766.7 | 16.7 / 766.7 | 0 / 766.7 |
| handoff: riseT .85 → standing | 266.7 / 266.7 | 266.7 / 266.7 | 0 / 266.7 |
| standing → +2 s | 2000 / 2000 | 1083.3 / 2000 | 900 / 2000 |
| longest unbroken stretch, riseT .85 → standing + 400 ms | 683.3 | 450 | **0** (target ≤ 50: met) |
| largest per-step near-contact jump, same span (px) | 12.12 / 14.09 | 12.12 / 14.19 | **31.22 / 34.57** (target ≤ 4: **missed**) |

The miss is a whole-body step at the first standing frame, not a hand step: in that frame the painted back waist
steps 31.35 / 34.71 px and the far shoulder 18.02 / 19.95 px, the hand-to-back distance stays 0.14–0.16 px, and the
same body step is present in `aft` and in `off` (flag off). Not retuned (getup keyposes are out of scope).

Rise end (T4.5): rise-end arm lArm −1.205 / lElbow 2.260 (elbow flex 129.2°, limit 157.6°), contact 0.17 px from the
back waist; probed standing hand lArm −1.160 / lElbow 2.200 (2.33 px); difference −0.045 / +0.060 rad. The un-carried
rise ended 45.3 px away.

Hand art (R1): one grip run from the first clutch to recovery +1.2 s; no grip → fist → grip under 250 ms.

## Not in this candidate

Support-hand plant (parked, `&plant=1` only), George as receiver, prone/quick rise, faces, new art.
