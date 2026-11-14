# Live move preview

Run `npm run move:preview`. Open `/tools/move-preview/` on the Vite server. The current running session uses http://localhost:5197/tools/move-preview/.

Use this first for visual revisions: play/pause, scrub, single-frame steps, normal/half/quarter speed, mirror, pair selection. The game runs in the iframe with the real Wrestler, Skeleton, MoveRuntime, grips and layer resolver. No solver, pixel-mask audit, screenshots or video encoding runs before the preview appears.

Current default: **half Boston crab draft**, requested by Derek 2026-11-13. Starts with ankleLockV2's actual pickup keys, then turns into the crab, tucks the raised leg under the arm and leans back. Edit `half-boston-crab.json` for the held stance; the page reloads that JSON within one second while preserving the paused time. `half-boston-crab.js` authors its timeline. The entry turn/receiver roll and contact are provisional; it is not registered as gameplay and no visual approval is implied. Only Lou-on-George has had an initial pose inspection; other options are available for later checking.

The previous toe-hold revision is selectable. It watches saved waypoints in `research/animation/light-moves-2026-11/t3-foreground/<case>/waypoints.json` and seed reports in `t3-knee-capture`. The foreground toggle gives instant before/after comparison on that revision. The clip construction and playback are shared with `toehold_t30c_video.mjs` through `toehold_t30c_clip.mjs`; the viewer does not approximate the animation in a different renderer.

The Move menu also lists clips already registered by the game. Those are visual-track previews; gameplay entry conditions and executor-specific state changes are not simulated. Pose-sequence moves and unregistered variants still need adapters. The existing `/tools/move-editor/` remains the keyframe authoring tool.

## Revision workflow

1. Bring up one live case immediately, generally Lou on George facing right. For a small layer or pose change, keep this tab open and edit the source. Show the rough result before attempting an optimizer or generating a review packet.
2. Iterate with Derek. Freeze a useful frame; alter pose, position, grip or layer order; watch the same frame or loop update. Keep expensive checks explicit.
3. Once the motion direction is accepted, check both facings and pairings, contact and joints. Then export portable videos/contact sheets and run the appropriate regression checks for the final change.

The first-preview target is under ten seconds after starting the server; this does not promise that authoring a new move takes ten seconds. Initial Chrome check: 1.7 s to a working preview, 130 ms for two layer changes. Warm JSON rebuilds displayed about 12 ms; polling adds up to one second. Recorded performance is local and varies with asset loading.

Why the old path was slow: `toehold_t30c_video.mjs` did a per-frame measurement pass, a separate contact-sheet pass, and fresh browser contexts/recordings for every case and speed before writing the manifest. `NOREC=1` still performed measurements and sheets. `toehold_t30c_solve.mjs` evaluated many candidate poses at many waypoints through serial browser calls. These remain useful for solving/final evidence; they were on the wrong side of the initial visual feedback.

Smoke check against a running server:

```sh
WFM_URL=http://localhost:5197 node tools/move-preview/smoke.mjs
```

Checks startup, seeking/frame stepping, actual foreground depth, mirror/pair changes, automatic file reload with the paused time preserved, and playback of a registered clip. It intercepts test responses rather than editing real animation data.

## Outside-armpit revision (2026-11-13)

Derek clarified that the toes tuck behind the outside armpit; Lou clamps with that arm rather than holding the leg with both hands behind his back. Hand-to-boot constraints ease off over 0.65–0.85 s, before the reversal; there are no hand grips during the held crab. The outside arm is bent across the body and the other hand stays free. The low back-arm reversal and easeInOut spans remain.

Latest draw order: George’s trapped **whole leg** over Lou’s torso, Lou’s outside arm over that leg. Moving the whole leg preserves George’s native calf-below-thigh order, so the earlier calf-only layer cannot expose the knee bezel. Verified the actual runtime depths in the held Lou-on-George pose. No art files changed; Derek may redraw/bezel the thigh later and layer the calf over it then. The earlier calf-only split remains a supported/tested layer primitive but is not used by this draft.

## Low reversal and supported receiver (2026-11-13)

The remaining outside-hand pickup constraint had pulled Lou's elbow 36.6 px above his shoulder at 1.53 s, with backward reach up to 37.4 px. It now releases before the turn and follows keyed low-arm poses into the clamp. In the inspected transition, the elbow stays at least 35.0 px below the shoulder and backward reach is at most 13.0 px.

Derek changed George's reaction to supporting himself on his elbows. The fist-pound overlay is removed; his upper arms brace the chest and forearms extend forward with open base hands. In the inspected held pose his elbow joints sit at y 398.5 / 395.8 against the y=400 mat line. This is the current supported reaction, superseding the earlier fist-pound instruction for the half crab. No art files changed. Other pairings remain provisional.

## Tight handoff and supported fist strikes (2026-11-13)

Derek saw George's raised leg waiting while Lou let go and turned. The pickup now runs straight into the turn at 0.82 s, receiver turn at 0.88 s and full armpit tuck at 1.18 s (previously 1.15 / 1.55 / 2.1). The old raised-leg hold until 1.54 s is removed; the leg changes pose through that interval. Pickup hand constraints release 0.68–0.778 s, immediately before the turn, retaining the low-elbow transition.

Derek restored fist pounding as well as elbow support. Three alternating strikes land on the pulls at 1.6 / 2.5 / 3.4 s; the opposite arm stays in the supported pose. Each striking arm lifts, strikes, holds contact for 0.08 s, then returns to elbow support. Single-case hand-mask checks: near hand -28 px on lift / +1 px on strike; far -34 / 0 px, relative to the canvas (positive = below). Other supporting hand remains within 0–4 px at these strike frames. These are draft contact checks, not a full roster approval. This supersedes the preceding brace-only reaction and earlier timing notes.

## Leg handoff cleanup (2026-11-13)

Derek noticed the trapped leg morphing through Lou. The roll now uses matched straight-leg poses across the facing change, with a stepped mirrored pose so the sampler never blends through an upright intermediate body. The trapped whole leg changes to its over-torso/under-arm order at the roll (0.88 s), while still low and clear, rather than popping through the torso at the tuck (1.18 s). Added an intermediate knee bend at 1.0 s and corrected the defender's settling key from the stale 2.1 s to the actual 1.18 s tuck. The tight timing, held clamp, calf-under-thigh order and alternating supported strikes remain.

Checked a six-frame live strip around 0.84–1.3 s and per-frame ankle travel during the transfer (maximum 14.1 px in the inspected case). Other pairings/facings still need their final pass after Derek accepts the motion.

## George-on-Lou fit (2026-11-13)

Lou's longer lower leg entered George's shoulder. The `george-lou` settings now add a deeper trapped-knee fold (1.6 vs 1.25 rad), tilting the lower leg back behind George's shoulder; the entry's intermediate bend follows that adjustment. This override applies only to George attacking Lou, both facings. The default Lou-on-George clip was checked for exact equality with the unmodified settings. Live George-on-Lou held pose inspected; no art or body scaling changed.

George fit follow-up: reduced George-on-Lou hip spacing from 48 to 30 rig units and angled the outside upper arm farther back (`lArm` -0.6, elbow flex 1.65). The body now sits closer to Lou's raised lower leg, closing the armpit clamp. Live held pose inspected; elbow remains below the shoulder. Lou-on-George again checked unchanged.
