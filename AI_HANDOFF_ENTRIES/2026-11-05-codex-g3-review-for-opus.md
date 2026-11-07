# For Opus: G3 integration review

2026-11-05 · Codex · Reviewed through `dfea763` (source, tests, saved G3 page and tooling). No fresh browser playback or visual approval. No runtime changes, commit or push.

## Findings, in priority order

1. **Exceptional-by-fatigue is implemented in the selector but not wired to the big throws.** `chooseFall` returns exceptional for bodySlam/suplex/backBodyDrop below 25 stamina, and the pure test verifies it. However `_doBodySlam`, `_doSuplex` and `_doBackBodyDrop` still obtain their tiers directly from `moveTier`, which ignores receiver stamina. None calls `_pickFall`/`chooseFall`. Actual big throws therefore stay heavy unless the slam query override is supplied. Factor receiver-aware tier selection into a shared helper used by the throw executors, retaining the slam override and flag-off behavior; do not route throws through standing-fall animation. Add an executor-level check for a tired receiver, not another pure selector assertion. Define whether fatigue is sampled before damage or at impact.

2. **Natural-play coverage is not established by the capped match.** The G3 page explicitly reports two 150 s full-stamina AI runs with zero strike falls; its displayed 120 s match caps both men at 36 each frame. That is a valid demonstration, not evidence of ordinary encounter frequency. Before default promotion, measure uncapped matches: landed strikes, stamina immediately after damage, selected knockdowns and recovery windows. Decide whether a short-lived stamina pool is the intended wear-down signal. Do not silently retune global recovery or the approved 35 threshold to force a result.

3. **Rear-hit direction is read after the sell, from facing that auto-turns.** Strike callbacks call `_staggerOrFall` after their 110–150 ms sell, and `_pickFall` then compares attacker position with the receiver's current facing. `move` auto-faces the opponent without `_facingLock`; the G3 harness explicitly holds facing for its rear examples. Capture attack side/facing at the actual hit and carry that context through the reaction if rear-hit selection is intended to work naturally. A held-facing test should not be the only proof. Likewise, the threshold currently checks stamina at sell completion, not literally immediately after damage; define the sampling moment and test the boundary.

4. **Ring-room selection is best effort, not containment.** If no fall fits, `chooseFall` returns the least-overshooting candidate and labels it cramped; it does not move the body inside the ring or suppress the fall. The G3 page acknowledges this. Before allowing more automatic falls near ropes, show one boundary case per facing and define an explicit fallback/landing adjustment. Avoid describing the selector as guaranteeing that the body stays inside.

## Assessment

The pure selector, move compatibility table, explicit reasons and opt-in wiring are useful incremental changes. Catch, collapse and spill choices are now reachable from strikes, rather than only isolated animation calls. The page is appropriately candid about artificial stamina/facing constraints. The remaining work is primarily integration and match frequency, not another collection of fall types. Preserve Derek's direction on heavier impacts and the separate front/rear snapmare setups.

The corrected snapmare preview harness from the prior Codex turn remains a local change in `tools/debug/falls_probe.mjs`; this G3 commit does not incorporate or replace it. Older G2 front-staged snapmare clips remain invalid reversal evidence. See the [snapmare note](2026-11-05-codex-snapmare-preview-correction.md).

## Validation and next step

Fresh Node v22.23.1: `node --test tests/falls.test.js tests/restPoses.test.js` — **37/37 pass**. The selector's seven rule tests plus threshold constant test do not establish the throw wiring or uncapped-match behavior above. Commit reports suite 1216/1216, build, coverage and flag-off pass; not rerun for this review. No fresh animation capture. `git diff --check` passed for the report.

Recommend keeping STOP at G3. Opus scopes the tired-throw tier connection and hit-time context, then gets uncapped match evidence before asking Derek about promotion. Update the Status: it still says STOP at G2 despite HEAD completing G3.
