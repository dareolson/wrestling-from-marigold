// George's rig. Measured base geometry is GENERATED (src/characters/generated/george_roster_v1.base.js, from
// tools/wrestler-cutter/prepare-roster-character.py george); this file holds only what is authored on top.
// To revise the art (new knee/elbow overlap, re-cut PSD): ART_REVISION.md. Never paste generated numbers here.
import { george } from './george.js';
import { GEORGE_ROSTER_V1_BASE as BASE } from './generated/george_roster_v1.base.js';
const { sockets, ...base } = BASE;
export const georgeRosterV1 = {
    id: 'george-roster-v1', skinCol: george.skinCol, trunksCol: george.trunksCol,
    idlePose: 'rosterWrestlingIdle', tauntPose: george.tauntPose, begsOff: george.begsOff, struts: george.struts,
    sellStyle: george.sellStyle, moveSet: george.moveSet,
    textures: {
        ...base,
        rigProfile: { sockets },
        torso: { ...base.torso, semanticAnchors: { "backWaist": { "u": 0.2558, "v": 0.6077 } } },
        shin: { ...base.shin, semanticAnchors: { "heel": { "u": 0.39, "v": 0.86 }, "toe": { "u": 0.87, "v": 0.875 } } },
        "falls": { "hopScale": 0.775 },
        "backSell": {
            "holdW": 0.7,
            "recoveryArm": -0.7,
            "recoveryElbow": 1.1,
            "settledElbow": 0.7,
            "contactPx": 15,
            "handUnder": true,
            "aroundVia": {
                "u": -0.25,
                "v": 0.9069,
                "recoveryArm": -0.6,
                "recoveryElbow": -0.4,
                "approach": 0.4,
                "getups": {
                    "u": -0.4772,
                    "v": 0.6358,
                    "recoveryArm": -0.45,
                    "recoveryElbow": -1.8,
                    "path": [
                        {
                            "u": -0.4772,
                            "v": 0.6358
                        }
                    ]
                }
            },
            "evidence": "Re-measured at backWaist candidate A (u .2558, v .6077, on the contour) at 2026-10-25, PLAN_GEORGE_TRANSFER T6.4: tools/debug/hold_weight_sweep.mjs (holdW .45, fist wrist proxy, constant weight, first weight within 15 px at every sampled offset of the hold cycle .43 both facings, at .45 worst 14.35 px / rest 13.99 px); tools/debug/recovery_probe.mjs (arm -0.7 / elbow +1.1, wrist proxy 1.94 px both facings, flex 103.1 deg, limit 157.6); contactPx 15 kept (wrist proxy, no grip donor); handUnder: the forearm draws behind the torso while the grip latch is on; holdW .45 -> .7 at T8.3 (the route through aroundVia is longer than the straight path, tools/debug/hold_weight_sweep.mjs now: first weight within 15 px at every sampled offset .695 both facings, at .7 worst 14.52 px, margin .48 px; dist at w .5/.6/.7/.8/.9/1 = 24.2 / 19.36 / 14.52 / 9.68 / 4.84 / 0); aroundVia: tools/debug/around_via_candidates.mjs candidate B (Derek G8a, 1.5 hand lengths = 32.4 game px from backWaist, 18.0 px clear of the paint; recoveryArm -0.6 / recoveryElbow -0.4: tools/debug/around_recovery_probe.mjs, wrist 8.03 px from the via point on both facings, hand clear by 16.0 px; approach .4: the reach of a back clutch takes .4 of the clutch to get in instead of .25, tools/debug/route_probe.mjs, so the longer route keeps the move of the wrist relative to the back waist <= 2.21 px per frame); aroundVia.getups overlay (used only with ?getups=v1; the base above is the route with getups off, PLAN_GETUPS T3.3) registered at T2.9 (Derek G1-rev2, 2026-10-28, the T2.6 hand path): u -.4772 / v .6358 (1.5 hand lengths outboard of backWaist, wrist 29 px ABOVE the trunks hem), via pose recoveryArm -.45 / recoveryElbow -1.8 (wrist .25 px from the point, both facings), path [that point] solved by IK each frame in the standing release above standW; tools/debug/getups_route.mjs, research/animation/getups-2026-10/g1-rev2/route.json and its Verified section (lowest painted hand pixel 5.2-9.9 px above the hem, 0 visible px over a thigh)"
        },
        "variants": {
            "forearm": {
                "relaxedGripInside": {"key":"george_rv1_forearm_relaxed_grip_inside_v1","file":"forearm_relaxed_grip_inside_v3.png"},
                "relaxedGripOutside": {"key":"george_rv1_forearm_relaxed_grip_outside_v1","file":"forearm_relaxed_grip_outside_v3.png"},
                "openGripInside": {"key":"george_rv1_forearm_open_grip_inside_v2","file":"forearm_ready_neutral_inside_v2.png"},
                "openGripOutside": {"key":"george_rv1_forearm_open_grip_outside_v2","file":"forearm_ready_neutral_outside_v2.png"},
                "readyNeutralInside": {"key":"george_rv1_forearm_ready_neutral_inside_v1","file":"forearm_relaxed_grip_inside_v3.png"},
                "readyNeutralOutside": {"key":"george_rv1_forearm_ready_neutral_outside_v1","file":"forearm_relaxed_grip_outside_v3.png"},
                "cuppedInside": {"key":"george_rv1_forearm_cupped_inside_v5","file":"forearm_ready_inside_v5.png"},
                "cuppedOutside": {"key":"george_rv1_forearm_cupped_outside_v5","file":"forearm_ready_outside_v5.png"},
                "readyInside": {"key":"george_rv1_forearm_ready_inside_v2","file":"forearm_ready_inside_v5.png"},
                "readyOutside": {"key":"george_rv1_forearm_ready_outside_v2","file":"forearm_ready_outside_v5.png"},
                "readyGrab": {"key":"george_rv1_forearm_ready_grab_v1","file":"forearm_ready_grab_v1.png"},
                "grip": {
                    "key": "george_rv1_forearm_grip",
                    "file": "forearm_grip.png",
                    "semanticAnchors": {
                        "clutch": {
                            "u": 0.596244131455399,
                            "v": 0.7835990888382688
                        }
                    }
                },
                "collarTie": {
                    "key": "george_rv1_forearm_collar_tie",
                    "file": "forearm_collar_tie.png",
                    "semanticAnchors": {
                        "clutch": {
                            "u": 0.5766197183098591,
                            "v": 0.7510250569476081
                        }
                    }
                },
                "elbowCup": {
                    "key": "george_rv1_forearm_elbow_cup",
                    "file": "forearm_elbow_cup.png",
                    "semanticAnchors": {
                        "clutch": {
                            "u": 0.5436619718309859,
                            "v": 0.7366742596810935
                        }
                    }
                },
                "waistClasp": {
                    "key": "george_rv1_forearm_waist_clasp",
                    "file": "forearm_waist_clasp.png",
                    "semanticAnchors": {
                        "clutch": {
                            "u": 0.5673239436619718,
                            "v": 0.7558086560364465
                        }
                    }
                },
                "presentPalm": {
                    "key": "george_rv1_forearm_present_palm",
                    "file": "forearm_present_palm.png"
                },
                "dismiss": {
                    "key": "george_rv1_forearm_dismiss",
                    "file": "forearm_dismiss.png"
                },
                "chestTouch": {
                    "key": "george_rv1_forearm_chest_touch",
                    "file": "forearm_chest_touch.png"
                },
                "hairSmooth": {
                    "key": "george_rv1_forearm_hair_smooth",
                    "file": "forearm_hair_smooth.png",
                    "semanticAnchors": {
                        "hairContact": {
                            "u": 0.5727699530516432,
                            "v": 0.7562642369020501
                        }
                    }
                },
                "inspect": {
                    "key": "george_rv1_forearm_inspect",
                    "file": "forearm_inspect.png"
                },
                "hairFix": {
                    "key": "george_rv1_forearm_hair_fix",
                    "file": "forearm_hair_fix.png",
                    "semanticAnchors": {
                        "hairContact": {
                            "u": 0.5868544600938967,
                            "v": 0.8177676537585421
                        }
                    }
                }
            },
            "upperArm": {
                    headlockWrap: { key:'george_rv1_headlock_wrap',file:'upper_arm_headlockWrap_v1.png',projectedArm:{
                        shoulder:{u:340/1312,v:220/1199},elbow:{u:1010/1312,v:595/1199},wrist:{u:595/1312,v:950/1199},
                        scaleX:0.049,scaleY:0.049,followTorso:true,
                    },semanticAnchors:{headlockCrook:{u:640/1312,v:790/1199}} },
                "hairReach": {
                    "key": "george_rv1_upper_arm_hair_reach",
                    "file": "upper_arm_hair_reach.png",
                    "binding": null,
                    "distalAnchorFrac": {
                        "u": 0.5013513513513513,
                        "v": 0.6
                    }
                }
            }
        },
    },
};
export const george_roster_v1 = georgeRosterV1;
