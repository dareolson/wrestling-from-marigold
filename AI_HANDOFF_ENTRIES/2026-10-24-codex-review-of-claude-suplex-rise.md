# Review of Claude's latest suplex-rise handoff

2026-10-24 · Codex · reviewed through `451361f`, at Derek's request.

Latest work is in `PLAN_SUPLEX_RISE.md` Progress and commits `b07484d`,
`ea61369`, `03b0a0a`, `451361f`. The dated elbow packet is older. This review
prepares the next Opus brief; it does not authorize promotion or change runtime.

## Assessment

Successful completion of the proposed first session (Stages 0–1), with useful
evidence and appropriate restraint. The larger performance goal remains open:
Stages 2–5 have no completion entries and the latest commits add capture and
comparison tools, not a planted support hand or standing protective motif.
Credit Codex for the original sell-art implementation; Claude reviewed/landed
it, added a flag-off rise regression test and built the new capture pipeline.

What went well:

- Four scenarios cover Lou and George receiving, each facing both ways, with
  flags off/on. Manifests include game timestamps, rig IDs and texture runs.
- Fixed game stepping and a pinned tween delta prevent screenshot latency
  from advancing the performance. Event matching is stronger than comparing
  arbitrary screenshots from independently running matches.
- Claude checked Opus's speculative R1 against observations and made no
  unnecessary fix. Lou's recorded grip runs are 366.7–1300 ms and
  5550–6266.7 ms after impact, with rise starting at 5516.67 ms.
- Scope stayed controlled: figure four, authored hammerlock and new art were
  left alone; George's lack of a grip donor is reported.

## Qualifications and corrections for Opus

1. **No brief flicker is narrower than continuous acting.** The <250 ms
   detector finds zero flickers in these seeded scenarios. Lou still has
   approximately 4216.7 ms between the last clutch grip sample and rise start,
   then a 33.3 ms delay before grip returns. This does not establish continuous
   pain acting or exclude flicker under other sell plans/down-time budgets.
   Do not simply keep grip art for four seconds: author and judge the motion.
2. **The baseline changes two flags together.** Off is no flags; on is
   `sellart=v1&aftermath=v2`. This proves the combined candidate comparison,
   not which flag caused every difference. Add an aftermath-only comparison
   when attributing recovery effects to sellart.
3. **The current sheet is static.** It supplies event close-ups and rows every
   100 ms from an underlying 30 fps strip. It has no timed playback control.
   A stepped capture can support real-speed playback, but the static sheet
   alone does not satisfy a review of rhythm at normal speed. Add synchronized
   playback using recorded game time, or an encoded 30 fps video.
4. **Raw frame availability is local.** Strip folders are intentionally
   untracked and the pairing sheet references them. They exist in this
   workspace, but a clean checkout will not contain them. Document regeneration
   and make the final review artifact portable. Do not claim this is already
   a self-contained handoff for another machine.
5. **A wrist plant is a geometry prototype.** D1/D2 initially use the far
   wrist because no registered support anchor exists. Holding it still cannot
   prove that painted palm pixels contact the mat or that the pose takes
   weight. Measure the painted contact once support art is registered; inspect
   minimum reach, hinge direction and extension as well as maximum elbow fold.
6. **Flag-off tests have a bounded claim.** The added test verifies null rise
   context and no appearance writes for four query forms. It is valuable,
   but does not prove the plan's broad 'byte-for-byte current behaviour' claim.
7. **Handoff discovery is stale.** AI_HANDOFF.md still foregrounds the prior
   Codex candidate and calls it uncommitted. Link this new plan/progress there
   when the next implementation handoff is written.

The inspected candidate rise-.34 close-up shows the near hand at the waist
and the far arm in the generic support pose. A single still cannot establish
sliding or full-speed acting quality; no visual promotion is implied here.

## Verification performed for this review

Node 22.23.1: fresh `npm test` passes **801/801**. Both new capture scripts
pass `node --check`; `git diff --check` passes before this documentation edit.
Reviewed plan, tool source, saved texture report and one actual rise close-up.
Did not regenerate the eight captures or independently rerun build/rig/play
checks; those remain Claude's reported Stage 0 results.

## Direction for the forthcoming Opus prompt

Continue from Stage 2, not another broad architecture audit. First measure
Lou's support trajectory and reachable plant interval in both facings. Prove
a reversible geometric plant, then give Codex a precise support-art request.
Keep the actual palm contact and unchanged timing explicit. Measure and author
the rise-to-standing pain motif, then deliver synchronized normal-speed
comparison and contact/handoff curves. Include interruption/fallback checks
and preserve default behaviour. Keep George, figure four and hammerlock out
of this pilot. Derek judges the final acting before promotion.
