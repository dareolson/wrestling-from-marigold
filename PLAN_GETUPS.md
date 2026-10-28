# Get-up library: authored rises with variations

2026-10-27 · Claude (Opus) plan, Sonnet executes · Derek judges every visual result.
**Starts now** (Derek 2026-10-27: do the get-ups first, no more tinkering on George). [PLAN_GEORGE_TRANSFER.md](PLAN_GEORGE_TRANSFER.md)
is parked at G10a; its Rev 4b / Stage 13 (the turn inside today's rise) is replaced by this plan and was never built.

## Progress

(Sonnet: one line per task: id, commit, result, misses. Gate lines are written by Opus/Derek only.)

- T1.0: `planSells({ noRoll })`, `getups=v1` flag in Wrestler; 1000 seeded theatrical plans (supine, prone) have no roll, control plans still roll; sells.test.js 45/45. Misses: none; no film.

## Why (Derek 2026-10-27)

"george should switch directions while he's getting up ... facing lou by the time he stands up, right now he kind of wills
himself up in an antigravity way" and "maybe we need established getting up animations, we can make a few variations".

Today there is one rise from the back (`Skeleton.GETUP_SUPINE_POSES`, 4 keys) and one from the front (`Skeleton.GETUP_POSES`),
plus the quick rise. Measured problems they cause:
- The wrestler stands up facing away and mirrors on a standing frame (H5, [PLAN_RISE_HANDOFF.md](PLAN_RISE_HANDOFF.md)).
- From the crouch the hips go straight up, torso upright, no hand pushes anything: no visible weight.
- The front (prone) path has no hand route: George's near forearm steps 33-37 px at the roll swap and 40-44 px at
  hold → rise (T10.3 films, `research/animation/george-transfer-2026-10/g10a/rows.json`).
Reference: [MOVE_CATALOG.md](MOVE_CATALOG.md) line 80, Bret sheet frames 64-68 (from the back) and 244-258 (from the front).

## Decisions (Opus defaults; Derek can overrule at any gate)

- **D1. Get-ups are grounded keypose tables, not MoveRuntime clips.** Clips pose the upright channels (`lLeg, crouch, lean,
  tilt, lift`); every rise system built so far works on the grounded channels (`hip, torso, *Thigh, *Shin, *Arm, *Fore`):
  `updateGetUp`, risefix's `standingChannels` end, the hold carry (`riseHoldCarry`), the carried back hand. So a get-up is a
  table in a new module `src/animation/getUps.js`, the same shape as `SELLS` in `sells.js`: `{ id, from: 'supine'|'prone',
  duration (s at full stamina), keys: [{ t, ...channels }], flipAt?, after?, hands?, tags }`. The last key is always the
  standing key, so risefix's last-segment solve keeps working unchanged.
- **D2. Every get-up ends facing the opponent.** A get-up that needs a turn mirrors INSIDE the rise at `flipAt`, the way the
  roll already does (`SELLS.supine.roll`: `swapAt`, `after`, keys built so the two halves draw the same body). The flip is put
  where the body is compact and on a knee, and is mirrored about the planted knee/foot, not about the hip.
- **D3. Weight.** Every get-up has a push: a hand on the mat, on the knee or on the ropes, with a hand-contact target
  (the clutch's reach machinery, `updateGroundedReach`). The torso goes forward over the feet before the hips lift.
- **D4. Selection.** `chooseGetUp(ctx)` is pure: ctx = { lying, needsTurn, hurt (0-1 from stamina), soldPart, nearRopes,
  rig capabilities }. It filters eligible get-ups, then picks with a seeded weighted random, never the same one twice in a
  row for one wrestler. `needsTurn` uses the opponent's x at rise start with a 12 px deadband, re-decided until `flipAt`,
  then frozen until standing (same policy as the George plan's A6).
- **D5. Back sell compatible.** A get-up tagged `backSell` keeps the near hand on the back the whole way (today's carried hand)
  and pushes with the far hand. Lou's and George's back-sell numbers (`holdW`, recovery) must not change.
- **D7. Sell on the back, turn over only to get up (Derek 2026-10-27).** "I wanted him to sell longer on his back rather
  than just flip on his stomach right away, he can flip right before he gets up". Under `?getups=v1`, `planSells` never plans
  a `roll` (today `theatrical` picks it first 20% of the time, `SELL_STYLES` in `sells.js`); its weight goes to `writhe` and
  `clutch`. A supine wrestler stays supine through every sell and the hold; turning over is part of the get-up
  (`backKneeHurt` turns onto the knee). Kind-2 (prone) trips to the mat from a fall that lands face down are unchanged.
- **D6. Behind a flag** `?getups=v1` until Derek approves the set; off = today byte-identical (the `riseFixFlagOff` fixture
  must not change).

## The set (first round)

| id | from | turn | push | notes |
|---|---|---|---|---|
| `backKneeHurt` | supine | yes or no | far hand on front knee | sit up, roll onto the near knee facing the opponent, push off the knee, stand. Derek's description. |
| `backTuck` | supine | no | both hands on the mat behind, then lean | today's rise with the lean and push added; fresh wrestlers. |
| `frontKnee` | prone | yes or no | both hands (push-up), then hand on knee | push up, one knee under, stand (Bret 244-258). Replaces the prone path with no hand route. |
| `backKneeHurt` + `frontKnee`, `backSell` variants | | | far hand only | near hand stays on the back. |

Later, not this plan: rope pull-up, kip-up, climbing the opponent.

## Rules

- Node 22. Focused tests per task; full suite, build and `moves:coverage -- --check` only at gates. One commit per task, id first.
  Never push.
- Work on Procreate Lou (`thesz-procreate-v1`) and `george-roster-v1`. Ignore `thesz` and `thesz-front3q-r1`.
- Never claim a get-up "reads" or "looks right". Report measurements and misses first; Derek judges.
- Films: same seed AND the same logged sell plan for before and after (compare the manifests; mismatch = re-film).
- New raw film folders: add them to `.git/info/exclude` (raw frames are not committed; VS Code's 10k item limit).

## Stage 1: the table and the runner (no new look yet)

- **T1.0 (D7)** Under `?getups=v1`, drop `roll` from `planSells` (weights renormalised over the rest); flag off byte-identical.
  Tests: 1000 seeded plans for `theatrical` supine contain no roll with the flag on, and equal today's plans with it off.

- **T1.1** `src/animation/getUps.js`: the schema (D1), a validator (`validateGetUp`), and today's two rises re-expressed as
  `legacySupine` / `legacyProne` entries that sample to exactly `GETUP_SUPINE_POSES` / `GETUP_POSES`. Tests: validator
  rejects a missing standing key, a `flipAt` without `after`, keys out of order; the legacy entries sample byte-identical.
- **T1.2** `Skeleton.updateGetUp` takes a get-up entry instead of choosing the table by `lying`; with `?getups` off it is
  handed the legacy entry. `riseFixFlagOff` fixture and every rise test unchanged.
- **T1.3** The flip: when `t` crosses `flipAt`, `Wrestler` flips `facing` once and the skeleton samples `after`, mirrored about
  the planted point named by the entry (`pivot: 'nearKnee' | 'farFoot' | ...`). `move()` does not re-face during a get-up
  (it is already in `GROUNDED_FACING_LOCK`) or on its first standing frame when the get-up already turned. Tests: one flip,
  at `flipAt`; pivot point within 1 px across the flip (Node stub rig); interruption (pin, pickup, reset) restores facing,
  hand and depth state; no double flip.
- **T1.4** `chooseGetUp(ctx)` (D4), pure, with tests: eligibility per field, deadband, no repeat, seeded.

## Stage 2: `backKneeHurt`, then STOP (G1)

- **T2.1** Pose sheet first: draw the reference frames (Bret 64-68) next to Lou and George posed by the proposed keys, both
  facings, at `t` of each key, as one page `research/animation/getups-2026-10/g1a/index.html`. Keys only, no film.
  **⛔ G1a: Derek OKs the keys** before anything is tuned.
- **T2.2** Implement `backKneeHurt` and its `backSell` variant. Film Lou and George, suplex receiver, opponent behind (turn)
  and in front (no turn), 1×, both facings, from the last down frame to 2 s standing. Before = today.
  Report misses first: largest per-part step anywhere in the rise and at the flip; both feet's world displacement while
  planted (target ≤ 3 px); push hand's distance to its target inside its push window; the back-sell hand's waist-contact
  error; frames between the flip and standing; any re-face on a standing frame (target 0); rise duration vs today.
- **T2.3** Normal-speed loop strip in both facings first (CLAUDE.md), then the viewer
  `research/animation/getups-2026-10/g1-viewer.html` (today | new, per row) and a handoff entry.
- **⛔ G1 questions:** 1. Does he face the opponent by the time he stands? 2. Does he still rise "antigravity"? 3. Keep?

## Stage 3: `frontKnee` and `backTuck`, then STOP (G2)

Same pattern as Stage 2 (pose sheet ⛔ G2a, implement, film, viewer). `frontKnee` must also report the near forearm's step at
the roll swap and at hold → rise on George (today 33-44 px; target ≤ 3 px).

## Stage 4: selection on, then STOP (G3)

- **T4.1** Wire `chooseGetUp` into `_startRiseUp` / `_startQuickRise` under `?getups=v1`. Film 10 seeded matches' worth of
  rises (Lou and George), list which get-up was chosen and why, and the repeat count.
- **⛔ G3:** Derek watches a normal-speed reel. Promote `getups` to default? (Then the legacy entries stay as the `=off` path.)

## Stage 5: re-check George's parked items, then STOP (G4)

- **T5.1** Re-film George's back sell (`suplex`, `suplexFlip`, both kinds) with `?getups=v1` on, same seed and sell plan, and
  put it beside the G9 films. Report the parked George misses again: peak knee flex, near forearm/hand pixels over the thighs
  or trunks while the hand is behind him, the near-forearm step at the rise start.
- **⛔ G4 (Derek):** does George still need `legScale` (G10a) or the thigh mask (Stage 11)? Anything still needed goes back
  to PLAN_GEORGE_TRANSFER as Rev 5.

## Done means

Under `?getups=v1` every rise in a match is one of the authored get-ups, ends facing the opponent with no standing-frame
mirror, and has a visible push; Derek approved G1-G3; flag-off is byte-identical to today.
