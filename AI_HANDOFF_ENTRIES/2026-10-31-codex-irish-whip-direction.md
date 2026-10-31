# Irish whip direction and cross-body candidate

Codex, 2026-10-31. Derek requested a better Irish whip, selectable direction in gameplay and the results viewer, and suggested a cross-body variation.

Reviewed G3b: instant running at frame 0, then a 118.7–120.5 px defender facing jump when the exit blend released. Added a candidate behind the existing `?grapples=v1`; no promotion, lockup stance/gap/hold unchanged. This request authorizes changing whip timing beyond Stage 3b's earlier diagnostic scope.

- Gameplay already routes left/right + grapple from the lockup. Verified this through real input in all eight kit/facing/direction combinations, including selecting the rope behind the attacker.
- Candidate holds attacker `slamming` / receiver `grabbed` through gather and load, compacts the receiver's arms before the turn, and releases at 310 ms (observed 317 ms at 60 Hz). Opposite-side selection uses a cross-body spatial pull and 400 ms release. Direction is captured once; cancellation guards prevent a delayed release resurrecting a downed receiver.
- Viewer: [Irish whip direction proof](../research/animation/whip-2026-10/index.html). Select attacker, starting facing and target rope independently; normal/quarter-speed playback and pause. Eight real captures, 30 fps playback from 60 Hz simulation.
- Proof: `tools/debug/whip_direction_proof.mjs`; results beside viewer. Capture base HEAD `53bf9f8`, dirty working tree, branch `story/marigold-opening`; Lou `thesz-procreate-v1`, George `george-roster-v1`, `grapples=v1`, seed 11, fixed 1/60 steps, AIs disabled.
- Defender peak part step from exit through release + one frame: Lou attacker 54.6 same-side / 56.0 cross-body; George attacker 64.5 / 65.8. Both facings equal. This includes more frames than the old G3b turn table. No claim of good contact from those measurements.
- Open visual work: cross-body body overlap, the wrist contact route (the receiver currently gathers to idle), the compact facing turn, and first running step. Candidate is for Derek to judge, not an approved final animation.
- Verification: 1064/1064 tests, build passed, real-input direction proof 8/8, `git diff --check`. Unit coverage includes interruption on either side. Story working-tree edits are unrelated and untouched.
