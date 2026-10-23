// Figure-four LOCKED TABLEAU draft (plan T1.2). A 1.0 s static hold of the
// locked beat only: no rocking, no free-arm acting. It exists to prove the trap
// can be made to read with the existing art and valid joints before any
// performance work. NOT exported to src/ and not wired to the game.
//
//   node tools/move-editor/author_figurefour_tableau.mjs
//   node tools/move-critic/stage.mjs tools/move-editor/drafts/figurefour-tableau.unstaged.json \
//        tools/move-editor/figurefour_tableau.constraints.mjs tools/move-editor/drafts/figurefour-tableau.json
//
// Legs are named by pose channel; the ledger is
// research/animation/figure-four-tableau/LEDGER.md:
//   receiver (defender)  rLeg = S, straight, hurt, grabbed at purchase
//                        lLeg = C, crossed: its ankle lies across George's trapping shin
//   George (attacker)    lLeg = T, trapping leg   rLeg = B, bracing leg
// `bend`, never `lean` (lean does not move the rendered body).

import { writeFileSync } from 'node:fs';
import { pose, hipsAt, LYING } from './authoring.mjs';
import { normalizeDraft } from './model.js';

export const DURATION = 1.0;
export const KEYS = [0, DURATION];

// George lies back propped on his arms (the live clip's locked posture), legs
// threaded. Numbers below were found by searching the legs' channels for the
// ledger contacts, then staged by figurefour_tableau.constraints.mjs.
export const GEORGE = pose({
    lArm: -0.223, rArm: -0.50, lElbow: 0.40, rElbow: 0.40,
    lLeg: 1.014, lKnee: 2.153, rLeg: -0.496, rKnee: 1.331,
    tilt: -1.44, lift: -80.492,
});
// The receiver on his back, feet toward George, arms at rest.
export const RECEIVER = pose({
    lArm: 0.05, rArm: 0.05, lElbow: 0.10, rElbow: 0.10,
    lLeg: 0.70, lKnee: 1.323, rLeg: 1.172, rKnee: 0.30,
    tilt: -1.52, lift: LYING,
});
const X = { attacker: 53.088, defender: 141.6 };

// The ledger's lock chain (LEDGER.md, 1.60-3.40 s), back -> front: George's
// pelvis behind the straight leg S; the brace B over S's thigh; the trapping leg
// T over B; the crossed leg C on top, its ankle across T's shin. Anatomical
// names, so it holds in both facings and on every rig.
export const LOCK_CHAIN = [
    ['attacker', 'torso'], ['defender', 'rLeg'], ['attacker', 'rLeg'], ['attacker', 'lLeg'], ['defender', 'lLeg'],
];

const track = (poseAt, x) => ({ keyframes: KEYS.map(at => ({ at, ease: 'linear', pose: { ...poseAt }, transform: { x, y: 0 }, parts: {} })) });

export function buildTableau(characters = { attacker: 'george', defender: 'thesz-procreate-v1' }) {
    return normalizeDraft({
        id: 'figureFourTableau', duration: DURATION, posture: 'upright',
        tracks: { attacker: track(GEORGE, X.attacker), defender: track(RECEIVER, X.defender) },
        events: [], references: [],
        layers: [{ from: 0, to: DURATION, order: LOCK_CHAIN }],
        layerTie: ['defender', 'attacker'],
        preview: { facing: { attacker: 1, defender: -1 }, characters },
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const out = new URL('./drafts/figurefour-tableau.unstaged.json', import.meta.url);
    writeFileSync(out, `${JSON.stringify(buildTableau(), null, 2)}\n`);
    console.log(`wrote ${out.pathname}`);
}
