# For Opus: falls G2 review

2026-11-05 · Codex · Derek requested latest review and note for Opus. Reviewed through `7cadac0` on `story/marigold-opening`, including `9ca73a6` and `8676e8c`: source, G2 page/evidence, backward Lou contact still and adjacent saved joint rows. No fresh browser playback, visual approval, runtime edits, commit or push.

## Assessment

The shared system now covers the intended major throw paths, distinguishes supported catches/seated collapses from back bumps, gives the suplex attacker his own landing, and supplies heavier tiers by move. Atomic drop correctly remains outside knockdown treatment. Per-rig hop scaling addresses the earlier George/Lou amplitude mismatch. The split between unsupported drop and supported follow-through is useful groundwork for situation-based selection. Keep the G2 boundary pending Derek's judgment; earlier positive feedback was on earlier previews, not automatic approval of this package.

## Priorities before broadening selection

1. **Backward contact arm transition needs a focused check.** The plan reports an 84 px contact-frame arm step (Lou, scale 1). Independently inspected saved `g2/after-gl/rows-backward-lou-r.json`: frame 31 falling -> 32 down moves the near wrist from (598.88, 372.27) to (603.70, 447.77), about 75.7 screen px, consistent with that scaled report. The prior frame also moves fast, so displacement alone does not prove a seam defect. Compare the last sampled fall pose, the exact t=1 pose, and the first down pose at matched time; attribute translation versus angular change and flag-off versus candidate. Show the short sequence at normal speed before calling it expected impact velocity or adding a smoothing fix. The saved G2 report says this grew from about 20 to 84 px after retiming. Prioritize this above the small rebound-height shortfall.

2. **Supported-contact timing is still distinct from response start.** `FALL_BALLISTIC` gives sitBack/spill 220/240 ms of supported follow-through after pelvis contact and kneesForward 300 ms after its first supported contact. `startFall` starts `_startLanding` only in tween completion, after those tails. Thus the response is not triggered at first contact for these paths. This may be intentional if the keys already contain the catch/compression; verify and label first support -> keyed absorption -> final-rest response explicitly. Do not apply the slam's immediate-response rule mechanically and double the keyed reaction. Make sure the G2 page's DOWN/contact marker is not read as first physical support.

3. **Treat the piledriver's exceptional rebound as its own visual decision.** The move's head impact and the pelvis landing at 1.8 s are different events; the latter starts the limp, exceptional response about 0.56 s later. That is intentionally different from the slam and should be judged as a complete head-hit/crumple/body-contact sequence. Check whether the large late hop fits the spent-body intent. The 16.3 px George result versus a 14–16 tuning range is a minor tuning question compared with phase and silhouette. No recommendation to move damage to pelvis contact.

4. **Stage 3 should preserve match opportunities.** Current landing duration blocks pin/pounce eligibility; tiers therefore affect interaction timing as well as appearance, even though damage remains unchanged. When situation selection or low-stamina strike knockdowns arrive, record response duration and earliest legal pin per selected fall, and check both actors' interruption/cleanup in the suplex. Keep exceptional reactions selective; a worn-down opponent need not always make a larger active rebound. Fatigue can instead produce a collapse with less recovery effort.

## Remaining evidence limits

George sell elbow violations remain acknowledged debt, not covered by the pure response guarantees. The previous 3.73 rad knee report was an audit wrapping error; the newer report identifies cap saturation and the soft offset fix instead. Do not repeat 3.73 as a confirmed physical knee bend. Backward rebound 5.6–5.8 px versus 6–10 is tuning guidance, not a gate failure by itself. Painted hand support remains approximate. The spill is still a concept awaiting selection/integration. No need for a broad rewrite.

## Suggested next block

Derek reviews G2 tiers and the complete fall sequences. Opus scopes a small contact/phase diagnostic for the backward arm transition and supported variants, then continues situation selection and strike knockdowns with explicit pin/recovery timing. Keep falls opt-in until Derek explicitly chooses promotion; “eventually standard” is the intended destination, not permission to skip the remaining review.

## Validation

Fresh Node v22.23.1: `node --test tests/falls.test.js tests/restPoses.test.js` — **29/29 pass**. G2 HTML references **81 frame directories; all exist** (directory check only, not complete image decoding/playback). Latest commit reports full suite **1208/1208**, build, coverage (26 baselined), and flag-off pass; these were not rerun for this docs-only review. `git diff --check` passed after writing.
