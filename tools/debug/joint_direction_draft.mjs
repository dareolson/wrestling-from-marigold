// Joint-direction check for one move-editor DRAFT (joint_direction_audit.mjs
// only sweeps registered clips). Samples the draft at 60 Hz for both actors on
// each cast, measures the rendered knee and elbow flex with the audit's own
// formula, and fails if any exceeds src/rig/articulation.js JOINT_LIMITS (or
// the knee reverses direction). Rendered-chain diagnostic only: not an
// anatomical certification and not visual approval. Node 22.
//
//   node tools/debug/joint_direction_draft.mjs <draft.json> [george,thesz-procreate-v1 ...]
//
// Casts are attacker,defender; default is the draft's own cast. Expects the
// dev server on 127.0.0.1:5173 (override with WFM_URL).
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const [draftPath, ...casts] = process.argv.slice(2);
const draft = JSON.parse(readFileSync(draftPath, 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failed = false;
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${process.env.WFM_URL ?? 'http://127.0.0.1:5173'}/tools/move-editor/`);
    await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
    const list = casts.length ? casts : [`${draft.preview.characters.attacker},${draft.preview.characters.defender}`];
    for (const cast of list) {
        const [attacker, defender] = cast.split(',');
        const rows = await page.evaluate(async ({ draft, attacker, defender }) => {
            const E = window.__MOVE_EDITOR;
            const model = await import('/tools/move-editor/model.js');
            const { JOINT_LIMITS } = await import('/src/rig/articulation.js');
            const d = JSON.parse(JSON.stringify(draft));
            d.preview = { ...d.preview, characters: { attacker, defender } };
            E.adoptDraft(d);
            await new Promise(r => setTimeout(r, 1500));
            const angle = (a, b) => Math.atan2(b.x - a.x, b.y - a.y);
            const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
            const deg = r => r * 180 / Math.PI;
            const out = [];
            const worst = {};
            for (const role of ['attacker', 'defender']) {
                const prevKnee = {};
                for (let i = 0; i <= Math.ceil(d.duration * 60); i++) {
                    const at = Math.min(d.duration, i / 60);
                    const sampled = model.sampleDraft(E.draft, at);
                    for (const r of ['attacker', 'defender']) {
                        const a = E.actors[r], s = sampled.tracks[r];
                        a.pose = { ...model.basePose(), ...s.pose };
                        a.transform = { x: 0, y: 0, ...s.transform };
                        a.parts = { ...s.parts };
                        a.facing = s.facing !== undefined ? E.stagingFacing() * s.facing : (E.draft.preview?.facing?.[r] ?? a.facing);
                    }
                    for (const r of ['attacker', 'defender']) E.renderActor(r);
                    const actor = E.actors[role], p = actor.skeleton.jointAttachmentPoints;
                    for (const side of ['near', 'far']) for (const [joint, names] of [['elbow', ['Shoulder', 'Elbow', 'Wrist']], ['knee', ['Hip', 'Knee', 'Ankle']]]) {
                        const [a, b, c] = names.map(n => p[side + n]);
                        if (!a || !b || !c) continue;
                        const flex = wrap(angle(b, c) - angle(a, b)) * actor.facing;
                        const key = `${role}/${side}${joint[0].toUpperCase()}${joint.slice(1)}`;
                        const w = worst[key] ??= { min: flex, max: flex, joint };
                        w.min = Math.min(w.min, flex); w.max = Math.max(w.max, flex);
                        // a knee flipping from flexed to hyperextended between samples is a reversal
                        if (joint === 'knee' && key in prevKnee && Math.sign(prevKnee[key]) !== Math.sign(flex) && Math.abs(flex - prevKnee[key]) > 0.5) out.push({ key, at, reversal: true });
                        if (joint === 'knee') prevKnee[key] = flex;
                    }
                }
            }
            const limits = JOINT_LIMITS;
            return { worst: Object.entries(worst).map(([key, w]) => ({ key, joint: w.joint, minDeg: deg(w.min), maxDeg: deg(w.max), ok: w.min >= limits[w.joint].min - 1e-3 && w.max <= limits[w.joint].max + 1e-3, limitDeg: [deg(limits[w.joint].min), deg(limits[w.joint].max)] })), reversals: out };
        }, { draft, attacker, defender });
        console.log(`${attacker} vs ${defender}`);
        for (const w of rows.worst) {
            if (!w.ok) failed = true;
            console.log(`  ${w.ok ? 'ok  ' : 'OVER'} ${w.key.padEnd(22)} ${w.minDeg.toFixed(0).padStart(5)}°…${w.maxDeg.toFixed(0).padStart(4)}°  (limit ${w.limitDeg[0].toFixed(0)}°…${w.limitDeg[1].toFixed(0)}°)`);
        }
        for (const r of rows.reversals) { failed = true; console.log(`  REVERSAL ${r.key} @${r.at.toFixed(3)}s`); }
    }
} finally { await browser.close(); }
console.log(failed ? 'FAIL' : 'PASS: every knee/elbow inside JOINT_LIMITS, no knee reversals');
process.exit(failed ? 1 : 0);
