// Phase 0 measurement for CLAUDE_GEORGE_V9_BROADCAST_PASS.md.
//
// Measures each george-ai-pilot-v8 part's ACTUAL on-screen rendered size
// (Phaser Image displayWidth/displayHeight, i.e. real world/canvas px --
// this project's canvas is a fixed 960x600 backing store with no extra
// `resolution` multiplier, see src/main.js, so world px === canvas px here)
// rather than trusting the texture.box config values alone. Includes
// heightScale, perspectiveScale (near/mid/far ring depth), and any per-part
// near/far depth scale (RIG.FAR_ARM_SCALE, farShinScale/farThighScale)
// because all of those are folded into scaleX/scaleY before display size is
// read. Deliberately uses the UNROTATED display size, not getBounds()'s
// rotated axis-aligned box: rotating a raster at render time doesn't need
// extra source resolution beyond covering its own unrotated display
// footprint (confirmed by spot-checking one rotated sample: the rotated
// AABB derived exactly from displayWidth/displayHeight and rotation via the
// standard w*|cos|+h*|sin| formula, so it carries no extra information about
// the texture's real oversampling need -- it would only inflate the target
// output raster for no benefit).
//
//   node tools/debug/measure_v8_bounds.mjs
//
// Writes tools/debug/shots/george-v9-broadcast/phase0_measurements.json.

import { launch } from './harness.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHAR = 'george-ai-pilot-v8';
const outDir = fileURLToPath(new URL('./shots/george-v9-broadcast', import.meta.url));
fs.mkdirSync(outDir, { recursive: true });

// RING.nearLeft.y / farLeft.y from src/constants.js -- the actual y range
// perspectiveScale() interpolates across (0.58..1.0).
const DEPTHS = [
    { tag: 'near', y: 445 },
    { tag: 'mid', y: 351.5 },
    { tag: 'far', y: 258 },
];

const PARTS = [
    'torso', 'pelvisOverlay', 'head',
    'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm',
    'nearThigh', 'farThigh', 'nearShin', 'farShin',
];

// Poses sampled per Phase 0 item 3: idle, walking stride (both mid-gait
// extremes), overhead arm pose, one deep elbow/knee pose -- across both
// facings and all three depths, so the recorded max per part is a real
// observed maximum, not just the idle case.
const POSE_SAMPLES = [
    { tag: 'idle', apply: 'idle' },
    { tag: 'gaitContact', apply: 'gait', phase: 0 },
    { tag: 'gaitPassing', apply: 'gait', phase: Math.PI / 2 },
    { tag: 'gaitExtension', apply: 'gait', phase: Math.PI },
    { tag: 'overhead', apply: 'pose', pose: { lLeg: 0, rLeg: 0, lArm: Math.PI, rArm: Math.PI, lean: 0, crouch: 0 } },
    { tag: 'deepElbowKnee', apply: 'pose', pose: { lLeg: 1.72, rLeg: -0.3, lArm: -2.6, rArm: -2.6, lean: 0.1, crouch: 0.3 } },
];

process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = 'george';
const h = await launch();
await h.page.waitForTimeout(300);

const result = await h.page.evaluate(async ({ depths, parts, poseSamples }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
    const sk = w.skeleton;
    w.state = 'standing';
    w.vx = 0; w.vy = 0;
    w.x = 300;

    const idlePose = { ...w.pose }; // captured once, before any mutation below
    const out = [];
    for (const facing of [1, -1]) {
        w.facing = facing;
        for (const d of depths) {
            w.y = d.y;
            for (const p of poseSamples) {
                if (p.apply === 'idle') { w.moveBlend = 0; w.walkPhase = 0; w.pose = idlePose; }
                else if (p.apply === 'gait') { w.moveBlend = 1; w.walkPhase = p.phase; w.pose = idlePose; }
                else if (p.apply === 'pose') { w.moveBlend = 0; w.pose = p.pose; }
                w.draw();
                const row = { facing, depth: d.tag, y: d.y, pose: p.tag, s: w.s };
                for (const partName of parts) {
                    const img = sk[partName];
                    if (!img || typeof img.getBounds !== 'function') { row[partName] = null; continue; }
                    row[partName] = { w: img.displayWidth, h: img.displayHeight };
                }
                out.push(row);
            }
        }
    }
    return out;
}, { depths: DEPTHS, parts: PARTS, poseSamples: POSE_SAMPLES });

await h.close();
delete process.env.WFM_P1;
delete process.env.WFM_P2;

// Reduce to per-part maxima (across all facings/depths/poses sampled).
const maxByPart = {};
for (const partName of PARTS) maxByPart[partName] = { w: 0, h: 0, worst: null };
for (const row of result) {
    for (const partName of PARTS) {
        const b = row[partName];
        if (!b) continue;
        const cur = maxByPart[partName];
        if (b.w > cur.w) { cur.w = b.w; cur.worstW = { facing: row.facing, depth: row.depth, pose: row.pose }; }
        if (b.h > cur.h) { cur.h = b.h; cur.worstH = { facing: row.facing, depth: row.depth, pose: row.pose }; }
    }
}

const report = { character: CHAR, samples: result.length, maxByPart };
fs.writeFileSync(`${outDir}/phase0_measurements.json`, JSON.stringify(report, null, 2));

console.log(`Character: ${CHAR}`);
console.log(`Sampled ${result.length} (facing x depth x pose) combinations.`);
console.log('');
for (const partName of PARTS) {
    const m = maxByPart[partName];
    console.log(`${partName.padEnd(14)} max w=${m.w.toFixed(2)}px (${JSON.stringify(m.worstW)})  max h=${m.h.toFixed(2)}px (${JSON.stringify(m.worstH)})`);
}
console.log('');
console.log(`Wrote ${outDir}/phase0_measurements.json`);
