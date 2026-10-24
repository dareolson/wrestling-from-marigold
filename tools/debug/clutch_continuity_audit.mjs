// Samples the real grounded clutch renderer, independently of the torso-based
// anatomical-sign heuristic. Saves worst adjacent elbow/wrist travel and fold
// magnitudes, plus before/after screenshots for the worst transition.
// WFM_P1=george-roster-v1 WFM_P2=thesz-procreate-v1 node tools/debug/clutch_continuity_audit.mjs [output-dir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';

const outDir = process.argv[2] ?? 'research/animation/codex-clutch-continuity';
mkdirSync(outDir, { recursive: true });
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2?.skeleton);
    const result = await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause();
        const rows = [];
        const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        for (const [seat, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
            const sk = w.skeleton;
            for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) {
                for (const part of ['knee', 'head', 'arm', 'back', 'chest']) for (const limb of ['lLeg', 'rLeg']) {
                    let previous = null;
                    let worst = null;
                    for (let i = 0; i <= 240; i++) {
                        const u = i / 240;
                        w.lying = lying; w.facing = facing;
                        w._sell = { plan: [{ name: 'clutch', lying, part, duration: 1, amp: 1, limb, rolls: 0 }], i: 0, t: u, facing0: facing };
                        const sold = w._sellPose();
                        sk.updateGroundedReach(500, 380, w.s, facing, sold.g, sold.reach);
                        const points = structuredClone(sk.jointAttachmentPoints);
                        for (const side of ['near', 'far']) {
                            const S = points[`${side}Shoulder`], E = points[`${side}Elbow`], W = points[`${side}Wrist`];
                            const a = { x: E.x - S.x, y: E.y - S.y }, b = { x: W.x - E.x, y: W.y - E.y };
                            const fold = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
                            if (previous) {
                                const elbowStep = distance(E, previous.points[`${side}Elbow`]);
                                if (!worst || elbowStep > worst.elbowStep) worst = {
                                    seat, lying, facing, part, limb, side, from: previous.u, to: u,
                                    elbowStep, wristStep: distance(W, previous.points[`${side}Wrist`]),
                                    upperLength: distance(S, E), foreLength: distance(E, W),
                                    foldBefore: previous.folds[side], foldAfter: fold,
                                };
                            }
                            points[`${side}Fold`] = fold;
                        }
                        previous = { u, points, folds: { near: points.nearFold, far: points.farFold } };
                    }
                    rows.push(worst);
                }
            }
        }
        rows.sort((a, b) => b.elbowStep - a.elbowStep);
        return { samplesPerClutch: 241, rows };
    });
    writeFileSync(`${outDir}/report.json`, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result.rows.slice(0, 8), null, 2));
    const worst = result.rows[0];
    for (const [label, u] of [['before', worst.from], ['after', worst.to]]) {
        await h.page.evaluate(({ row, u }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const w = row.seat === 'p1' ? sc.w1 : sc.w2;
            const other = row.seat === 'p1' ? sc.w2 : sc.w1;
            other.skeleton.setVisible(false); other.gfx.clear();
            for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
            w.lying = row.lying; w.facing = row.facing;
            w._sell = { plan: [{ name: 'clutch', lying: row.lying, part: row.part, duration: 1, amp: 1, limb: row.limb, rolls: 0 }], i: 0, t: u, facing0: row.facing };
            const sold = w._sellPose();
            w.gfx.clear(); w.skeleton.setVisible(true);
            w.skeleton.updateGroundedReach(500, 380, w.s, w.facing, sold.g, sold.reach);
        }, { row: worst, u });
        await h.page.waitForTimeout(40);
        await h.page.screenshot({ path: `${outDir}/${label}.png` });
    }
} finally {
    await h.close();
}
