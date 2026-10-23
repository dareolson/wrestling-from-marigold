# G3 package: does the consequence read? (Stage 4, T4.2–T4.5)

2026-10-23 · Claude (Sonnet) · branch `story/marigold-opening`

Muted-footage frames, one JPEG per ~0.17 s wall-clock (`play.mjs` `WFM_SHOTS`), cropped
`250,130,750,340`, `WFM_PROCREATE=1 WFM_GEORGE=george-roster-v1` (Procreate Lou and george-roster-v1; old George retired for this package). `off/` = today's game, `on/` = `?aftermath=v2`.
Each runs from the move's trigger through the rise and a few seconds after. Frame timing is wall
clock, so `off/NNN` and `on/NNN` are not the same game instant; compare the phases.

- `off/<scenario>/NNN.jpg`, `on/<scenario>/NNN.jpg`: `suplex`, `suplexReverse`, `figureFour`, `figureFourP2`
- `sheets/<scenario>_off_vs_on.jpg`: every 6th frame, off left / on right
- `clutch_stills/`: the trapped-leg (`rLeg`) clutch at its hold, both facings, both lyings, and after a roll
  (george-roster-v1 left, Procreate Lou right, same facing for both seats)

**T4.2 (limb-aware clutch) is not behind the flag**, as the plan has it: the live figure four's clutch now
goes to its trapped leg with or without `?aftermath=v2`. `off` therefore already shows T4.2. The flag adds only
the compact fallback (T4.3) and the protective recovery overlay (T4.4).

## Measured `groundedSlot` table (tools/debug/grounded_slot_probe.mjs)

| rig family | rigs | lLeg/lArm facing +1 | facing −1 | rLeg/rArm facing +1 | facing −1 |
|---|---|---|---|---|---|
| swaps at −1 | george, thesz-roster-v1, thesz-front3q-r1 | near | far | far | near |
| stays near | thesz, thesz-procreate-v1, george/kowalski/guido-roster-v1 | near | near | far | far |

Identical for supine and prone. Every roll flips the slot (the body turned over). `groundedSlot(limb, facing0, lying, skeleton, rolls)`
takes the facing he went down with and the rolls since.
