// PLAN_FALLS T4.6: the elbow drop's three stills (approach / contact / roll-off) on a man on the mat, both rigs as attacker, both facings, the receiver supine and prone.
// Poses from src/animation/groundContact.js, placed by the striking elbow's joint point against the receiver's chest read off his drawn pose. Stills only: nothing animates.
//   WFM_URL=http://localhost:5173 node tools/debug/falls_g4a_r2_stills.mjs [outDir=research/animation/falls-2026-11/g4a-r2/stills] [only=<caseId substring>]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP } from './falls_g3_probe.mjs';
import { INSTALL_CONTACT } from './falls_contact.mjs';
import { ELBOW_DROP } from '../../src/animation/groundContact.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, victim: 'george', attacker: 'lou' }, { att: GEORGE, def: LOU, victim: 'lou', attacker: 'george' }];
const [outRoot = 'research/animation/falls-2026-11/g4a-r2/stills', only = ''] = process.argv.slice(2);

const LAY = (o) => {
    const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2;
    d.state = 'down'; d.lying = o.lying; d.stateTimer = 99; d._groundHandoff = null; d._pain = null; d._sell = null;
};
// pose the attacker with `phase` and measure: the still is drawn by the skeleton's own grounded renderer, placed so the striking elbow sits at the target + the phase's anchor
const POSE = ({ phase, side, g, anchor, facing, layer }) => {
    window.__layer = layer;
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2, sk = a.skeleton;
    const step = () => { window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); };
    for (let i = 0; i < 4; i++) step();                       // the receiver settles into his lying pose
    const target = window.__chestOf(d), s = a.s;
    a.state = 'down'; a.lying = 'prone'; a.stateTimer = 99; a._groundHandoff = null; a._sell = null; a._landing = null; a._jolt = null; a.facing = facing;
    let rx = 0, ry = 0;
    sk.updateGrounded = (x, y, ss, ff) => {
        sk._applyGrounded(0, 0, ss, ff, g);                    // measure at the origin, then slide the whole body so the elbow lands on the anchor
        const e = sk.jointAttachmentPoints[`${side}Elbow`];
        rx = target.x + anchor.dx * facing * ss - e.x; ry = target.y + anchor.dy * ss - e.y;
        sk._applyGrounded(rx, ry, ss, ff, g);
    };
    // the contact window's layering: the striking arm's parts draw over the receiver (a fixed order, released with the pose); the rest of the attacker keeps his own depth
    sk.__setDepth0 ??= sk.setDepth.bind(sk);
    const mine = [sk[`${side}UpArm`], sk[`${side}Forearm`], sk[`${side}Hand`]].filter(Boolean);
    sk.setDepth = (b) => { sk.__setDepth0(b); if (!window.__layer) return; const top = Math.max(...d.skeleton._parts.map(p => p.depth ?? 0)); mine.forEach((p, i) => p.setDepth(top + 0.001 + i * 0.00001)); };
    step(); step();
    a.x = rx; a.y = ry;
    step();
    return { root: { x: Math.round(rx), y: Math.round(ry) }, target };
};
const MEASURE = () => { const sc = window.__WFM_GAME.scene.scenes[0]; return { m: window.__contact(sc.w1, sc.w2), img: window.__contactImage(), box: window.__contactBox }; };

mkdirSync(outRoot, { recursive: true });
const results = [];
for (const pair of PAIRS) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        await page.evaluate(INSTALL_CONTACT);
        const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
        for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) for (const phase of ['approach', 'contact', 'rolloff']) {
            const id = `elbowDrop-${phase}-${pair.attacker}-on-${pair.victim}-${lying}-${facing > 0 ? 'right' : 'left'}`;
            if (only && !id.includes(only)) continue;
            const placed = await page.evaluate(SETUP, { gap: 140, stamina: 100, facing });
            await page.evaluate(LAY, { lying });
            const P = ELBOW_DROP.phases[phase];
            const posed = await page.evaluate(POSE, { phase, side: ELBOW_DROP.side, g: P.g, anchor: P.anchor, facing, layer: phase === 'contact' });
            const cx = posed.target.x, clip = { width: 520, height: 330, x: Math.max(0, Math.round(mX(cx) - 260)), y: Math.round(mY(440) - 330) };
            await page.screenshot({ path: join(outRoot, `${id}.jpg`), type: 'jpeg', quality: 80, clip });
            const { m, img } = await page.evaluate(MEASURE);
            writeFileSync(join(outRoot, `${id}-mask.png`), Buffer.from(img.split(',')[1], 'base64'));
            results.push({ id, phase, attacker: pair.attacker, victim: pair.victim, lying, facing, ...posed, ...m });
            console.log(`[stills] ${id}: miss ${m.miss} px, striking arm on him ${m.limb} px, front conflict ${m.front} (body behind ${m.bodyBehind}, arm over ${m.limbOver}) (bodies ${m.a} / ${m.b})`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, 'results.json'), JSON.stringify(results, null, 1));
