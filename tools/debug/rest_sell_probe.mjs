// PLAN_FALLS T1.3: the mat sells over the missile pose and over the rest pose. Every clutch part for both lying poses, near and far slot, sampled every 1/30 of the sell:
// the wrist's distance to its target at full reach (want it no worse than the missile's), the largest wrist step per sample step (px/frame at 60 fps), and the same without the flag.
//   WFM_URL=http://localhost:5180 WFM_P1=thesz-procreate-v1 node tools/debug/rest_sell_probe.mjs out.json
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
const h = await launch();
await h.page.waitForFunction(() => !!window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, { timeout: 20000 });
await h.page.waitForTimeout(800);
const res = await h.page.evaluate(async () => {
    const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause();
    const S = (await import('/src/Skeleton.js')).default, sells = await import('/src/animation/sells.js');
    const w = sc.w1, sk = w.skeleton, s = w.s, out = [];
    sc.w2.skeleton.setVisible(false);
    for (const lying of ['supine', 'prone']) for (const part of Object.keys(sells.SELLS[lying].clutch)) for (const slot of ['near', 'far']) for (const facing of [1, -1]) {
        const row = { lying, part, slot, facing };
        for (const falls of [false, true]) {
            const def = sells.clutchSell(lying, part, 1, slot, 0, 0.25), N = 30, dist = [], wr = [];
            sk.setFalls(falls); sk.setVisible(true);
            for (let i = 0; i <= N; i++) {
                const u = i / N, sampled = sells.sampleSell(def.keys, u, 1), hands = {};
                for (const [side, wt] of Object.entries(sampled.reach)) hands[side] = { to: def.hands[side], w: wt };
                const g = sells.limitKnees(sells.applyOffsets(S.lyingBase(lying, falls), sampled.d));
                sk.updateGroundedReach(520, 400, s, facing, g, hands, { paintedContacts: true });
                const P = sk.jointAttachmentPoints, rec = {};
                for (const [side, r] of Object.entries(hands)) { const t = S.groundedTarget(P, r.to, s), wp = P[`${side}Wrist`]; rec[side] = { x: wp.x, y: wp.y, d: t ? Math.hypot(wp.x - t.x, wp.y - t.y) / s : null, w: r.w }; }
                wr.push(rec);
            }
            let step = 0; for (let i = 1; i <= N; i++) for (const side in wr[i]) if (wr[i - 1][side]) step = Math.max(step, Math.hypot(wr[i][side].x - wr[i - 1][side].x, wr[i][side].y - wr[i - 1][side].y) / s / 2);
            const peak = wr.reduce((b, r) => Math.max(...Object.values(r).map(x => x.w)) > Math.max(...Object.values(b).map(x => x.w)) ? r : b, wr[0]), full = Object.entries(peak).filter(([, r]) => r.w > 0.95).map(([side, r]) => ({ side, d: +r.d?.toFixed(1) }));   // the sample with the most reach
            row[falls ? 'rest' : 'missile'] = { atFullReach: full, maxStepPerFrame: +step.toFixed(1) };
        }
        out.push(row);
    }
    return out;
});
writeFileSync(process.argv[2] ?? 'rest_sell.json', JSON.stringify(res, null, 1));
const f = (v) => v.atFullReach.map(x => `${x.side} ${x.d}`).join(', ') || '-';
for (const r of res) if (r.facing === 1) console.log(`${r.lying}/${r.part}/${r.slot}: missile [${f(r.missile)}] step ${r.missile.maxStepPerFrame} | rest [${f(r.rest)}] step ${r.rest.maxStepPerFrame}`);
process.exit(0);
