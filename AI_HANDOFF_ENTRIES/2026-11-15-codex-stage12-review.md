# Stage 12 visual and leverage review — Codex, 2026-11-15

User asked to look at Claude's latest work. Reviewed `moves/stage12` at **07e79457** in `/Users/home/Documents/wfm-stage12`. This is the newest move batch, separate from the George Stage E taunts. No runtime changes, commits, merges or pushes made in this review; that worktree remains clean.

## Verdict and fix order

**Measurement correction found during fixes:** Claude's original `g12_play.mjs` compared `Object.values(jointAttachmentPoints)` by array index. Standing and grounded renderers insert joint names in different orders, so some large reported transition steps compare different joints. The old numeric seam maxima below are not reliable measures of actual snapping. The tool is being corrected to a fixed list of joint names; use the follow-up fix report for fresh measurements. The visual grip and hold-pose findings remain valid.

These are playable rough poses, with major grip, support and transition problems. Do not promote the batch on the strength of executor/no-NaN/no-stuck counts. Claude's own misses page is candid about the unfinished work.

1. **Body scissors — rebuild the seated base and waist wrap.** Fresh live capture `research/animation/stage12-review-2026-11-15/live/bodyScissors-4.png`: the attacker folds far below the receiver with boots up beside him; his thighs/shins do not visibly encircle the waist. The receiver remains laid out independently. A hip-gap minimum of zero is overlap, not a waist lock. Source `src/animation/clips/matMoves.js:174` uses a very deep standing crouch/fold to fake the seat, then changes both thighs to raised angles. Establish seat/mat support, put near/far legs around opposite sides of the receiver, then squeeze from that fixed shape. Solve both rigs' pelvis/waist surfaces instead of matching root x.
2. **Indian deathlock — rebuild the entanglement and support pose.** Fresh `live/indianDeathlock-4.png`: the attacker appears suspended on one boot in a deep crouch, with the other leg/knee raised; there is no clear stable crossed-leg trap. Source `matMoves.js:204`. Establish which shin crosses which, which ankle is trapped, and what supports the attacker before animating the pull. The receiver's legs need explicit relationships to the attacker's limbs throughout setup/release. Also registry `sell.part` is back despite this being a leg hold; fix the pain context when the hold is physically correct.
3. **Wristlock and test of strength — bind the hands before adding more motion.** Fresh wristlock `live/wristlock-4.png`: both arms are extended independently; the trapped wrist isn't visibly captured. The recorded test-of-strength frames likewise show raised hands without a convincing joined grip, and the loser folds awkwardly beneath them. The test is currently a predetermined three-push damage hold; attacker always wins, no contest. Sources `matMoves.js:30` and `:79`. Build one clean grip pose, constrain wrist/palm contacts, then add the turn-under/pressure/escape. A wristlock needs a visible arm wringer rather than just a step beside him.
4. **Flying mare — change the actual grip and throw, not only its timing.** `matMoves.js:256` explicitly clones snapmareTieUp, scales time .8 and positive lift 1.25. It retains the head grip. It does not yet read as a separate by-the-arm throw. This is a move-identity issue, not a speed polish issue.
5. **Fix support and end transitions across the batch.** The nine ordinary specs all return `plants: []` (`matMoves.js:277`); only the flying mare inherits the old clip's supports. Avoid building further on feet/knees that aren't grounded. Claude's measurements flag large handoffs: abdominal stretch end 144.1 px, backdrop end 175.2 px, body scissors/deathlock up to 118 px. Preserve the last actual pose/contacts into the next renderer before recovery. A bigger existing suplex seam is not an acceptance criterion.

## All ten, briefly

| Move | What I saw / checked | Next action |
|---|---|---|
| Wristlock | Arms mime the action without a clear wrist capture; figures/feet overlap at the pressure pose. | Grip first, turn-under next, then support steps. |
| Headlock takeover | Receiver's drop is recognizable, but continuity of the head/arm hold over the hip is weak, with abrupt flipping. | Keep the head secured during a supported drop to the hip. |
| Flying mare | Uses the snapmare head-grip motion. | Author the by-arm grip and a distinct shoulder passage. |
| Test of strength | Hands don't convincingly lock; receiver sinks into a folded stance; outcome fixed. | Palm grips and real knee base, then contest logic. |
| Leapfrog | Most immediately readable of the new actions in sampled recording phases. | Verify actual runner/boot/head clearance and landing timing with the intended kits; no visual approval yet. |
| Backward roll | Reads as rotating above the mat through part of the roll. | Establish shoulder/back contact, carry a support pivot through the rotation, then plant feet. |
| Abdominal stretch | Both men raise arms; no clear arm-over-head control or leg hook. | Lock one side-on leverage pose, hook the correct leg, carry it through pulls. |
| Body scissors | Attacker collapses below the receiver instead of maintaining a seated waist clamp. | Rebuild hold pose. |
| Indian deathlock | Raised/overlapping legs and an unstable-looking attacker; trap isn't legible. | Rebuild hold pose. |
| Backdrop suplex | Lift/fall idea is readable, but body attachment during the arch and the final handoff need work. | Keep the waist connection through lift/arch and preserve landing pose at the grounded handoff. |

## Gameplay reachability

- With `waistlock=v1`, Lou's Up/Down + Power still prioritize go-behind; his test of strength/flying mare are shadowed (`Arena.js:4071`). The documented routes need an eventual control decision, not an executor-only pass.
- Test of strength has no actual strength contest yet.
- In Claude's four 420-second AI soaks, only abdominal stretch (7), body scissors (14) and deathlock (14) played. Seven moves had zero plays. Some lack AI input routes; leapfrog has a hook but did not occur, so its zero should not be generalized into proof of an unreachable route.
- Backdrop is only available from the waistlock hold with wear >= 60; no standing back-turned route exists in the current auto-facing behavior.

## Evidence and limits

Saved review stills in `research/animation/stage12-review-2026-11-15/`: three sampled phases from each of Claude's ten Lou-on-George, facing-right recordings, plus eight freshly stepped live stills for each of wristlock, body scissors and deathlock. The recording times are based on the gallery's wall-clock start metadata, so use them as approximate phase labels, not precise contact timing proof.

Fresh command: `WFM_URL=http://127.0.0.1:5233 SHOTS=<current workspace>/research/animation/stage12-review-2026-11-15/live node /Users/home/Documents/wfm-stage12/tools/debug/g12_play.mjs bodyScissors indianDeathlock wristlock`.

That command made 3 screenshot runs and 9 measured completion runs across Lou/George pairings and both facings. Nine measured runs fired, 0 NaN, 0 stuck, 0 page errors. Body-scissors/deathlock end seam reached 111.3 px in this subset. This is fresh executor verification of the three problem holds, not a new 320-case gate. Other per-move metrics above are explicitly Claude's existing report. No fresh full test suite was run because runtime files were not modified.

Review server: `http://127.0.0.1:5233/research/animation/light-moves-2026-11/g12/index.html`. It serves the separate Stage 12 worktree; port 5201 serves the current main workspace and does not contain these moves yet.
