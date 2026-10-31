// PLAN_GRAPPLES T3b.1: a standing move started inside the break's 220 ms settle (0, 60, 120, 200 ms after the lockup ends).
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_3b1.mjs [out.json]
// For each pair, facing and standing move the attacker's kit allows: the same move from plain idle (no lockup) is the baseline; the
// settle runs are compared with it. Reports leftover lShin/rShin/lKnee after the move owns the pose, knee line / stagger misses, and the
// first-frame part step. Exports `settleRun` for grapples_assert.mjs.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
import { INSTALL_LEGS, LIMITS } from './grapples_legs.mjs';
import { partSteps } from './rise_handoff_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
export const MOVES = [
    { id: 'jab', move: 'jab', press: ['power'] }, { id: 'kneeLift', move: 'kneeLift', press: ['power'], hold: ['up'] },
    { id: 'frontKick', move: 'frontKick', press: ['power'], hold: ['down'] }, { id: 'dropkick', move: 'dropkick', press: ['power'], gap: 150 },
    { id: 'lockup', move: 'lockup', press: ['action'] }, { id: 'taunt', move: 'taunt', press: ['finisher'], gap: 400 },
];
export const OFFSETS_MS = [0, 60, 120, 200];
const maxPart = (p, c) => Math.max(0, ...Object.values(partSteps(p, c)));

export async function settleRun(page, { facing, move, offsetMs, att, flag = true }) {
    let endRow = null;
    if (flag) {
        await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
        let row, n = 0;
        do { row = await page.evaluate(STEP, {}); n++; } while (row.locked && n < 300);
        if (row.locked) throw new Error('break never ended');
        endRow = row;
    } else {
        await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: false, seed: 11 });
        await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.lockupState = null; for (const w of [sc.w1, sc.w2]) { w.scene.tweens.killTweensOf(w.pose); w.state = 'standing'; Object.assign(w.pose, window.__idle); } });
    }
    const wait = Math.round(offsetMs / (1000 / 60));
    const rows = [];
    // put the defender where the move can reach, keeping the attacker where the break left him (a is the mover)
    if (move.gap) await page.evaluate(({ gap }) => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w2.x = sc.w1.x + sc.w1.facing * gap * sc.w1.s; }, { gap: move.gap });
    else await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; const d = Math.abs(sc.w2.x - sc.w1.x), reach = 70 * sc.w1.s; if (d > reach) sc.w2.x = sc.w1.x + sc.w1.facing * reach; });
    for (let i = 0; i < wait; i++) rows.push(await page.evaluate(STEP, { legs: { a: null, d: null } }));
    const before = rows.at(-1) ?? endRow ?? await page.evaluate(STEP, { legs: { a: null, d: null } });   // 0 ms: the press is the very next frame after the one that ended the lockup
    const t0 = rows.length;
    for (let i = 0; i < 40; i++) {
        const r = await page.evaluate(STEP, { press: i === 0 ? { a: move.press } : {}, hold: i === 0 && move.hold ? { a: move.hold } : {}, legs: { a: null, d: null } });
        const L = await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; const l = window.__legs(sc.w1, null); return { near: l.near.kneeLine, far: l.far.kneeLine, ankle: l.stagger.ankle, knee: l.stagger.knee, shin: [sc.w1.pose.lShin, sc.w1.pose.rShin], knees: [sc.w1.pose.lKnee, sc.w1.pose.rKnee], state: sc.w1.state, act: !!sc.w1._activeMove, home: !!sc.w1._shinHome }; });
        rows.push({ ...r, L, i });
    }
    const mv = rows.slice(t0);
    const started = mv.findIndex(r => r.L.state !== 'standing' || r.L.act);
    return { before, mv, started, locked: mv.some(r => r.locked), dist: Math.abs(mv[0].d.x - mv[0].a.x) };
}

export function summarize(res, base = null) {
    const { mv, started, before } = res;
    if (started < 0) return { started: false, dist: +res.dist.toFixed(0) };
    // leftover: an absolute shin on the mover once his state is no longer 'standing'
    const owned = (k, i) => base?.mv?.[base.started + i]?.L.shin[k];   // a shin the move authors itself is in the baseline at the same frame
    const left = mv.slice(started).filter((r, i) => [0, 1].some(k => r.L.shin[k] !== undefined && (base === null || owned(k, i) === undefined || Math.abs(owned(k, i) - r.L.shin[k]) > 0.02)));
    const kneeLine = Math.min(...mv.slice(started).flatMap(r => [r.L.near, r.L.far]).filter(v => v !== null));
    const ankle = Math.min(...mv.slice(started, started + 20).map(r => Math.abs(r.L.ankle)));
    const knee = Math.min(...mv.slice(started, started + 20).map(r => Math.abs(r.L.knee)));
    const step0 = maxPart({ parts: (mv[started - 1] ?? before).a.parts }, { parts: mv[started].a.parts });
    let step12 = 0; for (let k = started; k < Math.min(mv.length, started + 12); k++) step12 = Math.max(step12, maxPart({ parts: (mv[k - 1] ?? before).a.parts }, { parts: mv[k].a.parts }));
    return { started: true, dist: +res.dist.toFixed(0), startFrame: started, leftoverFrames: left.length, leftoverLast: left.length ? left.at(-1).i - mv[started].i : null, kneesStart: mv[started].L.knees.map(v => v === undefined ? null : +v.toFixed(3)), kneesEnd: mv.at(-1).L.knees.map(v => v === undefined ? null : +v.toFixed(3)), shinEnd: mv.at(-1).L.shin, kneeLine: +kneeLine.toFixed(2), ankleStagger: +ankle.toFixed(1), kneeStagger: +knee.toFixed(1), firstStep: +step0.toFixed(2), maxStep12: +step12.toFixed(2) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const out = process.argv[2] ?? '/tmp/3b1.json';
    const results = [];
    const fresh = async (att, def) => {   // a move leaves clips, holds and tweens behind: every run gets its own launch
        process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
        const h = await launch(); await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL); await h.page.evaluate(INSTALL_LEGS);
        return { h, info };
    };
    for (const [att, def] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const kit = (() => null)();
        const { h: h0, info: i0 } = await fresh(att, def); await h0.close();
        for (const facing of [1, -1]) for (const mv of MOVES) {
            if (mv.move !== 'lockup' && mv.move !== 'taunt' && !i0.moveSets.a.includes(mv.move)) continue;
            const line = { att: att === LOU ? 'Lou' : 'George', facing, move: mv.id, at: {} };
            let baseRes = null;
            for (const ms of [null, ...OFFSETS_MS]) {
                const { h, info } = await fresh(att, def);
                try { const res = await settleRun(h.page, { facing, move: mv, offsetMs: ms ?? 400, att, flag: ms !== null }); if (ms === null) { baseRes = res; line.base = summarize(res); } else line.at[ms] = summarize(res, baseRes); }
                finally { await h.close(); }
            }
            results.push(line);
            const f = (x) => x.started ? `${x.leftoverFrames}L k${x.kneeLine} a${x.ankleStagger} n${x.kneeStagger} s${x.firstStep}/${x.maxStep12}` : 'no start';
            console.log(line.att.padEnd(6), String(facing).padStart(2), mv.id.padEnd(9), 'base', f(line.base), '|', OFFSETS_MS.map(ms => `${ms}: ${f(line.at[ms])}`).join(' | '));
        }
    }
    writeFileSync(out, JSON.stringify(results, null, 1));
}
