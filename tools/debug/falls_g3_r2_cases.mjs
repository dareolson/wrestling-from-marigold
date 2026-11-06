// PLAN_FALLS T3.5: strikes read at the hit. Real strikes (the move's own _doX), no facing lock: from behind (the receiver turned away on the hit frame), and the 35 line
// right after the damage (jab drains 5: 40 -> 35 staggers, 39.9 -> 34.9 falls). Both pairs. Records what the strike read (stamina, facing) and what he did.
//   WFM_URL=http://localhost:5173 node tools/debug/falls_g3_r2_cases.mjs [outDir=research/animation/falls-2026-11/g3/r2cases] [shots=1]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP, TRIGGER, FRAME, HITS, MOVES } from './falls_g3_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, victim: 'george' }, { att: GEORGE, def: LOU, victim: 'lou' }];
const CASES = [
    { id: 'jab-behind', move: 'jab', stamina: 20, behind: true, note: 'jab from behind, 20 stamina' },
    { id: 'headbutt-behind', move: 'headbutt', stamina: 100, behind: true, note: 'headbutt from behind, fresh (always a fall)' },
    { id: 'shove-behind', move: 'shove', stamina: 20, behind: true, note: 'shove from behind, 20 stamina' },
    { id: 'jab-at35', move: 'jab', stamina: 40, preHit: 40, behind: false, note: 'jab: 40 -> 35.0 after the damage' },
    { id: 'jab-under35', move: 'jab', stamina: 39.9, preHit: 39.9, behind: false, note: 'jab: 39.9 -> 34.9 after the damage' },
];
const [outRoot = 'research/animation/falls-2026-11/g3/r2cases', shots = '1'] = process.argv.slice(2);
mkdirSync(outRoot, { recursive: true });
const results = [];
for (const pair of PAIRS) {
    process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
        for (const c of CASES) {
            const id = `${c.id}-${pair.victim}`, dir = join(outRoot, 'frames', id);
            const mv = MOVES[c.move];
            const placed = await page.evaluate(SETUP, { gap: mv.gap, stamina: c.stamina, behind: c.behind, preHit: c.preHit ?? null });
            const clip = { width: 560, height: 330, x: Math.max(0, Math.round(mX(placed.dx - 40) - 280)), y: Math.round(mY(440) - 330) };
            if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
            const rows = []; let downAt = null, calm = 0;
            for (let i = 0; i < 300; i++) {
                if (i === 8) await page.evaluate(TRIGGER, mv.call);
                const row = await page.evaluate(FRAME); rows.push(row);
                if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60, clip });
                if (row.ds === 'down' && downAt === null) downAt = i;
                if (i > 13 && row.ds === 'standing' && row.as === 'standing') calm++; else calm = 0;
                if (downAt !== null && i - downAt >= 45) break;
                if (downAt === null && calm >= 20) break;
            }
            const hits = await page.evaluate(HITS), ev = await page.evaluate(() => window.__WFM_GAME.scene.scenes[0].matchEvents.filter(e => e.type === 'fall'));
            const fell = rows.some(r => ['falling', 'down'].includes(r.ds)), stag = rows.some(r => r.ds === 'staggered');
            const faceAtFall = rows[rows.findIndex(r => r.ds === 'falling')];
            const out = { ...c, id, victim: pair.victim, hit: hits[0] ?? null, outcome: fell ? 'fall' : stag ? 'stagger' : 'none', fall: ev[0]?.fall ?? null, reason: ev[0]?.reason ?? null, side: ev[0]?.side ?? null, fallAt: rows.findIndex(r => r.ds === 'falling'), downAt, frames: rows.length };
            results.push(out);
            console.log(`[r2] ${id}: read stamina ${out.hit?.stamina} facing ${out.hit?.facing} (attacker x ${out.hit?.attackerX}, his x ${out.hit?.x}) -> ${out.outcome} ${out.fall ?? ''} ${out.reason ?? ''}`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, 'results.json'), JSON.stringify(results, null, 1));
