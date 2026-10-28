// T2.4 (PLAN_GETUPS): what the forearms draw per frame across backKneeHurtBack's flip, Lou. Cause first, no fix.
//   node tools/debug/getups_forearm.mjs [outFile] [rig=thesz-procreate-v1] [flags]
// Per frame: both forearm images (texture key, visible, display size, scale, flip), elbow -> wrist, the binding's own
// scale, the segment length the image spans on screen.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN } from './rise_handoff_probe.mjs';

export const FOREARM = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], w = window.__rw, sk = w.skeleton;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const img = (i) => {
        if (!i) return null;
        const m = i.getWorldTransformMatrix();
        return { key: i.texture?.key, frame: i.frame?.name, vis: !!i.visible, dw: +i.displayWidth.toFixed(2), dh: +i.displayHeight.toFixed(2),
            sx: +i.scaleX.toFixed(4), sy: +i.scaleY.toFixed(4), flipX: !!i.flipX, ox: i.originX, oy: i.originY,
            wscale: +Math.hypot(m.a, m.b).toFixed(4), wscale2: +Math.hypot(m.c, m.d).toFixed(4),
            bound: !!i._binding, lastBinding: i._lastBinding ? { scale: i._lastBinding.scale ?? null, sx: i._lastBinding.scaleX ?? null, sy: i._lastBinding.scaleY ?? null } : null,
            variant: i._variant ?? null, dscale: i._attachmentDisplayScale ?? null };
    };
    const p = sk.jointAttachmentPoints ?? {}, d = (a, b) => a && b ? +Math.hypot(a.x - b.x, a.y - b.y).toFixed(2) : null;
    return { now: sc.time.now, state: w.state, facing: w.facing, riseT: +(w.riseT ?? 0).toFixed(4), flipped: !!w._riseFlip, getUp: w._getUp?.id ?? null,
        near: img(sk.nearForearm), far: img(sk.farForearm), nearHand: img(sk.nearHand), farHand: img(sk.farHand),
        nearUp: img(sk.nearUpArm), farUp: img(sk.farUpArm),
        nearLen: d(p.nearElbow, p.nearWrist), farLen: d(p.farElbow, p.farWrist), nearUpLen: d(p.nearShoulder, p.nearElbow), farUpLen: d(p.farShoulder, p.farElbow),
        handUnder: !!w._handUnder?.(), variants: JSON.parse(JSON.stringify(sk._partVariants ?? {})), sel: w._sellArtSelection ? JSON.parse(JSON.stringify(w._sellArtSelection)) : null };
};

const [out = 'research/animation/getups-2026-10/g1-rev/forearm-lou.json', rig = 'thesz-procreate-v1', qs = 'getups=v1'] = process.argv.slice(2);
process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george'; process.env.WFM_QS = ['notitle=1', qs].join('&');
const h = await launch(), res = [];
try {
    const page = h.page;
    await page.waitForTimeout(400);
    await page.evaluate(INSTALL);
    for (const facing of [-1, 1]) {
        await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing, pose: 'stale', opp: 'behind' });
        const fr = []; let standAt = null;
        for (let i = 0; i < 200; i++) {
            const f = await page.evaluate(FOREARM);
            fr.push({ i, ...f });
            if (standAt === null && f.state === 'standing') standAt = f.now;
            if (standAt !== null && f.now - standAt >= 400) break;
        }
        res.push({ facing, frames: fr });
    }
} finally { await h.close(); }
import('node:fs').then(fs => fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }));
writeFileSync(out, JSON.stringify(res));
process.exit(0);
