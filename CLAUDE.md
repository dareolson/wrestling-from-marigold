# Wrestling from Marigold: repo rules for Claude

## Session start
- Read this file, the Status in [AI_HANDOFF.md](AI_HANDOFF.md) and the active plan's next task. Nothing else until the task needs it.
- Never read AI_HANDOFF_ARCHIVE.md or BUILDLOG.md whole; grep them for what a task names.
- Roles: Opus plans and reviews, Sonnet executes plan tasks, Codex builds art/tooling. Derek is art director and judges every visual result.

## Commands (Node 22 only: `.nvmrc`, `engines` ">=22 <23"; other versions fail)
- Full suite: `npm test` (`node --test tests/*.test.js`). One file: `node --test tests/<name>.test.js`.
- Build: `npm run build`. Move coverage gate: `npm run moves:coverage -- --check`.
- Dev server: `npm run dev` serves 127.0.0.1:5173. Tools in `tools/debug/` take `WFM_URL=http://127.0.0.1:5173` (and `WFM_P1=<rig key>`).

## Git
- Push only to the SSH remote URL (HTTPS push returns 400). Pull before pushing. Do not push unless asked.
- Never push unreviewed Codex work; check the branch before committing (shared folder, other sessions switch branches).

## Judgement rules
- Never claim a move "reads", "looks" or "sells" right. Report measurements and misses first; Derek judges.
- Derek's visual bug reports are real even when measurement finds nothing.
- Procreate Lou (`thesz-procreate-v1`) is the art bar; do move work on it.
- Ignore the old rigs `thesz` and `thesz-front3q-r1`: their misses do not count; don't fix, don't retire.

## Writing and checks
- Status in AI_HANDOFF.md ≤ 40 lines: replace it, don't append. Handoff entries go in `AI_HANDOFF_ENTRIES/`.
- Plan Progress lines ≤ 3 lines: sha, result, misses. Details go in the commit message.
- Focused tests per task; full suite, build and coverage only at gates. Docs-only changes get `git diff --check`, not the suite.
- Before a full G-package, make one normal-speed loop strip in both facings for Derek to glance at.
- When Derek asks for a "link", give a clickable markdown link, not a path or command.
