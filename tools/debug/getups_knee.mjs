// Knee audit (Derek 2026-10-29, G3 "gumby legs"): a human knee bends until the leg is straight and goes no further. This measures the DRAWN
// knee through every forced get-up: per frame, for the near and far leg, d = shin channel - thigh channel as _applyGrounded is handed them.
// Table convention (Skeleton grounded channels): d < 0 = flexed (heel toward the seat), d = 0 straight, d > 0 = hyperextended.
// Forced rises as getups_film.mjs does (INSTALL / BEGIN / STEP of rise_handoff_probe.mjs; Lou = w1 so the rig is p1), 1/60 s steps,
// from the rise's first frame to standing + 20 frames. Per case it reports the worst (largest) d for each leg, where, and how many frames d > tol.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_knee.mjs [outJson] [--flagoff]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN } from './rise_handoff_probe.mjs';

const OUT = process.argv[2]?.startsWith('--') || !process.argv[2] ? 'research/animation/getups-2026-10/knee/knee-audit.json' : process.argv[2];
const OFF = process.argv.includes('--flagoff');
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const TOL = 0.02; // rad (about 1 deg): below this is straight
// family -> how it is forced (lying, back-sell pain, opponent front = straight variant / behind = turn variant)
const CASES = [
    { id: 'backKneeHurt-turn', family: 'backKneeHurt', lying: 'supine', pain: false, opp: 'behind' },
    { id: 'backKneeHurt-straight', family: 'backKneeHurt', lying: 'supine', pain: false, opp: 'front' },
    { id: 'backKneeHurtBack-straight', family: 'backKneeHurt', lying: 'supine', pain: true, opp: 'front' },
    { id: 'backTuck', family: 'backTuck', lying: 'supine', pain: false, opp: 'front' },
    { id: 'frontKnee-turn', family: 'frontKnee', lying: 'prone', pain: false, opp: 'behind' },
    { id: 'frontKnee-straight', family: 'frontKnee', lying: 'prone', pain: false, opp: 'front' },
];

// in-page: the knee of both legs as the skeleton is handed it. _applyGrounded is wrapped to keep the channels of its last call, so
// this is exactly what is drawn (key tables, stall droop, hold blend, hand routing), not the table alone. (Reading the parts' world
// rotations is not usable: the near and far images carry different base angles.) d = shin - thigh, table convention.
const WRAP = () => {
    const sk = window.__rw.skeleton;
    if (sk.__kneeWrapped) return;
    const orig = sk._applyGrounded.bind(sk);
    sk._applyGrounded = (x, y, s, facing, g) => { sk.__lastG = { nearThigh: g.nearThigh, nearShin: g.nearShin, farThigh: g.farThigh, farShin: g.farShin, frame: window.__film?.n ?? 0 }; return orig(x, y, s, facing, g); };
    sk.__kneeWrapped = true;
};
const KNEE = () => {
    const w = window.__rw, sk = w.skeleton, g = sk.__lastG;
    sk.__lastG = null; // a frame that does not go through _applyGrounded (standing) reports null
    return { state: w.state, riseT: +(w.riseT ?? 0).toFixed(4), facing: w.facing,
        near: g ? +(g.nearShin - g.nearThigh).toFixed(4) : null, far: g ? +(g.farShin - g.farThigh).toFixed(4) : null };
};

const results = [];
for (const [name, rig] of Object.entries(RIGS)) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    for (const c of CASES) {
        process.env.WFM_QS = OFF ? 'notitle=1' : `notitle=1&getups=v1&getup=${c.family}`;
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(400);
            await page.evaluate(INSTALL);
            await page.evaluate(WRAP);
            for (const facing of [-1, 1]) {
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: c.lying, pain: c.pain, facing, pose: 'stale', opp: c.opp });
                const id = await page.evaluate(() => window.__rw._getUp?.id ?? null);
                const rows = []; let standI = null;
                for (let i = 0; i < 400; i++) {
                    await page.evaluate(() => { const game = window.__WFM_GAME; window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); });
                    const k = await page.evaluate(KNEE);
                    rows.push({ i, ...k });
                    if (standI === null && k.state === 'standing') standI = i;
                    if (standI !== null && i - standI >= 20) break;
                }
                const worst = (key) => rows.reduce((m, r) => (r[key] !== null && r[key] > m.v ? { v: r[key], i: r.i, t: r.riseT, st: r.state } : m), { v: -9 });
                const over = (key) => rows.filter(r => r[key] !== null && r[key] > TOL).length;
                const res = { rig: name, case: c.id, getUp: id, facing, frames: rows.length, standI, near: worst('near'), far: worst('far'), nearOver: over('near'), farOver: over('far'),
                    flexMin: { near: Math.min(...rows.filter(r => r.near !== null).map(r => r.near)), far: Math.min(...rows.filter(r => r.far !== null).map(r => r.far)) }, rows };
                results.push(res);
                console.log(`[knee] ${name.padEnd(6)} ${c.id.padEnd(26)} f${facing > 0 ? '+' : '-'} ${String(id).padEnd(22)} near worst ${res.near.v.toFixed(3)} @${res.near.i} (riseT ${res.near.t}, ${res.near.st}) over ${res.nearOver} | far worst ${res.far.v.toFixed(3)} @${res.far.i} over ${res.farOver}`);
            }
        } finally { await h.close(); }
    }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ flagOff: OFF, tol: TOL, results }, null, 1));
process.exit(0);
