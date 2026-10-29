// T3.4b (PLAN_GETUPS): when a world-space support hand lifts off the mat, and how well it holds until then.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_t34b.mjs [out.json]
//
// Per rig (Lou, George) x facing x family (frontKnee prone, opponent in front = straight and behind = turn; backTuck supine) x side:
//  - tLift: the hold's recorded lift (t of the rise) and ms from the push start (frame times, 1/60 s stepping)
//  - planted: frames from push start to the lift; slip = distance of the DRAWN wrist (jointAttachmentPoints) from the held
//    mat target, max and mean, and travel = how far the wrist moved from its first planted frame
//  - lift: the largest per-frame wrist step from the lift to the end of that phase's release
//  - knee: the largest wrist-to-knee distance over the knee phase's push window (not fixed here; reported)
// Last row for each case also records `lifted` false when the hand never lifted. Raw numbers only.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const CASES = [
    { family: 'frontKnee', lying: 'prone', opp: 'front' }, { family: 'frontKnee', lying: 'prone', opp: 'behind' },
    { family: 'backTuck', lying: 'supine', opp: 'front' },
];
const r2 = (v) => (v === null || v === undefined ? null : +v.toFixed(2));
const d = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);

// in-page, after a STEP: the hold's world targets, recorded lifts and the entry's hand schedule
const HOLD = () => { const w = window.__rw, h = w.skeleton._getUpHold;
    return { id: w._getUp?.id ?? null, hands: w._getUp?.hands ?? null, pts: h ? JSON.parse(JSON.stringify(h.pts)) : {}, lift: h?.lift ? { ...h.lift } : {} }; };

const rows = [];
for (const [name, rig] of Object.entries(RIGS)) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    for (const c of CASES) {
        process.env.WFM_QS = `notitle=1&getups=v1&getup=${c.family}`;
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(400);
            await page.evaluate(INSTALL);
            for (const facing of [-1, 1]) {
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: c.lying, pain: false, facing, pose: 'stale', opp: c.opp });
                const fr = [];
                for (let i = 0; i < 400; i++) {
                    const f = await page.evaluate(STEP);
                    const hd = await page.evaluate(HOLD);
                    fr.push({ now: f.now, state: f.state, t: f.riseT, pts: f.pts, hold: hd });
                    if (f.state === 'standing') break;
                }
                const rise = fr.filter(x => x.state === 'gettingUp');
                const hands = rise.find(x => x.hold.hands)?.hold.hands;
                if (!hands) { rows.push({ rig: name, ...c, facing, error: 'no hands schedule', id: rise[0]?.hold.id }); continue; }
                for (const side of ['near', 'far']) {
                    const ph = [].concat(hands[side] ?? []);
                    const mat = ph.findIndex(p => p.space === 'world'), key = `${side}${mat}`;
                    if (mat < 0) continue;
                    const m = ph[mat], knee = ph.find(p => p.space !== 'world');
                    const start = rise.find(x => x.t >= m.push[0] - 1e-9);
                    const lifted = rise.find(x => x.hold.lift[key] !== undefined);
                    const tLift = lifted ? lifted.hold.lift[key] : null;
                    const tgt = (x) => x.hold.pts[key];
                    const wr = (x) => x.pts[`${side}Wrist`];
                    // planted: from the push start to the lift (or the push end when it never lifts)
                    const endPlant = tLift ?? m.push[1];
                    const planted = rise.filter(x => x.t >= m.push[0] - 1e-9 && x.t < endPlant && tgt(x) && wr(x));
                    const slip = planted.map(x => d(wr(x), tgt(x)));
                    const travel = planted.map(x => d(wr(x), wr(planted[0])));
                    const liftWin = tLift === null ? [] : rise.filter(x => x.t >= tLift - 1e-9 && x.t <= m.release[1] + 1e-9);
                    const steps = liftWin.slice(1).map((x, i) => d(wr(x), wr(liftWin[i])));
                    const kn = knee ? rise.filter(x => x.t >= knee.push[0] && x.t <= knee.push[1]).map(x => d(wr(x), x.pts[`${side}Knee`])) : [];
                    rows.push({ rig: name, family: c.family, id: rise[0].hold.id, opp: c.opp, facing, side, push: m.push, release: m.release,
                        tLift: r2(tLift), tLiftFrame: lifted ? r2(lifted.t) : null,
                        msFromPush: lifted && start ? r2(lifted.now - start.now) : null,
                        pushToRelease1Ms: start ? r2(rise.find(x => x.t >= m.release[1])?.now - start.now) : null,
                        plantedFrames: planted.length, slipMax: r2(Math.max(...slip)), slipMean: r2(slip.reduce((a, b) => a + b, 0) / (slip.length || 1)),
                        travelMax: r2(Math.max(...travel)), liftStepMax: steps.length ? r2(Math.max(...steps)) : null,
                        kneeMax: kn.length ? r2(Math.max(...kn)) : null, kneeMin: kn.length ? r2(Math.min(...kn)) : null });
                    console.log(JSON.stringify(rows.at(-1)));
                }
            }
        } finally { await h.close(); }
    }
}
writeFileSync(process.argv[2] ?? 'getups_t34b.json', JSON.stringify(rows, null, 1));
process.exit(0);
