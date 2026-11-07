// PLAN_FALLS T4.8b: George's roll legs. Stages the roll (top dive, receiver supine) for each attacker and facing and records, per frame from contact to landing, the attacker's drawn hip / knee / ankle
// points (jointAttachmentPoints) for both legs: thigh and shin length, and which side of the hip-ankle line the knee sits (cross sign, in the attacker's facing frame; a one-way knee keeps one sign).
//   WFM_URL=http://localhost:5173 node tools/debug/falls_g4b_r5_legs_probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP } from './falls_g3_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, who: 'lou' }, { att: GEORGE, def: LOU, who: 'george' }];
const LAY = (o) => { const d = window.__WFM_GAME.scene.scenes[0].w2; d.state = 'down'; d.lying = 'supine'; d.stateTimer = 9; d._groundHandoff = null; d._pain = null; d._sell = null; };
const FRAME = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1;
    window.__T += 1000 / 60; game.step(window.__T, 1000 / 60);
    const P = a.skeleton.jointAttachmentPoints ?? {}, pt = (k) => P[k] ? [+P[k].x.toFixed(1), +P[k].y.toFixed(1)] : null;
    return { as: a.state, seg: a._groundAttack?.seg ?? null, mirror: a._groundAttack?.def?.variant === 'roll' && a._groundAttack?.t != null, f: a.facing, 
        fh: pt('farHip'), nh: pt('nearHip'), fk: pt('farKnee'), nk: pt('nearKnee'), fa: pt('farAnkle'), na: pt('nearAnkle') };
};
const out = [];
for (const pair of PAIRS) for (const facing of [1, -1]) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1&splash=roll';
    const h = await launch();
    try {
        const page = h.page; await page.waitForTimeout(2500);
        await page.evaluate(INSTALL);
        await page.evaluate(SETUP, { gap: 220, stamina: 100, facing }); await page.evaluate(LAY, {});
        const rows = []; let started = false;
        for (let i = 0; i < 260; i++) {
            if (i === 8) await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return sc.w1._doTopDive(sc.w2); });
            const r = await page.evaluate(FRAME); rows.push(r);
            if (i > 60 && r.as === 'standing' && !r.seg) break;
        }
        out.push({ who: pair.who, facing, rows });
    } finally { await h.close?.(); }
}
writeFileSync(process.argv[2] ?? 'legs_probe.json', JSON.stringify(out));
console.log('wrote', out.map(o => `${o.who}/${o.facing}: ${o.rows.length}`).join(' '), 'keys', out[0].rows.find(r => r.keys.length)?.keys.join(','));
