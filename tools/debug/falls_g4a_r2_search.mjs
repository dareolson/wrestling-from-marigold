// PLAN_FALLS T4.6: a grid over the contact pose (torso angle, striking-arm angle, forearm fold) with the striking elbow pinned on the receiver's chest; prints the overlap
// of each cell so the pose constants in src/animation/groundContact.js are read off the measure, not guessed. Facing right (the pose is mirrored by the renderer).
//   WFM_URL=... node tools/debug/falls_g4a_r2_search.mjs
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP } from './falls_g3_probe.mjs';
import { INSTALL_CONTACT } from './falls_contact.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, attacker: 'lou' }, { att: GEORGE, def: LOU, attacker: 'george' }];
const LAY = (o) => { const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2; d.state = 'down'; d.lying = o.lying; d.stateTimer = 99; d._groundHandoff = null; d._pain = null; d._sell = null; };
const SEARCH = ({ side, grid }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2, sk = a.skeleton;
    for (let i = 0; i < 4; i++) { window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); }
    const target = window.__chestOf(d), s = a.s, out = [];
    a.state = 'down'; a.lying = 'prone';
    for (const t of grid.torso) for (const arm of grid.arm) for (const fold of grid.fold) {
        const g = { hip: 14, torso: t, farThigh: t - Math.PI - 0.15, farShin: t - Math.PI - 0.40, nearThigh: t - Math.PI + 0.20, nearShin: t - Math.PI - 0.50, farArm: arm, farFore: arm + fold, nearArm: 0.2, nearFore: 0.25 };
        sk._applyGrounded(0, 0, s, 1, g);
        const e = sk.jointAttachmentPoints[`${side}Elbow`];
        sk._applyGrounded(target.x - e.x, target.y - e.y, s, 1, g);
        a.x = target.x - e.x; a.y = target.y - e.y;
        const m = window.__contact(a, d);
        const sh = sk.jointAttachmentPoints[`${side}Shoulder`];
        out.push({ t, arm, fold, miss: m.miss, limb: m.limb, dy: Math.round(sh.y - target.y) });
    }
    return out;
};
const grid = { torso: [], arm: [], fold: [2.0] };
for (let t = 0.3; t <= 3.01; t += 0.1) grid.torso.push(+t.toFixed(2));
for (let t = 0; t <= 3.01; t += 0.15) grid.arm.push(+t.toFixed(2));
for (const pair of PAIRS) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        await page.evaluate(INSTALL); await page.evaluate(INSTALL_CONTACT);
        for (const side of ['far', 'near']) for (const lying of ['supine', 'prone']) {
            await page.evaluate(SETUP, { gap: 140, stamina: 100, facing: 1 }); await page.evaluate(LAY, { lying });
            const rows = (await page.evaluate(SEARCH, { side, grid })).filter(r => r.limb >= 300).sort((x, y) => x.miss - y.miss);
            console.log(`${pair.attacker} ${side} arm, receiver ${lying}: ${rows.slice(0, 5).map(r => `torso ${r.t} arm ${r.arm} fold ${r.fold}: miss ${r.miss} limb ${r.limb} shoulder dy ${r.dy}`).join(' | ')}`);
        }
    } finally { await h.close(); }
}
