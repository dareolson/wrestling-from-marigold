// PLAN_GRAPPLES T1.11/T1.12: the leg measures on a forced lockup, no screenshots. Both pairs, both facings, case a (engage, even, drive, break).
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_legs_run.mjs out.json [flag=1|0]
// Prints, per pair and facing, idle and the worst of each measure per phase, then every threshold miss.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
import { INSTALL_LEGS, TRUNKS_V, legSummary, legFails } from './grapples_legs.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
export const PAIRS = [{ id: 'lou-george', att: LOU, def: GEORGE }, { id: 'george-lou', att: GEORGE, def: LOU }];

// One standing frame per man at idle (same root y and scale as the lockup), masks on.
export async function idleOf(page, facing, tv) {
    await page.evaluate(({ facing }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        window.__keys ??= { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
        for (const [w, f] of [[sc.w1, facing], [sc.w2, -facing]]) {
            w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
            w.state = 'standing'; w.lying = null; w._activeMove = null; w.vx = 0; w.vy = 0; w.walkPhase = 0; w.moveBlend = 0; w.combatBlend = 0;
            for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
            Object.assign(w.pose, window.__idle); w.y = 400; w.facing = f;
        }
        sc.lockupState = null; sc.w1.x = 400; sc.w2.x = 640;
    }, { facing });
    const row = await page.evaluate(STEP, { legs: tv });
    return row.legs;
}

export async function runLegs({ att, def, facing, frames = 200, seed = 11, flag = true, page }) {
    const tv = { a: TRUNKS_V[att], d: TRUNKS_V[def] };
    const idle = await idleOf(page, facing, tv);
    await page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag, seed });
    const rows = [];
    for (let i = 0; i < frames; i++) {
        const row = await page.evaluate(STEP, { legs: i % 3 === 0 ? tv : { a: null, d: null } });
        row.i = i; rows.push(row);
        if (!row.locked) break;
    }
    return { rows, idle, summary: legSummary(rows, idle) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [out = 'legs.json', flagArg = '1'] = process.argv.slice(2);
    const results = [];
    for (const pair of PAIRS) {
        process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = flagArg === '1' ? 'notitle=1&grapples=v1' : 'notitle=1';
        const h = await launch();
        try {
            await h.page.waitForTimeout(2500);
            await h.page.evaluate(INSTALL);
            await h.page.evaluate(INSTALL_LEGS);
            for (const facing of [1, -1]) {
                const { rows, idle, summary } = await runLegs({ ...pair, facing, flag: flagArg === '1', page: h.page });
                const fails = legFails(summary);
                results.push({ pair: pair.id, facing, idle, summary, fails, series: rows.map(r => ({ i: r.i, phase: r.g?.phase ?? null, locked: r.locked, a: r.legs && { k: [r.legs.a.near.kneeLine, r.legs.a.far.kneeLine], h: r.legs.a.hipAngle, st: r.legs.a.stagger }, d: r.legs && { k: [r.legs.d.near.kneeLine, r.legs.d.far.kneeLine], h: r.legs.d.hipAngle, st: r.legs.d.stagger } })) });
                console.log(`\n== ${pair.id} facing ${facing}: ${rows.length} frames, ${fails.length} misses`);
                for (const side of ['a', 'd']) console.log(`  ${side} idle: kneeLine ${idle[side].near.kneeLine}/${idle[side].far.kneeLine} flex ${idle[side].near.flex}/${idle[side].far.flex} stagger ankle ${idle[side].stagger.ankle} knee ${idle[side].stagger.knee} hip ${idle[side].near.hipAngle ?? idle[side].hipAngle.near}/${idle[side].hipAngle.far} trunks ${idle[side].trunks?.share} sole y ${idle[side].sole.near.y}/${idle[side].sole.far.y}`);
                for (const side of ['a', 'd']) for (const [ph, o] of Object.entries(summary[side])) if (ph !== 'idle') console.log(`  ${side} ${ph.padEnd(6)} n${String(o.frames).padStart(3)} knee ${o.kneeLine?.v}@${o.kneeLine?.i}${o.kneeLine?.leg?.[0]} flex+ ${o.flexMax?.v} ankle ${o.ankleStagger?.v}@${o.ankleStagger?.i} kneeSt ${o.kneeStagger?.v}@${o.kneeStagger?.i} hip ${o.hipAngleMin?.v}..${o.hipAngleMax?.v} trunks ${o.trunksDelta?.v}@${o.trunksDelta?.i} sole ${o.soleDelta?.v}@${o.soleDelta?.i}${o.soleDelta?.leg?.[0] ?? ''} snap hip ${o.snapHip?.v}@${o.snapHip?.i} knee ${o.snapKnee?.v}@${o.snapKnee?.i}`);
            }
        } finally { await h.close(); }
    }
    writeFileSync(out, JSON.stringify(results, null, 1));
    console.log('\nwrote', out);
}
