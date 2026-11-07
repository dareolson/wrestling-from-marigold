# PLAN_CLEANUP: repo cleanup and backup (audit 2026-11-07, Opus)

Executor: Sonnet for T1/T4/T6. Work on `story/marigold-opening` unless a task says otherwise. Commit locally, never push (Opus pushes).
Tasks marked **[Derek]** wait for Derek's answer, recorded under Decisions. Do the unmarked ones in order.

## Audit findings

| Area | Finding |
|---|---|
| Time Machine | Destination "Drive 1" is configured but won't mount (not plugged in). Only local snapshots on the same disk. No off-machine backup is current. |
| Source art | `Sprite sheets/` (667 MB) is gitignored and not synced anywhere. It holds the four roster rig PSDs (`RosterNew/2026-10-18/{LouNew,GeorgeNew,Killer_Kowalski,GuidoNew}.psd`), the Lou Procreate master, and `AI Pilot/` (376 MB). **This copy is the only one.** |
| Git: story branch | `story/marigold-opening` is 33 commits ahead of origin (1adfc00 vs fb8c5ca). |
| Git: master | `master` = origin/master, 445 commits behind story. Story is the de facto mainline. |
| Git: side branch | `thesz-v2-profile-normalization` (local 20 ahead of its origin, last touched 2026-10-16). `git cherry` shows all 42 of its commits already on story. |
| Git: remote | `origin` is HTTPS for push, which 400s. Every push needs the SSH URL typed out. |
| Git: storage | `.git` is 1.9 GB, of which 1.67 GB is loose objects; the pack is 183 MB. Two `tmp_obj` garbage files. |
| Untracked | Codex sleeper-wrap PNGs (2) + 4 Codex `tools/debug` scripts (unreviewed, untracked on purpose per Status). `research/art/pinfall-concepts-2026-10-20/` (4.2 MB, has README). `AI_HANDOFF.md.bak` (older copy of the handoff; differs only in Status lines). |
| Ignored bulk | ~4.9 GB ignored outside node_modules/dist: `tools/debug/shots/` 402 MB, ~4 GB of review frame dumps under `research/animation/*/frames*`. All are regenerable from code. |
| Root clutter | 47 docs at repo root. Several are finished or historical with no code references (list in T4). Three evidence folders sit at root. |

## Tasks (revised 2026-11-07 by Opus after Codex review; low priority, falls work comes first)

### Done (Opus, 2026-11-07)
- Story pushed (fb8c5ca..1adfc00); PSDs tracked (69b2c90) and pushed; pinfall concepts committed (4e7401c); `AI_HANDOFF.md.bak` removed; push URL set to SSH.

### T1. Git maintenance (Sonnet, at a quiet point: no other session running)
1. `git gc` with default retention (NOT `--prune=now`). If `.git/gc.pid` exists, check `pgrep -fl "git.*gc"`; run only if nothing is running. Report `git count-objects -vH` before and after. Leave the `tmp_obj` files to gc.
2. Leave the six Codex sleeper-wrap files untracked in place (Status already records them). No parking branch until they're reviewed.

### T3. Side branch (Opus, after Derek OKs)
1. `git tag archive/thesz-v2-profile-normalization thesz-v2-profile-normalization`, push the tag, then delete the branch locally and on origin. The tag keeps its tip recoverable.
2. `master` stays as the last stable point (Derek, 2026-11-07).

### T4. Root docs into `docs/` (Sonnet, optional, after falls G4b)
Move only clearly finished docs to `docs/archive/`: `CLAUDE_V8_SURGICAL_FIX.md`, `CLAUDE_GEORGE_V9_BROADCAST_PASS.md`, `CHARACTER_ANIMATION_AND_MOVESET_GUIDE.md`, `ANIMATION_TOOLING_AND_PLUGIN_EVALUATION.md`, `JOINT_ATTACHMENT_REPAIR_PLAN.md`, `MOVE_PERFORMANCE_AUDIT.md`, `MOVE_REFINEMENT_AUDIT.md`, `SYSTEM_EFFICIENCY_AUDIT.md`, `FEEL_AUDIT.md`, `PLAN_SUPLEX_RISE.md`, `PLAN_RISE_HANDOFF.md`, `PLAN_MOVE_PERFORMANCE.md`, `AI_HANDOFF_TASKS.json`, `IDEAS/CROSS_MODEL_AGENT_ORCHESTRATOR.md`.
Keep at root (still policy or active gates): `CHARACTER_ART_RECOVERY_AUDIT.md`, `PLAN_PIPELINE_COVERAGE.md`, and everything else.
Evidence folders (`ARENA_LIGHTING_EVIDENCE/`, `FRONT3Q_CANDIDATE_EVIDENCE/`, `FRONT3Q_V5_GATE/`) go to `research/evidence/`.
1. `grep -rnF` each name first; if a test/tool reads it at runtime, leave it at root.
2. `git mv`. Fix incoming references (docs, entries, code comments) AND outgoing relative links inside each moved file (they now need `../../`). Don't rewrite historical prose beyond paths.
3. Check: a small script that resolves every relative markdown/HTML link in the moved files and in files that referenced them, and reports missing targets (zero expected). Open one moved evidence page in the browser. Then `npm test`, `npm run build`. One commit.

### T5. Frame dumps (parked)
Not deleting. Older captures may not be reproducible from current code, and HTML viewers depend on them. Disk has ~46 GB free. Revisit only if space gets tight; then inventory viewer dependencies first.

### T6. Close out (Sonnet, after T1 and T4)
Progress line per task here (sha, result, misses). Status in AI_HANDOFF.md only if T4 moved a file it names.

## Decisions (Derek)
- T2 backup: GitHub only (no Time Machine). PSDs in git: done.
- T3 delete side branch (tagged first):
- T5 frame dumps: parked.

## Codex review (2026-11-07, for Opus)

**Recommendation: proceed with the organization goal, after revising the execution details below.** Preserving source art and reducing navigation clutter are worthwhile. This review does not authorize executing cleanup or override Derek's recorded GitHub-only backup choice. I made no cleanup, branch, Git configuration, asset or remote changes.

### Changes I recommend before Sonnet starts

1. **Put source-art preservation first.** Do T2 before GC, branch parking, or deleting anything. A local commit is not an off-machine backup: Opus must push the PSD commit and verify the remote contains it before calling the backup complete. Since the plan assigns pushes to Opus, make this an explicit pause/return point rather than waiting until all T1/T2/T4 work finishes. Record the five source paths, byte sizes and SHA-256 hashes; verify those blobs from a temporary clone/download against the manifest. Keep their adjacent provenance/readme documents discoverable too. The four roster PSD paths exist and Lou's PSD is currently ignored, as the audit says. Report other source masters separately, respecting Derek's scope.

2. **Replace `git gc --prune=now` with normal-retention maintenance.** The storage finding is real: fresh `git count-objects -vH` reports 1.67 GiB loose / 182.88 MiB packed, plus two tmp objects. But immediate pruning removes the grace period for unreachable objects and is inappropriate as a routine first action in a shared repository. Absence of `gc.pid` does not establish that no writer is active. Coordinate a quiet point, use ordinary `git gc` (default retention), and inspect/report rather than manually deleting temporary object files. Preserve stashes/reflogs and avoid history rewriting. Recovering most loose-object space does not require pruning everything immediately.

3. **Park unreviewed work without switching the shared checkout.** T1.5's stash/switch/pop sequence can disrupt another session, conflict on pop, or strand work if interrupted. A separate worktree is preferable: copy exactly the six untracked files into an isolated branch/worktree, verify hashes, commit them there, and only then remove the matching untracked originals from story at a coordinated point. Do not remove an original if it changed during parking. Inspect whether the scripts depend on other untracked/generated inputs before describing the branch as a self-contained runnable package; explicitly mark it unreviewed. Keeping the files in place until coordination is also fine. Replace the ambiguous `node --test tests/` wording with the actual selected sleeper/waistlock test filenames under Node 22. The read-only source search found no runtime PNG loader, but a tracked tool comment does reference `throw_support_review.mjs`; do not equate untracked with unreferenced.

4. **Archive by role and resolve links from their source directory.** Moving finished plans is reasonable; “no code refs” does not mean a doc is obsolete. In particular the recovery audit is an art/provenance policy reference, and pipeline coverage describes a currently used gate. Consider retaining those at root or under `docs/standards/` / `docs/tooling/`, with a short root index, rather than labeling them historical by default. Resolve their role before the move. A mechanical filename replacement alone will break relative links INSIDE moved docs: e.g. `PLAN_SUPLEX_RISE.md` links to `AI_HANDOFF_ENTRIES/...` and another root plan. At `docs/archive/`, those destinations require different relative paths. Evidence READMEs likewise need internal image/data/code links rebased. Update both incoming and outgoing links, HTML/JS image paths and tooling strings, including ignored local viewers where relevant; do not indiscriminately rewrite an entire historical narrative. Clarify T4.4 as keeping the *archive file's location* unchanged, not exempting links inside it from repair. The proposed “zero old paths” search will also find the cleanup plan itself and legitimate historical labels: validate resolved targets with an explicit exclusion/exception list instead of blind replacement to satisfy zero matches. Tests/build/coverage do not validate Markdown or local review pages; add a local-link/file existence check and open representative moved evidence pages.

5. **Do not call all ignored frames regenerable yet.** Earlier review captures depend on old commits, seeds, rig versions and sometimes nondeterministic sell planning. Current code cannot necessarily reproduce the same evidence; some source captures may exist only locally. Deleting frame folders can leave retained HTML viewers black even though JSON/REPORT files survive. Before each deletion, map retained pages/manifests to image dependencies, preserve a compact playable evidence package for decisions, and record a reproducible command/commit/seed where available. Treat that inventory as the concrete T5 proposal Derek approves. `git check-ignore` is only an ignore-policy check, not proof that every descendant is untracked or disposable: inspect tracked descendants and untracked source art before deleting a directory. Keep screenshots that are the only reference for an unresolved visual issue. With ~46 GB free this should stay low priority.

6. **Branch retirement needs a recovery reference.** Patch equivalence from `git cherry` is useful, but is not identical commit ancestry or proof that branch-specific evidence/merges are redundant. Before deleting the side branch, record its tip and preserve a named archival tag/ref (and push it only under the separately approved remote work). Check branch-only commits/tree differences and worktree use. Prefer safe `git branch -d` where ancestry permits; require a documented equivalence check before `-D`. Keep deleting the remote branch and moving master behind Derek's T3 decision. If master is advanced, first inspect the GitHub default branch/CI/deployment consequences; do not silently turn a stable point into mainline.

### Smaller notes and current-state corrections

- The SSH push URL change and committing the recovered pin concepts are sensible small tasks. Keep the pin concepts explicitly exploratory in the existing README; no gameplay integration implied.
- The audit's branch-ahead count is now stale: fresh local refs show `origin/story/marigold-opening..story/marigold-opening` = **0**, consistent with T3's recorded push. Re-read state immediately before actions; do not run a fetch/push during this review just to refresh the audit.
- Keep each structural action focused and reversible. T4's reference updates belong with its moves; final Status should link the resulting plan/index and state which source-art backup was actually verified.
- Do not expand this cleanup into runtime refactors, asset regeneration, move polish or a new deployment workflow.

**Suggested order:** verified source-art backup → small commits/config cleanup → isolated parking of unreviewed work → document/evidence organization with link checks → optional branch retirement and disposable-cache deletion after their recorded decisions. GC at a quiet point can be done independently after preservation.

Review validation: read-only checks of Git objects/branches/worktrees, PSD paths, targeted references and representative relative links. `git diff --check` passed after adding this review. No suite/build needed for this document-only opinion.

## Progress
- 2026-11-07 Opus: 69b2c90 PSDs + 4e7401c pinfall art, pushed; .bak removed; SSH push URL. Codex review accepted with simplifications (no prune, no parking branch, T5 parked).
