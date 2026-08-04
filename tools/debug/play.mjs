// Scripted P1 — drives Player 1 through named scenarios and asserts on the
// matchEvents log, so each scenario doubles as a regression test for a move.
//
//   npm run debug:play -- jab            — run one scenario
//   npm run debug:play -- all            — run every scenario in sequence
//   HEADED=1 npm run debug:play -- pin   — watch it happen
//
// P2 defaults to keyboard (an unmoving dummy — Derek, 2026-07-12) so the
// George AI never interferes with reproducibility. Defense scenarios drive
// P2's keys directly (comma = evade, period = block).

import { launch } from './harness.mjs';

// P1 controls: WASD move, F grapple, G power, H finisher, R run
const HELD = new Set();

async function hold(page, key) {
    if (HELD.has(key)) return;
    HELD.add(key);
    await page.keyboard.down(key);
}

async function release(page, key) {
    if (!HELD.delete(key)) return;
    await page.keyboard.up(key);
}

async function releaseAll(page) {
    for (const k of [...HELD]) await release(page, k);
}

async function tap(page, key, ms = 90) {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
}

// Walk P1 toward P2 until within dist px (or timeout)
async function approach(h, dist, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const s = await h.snap();
        const dx = s.w2.x - s.w1.x;
        const dy = s.w2.y - s.w1.y;
        if (Math.hypot(dx, dy) <= dist) {
            await releaseAll(h.page);
            return s;
        }
        await (dx >  6 ? hold : release)(h.page, 'd');
        await (dx < -6 ? hold : release)(h.page, 'a');
        await (dy >  6 ? hold : release)(h.page, 's');
        await (dy < -6 ? hold : release)(h.page, 'w');
        await h.page.waitForTimeout(50);
    }
    await releaseAll(h.page);
    throw new Error(`approach(${dist}) timed out`);
}

// Push into the opponent: collision separation clamps standing wrestlers at
// 80*s (~65px at center ring) while jab reach is 85*s (~69px) — the point-blank
// window only opens if you keep walking into them.
async function jam(h, ms = 450) {
    const s = await h.snap();
    await hold(h.page, s.w2.x >= s.w1.x ? 'd' : 'a');
    await h.page.waitForTimeout(ms);
    await releaseAll(h.page);
}

// Poll until pred(snap) is true (or timeout)
async function until(h, pred, label, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const s = await h.snap();
        if (pred(s)) return s;
        await h.page.waitForTimeout(60);
    }
    throw new Error(`until(${label}) timed out`);
}

// ── Scenarios ────────────────────────────────────────────────────────────────
// Each returns after driving the move; `expect` is matched against the
// matchEvents entries logged during the scenario: { type } or { type, move }.

const SCENARIOS = {
    jab: {
        expect: { move: 'jab' },
        async run(h) {
            await approach(h, 85);
            await jam(h);
            await tap(h.page, 'g');
        },
    },

    combo: { // jab → headbutt converts the stagger into a knockdown
        p1: 'george', // headbutt is george-only (thesz's kit doesn't have it, and thesz is the default P1 since the promoted-george roster change)
        expect: { move: 'headbutt' }, // logged before the delayed sell, so type varies
        async run(h) {
            await approach(h, 85);
            await jam(h);
            await tap(h.page, 'g'); // jab
            await until(h, s => s.w2.st === 'staggered', 'w2 staggered');
            await tap(h.page, 'g'); // headbutt
        },
    },

    elbow: {
        p1: 'george', // chains through combo, which needs george's headbutt
        expect: { move: 'elbowDrop' },
        async run(h) {
            await SCENARIOS.combo.run(h);
            await until(h, s => s.w2.st === 'down', 'w2 down');
            await approach(h, 75);
            await tap(h.page, 'g');
        },
    },

    dropkick: {
        expect: { move: 'dropkick' },
        async run(h) {
            await approach(h, 150);
            await tap(h.page, 'g');
        },
    },

    lockup: {
        expect: { move: 'lockup' },
        async run(h) {
            await approach(h, 85);
            await jam(h);
            await tap(h.page, 'f');
        },
    },

    headlock: {
        expect: { move: 'headlock' },
        async run(h) {
            await SCENARIOS.lockup.run(h);
            // Lockup auto-releases at 0.8s — follow-up must land inside that window
            await h.page.waitForTimeout(250);
            await hold(h.page, 's');
            await tap(h.page, 'f');
            await releaseAll(h.page);
        },
    },

    whip: {
        expect: { move: 'irishWhip' },
        async run(h) {
            await SCENARIOS.lockup.run(h);
            await h.page.waitForTimeout(250);
            await hold(h.page, 'd');
            await tap(h.page, 'f');
            await releaseAll(h.page);
        },
    },

    clothesline: {
        expect: { move: 'clothesline' },
        async run(h) {
            await SCENARIOS.whip.run(h);
            // Strike on the rebound: clothesline only connects on runPhase 'returning'
            // Reach is 160*s (~129px) so trigger inside it — the runner covers
            // ~30px between polls
            await until(h, s => s.w2.st === 'running' && s.w2.rp === 'returning' && Math.abs(s.w2.x - s.w1.x) < 120,
                'w2 returning in range');
            await tap(h.page, 'f');
        },
    },

    sleeper: {
        expect: { type: 'sleeperApplied' },
        async run(h) {
            await approach(h, 85);
            await tap(h.page, 'h');
        },
    },

    dodge: { // P2 sidesteps the double axe handle inside its 280ms wind-up
        // (the jab's 83ms window is too tight for scripted back-to-back keys
        // under headless slowdown — humans dodge reads, not reactions, anyway)
        expect: { type: 'dodge' },
        async run(h) {
            await tap(h.page, 'r'); // P1 runs to the rope behind and rebounds toward P2
            await until(h, s => s.w1.st === 'running' && s.w1.rp === 'returning' && Math.abs(s.w2.x - s.w1.x) < 110,
                'p1 returning in range');
            await tap(h.page, 'g'); // double axe handle — impact fires at 280ms
            await tap(h.page, ','); // P2 evades during the wind-up
        },
    },

    block: { // P2 braces; P1's grapple attempt gets stuffed, P1 staggers
        expect: { type: 'grappleBlock' },
        async run(h) {
            await approach(h, 85);
            await jam(h);
            await hold(h.page, '.'); // P2 block stance
            await h.page.waitForTimeout(200);
            await tap(h.page, 'f');  // P1 grapple → stuffed
            await until(h, s => s.w1.st === 'staggered', 'p1 staggered by the stuff');
            await releaseAll(h.page);
        },
    },

    // ── Four-move blueprint (Codex, 2026-07-24; approved by Derek) ─────────
    hammerlock: { // finisher key while attacker in lockup — Lou (thesz) attacks George
        p1: 'thesz',
        expect: { move: 'hammerlock' },
        async run(h) {
            await SCENARIOS.lockup.run(h);
            // Lockup auto-releases at 0.8s — follow-up must land inside that window
            await h.page.waitForTimeout(200);
            await tap(h.page, 'h');
        },
    },

    hammerlockReverse: { // same move, roles swapped: George attacks Lou (paired-clip parity)
        p1: 'george', p2: 'thesz',
        expect: { move: 'hammerlock' },
        async run(h) {
            await SCENARIOS.lockup.run(h);
            await h.page.waitForTimeout(200);
            await tap(h.page, 'h');
        },
    },

    kneeLift: { // hold up + power vs standing, close range — overrides the jab
        p1: 'george', // kneeLift is george-only (not in thesz's kit)
        expect: { move: 'kneeLift' },
        async run(h) {
            await approach(h, 85);
            await jam(h);
            await hold(h.page, 'w');
            await tap(h.page, 'g');
            await releaseAll(h.page);
        },
    },

    backBodyDrop: { // hold up + grapple vs a returning runner — overrides the clothesline
        expect: { move: 'backBodyDrop' },
        async run(h) {
            await SCENARIOS.whip.run(h);
            await until(h, s => s.w2.st === 'running' && s.w2.rp === 'returning' && Math.abs(s.w2.x - s.w1.x) < 120,
                'w2 returning in range');
            await hold(h.page, 'w');
            await tap(h.page, 'f');
            await releaseAll(h.page);
        },
    },

    kneeDrop: { // hold down + power vs a grounded opponent — overrides the elbow drop
        p1: 'george', // chains through combo, which needs george's headbutt
        expect: { move: 'kneeDrop' },
        async run(h) {
            await SCENARIOS.combo.run(h);
            await until(h, s => s.w2.st === 'down', 'w2 down');
            await approach(h, 75);
            await hold(h.page, 's');
            await tap(h.page, 'g');
            await releaseAll(h.page);
        },
    },

    pin: { // jab → headbutt → cover; first fatal cover is always a 2.9 save, so down them again → pinfall
        p1: 'george', // chains through combo, which needs george's headbutt
        expect: { type: 'pinfall' },
        async run(h) {
            await SCENARIOS.combo.run(h);
            await until(h, s => s.w2.st === 'down', 'w2 down');
            await approach(h, 75);
            await tap(h.page, 'f');
            await until(h, s => s.w2.st === 'standing', '2.9 save kickout');
            await SCENARIOS.combo.run(h);
            await until(h, s => s.w2.st === 'down', 'w2 down again');
            await approach(h, 75);
            await tap(h.page, 'f');
            await until(h, s => s.over, 'pinfall banner', 6000);
        },
    },
};

// ── Runner ───────────────────────────────────────────────────────────────────

function eventMatches(e, expect) {
    if (expect.type && e.type !== expect.type) return false;
    if (expect.move && e.move !== expect.move) return false;
    return true;
}

async function runScenario(h, name) {
    const sc = SCENARIOS[name];
    const start = (await h.snap()).eventCount;
    try {
        await sc.run(h);
        await h.page.waitForTimeout(600); // let delayed sells/logs land
        const logged = await h.events(start);
        const hit = logged.find(e => eventMatches(e, sc.expect));
        const detail = logged.map(e => e.move ?? e.type).join(', ') || 'none';
        if (hit) {
            console.log(`PASS  ${name}  (events: ${detail})`);
            return true;
        }
        console.log(`FAIL  ${name}  expected ${JSON.stringify(sc.expect)}, events: ${detail}`);
        return false;
    } catch (err) {
        console.log(`FAIL  ${name}  ${err.message}`);
        return false;
    } finally {
        await releaseAll(h.page);
    }
}

const arg = process.argv[2];
if (!arg || (!SCENARIOS[arg] && arg !== 'all')) {
    console.log(`usage: npm run debug:play -- <scenario|all>\nscenarios: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
}

const names = arg === 'all' ? Object.keys(SCENARIOS) : [arg];
let failed = 0;

for (const name of names) {
    // Fresh page state per scenario: reload, refocus. P2 defaults to
    // keyboard dummy already — no toggle needed. Default P1/P2 is now
    // thesz/george (2026-07-26, promoted-george roster change; was
    // brawler/george) — thesz's kit doesn't have headbutt/kneeLift, so any
    // scenario needing those pins `p1: 'george'` explicitly. A scenario can
    // pin a P1/P2 kit via its `p1`/`p2` field — set/clear WFM_P1/WFM_P2 before each launch so
    // that doesn't leak into the next scenario in an `all` run.
    const sc = SCENARIOS[name];
    if (sc.p1) process.env.WFM_P1 = sc.p1; else delete process.env.WFM_P1;
    if (sc.p2) process.env.WFM_P2 = sc.p2; else delete process.env.WFM_P2;
    const h = await launch();
    await h.page.waitForTimeout(400);
    if (!await runScenario(h, name)) failed++;
    await h.close();
}

process.exit(failed ? 1 : 0);
