// PLAN_GRAPPLES T1.2: flag-off identity for the lockup. Forces a lockup in the real Arena (loop asleep, AIs nulled), steps
// 60 fixed frames, and records both wrestlers' pose and x per frame.
//   node tools/debug/grapples_flagoff.mjs --record     writes tests/fixtures/grapplesFlagOff.json (do this BEFORE a change)
//   node tools/debug/grapples_flagoff.mjs              compares a fresh run to the fixture (exact)
// WFM_URL=http://localhost:5173 (optional; without it the harness starts its own server)
// The fixture was recorded on the old `thesz` / `george` rigs, so the run names them (Arena's default is now the roster rigs).
import { writeFileSync, readFileSync } from 'node:fs';
import { launch } from './harness.mjs';

const FIXTURE = new URL('../../tests/fixtures/grapplesFlagOff.json', import.meta.url);

export async function recordLockup(h, frames = 60) {
    await h.page.waitForTimeout(3000);
    return h.page.evaluate((N) => {
        const game = window.__WFM_GAME, sc = game.scene.scenes[0];
        game.loop.sleep();
        sc._p1AI = null; sc._p2AI = null;
        sc.tweens.getDelta = () => 1000 / 60;   // the film's fixed tween delta: poses repeat exactly, so they can be compared (Codex 2026-10-30)
        const a = sc.w1, b = sc.w2;
        for (const w of [a, b]) { w.state = 'standing'; w.stamina = 100; w.vx = 0; }
        a.x = 480; b.x = 600; a.y = b.y = 400; a.facing = 1; b.facing = -1;
        a.state = b.state = 'lockup';
        a.tweenPose('lockup', 180, 'Cubic.easeOut'); b.tweenPose('lockup', 180, 'Cubic.easeOut');
        sc.lockupState = { attacker: a, defender: b, timer: 0 };
        let T = performance.now();
        const rows = [];
        const round = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, Math.round(v * 1e6) / 1e6]));
        for (let i = 0; i < N; i++) {
            T += 1000 / 60; game.step(T, 1000 / 60);
            rows.push({ i, ax: Math.round(a.x * 1e4) / 1e4, bx: Math.round(b.x * 1e4) / 1e4, as: a.state, bs: b.state, locked: !!sc.lockupState, ap: round(a.pose), bp: round(b.pose) });
        }
        return rows;
    }, frames);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    process.env.WFM_P1 ??= 'thesz'; process.env.WFM_P2 ??= 'george';
    process.env.WFM_QS = [process.env.WFM_QS, 'grapples=off'].filter(Boolean).join('&');   // grapples is on by default (T5.3): this tool proves the old path
    const h = await launch();
    const rows = await recordLockup(h);
    await h.close();
    if (process.argv[2] === '--record') {
        writeFileSync(FIXTURE, JSON.stringify(rows));
        console.log('recorded', rows.length, 'frames; locked at end:', rows.at(-1).locked);
    } else {
        const want = JSON.parse(readFileSync(FIXTURE, 'utf8'));
        const TOL = 1e-4;
        const eq = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= TOL : a && typeof a === 'object' ? Object.keys({ ...a, ...b }).every(k => eq(a[k], b?.[k])) : a === b);
        const bad = want.findIndex((r, k) => !eq(r, rows[k]));
        const same = bad < 0 && want.length === rows.length;
        console.log(same ? `flag off identical over ${rows.length} frames (x, state, timeout and every pose channel, exact to 1e-4)` : `DIFFERENT (${rows.length} frames vs ${want.length})`);
        if (!same) { console.log('first diff at frame', bad, JSON.stringify(want[bad]), JSON.stringify(rows[bad])); process.exit(1); }
    }
}
