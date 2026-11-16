# Stage 12 physical pose pass — Codex, November 15

Work is in `/Users/home/Documents/wfm-stage12` on `moves/stage12`, uncommitted. Do not overwrite with main's Skeleton: this branch has its own source base. No merge, commit or push performed.

Live selectable preview: http://127.0.0.1:5233/tools/mat-preview/ (Vite running on 5233). All ten moves, four rigs, both facings, Replay and Repeat; replay reuses the loaded game for the same pairing. These are direct executor fixtures, not proof of input/AI reachability. Expressions remain enabled.

## Changes

- Rebuilt body scissors as a seated wrap beside the receiver, with the far leg behind him and near leg in front. Both ankles target his waist. Rise happens through a kneel rather than an instantaneous standing reset.
- Deathlock uses a stable kneeling base; the receiver's ankles follow the trapping shin. The base was moved back until both contacts were reachable for Lou/George.
- Added two-bone leg contact solving after arm grips, preserving actual thigh and shin lengths throughout the blend. Contact metadata is validated and compiled. Runtime logs endpoint error for review.
- Added wrist/arm grips for the wristlock, test of strength and flying mare, shoulder/waist control for the stretch, and waist control/carry through the backdrop lift.
- Added the stretch's leg hook and planted support feet for several standing moves.
- Headlock takeover now sits without the excessive crouch sink and recovers through a kneel. The attacker steps clear during recovery; the stretch also releases with more separation.
- Backdrop now arches into a flat landing instead of handing an oblique body into the grounded rig. Confirmed one damage event in all four Lou/George tests.
- Backward roll uses an upper-back floor constraint, including head bounds to avoid mat penetration; recovery retains its complete rotation until upright.
- Leapfrog delays takeoff based on runner arrival, rather than immediately jumping while the runner is still far away.
- Flying mare retains straight arms at its facing flip; the grip develops after the turn.

## Checks and evidence

`research/animation/stage12-fixes-2026-11-15/` contains current contact stills, preview screenshot, browser probe scripts and per-move measurements under `final/`. The first broad browser pass exercised all ten, Lou→George and George→Lou in both directions: 40 executions, no browser errors, no nonfinite joints, no stuck endings, expected hit counts (three squeezes per hold, one per throw/wristlock, zero for solo moves). Later targeted runs replace the affected move JSONs after release/pivot changes.

The old diagnostic compared Object.values of joint maps by insertion order. Upright/grounded paths publish those in different orders, so its old seam maxima were not trustworthy. `g12_play.mjs` now compares fixed joint names. Large remaining values must still be interpreted visually: a flip's rapid rotation and post-clip facing changes can both produce them.

Twelve targeted animation/contact tests pass, including length preservation through partial weights in both facings, invalid contact metadata and delayed leapfrog key ordering. Production build passes. Full suite before the final small pose/release edits: 1364 pass, five existing failures (landmarkFit, profileV2Normalization, two shipped-thigh source checks and frozen profile-v4 artifact identity). Final targeted tests/build rerun separately.

## Still needs work

This is a physical pose improvement pass, not visual signoff on every pairing. Flying mare still shares the snapmare flight path and its fast midair rotation needs a distinct authored pass. Test of strength still has an attacker-determined result with Action escape, not a contest mechanic. Roll shoulder/head presentation remains approximate. Some stagger/get-up/facing handoffs still pop and should be judged in the live preview. Per-rig contact targets need wider visual review; no claim that all 16 pairings were played.

The previously reviewed control conflict with waistlock/goBehind and sparse observed AI move coverage remain unchanged. Preview fixtures intentionally bypass these. See the separate Stage 12 review entry for those findings and the correction to its original seam claims.

Modified Stage 12 files: `src/Skeleton.js`, `src/Wrestler.js`, `src/animation/AnimationClip.js`, `src/animation/MoveRuntime.js`, `src/animation/clips/matMoves.js`, `tools/debug/g12_play.mjs`. New: `tests/legContacts.test.js`, `tools/mat-preview/index.html`.
