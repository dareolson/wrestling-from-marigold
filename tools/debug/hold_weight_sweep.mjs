// Lying-hold weight sweep (PLAN_SUPLEX_RISE T4.0b / D4): at which reach weight does
// Lou's near hand, with the grip art, sit within 15 px of backWaist while lying
// supine? Exact paused poses through the real Skeleton, both facings.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/hold_weight_sweep.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const out = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/hold-weight-sweep.json';
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const result = await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
        const res = { rig: new URLSearchParams(location.search).get('p1'), facings: {} };
        for (const facing of [1, -1]) {
            const rows = [];
            for (const art of ['grip', 'fist']) for (let i = 0; i <= 20; i++) {
                const wt = i / 20;
                w.x = 400; w.y = 430; w.facing = facing; w.lying = 'supine'; w.state = 'down';
                sk.setPartVariants(art === 'grip' ? { nearForearm: 'grip' } : {});
                const g = { ...Sk.GROUNDED_POSES.supine };
                sk.updateGroundedReach(400, 430, w.s * (w._heightScale ?? 1), facing, g, { near: { to: 'nearHip', w: wt } }, { paintedContacts: true, backContact: true });
                const a = sk.nearForearm._semanticAnchors?.clutch;
                const contact = (a && Sk.imageAnchorPoint(sk.nearForearm, a)) || sk.jointAttachmentPoints.nearWrist;
                const waist = Sk.imageAnchorPoint(sk.torso, sk.torso._semanticAnchors.backWaist);
                rows.push({ art, w: wt, key: sk.nearForearm.texture.key, dist: +Math.hypot(contact.x - waist.x, contact.y - waist.y).toFixed(2) });
            }
            res.facings[facing] = rows;
        }
        return res;
    });
    for (const [f, rows] of Object.entries(result.facings)) {
        const g = rows.filter(r => r.art === 'grip');
        const first = g.find(r => r.dist <= 15);
        console.log(`facing ${f}: first grip weight within 15 px = ${first?.w}; ` + g.filter((_, i) => i % 2 === 0).map(r => `${r.w}:${r.dist}`).join(' '));
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 1));
} finally { await h.close(); }
