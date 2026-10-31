// PLAN_GRAPPLES T3b.2: each exit's marker frame against the 0.14 s lead-in (exitBlend), flag on.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_3b2.mjs [out.json] [pairs=lg,gl]   (WFM_EXITS=suplex,whip for a subset)
// Every exit runs twice from a fresh launch, same seed and frames: once as shipped (the draw eased from the held tie-up) and once with the
// lead-in off (`_applyExitBlend` -> null), which draws the true pose. Per exit: the move's marker frames (runtime events; the pose-sequence
// moves have none, so their effect frames are fixed from the executor), the frame the lead-in lets go (first frame the two draws agree),
// the drawn-vs-true part distance at each marker, and the drawn contact: the attacker's nearest wrist to the defender's body parts.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP, EXITS } from './grapples_film.mjs';
import { partSteps } from './rise_handoff_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = { lg: { id: 'lou-george', att: LOU, def: GEORGE }, gl: { id: 'george-lou', att: GEORGE, def: LOU } };
const EXIT_FRAME = 48, FRAMES = 190;   // the longest marker (suplex 1.28 s) lands about 77 frames after the exit
// Pose-sequence moves have no runtime marker: what lands, and when (ms after the move starts), from Wrestler._doHeadlock / _doIrishWhip / _doArmDrag.
const FIXED = { headlock: [['hold applied', 0]], irishWhip: [['defender sent running', 0]], armDrag: [['damage', 0], ['sell + fall', 90]] };
const SPY = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], rt = sc.moveRuntime, play = rt.play.bind(rt);
    window.__ev = []; window.__n = 0;
    rt.play = (id, b, o = {}) => { const f = o.onEvent; return play(id, b, { ...o, onEvent: (e) => { window.__ev.push({ type: e.type, n: window.__n }); return f?.(e); } }); };
};
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l)) : 0; return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy)); };
const inside = (p, c) => { let s = 0; for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4], cr = (b[0] - a[0]) * (p.y - a[1]) - (b[1] - a[1]) * (p.x - a[0]); s += Math.sign(cr); } return Math.abs(s) === 4; };
const maxPart = (p, c) => Math.max(0, ...Object.values(partSteps(p, c)));

export function contact(row) {   // attacker wrist -> defender part, px at s = 1 (0 = inside the part's quad)
    let best = null;
    const A = row.a, D = row.d;
    for (const hand of ['nearWrist', 'farWrist']) {
        const p = A.pts[hand]; if (!p) continue;
        for (const part of D.parts) {
            if (!part.vis) continue;
            const d = inside(p, part.c) ? 0 : Math.min(...[0, 1, 2, 3].map(i => segDist(p, part.c[i], part.c[(i + 1) % 4])));
            if (best === null || d < best.d) best = { d, hand, part: part.n };
        }
    }
    return best && { d: +(best.d / A.s).toFixed(1), hand: best.hand, part: best.part };
}

export async function exitRun(page, { facing, ex, blend }) {
    await page.evaluate(SPY);
    if (!blend) await page.evaluate(() => { window.__WFM_GAME.scene.scenes[0]._applyExitBlend = () => null; });
    await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    const rows = [];
    for (let i = 0; i < FRAMES; i++) {
        const press = { a: [], d: [] }, hold = { a: [], d: [] };
        if (i === EXIT_FRAME) { for (const k of ex.keys) (['up', 'down', 'left', 'right'].includes(k) ? hold : press).a.push(k); if (ex.dir) hold.a.push(facing > 0 ? 'right' : 'left'); }
        const row = await page.evaluate(STEP, { press, hold });
        row.i = i; rows.push(row);
        await page.evaluate(() => { window.__n++; });
    }
    const ev = await page.evaluate(() => window.__ev);
    return { rows, ev };
}

export function analyse(on, off, ex) {
    const ei = on.rows.findIndex(r => !r.locked);
    if (ei < 0) return { ei };
    const diff = (k) => Math.max(maxPart({ parts: on.rows[k].a.parts }, { parts: off.rows[k].a.parts }), maxPart({ parts: on.rows[k].d.parts }, { parts: off.rows[k].d.parts }));
    const diffs = on.rows.map((_, k) => (k >= ei ? +diff(k).toFixed(2) : 0));
    const release = diffs.findIndex((d, k) => k >= ei && k > ei + 1 && d < 0.01);   // first frame the two draws agree
    const marks = (on.ev.length ? on.ev.map(e => [e.type, e.n]) : []).concat((FIXED[ex.move] ?? []).map(([name, ms]) => [name, ei + Math.round(ms / (1000 / 60))]));
    return {
        exitFrame: ei, leadInReleasedAt: release < 0 ? null : release - ei, leadInPeakDiff: Math.max(...diffs), peakAt: diffs.indexOf(Math.max(...diffs)) - ei,
        marks: marks.map(([name, n]) => ({ name, frame: n - ei, ms: Math.round((n - ei) * 1000 / 60), insideLeadIn: release < 0 || n < release, drawnVsTrue: diffs[n] ?? null, contact: contact(on.rows[n]) })),
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const out = process.argv[2] ?? '/tmp/3b2.json', pairs = (process.argv[3] ?? 'lg,gl').split(',').map(k => PAIRS[k]);
    const only = process.env.WFM_EXITS?.split(','), results = [];
    const fresh = async (pair) => { process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1'; const h = await launch(); await h.page.waitForTimeout(2500); const info = await h.page.evaluate(INSTALL); return { h, info }; };
    for (const pair of pairs) {
        const { h: h0, info: i0 } = await fresh(pair); await h0.close();
        for (const ex of EXITS) {
            if (!i0.moveSets.a.includes(ex.move) || (ex.needsNo && i0.moveSets.a.includes(ex.needsNo)) || (only && !only.includes(ex.id))) continue;
            for (const facing of [1, -1]) {
                const runs = [];
                for (const blend of [true, false]) { const { h } = await fresh(pair); try { runs.push(await exitRun(h.page, { facing, ex, blend })); } finally { await h.close(); } }
                const a = analyse(runs[0], runs[1], ex);
                results.push({ pair: pair.id, exit: ex.id, facing, ...a });
                console.log(pair.id.padEnd(11), ex.id.padEnd(10), String(facing).padStart(2), `lead-in lets go at +${a.leadInReleasedAt}f, peak ${a.leadInPeakDiff}px@+${a.peakAt}`, a.marks?.map(m => `${m.name} +${m.ms}ms${m.insideLeadIn ? ' (IN LEAD-IN)' : ''} true-gap ${m.drawnVsTrue} hand ${m.contact?.d}→${m.contact?.part}`).join(' ; '));
            }
        }
    }
    writeFileSync(out, JSON.stringify(results, null, 1));
}
