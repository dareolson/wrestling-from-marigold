// PLAN_FALLS T3.4: films the move x situation table for G3 (?falls=v1). Each cell stages one real strike (the move's own _doX, so the wiring is what is tested),
// on both rig pairs, and records what the receiver did (stagger or which fall), the pick reason from the match log, and a frame strip.
//   WFM_URL=http://localhost:5173 node tools/debug/falls_g3_probe.mjs [outDir=research/animation/falls-2026-11/g3/table] [shots=1]
// Situations (stamina is the receiver's before the hit; the strike's own drain comes off it):
//   fresh   100, attacker in front, open ring       tired   20, in front, open ring
//   behind  20, attacker behind him (he faces away) ropes   20, in front, his back 85 px from the rope behind him
// Pairs: lg = Lou strikes, George receives; gl = George strikes, Lou receives. The attacker faces right.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = { lg: { att: LOU, def: GEORGE, victim: 'george' }, gl: { att: GEORGE, def: LOU, victim: 'lou' } };
export const MOVES = { headbutt: { call: 'a._doHeadbutt(w)', gap: 70 }, jab: { call: 'a._doJab(w)', gap: 70 }, frontKick: { call: 'a._doFrontKick(w)', gap: 95, push: 28 },
    shove: { call: 'a._doShove(w)', gap: 80, push: 40 }, doubleAxeHandle: { call: 'a._doDoubleAxeHandle(w)', gap: 70 }, kneeLift: { call: 'a._doKneeLift(w)', gap: 70 } };
export const SITUATIONS = { fresh: { stamina: 100 }, tired: { stamina: 20 }, behind: { stamina: 20, behind: true }, ropes: { stamina: 20, rope: 85 } };
const TRIGGER_AT = 8, MAX = 330;

const SETUP = async ({ gap, stamina, behind, rope }) => {
    const { ringBoundsAtY } = await import('/src/constants.js');
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let a0 = 0x5eed1234;
    Math.random = () => { a0 = (a0 + 0x6D2B79F5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.dropState = null; sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null; sc.waistlockState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._facingLock = !!behind && w === d; w._landNext = null; w._landing = null; w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null; w._fixedHold = false; w._cornerEp = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null; w.fallProgress = 0; w.flipProgress = 0;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    sc.matchEvents.length = 0;
    const facing = 1, s = a.s, b = ringBoundsAtY(400);
    a.y = d.y = 400; a.facing = facing; d.facing = behind ? facing : -facing;
    // the receiver stands to the attacker's right; at the ropes his back is `rope` px from the right rope (the strike drives him toward it)
    const mid = rope ? b.right - rope * s - gap * s / 2 : 520;
    a.x = mid - gap * s / 2; d.x = mid + gap * s / 2;
    d.stamina = stamina;
    const keys = new Set();
    a.input = d.input = { justDown: (k) => keys.has(k), isDown: (k) => keys.has(k) };
    return { ax: a.x, dx: d.x, s, right: b.right };
};
const TRIGGER = (call) => { const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, w = sc.w2; return eval(call); };   // eslint-disable-line no-eval
const FRAME = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    return { as: a.state, ds: d.state, fv: d._fallVariant ?? null, st: Math.round(d.stamina * 10) / 10, dx: Math.round(d.x), lying: d.lying, tier: d._landing?.tier ?? null, kind: d._landing?.kind ?? null };
};
const EVENTS = () => window.__WFM_GAME.scene.scenes[0].matchEvents.filter(e => e.type === 'fall' || e.type === 'dodge');

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/falls-2026-11/g3/table', shots = '1'] = process.argv.slice(2);
    mkdirSync(outRoot, { recursive: true });
    const results = [];
    for (const pair of Object.values(PAIRS)) {
        process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1' + (process.env.G3_FLAGOFF === '1' ? '' : '&falls=v1');   // G3_FLAGOFF=1: the same table with the flag off (strikes stagger, the headbutt falls as before)
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(2500);
            const info = await page.evaluate(INSTALL);
            const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
            for (const [mid, mv] of Object.entries(MOVES)) for (const [sid, sit] of Object.entries(SITUATIONS)) {
                const id = `${mid}-${sid}-${pair.victim}`, dir = join(outRoot, 'frames', id);
                const placed = await page.evaluate(SETUP, { gap: mv.gap, ...sit, rope: sit.rope ? sit.rope + (mv.push ?? 0) : 0 });
                const clip = { width: 560, height: 330, x: Math.max(0, Math.round(mX(Math.min(placed.dx, placed.right - 100) - 40) - 280)), y: Math.round(mY(440) - 330) };
                if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
                const rows = [];
                let downAt = null, calm = 0;
                for (let i = 0; i < MAX; i++) {
                    if (i === TRIGGER_AT) await page.evaluate(TRIGGER, mv.call);
                    const row = await page.evaluate(FRAME); rows.push(row);
                    if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60, clip });
                    if (row.ds === 'down' && downAt === null) downAt = i;
                    if (i > TRIGGER_AT + 5 && row.ds === 'standing' && row.as === 'standing') calm++; else calm = 0;
                    if (downAt !== null && i - downAt >= 45) break;
                    if (downAt === null && calm >= 20) break;
                }
                const events = await page.evaluate(EVENTS);
                const fell = rows.some(r => r.ds === 'falling' || r.ds === 'down' || r.ds === 'flipping');
                const staggered = rows.some(r => r.ds === 'staggered');
                const fall = events.find(e => e.type === 'fall');
                const out = { id, move: mid, situation: sid, victim: pair.victim, outcome: fell ? 'fall' : staggered ? 'stagger' : 'none', fall: fall?.fall ?? null, tier: fall?.tier ?? null, reason: fall?.reason ?? null,
                    stamina: { before: sit.stamina, after: rows.at(-1).st }, lastX: rows.at(-1).dx, fallAt: rows.findIndex(r => r.ds === 'falling'), downAt, frames: rows.length, events };
                results.push(out);
                console.log(`[g3] ${id}: ${out.outcome}${out.fall ? ' ' + out.fall : ''} (${out.reason ?? 'no pick'}) stamina ${sit.stamina} -> ${out.stamina.after}`);
            }
        } finally { await h.close(); }
    }
    writeFileSync(join(outRoot, 'results.json'), JSON.stringify(results, null, 1));
    console.log(`wrote ${results.length} cells`);
}
