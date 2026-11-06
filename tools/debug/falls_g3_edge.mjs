// PLAN_FALLS T3.9: the ring-edge cases. A tired man (20) is hit with his back 40 px from the rope behind him (less than any fall's 70 px behind), the attacker on either side,
// both pairs: the fall is kept and he is carried inward over it (Wrestler._fallBySituation). Records the lying body's x extent against the rope line at his y, and frames.
//   WFM_URL=http://localhost:5173 node tools/debug/falls_g3_edge.mjs [outDir=research/animation/falls-2026-11/g3/edge] [shots=1]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { SETUP, TRIGGER, FRAME, MOVES } from './falls_g3_probe.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [{ att: LOU, def: GEORGE, victim: 'george' }, { att: GEORGE, def: LOU, victim: 'lou' }];
const CASES = [['headbutt', 40], ['jab', 40]];   // rope px behind him at the hit
const [outRoot = 'research/animation/falls-2026-11/g3/edge', shots = '1'] = process.argv.slice(2);
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
        for (const [mid, rope] of CASES) for (const facing of [1, -1]) {
            const id = `${mid}-${pair.victim}-${facing > 0 ? 'right' : 'left'}`, dir = join(outRoot, 'frames', id);
            const placed = await page.evaluate(SETUP, { gap: MOVES[mid].gap, stamina: 20, rope, facing });
            const cx = facing > 0 ? placed.right - 150 : placed.left + 150;
            const clip = { width: 560, height: 330, x: Math.max(0, Math.round(mX(cx) - 280)), y: Math.round(mY(440) - 330) };
            if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
            const rows = []; let downAt = null;
            for (let i = 0; i < 300; i++) {
                if (i === 8) await page.evaluate(TRIGGER, MOVES[mid].call);
                const row = await page.evaluate(FRAME); rows.push(row);
                if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60, clip });
                if (row.ds === 'down' && downAt === null) downAt = i;
                if (downAt !== null && i - downAt >= 40) break;
            }
            const ev = await page.evaluate(() => window.__WFM_GAME.scene.scenes[0].matchEvents.filter(e => e.type === 'fall'));
            const union = (from, to) => { const e = rows.slice(from, to + 1).filter(r => r.ext).map(r => r.ext); return [Math.round(Math.min(...e.map(v => v[0]))), Math.round(Math.max(...e.map(v => v[1])))]; };
            const inside = (e) => ({ x: e, margin: Math.round(Math.min(e[0] - placed.left, placed.right - e[1])), inside: e[0] >= placed.left && e[1] <= placed.right });
            const fallAt = rows.findIndex(r => r.ds === 'falling');
            // contact = the first frame down; landing = the next 20 frames (the landing's hop and recoil); sell = the rest of the window (writhe and clutch move the limbs past the rest pose)
            const out = { id, move: mid, victim: pair.victim, facing, ropeBehindPx: rope, fall: ev[0]?.fall ?? null, reason: ev[0]?.reason ?? null, left: placed.left, right: placed.right,
                contact: inside(union(downAt, downAt)), landing: inside(union(downAt, downAt + 20)), sell: inside(union(downAt + 21, rows.length - 1)),
                xStart: Math.round(placed.dx), xAtPick: rows[fallAt]?.dx, xDown: rows[downAt]?.dx, s: +placed.s.toFixed(3), fallAt, downAt, frames: rows.length };
            results.push(out);
            console.log(`[edge] ${id}: ${out.fall} (${out.reason}) x ${out.xStart}->${out.xAtPick}->${out.xDown}; margin at contact ${out.contact.margin}, landing ${out.landing.margin}, sell ${out.sell.margin}`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, 'results.json'), JSON.stringify(results, null, 1));
