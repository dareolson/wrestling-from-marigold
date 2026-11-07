// PLAN_GRAPPLES T2.2 r6, step 1: per hand, per frame of the tie-up (both pairs, both facings): the wrist's screen speed (px/frame), the grip weight, and the art worn.
//   WFM_URL=http://localhost:5174 node tools/debug/clasp_r6_speed.mjs <out.json>
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PLAIN_SEED = 1;   // breakKind(seed, false) is 'plain' for this seed (checked), 'shove' for 11 (the G2 default)
const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const READ = async () => {
    const sc = window.__WFM_GAME.scene.scenes[0], g = sc.lockupState?.grapple, out = {};
    const { lockupGrips } = await import('/src/animation/lockup.js');
    const lists = g?.grips && g.grabber ? lockupGrips(g.grabber, g.grabbed, g.grips) : null;
    for (const [id, w, role] of [['a', sc.w1, g?.grabber === sc.w1 ? 'attacker' : 'defender'], ['d', sc.w2, g?.grabber === sc.w2 ? 'attacker' : 'defender']]) {
        const sk = w.skeleton, ls = sk.lChannelSide(w.facing);
        for (const side of ['near', 'far']) {
            const W = sk.jointAttachmentPoints[`${side}Wrist`], arm = (ls === side) ? 'l' : 'r';
            const it = lists?.[role]?.find(x => x.arm === arm);
            out[`${id}.${side}`] = { x: W.x, y: W.y, w: it ? it.w : null, label: it?.clasp ?? null, art: sk._partVariantState?.[`${side}Forearm`] ?? 'base', locked: !!sc.lockupState };
        }
    }
    return out;
};
// the three ways a tie-up lets go: a shove-off (seed 11), the plain break, a rope break (the defender near the ropes: a stall)
const ENDINGS = [['shove', { seed: 11, defRope: null }], ['plain', { seed: PLAIN_SEED, defRope: null }], ['rope', { seed: 11, defRope: 30 }]];
const res = {};
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL);
        for (const [ending, spec] of ENDINGS) for (const facing of [1, -1]) {
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, ...spec, flag: true });
            const rows = [];
            for (let i = 0; i < 110; i++) { await h.page.evaluate(STEP, { press: {}, hold: {} }); rows.push(await h.page.evaluate(READ)); }
            res[`${pair}-${facing > 0 ? 'right' : 'left'}-${ending}`] = rows;
        }
    } finally { await h.close(); }
}
// Summary per hand: the grab (weight > 0 up to the first weight >= .95) and the release (first weight < .95 after frame 40, 10 frames): the
// frame and speed of the peak, and the frame and speed of each swap. `before` = the weight-.5 rule of r5, passed as --before <raw.json> (optional).
const speed = (rows, hand) => rows.map((r, i) => (i ? Math.hypot(r[hand].x - rows[i - 1][hand].x, r[hand].y - rows[i - 1][hand].y) : 0));
const before = process.argv.includes('--before') ? JSON.parse((await import('node:fs')).readFileSync(process.argv[process.argv.indexOf('--before') + 1], 'utf8')) : null;
const summary = {};
for (const [id, rows] of Object.entries(res)) for (const hand of Object.keys(rows[0])) {
    if (!rows.some(r => r[hand].label)) continue;
    const sp = speed(rows, hand), ws = rows.map(r => r[hand].w ?? 0), art = rows.map(r => r[hand].art);
    const g0 = ws.findIndex(w => w > 0), g1 = ws.findIndex(w => w >= 0.95), r0 = ws.findIndex((w, i) => i > 40 && w > 0 && w < 0.95);
    const argmax = (a, b) => { let k = a; for (let i = a; i <= b; i++) if (sp[i] > sp[k]) k = i; return k; };
    const swaps = (a) => ({ on: a.findIndex((v, i) => i && v !== 'base' && a[i - 1] === 'base'), off: a.findIndex((v, i) => i > 40 && v === 'base' && a[i - 1] !== 'base'), ons: a.filter((v, i) => i && v !== 'base' && a[i - 1] === 'base').length, offs: a.filter((v, i) => i && v === 'base' && a[i - 1] !== 'base').length });
    const now = swaps(art), old = before ? swaps(before[id].map(r => r[hand].art)) : null, bsp = before ? speed(before[id], hand) : null;
    const gp = argmax(g0, g1), rp = argmax(r0, r0 + 9);
    summary[`${id}.${hand}`] = { label: rows.find(r => r[hand].label)[hand].label, grabPeak: [gp, +sp[gp].toFixed(1)], grabSwap: [now.on, +sp[now.on].toFixed(1)], grabSwapBefore: old && [old.on, +bsp[old.on].toFixed(1)], releasePeak: [rp, +sp[rp].toFixed(1)], releaseSwap: [now.off, +sp[now.off].toFixed(1)], releaseSwapBefore: old && [old.off, +bsp[old.off].toFixed(1)], swapsOn: now.ons, swapsOff: now.offs, grabWithinOneFramePeak: Math.abs(now.on - gp) <= 1 };
}
writeFileSync(process.argv[2], JSON.stringify({ summary, raw: res }));
