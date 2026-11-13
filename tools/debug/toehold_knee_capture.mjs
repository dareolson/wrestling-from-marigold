// Seed a review candidate from T3.0b's measured poses, retaining its solved fists.
// node tools/debug/toehold_knee_capture.mjs [sourceDir] [outDir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const source = process.argv[2] ?? 'research/animation/light-moves-2026-11/t3-0b';
const out = process.argv[3] ?? 'research/animation/light-moves-2026-11/t3-knee-capture';
export const CAPTURE_ORDER = [
    ['defender', 'rLeg'], ['defender', 'farArm'], ['defender', 'torso'],
    ['defender', 'head'], ['defender', 'nearArm'], ['attacker', 'farLeg'],
    ['attacker', 'farArm'], ['attacker', 'torso'], ['attacker', 'head'],
    ['defender', 'lLeg'], ['attacker', 'nearLeg'], ['attacker', 'nearArm'],
];
for (const pair of ['lou-george', 'george-lou']) for (const side of ['right', 'left']) {
    const r = JSON.parse(readFileSync(`${source}/${pair}-${side}/report.json`));
    const kneel = structuredClone(r['3-kneel'].authored);
    kneel.order = CAPTURE_ORDER;
    kneel.capture = true;
    // Centre the two already-solved knees on the mat, preserving their shape.
    const knees = r['3-kneel'].metrics.kneeToMat;
    kneel.attY += ((knees[0] + knees[1]) / 2 - 2.5) / .9;
    // Capture at the same hips position throughout the wrench: no sliding away
    // from the receiver's thigh into the previous legs-out seated ending.
    if (pair === 'lou-george') kneel.gap -= 20;
    kneel.att.bend = .4;
    const pull = structuredClone(kneel);
    pull.id = '4a-heels';
    pull.att.bend = .05;
    pull.att.lean = -.4;
    pull.def.lFold += .12;
    for (const pose of [kneel, pull]) r[pose.id] = { authored: pose };
    delete r['4b-mat'];
    mkdirSync(`${out}/${pair}-${side}`, { recursive: true });
    writeFileSync(`${out}/${pair}-${side}/report.json`, JSON.stringify(r, null, 2));
}
