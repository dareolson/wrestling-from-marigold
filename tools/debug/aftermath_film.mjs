// Event-aligned film of the suplex receiver (PLAN_SUPLEX_RISE Stage 1).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/aftermath_film.mjs [scenario|all] [config|all] [outRoot]
//     scenario: suplex (Lou throws, roster George receives) | suplexReverse (George throws, Lou receives)
//               | suplexFlip / suplexReverseFlip (same, thrower starts on the other side: receiver faces right)
//     config:   off (both flags =off) | aft (aftermath=v2 only) | on (sellart=v1&aftermath=v2)
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
import { countForearmInside } from './forearm_count.mjs';

// Both flags are on by default since Derek's G4 (2026-10-24), so `off`/`aft` turn them off explicitly.
export const CONFIGS = { off: 'sellart=off&aftermath=off', aft: 'sellart=off&aftermath=v2', on: 'sellart=v1&aftermath=v2' };
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
const INSTALL = async depthControl => {
    const game = window.__WFM_GAME;
    // WFM_DEPTH_CONTROL=1: draw the hand behind the body by depth (the Rev 2 order) instead of the Rev 3 torso mask, as a control for the forearm counts
    if (depthControl) for (const w of [game.scene.scenes[0].w1, game.scene.scenes[0].w2]) w.skeleton._forearmOverUpperArm = false;
    const sc = game.scene.scenes[0];
    const film = (window.__film = { suplexAt: null, receiver: null, events: [], T: 0, sil: await import('/src/rig/silhouette.js'), sells: await import('/src/animation/sells.js') });
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
const TAKE_OVER = ({ receiverIdx, legScale, planSeed }) => {
    const game = window.__WFM_GAME;
    const sc = game.scene.scenes[0];
    const film = window.__film;
    const w = receiverIdx === 0 ? sc.w1 : sc.w2;
    film.receiver = receiverIdx;
    // PLAN_GEORGE_TRANSFER T10.3: WFM_LEGSCALE puts a candidate `backSell.legScale` on the receiver's live config only (never saved)
    if (legScale) w.skeleton._textureConfig.backSell.legScale = legScale;
    const sk0 = w.skeleton, names = sk0._parts.map(() => null);
    for (const [k, v] of Object.entries(sk0)) { const i = sk0._parts.indexOf(v); if (i >= 0 && !names[i]) names[i] = k; }
    film.names = names.map((n, i) => n ?? `part${i}`);
    film.prevParts = null;
    // T10.3 (A2a): the sell plan draws from Math.random, whose state at that moment depends on the live approach. Re-seed the
    // stream the instant the plan is drawn so every candidate gets the same logged plan (the test compares the manifests).
    if (planSeed !== null) {
        const tick = w._tickSell.bind(w);
        w._tickSell = dt => {
            if (!w._sell && w._pain?.phase === 'mat' && !w._pain.planned) {
                let a = planSeed;
                Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
                    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
            }
            return tick(dt);
        };
    }
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
    // Near-hand contact -> back waist (PLAN_SUPLEX_RISE T4.0): the painted clutch
    // patch of the active near forearm if it has one, else the wrist; the waist is
    // the torso's painted backWaist. Null on rigs without one (George).
    const Sk = sk.constructor, near = sk.nearForearm, waistA = sk.torso?._semanticAnchors?.backWaist;
    const cA = near?._semanticAnchors?.clutch;
    const contact = (cA && Sk.imageAnchorPoint(near, cA)) || pts.nearWrist || null;
    const waist = waistA ? Sk.imageAnchorPoint(sk.torso, waistA) : null;
    const dist = contact && waist ? Math.hypot(contact.x - waist.x, contact.y - waist.y) : null;
    // PLAN_GEORGE_TRANSFER T10.1: where the leg channels come from this frame. `src` is the owner of the grounded pose
    // (sell:<name>:<part> | hold | none); `g` the leg channels it drew (after limitKnees), `off` the offsets over the lying base,
    // `hold` the hold's own leg offsets (only while a hold is on); flex = thigh - shin per leg as drawn.
    const legCh = ['nearThigh', 'nearShin', 'farThigh', 'farShin', 'hip'];
    const r3 = v => +v.toFixed(3);
    let legs = null;
    if (w.state === 'down') {
        const base = sk.constructor.GROUNDED_POSES[w.lying], sp = w._sellPose?.(), lh = sp ? null : w._lyingHold?.();
        const g = sp ? sp.g : lh ? film.sells.limitKnees(film.sells.applyOffsets(base, lh.offsets)) : null;
        legs = { src: sp ? `sell:${cur.name}:${cur.part ?? ''}` : lh ? 'hold' : 'none' };
        if (g) {
            legs.g = Object.fromEntries(legCh.map(c => [c, r3(g[c])]));
            legs.off = Object.fromEntries(legCh.map(c => [c, r3(g[c] - base[c])]));
            legs.flex = { near: r3(g.nearThigh - g.nearShin), far: r3(g.farThigh - g.farShin) };
        }
        if (lh) legs.hold = Object.fromEntries(legCh.map(c => [c, r3(lh.offsets[c] ?? 0)]));
    }
    // T10.3 (A2): the largest per-part drawn step since the last frame (corner-set Hausdorff, rise_handoff_probe.partSteps)
    const parts = sk._parts.map((img, i) => {
        const m = img.getWorldTransformMatrix(), ox = img.originX * img.width, oy = img.originY * img.height;
        return { n: film.names[i], vis: !!img.visible, c: [[-ox, -oy], [img.width - ox, -oy], [img.width - ox, img.height - oy], [-ox, img.height - oy]]
            .map(([x, y]) => [m.a * x + m.c * y + m.tx, m.b * x + m.d * y + m.ty]) };
    });
    let pstep = null, pstepPart = null, legStep = null;
    if (film.prevParts) {
        pstep = 0; legStep = 0;
        const near = (c, set) => Math.min(...set.map(d => Math.hypot(c[0] - d[0], c[1] - d[1])));
        parts.forEach((b, i) => { const a = film.prevParts[i];
            if (!a.vis || !b.vis) return;
            const v = Math.max(...a.c.map(c => near(c, b.c)), ...b.c.map(c => near(c, a.c)));
            if (v > pstep) { pstep = v; pstepPart = b.n; }
            if (/^(near|far)(Thigh|Shin|Foot)$/.test(b.n) && v > legStep) legStep = v; });
        pstep = +pstep.toFixed(2); legStep = +legStep.toFixed(2);
    }
    film.prevParts = parts;
    return {
        pstep, pstepPart, legStep,
        legs,
        recoveryW: +(w._recoveryWeight?.() ?? 0).toFixed(4), handOnBack: !!w._recoveryHandOnBack?.(), holdActive: !!w._lyingHold?.(), combatBlend: +(w.combatBlend ?? 0).toFixed(3),
        dbg: { pose: { lArm: w.pose?.lArm, lForearm: w.pose?.lForearm, lElbow: w.pose?.lElbow, rElbow: w.pose?.rElbow, bend: w.pose?.bend }, rec: (r => r && { lArm: r.lArm, lForearm: r.lForearm, lElbow: r.lElbow, bend: r.bend })(w._recoveryPose?.()), idle: w.idlePose },
        // the contact-latch state (null when no latch exists this frame); the art never changes on a rig with no grip donor, the latch still must not chatter
        pain: w._pain ? { part: w._pain.part, severity: w._pain.severity, phase: w._pain.phase } : null,
        latch: w._gripLatch ? (w._gripLatch.on ? 1 : 0) : null,
        // Rev 2 D6 / Rev 3 (backSell.handUnder): 1 while the hand is drawn behind the body (the flag the Wrestler hands the skeleton: by depth, or by the D11 torso mask), null on a build without it
        handUnder: w.skeleton._handUnder === undefined ? null : (w.skeleton._handUnder ? 1 : 0),
        // Rev 3 D10: how far each hand sample is outside the torso art (game px, 0 = on it), null on a build without it
        clr: (c => c && { min: +c.min.toFixed(2), d: Object.fromEntries(Object.entries(c.distances).map(([k, v]) => [k, +v.toFixed(2)])) })(sk.handClearance?.()),
        // the elbow's distance outside the torso art (D11: it must stay out to keep the forearm over the upper arm there)
        elbowClr: (e => e ? +film.sil.silhouetteDistance(sk.torso, e, film.sil.silhouetteOf(sk.torso)).toFixed(2) : null)(pts.nearElbow),
        // the back reach weight the route used for the want (null when this draw solved none), and the standing hand weight
        reachW: w._handReachSeen ?? null, handHw: +(w._recoveryHandWeight?.() ?? 0).toFixed(3),
        handPending: w._handPending ? 1 : 0, handSkips: w._handSkips ?? 0,
        handWant: typeof w._handWant === 'function' ? (w._handWant(false) ? 1 : 0) : null,
        nearContact: pt(contact), backWaist: pt(waist), backDist: dist === null ? null : +dist.toFixed(2),
        now: sc.time.now, state: w.state, lying: w.lying, facing: w.facing, riseT: w.riseT,
        x: w.x, y: w.y, s: w.s * (w._heightScale ?? 1),
        sell: cur ? { name: cur.name, part: cur.part, u: +u.toFixed(4) } : null,
        nearForearm: sk.nearForearm?.texture?.key ?? null, farForearm: sk.farForearm?.texture?.key ?? null,
        nearHand: sk.nearHand?.texture?.key ?? null, farHand: sk.farHand?.texture?.key ?? null,
        nearWrist: pt(pts.nearWrist), farWrist: pt(pts.farWrist),
        farShoulder: pt(pts.farShoulder), farElbow: pt(pts.farElbow),
        otherState: (film.receiver === 0 ? sc.w2 : sc.w1).state,
    };
};

// In-page: interrupt the receiver the way the game does (PLAN_SUPLEX_RISE T4.4).
//   a  pinned while in the lying hold          b  hit during recovery (pain replaced, staggered)
//   c  natural pain.until expiry: nothing is touched, filming just runs through it (moving `until`
//      by hand would retroactively rescale the recovery weight, which no game path does)
const INTERRUPT = kind => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = window.__film.receiver === 0 ? sc.w1 : sc.w2;
    if (kind === 'a') w.state = 'pinned';
    else if (kind === 'b') { w._hurt(5, 'jab'); w.state = 'staggered'; w.stateTimer = 0.4; }
    return { now: sc.time.now, state: w.state, painUntil: w._pain?.until ?? null, painSince: w._pain?.since ?? null };
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

async function film(scenario, configName, outRoot, interrupt = null) {
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
        await page.evaluate(INSTALL, !!process.env.WFM_DEPTH_CONTROL);
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
        await page.evaluate(TAKE_OVER, { receiverIdx, legScale: process.env.WFM_LEGSCALE ? +process.env.WFM_LEGSCALE : null,
            planSeed: process.env.WFM_PLANSEED ? +process.env.WFM_PLANSEED : null });
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
        let endAt = null, holdSince = null, impactStep = null, standingNow = null, clutchDone = false, step = 0, fired = null, stopAt = null;
        const t0 = info.suplexAt;
        const mark = async (name, f, i) => {
            if (events[name]) return;
            events[name] = { now: f.now, step: i };
            await page.screenshot({ path: join(dir, 'closeups', `${name}.png`), clip: clipFor(f) });
            // Rev 3 D11: while the hand is behind the body, how many forearm pixels are visibly drawn inside the torso's painted art
            if (f.handUnder === 1) events[name].forearmInside = await countForearmInside(page, clipFor(f), receiverIdx === 0 ? 'w1' : 'w2', process.env.WFM_COUNT_DEBUG ? join(process.env.WFM_COUNT_DEBUG, name) : null);
        };

        while (true) {
            const f = await page.evaluate(STEP);
            f.step = step;
            frames.push(f);
            if (step % STRIP_EVERY === 0) {
                const file = `raw-${String(step).padStart(5, '0')}.jpg`;
                const clip = clipFor(f);
                await page.screenshot({ path: join(dir, 'strip', file), type: 'jpeg', quality: 92, clip });
                stripFiles.push({ file, now: f.now, step, clip: [clip.x, clip.y] });
            }
            if (!events.suplex) await mark('suplex', f, step);
            if (!events.impact && f.state === 'down') { impactStep = step; await mark('impact', f, step); }
            if (events.impact && !clutchDone && f.sell?.name === 'clutch' && f.sell.u >= 0.35) {
                clutchDone = true; await mark('clutchPeak', f, step);
            }
            if (!events.hold && f.holdActive && events.impact) { holdSince ??= f.now; if (f.now - holdSince >= 800) await mark('hold', f, step); }
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
            // T4.4: fire the interruption at <anchor>+ms, then film one more second
            if (interrupt && !fired) {
                const base = interrupt.anchor === 'standing' ? standingNow : events.impact?.now;
                if (base != null && f.now - base >= interrupt.ms) {
                    fired = { kind: interrupt.kind, atMs: +(f.now - (events.impact?.now ?? 0)).toFixed(2), step, ...(await page.evaluate(INTERRUPT, interrupt.kind)) };
                    stopAt = f.now + 1000;
                }
            }
            if (stopAt !== null && f.now >= stopAt) break;
            // Rev 3: the standing hand weight lets go late, so run on until the pain is over (the swap out) plus half a second
            if (!interrupt && standingNow !== null && !marksLeft.rec.length && (f.pain === null ? (endAt ??= f.now + 500) <= f.now : f.now - standingNow > 5000)) break;
            if (f.now - t0 > MAX_AFTER_SUPLEX_MS) { console.log(`[film] ${configName}/${scenario}: gave up at +${MAX_AFTER_SUPLEX_MS} ms`); break; }
        }

        if (!events.impact) throw new Error('receiver never reached state=down');
        const impactNow = events.impact.now;
        const inPageEvents = await page.evaluate(() => window.__film.events);
        const frameList = stripFiles.map(sf => {
            const rel = Math.round(sf.now - impactNow);
            const name = `t${rel < 0 ? '-' : '+'}${String(Math.abs(rel)).padStart(5, '0')}ms.jpg`;
            renameSync(join(dir, 'strip', sf.file), join(dir, 'strip', name));
            return { file: `strip/${name}`, gameMs: +sf.now.toFixed(2), relImpactMs: rel, step: sf.step, clip: sf.clip };
        });
        const rel = e => ({ gameMs: +e.now.toFixed(2), relImpactMs: +(e.now - impactNow).toFixed(2), step: e.step ?? null });
        const manifest = {
            tool: 'tools/debug/aftermath_film.mjs',
            git: gitInfo(),
            scenario, config: configName, urlFlags: flags, canvasBox, cropSize: CROP,
            casts: { p1: process.env.WFM_P1, p2: process.env.WFM_P2 }, rigs,
            receiver: { index: receiverIdx, rig: rigs[receiverIdx] },
            stepMs: +STEP_MS.toFixed(4), stripEverySteps: STRIP_EVERY,
            attackerLogged: info.attacker,
            receiverFacing: { atImpact: frames.find(f => f.state === 'down')?.facing, atRise: frames.find(f => f.state === 'gettingUp')?.facing },
            receiverLying: frames.find(f => f.state === 'down')?.lying,
            events: Object.fromEntries(Object.entries(events).map(([k, v]) => [k, { ...rel(v), ...(v.forearmInside ? { forearmInside: v.forearmInside } : {}) }])),
            riseStartCalls: inPageEvents.map(e => ({ ...e, relImpactMs: +(e.now - impactNow).toFixed(2) })),
            nearForearmTexture: rle(frames, 'nearForearm', impactNow),
            farForearmTexture: rle(frames, 'farForearm', impactNow),
            interrupt: fired,
            frames: frameList,
            samples: frames.map(f => ({ rel: +(f.now - impactNow).toFixed(2), state: f.state, riseT: f.state === 'gettingUp' ? +f.riseT.toFixed(4) : null,
                sell: f.sell, recoveryW: f.recoveryW, holdActive: f.holdActive, dbg: f.dbg, handOnBack: f.handOnBack, combatBlend: f.combatBlend, backDist: f.backDist, latch: f.latch, handUnder: f.handUnder, clr: f.clr, handWant: f.handWant, elbowClr: f.elbowClr, reachW: f.reachW, handHw: f.handHw, handPending: f.handPending, handSkips: f.handSkips, nearWristW: f.nearWrist, lying: f.lying, pain: f.pain, legs: f.legs, pstep: f.pstep, legStep: f.legStep, pstepPart: f.pstepPart, nearContact: f.nearContact, backWaist: f.backWaist, nearForearm: f.nearForearm, farForearm: f.farForearm, nearWrist: f.nearWrist, farWrist: f.farWrist,
                farShoulder: f.farShoulder, farElbow: f.farElbow, rootY: f.y, facing: f.facing })),
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
    // WFM_INTERRUPT="a@impact+2500" | "b@standing+500" | "c@standing+500"
    const m = /^([abc])@(impact|standing)\+(\d+)$/.exec(process.env.WFM_INTERRUPT ?? '');
    const interrupt = m ? { kind: m[1], anchor: m[2], ms: +m[3] } : null;
    for (const s of scenarios) for (const c of configs) await film(s, c, interrupt ? join(outRoot, `interrupt-${m[1]}`) : outRoot, interrupt);
    process.exit(0);
}
