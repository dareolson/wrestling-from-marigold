# Handoff for the next Opus: project manager on PLAN_LIGHT_MOVES — Claude Opus, 2026-11-10

**Your role (Derek 2026-11-10).** Project manager. Write contracts and new plan stages, review Sonnet's work at every STOP before Derek sees it, write the gate line in Progress after Derek's verdict, push only when Derek asks. Sonnet executes tasks; Codex builds art and sometimes clip candidates; Derek relays by hand (never launch subagents). Keep Opus out of per-task work: tokens.

**Review checklist at a STOP (what worked this session).**
1. `git status` and `git log` since the last gate: Codex often leaves work uncommitted in the shared checkout. Commit it yourself as an *unapproved candidate* if it would otherwise get swept into Sonnet's next commit.
2. Read the diff: flag off must stay byte-identical (`lightCandidate()` gates); new runtime options opt-in; guards match siblings (e.g. `this.scene.moveRuntime`).
3. Focused tests (Node 22). Full suite, build, coverage only before a push.
4. Check each measure measures the intent (painted palm/sole anchors, not joints or proxies).
5. Look at 2-3 stills yourself (Read the PNG) and list what is drawn wrong as misses. Never say it reads/looks right; Derek judges. `open` the page and give a clickable link.
6. Loop frames (`s*.jpg`) must be gitignored before committing a page; stills are committed.

**This session.**
- Deleted 3 old Codex waistlock scripts (results live in their REPORT.md files).
- IDEAS.md + plan: Stages 5 (body slam), 6 (whip-return attacks), 7 (snapmare from the tie-up via a pivot), GP promote; "Order and roles" section.
- **G2 ankle lock bent boot approved** (0d2e0da, Derek: "ankle lock looks good").
- Derek rejected the old `armBar`; Codex's kneeling `armBarV2` committed unapproved (15e7d5e) with my fixes; **T2.7** written for Sonnet.
- Stage 1 kick: T1.1 e27939c, round 2 db39dbb (Codex's stomach-kick revision), round 3 8d084c4 (Derek: keep Kowalski's stomp, same for Lou via `frontKickV2Lou`/`Wrestler.rigId`, George sells a gut kick `GUT_STAGGER`). Reviewed by me 2026-11-10: diff clean, flag off unchanged, `kneeRestart` plant opt-in, 104/104 focused tests.

**Open, for Derek.**
- **G1 verdict on round 3** ([page](../research/animation/light-moves-2026-11/t1-5/index.html)). My misses from the stills: at impact (0.3 s, Lou on George right) Lou leans far back and his kicking boot is hidden inside George's belly (sole -24.9 px past it); Lou's support knee sinks to 2.02 rad; at 1.1 s George's folded-over hands land on Lou's chest (he only stumbles back a little). Kowalski/George/Guido support slides over the 1.5 bar (3.6 / 4.3 / 15.9 px/frame).
- T2.7 arm bar after G1. T6.1 and T7.1 need Derek's input maps; T3.0 and T6.4 need footage.
- Untracked `research/animation/light-moves-2026-11/kick-working/` + `tools/debug/front_kick_working_page.mjs`: Codex's working page for round 2, superseded by db39dbb's t1-4 page. Delete with Derek's OK.

**Repo.** `story/marigold-opening`, 56 commits ahead of origin, none pushed. Last full suite 1263/1263 (before this session); run suite, build, `npm run moves:coverage -- --check` before any push. Push via SSH only.
