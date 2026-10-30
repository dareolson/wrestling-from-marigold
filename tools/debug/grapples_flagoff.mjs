// PLAN_GRAPPLES T1.2: flag-off identity for the lockup. Forces a lockup in the real Arena (loop asleep, AIs nulled), steps
// 60 fixed frames, and records both wrestlers' pose and x per frame.
//   node tools/debug/grapples_flagoff.mjs --record     writes tests/fixtures/grapplesFlagOff.json (do this BEFORE a change)
//   node tools/debug/grapples_flagoff.mjs              compares a fresh run to the fixture (exact)
// WFM_URL=http://localhost:5173 WFM_P1=thesz-procreate-v1
import { writeFileSync, readFileSync } from 'node:fs';
import { launch } from './harness.mjs';

const FIXTURE = new URL('../../tests/fixtures/grapplesFlagOff.json', import.meta.url);

export async function recordLockup(h, frames = 60) {
    await h.page.waitForTimeout(3000);
    return h.page.evaluate((N) => {
        const game = window.__WFM_GAME, sc = game.scene.scenes[0];
        game.loop.sleep();
        sc._p1AI = null; sc._p2AI = null;
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
    const h = await launch();
    const rows = await recordLockup(h);
    await h.close();
    if (process.argv[2] === '--record') {
        writeFileSync(FIXTURE, JSON.stringify(rows));
        console.log('recorded', rows.length, 'frames; locked at end:', rows.at(-1).locked);
    } else {
        const want = JSON.parse(readFileSync(FIXTURE, 'utf8'));
        // The pose tweens (lockup in, idle out) run on the wall clock, so poses differ run to run even for the same code: they are
        // recorded for the eye but only x, state and the lockup timeout are compared (exact to 1e-4).
        const TOL = 1e-4;
        const eq = (a, b, tol) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= (tol ?? TOL) : a && typeof a === 'object' ? Object.keys({ ...a, ...b }).every(k => eq(a[k], b?.[k], tol)) : a === b);
        const strip = (r) => ({ ...r, ap: undefined, bp: undefined });
        const bad = want.findIndex((r, k) => !eq(strip(r), strip(rows[k])));
        console.log(bad < 0 && want.length === rows.length ? `flag off identical over ${rows.length} frames (x, state and timeout exact to 1e-4; poses not compared)` : 'DIFFERENT');
        if (bad >= 0) { console.log('first diff at frame', bad, JSON.stringify(want[bad]), JSON.stringify(rows[bad])); process.exit(1); }
    }
}
