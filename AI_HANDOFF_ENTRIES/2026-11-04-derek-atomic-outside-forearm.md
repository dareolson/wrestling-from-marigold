# For Opus: keep the carrier's outside forearm over the receiver's trunks

2026-11-04 · Derek's direction, recorded by Codex after reviewing r7 at 63b07de.

Derek: the attacker's **outside forearm should stay stacked above the victim's trunks so it looks like he's holding him**. “Above” means in the draw stack, in front of the trunks, not raising the forearm's position on screen.

Reviewed the r7 clip, review page and a captured lift frame (`g4c-a7/frames/drop-lg-r/s0110.jpg`). The new receiver arm motion and pain/walk/turn sequence are present. The atomic-drop clip declares grips, carries and plants, but **no explicit cross-actor `layers` or `layerTie`**. A hand reaching its hip target therefore does not guarantee that the carrier's visible wrapping forearm stays in front of the receiver's trunks. Existing depth interleaving is an implementation lead for this visual report, not a complete measured diagnosis.

For the next correction, keep the outward/camera-facing wrapping forearm visibly over the receiver's trunks throughout the wrap, lift, held peak and descent while the grip remains engaged, then release it naturally. Resolve the visible outside side per rig and facing; do not assume a fixed anatomical l/r channel. Preserve the other arm's behind-body relationship and the receiver's new flail. Check both pairings and facings, including the grip release; no transient frame where the trunks cover the working forearm. Use the clip layering mechanism after grip redraws, scoped to the holding window. If limb-level ordering raises too much of the arm in front, report it and use the smallest necessary part-level change rather than changing global wrestler depth.

Keep the existing grip target and carry/contact path unless a separate positional miss is demonstrated. This is an occlusion correction; moving the hand away from the waist would defeat the holding action. Show a before/after lift/peak still plus normal-speed loop. Existing r7 misses (turn flip, hand-to-tailbone approximation, sole drift and raw overlap) remain reported; this note does not approve or promote the move.

Review only: no runtime change or fresh test run. The r7 page records 1178/1178 tests and its gates; those are Sonnet's recorded results.
