# Chop correction: actually play the camera-facing in-between

Supersedes the animation approach in `2026-11-15-codex-chop-tuning.md`. Derek rejected the previous pass: horizontal motion plus at least one perspective in-between was explicitly required, and the earlier pass omitted the camera-facing drawing.

The chop now uses four complete-arm projection sprites: backswing, camera-facing, contact, follow. They occupy the far upper-arm image slot, attached at the real shoulder; the ordinary forearm/hand are hidden only while a projection plays and restored on reset/interruption. `Skeleton._applyProjectedArms` preserves the drawn foreshortening rather than fitting split halves to full-length FK bones. Other moves have no projectedArm metadata and retain their normal rendering. Source PNGs copied intact from the art delivery into Lou's assets.

Backswing faces away from the receiver, camera view plays from .192 to .331 seconds, then the arm opens horizontally to chest contact. The camera frame moves in front of Lou's torso during that window so it can be seen; other phases preserve the far-arm placement behind his torso. The complete drawing keeps its own elbow/wrist projection and shoulder attachment. Per-asset scaleX/scaleY preserve the compact camera view's projected extent. This is an authored 2D sprite sequence; the asset changes are discrete, not a 3D arm rig.

Evidence: `research/animation/chop-2026-11-15/projected-visible/` with all four opponents, both facings, one hit each, all finish standing, no page errors. Stills include frame 14 (camera-facing), 23 (contact), 6 (backswing). `selector-check.json` confirms all four projection textures appeared during repeat playback, normal arms restored, same game reused and zero page errors. Previous pass's hand/bone measurements do not describe this full-arm sequence; use the projected evidence and judge the actual motion.

Preview reuses the loaded game for immediate replays and offers Repeat. Open `http://127.0.0.1:5201/tools/legwork-preview/?move=chop&loop=1`. Tests cover explicit camera-frame playback, its visibility above the torso, complete-arm mirroring/shoulder anchoring, ordinary-arm isolation, and restoring the hidden forearm.

No commits or pushes. Current workspace only; Sonnet's worktree unchanged.
