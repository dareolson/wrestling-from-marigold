// PLAN_GRAPPLES T2.2: the clasps in the real game. Real lockup input (and the go-behind for the waistlock), stepped 1/60 s.
// Per frame, per man: the forearm art on each arm, each closing grip's weight, the palm (clutch anchor) to its target in px, and the part step
// at every swap. Fails nonzero on art left on after the hold, or a swap not at the grip weight.
//   WFM_URL=http://localhost:5173 node tools/debug/clasp_probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
// palm (the clutch anchor of the clasped forearm) to the grip's target, per clasped arm: { <man>.<slot>: px }, and each closing grip's weight
const READ = async () => {
    const sc = window.__WFM_GAME.scene.scenes[0], out = {}, ls = sc.lockupState, ws = sc.waistlockState;
    const { lockupGrips, gripTarget } = await import('/src/animation/lockup.js');
    const { waistlockGrips } = await import('/src/animation/waistlock.js');
    let lists = null;
    if (ws?.grips) lists = waistlockGrips(ws.attacker, ws.defender, ws.grips);
    else if (ls?.grapple?.grips) lists = lockupGrips(ls.grapple.grabber ?? ls.attacker, ls.grapple.grabbed ?? ls.defender, ls.grapple.grips);
    const men = ws ? { attacker: ws.attacker, defender: ws.defender } : ls ? { attacker: ls.grapple?.grabber ?? ls.attacker, defender: ls.grapple?.grabbed ?? ls.defender } : {};
    out.mode = ws ? 'waistlock' : ls ? 'lockup' : 'none';
    out.men = {}; out.palm = {};
    for (const [id, w] of [['a', sc.w1], ['d', sc.w2]]) {
        const sk = w.skeleton, st = sk._partVariantState ?? {};
        out.men[id] = { near: st.nearForearm ?? 'base', far: st.farForearm ?? 'base' };
        const role = Object.keys(men).find(k => men[k] === w);
        for (const item of (role && lists?.[role]) || []) {
            if (!item.clasp) continue;
            const side = item.arm === 'l' ? sk.lChannelSide(w.facing) : (sk.lChannelSide(w.facing) === 'near' ? 'far' : 'near');
            const img = sk[`${side}Forearm`], P = sk.constructor.imageAnchorPoint(img, img?._semanticAnchors?.clutch), T = gripTarget(item, side), W = sk.jointAttachmentPoints[`${side}Wrist`];
            const on = st[`${side}Forearm`] === item.clasp;
            out.palm[`${id}.${item.clasp}.${side}`] = { w: +item.w.toFixed(3), on, palm: on && P && T ? +Math.hypot(P.x - T.x, P.y - T.y).toFixed(2) : null, wrist: W && T ? +Math.hypot(W.x - T.x, W.y - T.y).toFixed(2) : null };
        }
    }
    return out;
};
const step = (p, q, only = null) => { let m = 0; p.parts.forEach((a, i) => { if (!a.vis || !q.parts[i].vis || (only && !only.test(a.n))) return; a.c.forEach((c, j) => { m = Math.max(m, Math.hypot(c[0] - q.parts[i].c[j][0], c[1] - q.parts[i].c[j][1])); }); }); return m; };
const results = {}; let fails = 0;
const fail = (m) => { fails++; console.log('FAIL', m); };
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) for (const kind of ['lockup', 'waistlock']) {
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            const rows = [];
            for (let i = 0; i < 260; i++) {
                const press = { a: [] }, hold = { a: [] };
                if (kind === 'waistlock' && i === 40) { press.a = ['power']; hold.a = ['up']; }
                const row = await h.page.evaluate(STEP, { press, hold });
                const r = await h.page.evaluate(READ);
                rows.push({ i, ...r, rowA: row.a, rowD: row.d });
            }
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}-${kind}`;
            const worn = (r, m) => r.men[m].near !== 'base' || r.men[m].far !== 'base';
            const last = rows.at(-1), rec = { names: null, mode: [...new Set(rows.map(r => r.mode))], swaps: [], palmMax: {}, palmMean: {}, wristMean: {} };
            if (last.mode === 'none' && (worn(last, 'a') || worn(last, 'd'))) fail(`${id}: clasp art left on after the hold`);
            for (const m of ['a', 'd']) for (let k = 1; k < rows.length; k++) for (const slot of ['near', 'far']) {
                const was = rows[k - 1].men[m][slot], now = rows[k].men[m][slot];
                if (was === now) continue;
                const key = Object.keys(rows[k].palm).find(x => x.startsWith(m + '.') && rows[k].palm[x]) ?? null;
                const prev = Object.entries(rows[k - 1].palm).find(([x, v]) => x.startsWith(m + '.') && x.endsWith(now !== 'base' ? now : was));
                const wgt = (now !== 'base' ? rows[k].palm[`${m}.${now}.${slot}`] : rows[k - 1].palm[`${m}.${was}.${slot}`])?.w ?? null;
                rec.swaps.push({ man: m, slot, frame: k, to: now, weightAtSwap: wgt, forearmStepPx: +step(rows[k - 1][m === 'a' ? 'rowA' : 'rowD'], rows[k][m === 'a' ? 'rowA' : 'rowD'], /forearm/i).toFixed(1), forearmStepBeforePx: k > 1 ? +step(rows[k - 2][m === 'a' ? 'rowA' : 'rowD'], rows[k - 1][m === 'a' ? 'rowA' : 'rowD'], /forearm/i).toFixed(1) : null });
                if (now !== 'base' && wgt !== null && wgt < 0.5) fail(`${id}: ${m} swapped to ${now} at weight ${wgt}`);
            }
            const acc = {};
            for (const r of rows) for (const [k, v] of Object.entries(r.palm)) if (v.on && v.palm !== null && v.w >= 0.95) (acc[k] ??= { p: [], w: [] }, acc[k].p.push(v.palm), acc[k].w.push(v.wrist));
            for (const [k, v] of Object.entries(acc)) { rec.palmMax[k] = +Math.max(...v.p).toFixed(2); rec.palmMean[k] = +(v.p.reduce((a, b) => a + b, 0) / v.p.length).toFixed(2); rec.wristMean[k] = +(v.w.reduce((a, b) => a + b, 0) / v.w.length).toFixed(2); rec.palmFrames ??= {}; rec.palmFrames[k] = v.p.length; }
            results[id] = rec;
            console.log(id, JSON.stringify(rec));
        }
    } finally { await h.close(); }
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
if (fails) process.exit(1);
