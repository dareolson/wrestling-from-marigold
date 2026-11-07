# Falls: G2a to G3 r2, and the wear meter next

2026-11-06 · Claude Opus · Planning only; no runtime edits. Sonnet ran each block; Codex reviewed each gate.

## What happened (2026-11-05/06)

- G2a: Derek said the back falls were OK but the slam reacted late ("he hits, then a few moments pass"). T2.4a-d fixed it (e36116c).
  Codex later withdrew its "pelvis 37 px up at impact" claim; the extra `contact` marker had caused the delay.
- G2a r2: "looks great and elevates the action". T2.5a-f added forward catch, knees-first, seated collapse, the spill concept and slam
  tiers (9ca73a6). T2.5g-T2.7 added landings on every throw, per-rig tiers and gravity-timed falls (7cadac0).
- Derek's tier decisions: the body slam and big impact moves are heavy (painful); exceptional may repeat; strike knockdowns at 35.
- Stage 3: `chooseFall` picks the fall by situation (dfea763). T3.5-T3.12 read the hit at the hit, wire tired throws, slide inward
  at the ropes, and commit Codex's snapmare harness fix (fd194fe, 1ad916f).
- Front snapmare: Derek allows it, with its own entry; parked in IDEAS.md.

## Open

- Real matches: 1 strike knockdown in 4 x 150 s, because stamina recovers 6/s. Derek chose a separate wear meter
  (PLAN_FALLS T3.13-T3.16, STOP at G3 r3). Stamina rules for pins and kickouts stay as they are.
- The backward fall's arm step at contact (52/84 px) measures as the keyed swing, not a seam; Derek hasn't judged it.
- Then Stage 4: soak and the promotion question. Everything is still behind `?falls=v1`; nothing pushed.
