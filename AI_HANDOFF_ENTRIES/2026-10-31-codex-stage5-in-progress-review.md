# For Opus / Sonnet: Stage 5 integration review in progress

2026-10-31 · Codex, requested by Derek. Snapshot HEAD `c4d657d`; active uncommitted soak/promotion-tool work exists. No runtime/tool edits by this review; do not mistake this snapshot for Sonnet's completion report.

The current direction is appropriate: make the AI generate corner opportunities naturally, prove live flow, then enable the approved behavior. T5.1 is committed, per-style cornerWhipOdds=0.35 for eligible open-ring whips, ropes-escape branch unchanged. AI already holds down on half of eligible charges; the earlier plan's suspected missing low-input path is not a current defect. `grapplesCandidate` remains opt-in in the inspected source.

At review time the saved data contains eight v1 soaks (four matchup orientations across both gaits), 24 reported completed chains, zero pageErrors, and two failures; the interrupted default Lou/George file reports 20/20 ok. These are saved reports, not new soak runs by Codex. Reran `tests/aiCornerWhip.test.js` and `tests/corner-ai.test.js`: 10/10 pass on Node 22.

## Two promotion checks still needing attention

1. `soak-lou-george-v2-v1.json` contains TWO orphanRescue failures, p1 and p2 from lockup, at matchSec=600. Source inspection suggests time-limit teardown: `_endMatch` clears lockupState, while the watchdog can still see wrestler state lockup during the banner. Confirm with a targeted end-at-lockup reproduction and compare legacy behavior. This is not evidence of a general mid-match freeze. Do not report this soak as failure-free or silently filter the event; either repair teardown and verify or explicitly resolve/classify the gate with Opus. The written T5.2 gate currently blocks promotion on any orphanRescue.

2. The soak's `stages.sell` currently means `w.state === 'selling'` immediately after cornerCharge. That records the 150 ms hit reaction, not the actual prone head/gut clutch driven by `_sell` while state is down. Further, complete is awarded on down→standing or pin without requiring all intended stages or a sampled clutch. Thus 24 complete chains prove less than the plan's full down/sell/recovery chain. Observe the actual `_sell.plan[_sell.i]` clutch at the expected part after down, count/label it separately from the reaction, and require it for a full chain (or explicitly classify a legitimate early pin/interruption separately). Existing detailed G3f captures establish forced clutch in scripted cases, but this live soak should verify its own claim.

## Balance and efficiency

George/Kowalski v1 reports two 600 s draws in each gait, versus the small off sample of 64, 600 and 498.2 s. Lou/George v2 also has two time-limit draws, but its off/default sample also draws. These are tiny, unpaired random samples with different stopping criteria, so they do NOT prove a regression. Present them for Derek's match-pace decision rather than retuning personalities to make the soak collect chains faster. If the difference remains concerning, use equal fixed budgets and seeded starts to investigate.

Keep the known visual polish parked. Avoid re-running the entire long matrix for monitor-only edits unless the missing observations require fresh data; a small targeted capture can verify the new monitor. If gameplay teardown changes, rerun affected match-end and integration cases. Keep promotion pending until the recorded failure and evidence gap are resolved, then finish the written gates and Derek's G5 play check.

Validation of this docs-only note: `git diff --check`.
