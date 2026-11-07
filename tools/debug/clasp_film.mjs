// PLAN_GRAPPLES T2.2: the G2 film. The lockup (tie-up, drive, break) and the waistlock (go-behind, hold), both pairings, both facings, every game
// frame tight on the pair, from two servers: before (WFM_BASE, no clasps) and revised (WFM_URL).
//   WFM_URL=http://localhost:5173 WFM_BASE=http://127.0.0.1:5193 node tools/debug/clasp_film.mjs <outDir>
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const CASES = { lockup: [0, 100], waistlock: [36, 185] };
const out = process.argv[2];
const SCR = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width;
    const x = (sc.w1.x + sc.w2.x) / 2, y = (sc.w1.y + sc.w2.y) / 2;
    return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k };
};
// One pass per case, framed on the pair as it stands at the case's first frame (the circle round the defender stays inside 540 px).
async function run(h, { facing, kind, dir }) {
    await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    const [from, to] = CASES[kind]; let n = 0, clip = null;
    for (let i = 0; i <= to; i++) {
        await h.page.evaluate(STEP, { press: { a: kind === 'waistlock' && i === 40 ? ['power'] : [] }, hold: { a: kind === 'waistlock' && i === 40 ? ['up'] : [] } });
        if (i < from) continue;
        if (!clip) { const c = await h.page.evaluate(SCR); clip = { x: Math.max(0, c.x - 270), y: Math.max(0, c.y - 250), width: 540, height: 330 }; }
        await h.page.screenshot({ path: `${dir}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 78, clip });
    }
}
for (const [which, url] of [['revised', process.env.WFM_URL], ['before', process.env.WFM_BASE]]) {
    process.env.WFM_URL = url;
    for (const [pair, att, def] of PAIRS) {
        process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
        const h = await launch();
        try {
            await h.page.waitForTimeout(2500);
            await h.page.evaluate(INSTALL);
            for (const facing of [1, -1]) for (const kind of Object.keys(CASES)) {
                const dir = `${out}/${which}/${pair}-${facing > 0 ? 'right' : 'left'}-${kind}`; mkdirSync(dir, { recursive: true });
                await run(h, { facing, kind, dir });
                console.log(which, pair, facing, kind);
            }
        } finally { await h.close(); }
    }
}
