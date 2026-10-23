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
// research/animation/figure-four-tableau/LEDGER.md (v2, Derek's choreography):
//   receiver (defender)  rLeg = H, his far leg, bent with the shin pointing south: the hurt leg
//                        lLeg = N, his near leg, straight, straddling George
//   George (attacker)    lLeg = T, near leg, lands across H   rLeg = B, far leg, stepped between
//   George sits up ~42 deg, Flair 397-style (tilt -0.74) propped on his arms behind him.
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
    lArm: -0.107, rArm: -0.749, lElbow: 0.2, rElbow: 0.2,
    lLeg: 1.116, lKnee: 1.001, rLeg: 0.082, rKnee: 0.702,
    tilt: -0.739, lift: -79,
});
// The receiver on his back, feet toward George, arms at rest.
export const RECEIVER = pose({
    lArm: 0.05, rArm: 0.05, lElbow: 0.10, rElbow: 0.10,
    lLeg: 0.801, lKnee: 0.2, rLeg: 1.393, rKnee: 2.5,
    tilt: -1.52, lift: LYING,
});
const X = { attacker: 64.493, defender: 159.254 };

// The ledger's lock chain, back -> front: the hurt far leg H behind George (he sits
// between the receiver's legs); George's torso; B; T lying across H; the
// receiver's near leg N over George's lap. Anatomical names, so it holds in both
// facings and on every rig.
export const LOCK_CHAIN = [
    ['defender', 'rLeg'], ['attacker', 'torso'], ['attacker', 'rLeg'], ['attacker', 'lLeg'], ['defender', 'lLeg'],
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
