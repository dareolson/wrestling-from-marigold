// Lou Thesz, PRODUCTION rig (default p1). Moves key on this id (rigOverrides LOU_RIG), so every Lou clip
// override, the back sell and the expression faces stay on him.
//
// 2026-11-24, Derek: "replace current lou's body parts with the new one ... calfs are stacked on top of his
// thighs and his far leg should be stacked over his trunks like the other character models". Body parts
// (torso, upper arm, forearm, thighs, shins incl. separate far leg) now come from Lou2.psd via the GENERATED
// base file below; draw order follows that PSD's layers. The Procreate HEAD stays (Lou2's head is the same
// painting padded 6px, IoU 1.000; the expression faces are drawn on this canvas). Every same-canvas variant
// was re-fitted onto the new parts with tools/art/rebase_variants.py
// (research/art-revisions/2026-11-24-lou/: job.json, rebase.json, old/ = the pre-swap art).
// The previous Procreate body is shelved, playable, as thesz_procreate_shelf.js (`?p1=thesz-procreate-shelf`).
//
// HOW TO REVISE THIS ART: ART_REVISION.md. Never hand-edit the generated base; edit the authored layer here.
import { thesz } from './thesz.js';
import { THESZ_PROCREATE_V1_BASE as BASE, THESZ_PROCREATE_V1_PSD_HEAD as PSD_HEAD } from './generated/thesz_procreate_v1.base.js';

const { sockets, ...base } = BASE;
// The Procreate head canvas (197x241) sits at +6,+6 inside the PSD head's padded canvas (209x253).
const HEAD_CANVAS = [197, 241], HEAD_PAD = [6, 6];
// Values authored on the pre-swap rig were in its draw scale; heightScale went 0.7907 -> BASE.heightScale.
// Projected-arm art (its own canvases, scaled by the draw scale) keeps its on-screen size with this.
const PRE_SWAP_HEIGHT = 0.7907, KEEP_SIZE = PRE_SWAP_HEIGHT / BASE.heightScale;
const projected = (art, k = KEEP_SIZE) => ({ ...art, scaleX: art.scaleX * k, scaleY: art.scaleY * k });

export const theszProcreateV1 = {
    id:        'thesz-procreate-v1',
    skinCol:   thesz.skinCol,
    trunksCol: thesz.trunksCol,
    textures: {
        ...base,
        head: 'thesz_pv1_head',
        headScale: PSD_HEAD.headScale * HEAD_CANVAS[1] / PSD_HEAD.canvas[1],
        headAnchorFrac: {
            u: (PSD_HEAD.anchor.u * PSD_HEAD.canvas[0] - HEAD_PAD[0]) / HEAD_CANVAS[0],
            v: (PSD_HEAD.anchor.v * PSD_HEAD.canvas[1] - HEAD_PAD[1]) / HEAD_CANVAS[1],
        },
        torso: {
            ...base.torso,
            // Left/back waist contour above the trunks (pain acting presses here). Re-fitted from (.22, .60).
            semanticAnchors: { backWaist: { u: 0.231134, v: 0.567619 } },
        },
        // The back sell's numbers (src/rig/backSell.js; tests/backSellLouFixture.test.js pins them). Measured on the
        // pre-swap body: RE-MEASURE with tools/debug/hold_weight_sweep.mjs + recovery_probe.mjs (ART_REVISION.md step 6).
        backSell: {
            holdW: 0.80, recoveryArm: -1.2, recoveryElbow: 1.5, settledElbow: 0.70, contactPx: 15,
            evidence: 'tools/debug/hold_weight_sweep.mjs (holdW, 81fe5bf 2026-10-24); tools/debug/recovery_probe.mjs (recoveryArm/Elbow, 2fa6c0b + a822721 2026-10-24); contactPx 15: PLAN_SUPLEX_RISE T4.0, measured to the painted grip cup. Pre-swap body (2026-11-24): re-measure.',
        },
        // crownBelowHip: painted crown below the hip pivot at the piledriver impact (floorContacts). Pre-swap value;
        // re-measure on this body (ART_REVISION.md step 6).
        rigProfile: { crownBelowHip: 136.1, sockets },
        shin: { ...base.shin, semanticAnchors: { heel: { u: 0.371301, v: 0.849452 }, toe: { u: 0.801621, v: 0.860571 } } },
        // Palm-side fist for the far arm (Oct 8 donor), re-fitted onto the new forearm.
        farForearm: { ...base.forearm, key: 'thesz_pv1_far_forearm' },
        // The hand is painted into the forearm, so a clip's `workingHand` request swaps the whole forearm.
        handInForearm: true,
        variants: {
            shin: {
                // PLAN_LIGHT_MOVES T2.5; foot repainted below the boot top, re-fitted + spliced onto the new shin.
                ankleTwist: {
                    key: 'thesz-procreate-v1_shin_ankle_twist', file: 'shin_ankle_twist.png',
                    semanticAnchors: { heel: { u: 0.363531, v: 0.854006 }, toe: { u: 0.758037, v: 0.915622 } },
                },
            },
            // The far shin is its own painting: the near twist's foot re-fitted onto it below the boot top
            // (rebase.json farShin: IoU .83, a different boot drawing; spliced at the boot top).
            farShin: {
                ankleTwist: {
                    key: 'thesz-procreate-v1_far_shin_ankle_twist', file: 'far_shin_ankle_twist.png',
                    semanticAnchors: { heel: { u: 0.427779, v: 0.857966 }, toe: { u: 0.720382, v: 0.917756 } },
                },
            },
            forearm: {
                grip: { key: 'thesz_pv1_forearm_grip', file: 'forearm_grip.png', semanticAnchors: { clutch: { u: 0.403117, v: 0.754309 } } },
                // Stage 2 clasps (PLAN_GRAPPLES T2.1b/T2.2); `clutch` is the palm's contact point.
                collarTie: { key: 'thesz_pv1_forearm_collar_tie', file: 'forearm_collar_tie.png', semanticAnchors: { clutch: { u: 0.450610, v: 0.757087 } } },
                elbowCup: { key: 'thesz_pv1_forearm_elbow_cup', file: 'forearm_elbow_cup.png', semanticAnchors: { clutch: { u: 0.432388, v: 0.756021 } } },
                waistClasp: { key: 'thesz_pv1_forearm_waist_clasp', file: 'forearm_waist_clasp.png', semanticAnchors: { clutch: { u: 0.509668, v: 0.760541 } } },
                // The chop (lightStrikes.js LIGHT_STRIKE_ART): flat open hand; each goes with the upperArm variant of the same name.
                chopWindup: { key: 'thesz_pv1_forearm_chop_windup', file: 'forearm_chopWindup.png' },
                chopContact: { key: 'thesz_pv1_forearm_chop_contact', file: 'forearm_chopContact.png' },
                chopFollow: { key: 'thesz_pv1_forearm_chop_follow', file: 'forearm_chopFollow.png' },
            },
            upperArm: {
                // Projected whole-arm drawings (own canvases): only their scale follows the new heightScale.
                headlockWrap: { key: 'thesz_pv1_headlock_wrap', file: 'upper_arm_headlockWrap_v1.png', projectedArm: projected({
                    shoulder: { u: 340 / 1312, v: 220 / 1199 }, elbow: { u: 1010 / 1312, v: 595 / 1199 }, wrist: { u: 595 / 1312, v: 950 / 1199 },
                    scaleX: 0.055, scaleY: 0.055, followTorso: true,
                }), semanticAnchors: { headlockCrook: { u: 640 / 1312, v: 790 / 1199 } } },
                chopSweepBack: { key: 'thesz_pv1_chop_sweep_back', file: 'upper_arm_chopSweepBack.png', projectedArm: projected({
                    shoulder: { u: 140 / 1672, v: 225 / 941 }, elbow: { u: 590 / 1672, v: 650 / 941 }, wrist: { u: 1230 / 1672, v: 580 / 941 },
                    scaleX: .045, scaleY: .045, reverse: true,
                }) },
                chopSweepCamera: { key: 'thesz_pv1_chop_sweep_camera', file: 'upper_arm_chopSweepCamera.png', projectedArm: projected({
                    shoulder: { u: 550 / 1312, v: 350 / 1199 }, elbow: { u: 520 / 1312, v: 560 / 1199 }, wrist: { u: 590 / 1312, v: 740 / 1199 },
                    scaleX: .055, scaleY: .038,
                }), semanticAnchors: { chopEdge: { u: 650 / 1312, v: 900 / 1199 } } },
                chopSweepContact: { key: 'thesz_pv1_chop_sweep_contact', file: 'upper_arm_chopSweepContact.png', projectedArm: projected({
                    shoulder: { u: 140 / 1774, v: 215 / 887 }, elbow: { u: 640 / 1774, v: 600 / 887 }, wrist: { u: 1250 / 1774, v: 575 / 887 },
                    scaleX: .055, scaleY: .055,
                }), semanticAnchors: { chopEdge: { u: 1590 / 1774, v: 590 / 887 } } },
                chopSweepFollow: { key: 'thesz_pv1_chop_sweep_follow', file: 'upper_arm_chopSweepFollow.png', projectedArm: projected({
                    shoulder: { u: 110 / 1774, v: 250 / 887 }, elbow: { u: 700 / 1774, v: 520 / 887 }, wrist: { u: 1350 / 1774, v: 440 / 887 },
                    scaleX: .045, scaleY: .045, angle: .18,
                }) },
                chopWindup: { key: 'thesz_pv1_upper_arm_chop_windup', file: 'upper_arm_chopWindup.png' },
                chopContact: { key: 'thesz_pv1_upper_arm_chop_contact', file: 'upper_arm_chopContact.png' },
                chopFollow: { key: 'thesz_pv1_upper_arm_chop_follow', file: 'upper_arm_chopFollow.png' },
            },
        },
    },
    // Its own idle (POSES.theszProcreateIdle); kit and taunt shared with shipped Lou.
    idlePose:  'theszProcreateIdle',
    tauntPose: thesz.tauntPose,
    moveSet:   thesz.moveSet,
};

// Alias for `rig:certify` (resolves `module[filename]`).
export const thesz_procreate_v1 = theszProcreateV1;
