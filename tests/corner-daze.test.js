// PLAN_GRAPPLES T3c.6 / T3c.7: stuck in the corner, and the running attack at him (grapples=v1). One lifecycle on a fake scene
// with a tween clock: arrive, hold, get hit, restore, escape, and a charge that misses after he escapes. Every check runs past the end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { STAMINA_DRAIN } from '../src/Wrestler.js';
import { RING, ringBoundsAtY } from '../src/constants.js';
import Skeleton from '../src/Skeleton.js';
import { planSells, SELLS, clutchSell } from '../src/animation/sells.js';
import { CORNER, CORNER_CHARGE, CORNER_DAZE_POSE, cornerDazeSeconds, cornerOffsetAt, cornerPoseAt } from '../src/animation/cornerDaze.js';
import { ROPE_HIT } from '../src/animation/ropeHit.js';
import { STAGGER_TYPES, staggerFor } from '../src/animation/staggers.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
globalThis.Phaser.Math.Clamp ??= (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const withFlag = (fn) => { globalThis.location = { search: '?grapples=v1' }; try { return fn(); } finally { delete globalThis.location; } };
const DT = 1 / 60;
const NEAR_Y = RING.nearLeft.y - 6, FAR_Y = RING.farLeft.y + 6;

// A scene with a clock: linear tweens, delayed calls, the events it was told about.
function world() {
    const tweens = [], timers = [], events = [];
    const scene = {
        time: { now: 1000, delayedCall: (ms, fn) => timers.push({ at: scene.time.now + ms, fn }) },
        tweens: {
            add(cfg) {
                const { targets, duration, ease, onUpdate, onComplete, ...props } = cfg;
                const t = { targets, duration, elapsed: 0, onUpdate, onComplete, stopped: false, from: {}, to: props, stop() { t.stopped = true; } };
                for (const k of Object.keys(props)) t.from[k] = targets[k];
                tweens.push(t);
                return t;
            },
            killTweensOf(target) { for (const t of tweens) if (t.targets === target) t.stopped = true; },
        },
        cameras: { main: { shake() {} } },
        triggerRopeBounce: () => {}, _logEvent: (n, d) => events.push([n, d]), _heatForMove() {},
        events,
    };
    const wrestlers = [];
    scene.step = (ms = 1000 / 60) => {
        scene.time.now += ms;
        for (const t of tweens) {
            if (t.stopped) continue;
            t.elapsed += ms;
            const p = Math.min(1, t.elapsed / t.duration);
            for (const k of Object.keys(t.to)) t.targets[k] = t.from[k] + (t.to[k] - t.from[k]) * p;
            t.onUpdate?.(t);
            if (p >= 1 && !t.stopped) { t.stopped = true; t.onComplete?.(); }
        }
        for (const tm of timers.splice(0)) { if (tm.at <= scene.time.now) tm.fn(); else timers.push(tm); }
    };
    // what Arena does each frame for the parts under test: each man's run tick, then the clock
    scene.frame = () => { for (const w of wrestlers) w.tickRun(DT); scene.step(); };
    scene.add = (w) => { wrestlers.push(w); return w; };
    return scene;
}
const KITS = {
    lou:    { _heightScale: 1.0,  moveSet: ['clothesline', 'cornerCharge', 'jab'] },
    george: { _heightScale: 1.05, moveSet: ['clothesline', 'cornerCharge', 'jab'] },
};
function man(scene, kit, o = {}) {
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene, pose: { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0 },
        x: 450, y: NEAR_Y, facing: 1, runFacing: 1, state: 'standing', stamina: 100, walkPhase: 0, moveBlend: 1,
        _gaitV2: null, runTargetY: null, _cornerEp: null, _cornerEpN: 0, _charge: null, skeleton: null, ...KITS[kit], ...o,
    });
    return scene.add(w);
}
// Whip a man into a corner: he is running at the corner point, on the run the whip release builds.
function runToCorner(w, dir) {
    const b = ringBoundsAtY(w.y);
    w.state = 'running'; w.runPhase = 'toCorner'; w.runFacing = w.facing = dir;
    w.runTarget = dir > 0 ? b.right - 20 : b.left + 20; w.runTargetY = null;
    w._setRunLine(dir, w.y);
}
const untilState = (scene, w, state, max = 600) => { for (let i = 0; i < max && w.state !== state; i++) scene.frame(); };
const cornerPoint = (w, dir) => { const b = ringBoundsAtY(w.y); return dir > 0 ? b.right - 20 : b.left + 20; };

test('timeline: 12 px deep at most, eases from the rope hit load into the daze, sways, length is max(1.5, stagger seconds)', () => {
    assert.equal(cornerOffsetAt(0), 0);
    assert.ok(Math.abs(cornerOffsetAt(ROPE_HIT.loadMs) - CORNER.depth) < 1e-9);
    assert.equal(cornerOffsetAt(5000), CORNER.depth);
    for (let ms = 0; ms < 3000; ms += 17) assert.ok(cornerOffsetAt(ms) <= CORNER.depth + 1e-9);
    assert.ok(cornerPoseAt(ROPE_HIT.loadMs).bend < -0.3, 'the load pose first: back arched into the corner');
    const settled = cornerPoseAt(ROPE_HIT.loadMs + CORNER.settleMs + 3000);
    assert.ok(Math.abs(settled.bend + 0.22) <= CORNER.swayBend + 1e-9, `daze bend ${settled.bend}`);
    const bends = []; for (let ms = 1000; ms < 4000; ms += 17) bends.push(cornerPoseAt(ms).bend);
    assert.ok(Math.max(...bends) - Math.min(...bends) > 0.07, 'it sways');
    for (const t of STAGGER_TYPES) {
        const st = t.minStamina === -Infinity ? 1 : t.minStamina + 1;
        assert.equal(staggerFor(st).id, t.id);
        assert.equal(cornerDazeSeconds(st), Math.max(CORNER.minDazeS, t.seconds), t.id);
        assert.ok(cornerDazeSeconds(st) >= 2.2);
    }
});

test('Lou, near-left corner: arrive, hold, hit, restore, escape; one episode, the clock keeps running, nothing is left over', () => {
    withFlag(() => {
        const sc = world();
        const w = man(sc, 'lou', { x: 300, y: NEAR_Y });
        const s = w.s, rope = cornerPoint(w, -1);
        runToCorner(w, -1);
        let turnedAt = null, minX = w.x;
        for (let i = 0; i < 900 && w.state === 'running'; i++) {
            sc.frame();
            if (turnedAt === null && w.facing === 1) turnedAt = Math.abs(w.x - rope);
            minX = Math.min(minX, w.x);
        }
        assert.equal(w.state, 'cornered');
        const arrivedAt = sc.time.now;
        assert.ok(turnedAt <= 40 * s && turnedAt > 40 * s - 12 * s, `turned ${turnedAt} px short`);
        assert.equal(w.facing, 1, 'facing in, from the near-left corner');
        assert.equal(w._cornerEp.id, 1);
        assert.equal(w._ropeTension, 0, 'no rope spring in a corner');
        const total = cornerDazeSeconds(100), t0 = sc.time.now - 0; // t0 here is a few frames after arrival; the episode's own ms is the truth
        // hold: no input, the daze runs, depth never past 12 px, pose is his
        let maxPast = 0;
        for (let i = 0; i < Math.round(0.8 * 60); i++) { sc.frame(); maxPast = Math.max(maxPast, (rope - w.x) * 1); assert.equal(w.state, 'cornered'); }
        assert.ok(Math.abs(maxPast - CORNER.depth * s) < 0.6, `loaded ${maxPast} px past the corner point`);
        assert.ok(w.pose.bend < -0.1 && w.pose.crouch > 0.1, 'daze pose');
        // a strike: sells, then the daze again, with the time he had left
        const leftBefore = w._cornerEp.left;
        let staggers = 0; const realStagger = w.startStagger.bind(w);
        w.startStagger = () => { staggers++; return realStagger(); };
        w._doSell('sellChest', 110, () => w.startStagger());
        assert.equal(w.state, 'selling');
        for (let i = 0; i < 12 && w.state === 'selling'; i++) sc.frame();
        assert.equal(w.state, 'cornered', 'restored');
        assert.equal(staggers, 1);
        assert.ok(w._cornerEp.left < leftBefore, `the clock ran through the sell: ${leftBefore} -> ${w._cornerEp.left}`);
        assert.ok(w._cornerEp.left > leftBefore - 0.4);
        // then it ends: in the Corner for the whole length, standing after, stepped forward ~30 px, nothing running
        let frames = 0;
        while (w.state === 'cornered' && frames < 600) { sc.frame(); frames++; }
        const heldS = total - w._cornerEp?.left;
        assert.equal(w._cornerEp, null);
        const stayedMs = sc.time.now - arrivedAt;
        assert.ok(Math.abs(stayedMs / 1000 - total) < 0.08, `stayed ${(stayedMs / 1000).toFixed(2)} s of ${total}`);
        for (let i = 0; i < 120; i++) sc.frame(); // past the end of the move
        assert.equal(w.state, 'standing');
        assert.equal(w._cornerEp, null);
        assert.ok(Math.abs((w.x - rope) - (CORNER.exitStep - CORNER.depth) * s) < 4 * s, `stepped to ${w.x - rope} from the corner point`);
        assert.ok(w.x > rope);
        assert.ok(w.pose.bend > -0.02 && Math.abs(w.pose.crouch) < 0.02, 'idle again');
    });
});

test('a fall during the sell ends the episode: no restore, no grips, no stale step', () => {
    withFlag(() => {
        const sc = world();
        const w = man(sc, 'lou', { x: 300, y: NEAR_Y });
        runToCorner(w, -1); untilState(sc, w, 'cornered');
        for (let i = 0; i < 30; i++) sc.frame();
        let called = 0;
        w._doSell('sellChest', 110, () => { called++; });
        w.state = 'falling'; // knocked down by something else this frame (startFall's first act)
        sc.frame();
        assert.equal(w._cornerEp, null, 'episode gone the next tick');
        for (let i = 0; i < 60; i++) sc.frame();
        assert.equal(called, 0, 'the sell callback of a finished episode does nothing');
        assert.equal(w.state, 'falling');
        // a new sell on someone not cornered still calls back
        const o = man(sc, 'george'); let c2 = 0; o._doSell('sellChest', 50, () => { c2++; });
        for (let i = 0; i < 10; i++) sc.step(); assert.equal(c2, 1);
    });
});

test('arms: the load\'s guard (elbows tucked, upper arms set back), then the elbows only unfold and the upper arms settle to the hang over 320 ms without overshoot, in every corner and both kits', () => {
    withFlag(() => {
        const at = (ms) => cornerPoseAt(ms);
        const load = ROPE_HIT.loadMs;
        const g = at(load);
        assert.ok(g.lElbow > 1.5 && g.rElbow > 1.5, `elbows tucked at the end of the load: ${g.lElbow}, ${g.rElbow}`);
        assert.ok(g.lArm < 0 && g.rArm < 0, `upper arms set back, not flung: ${g.lArm}, ${g.rArm}`);
        assert.ok(at(0).lElbow > 0.69 && at(0).rElbow > 0.69, 'the elbows come into the guard from the rest flex, never straight');
        const hang = { lArm: CORNER_DAZE_POSE.lArm, rArm: CORNER_DAZE_POSE.rArm };
        let prev = g;
        for (let ms = load + 5; ms <= load + CORNER.armFallMs; ms += 5) {
            const p = at(ms);
            assert.ok(p.lElbow <= prev.lElbow + 1e-9 && p.rElbow <= prev.rElbow + 1e-9, `elbows only unfold (${ms} ms)`);
            assert.ok(p.lArm >= prev.lArm - 1e-9 && p.rArm >= prev.rArm - 1e-9, `upper arms only move toward the hang (${ms} ms)`);
            assert.ok(p.lArm <= hang.lArm + 1e-9 && p.rArm <= hang.rArm + 1e-9, `and never pass it (${ms} ms)`);
            prev = p;
        }
        const end = at(load + CORNER.armFallMs);
        assert.ok(end.lArm < -0.09 && end.rArm < 0.03, `arms hang: ${end.lArm}, ${end.rArm}`);
        assert.ok(Math.abs(end.lElbow - CORNER.elbow) < 1e-9);
        assert.ok(at(load + CORNER.settleMs).lElbow > CORNER.elbow + 0.3, 'the elbows are still unfolding when the torso has settled');
        for (let ms = load + CORNER.armFallMs; ms < 6000; ms += 17) { const p = at(ms); assert.ok(p.lArm <= -0.0999 && p.rArm <= 0.0201, 'they never lift on their own'); }
        for (const kit of ['lou', 'george']) for (const y of [NEAR_Y, FAR_Y]) for (const dir of [-1, 1]) {
            const sc = world(), w = man(sc, kit, { x: dir < 0 ? 300 : 650, y });
            runToCorner(w, dir); untilState(sc, w, 'cornered');
            for (let i = 0; i < 40; i++) sc.frame();
            assert.ok(w.pose.lArm < -0.09 && w.pose.rArm < 0.03 && Math.abs(w.pose.lElbow - CORNER.elbow) < 0.02, `${kit} ${y} ${dir}: ${w.pose.lArm} ${w.pose.rArm} ${w.pose.lElbow}`);
        }
        assert.equal(Wrestler.prototype.holdCornerGrips, undefined, 'no hands on the rope');
    });
});

test('all four corners, both kits: back to the corner, facing in, loaded 12 px at most, and into the daze', () => {
    withFlag(() => {
        for (const kit of ['lou', 'george']) for (const [y, side] of [[NEAR_Y, 'near'], [FAR_Y, 'far']]) for (const dir of [-1, 1]) {
            const sc = world();
            const w = man(sc, kit, { x: dir < 0 ? 300 : 650, y });
            const s = w.s, rope = cornerPoint(w, dir);
            runToCorner(w, dir);
            let maxPast = 0;
            for (let i = 0; i < 900 && w.state === 'running'; i++) sc.frame();
            for (let i = 0; i < 90; i++) { sc.frame(); maxPast = Math.max(maxPast, (w.x - rope) * dir); }
            const id = `${kit} ${side} ${dir < 0 ? 'left' : 'right'}`;
            assert.equal(w.state, 'cornered', id);
            assert.equal(w.facing, -dir, `${id}: facing in`);
            assert.ok(maxPast <= CORNER.depth * w.s + 0.6 && maxPast > CORNER.depth * w.s - 1, `${id}: loaded ${maxPast} (${CORNER.depth * w.s})`);
            assert.equal(w.y, y, `${id}: depth unchanged`);
        }
    });
});

// ── the charge ────────────────────────────────────────────────────────────────

function chargeSetup(kitA = 'george', kitD = 'lou', ax = 700, daze = 6) {
    const sc = world();
    const d = man(sc, kitD, { x: 300, y: NEAR_Y, stamina: 80 });
    runToCorner(d, -1); untilState(sc, d, 'cornered');
    d._cornerEp.left = daze; // long enough for the run to get there: the run is slower than a short daze
    const hurts = [], realHurt = d._hurt.bind(d); d._hurt = (n, id, o) => { hurts.push([n, id, o]); return realHurt(n, id, o); };
    const keys = new Set(), held = new Set();
    const a = man(sc, kitA, { x: ax, y: NEAR_Y - 10, facing: -1, input: { justDown: k => keys.delete(k), isDown: k => held.has(k) } });
    a._lastOther = d; d._lastOther = a;
    return { sc, a, d, hurts, press: k => keys.add(k), hold: k => held.add(k) };
}

test('charge: he escapes before it lands (the daze ends mid-run): a free miss, the attacker runs on to the corner and is cornered himself', () => {
    withFlag(() => {
        const { sc, a, d, hurts, press } = chargeSetup();
        d._cornerEp.left = 0.35; // out in 21 frames
        press('run'); assert.equal(a.tryRun(), 'run');
        let frames = 0;
        while (a.runPhase === 'charge' && frames < 600) { sc.frame(); frames++; }
        assert.notEqual(d.state, 'cornered', 'he got out');
        for (let i = 0; i < 400 && a.state !== 'cornered'; i++) sc.frame();
        for (let i = 0; i < 60; i++) sc.frame();
        assert.equal(hurts.length, 0, 'no damage');
        assert.equal(a.state, 'cornered', 'the attacker took the corner himself');
        assert.equal(a.facing, 1, 'facing in');
        assert.equal(a._cornerEp.corner.facing, 1, 'the same near-left corner');
    });
});

test('charge: not when he is close, when the run is nearly vertical, or when the move is not in the kit; stale charge cancelled by a fall', () => {
    withFlag(() => {
        const { sc, a, d } = chargeSetup();
        a.x = d.x + 100; assert.equal(a.canCornerCharge(d), false, 'close');
        a.x = d.x + 140; a.y = NEAR_Y - 200; assert.equal(a.canCornerCharge(d), false, 'near-vertical: the run would crawl');
        a.x = 700; a.y = NEAR_Y; a.moveSet = ['clothesline']; assert.equal(a.canCornerCharge(d), false, 'not in his kit');
        a.moveSet = ['cornerCharge']; assert.equal(a.canCornerCharge(d), true);
        d.state = 'standing'; assert.equal(a.canCornerCharge(d), false, 'not cornered');
    });
    // flag off: nothing changes
    let a, d; withFlag(() => { ({ a, d } = chargeSetup()); });
    assert.equal(a.canCornerCharge(d), false, 'flag off');
});

test('charge: the attacker is knocked down in the run: no stale charge, no damage later', () => {
    withFlag(() => {
        const { sc, a, d, hurts, press } = chargeSetup();
        press('run'); a.tryRun();
        for (let i = 0; i < 20; i++) sc.frame();
        a.state = 'falling'; sc.frame();
        assert.equal(a._charge, null);
        for (let i = 0; i < 400; i++) sc.frame();
        assert.equal(hurts.length, 0);
    });
});

// ── T3c.8: the charge puts him down ───────────────────────────────────────────

const knock = (low, { kitD = 'lou', kitA = 'george', y = NEAR_Y, left = true } = {}) => {
    const sc = world();
    const d = man(sc, kitD, { x: left ? 300 : 650, y, stamina: 80, sellStyle: 'economical', lying: 'prone' });
    runToCorner(d, left ? -1 : 1); untilState(sc, d, 'cornered');
    d._cornerEp.left = 6;
    const hurts = [], realHurt = d._hurt.bind(d); d._hurt = (n, id, o) => { hurts.push([n, id, o]); return realHurt(n, id, o); };
    const keys = new Set(), held = new Set(low ? ['down'] : []);
    const a = man(sc, kitA, { x: left ? 700 : 250, y: y - 10, facing: left ? -1 : 1, input: { justDown: k => keys.delete(k), isDown: k => held.has(k) } });
    a._lastOther = d; d._lastOther = a;
    keys.add('run'); assert.equal(a.tryRun(), 'run');
    const states = [];
    for (let i = 0; i < 700; i++) {
        sc.frame(); d.tickDown(DT);
        if (states.at(-1) !== d.state) states.push(d.state);
        if (d.state === 'down' && i > 200) break;
    }
    return { sc, a, d, hurts, states };
};

test('face hit: one damage event with part head, a reaction, a forward fall, down prone facing in, the episode gone for good', () => {
    withFlag(() => {
        const { sc, a, d, hurts, states } = knock(false);
        assert.equal(hurts.length, 1);
        assert.deepEqual(hurts[0], [STAMINA_DRAIN.cornerCharge, 'cornerCharge', { part: 'head' }]);
        assert.deepEqual(states.slice(states.indexOf('cornered')), ['cornered', 'selling', 'falling', 'down'], `states ${states}`);
        assert.ok(['forward', 'kneesForward'].includes(d._fallVariant), `a forward fall (falls promoted: chooseFall picks either), got ${d._fallVariant}`);
        assert.equal(d.lying, 'prone'); assert.equal(d.facing, 1, 'head toward the ring');
        assert.equal(d._cornerEp, null); assert.equal(a._charge, null);
        for (let i = 0; i < 200; i++) { sc.frame(); d.tickDown(DT); assert.notEqual(d.state, 'cornered', 'never back in the corner'); }
        d.startStagger(); assert.equal(d._cornerEp, null, 'startStagger cannot put him back'); assert.notEqual(d.state, 'cornered');
        assert.equal(d._pain.part, 'head');
    });
});

test('stomach hit (down held at the press): part gut, kneesForward, same lifecycle', () => {
    withFlag(() => {
        const { d, hurts, states } = knock(true);
        assert.equal(hurts[0][2].part, 'gut');
        assert.equal(d._fallVariant, 'kneesForward');
        assert.equal(d.lying, 'prone');
        assert.deepEqual(states.slice(states.indexOf('cornered')), ['cornered', 'selling', 'falling', 'down']);
        assert.equal(d._pain.part, 'gut');
    });
});

test('the sell always plays: a forced clutch at the part, whatever the style and the dice, with room in the down time', () => {
    withFlag(() => {
        for (const part of ['head', 'gut']) for (const low of [part === 'gut']) {
            for (const style of ['economical', 'theatrical']) {
                const { sc, d } = knock(low, { kitD: style === 'economical' ? 'lou' : 'george' });
                d.sellStyle = style;
                for (let i = 0; i < 60 && !d._sell; i++) { sc.frame(); d.tickDown(DT); }
                assert.ok(d._sell, `${style} ${part}: a sell is planned`);
                assert.equal(d._sell.plan.length, 1);
                const cur = d._sell.plan[0];
                assert.equal(cur.name, 'clutch'); assert.equal(cur.part, part); assert.equal(cur.lying, 'prone');
                assert.ok(d.stateTimer - 0.65 >= cur.duration, `down time ${d.stateTimer} holds the ${cur.duration} s clutch`);
                assert.ok(d._pain.severity >= 0.6);
            }
        }
        for (const style of ['economical', 'theatrical']) for (const lying of ['supine', 'prone']) {
            const plan = planSells({ style, lying, part: 'gut', intensity: 0.7, budget: 4, rand: () => 0.05, force: true });
            assert.deepEqual(plan.map(p => [p.name, p.part, p.lying]), [['clutch', 'gut', lying]]);
        }
        assert.ok(SELLS.prone.clutch.gut && SELLS.supine.clutch.gut);
        assert.notDeepEqual(clutchSell('prone', 'gut', 1).hands, clutchSell('prone', 'chest', 1).hands);
    });
});

test('landing: inside both ropes with the 60·s margin in all 4 corners, both kits; the attacker is clear of the body', () => {
    withFlag(() => {
        for (const kitD of ['lou', 'george']) for (const [y, near] of [[NEAR_Y, true], [FAR_Y, false]]) for (const left of [true, false]) for (const low of [false, true]) {
            const { d, a } = knock(low, { kitD, y, left });
            const b = ringBoundsAtY(d.y), m = 60 * d.s, id = `${kitD} ${near ? 'near' : 'far'} ${left ? 'left' : 'right'} ${low ? 'gut' : 'face'}`;
            assert.ok(d.x >= b.left + m - 1 && d.x <= b.right - m + 1, `${id}: x ${d.x} between ${b.left + m} and ${b.right - m}`);
            assert.equal(d.facing, left ? 1 : -1, id);
            assert.equal(d._charge, null);
            assert.equal(a._charge, null, id);
            assert.ok(Math.abs(a.x - d.x) >= 200 * d.s - 60 * d.s, `${id}: attacker ${Math.abs(a.x - d.x)} px from his hips`);
        }
    });
});

test('a pin or a grab during the reaction owns him: the fall does not start, no episode, no stale fall tween', () => {
    withFlag(() => {
        const sc = world();
        const d = man(sc, 'lou', { x: 300, y: NEAR_Y, sellStyle: 'economical', lying: 'prone' });
        runToCorner(d, -1); untilState(sc, d, 'cornered');
        d._hurt(14, 'cornerCharge', { part: 'head' });
        d._cornerKnockdown('head');
        d.state = 'pinned';
        for (let i = 0; i < 80; i++) sc.frame();
        assert.equal(d.state, 'pinned'); assert.equal(d._cornerEp, null);
        // a fall interrupted by something else stops the inward travel
        const e = man(sc, 'george', { x: 300, y: NEAR_Y, sellStyle: 'economical', lying: 'prone' });
        e._hurt(14, 'cornerCharge', { part: 'gut' });
        e._fallFromCorner(1, 'gut');
        sc.step(); const x0 = e.x; e.state = 'down';
        for (let i = 0; i < 60; i++) sc.step();
        assert.ok(Math.abs(e.x - x0) < 40, 'the travel stopped when something else took him');
    });
});
