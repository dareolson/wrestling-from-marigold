// T4c.4p: the atomic drop's walk-away and turn. Films the drop with the film tool's 1/60 s steps (the receiver's frames run on after the clip to see the hand-off) for both pairs, both
// facings, and measures on the RECEIVER, game px unless noted:
//   stance sole slide: for each planted step window the sole's largest displacement from where it held (x and y) over the fully weighted span (plant weight 1);
//   gap to the attacker at the turn and at the clip's end (px, and over the attacker's scale);
//   facing pop: the largest joint step across the one frame the facing flips, beside the largest ordinary joint step in the 6 frames either side (the whip turn's 120 px is the ceiling);
//   hand-off: the largest joint step in the 12 frames after the clip against the largest in the 12 before;
//   rope: how many frames Wrestler._clamp moved a man while the clip played (want 0), with WFM_MIDX_L / WFM_MIDX_R=<game x> (or WFM_MIDX for both) to put the pair near the rope each facing walks toward: 'l' walks right, 'r' walks left.
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/atomic_walk_probe.mjs out.json
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';
import { ringBoundsAtY, perspectiveScale } from '../../src/constants.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lg', LOU, GEORGE], ['gl', GEORGE, LOU]];
const r1 = (v) => +v.toFixed(1), r2 = (v) => +v.toFixed(2);
const WINDOWS = [['r', 1.01, 1.17], ['l', 1.20, 1.36], ['r', 1.39, 1.54], ['l', 1.57, ATOMIC.turnAt]];   // fully weighted spans of the clip's defender plants
const step = (a, b) => Math.max(...Object.keys(a.pts).filter(k => b.pts[k]).map(k => Math.hypot(a.pts[k].x - b.pts[k].x, a.pts[k].y - b.pts[k].y)));
const out = { turnAt: ATOMIC.turnAt, runs: [] };
for (const [pid, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1' + (process.env.WFM_XQ ?? '');
    const h = await launch();
    try {
        const page = h.page; await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        await page.evaluate(() => {
            const W = window.__WFM_GAME.scene.scenes[0].w1.constructor.prototype;
            if (W.__clampSpy) return;
            const orig = W._clamp; W.__clampSpy = true; window.__clampHits = 0;
            W._clamp = function (...a) { const x = this.x, y = this.y, r = orig.apply(this, a); if (this._activeMove?.clip?.id === 'atomicDrop' && (this.x !== x || this.y !== y)) window.__clampHits++; return r; };
        });
        for (const facing of [-1, 1]) {
            const mx = process.env[facing < 0 ? 'WFM_MIDX_L' : 'WFM_MIDX_R'] ?? process.env.WFM_MIDX, midX = mx ? Number(mx) : undefined;   // each facing walks toward a different rope
            await page.evaluate(() => { window.__clampHits = 0; });
            const rows = await film(page, info, { facing, case: 'drop', mask: false, midX }, null, { quiet: 70, frames: 420 });
            const hits = await page.evaluate(() => window.__clampHits);
            const clip = rows.filter(r => r.t.clip === 'atomicDrop');
            if (!clip.length) { out.runs.push({ id: `${pid}-${facing < 0 ? 'l' : 'r'}`, noDrop: true, note: 'the hold ended before the drop (rope break) at this midX' }); continue; }
            const after = rows.slice(rows.indexOf(clip.at(-1)) + 1);
            const at = (t) => clip.reduce((m, r) => (Math.abs(r.t.time - t) < Math.abs(m.t.time - t) ? r : m));
            const sole = (r, side) => r.soles[1][side === 'near' ? 0 : 1];
            const slide = WINDOWS.map(([leg, a, b]) => {
                // the plant log names which painted side the leg is; take both and report the one that held (the smaller drift)
                const span = clip.filter(r => r.t.time >= a && r.t.time <= b), drift = (side) => { const p0 = sole(span[0], side); return { x: r2(Math.max(...span.map(r => Math.abs(sole(r, side).x - p0.x)))), y: r2(Math.max(...span.map(r => Math.abs(sole(r, side).y - p0.y)))) }; };
                const near = drift('near'), far = drift('far'), held = (near.x + near.y) <= (far.x + far.y) ? near : far;
                return { leg, from: a, to: b, held, notHeld: held === near ? far : near };
            });
            const turn = at(ATOMIC.turnAt), gap = (r) => ({ px: r1(Math.abs(r.d.x - r.a.x)), overS: r1(Math.abs(r.d.x - r.a.x) / r.a.s) });
            const iTurn = clip.findIndex(r => r.d.facing !== clip[0].d.facing && r.d.facing !== clip[Math.max(0, clip.indexOf(r) - 1)].d.facing);
            const flip = clip.findIndex((r, i) => i && r.d.facing !== clip[i - 1].d.facing);
            const around = flip > 0 ? Array.from({ length: 12 }, (_, k) => flip - 6 + k).filter(i => i > 0 && i < clip.length && i !== flip).map(i => step(clip[i - 1].d, clip[i].d)) : [];
            const pre = clip.slice(-13, -1).map((r, i, arr) => i ? step(arr[i - 1].d, r.d) : 0), post = after.slice(0, 12).map((r, i, arr) => step(i ? arr[i - 1].d : clip.at(-1).d, r.d));
            out.runs.push({
                id: `${pid}-${facing < 0 ? 'l' : 'r'}`, frames: clip.length, clampMovedFramesDuringClip: hits,
                slideHeldMax: { x: Math.max(...slide.map(s => s.held.x)), y: Math.max(...slide.map(s => s.held.y)) }, slide,
                gapAtTurn: gap(turn), gapAtClipEnd: gap(clip.at(-1)), gapAtImpact: gap(at(ATOMIC.impact)),
                flipFrame: flip > 0 ? r2(clip[flip].t.time) : null, flipJointStep: flip > 0 ? r1(step(clip[flip - 1].d, clip[flip].d)) : null, neighbourJointStepMax: around.length ? r1(Math.max(...around)) : null,
                handOffJointStepMax: r1(Math.max(...post, 0)), before12Max: r1(Math.max(...pre)), after: after.length,
                facingStart: clip[0].d.facing, facingEnd: clip.at(-1).d.facing, attackerFacing: [clip[0].a.facing, clip.at(-1).a.facing],
                defenderX: { atImpact: r1(at(ATOMIC.impact).d.x), atTurn: r1(turn.d.x), max: r1(Math.max(...clip.map(r => r.d.x))), min: r1(Math.min(...clip.map(r => r.d.x))) }, attackerX: { first: r1(clip[0].a.x), atTurn: r1(turn.a.x) }, ring: { left: r1(ringBoundsAtY(clip[0].d.y).left), right: r1(ringBoundsAtY(clip[0].d.y).right) },
                // the hands mid-walk (t = 1.30), as the drawn wrists over the pelvis (mean of the hips): x along his facing (negative = behind him), y down; the tailbone hand should be behind and low
                handsAtPain: ((r) => { const f = r.d.facing, pv = { x: (r.d.pts.nearHip.x + r.d.pts.farHip.x) / 2, y: (r.d.pts.nearHip.y + r.d.pts.farHip.y) / 2 }; return Object.fromEntries(['near', 'far'].map(n => [n, { behind: r1((r.d.pts[`${n}Wrist`].x - pv.x) * f / r.d.s), down: r1((r.d.pts[`${n}Wrist`].y - pv.y) / r.d.s) }])); })(at(1.30)),
                receiverStatesInClip: [...new Set(clip.map(r => r.t.states[1]))], staminaLostOverClip: r1(clip[0].t.stamina[1] - clip.at(-1).t.stamina[1]), damageSteps: clip.filter((r, i) => i && r.t.stamina[1] < clip[i - 1].t.stamina[1] - 1).length,   // one 12-point drop, on the impact frame
                dxPerFrame: clip.filter(r => r.t.time >= 0.99).map((r, i, arr) => i ? r2(Math.abs(r.d.x - arr[i - 1].d.x)) : 0).slice(1).reduce((m, v) => Math.max(m, v), 0),
            });
        }
    } finally { await h.close(); }
}
writeFileSync(process.argv[2] ?? 'atomic_walk.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.runs.map(({ slide, ...r }) => r), null, 1));
