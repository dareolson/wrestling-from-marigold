# Foreground toe-hold candidate — Codex, 2026-11-13

Derek: the art is breaking; try the entire attacker in front of the victim. Open `index.html` for four normal-speed videos and contact sheets, with a link to the previous T3.0c page.

The foreground stack applies throughout the move: victim far arm, native body, near arm; attacker far arm, native body, near arm. `nativeBody` preserves each rig's torso, garment masks, head and leg ordering. This replaces the interleaved capture stack at Derek's request. All positions, solved poses and timing are copied unchanged from `652fd4b` (T3.0c); the two-knee drop, foot wrench and fist strikes remain.

Tradeoff: the attacker now hides part of the trapped boot (worst coverage 485–849 px, depending on case). The layer change does not repair pose deformation or existing joint-limit frames. Existing grip misses remain 9.6–11.8 px in three cases. All misses are on the page; this is a preview, with no gameplay registration or gate approval.

Reproduce from repo root (the four unchanged `waypoints.json` files are included):

```sh
FOREGROUND=1 NOHALF=1 node tools/debug/toehold_t30c_video.mjs research/animation/light-moves-2026-11/t3-knee-capture research/animation/light-moves-2026-11/t3-foreground
node tools/debug/toehold_t30c_page.mjs research/animation/light-moves-2026-11/t3-foreground
```

The series records the minimum attacker-art depth minus maximum victim-art depth. Positive means every visible attacker part is in front. The foreground summary excludes the zero-time pre-render snapshot and the completed clip's cleanup frame; the initial snapshot is retained separately as `startupDepthGap`. `NOREC=1` can refresh measurements without replacing existing video entries.

Foreground check: 1,328/1,328 rendered frames place every visible attacker part ahead of every victim part, excluding the pre-render and cleanup snapshots.

Validation: Node 22 syntax checks; 24/24 focused animation, layer and runtime tests; local Chrome renders in both pairings/facings; all page assets present. Raw recordings are ignored. Derek judges whether the foreground version salvages the art.
