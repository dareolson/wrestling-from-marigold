# Stretch: reduce roster knee tuck; preserve Lou

Derek's feedback after the calf-axis pass: Lou remains best; George and Kowalski slightly off, Guido further off. Do not treat previous visual checks as acceptance.

Only per-rig abdominalStretch.params values changed this pass: George kneeOverlap 4 -> 1.5; Kowalski 4.5 -> 2; Guido 4 -> 0. Lou/default stays 3. The roster bound drawings already have broad painted knee caps; additional axial tuck was pushing those caps too far over the thigh end. Kept the prior calf-axis implementation and all joint geometry unchanged. No lateral parameter was added. Browser-only experiments compared axial and perpendicular offsets; larger perpendicular offsets exposed the thigh's second painted edge and were discarded. Signed/negative-overlap experiments also remain browser-only; saved code still validates 0–6 and clamps nonnegative.

Stage12 changes this pass: src/animation/clips/matMoves.js and the expected per-rig values in tests/legContacts.test.js. All earlier uncommitted changes remain. No commit, merge, push or reset.

60 focused tests pass, build and git diff --check pass. Actual saved-source browser captures for all four attackers against Lou, both facings, at 1.3/2.6/3/3.3/3.4/5 seconds. All eight finish standing/down-prone. Evidence/scripts: research/animation/stretch-knee-rig-fit-2026-11-15/. verify.mjs uses saved code; compare scripts are temporary in-page experiments. Full suite not repeated for these parameter-only adjustments.

Preview remains port 5233, reopening with Guido selected so Derek can assess the largest correction. Await visual feedback before further changes.
