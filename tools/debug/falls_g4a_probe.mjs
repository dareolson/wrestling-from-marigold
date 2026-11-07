// PLAN_FALLS T4.1-T4.2b: films the down-hit reaction and the attacker landings for G4a (?falls=v1). Each cell stages the move's own _doX on a man already on the mat
// (supine or prone), both facings, both rig pairs, and records per frame the largest joint step of each man (px, from jointAttachmentPoints), both men's states and the jolt.
//   WFM_URL=http://localhost:5173 [FLAG=falls=v1] node tools/debug/falls_g4a_probe.mjs [outDir=research/animation/falls-2026-11/g4a] [shots=1]
// Cells: elbowDrop, kneeDrop, divingElbow, topDive on a downed man (the attacker lands on him); theszPress whiffs on a downed man (it only hits a standing one). Seams: the attacker's first `down`
// frame (flight -> mat) and the receiver's frames from the hit until the jolt ends. Misses first: step over 2.5 px/frame at a seam, the receiver not back on the exact rest pose.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP } from './falls_g3_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, victim: 'george', attacker: 'lou' }, { att: GEORGE, def: LOU, victim: 'lou', attacker: 'george' }];
const CELLS = [
    { move: 'elbowDrop', call: 'a._doElbowDrop(w)', gap: 120, lyings: ['supine', 'prone'] },
    { move: 'kneeDrop', call: 'a._doKneeDrop(w)', gap: 120, lyings: ['supine', 'prone'] },
    { move: 'divingElbow', call: 'a._doDive(w)', gap: 220, lyings: ['supine', 'prone'] },
    { move: 'topDive', call: 'a._doTopDive(w)', gap: 220, lyings: ['supine', 'prone'] },
    { move: 'theszPress', call: 'a._doTheszPress(w)', gap: 120, lyings: ['supine'], whiff: true },
];
const STEP_LIMIT = 2.5, TRIGGER_AT = 8;

const LAY = (o) => {
    const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2;
    if (o.lying) { d.state = 'down'; d.lying = o.lying; d.stateTimer = 9; d._groundHandoff = null; d._pain = null; d._sell = null; }
    window.__prev = null;
};
const FRAME = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const snap = (w) => Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, [p.x, p.y]]));
    const cur = { a: snap(a), d: snap(d) }, prev = window.__prev;
    const step = (c, p) => { if (!p) return 0; let m = 0; for (const k of Object.keys(c)) if (p[k]) m = Math.max(m, Math.hypot(c[k][0] - p[k][0], c[k][1] - p[k][1])); return +m.toFixed(2); };
    const row = { as: a.state, ds: d.state, al: a.lying ?? null, dl: d.lying ?? null, ast: step(cur.a, prev?.a), dst: step(cur.d, prev?.d), jolt: d._jolt ? +d._jolt.t.toFixed(3) : null, jm: d._jolt?.move ?? null,
        ax: Math.round(a.x), dx: Math.round(d.x), atilt: +(a.pose.tilt ?? 0).toFixed(2), alift: Math.round(a.pose.lift ?? 0), at: +(a.stateTimer ?? 0).toFixed(2), ag: a._groundHandoff ? 1 : 0 };
    window.__prev = cur; window.__cur = cur;
    return row;
};
const SNAP = () => window.__cur?.d ?? null;

const [outRoot = 'research/animation/falls-2026-11/g4a', shots = '1'] = process.argv.slice(2);
const flag = process.env.FLAG ?? 'falls=v1';
mkdirSync(outRoot, { recursive: true });
const results = [];
for (const pair of PAIRS) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = `notitle=1&grapples=v1&${flag}`;
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
        for (const cell of CELLS) for (const lying of cell.lyings) for (const facing of [1, -1]) {
            const id = `${cell.move}-${lying ?? 'standing'}-${pair.victim}-${facing > 0 ? 'right' : 'left'}`, dir = join(outRoot, 'frames', id);
            const placed = await page.evaluate(SETUP, { gap: cell.gap, stamina: 100, facing }); await page.evaluate(LAY, { lying });
            const clip = { width: 640, height: 330, x: Math.max(0, Math.round(mX((placed.ax + placed.dx) / 2) - 320)), y: Math.round(mY(440) - 330) };
            if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
            const rows = []; let before = null, downAt = null, calm = 0;
            for (let i = 0; i < 520; i++) {
                if (i === TRIGGER_AT) { before = await page.evaluate(SNAP); await page.evaluate(({ call }) => { const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, w = sc.w2; return eval(call); }, { call: cell.call }); }   // eslint-disable-line no-eval
                const row = await page.evaluate(FRAME); rows.push(row);
                if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60, clip });
                if (row.as === 'down' && downAt === null && i > TRIGGER_AT) downAt = i;
                if (downAt !== null && row.as === 'standing') calm++; else calm = 0;
                if (calm >= 25) break;
                if (downAt === null && i > TRIGGER_AT + 150 && row.as === 'standing') break;
            }
            if (shots === '1') for (let i = 0; i < TRIGGER_AT - 3; i++) rmSync(join(dir, `s${String(i).padStart(4, '0')}.jpg`), { force: true });   // the idle lead-in is not kept
            const after = await page.evaluate(SNAP);
            const jolts = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.jolt !== null);
            const jFrom = jolts[0]?.i ?? null, jTo = jolts.at(-1)?.i ?? null;
            const maxIn = (a, b, k) => a === null ? null : Math.max(...rows.slice(a, b + 1).map(r => r[k]));
            // the receiver back on the exact rest pose: every joint within 0.5 px of where it was before the hit
            let restDelta = null;
            if (before && after) restDelta = +Math.max(...Object.keys(before).map(k => Math.hypot(before[k][0] - after[k][0], before[k][1] - after[k][1]))).toFixed(2);
            const seq = []; for (const [i, r] of rows.entries()) if (!seq.length || seq.at(-1).s !== r.as) seq.push({ s: r.as, i });
            // the knee drop never lies down: the rise is the frames from the end of the flight (elbowDropping -> slamming) to standing
            const fl = rows.findIndex(r => r.as === 'elbowDropping'), landAt = fl < 0 ? -1 : rows.findIndex((r, i) => i > fl && r.as === 'slamming'), stoodAt = landAt < 0 ? -1 : rows.findIndex((r, i) => i > landAt && r.as === 'standing');
            const out = { kneeRise: cell.move === 'kneeDrop' && landAt >= 0 ? { frames: stoodAt - landAt, maxStep: Math.max(...rows.slice(landAt, stoodAt + 1).map(r => r.ast)), stepBefore: rows[landAt - 1].ast } : undefined, id, move: cell.move, lying, facing, victim: pair.victim, attacker: pair.attacker, downAt, joltFrames: jFrom === null ? null : [jFrom, jTo], joltMaxStepRecv: maxIn(jFrom ?? 0, jTo ?? -1, 'dst'),
                attackerSeamStep: downAt === null ? null : rows[downAt].ast, attackerStepAfterSeam: downAt === null ? null : Math.max(...rows.slice(downAt + 1, downAt + 6).map(r => r.ast)),
                attackerStepBefore: downAt === null ? null : Math.max(...rows.slice(Math.max(0, downAt - 5), downAt).map(r => r.ast)), handoff: downAt === null ? null : rows[downAt].ag,
                from: TRIGGER_AT - 3, attackerStates: seq, recvEnd: rows.at(-1).ds, restDelta, frames: rows.length };
            results.push(out);
            console.log(`[g4a] ${id}: att ${seq.map(s => s.s).join('>')} seam ${out.attackerSeamStep} (before ${out.attackerStepBefore}, after ${out.attackerStepAfterSeam}); jolt ${out.joltFrames ?? 'none'} max step ${out.joltMaxStepRecv}; rest delta ${restDelta}`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, process.env.OUT ?? 'results.json'), JSON.stringify(results, null, 1));
console.log(`wrote ${results.length} cells; step limit ${STEP_LIMIT} px/frame`);
