// Corner whips (PLAN_GRAPPLES T3c.3): real lockup input, up/down + left/right + grapple, both kits, both facings, four corners.
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root = 'research/animation/whip-2026-10';
mkdirSync(root, { recursive: true });
const runs = [];
for (const [pair, att, def] of [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) for (const dirKey of ['left', 'right']) for (const vert of ['up', 'down']) {
            const id = `${pair}-${facing}-${dirKey}-${vert}`;
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            const rows = [];
            for (let i = 0; i < 260; i++) rows.push(await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? [dirKey, vert] : [] } }));
            const released = rows.findIndex((r, i) => i >= 48 && r.d.state === 'running');
            assert.ok(released > 48, `${id}: never released`);
            const end = rows.findIndex((r, i) => i > released && r.d.state !== 'running');
            assert.ok(end > released, `${id}: never arrived`);
            const hit = rows[end].d;
            const wantY = vert === 'up' ? 264 : 439;
            const run = { id, pair, facing, dirKey, vert, hitX: +hit.x.toFixed(1), hitY: +hit.y.toFixed(1), wantY, arrivedMs: Math.round((end - 48) * 1000 / 60), state: hit.state };
            runs.push(run); console.log(run);
            assert.ok(Math.abs(hit.y - wantY) <= 2, `${id}: y ${hit.y} vs ${wantY}`);
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/corner-results.json`, JSON.stringify(runs, null, 2));
