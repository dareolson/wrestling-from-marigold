# Lou ankle twist — T2.5 review candidate

Pending Sonnet / Derek review. No commit and no T2.6 runtime swap.

Asset: `src/assets/wrestlers/thesz-procreate-v1/shin_ankle_twist.png`.
Declaration: `variants.shin.ankleTwist` in `src/characters/thesz_procreate_v1.js`.
The 216×495 canvas and inherited shin geometry are unchanged. Ankle cutoff
is pixel row 395 (zero based), at the shaft-to-foot bend. Rows 0–394 are
copied byte for byte; rows 395–410 blend into the generated foot.
`pixel-check.json` records the measured gate; reproduce with
`node tools/debug/build_lou_ankle_twist.mjs --check`.

Heel contact is (43,443), toe contact (164,475), normalized by the full
canvas dimensions. These lie on the new heel and pointed toe respectively.
The toe is narrower and slopes downward toward the sole side. Art direction
and held-frame grip distance remain review items; the <=6 game-pixel grip
bar needs the T2.6 swap before it can be measured on this variant.

Created using built-in imagegen with the base shin as edit target. Original
generated output is retained as `donor.png`; the builder fits its whole
canvas and restores the original shaft. Final prompt:

> Use case: precise-object-edit. Edit target: the attached Lou wrestling shin sprite, 216x495 transparent canvas. Draw ankle-lock cranked boot variant using this exact blue boot's hand-drawn black ink, blue coloring, laces and style. Keep knee, skin, entire long boot shaft and all pixels above y=395 EXACTLY unchanged. Only reshape the foot below ankle hinge at approximately (75,400): plantar-flex the forefoot 35 degrees downward toward sole side, toe pointed and turned inward (foreshortened/narrower rounded toe). Base foot projects horizontally right; new toe should end about (146,477), heel around (43,445). Preserve clear heel, connected ankle and continuous laces, with no seam. Same exact canvas, framing and scale, fully transparent background; entire new foot within canvas. No text, no guides, no extra objects.
