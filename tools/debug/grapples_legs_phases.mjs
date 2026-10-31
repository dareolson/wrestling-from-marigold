// PLAN_GRAPPLES T1.13: the D13 leg measures beyond case a (steal, stall, rope break, shove), and what every exit leaves behind. No screenshots.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_legs_phases.mjs out.json [phases|exits|all]
// phases: per pair and facing, cases steal / rope (defender on the ropes: stall, rope break) / shove, the worst of each measure per phase.
// exits: per exit move (fresh launch each), the frame the lockup ends, then whether lShin / rShin / lKnee / rKnee are still on either pose
// at the exit, 6 frames later and 120 frames later, and the largest per-frame part step in the first 12 frames (the film's own measure).
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { breakKind } from '../../src/animation/lockup.js';
import { INSTALL, SETUP, STEP, EXITS } from './grapples_film.mjs';
import { INSTALL_LEGS, TRUNKS_V, legSummary, legFails } from './grapples_legs.mjs';
import { idleOf, ankleDaylight } from './grapples_legs_run.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ id: 'lou-george', att: LOU, def: GEORGE }, { id: 'george-lou', att: GEORGE, def: LOU }];
const shoveSeed = (() => { for (let k = 1; ; k++) if (breakKind(k, false) === 'shove') return k; })();
const CASES = [{ id: 'steal', steal: 42 }, { id: 'rope', defRope: 40 }, { id: 'shove', seed: shoveSeed }];
const LEG_KEYS = ['lShin', 'rShin'];

async function launchPair(pair, flag = true) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = flag ? 'notitle=1&grapples=v1' : 'notitle=1';
    const h = await launch();
    await h.page.waitForTimeout(2500);
    await h.page.evaluate(INSTALL); await h.page.evaluate(INSTALL_LEGS);
    return h;
}

async function runCase(page, pair, spec, facing) {
    const tv = { a: TRUNKS_V[pair.att], d: TRUNKS_V[pair.def] };
    const idle = await idleOf(page, facing, tv);
    await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: spec.defRope ?? null, flag: true, seed: spec.seed ?? 11 });
    const rows = []; let end = null;
    for (let i = 0; i < 300; i++) {
        const press = { a: [], d: [] };
        if (spec.steal && i === spec.steal) press.d.push('action');
        const row = await page.evaluate(STEP, { press, legs: i % 3 === 0 ? tv : { a: null, d: null } });
        row.i = i; rows.push(row);
        if (!row.locked && end === null) end = i;
        if (end !== null) break;
    }
    return { rows, idle, summary: legSummary(rows, idle) };
}

async function phases(results) {
    for (const pair of PAIRS) {
        const h = await launchPair(pair);
        try {
            for (const facing of [1, -1]) for (const spec of CASES) {
                const { rows, summary } = await runCase(h.page, pair, spec, facing);
                const fails = legFails(summary);
                const seen = [...new Set(rows.filter(r => r.g).map(r => r.g.phase))];
                const ending = rows.at(-2)?.g?.breakAt !== null ? 'break' : 'none';
                results.push({ kind: 'phase', pair: pair.id, facing, case: spec.id, frames: rows.length, phases: seen, fails, summary, ankleDaylight: ankleDaylight(rows) });
                console.log(`\n== ${pair.id} f${facing} ${spec.id}: ${rows.length} frames, phases ${seen.join('>')}, ${fails.length} misses, ankle daylight ${ankleDaylight(rows)} (${ending})`);
                for (const f of fails) console.log(`   MISS ${f.side} ${f.phase} ${f.measure} ${f.value} @${f.i} ${f.leg ?? ''}`);
                for (const side of ['a', 'd']) for (const [ph, o] of Object.entries(summary[side])) if (ph !== 'idle') console.log(`  ${side} ${ph.padEnd(6)} n${String(o.frames).padStart(3)} knee ${o.kneeLine?.v}@${o.kneeLine?.i} ankle ${o.ankleStagger?.v} kneeSt ${o.kneeStagger?.v} trunks ${o.trunksDelta?.v}@${o.trunksDelta?.i} sole ${o.soleDelta?.v}@${o.soleDelta?.i} snap hip ${o.snapHip?.v}@${o.snapHip?.i} knee ${o.snapKnee?.v}@${o.snapKnee?.i}`);
            }
        } finally { await h.close(); }
    }
}

async function exits(results) {
    for (const pair of PAIRS) {
        const probe = await launchPair(pair); const ms = (await probe.page.evaluate(INSTALL)).moveSets.a; await probe.close();
        for (const ex of EXITS) {
            if ((process.env.WFM_EXITS && !process.env.WFM_EXITS.split(',').includes(ex.id)) || !ms.includes(ex.move) || (ex.needsNo && ms.includes(ex.needsNo))) continue;
            for (const facing of [-1, 1]) {
                const h = await launchPair(pair);
                try {
                    await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
                    const rows = []; let ei = -1;
                    for (let i = 0; i < 260; i++) {
                        const press = { a: [], d: [] }, hold = { a: [], d: [] };
                        if (i === 48) { for (const k of ex.keys) (['up', 'down', 'left', 'right'].includes(k) ? hold : press).a.push(k); if (ex.dir) hold.a.push(facing > 0 ? 'right' : 'left'); }
                        const row = await h.page.evaluate(STEP, { press, hold, legs: null }); row.i = i; rows.push(row);
                        if (!row.locked && ei < 0) ei = i;
                        if (ei >= 0 && i - ei >= 120) break;
                    }
                    const idleP = await h.page.evaluate(() => window.__idle);
                    // lShin / rShin are the lockup's keys (D13): any left on either pose is a leftover unless that rig's idle has the same key and value.
                    // lKnee / rKnee are the moves' own and are not tested.
                    const left = (k) => (k < 0 || !rows[k] ? null : ['a', 'd'].flatMap(s => ['lShin', 'rShin'].filter(n => n in rows[k][s].pose && !(typeof idleP[n] === 'number' && Math.abs(rows[k][s].pose[n] - idleP[n]) <= 0.02)).map(n => `${s}.${n}=${rows[k][s].pose[n]}`)));
                    const r = { kind: 'exit', pair: pair.id, exit: ex.id, facing, exitFrame: ei, atExit: left(ei), plus6: left(ei + 6), plus120: left(ei + 120), moveAfter: [rows[ei + 6]?.a.state, rows[ei + 6]?.d.state] };
                    results.push(r);
                    console.log(`[exit] ${pair.id} ${ex.id} f${facing}: exit frame ${ei}, leftover at exit ${JSON.stringify(r.atExit)} +6 ${JSON.stringify(r.plus6)} +120 ${JSON.stringify(r.plus120)} states ${r.moveAfter}`);
                } finally { await h.close(); }
            }
        }
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [out = 'phases.json', what = 'all'] = process.argv.slice(2), results = [];
    if (what === 'phases' || what === 'all') await phases(results);
    if (what === 'exits' || what === 'all') await exits(results);
    writeFileSync(out, JSON.stringify(results, null, 1));
    console.log('\nwrote', out);
}
