# Codex: runner move polish for Derek / Opus

Reviewed latest batch through `4ee995ba` on 2026-11-14. Derek asked for more height in back body drop and running hip toss, and an arm drag that reads as a throw. His feedback on snapmare and clothesline was positive; those implementations are unchanged.

Implemented runner-only hip-toss and arm-drag factories, raised back-body-drop arc, and wired the running Power arm-drag route into the paired throw executor. Live preview now opens on the back body drop and includes all three runner moves. No new kit, input, or flag policy. Full description, validation and open misses: [runner polish notes](../research/animation/light-moves-2026-11/runner-polish-2026-11-14/README.md), [summary measurements](../research/animation/light-moves-2026-11/runner-polish-2026-11-14/summary.json).

Actual trigger checks: 12/12 finish normally, no browser errors; body-drop pelvis 37–40 px higher, hip-toss 44–48 px higher. One elbow-limit frame remains in forced Lou arm-drag tests; George’s arm drag has no pins. Full suite 1330/1330, build and coverage pass. Existing gait handoff / landing-room issues remain. Current changes are uncommitted, not visually approved, and not pushed.
