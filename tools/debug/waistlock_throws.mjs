// PLAN_GRAPPLES Stage 4c: the atomic drop and the snapmare reversal out of the waistlock, forced from a real tie-up, ?waistlock=v1, 1/60 s steps,
// deterministic (loop asleep, seeded Math.random, fixed tween delta, AIs nulled, input scripted).
//
//   WFM_URL=http://localhost:5173 node tools/debug/waistlock_throws.mjs [outRoot] [pairs=lg,gl] [cases=drop,reverse] [shots=1]
//
// Per attacker (Lou on George = lg, George on Lou = gl) and facing: the attacker presses power with up held at frame 36 (the go-behind), then power
// again in the hold (frame 80). Case `drop` = nobody answers; `reverse` = the defender presses power inside the lift (WT_REV frames in, default 6);
// `late` = he presses after the window (WT_REV=20 gives the same with a late press). Writes <outRoot>/frames/<id>/sNNNN.jpg and <outRoot>/film.json.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL_FARARM } from './far_arm_probe.mjs';
import { INSTALL, SETUP } from './grapples_film.mjs';
import { STEP as BASE_STEP } from './grapples_waistlock.mjs';
import { ringBoundsAtY, perspectiveScale } from '../../src/constants.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = { lg: { id: 'lou-george', att: LOU, def: GEORGE }, gl: { id: 'george-lou', att: GEORGE, def: LOU } };
export const PRESS_AT = 36, DROP_AT = 80, F = 60;

// what the throws add to a base row (clip time, states, tilt/lift of both men), read in the page after the step
const EXTRAS = (maskOn) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    const h = a._activeMove ?? d._activeMove;
    return {
        t: { sleeper: sc.sleeperState ? { timer: +sc.sleeperState.timer.toFixed(3), rear: !!sc.sleeperState.rear } : null, clip: h?.clip?.id ?? null, time: h ? +h.time.toFixed(4) : null, plant: h?.plantLog?.length ? h.plantLog.filter(r => r.time === h.time).map(r => ({ i: r.index, w: +r.w.toFixed(3), side: r.side, err: +r.err.toFixed(2), onMat: +r.onMat.toFixed(1) })) : null, drop: !!sc.dropState, states: [a.state, d.state], tilt: [a.pose.tilt, d.pose.tilt], lift: [a.pose.lift, d.pose.lift], xy: [[a.x, a.y], [d.x, d.y]], facing: [a.facing, d.facing], stamina: [a.stamina, d.stamina], lying: [a.lying, d.lying], blend: !!sc._exitBlend },
        // both soles as the skeleton reads them after the step (painted anchor through the shin's live transform; the art variant in use sets the anchor)
        soles: [a, d].map(w => ['near', 'far'].map(n => w.skeleton.soleWorld?.(n) ?? null)),
        mask: maskOn && (h || sc.sleeperState) ? window.__maskOverlap(a, d, false) : null,
        far: maskOn && window.__farArmOverTorso ? [window.__farArmOverTorso(a).px, window.__farArmOverTorso(d).px] : null,
        events: sc.matchEvents.splice(0).filter(e => ['move', 'atomicDrop', 'snapmare', 'snapmareDenied', 'orphanRescue', 'waistlockEnd', 'sleeperApplied', 'sleeperStageUp', 'sleeperEscape', 'sleeperKO', 'ropeBreak'].includes(e.type)),
    };
};
export const STEP = async (page, arg) => ({ ...(await page.evaluate(BASE_STEP, arg)), ...(await page.evaluate(EXTRAS, !!arg.maskClip)) });

// the last film's game-px to screenshot-px mapping: shot px = x0 + gameX * kx (and y), so a tool can draw on the frames afterwards
export let lastShot = null;
export async function film(page, info, spec, shotDir, { frames = spec.case?.startsWith('sleeper') ? 420 : 330, quiet = 40 } = {}) {
    // spec.denied: the defender (who faces against the attacker's first facing) stands 90 px inside the rope he faces, so the snapmare has no room
    // to land but the hold's rope reach (34 px) is not met
    const gap2 = 45 * perspectiveScale(400), bnd = ringBoundsAtY(400);
    const midX = spec.denied ? (spec.facing > 0 ? bnd.left + 90 * perspectiveScale(400) - gap2 : bnd.right - 90 * perspectiveScale(400) + gap2) : (spec.midX ?? 520);
    await page.evaluate(SETUP, { facing: spec.facing, midX, startGap: 90, defRope: null, flag: true, layer: false, seed: 11 });
    await page.evaluate((moves) => { const sc = window.__WFM_GAME.scene.scenes[0]; for (const w of [sc.w1, sc.w2]) for (const m of moves) if (!w.moveSet.includes(m)) w.moveSet.push(m); sc.matchEvents.length = 0; }, ['goBehind', 'atomicDrop', 'snapmare', 'sleeperHold']);
    const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
    const mid = await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return (sc.w1.x + sc.w2.x) / 2; });
    const clip = { width: 620, height: 360, x: Math.max(0, Math.round(mX(mid) - 310)), y: Math.round(mY(440) - 360) };   // wide: the snapmare carries the thrown man 260 px along
    lastShot = { x0: bx.x - clip.x, y0: bx.y - clip.y, kx: bx.w / bx.gw, ky: bx.h / bx.gh, width: clip.width, height: clip.height };
    if (shotDir) { rmSync(shotDir, { recursive: true, force: true }); mkdirSync(shotDir, { recursive: true }); }
    const rows = []; let calm = 0, started = false;
    const revAt = spec.revAt;   // absolute frame the defender presses power, else DROP_AT + rev
    for (let i = 0; i < frames; i++) {
        const press = { a: [], d: [] }, hold = { a: [], d: [] };
        if (i === PRESS_AT) { press.a.push('power'); hold.a.push('up'); }
        if (i === DROP_AT) press.a.push(spec.case?.startsWith('sleeper') ? 'finisher' : 'power');
        // sleeperMash: the defender mashes action every 5 frames from sleeperFrom (default 1 s after the hold)
        if (spec.case === 'sleeperMash' && rows.length && rows[rows.length - 1].t.sleeper && i >= DROP_AT + (spec.sleeperFrom ?? 60) && (i - DROP_AT) % 5 === 0) press.d.push('action');
        if (spec.case !== 'drop' && !spec.case?.startsWith('sleeper') && i === (revAt ?? DROP_AT + (spec.rev ?? 6))) press.d.push('power');
        const row = await STEP(page, { press, hold, mask: false, maskClip: !!spec.mask });
        row.i = i; rows.push(row);
        if (shotDir) await page.screenshot({ path: join(shotDir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 82, clip });
        if (row.t.clip) started = true;
        if (started && !row.t.clip && row.t.states.every(s => s === 'standing' || s === 'down')) calm++; else calm = 0;
        if (calm >= quiet) break;
    }
    return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/grapples-2026-10/g4c-a', pairsArg = 'lg,gl', casesArg = 'drop,reverse', shots = '1'] = process.argv.slice(2);
    const results = [];
    for (const pair of pairsArg.split(',').map(k => PAIRS[k])) {
        process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(2500);
            const info = await page.evaluate(INSTALL);
            await page.evaluate(INSTALL_MASKS);
            await page.evaluate(INSTALL_FARARM);
            for (const cs of casesArg.split(',')) for (const facing of [-1, 1]) {
                const id = `${cs}-${pair.id}-${facing < 0 ? 'l' : 'r'}`;
                const rows = await film(page, info, { facing, case: cs, denied: cs === 'denied', rev: Number(process.env.WT_REV ?? (cs === 'late' ? 20 : 6)), mask: true }, shots === '1' ? join(outRoot, 'frames', id) : null);
                for (const x of rows) if (x.mask) delete x.mask.image;
                results.push({ id, case: cs, pair: pair.id, facing, rows: rows.length });
                mkdirSync(outRoot, { recursive: true });
                writeFileSync(join(outRoot, `rows-${id}.json`), JSON.stringify(rows));
                console.log(`[throws] ${id}: ${rows.length} frames`);
            }
        } finally { await h.close(); }
    }
    writeFileSync(join(outRoot, 'film.json'), JSON.stringify({ tool: 'tools/debug/waistlock_throws.mjs', runs: results }, null, 1));
}
