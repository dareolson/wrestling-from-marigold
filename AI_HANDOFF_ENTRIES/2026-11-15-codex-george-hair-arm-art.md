# George near-arm hair fix art — Codex, 2026-11-15

Delivered the requested pair in `research/art/george-hair-arm-2026-11-15/`: `upperArm-hairReach-v1.png` (296×410) and `forearm-hairFix-v1.png` (426×439), plus `anchors.json`, exact imagegen prompts, generated sources, original references, validation and both-facing fit stills. Optional hairRake omitted.

Original shoulder/elbow cap pixels are retained exactly; bases are unchanged. New upper elbow pixel (148.4,246), finger-pad hairContact pixel (250,359). The temporary near-arm fit touches the forelock and leaves eye/mouth visible. The README records a small smoothing arc and the face-crossing limit of a wider exploratory sweep.

**Registration caveat:** George's base upper-arm `binding` fits to the normal-length graph bone. A moved distalAnchorFrac alone does not shorten it, and a null variant binding is inherited by mergeVariantEntry. The art fit used a browser-only upper-arm placement honoring the new painted elbow. Claude must preserve that projected length when registering; details and reproducible scripts are in the folder README. Production character/animation/Skeleton code was not changed for this art task.

All delivery files left untracked in the current wrestling-from-marigold workspace. No work in the wfm-george-hair worktree, commits or pushes.
