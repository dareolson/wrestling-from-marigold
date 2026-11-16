# Lou's wristlock-to-hammerlock: elbow down, arm cranked up the back — Claude Opus, 2026-11-15

Picks up where Codex stopped (usage limit). Derek's note to Codex: "his elbow needs to be inverted on the behind the back ... his outside elbow should be almost pointed down and his arm torqued back behind him." Codex had staged an `elbowPole:'down'` change in `/private/tmp/wfm-elbow-down/` (never applied). It changed only the transition frame, not the hold, so it is **superseded and not used**; the folder can be deleted.

## What was wrong (measured, George receiving, px from his near shoulder, + = toward his back)

- Hold elbow 0 back / 29 down, wrist 17 back / 25 down: arm folded straight under the shoulder, inside the torso (back edge 23-30 px).
- Layer window 2.5-4.4 drew `defender nearArm` *under* `defender nativeBody`, so the camera-side worked arm was hidden whatever its angle.

## Changes (`wristlockHammerlock` only, plus two small shared contracts)

- Hold layer: the worked arm draws on the camera side of his body; Lou's gripping arm stays on top.
- Two beats: Codex's swing to the low point behind the back (1.5-2.65 s, unchanged), then a crank (2.6-2.95 s) to a new `limb` target: upper arm 0.5 rad back of straight down, forearm folded to 2.94 rad (reverse fold about 2.44, inside the -3.0 elbow limit, past the -1.8..-2.1 "chicken wing").
- `gripTarget` `limb:{upper,fore}` (Shoulder, self-target): his own wrist from his drawn bone lengths, so all four rigs fold the same shape. A single hand target gave Lou's elbow pointing forward (-14) because rig forearm lengths differ (George about 20 px, Lou about 35). Validated in `validateClip`.
- `MoveRuntime._applyGrips`: a `blendFromHand` grip takes the arm over from an earlier grip on the same arm. holdGrips turns each grip from the posed arm, so two on one arm added up (the hand snapped 27 px to the front at 2.6 s).

## Measurements (final code, Lou attacking each, both facings)

Hold at 3.3 s, elbow / wrist (back, down): Lou 14,26 / 21,-9 · George 14,25 / 18,6 · Kowalski 13,24 / 18,-1 · Guido 13,23 / 17,2. Same in both facings. No browser errors.
Largest per-frame joint step: George 9, Guido 10, Kowalski 16, Lou 32. The 16/32 are at 1.48 s (wristlock entry) and the 8-15 px steps at 4.33-4.48 s are the release; both were in the committed version before this pass. The swing and crank (1.5-4.3 s) have no step over 8 px.

## Checks

Suite 1420/1420, build, coverage (49 baselined). New tests: `limb` math both facings and two forearm lengths; invalid `limb` rejected; swing-then-crank shape and hold layer; runtime hand-off (fails without the fix). Evidence on disk: `research/animation/hammerlock-elbow-down-2026-11-15/` (contact sheet, before/after zoom, probe scripts).

Not judged. Open: the release (4.3-4.5 s) still moves 8-15 px a frame; Derek's earlier "wristlock not painful enough" note stands.
