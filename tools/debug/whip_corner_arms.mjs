// PLAN_GRAPPLES T3d.4: the corner run's arms and elbows, today beside the 4554a94 corner. The same scripted whip into each corner, both
// kits, fresh and worn. Reports the signed arm/elbow angles at contact, the load end (+170 ms) and +320 ms after it, and the largest part step at
// the contact frame; films the near-left and far-right corners tight on the corner (every game frame).
//   WFM_URL=<revised server> WFM_BASE=<4554a94 server> [FILM=<dir>] node tools/debug/whip_corner_arms.mjs <out.json>
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const CORNERS = [['left-near', 'left', 'down'], ['right-near', 'right', 'down'], ['left-far', 'left', 'up'], ['right-far', 'right', 'up']];
const FILMED = new Set(['left-near', 'right-far']);
const out = process.argv[2] ?? `${process.env.TMPDIR ?? '/tmp'}whip_corner_arms.json`;
const r2 = (v) => (v == null ? null : +v.toFixed(2));
const step = (a, b) => { let m = 0; a.parts.forEach((p, i) => { if (!p.vis || !b.parts[i].vis) return; p.c.forEach((c, j) => { m = Math.max(m, Math.hypot(c[0] - b.parts[i].c[j][0], c[1] - b.parts[i].c[j][1])); }); }); return m; };
const CLIP = ({ cornerKey, vert }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize;
    const k = box.width / g.width, y = vert === 'down' ? 439 : 264, t = (445 - y) / (445 - 258), left = cornerKey.startsWith('left');
    const x = left ? 40 + 170 * t : 920 - 170 * t;
    return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k, in: left ? 1 : -1, k: cam.zoom * k };
};

async function run(h, { cornerKey, dirKey, vert, stamina, shots }) {
    await h.page.evaluate(SETUP, { facing: dirKey === 'right' ? 1 : -1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    await h.page.evaluate((s) => { window.__WFM_GAME.scene.scenes[0].w2.stamina = s; }, stamina);
    const rows = []; let arrived = -1, n = 0, clip = null;
    for (let i = 0; i < 260; i++) {
        const row = await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? [dirKey, vert] : [] } });
        rows.push(row.d);
        if (arrived < 0 && row.d.state === 'cornered') arrived = i;
        if (shots && arrived >= 0 && i >= arrived - 25) {
            if (!clip) { const c = await h.page.evaluate(CLIP, { cornerKey, vert }), W = 440, H = 280; clip = { x: Math.max(0, Math.min(c.x + c.in * 120 * c.k - W / 2, 1100 - W)), y: Math.max(0, c.y - H * 0.93), width: W, height: H }; }
            await h.page.screenshot({ path: `${shots}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 72, clip });
            if (n >= 80) break;
        }
        if (!shots && arrived >= 0 && i > arrived + 50) break;
    }
    return { rows, arrived };
}
const at = (rows, i) => { const p = rows[i].pose; return { lArm: r2(p.lArm), rArm: r2(p.rArm), lElbow: r2(p.lElbow), rElbow: r2(p.rElbow), bend: r2(p.bend) }; };

const results = {};
for (const [which, url] of [['revised', process.env.WFM_URL], ['base', process.env.WFM_BASE]]) {
    if (!url) continue;
    process.env.WFM_URL = url;
    for (const [pair, att, def] of PAIRS) {
        process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
        const h = await launch();
        try {
            await h.page.waitForTimeout(2500);
            await h.page.evaluate(INSTALL);
            for (const [cornerKey, dirKey, vert] of CORNERS) for (const [label, stamina] of [['fresh', 100], ['worn', 20]]) {
                const id = `${pair}-${cornerKey}-${label}`;
                const { rows, arrived } = await run(h, { cornerKey, dirKey, vert, stamina });
                if (arrived < 0) { results[`${which}/${id}`] = { error: 'never cornered' }; console.log(which, id, 'never cornered'); continue; }
                const load = arrived + 10, late = load + 19;
                results[`${which}/${id}`] = { arrived, contact: at(rows, arrived), loadEnd: at(rows, load), plus320: at(rows, late), contactStepPx: r2(step(rows[arrived - 1], rows[arrived])) };
                console.log(which, id, JSON.stringify(results[`${which}/${id}`]));
                if (process.env.FILM && label === 'fresh' && FILMED.has(cornerKey)) {
                    const dir = `${process.env.FILM}/${which}/${id}`; mkdirSync(dir, { recursive: true });
                    await run(h, { cornerKey, dirKey, vert, stamina, shots: dir });
                }
            }
        } finally { await h.close(); }
    }
}
writeFileSync(out, JSON.stringify(results, null, 2));
