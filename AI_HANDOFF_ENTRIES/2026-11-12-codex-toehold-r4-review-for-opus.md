# Codex review for Opus: T3.0 r4

Reviewed `2f7ba29` against `17d578b` on 2026-11-12 at Derek's request. Review only; no animation changes or gate approval.

The grip correction and 4a grounding are supported by the saved reports: sampled heel/toe gaps 0–1.3 px, no pinned joints, 4a knees 0–3.9 px above the mat. Receiver is stomach down in the held stills. However, keep T3.0 open for the following findings.

## Findings

1. **P1 — Still 3 is not kneeling.** `tools/debug/toehold_t30_stills.mjs:144` assigns `3-kneel` only the common cost, with no knee-to-mat condition. The optimizer buys grip reach/foot height by lifting the attacker. Reports show knees **65.4–69.4 px** above the mat for Lou attacking George, **38.3–41.1 px** for George attacking Lou, both facings. The George-left still visibly stands/crouches over the trapped leg. I independently replayed its saved authored pose and reproduced knees 41.1/38.3, seat 85 px, grip 0/0. Add a kneeling constraint to still 3 and recheck reach; do not take its zero grip gap as approval of the pose.

2. **P1 — Fist pounding still lacks demonstrated contact.** `FISTS` at `tools/debug/toehold_t30_stills.mjs:126` measures the lowest pixel of the entire forearm plus hand, not a fist contact patch, against the receiver root y. It does not establish hand contact or a planted contact phase. The saved far-arm measurements for Lou receiving are **+6 to +30 px** over the whole preview: under this metric that arm never lifts above the stated mat line. George receiving reaches +23 px; near-arm extrema are +3/+6 px. The progress note's “3–23” range omits Lou's far-arm +30. Prone camera depth can explain some y displacement, so these numbers alone do not prove penetration either. Use an explicit contact point/local mat target for each fist, show lift → strike → brief contact → lift, and inspect both arms in motion. Fist contact is absent from the optimization cost; this commit measures rather than fixes it.

3. **P2 — The committed review page loses all held animations on a fresh checkout.** `.gitignore:27` excludes every `*-sell-*.png`; `git ls-files` confirms none is tracked. The page script at `tools/debug/toehold_t30_page.mjs:34` unconditionally replaces the tracked stills with these missing files every 50 ms. Opus/Derek on another checkout get broken images for all 12 held rows unless they regenerate first. Ship a compact motion artifact or explicitly retain static images when frames are unavailable. This is especially relevant because the movement is the requested selling change.

4. **P2 — Current poses cannot be reproduced by the default render command.** The accepted hill-climb results are saved in reports, but `toehold_t30_poses.mjs` still has the pre-search guesses. Rendering without SEARCH discards r4's chosen poses; SEARCH uses unseeded `Math.random()` and gives a different result. Add a saved-pose replay mode or promote the selected poses as the preview source. I replayed one case by exporting its report's `authored` value as `STILLS` and using `STILLS_MODULE`; this existing hook is sufficient for a small replay helper.

## Remaining visual limits

- Lou-on-George 4b holds the foot 23.9 px above the attacker hip, outside the stated 0–14 px below-hip band; already disclosed in the plan. Seated knees being raised is not itself a defect for the legs-out option.
- The fixed 380×280 crop clips George's head in the left-facing kneel and cuts receiver fists at the edge in several right-facing stills. Widen/recenter the review crop so contact can be judged.
- Whole-leg layering, boot-art fit and the entry/roll transition remain unapproved. There is still no playable step-over toe hold in this commit; these are separate posed previews. Derek must choose 4a/4b before T3.2.

## Verification

- Inspected all four report files, latest source diff, and representative stills from both pairings/facings.
- Node 22.23.1 syntax checks passed for both toe-hold scripts.
- Replayed saved George-on-Lou left `3-kneel` in local Chrome without running the search; image and metrics reproduced. Temporary evidence: `/tmp/toehold-opus-review/george-lou-left/` (not a durable shared artifact; committed report and still carry the same evidence).
- No full suite rerun: latest change is confined to preview tooling/evidence, and this review changes documentation only.

Suggested order for Sonnet: constrain still 3's kneel, establish actual fist contact, make the motion page portable/replayable, then return the two sit-back options to Derek. Keep the successful grip targets and 4a grounding while doing that.
