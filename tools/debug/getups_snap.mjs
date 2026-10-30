// T4.2 (PLAN_GETUPS Rev 7): is the 35-63 px step into standing the separation snap? Forced rises (full backTuck, 1/60 s steps, tween clock
// pinned), the opponent standing on top of the riser or 150 px clear. Per frame it logs state, facing, root x/y, riseT and the distance
// and depth difference to the opponent, from the first rising frame to standing + 20 frames. The sampler is getups_g3.mjs's, cut down to
// the root: no parts are drawn here, the question is where the root goes.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_snap.mjs [outJson] [--off]
//   --off = ?getups off (legacy rise, flag-off behaviour). Default = ?getups=v1&getup=backTuck.
// Cases: riser (lou | george) x facing (-1 | 1) x gap (0 and 30 px = overlap, 150 px = clear control) x opponent ('standing' = idle on the
// spot, as the plan says; 'busy' = held in elbowDropping, the state the opponent had in the G3 snap cases: no move() separation for it).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';

const OUT = process.argv[2]?.startsWith('--') ? 'research/animation/getups-2026-10/g3/snap-probe.json' : (process.argv[2] ?? 'research/animation/getups-2026-10/g3/snap-probe.json');
const OFF = process.argv.includes('--off');
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const GAPS = [0, 30, 150];
const POST = 20, MAX_STEPS = 400;

const INSTALL = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    let a = 0x5eed1234;
    Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.__T = sc.time.now;
    return true;
};

// in-page: put `who` down on its back at the origin, the other wrestler `gap` px in front of it (the side it faces), start the rise
const BEGIN = ({ who, facing, gap, opp }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc[who], o = sc[who === 'w1' ? 'w2' : 'w1'];
    for (const q of [w, o]) { q.scene.tweens.killTweensOf(q); q.scene.tweens.killTweensOf(q.pose); }
    w.x = 520; w.y = 355; w.facing = facing; w.lying = 'supine';
    o.x = w.x + facing * gap; o.y = w.y; o.state = opp === 'busy' ? 'elbowDropping' : 'standing'; o.vx = 0; o.vy = 0; o.facing = -facing;
    for (const q of [w, o]) { q._activeMove = null; q._choreoUntil = 0; q._groundHandoff = null; q._sell = null; q._hold = null; q._pain = null; q.stamina = 100; q.combatBlend = 0; q.moveBlend = 0; q.walkPhase = 0; }
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    window.__rise = { who, w, o };
    w._startRiseUp();
    return { id: w._getUp?.id ?? null, s: w.s, oppS: o.s };
};

const STEP = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], { w, o } = window.__rise;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const dist = Math.hypot(w.x - o.x, w.y - o.y);
    return { now: sc.time.now, state: w.state, facing: w.facing, x: w.x, y: w.y, riseT: +(w.riseT ?? 0).toFixed(4),
        dist: +dist.toFixed(2), depthDiff: +Math.abs(w.y - o.y).toFixed(2), oState: o.state, ox: o.x, oy: o.y, swapAt: w._riseSwapAt ?? null };
};

process.env.WFM_P1 = RIGS.lou; process.env.WFM_P2 = RIGS.george;
process.env.WFM_QS = OFF ? 'notitle=1&getups=off' : 'notitle=1&getups=v1&getup=backTuck';
const h = await launch();
const cases = [];
try {
    const page = h.page;
    for (let i = 0; i < 60 && !(await h.snap())?.w1; i++) await page.waitForTimeout(500);
    await page.evaluate(INSTALL);
    for (const [rig, who] of [['lou', 'w1'], ['george', 'w2']]) for (const opp of ['standing', 'busy']) for (const facing of [-1, 1]) for (const gap of GAPS) {
        const begin = await page.evaluate(BEGIN, { who, facing, gap, opp });
        const rows = [];
        let standI = null;
        for (let i = 0; i < MAX_STEPS; i++) {
            const f = await page.evaluate(STEP);
            rows.push({ i, ...f });
            if (standI === null && f.state === 'standing') standI = i;
            if (standI !== null && i - standI >= POST) break;
        }
        const minDist = 80 * begin.s;
        const steps = rows.map((r, i) => (i ? +Math.hypot(r.x - rows[i - 1].x, r.y - rows[i - 1].y).toFixed(2) : 0));
        const max = steps.reduce((m, v, i) => (v > m.v ? { v, i } : m), { v: 0, i: 0 });
        const pre = standI ? rows[standI - 1] : null, st = standI !== null ? rows[standI] : null;
        const row = { rig, who, opp, facing, gap, getUp: begin.id, s: begin.s, minDist: +minDist.toFixed(2), frames: rows.length, standI,
            distBeforeStand: pre?.dist ?? null, distFirstStand: st?.dist ?? null, expected: pre ? +Math.max(0, minDist - pre.dist).toFixed(2) : null,
            standStep: standI ? steps[standI] : null, maxStep: max.v, maxStepAt: max.i, maxStepState: rows[max.i].state,
            facingStart: facing, facingEnd: rows.at(-1).facing, distEnd: rows.at(-1).dist, rows: rows.map((r, i) => ({ ...r, step: steps[i] })) };
        cases.push(row);
        console.log(`[snap] ${rig} ${opp.padEnd(8)} f${facing > 0 ? '+' : '-'} gap ${String(gap).padStart(3)}: ${row.getUp ?? 'legacy'}, stand at ${standI}, dist before ${row.distBeforeStand} -> first stand ${row.distFirstStand} (expect jump ~${row.expected}), standing-frame root step ${row.standStep}, max step ${row.maxStep} at ${row.maxStepAt} (${row.maxStepState}), facing ${row.facingStart} -> ${row.facingEnd}, end dist ${row.distEnd}`);
    }
} finally { await h.close(); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ off: OFF, cases }, null, 1));
process.exit(0);
