// Lying-hold weight sweep (PLAN_SUPLEX_RISE T4.0b / D4; rig-agnostic since PLAN_GEORGE_TRANSFER T3.2): at which
// reach weight does the near hand sit within the rig's contactPx of backWaist while lying supine? Exact paused
// poses through the real Skeleton, both facings.
//   - contactPx is the rig's own (textures.backSell.contactPx); a rig with no backSell yet gets the provisional 15
//     and the output says so (backsell_probe_support.mjs installs provisional numbers on the page for the run);
//   - the contact is Skeleton.backContact(): the painted clutch patch of the active forearm art if it has one,
//     else the wrist ('wristProxy'). Rigs with a grip donor are swept with the grip art AND the baked fist; rigs
//     without one, with the fist only, and the criterion is then the fist's wrist proxy;
//   - since Rev 2 (D7, D8) the hold's reach weight is constant and the BODY moves (chest breath, knee draw-ups, hip
//     lift): each weight is measured at holdOffsets(t) for t every 0.1 s across the ramped part of one leg cycle
//     (what the game draws, through applyOffsets + limitKnees) and scored by the WORST of them;
//   - the suggested holdW is the smallest 0.05 step >= the worst first-pass weight over facings and arts (every
//     larger weight stays inside contactPx at every sampled offset). It must be <= 1, otherwise the tool says
//     STOP and prints the closest distances. It never moves the anchor.
//
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=george-roster-v1 node tools/debug/hold_weight_sweep.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { HOLD_BREATH, HOLD_LEGS, holdOffsets } from '../../src/animation/backRisePerformance.js';
import { INSTALL_PROVISIONAL_BACK_SELL } from './backsell_probe_support.mjs';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const out = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/hold-weight-sweep.json';
const STEPS = 200;  // weights in 1/200
// the offsets the hold draws: the rest pose first (the 'atRest' column), then one full leg cycle after the ramp
const OFFSETS = [holdOffsets(0)];
for (let t = HOLD_LEGS.rampSec; t < HOLD_LEGS.rampSec + HOLD_LEGS.cycleSec; t += 0.1) OFFSETS.push(holdOffsets(t));
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const install = await h.page.evaluate(INSTALL_PROVISIONAL_BACK_SELL);
    if (!install.ok) throw new Error(`${install.rig}: back sell not measurable: ${install.reason}`);
    const result = await h.page.evaluate(async ({ STEPS, OFFSETS }) => {
        const { applyOffsets, limitKnees } = await import('/src/animation/sells.js');
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
        const res = { rig: new URLSearchParams(location.search).get('p1'), facings: {} };
        const arts = Object.keys(sk._textureConfig.variants?.forearm ?? {}).includes('grip') ? ['grip', 'fist'] : ['fist'];
        for (const facing of [1, -1]) {
            const rows = [];
            for (const art of arts) for (let i = 0; i <= STEPS; i++) {
                const wt = i / STEPS;
                w.x = 400; w.y = 430; w.facing = facing; w.lying = 'supine'; w.state = 'down';
                sk.setPartVariants(art === 'grip' ? { nearForearm: 'grip' } : {});
                let worst = null, atRest = null;
                for (const [i, o] of OFFSETS.entries()) {
                    const g = limitKnees(applyOffsets(Sk.GROUNDED_POSES.supine, o));
                    sk.updateGroundedReach(400, 430, w.s * (w._heightScale ?? 1), facing, g, { near: { to: 'nearHip', w: wt } }, { paintedContacts: true, backContact: true });
                    const c = sk.backContact();
                    if (!worst || c.dist > worst.dist) worst = { dist: c.dist, contact: c.contact };
                    if (i === 0) atRest = c.dist;
                }
                rows.push({ art, w: wt, key: sk.nearForearm.texture.key, contact: worst.contact, dist: +worst.dist.toFixed(2), distRest: +atRest.toFixed(2) });
            }
            res.facings[facing] = rows;
        }
        res.arts = arts;
        return res;
    }, { STEPS, OFFSETS });
    const px = install.contactPx, { torso } = HOLD_BREATH;
    // first weight (from below) after which every larger weight stays within px, per facing and art
    const firstOk = rows => { for (let i = 0; i < rows.length; i++) if (rows.slice(i).every(r => r.dist <= px)) return rows[i].w; return null; };
    const summary = { contactPx: px, provisionalContactPx: install.provisional, torsoBreath: torso, offsetsSampled: OFFSETS.length - 1, arts: result.arts, perFacingArt: {}, closest: {} };
    for (const [f, rows] of Object.entries(result.facings)) for (const art of result.arts) {
        const r = rows.filter(x => x.art === art);
        summary.perFacingArt[`${f}/${art}`] = { firstWeightWithin: firstOk(r), contact: r[0].contact,
            atWeight: [0.5, 0.6, 0.7, 0.8, 0.9, 1].map(wt => [wt, r.find(x => Math.abs(x.w - wt) < 1e-9).dist]) };
        summary.closest[`${f}/${art}`] = r.reduce((a, b) => (b.dist < a.dist ? b : a));
    }
    const worst = Math.max(...Object.values(summary.perFacingArt).map(v => v.firstWeightWithin ?? Infinity));
    let holdW = null;
    for (let c = 0.05; c <= 1.0001; c += 0.05) if (c >= worst - 1e-9) { holdW = +c.toFixed(2); break; }
    summary.worstFirstWeight = Number.isFinite(worst) ? worst : null;
    summary.holdW = holdW;
    summary.distAtHoldW = holdW == null ? null : Object.fromEntries(Object.entries(result.facings).flatMap(([f, rows]) => result.arts.map(art => {
        const r = rows.find(x => x.art === art && Math.abs(x.w - holdW) < 1e-9); return [`${f}/${art}`, { worstOverHold: r.dist, atRest: r.distRest }]; })));
    summary.stop = holdW == null;
    result.install = install; result.summary = summary;
    for (const [k, v] of Object.entries(summary.perFacingArt)) console.log(`${k}: contact ${v.contact}; first weight from which every larger weight is within ${px} px over the hold cycle = ${v.firstWeightWithin}; dist at w .5/.6/.7/.8/.9/1 = ${v.atWeight.map(a => a[1]).join(' / ')}`);
    console.log(`install ${JSON.stringify(install)}`);
    console.log(summary.stop ? `STOP: no holdW <= 1 keeps the contact inside ${px} px on both facings; closest: ${JSON.stringify(summary.closest)}`
        : `suggested holdW ${holdW} for contactPx ${px}; dist at holdW (worst over the hold cycle, at rest): ${JSON.stringify(summary.distAtHoldW)}`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 1));
} finally { await h.close(); }
