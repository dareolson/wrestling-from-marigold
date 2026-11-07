# Opus handoff: falls Stage 4 ground contact at T4.7c; finishers and personality queued

2026-11-06 · Claude (Opus) · Session handoff to a fresh Opus.

## Where things stand

- **Active:** [PLAN_FALLS.md](../PLAN_FALLS.md) Stage 4, G4a r2 (ground-attack contact). Sonnet's next task is **T4.7c**, then
  **STOP at G4a r2c**. Paste: "Read CLAUDE.md, the AI_HANDOFF Status, then PLAN_FALLS.md T4.7c. Do T4.7c and STOP at G4a r2c."
- **Elbow drop history this session:** T4.1-T4.2b (379255b) gave the downed man a jolt and laid attackers down through the handoff.
  Derek was underwhelmed: the bodies passed through each other. Codex's staging became T4.5-T4.7. Stills (ea31ebb): Derek chose the
  **far side**. T4.7a (54b60db) put it in the runtime. T4.7b (e8c7498) made one continuous fall (flight cut at apex, 0.14 s gravity
  fall, hit 18 frames earlier). **Derek approved the timing; it is locked.**
- **T4.7c (open):** the elbow leads the fall (today he goes flat like a plank, arms hanging, frames 41-48); a softer 2-4 frame stop
  (today 30 -> 0 px/frame, 5 px squash); Lou's legs on the mat after contact; the receiver curls around the pinned chest and kicks his
  legs as Lou rolls off (Derek). The sell is reusable for the knee drop and dives.
- **After G4a r2c:** the rest of T4.7 (knee drop, diving elbow, top dive, each with its own striking part), T4.3 soak, T4.4 promote
  `falls` (`defaultOnFlag`, `?falls=off`), **STOP at G4**.
- **Then:** [PLAN_FINISHERS.md](../PLAN_FINISHERS.md) Stage 1, Lou's Thesz press set piece. Finisher button (Y/taunt) in the
  tie-up at defender wear >= 70; drag to center, forced whip, a run timed to meet him about 300 ms after the bounce, the press,
  a mount holding his wrists, a pin he can kick out of only while his wear is low. **STOP at G1.** The others' finishers come later;
  Derek picks the moves.
- **Later:** a personality plan, ideas in [IDEAS.md](../IDEAS.md) ("Wrestler personality through movement"): a per-wrestler sheet,
  a Mixamo/CMU importer first (Codex), Derek's act-out video (three-quarter turn, two angles), rig limits turned into art requests.
  Derek may make content from the act-out workflow. `ffmpeg`/`yt-dlp` not installed yet (`brew install ffmpeg yt-dlp`).

## Derek's direction this session

- Moves are "passable": stop broad move polish, use polish lists. The ground-contact fix is an exception Derek asked for.
- G3 r3 (wear) accepted as passable.
- Order: falls Stage 4 -> finishers -> personality.

## Repo state

- Branch `story/marigold-opening`. Pushed through `fb8c5ca`; 16 local commits after it (plans, Sonnet's T4.x, Codex notes), not
  pushed. Push only via the SSH URL when Derek asks.
- Untracked on purpose (unreviewed Codex): `src/assets/wrestlers/*/forearm_sleeper_wrap.png`, `tools/debug/build_sleeper_wrap.mjs`,
  `throw_support_review.mjs`, `waistlock_contact_probe.mjs`, `waistlock_review_report.mjs`.
- Frame dumps are gitignored. Sonnet's pages keep frames local (g4a-r2b is about 161 MB on disk, not in git).

## Tips for the next Opus

- Look at the frames yourself before planning: build a contact sheet with PIL (`python3`, PIL 12 is installed) into the scratchpad
  and Read it. That found the plank-float and the leg problems in r2b.
- Codex's reviews have been accurate. Verify their source claims (two greps) and fold them into the plan.
- The plan's tasks are long. Keep new ones tight and say what's locked.
