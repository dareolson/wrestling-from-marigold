# LouNew comparison rig — ready for Derek's tuner review

2026-10-18 · Codex. Derek authorized building the first new roster comparison,
using the rig tuner as needed. No shipped Lou/George config or art was replaced.

## Open it

- Rig tuner: http://127.0.0.1:5173/tools/rig-tuner/?char=thesz-roster-v1
- Match: http://127.0.0.1:5173/?arena=1&notitle=1&p1=thesz-roster-v1&p2=george
- Control: `thesz-procreate-v1`.

`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` under Node 22 starts
the server if it is not already running. The tuner dropdown includes both.
Tuner edits are session-only; export and apply only to the comparison config.

## What changed

- `src/characters/thesz_roster_v1.js`: opt-in six-texture comparison with new
  independently derived part geometry, torso sockets and two-anchor limb binds.
- `src/assets/wrestlers/thesz-roster-v1/`: derived source crops and single-pass
  neutral-axis rotations. Original full-canvas paint/PSDs remain preserved.
- `tools/wrestler-cutter/prepare-lou-roster.py`: reproducible preparation recipe;
  regenerates config, so incorporate approved tuner changes before rerunning.
- Arena: adds only this comparison preset/asset preload. Defaults unchanged.
- Rig tuner: comparison registration and validated `?char=` deep-link selection.
- Rig validator includes the candidate. Move participation proof accepts optional
  `WFM_CHARACTERS`, retaining its old default character set.
- `tools/debug/lou_roster_tuner_proof.mjs`: current/candidate idle and full
  24-phase walking sweep in both facings, with screenshots and measurements.

## Measurements and review limits

Source: `Sprite sheets/RosterNew/2026-10-18/LouNew.psd`.
Derived report and evidence:
`Sprite sheets/RosterNew/2026-10-18/LouNew/extracted-v1/cleaned-v1/comparison-v1/`.
Read its README and `measurements.json` for anatomical points and methods.
Neck/elbow/hip/knee intersection centroids are remeasured from this PSD;
shoulder, wrist, anatomical ankle and sole are explicit initial manual landmarks.
These are reviewable judgments, not automatically certified anatomy.

One uniform body scale preserves the art's relative proportions. Candidate idle
painted height 347.7906px vs current Lou 347.7911px at tuner zoom 1.4. No source
pixels repainted, no caps invented, no current Lou offsets copied blindly.
The compatibility base shares the separated working-arm/thigh/shin families;
the whole far arm and alternative leg paintings remain donor sources.
No generated grip/palm donors were silently imported into the new base.

## Validation

- 698 tests pass; production build passes; five character rig contracts valid.
- Tuner: zero page errors; 48 walking samples plus two idles per character.
  No measured elbow/knee ink gaps or uncovered central pixels.
- Clip/participation/grounded sweep: maxGap 0, uncovered core 0. Strict proof
  exits 1 because handoff anchor errors max 1.687px. The CURRENT LOU control
  reproduces that exact same maximum and exit status. Do not report this as a
  full pass. Candidate knee parent error also reaches about 0.126px at handoff.
- Certifier: reference rig CERTIFIED; candidate UNVERIFIED, 524 rendered frames.
  Missing independent boot attachment slots for sole certification and no
  recorded candidate handoff budget. Get-up -> standing jump 26.98px at wrist.
  Do not add a permissive budget to conceal it or claim full certification.
- Real AI match: 150 samples, 52 events, 12 states, both facings, no missing
  textures/non-finite samples and no page errors. Fourteen screenshots saved.
- Tuner painted-sole proximity diagnostic: worst closest foot 5.27px from the
  mat vs 4.45px control at that scale. Not proof of perfect contact or no slide.

Evidence includes candidate/control participation JSON, certifier output, tuner
JSON/PNGs and the real match REPORT/screenshots. These checks prove useful
runtime/attachment coverage, not accurate interpersonal contact for every move.

## Next

Derek reviews the neutral/walk assembly in the tuner before treating this as a
replacement. Tune candidate landmarks/part geometry if needed, retaining source
proportions. Review selected strikes, throw contact, ground handoff/get-up in
both roles/facings; independently measure candidate-specific inverted crown
contact if required rather than copying `crownBelowHip` from current Lou.
Keep shipped/default art until explicit approval. Then reuse the measured
workflow on George, Guido and Kowalski; preserve Guido's one-taped-wrist canon.

There is unrelated story work already dirty in the workspace. No commits or
pushes were made. Original roster sources remain ignored local artifacts; their
presence in the handoff does not mean they are backed up in git.
