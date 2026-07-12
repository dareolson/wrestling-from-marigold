// AI-vs-AI probe: streams wrestler states + matchEvents like debug:watch, but
// toggles P1 to AI and detects stuck matches (same positions/states for 6s →
// deep state dump). This is what caught the grabbed-state deadlock; prefer it
// over debug:sim for long balance runs since a wedged match dumps evidence
// instead of hanging silently.
//
//   npm run debug:probe -- 900     — probe for ~900 poll-seconds (default 150)
import { launch } from './harness.mjs';

const seconds = Number(process.argv[2]) || 150;
const h = await launch();
// Both default to keyboard now (Derek, 2026-07-12) — toggle both AI on.
await h.page.keyboard.press('1'); // P1 → brawler AI
await h.page.keyboard.press('2'); // P2 → George AI
await h.page.waitForTimeout(300);

let lastEvents = 0;
let lastSig = '';
let frozenSince = 0;
for (let i = 0; i < seconds * 2; i++) {
    await h.page.waitForTimeout(500);
    const s = await h.snap();
    if (!s) { console.log('scene not ready'); continue; }

    // Detect a stuck match: same positions/states for 6+ seconds (clock
    // deliberately excluded — it keeps ticking through a state deadlock)
    const sig = JSON.stringify([s.w1.st, s.w1.x, s.w1.y, s.w2.st, s.w2.x, s.w2.y, s.over]);
    if (sig === lastSig) {
        frozenSince += 0.5;
        if (frozenSince === 6) {
            console.log('!! FROZEN for 6s — dumping deep state');
            const deep = await h.page.evaluate(() => {
                const sc = window.__WFM_GAME.scene.scenes[0];
                const f = w => ({
                    st: w.state, timer: w.stateTimer, x: Math.round(w.x), y: Math.round(w.y),
                    stam: Math.round(w.stamina), runPhase: w.runPhase, ropeLevel: w._ropeLevel,
                });
                return {
                    w1: f(sc.w1), w2: f(sc.w2),
                    pin: !!sc.pinState, sleeper: !!sc.sleeperState,
                    headlock: !!sc.headlockState, lockup: !!sc.lockupState,
                    over: sc.matchOver, t: sc._matchTime,
                };
            });
            console.log(JSON.stringify(deep, null, 2));
        }
    } else {
        frozenSince = 0;
    }
    lastSig = sig;

    console.log(
        `${s.clock}  w1(${s.w1.x},${s.w1.y}) ${s.w1.st} ${s.w1.stam}% | ` +
        `w2(${s.w2.x},${s.w2.y}) ${s.w2.st} ${s.w2.stam}% | heat ${s.heat}${s.over ? ' [matchOver]' : ''}`
    );
    if (s.eventCount > lastEvents) {
        for (const e of await h.events(lastEvents)) console.log('  EVENT:', JSON.stringify(e));
        lastEvents = s.eventCount;
    }
}

await h.close();
