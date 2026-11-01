// PLAN_GRAPPLES T3b.3: what moves in the whip's turn. Prints, for the frames around the exit, each man's facing, the largest part step and
// which part, and the same step with the facing flip taken out (the previous frame mirrored about the man's x), so a flip alone shows as ~0.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_3b3.mjs [out.json]   (WFM_EXITS=whip default)
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP, EXITS } from './grapples_film.mjs';
import { partSteps } from './rise_handoff_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const mirror = (parts, x) => parts.map(p => ({ ...p, c: p.c.map(([px, py]) => [2 * x - px, py]) }));
const top = (s) => Object.entries(s).sort((a, b) => b[1] - a[1])[0];

export async function runExit(page, { facing, ex, flag, blend = true }) {
    if (!blend) await page.evaluate(() => { window.__WFM_GAME.scene.scenes[0]._applyExitBlend = () => null; });
    await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag, seed: 11 });
    const rows = [], at = flag ? 48 : 36;
    for (let i = 0; i < at + 30; i++) {
        const press = { a: [], d: [] }, hold = { a: [], d: [] };
        if (i === at) { for (const k of ex.keys) (['up', 'down', 'left', 'right'].includes(k) ? hold : press).a.push(k); if (ex.dir) hold.a.push(facing > 0 ? 'right' : 'left'); }
        const r = await page.evaluate(STEP, { press, hold }); r.i = i; rows.push(r);
    }
    return rows;
}
export function turnTable(rows) {
    const ei = rows.findIndex(r => !r.locked);
    const out = [];
    for (let k = ei; k < ei + 14; k++) {
        const p = rows[k - 1], c = rows[k], row = { f: k - ei };
        for (const side of ['a', 'd']) {
            const raw = partSteps({ parts: p[side].parts }, { parts: c[side].parts }), flipped = p[side].facing !== c[side].facing;
            const [n, v] = top(raw);
            const rest = true ? partSteps({ parts: mirror(p[side].parts, p[side].x) }, { parts: c[side].parts }) : null;
            row[side] = { facing: c[side].facing, step: +v.toFixed(1), part: n, flip: flipped, mirrored: +top(rest)[1].toFixed(1), restPart: top(rest)[0] };
        }
        out.push(row);
    }
    return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const out = process.argv[2] ?? '/tmp/3b3.json', ex = EXITS.find(e => e.id === (process.env.WFM_EXITS ?? 'whip')), results = [];
    for (const [att, def] of [[LOU, GEORGE], [GEORGE, LOU]]) for (const facing of [1]) for (const [col, flag, blend] of [['today', false, true], ['new', true, true], ['new-noblend', true, false]]) {
        process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = flag ? 'notitle=1&grapples=v1' : 'notitle=1&grapples=off';
        const h = await launch();
        try {
            await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL);
            const t = turnTable(await runExit(h.page, { facing, ex, flag, blend }));
            results.push({ att, facing, col, table: t });
            const big = t.filter(r => Math.max(r.a.step, r.d.step) > 60);
            console.log(att === LOU ? 'Lou   ' : 'George', facing, col.padEnd(11), big.map(r => `+${r.f}: a ${r.a.step} (mirrored-prev ${r.a.mirrored}) ${r.a.part} / d ${r.d.step} (mirrored-prev ${r.d.mirrored}) ${r.d.part}`).join(' ; '));
        } finally { await h.close(); }
    }
    writeFileSync(out, JSON.stringify(results, null, 1));
}
