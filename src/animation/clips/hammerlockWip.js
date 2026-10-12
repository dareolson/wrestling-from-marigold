// Derek's hammerlock, work in progress — AUDITION ONLY, selected with
// ?hammerlock=wip (see Arena's clip registration). The shipped hammerlock in
// ./hammerlock.js is unchanged and is what plays otherwise.
//
// 0.000–0.300  Derek's own keys: tie-up, step round, Lou turns behind George.
// 0.550        George's near arm folded up his back (elbow -3.0), pain face
//              (george head variant `hurt`); Lou's working hand on the trapped
//              wrist (editor drag solve; graded HELD, worst 0.33 px to 2.10s).
// 0.85–2.10    George's free arm flails; the hold is held.
// 2.400        release.
// Markers match the shipped executor: acquire-contact, apply-drain,
// release-contact. Draft: tools/move-editor/drafts/hammerlock-derek-wip.json
// ("hammerlock — Derek WIP" in the editor). Re-export from the editor to change it.
export const hammerlockWipClip = {
    id: "hammerlock",
    duration: 2.4,
    tracks: {
        attacker: {
            keyframes: [
                {
                    at: 0,
                    ease: "linear",
                    pose: {
                        lArm: 0.7,
                        rArm: 0.91,
                        lElbow: 1.58,
                        rElbow: 0.94,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.22,
                        rKnee: 0.22,
                        lean: 0,
                        crouch: 0
                    },
                    transform: {
                        x: 0,
                        y: 0
                    },
                    parts: {},
                    facing: 1
                },
                {
                    at: 0.128,
                    ease: "linear",
                    pose: {
                        lArm: 0.63,
                        rArm: 0.91,
                        lElbow: 0.79,
                        rElbow: 0.94,
                        lLeg: 0.76,
                        rLeg: -0.08,
                        lKnee: -0.1,
                        rKnee: 0.22,
                        lean: -0.11,
                        crouch: 0
                    },
                    transform: {
                        x: 34.5,
                        y: 0
                    },
                    parts: {},
                    facing: 1
                },
                {
                    at: 0.233,
                    ease: "linear",
                    pose: {
                        lArm: -0.52,
                        rArm: 0.09,
                        lElbow: 1.559,
                        rElbow: 0.51,
                        lLeg: 0.235,
                        rLeg: 0.042,
                        lKnee: -0.1,
                        rKnee: 0.025,
                        lean: -0.11,
                        crouch: 0
                    },
                    transform: {
                        x: 101.956,
                        y: 0
                    },
                    parts: {},
                    facing: 1
                },
                {
                    at: 0.3,
                    ease: "linear",
                    pose: {
                        lArm: -0.31,
                        rArm: 0.54,
                        lElbow: 2.05,
                        rElbow: 1.96,
                        lLeg: -0.1,
                        rLeg: 0.12,
                        lKnee: -0.1,
                        rKnee: -0.1,
                        lean: -0.11,
                        crouch: 0
                    },
                    transform: {
                        x: 145,
                        y: 0
                    },
                    parts: {},
                    facing: -1
                },
                {
                    at: 0.55,
                    ease: "linear",
                    pose: {
                        lArm: -0.499,
                        rArm: 0.54,
                        lElbow: 2.144,
                        rElbow: 1.96,
                        lLeg: -0.1,
                        rLeg: 0.12,
                        lKnee: -0.1,
                        rKnee: -0.1,
                        lean: -0.11,
                        crouch: 0
                    },
                    transform: {
                        x: 139.5,
                        y: 9
                    },
                    parts: {
                        workingHand: "grip"
                    },
                    facing: -1
                },
                {
                    at: 2.1,
                    ease: "linear",
                    pose: {
                        lArm: -0.499,
                        rArm: 0.54,
                        lElbow: 2.144,
                        rElbow: 1.96,
                        lLeg: -0.1,
                        rLeg: 0.12,
                        lKnee: -0.1,
                        rKnee: -0.1,
                        lean: -0.11,
                        crouch: 0
                    },
                    transform: {
                        x: 139.5,
                        y: 9
                    },
                    parts: {
                        workingHand: "grip"
                    },
                    facing: -1
                },
                {
                    at: 2.4,
                    ease: "linear",
                    pose: {
                        lArm: 0.2,
                        rArm: 0.54,
                        lElbow: 0.6,
                        rElbow: 1.96,
                        lLeg: -0.1,
                        rLeg: 0.12,
                        lKnee: -0.1,
                        rKnee: -0.1,
                        lean: 0,
                        crouch: 0
                    },
                    transform: {
                        x: 139.5,
                        y: 9
                    },
                    parts: {},
                    facing: -1
                }
            ]
        },
        defender: {
            keyframes: [
                {
                    at: 0,
                    ease: "linear",
                    pose: {
                        lArm: 0.93,
                        rArm: 1.15,
                        lElbow: 0.7,
                        rElbow: 0.7,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.22,
                        rKnee: 0.22,
                        lean: 0,
                        crouch: 0
                    },
                    transform: {
                        x: 100,
                        y: 0
                    },
                    parts: {},
                    facing: -1
                },
                {
                    at: 0.128,
                    ease: "linear",
                    pose: {
                        lArm: -0.744,
                        rArm: 0.128,
                        lElbow: 2.163,
                        rElbow: 0.931,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.22,
                        rKnee: 0.22,
                        lean: 0,
                        crouch: 0
                    },
                    transform: {
                        x: 69.5,
                        y: 12
                    },
                    parts: {},
                    facing: -1
                },
                {
                    at: 0.3,
                    ease: "linear",
                    pose: {
                        lArm: -0.22,
                        rArm: 0.85,
                        lElbow: -0.12,
                        rElbow: 1.04,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.22,
                        rKnee: 0.22,
                        lean: 0,
                        crouch: 0
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {},
                    facing: -1
                },
                {
                    at: 0.55,
                    ease: "linear",
                    pose: {
                        lArm: 0.5,
                        rArm: -0.3,
                        lElbow: 0.6,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.22,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 0.85,
                    ease: "linear",
                    pose: {
                        lArm: 1.7,
                        rArm: -0.3,
                        lElbow: 0.5,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.35,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 1.1,
                    ease: "linear",
                    pose: {
                        lArm: 2.2,
                        rArm: -0.3,
                        lElbow: 1.1,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.32,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 1.35,
                    ease: "linear",
                    pose: {
                        lArm: 1.6,
                        rArm: -0.3,
                        lElbow: 0.4,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.35,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 1.6,
                    ease: "linear",
                    pose: {
                        lArm: 2.3,
                        rArm: -0.3,
                        lElbow: 1.2,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.32,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 1.85,
                    ease: "linear",
                    pose: {
                        lArm: 1.7,
                        rArm: -0.3,
                        lElbow: 0.5,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.35,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 2.1,
                    ease: "linear",
                    pose: {
                        lArm: 2.2,
                        rArm: -0.3,
                        lElbow: 1,
                        rElbow: -3,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.25,
                        rKnee: 0.25,
                        lean: 0.32,
                        crouch: 0.12
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {
                        head: "hurt"
                    },
                    facing: -1
                },
                {
                    at: 2.4,
                    ease: "linear",
                    pose: {
                        lArm: 0.3,
                        rArm: 0.1,
                        lElbow: 0.5,
                        rElbow: 0.5,
                        lLeg: -0.08,
                        rLeg: 0.08,
                        lKnee: 0.22,
                        rKnee: 0.22,
                        lean: 0.1,
                        crouch: 0.05
                    },
                    transform: {
                        x: 89.5,
                        y: 13
                    },
                    parts: {},
                    facing: -1
                }
            ]
        }
    },
    events: [
        {
            at: 0.55,
            type: "acquire-contact"
        },
        {
            at: 0.7,
            type: "apply-drain"
        },
        {
            at: 2.4,
            type: "release-contact"
        }
    ]
};
