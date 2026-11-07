# Opus handoff: grapples Stage 5 in progress

Claude (Opus), 2026-10-31. For the next Opus chat. Read this, the Status in AI_HANDOFF.md, and PLAN_GRAPPLES.md's Progress plus "Later stages". Nothing else until a task needs it.

## Where it stands
- Branch `story/marigold-opening`. Pushed through `baa9f37` over SSH (HTTPS returns 400). Pull before pushing.
- PLAN_GRAPPLES Stage 3c is done and approved: whip, diagonal and corner runs, rope hit, corner daze, charge, fall, face / stomach sell (G3f). All behind `grapples=v1`.
- Stage 5 is written (T5.1 AI uses the corner, T5.2 live soak, T5.3 flip the default). Derek has the Sonnet prompt. It stops at G5 for Derek to play a match with no flag.
- `T5.x` may be running or finished when you start. Check `git log` and running processes first; a "he's done" has come early once, before any commit.

## When Sonnet reports
1. Check the branch, `git log`, `git status`, and `ps` for `tools/debug` runs.
2. Read the commit bodies and the diff; do not rely on the report.
3. Rerun on Node 22 (`source ~/.nvm/nvm.sh; nvm use`): `npm test`, `npm run build`, `npm run moves:coverage -- --check`, and `env -u WFM_URL node tools/debug/grapples_flagoff.mjs`.
4. Update Progress and Status if Sonnet missed them, log the gate in Derek's words, write the next task, and hand Derek a prompt for Sonnet.

## After G5
Derek decides: match pace, the attacker's 330 px retreat after the charge (`CORNER_CHARGE.backOff`), the diagonal press replacing a suplex or headlock, and the polish list. Push only when he says.
Options he has named or been offered: running splash, corner strikes, corner grapples, whip reversals; Stage 2 hands (needs his failing-hands list); Stage 4 lockup moves. A Sonnet agent is writing a report on future moves; Derek said to ignore it for now.

## Polish list (parked, do not fix unasked)
Cross-body hip overlap and missing wrist contact on the whip; rope launch-frame step 30-80 px; rope turn frame 77-137 px raw; body 12-13 px past the rope mid-fall at near corners; George's face sell 11-19 px short and his wrists at hip height; face sell one hand only; exit step has no walk cycle; George charges less than Lou (his stall and taunt timers).

## How Derek works
- Opus reviews and writes self-contained tasks in the plan; a separate Sonnet chat builds them. Never spawn subagents. Give Derek a ready-to-paste prompt, ending "Only say you are finished after the commit is made", naming the files to leave out of the commit.
- Other sessions (Codex, story work) share this folder. Their uncommitted files stay out of grapples commits. MOVE_CATALOG.md currently holds another session's edits.
- Derek's eye outranks measurement. Report numbers and misses first. Approved looks stay as they are unless he reopens them.
- Lead with the plain result, short. He wants clickable links, and `open` an HTML viewer in the browser for him.

## Lessons from this run
- Read a helper before naming it in a task. T3c.4's return line aimed at the far rope, not the attacker, and a 48 px gate hid it. Codex caught it.
- A check must run past the end of the move: a pop moved from 267 ms to 583 ms and the proof stopped at 550.
- Report raw numbers beside adjusted ones (flip step 99.8-139.7 raw, 12-27 mirrored).
- Proofs that place a man by hand can hide a gap: the AI never whipped to a corner until Stage 5 caught it.
- New states need lifecycle checks: interrupted, stale callbacks, leftover grips.
- Codex reviews are worth folding in. Verify the claims, then fix or say why not.
