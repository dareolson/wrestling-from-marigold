// PLAN_FALLS T4.7a (G4a r2a): the elbow drop animated in the runtime, ?falls=v1, on a man on the mat: Lou on George and George on Lou, supine and prone, both facings.
// Per frame it records the three overlap numbers (raw / outside the declared striking forearm + hand / depth conflict, falls_contact.mjs), the elbow-to-chest gap, the planted wrist's gap to the mat
// point and to the receiver, the attacker's largest joint step, both men's states, and how often damage fired. Frames are filmed for the loop strips (local, gitignored).
//   WFM_URL=http://localhost:5173 [BEFORE=1] node tools/debug/falls_g4a_r2a_probe.mjs [outDir=research/animation/falls-2026-11/g4a-r2a] [shots=1] [only=<id substring>]
// BEFORE=1 swaps the ground attack for the G4a behaviour (damage at the end of the flight, then _layDown), so the same matched window is measured on the old path.
// Matched window: from the attacker's first `down` frame (flight end) for 66 frames (1.1 s).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP } from './falls_g3_probe.mjs';
import { INSTALL_CONTACT, INSTALL_CONTACT_DECLARED } from './falls_contact.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, victim: 'george', attacker: 'lou' }, { att: GEORGE, def: LOU, victim: 'lou', attacker: 'george' }];
const [outRoot = 'research/animation/falls-2026-11/g4a-r2a', shots = '1', only = ''] = process.argv.slice(2);
const BEFORE = process.env.BEFORE === '1', TRIGGER_AT = 8, WINDOW = 66;
const FRAMES = process.env.FRAMES ?? 'frames', OUT = process.env.OUT ?? (BEFORE ? 'before.json' : 'results.json');   // T4.7b: FRAMES / OUT name the run when two code versions are filmed side by side (current = 54b60db, served on another port)
const DECL = { side: 'far', parts: ['Forearm', 'Hand'] };

const LAY = async (o) => {
    const C = await import('/src/constants.js'); window.__ringB = C.ringBoundsAtY;
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    d.state = 'down'; d.lying = o.lying; d.stateTimer = 99; d._groundHandoff = null; d._pain = null; d._sell = null;
    window.__prev = null; window.__hurts = 0; window.__hurtAt = null; window.__shakes = 0;
    if (!d.__hurtCounted) { d.__hurtCounted = true; const h0 = d._hurt.bind(d); d._hurt = (...r) => { window.__hurts++; window.__hurtAt = window.__frame ?? null; return h0(...r); };
        const sh0 = sc.cameras.main.shake.bind(sc.cameras.main); sc.cameras.main.shake = (...r) => { window.__shakes++; return sh0(...r); }; }   // wrapped once per page: the counters reset per cell
    if (o.before) a._beginGroundAttack = function (other, def, onContact) { onContact(); this._layDown(0.8, 'prone'); };
    window.__frame = 0;
};
const FRAME = (decl) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    window.__T += 1000 / 60; window.__frame++;
    game.step(window.__T, 1000 / 60);
    const snap = (w) => Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, [p.x, p.y]]));
    const cur = { a: snap(a), d: snap(d) }, prev = window.__prev;
    const step = (c, p) => { if (!p) return 0; let m = 0; for (const k of Object.keys(c)) if (p[k]) m = Math.max(m, Math.hypot(c[k][0] - p[k][0], c[k][1] - p[k][1])); return +m.toFixed(2); };
    const pa = a.skeleton.jointAttachmentPoints ?? {}, hipA = pa.nearHip && pa.farHip ? (pa.nearHip.y + pa.farHip.y) / 2 : (pa.nearHip ?? pa.farHip)?.y;
    const rootY = a._groundAttack?.root?.y ?? a.y, sc_ = a._groundAttack?.root ? a.skeleton ? (window.__s ?? 1) : 1 : 1;
    const row = { hipY: hipA === undefined ? null : +hipA.toFixed(2), hipH: hipA === undefined ? null : +(rootY - hipA).toFixed(2), as: a.state, ds: d.state, al: a.lying ?? null, ast: step(cur.a, prev?.a), dst: step(cur.d, prev?.d), ga: a._groundAttack ? +a._groundAttack.t.toFixed(3) : null, hurts: window.__hurts, shakes: window.__shakes,
        ax: Math.round(a.x), ay: Math.round(a.y), jolt: d._jolt ? 1 : 0 };
    if (a.state === 'down' || a._groundAttack) {
        const c = window.__contactDeclared(a, d, decl); Object.assign(row, { raw: c.raw, out: c.outside, conf: c.conflict, strike: c.strike, edge: c.edge, rl: c.recvLimb, rope: c.ropeOver });
        const chest = c.chest, el = a.skeleton.jointAttachmentPoints?.farElbow, wr = a.skeleton.jointAttachmentPoints?.farWrist;
        if (el) row.elbowGap = +Math.hypot(el.x - chest.x, el.y - chest.y).toFixed(1);
        if (wr) row.wristEdgeGap = +(c.edge - wr.y).toFixed(1);   // + = the wrist is above the receiver's far edge (on the mat beside him), - = inside his silhouette
        // lowest hand/forearm point vs the mat: the planted hand's y against the attacker's root y
    }
    const dp = d.skeleton.jointAttachmentPoints ?? {}; row.nAnk = dp.nearAnkle ? +dp.nearAnkle.y.toFixed(1) : null; row.fAnk = dp.farAnkle ? +dp.farAnkle.y.toFixed(1) : null;
    row.recvRest = Object.values(dp).filter(Boolean).length;
    window.__prev = cur;
    return row;
};
const SNAP = () => { const sc = window.__WFM_GAME.scene.scenes[0]; return Object.fromEntries(Object.entries(sc.w2.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, [p.x, p.y]])); };

mkdirSync(outRoot, { recursive: true });
const results = [];
for (const pair of PAIRS) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        await page.evaluate(INSTALL_CONTACT); await page.evaluate(INSTALL_CONTACT_DECLARED);
        const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
        for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) {
            const id = `elbowDrop-${lying}-${pair.attacker}-on-${pair.victim}-${facing > 0 ? 'right' : 'left'}`, dir = join(outRoot, FRAMES, id);
            if (only && !id.includes(only)) continue;
            const placed = await page.evaluate(SETUP, { gap: 120, stamina: 100, facing });
            await page.evaluate(LAY, { lying, before: BEFORE });
            const clip = { width: 640, height: 330, x: Math.max(0, Math.round(mX((placed.ax + placed.dx) / 2) - 320)), y: Math.round(mY(440) - 330) };
            if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
            const restBefore = await page.evaluate(SNAP);
            const rows = []; let downAt = null, standAt = null;
            for (let i = 0; i < 520; i++) {
                if (i === TRIGGER_AT) await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1._doElbowDrop(sc.w2); });
                const row = await page.evaluate(FRAME, DECL); rows.push(row);
                if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60, clip });
                if (row.as === 'down' && downAt === null && i > TRIGGER_AT) downAt = i;
                if (downAt !== null && row.as === 'standing') { standAt = i; if (i > standAt + 20) break; }
                if (standAt !== null && i > standAt + 20) break;
            }
            if (shots === '1') for (let i = 0; i < TRIGGER_AT - 3; i++) rmSync(join(dir, `s${String(i).padStart(4, '0')}.jpg`), { force: true });
            const restAfter = await page.evaluate(SNAP);
            const win = downAt === null ? [] : rows.slice(downAt, downAt + WINDOW).filter(r => r.raw !== undefined);
            const mx = (k) => win.length ? Math.max(...win.map(r => r[k] ?? 0)) : null, sum = (k) => win.reduce((n, r) => n + (r[k] ?? 0), 0);
            const contactI = rows.findIndex(r => r.hurts > 0), relI = rows.findIndex(r => r.ga !== null && r.ga >= 0.4);
            // roll-off end: the last frame of the ground attack
            const lastGa = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.ga !== null).at(-1);
            const seamAfter = lastGa ? rows[lastGa.i + 1] : null;
            const out = { id, lying, facing, attacker: pair.attacker, victim: pair.victim, before: BEFORE, downAt, window: [downAt, downAt === null ? null : downAt + win.length - 1],
                raw: { peak: mx('raw'), sum: sum('raw'), frames: win.filter(r => r.raw > 0).length }, outside: { peak: mx('out'), sum: sum('out'), frames50: win.filter(r => r.out > 50).length, frames: win.filter(r => r.out > 0).length },
                conflict: { peak: mx('conf'), sum: sum('conf'), frames: win.filter(r => r.conf > 0).length }, strikePeak: mx('strike'),
                contactFrame: contactI < 0 ? null : contactI, hurts: rows.at(-1).hurts, shakes: rows.at(-1).shakes,
                elbowGapAtContact: contactI < 0 ? null : rows[contactI].elbowGap, elbowGapMin: win.length ? Math.min(...win.filter(r => r.elbowGap !== undefined).map(r => r.elbowGap)) : null,
                rollEnd: lastGa ? { frame: lastGa.i, wristEdgeGap: lastGa.r.wristEdgeGap, raw: lastGa.r.raw, out: lastGa.r.out, strike: lastGa.r.strike } : null,
                attackerStepMax: win.length ? Math.max(...rows.slice(downAt, downAt + WINDOW).map(r => r.ast)) : null, seamAtEnd: lastGa ? Math.max(rows[lastGa.i].ast, seamAfter?.ast ?? 0) : null,
                states: rows.reduce((s, r, i) => (!s.length || s.at(-1).s !== r.as ? [...s, { s: r.as, i }] : s), []), frames: rows.length,
                recvRestDelta: +Math.max(...Object.keys(restBefore).map(k => restAfter[k] ? Math.hypot(restBefore[k][0] - restAfter[k][0], restBefore[k][1] - restAfter[k][1]) : 0)).toFixed(2), from: TRIGGER_AT - 3 };
            out.series = win.map(r => [r.ga, r.raw, r.out, r.conf, r.strike, r.elbowGap, r.wristEdgeGap, r.ax, r.ay]);
            out.steps = win.map(r => r.ast ?? 0).concat(rows.slice(downAt + WINDOW, downAt + WINDOW + 30).map(r => r.ast));   // per-frame attacker step, kept to find a seam
            // T4.7b marks (frame indices into rows) and the downward hip speed across them. apex = the hip's highest point before the hit; elbow contact = the hit frame (damage fires);
            // matLevel = the first frame the hip is within 2 px of the contact pose's height (hip 14 at s = 1) = "on the mat"; speed = hip y change per frame, + is down.
            const hitI = rows.findIndex(r => r.hurts > 0), pre = rows.slice(TRIGGER_AT, (hitI < 0 ? rows.length : hitI) + 1);
            const hv = rows.map((r, i) => (i && r.hipY !== null && rows[i - 1].hipY !== null ? +(r.hipY - rows[i - 1].hipY).toFixed(2) : null));
            const apexI = pre.reduce((m, r, i) => (r.hipY !== null && r.hipY < (pre[m].hipY ?? 1e9) ? i : m), 0) + TRIGGER_AT;
            const flightEnd = rows.findIndex(r => r.as === 'down');
            out.marks = { trigger: TRIGGER_AT, apex: apexI, flightEnd, hit: hitI, matLevel: rows.findIndex((r, i) => i >= TRIGGER_AT && r.hipH !== null && r.hipH <= 16 * 1.0 + 2 && r.as === 'down'), rolloff: rows.findIndex(r => r.ga !== null && r.ga >= 0.24) };
            // T4.7c: the stop (hip px/frame over the last 4 frames before the hit, the hit frame and the 4 after, and the squash = how far the hip sinks past its height at the hit), the receiver's
            // limbs against the attacker (px) and past the ropes (px), and the kicks (alternating upward swings of an ankle, > 8 px, after the curl)
            const hip0 = rows[hitI]?.hipH ?? null;
            out.stop = hitI < 0 ? null : { before: hv.slice(hitI - 4, hitI), at: hv[hitI], after: hv.slice(hitI + 1, hitI + 5), squash: +(hip0 - Math.min(...rows.slice(hitI, hitI + 8).map(r => r.hipH ?? hip0))).toFixed(1) };
            const after = rows.slice(hitI + 1, hitI + 75), peaks = (k) => { const base = rows[hitI]?.[k]; let n = 0; for (let i = 8; i < after.length - 1; i++) { const v = base - after[i][k], p = base - after[i - 1][k], q = base - after[i + 1][k]; if (v > 8 && v >= p && v > q) n++; } return n; };
            out.kicks = { near: peaks('nAnk'), far: peaks('fAnk') };
            out.recvLimbPeak = Math.max(0, ...rows.slice(hitI).map(r => r.rl ?? 0)); out.ropeOverPeak = Math.max(0, ...rows.slice(hitI).map(r => r.rope ?? 0));
            out.descent = hv.slice(apexI, (hitI < 0 ? apexI : hitI) + 3);   // hip px/frame from the apex through the hit (down +)
            out.speedAtHandoff = flightEnd < 0 ? null : { before: hv.slice(Math.max(0, flightEnd - 4), flightEnd), at: hv[flightEnd], after: hv.slice(flightEnd + 1, flightEnd + 5) };
            results.push(out);
            console.log(`[r2a${BEFORE ? ' BEFORE' : ''}] ${id}: raw peak ${out.raw.peak} (sum ${out.raw.sum}), outside peak ${out.outside.peak} (${out.outside.frames50} frames >50), conflict peak ${out.conflict.peak}, strike ${out.strikePeak}; elbow gap at contact ${out.elbowGapAtContact}; roll-off end ${JSON.stringify(out.rollEnd)}; hurts ${out.hurts}; seam ${out.seamAtEnd}; ${out.states.map(s => s.s).join('>')}`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, OUT), JSON.stringify(results, null, 1));
