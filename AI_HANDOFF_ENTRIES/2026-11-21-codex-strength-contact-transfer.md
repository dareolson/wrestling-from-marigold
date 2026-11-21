# Test of strength: keep wrist contact into shove — Codex, Nov 21

Derek: Lou lets go near the end; keep his grip in contact with George. Traced late grip: old wrist/receiver hip constraints faded 10.6–10.85, before shove at 11.08. Actual near-palm gap was 7.63px at 10.7, 20.67px at 10.75, 26.31px at 10.85. Far hand was moving from own-wrist clasp to chest while near hand also released.

Retained correction: receiver near-hand hip and Lou near-hand wrist constraints now hold fully through 11.08, release 11.08–11.2 with the shove. Removed the competing near-hand shoulder target; Lou holds the wrist with that hand while his far hand pushes the chest. Far-hand clasp-to-chest timing unchanged. No choreography, hop, gap, damage, ending/control or layer/art changes.

Lou→George both facings actual playback: wrist gap ≤.334699px through the full lock/late transfer (8.85–11.08), formerly over 40px near shove. 58 mat/layer/leg/runtime tests pass, including full wrist constraint weight through shove and no competing target on holding hand. Other mat clips/damage deep-equal start snapshot; diff check pass. Three 3-damage calls, finite joints, end gap 295 rig units, immediate standing controls with 20.043 units movement in 12 frames remain verified. No full suite/build gate rerun. No commit/push. Visual acceptance remains Derek’s.

Evidence research/animation/strength-contact-transfer-2026-11-21/: before-matMoves.txt, verify.mjs, before.txt/after.txt, matrix.json, audit.mjs, retained ±1 individual captures/JSON, tests.txt, preserve.mjs. Incorrect exploratory chestGap metric removed; retained verifier measures the relevant wrist contact.
