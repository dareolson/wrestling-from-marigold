// PLAN_GRAPPLES T2.2 r6 proof: a frame-by-frame row through each swap. For every hand (both pairs, both facings, the default tie-up), the 7 frames from 3 before
// to 3 after its grab swap and its release swap, cropped on that hand's wrist. Swap frames come from r6-speed.json (clasp_r6_speed.mjs, the shove ending = seed 11).
//   WFM_URL=http://localhost:5174 node tools/debug/clasp_r6_rows.mjs <speed.json> <outDir>      -> <outDir>/<case>/<hand>-{grab,release}-<offset>.jpg
import { readFileSync, mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const { summary } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3];
const WRIST = ({ man, side }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width;
    const W = (man === 'a' ? sc.w1 : sc.w2).skeleton.jointAttachmentPoints[`${side}Wrist`];
    return { x: box.x + (W.x - cam.worldView.x) * cam.zoom * k, y: box.y + (W.y - cam.worldView.y) * cam.zoom * k };
};
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`, dir = `${out}/${id}`; mkdirSync(dir, { recursive: true });
            const hands = Object.entries(summary).filter(([k]) => k.startsWith(`${id}-shove.`)).map(([k, v]) => ({ hand: k.split('.').slice(1).join('.'), v }));
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            for (let i = 0; i < 100; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                for (const { hand, v } of hands) for (const [kind, f] of [['grab', v.grabSwap[0]], ['release', v.releaseSwap[0]]]) {
                    if (Math.abs(i - f) > 3) continue;
                    const [man, side] = hand.split('.');
                    const c = await h.page.evaluate(WRIST, { man, side });
                    await h.page.screenshot({ path: `${dir}/${hand}-${kind}-${i - f}.jpg`, type: 'jpeg', quality: 88, clip: { x: Math.max(0, c.x - 60), y: Math.max(0, c.y - 45), width: 120, height: 90 } });
                }
            }
            console.log(id);
        }
    } finally { await h.close(); }
}
