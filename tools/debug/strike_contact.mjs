// Fist/forearm vs target at the impact frame, real executors, both pairs/facings, several gaps (Derek 2026-11-14: jab and clothesline miss).
// node tools/debug/strike_contact.mjs jab|clothesline 80,85   (WFM_URL, ROWS=1 prints every frame; shortHead > 0 = short of the face's near edge)
import { chromium } from 'playwright-core';
import { SETUP } from './toehold_t30_lib.mjs';
const URL = process.env.WFM_URL ?? 'http://localhost:5197';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const pairs = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
if (process.env.ALL) pairs.push(['guido-lou', 'guido-roster-v1', 'thesz-procreate-v1'], ['kowalski-lou', 'kowalski-roster-v1', 'thesz-procreate-v1'], ['lou-kowalski', 'thesz-procreate-v1', 'kowalski-roster-v1'], ['george-guido', 'george-roster-v1', 'guido-roster-v1']);
const move = process.argv[2] ?? 'jab';
const gaps = (process.argv[3] ?? '50,60,70,85').split(',').map(Number);
for (const [name, a, d] of pairs) {
    await page.goto(`${URL}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
    await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; window.__idle = { ...sc.w1.pose }; window.__T = sc.time.now; });
    for (const facing of [1, -1]) for (const gap of gaps) {
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, sep: gap })})`);
        const r = await page.evaluate(({ move, facing }) => {
            const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
            D.state = 'standing'; D.lying = null; D.stateTimer = 0;
            const step = () => { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
            step();
            const x0 = A.x;
            if (move === 'jab') A._doJab(D);
            else { D.state = 'running'; D.runPhase = 'returning'; D.runFacing = -facing; D.runTarget = A.x - facing * 400; A._doClothesline(D); }
            const side = A.skeleton.lChannelSide(A.facing);
            const rows = [];
            for (let f = 1; f <= (move === 'jab' ? 10 : 30); f++) {
                step();
                const P = A.skeleton.jointAttachmentPoints, Q = D.skeleton.jointAttachmentPoints;
                const w = P[`${side}Wrist`], e = P[`${side}Elbow`];
                const hb = D.skeleton.head.getBounds(), near = A.facing > 0 ? hb.left : hb.right;
                const tip = { x: w.x + (w.x - e.x) * 0.35, y: w.y + (w.y - e.y) * 0.35 };   // fist tip, past the wrist
                const head = { x: near, y: hb.top };
                // signed: positive = wrist short of the target point (toward attacker)
                rows.push({ f, t: +(f / 60).toFixed(3), wristX: +w.x.toFixed(1), wristY: +w.y.toFixed(1), elbowX: +e.x.toFixed(1), headX: +head.x.toFixed(1), headY: +head.y.toFixed(1), neckX: +Q.neck.x.toFixed(1), neckY: +Q.neck.y.toFixed(1),
                    shortHead: +((head.x - tip.x) * A.facing).toFixed(1), tipYRel: +((tip.y - hb.top) / hb.height).toFixed(2), shortNeck: +((Q.neck.x - w.x) * A.facing).toFixed(1),
                    along: +((Q.neck.x - e.x) / (tip.x - e.x)).toFixed(2), armDy: +((e.y + (tip.y - e.y) * Math.max(0, Math.min(1, (Q.neck.x - e.x) / (tip.x - e.x)))) - Q.neck.y).toFixed(1), ax: +(A.x - x0).toFixed(1), dState: D.state, s: A.s });
            }
            return rows;
        }, { move, facing });
        if (move === 'clothesline') {
            if (process.env.ROWS) for (const x of r) console.log('   ', JSON.stringify(x));
            // the impact frame is the first one he sells on; there the runner's neck should sit on the forearm (elbow -> fist tip)
            // joints read back a frame late, so the frame after the sell is the one that shows the hit frame's arm
            const hit = r[r.findIndex(x => x.dState !== 'running') + 1];
            if (!hit || r.every(x => x.dState === 'running')) { console.log(name, facing > 0 ? 'R' : 'L', 'gap', gap, '| NO HIT'); continue; }
            console.log(name, facing > 0 ? 'R' : 'L', 'gap', gap, '| hit f', hit.f, 'neck along forearm', hit.along, '(0 elbow, 1 fist tip; outside 0..1 = miss)', 'arm y - neck y', hit.armDy, 'px | attacker step', hit.ax, 'px');
            continue;
        }
        const best = r.reduce((m, x) => Math.abs(x.shortHead) < Math.abs(m.shortHead) ? x : m);
        const at = move === "jab" ? r[4] : r[+(process.env.IMPACT_F ?? 5)];
        if (process.env.ROWS) for (const x of r) console.log('   ', JSON.stringify(x));
        console.log(name, facing > 0 ? 'R' : 'L', 'gap', gap, '| impact f', at.f, 'fist tip short of face edge', at.shortHead, 'tip y in head', at.tipYRel, 'of neck', at.shortNeck, 'wristY', at.wristY, 'headY', at.headY, 'neckY', at.neckY, '| min short', best.shortHead, '@f', best.f, 'scale', at.s.toFixed(2));
    }
}
console.log('errors', errors);
await browser.close();
