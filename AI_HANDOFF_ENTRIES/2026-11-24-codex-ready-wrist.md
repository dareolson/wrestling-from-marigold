# Tucked far elbow, wrist movement, larger back hand — Codex, November 24, 2026

Derek requested lowering the far elbow and moving from the wrist instead of extending that elbow. During implementation he also identified the back hand as too small. Both requests are included.

Lower ready guard (readyArt=v2) now uses far upper .22 / forearm 1.35 instead of .62 / 1.20. Its far shoulder/elbow angles stay constant over the probing phase; near-arm behavior remains. `probingGuard` supplies a bounded wrist angle for the far hand. `readyWrist.js` uses the existing inside sprite to render 25 cached local wrist rotations on same-size CanvasTextures. Only the distal hand pixels rotate about the painted wrist; the proximal forearm and all rig anchors stay unchanged. Distal hand is scaled 1.25× about that pivot, including neutral, to address the small-hand feedback without enlarging the forearm. Overlap is in the narrow painted wrist; no generated-art replacement needed. Existing upper-body stance/legs and ownership exclusions remain. Texture substitution only applies to the readyInside variant; move art resets normally.

Preview remains localhost:5185 `/tools/gait-preview/?compare=ready-art&rig=george-roster-v1&body=close`. Left previous high guard, right lower tucked elbow/wrist movement/larger hand. Still opt-in.

Validation: 17 focused tests pass; lower guard test verifies far upper/forearm angles constant across phases while wrist varies. Build passes. Browser test in both facings confirms elbow drift 0, wrist-anchor drift 0, 25 distinct hand frames, proximal source pixels identical, release to base art when falling, zero page errors. Enlarged-hand pass reruns same browser checks. Evidence wrist-tests.txt, wrist-build.txt, wrist-runtime.json and wrist-preview±1.png in research/art/ready-grab-2026-11-24/.

## Contour connection repair, same day

Derek said the result looked pretty good, but too much bezel removal left the outline disconnected. Used built-in imagegen edits to extend/taper each forearm's side contours toward the elbow pivot, retaining a smaller upper overlap area. Manifest now uses forearm_ready_inside_v5.png and forearm_ready_outside_v5.png (previous versions preserved). Wrist motion, larger back-hand scale, stance and bindings unchanged. Generated sources plus exact inside/outside-contour-prompt.txt saved in the same research/art directory. Build and both-facing wrist browser check rerun; updated wrist screenshots show current art. Awaiting contour review.
