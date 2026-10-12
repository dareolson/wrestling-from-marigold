# 2026-10-11 — Claude: forearm donor audition on Procreate Lou

Derek is happy with Procreate Lou. Knee-cap extension is deferred (diagnosis
below). This session committed the backlog and auditioned the Oct 8 forearm
donors in real game frames.

## Commits (pushed to `thesz-v2-profile-normalization`)

- `47ec46b` Procreate Lou opt-in candidate + rope/clamp changes
- `5332f08` debug tooling (knee probe, live match check, PSD reader)
- `a4835d5` handoffs and docs Sep 27 – Oct 9

Node 22.23.1: `npm test` 557/557, `npm run build` OK, `rig:validate` OK for
all four characters.

## Knee gap: diagnosis from Derek's 2026-10-11 screenshot

The rope hypothesis in the Oct 9 entry is ruled out for Derek's frame: no rope
crosses the knee. The gap is an open wedge at the FRONT of the bent knee. Both
joint ends are undersized around the pivot: thigh has ~39px of art below its
distal anchor and tapers to 43px wide; shin has ~40px above its pivot and
domes to 45px; leg width there is ~85–90px. Neither end is a full round cap of
radius ~half the leg width, so the outside of the bend opens. Fix is art:
Derek will extend the shin top (lower layer) into a full-width dome with the
front outline carried up. Canvas grows, so `shin.jointPivotFrac` and related
anchors must be re-measured afterwards, and `near/farShinOffsetY` likely
return to 0. George's art not measured; check before assuming the same cause.

## Forearm audition

`tools/debug/forearm_audition.mjs` pauses the live scene and swaps the
forearm sprite texture with each donor resized whole-canvas onto 117×351.
Real sprites rendered at 3× without the broadcast filter. No game code changed.
Sheets: `tools/debug/shots/forearm-audition/{hammerlock,idle,lockup}.png`
(ignored folder).

Observations (visual, not measured):
- Every donor uses a thicker, cleaner cartoon outline than Derek's painterly
  forearm. Less obvious at game scale than in close-up, still visible.
- All donor hands read smaller than Derek's fist (distal extent shorter, as the
  Oct 8 measurements said).
- `grip-v1` reads as a clutching hand in the hammerlock frame; the only donor
  with a clear role.
- `palm-v3` reads closest to a palm-side fist at idle; v1/v2 read as cupped
  palm-up hands.
- Facing-left hammerlock was not captured (the second hold did not start in
  the script); lockup frame crops the raised arm.

None of these is installable as is. Next: Derek repaints grip over his own
forearm in Procreate (keeping the elbow→wrist painting), then a real in-game
audition needs a forearm-level variant hook, since hammerlock's `workingHand`
maps to hand slots and Procreate Lou's hand is baked into the forearm.
