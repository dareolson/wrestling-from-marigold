# Token efficiency plan — 2026-10-25 (Claude/Opus)

Builds on `SYSTEM_EFFICIENCY_AUDIT.md` (Codex). Do not start Phase 1 while another
session is working through `PLAN_GEORGE_TRANSFER.md`. Phase 1 rewrites files that session reads and writes.

## Where the tokens go (measured)

| Source | Size | Read when |
|---|---|---|
| `AI_HANDOFF.md` | 599 KB, about 150k tokens | Its protocol says "read this file before proposing changes" |
| the Status summary inside it | 31 KB, about 8k tokens, 450 lines | Every resume |
| `PLAN_GEORGE_TRANSFER.md` | 64 KB, about 16k tokens | Every task. Progress lines run up to 800 words each (T8.3) |
| `BUILDLOG.md` | 160 KB | Sometimes |
| Per-task ceremony | full suite + commit + plan Progress line + handoff entry + status paragraph | After every task, including documentation-only tasks |
| Late visual proof | G6 → G7 → G8 full review packages | Each rejection repeats a whole package |

Biggest cost: each session re-reads long prose logs and then writes more of it.
Code and tests are a small share.

## Phase 0: now, safe alongside the other session (Derek only, no file edits)

1. **Model per job.** Opus is for planning and review only. Sonnet runs plan tasks
   (already the rule, see memory). Haiku or Sonnet handles mechanical work: filming, packaging, doc trims.
2. **New session per task block.** Do not run one long conversation through several
   tasks. A new session plus a short resume note costs less than carrying the whole history.
3. **Screenshots on request.** Each image read costs tokens. Ask for numbers first and
   look at one strip, not a whole package.
4. **Shorter briefs to the builder.** Tell it: "Progress lines ≤ 3 lines, details go in the commit message."

## Phase 1: at the G8 checkpoint (after the other session stops)

1. **Split `AI_HANDOFF.md`.**
   - Keep the file to Protocol, Roles, Priorities and a **CURRENT.md-style status of ≤ 40 lines**:
     branch/commit, dirty state, active plan, exact next task, open misses, flags, links.
   - Move the Status summary history and the Handoff Log into `AI_HANDOFF_ARCHIVE.md`
     (unchanged text, so no decision is lost).
   - Change the protocol line to: "Read the status. Open the archive or entries only when a task names them."
2. **Add a repo `CLAUDE.md` of about 30 lines.** Cover the Node 22 pin, `npm test` /
   focused test commands, the dev URL, "never claim it looks right", the SSH push rule,
   "status ≤ 40 lines" and "Progress ≤ 3 lines". Claude loads this automatically, so the
   facts stop being rediscovered or pulled from memory files.
3. **Compress the plan files.** In `PLAN_GEORGE_TRANSFER.md`, `PLAN_SUPLEX_RISE.md` and
   `PLAN_MOVE_PERFORMANCE.md`, replace each finished Progress paragraph with
   `T8.3 8a816ca: around path; holdW .7; 3 deviations, see commit`. The detail already
   lives in the commit messages (`git show <sha>`).
4. **Cap the plan template.** Each task gets a goal, files, a check and a stop condition.
   Each Progress line: sha, one result, any miss.
5. **Prune memory.** About 40 memory entries, several stale (G4/G5/G7 "awaiting").
   Merge them into about 10 current entries.

## Phase 2: change the work loop (applies from the next move)

1. **Quick check before the package** (audit #1). One normal-speed loop in both facings,
   one strip, Derek glances at it. Build the full G-package only after he says the
   direction is right.
2. **Right-size checks** (audit #5). Run focused tests per task. Run the full suite,
   build and coverage at the gate. Documentation-only tasks get a diff check.
3. **Commit per gate, not per task.** The builder commits locally per task if it
   wants to, and squashes or summarizes at the gate.
4. **New-move intake** (audit rec 5). A 5-line note covering what the move reuses and
   the one new problem. No new framework.

## Phase 3: the next time someone edits film tooling (not before)

1. Set the seed before game init in `aftermath_film.mjs` and record the seed and sell
   plan in the manifest (audit #3). This removes the 24-run search for the right sell kind.
2. Replace the per-gate scripts (G4/G6/G7) with one parameterized package script (audit #4).
3. Commit `tools/debug/forearm_count.mjs` together with the modified film tool (audit #7).

## Not doing

- No rewrite of the animation architecture. No reopening of suplex decisions or parked scope.
- No editing of history: archive text is moved, not condensed.
- No forecast of percentage savings (audit verdict). Judge from Derek's usage page over the next week.
