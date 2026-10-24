// Event-aligned film of the suplex receiver (PLAN_SUPLEX_RISE Stage 1).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/aftermath_film.mjs [scenario|all] [config|all] [outRoot]
//     scenario: suplex (Lou throws, roster George receives) | suplexReverse (George throws, Lou receives)
//               | suplexFlip / suplexReverseFlip (same, thrower starts on the other side: receiver faces right)
//     config:   off (no flags) | on (sellart=v1&aftermath=v2)
//
// The real-time part (approach, lockup, hold-up + grapple) is driven like
// play.mjs. The moment the suplex is logged, an in-page hook puts the Phaser
// loop to sleep, and from there the game is advanced by hand in fixed 1/60 s
// steps (game.step). That makes every frame a known game time, so off/on runs
// are paired by match event (impact, clutch peak, rise start, standing), not by
// frame index, and screenshots never race the clock. Nothing in src/ is
// modified; the methods wrapped in page context are removed with the page.
//
// Output per run: <outRoot>/<config>/<scenario>/{manifest.json, strip/, closeups/}
//   strip/     one JPEG every 2 steps (1/30 s), named by game ms relative to impact
//   closeups/  PNG at each event, same crop
import { mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';

export const CONFIGS = { off: '', on: 'sellart=v1&aftermath=v2' };
// flip: P1 first walks round to P2's far side, so the receiver ends up facing the other way.
const SCENARIOS = {
    suplex: { p1: 'thesz', p2: 'george' }, suplexReverse: { p1: 'george', p2: 'thesz' },
    suplexFlip: { p1: 'thesz', p2: 'george', flip: true }, suplexReverseFlip: { p1: 'george', p2: 'thesz', flip: true },
};
const STEP_MS = 1000 / 60;
const STRIP_EVERY = 2;
const MAX_AFTER_SUPLEX_MS = 25000;
const RISE_MARKS = [0.20, 0.34, 0.55, 0.85];
const RECOVERY_MARKS_MS = [200, 1000, 2000];
const CROP = { w: 560, h: 340 };

const cast = c => (process.env.WFM_PROCREATE !== '0' && c === 'thesz') ? 'thesz-procreate-v1'
    : (process.env.WFM_GEORGE !== '0' && c === 'george') ? (process.env.WFM_GEORGE || 'george-roster-v1') : c;

const HELD = new Set();
const hold = async (page, k) => { if (!HELD.has(k)) { HELD.add(k); await page.keyboard.down(k); } };
const release = async (page, k) => { if (HELD.delete(k)) await page.keyboard.up(k); };
const releaseAll = async page => { for (const k of [...HELD]) await release(page, k); };
const tap = async (page, k, ms = 90) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };

async function approach(h, dist, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const s = await h.snap();
        const dx = s.w2.x - s.w1.x, dy = s.w2.y - s.w1.y;
        if (Math.hypot(dx, dy) <= dist) { await releaseAll(h.page); return; }
        await (dx > 6 ? hold : release)(h.page, 'd');
        await (dx < -6 ? hold : release)(h.page, 'a');
        await (dy > 6 ? hold : release)(h.page, 's');
        await (dy < -6 ? hold : release)(h.page, 'w');
        await h.page.waitForTimeout(50);
    }
    await releaseAll(h.page);
    throw new Error(`approach(${dist}) timed out`);
}

// In-page: hook the suplex log line to sleep the loop, install the film API.
const INSTALL = () => {
    const game = window.__WFM_GAME;
    const sc = game.scene.scenes[0];
    const film = (window.__film = { suplexAt: null, receiver: null, events: [], T: 0 });
    const orig = sc._logEvent.bind(sc);
    sc._logEvent = (type, payload = {}) => {
        orig(type, payload);
        if (type === 'move' && payload.move === 'suplex' && film.suplexAt === null) {
            film.suplexAt = sc.time.now;
            film.attacker = payload.attacker;
            film.attackerBusy = [!!sc.w1._activeMove, !!sc.w2._activeMove];
            game.loop.sleep();
        }
    };
};

// In-page: choose the receiver, wrap its rise starts, take over the clock.
const TAKE_OVER = receiverIdx => {
    const game = window.__WFM_GAME;
    const sc = game.scene.scenes[0];
    const film = window.__film;
    const w = receiverIdx === 0 ? sc.w1 : sc.w2;
    film.receiver = receiverIdx;
    for (const name of ['_startRiseUp', '_startQuickRise']) {
        const fn = w[name].bind(w);
        w[name] = (...a) => { film.events.push({ name, now: sc.time.now, riseStart: true }); return fn(...a); };
    }
    film.T = sc.time.now;
    // Phaser's tween manager reads Date.now(), not the stepped clock, so
    // screenshots between steps would make tweens (the rise) run fast. Pin its
    // delta to the step.
    sc.tweens.getDelta = () => 1000 / 60;
    // The sell plan draws from Math.random; seed it so off and on runs get the
    // same plan (mulberry32, fixed seed).
    let a = 0x5eed1234;
    Math.random = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const STEP = () => {
    const game = window.__WFM_GAME;
    const sc = game.scene.scenes[0];
    const film = window.__film;
    film.T += 1000 / 60;
    game.step(film.T, 1000 / 60);
    const w = film.receiver === 0 ? sc.w1 : sc.w2;
    const sk = w.skeleton;
    const cur = w._sell?.plan?.[w._sell.i];
    const u = cur ? Math.min(1, Math.max(0, w._sell.t / cur.duration)) : null;
    const pts = sk.jointAttachmentPoints ?? {};
    const pt = p => p ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2) } : null;
    return {
        now: sc.time.now, state: w.state, lying: w.lying, facing: w.facing, riseT: w.riseT,
        x: w.x, y: w.y, s: w.s * (w._heightScale ?? 1),
        sell: cur ? { name: cur.name, part: cur.part, u: +u.toFixed(4) } : null,
        nearForearm: sk.nearForearm?.texture?.key ?? null, farForearm: sk.farForearm?.texture?.key ?? null,
        nearHand: sk.nearHand?.texture?.key ?? null, farHand: sk.farHand?.texture?.key ?? null,
        nearWrist: pt(pts.nearWrist), farWrist: pt(pts.farWrist),
        otherState: (film.receiver === 0 ? sc.w2 : sc.w1).state,
    };
};

function gitInfo() {
    const sh = c => execSync(c, { encoding: 'utf8' }).trim();
    return { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain --untracked-files=no') !== '' };
}

const rle = (frames, field, impactNow) => {
    const out = [];
    for (const f of frames) {
        const v = f[field];
        if (!out.length || out.at(-1).key !== v) out.push({ key: v, fromMs: +(f.now - impactNow).toFixed(1), toMs: +(f.now - impactNow).toFixed(1) });
        else out.at(-1).toMs = +(f.now - impactNow).toFixed(1);
    }
    return out;
};

async function film(scenario, configName, outRoot) {
    const sc = SCENARIOS[scenario];
    const flags = CONFIGS[configName];
    process.env.WFM_P1 = cast(sc.p1);
    process.env.WFM_P2 = cast(sc.p2);
    process.env.WFM_QS = ['notitle=1', flags].filter(Boolean).join('&');
    const dir = join(outRoot, configName, scenario);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, 'strip'), { recursive: true });
    mkdirSync(join(dir, 'closeups'), { recursive: true });

    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400);
        await page.evaluate(INSTALL);
        if (sc.flip) {
            // Walk round (down-screen, then right) until P1 is clear of P2's right side.
            const dl = Date.now() + 8000;
            for (;;) {
                const q = await h.snap();
                if (q.w1.x > q.w2.x + 110) break;
                if (Date.now() > dl) throw new Error('flip walk timed out');
                await hold(page, 's'); await hold(page, 'd');
                await page.waitForTimeout(50);
            }
            await releaseAll(page);
        }
        await approach(h, 85);
        const s = await h.snap();
        await hold(page, s.w2.x >= s.w1.x ? 'd' : 'a');
        await page.waitForTimeout(450);
        await releaseAll(page);
        await tap(page, 'f');                      // lockup
        await page.waitForTimeout(200);
        await hold(page, 'w');
        await tap(page, 'f');                      // suplex
        await releaseAll(page);
        const deadline = Date.now() + 5000;
        while (!(await page.evaluate(() => window.__film.suplexAt !== null))) {
            if (Date.now() > deadline) throw new Error('suplex was never logged');
            await page.waitForTimeout(20);
        }
        await page.waitForTimeout(300);            // let the key-up events queue before stepping

        const info = await page.evaluate(() => ({ ...window.__film, w1: window.__WFM_GAME.scene.scenes[0].w1.x,
            w2: window.__WFM_GAME.scene.scenes[0].w2.x }));
        // The attacker owns the active move at the log line; the other is the receiver.
        const receiverIdx = info.attackerBusy[0] && !info.attackerBusy[1] ? 1
            : info.attackerBusy[1] && !info.attackerBusy[0] ? 0 : (String(info.attacker).includes('1') ? 1 : 0);
        await page.evaluate(TAKE_OVER, receiverIdx);
        const rigs = [process.env.WFM_P1, process.env.WFM_P2];

        const canvasBox = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
            const g = window.__WFM_GAME.scale.gameSize;
            return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clipFor = f => {
            // game units -> page pixels (the canvas is scaled to fit the viewport)
            const cx = canvasBox.x + (f.x + 60 * f.facing) * canvasBox.w / canvasBox.gw, bottom = canvasBox.y + (f.y + 55) * canvasBox.h / canvasBox.gh;
            const x = Math.max(0, Math.min(1100 - CROP.w, Math.round(cx - CROP.w / 2)));
            const y = Math.max(0, Math.min(700 - CROP.h, Math.round(bottom - CROP.h)));
            return { x, y, width: CROP.w, height: CROP.h };
        };

        const frames = [];       // every step
        const stripFiles = [];   // { file, now }
        const events = {};       // name -> { now, frame }
        const marksLeft = { rise: [...RISE_MARKS], rec: [...RECOVERY_MARKS_MS] };
        let impactStep = null, standingNow = null, clutchDone = false, step = 0;
        const t0 = info.suplexAt;
        const mark = async (name, f, i) => {
            if (events[name]) return;
            events[name] = { now: f.now, step: i };
            await page.screenshot({ path: join(dir, 'closeups', `${name}.png`), clip: clipFor(f) });
        };

        while (true) {
            const f = await page.evaluate(STEP);
            f.step = step;
            frames.push(f);
            if (step % STRIP_EVERY === 0) {
                const file = `raw-${String(step).padStart(5, '0')}.jpg`;
                await page.screenshot({ path: join(dir, 'strip', file), type: 'jpeg', quality: 92, clip: clipFor(f) });
                stripFiles.push({ file, now: f.now, step });
            }
            if (!events.suplex) await mark('suplex', f, step);
            if (!events.impact && f.state === 'down') { impactStep = step; await mark('impact', f, step); }
            if (events.impact && !clutchDone && f.sell?.name === 'clutch' && f.sell.u >= 0.35) {
                clutchDone = true; await mark('clutchPeak', f, step);
            }
            if (!events.riseStart && f.state === 'gettingUp') await mark('riseStart', f, step);
            if (f.state === 'gettingUp') {
                for (const m of [...marksLeft.rise]) if (f.riseT >= m) {
                    marksLeft.rise.splice(marksLeft.rise.indexOf(m), 1);
                    await mark(`rise${String(Math.round(m * 100)).padStart(3, '0')}`, f, step);
                }
            }
            if (events.riseStart && standingNow === null && f.state === 'standing') {
                standingNow = f.now; await mark('standing', f, step);
            }
            if (standingNow !== null) {
                for (const ms of [...marksLeft.rec]) if (f.now - standingNow >= ms) {
                    marksLeft.rec.splice(marksLeft.rec.indexOf(ms), 1);
                    await mark(`recovery+${ms}ms`, f, step);
                }
            }
            step++;
            if (standingNow !== null && !marksLeft.rec.length) break;
            if (f.now - t0 > MAX_AFTER_SUPLEX_MS) { console.log(`[film] ${configName}/${scenario}: gave up at +${MAX_AFTER_SUPLEX_MS} ms`); break; }
        }

        if (!events.impact) throw new Error('receiver never reached state=down');
        const impactNow = events.impact.now;
        const inPageEvents = await page.evaluate(() => window.__film.events);
        const frameList = stripFiles.map(sf => {
            const rel = Math.round(sf.now - impactNow);
            const name = `t${rel < 0 ? '-' : '+'}${String(Math.abs(rel)).padStart(5, '0')}ms.jpg`;
            renameSync(join(dir, 'strip', sf.file), join(dir, 'strip', name));
            return { file: `strip/${name}`, gameMs: +sf.now.toFixed(2), relImpactMs: rel, step: sf.step };
        });
        const rel = e => ({ gameMs: +e.now.toFixed(2), relImpactMs: +(e.now - impactNow).toFixed(2), step: e.step ?? null });
        const manifest = {
            tool: 'tools/debug/aftermath_film.mjs',
            git: gitInfo(),
            scenario, config: configName, urlFlags: flags,
            casts: { p1: process.env.WFM_P1, p2: process.env.WFM_P2 }, rigs,
            receiver: { index: receiverIdx, rig: rigs[receiverIdx] },
            stepMs: +STEP_MS.toFixed(4), stripEverySteps: STRIP_EVERY,
            attackerLogged: info.attacker,
            receiverFacing: { atImpact: frames.find(f => f.state === 'down')?.facing, atRise: frames.find(f => f.state === 'gettingUp')?.facing },
            receiverLying: frames.find(f => f.state === 'down')?.lying,
            events: Object.fromEntries(Object.entries(events).map(([k, v]) => [k, rel(v)])),
            riseStartCalls: inPageEvents.map(e => ({ ...e, relImpactMs: +(e.now - impactNow).toFixed(2) })),
            nearForearmTexture: rle(frames, 'nearForearm', impactNow),
            farForearmTexture: rle(frames, 'farForearm', impactNow),
            frames: frameList,
            samples: frames.map(f => ({ rel: +(f.now - impactNow).toFixed(2), state: f.state, riseT: f.state === 'gettingUp' ? +f.riseT.toFixed(4) : null,
                sell: f.sell, nearForearm: f.nearForearm, farForearm: f.farForearm, nearWrist: f.nearWrist, farWrist: f.farWrist })),
        };
        writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
        console.log(`[film] ${configName}/${scenario}: receiver ${rigs[receiverIdx]} facing ${manifest.receiverFacing.atImpact}, `
            + Object.entries(manifest.events).map(([k, v]) => `${k}@${v.relImpactMs}`).join(' '));
        return manifest;
    } finally {
        await h.close();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [scArg = 'all', cfgArg = 'all', outRoot = 'research/animation/suplex-rise-2026-10'] = process.argv.slice(2);
    const scenarios = scArg === 'all' ? Object.keys(SCENARIOS) : [scArg];
    const configs = cfgArg === 'all' ? Object.keys(CONFIGS) : [cfgArg];
    for (const s of scenarios) for (const c of configs) await film(s, c, outRoot);
    process.exit(0);
}
