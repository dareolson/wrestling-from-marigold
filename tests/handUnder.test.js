// backSell.handUnder (PLAN_GEORGE_TRANSFER Rev 2 D6 / Rev 3 D9, D10): the near forearm (and hand) draw BEHIND the torso in every
// back-sell phase (back clutch, lying hold, rise, standing recovery) and only there. Rev 3: the WANT is the route (past the
// aroundVia point on the way to the waist; Wrestler._handWant), the WHEN is the clearance test, and any state that is not a
// back-sell phase restores the normal order on its first draw. Rigs without the flag (Lou) never change their draw order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { POSES } from '../src/Wrestler.js';
import Skeleton from '../src/Skeleton.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { newGripLatch } from '../src/animation/sellAppearance.js';
import { AROUND } from '../src/rig/backSell.js';
import { onlyListed } from './support/promotedFlags.js';

const BOTH = '?sellart=v1&aftermath=v2';
const noop = () => {};
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
const G = georgeRosterV1, LOU = theszProcreateV1;
const SETTLED = { lLeg: 0, rLeg: 0.1, lArm: 0.1, rArm: 0.1, lean: 0, crouch: 0, lElbow: 0.7, rElbow: 0.7 };

function rig(character, { state = 'standing', latchOn = true, sell = null, hold = false, dist = 9, clear = true, reach = 0.7 } = {}) {
    const flags = [], hand = { clear };
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: state === 'standing' ? 1500 : 1000 }, tweens: { add: () => ({ stop() {} }), killTweensOf: noop } },
        x: 400, y: 380, _heightScale: 1, facing: 1, state, lying: 'supine', idlePose: character.idlePose, stateTimer: 3, riseT: 0.3,
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: { ...SETTLED },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _groundHandoff: null, _hold: hold ? { t: 0.4, lying: 'supine' } : null, _riseFrom: 0, _riseHold: null,
        _gripLatch: latchOn ? newGripLatch(true, 0) : null, _sell: sell,
        input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: { _textureConfig: character.textures, lChannelSide: () => 'near', setPartVariants: noop,
            torso: { _semanticAnchors: character.textures.torso.semanticAnchors }, backContactDistance: () => dist,
            carriedRiseEndArm: () => ({ arm: 0.3, elbow: 1.1 }), setHandUnder: v => flags.push(v), handClearance: () => hand.clear === null ? null : { clear: hand.clear, min: hand.clear ? 5 : 0, distances: {} },
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateGroundedReach: noop, updateGrounded: noop, updateGetUp: noop, updateFall: noop, updateUpright: noop },
    });
    w._testReach = reach;
    w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: state === 'gettingUp' ? 'rise' : 'recover', since: 1000, until: 3500, planned: true };
    return { w, flags, hand };
}
const backClutch = (part = 'back') => ({ plan: [{ name: 'clutch', part, lying: 'supine', limb: null, rolls: 0, duration: 1, amp: 1 }], i: 0, t: 0.5, facing0: 1 });
const PHASES = {
    'back clutch': () => rig(G, { state: 'down', sell: backClutch() }),
    'lying hold': () => rig(G, { state: 'down', hold: true }),
    'rise': () => rig(G, { state: 'gettingUp' }),
    'standing recovery': () => rig(G, { state: 'standing' }),
};

// the skeleton reports the back reach weight it solved last draw (Skeleton._backReachW); Wrestler._handWant consumes it
const feed = w => { w.skeleton._backReachW = w._testReach; return w; };
const draw = w => { feed(w).draw(); };
const under = w => feed(w)._handUnder();
const PHASE_WANT = { 'back clutch': 0, 'lying hold': 0.7, 'rise': 0.7, 'standing recovery': 0 };   // reach weights; the clutch wants by the plan, standing by the recovery weight

test('George: the forearm goes under the torso in every back-sell phase once the hand is past the via point and clear', () => withFlag(BOTH, () => {
    for (const [name, make] of Object.entries(PHASES)) {
        const { w, flags } = make(); w._testReach = PHASE_WANT[name];
        assert.equal(under(w), true, name);
        draw(w);
        assert.equal(flags.at(-1), true, `${name}: draw hands the flag to the skeleton`);
    }
}));

test('George: the want is the route, not the grip latch: it follows the reach weight past AROUND.viaW and the recovery weight past AROUND.standW', () => withFlag(BOTH, () => {
    for (const name of ['lying hold', 'rise']) {
        const { w } = PHASES[name]();
        for (const [reach, want] of [[0.7, true], [AROUND.viaW, true], [AROUND.viaW - 0.01, false], [0, false]]) { w._testReach = reach; assert.equal(feed(w)._handWant(), want, `${name} reach ${reach}`); }
    }
    // the latch plays no part: on or off, the reach decides
    const { w } = PHASES['lying hold'](); w._gripLatch = null; w._testReach = 0.7;
    assert.equal(under(w), true, 'no latch, hand past the via point: under');
    w._gripLatch = newGripLatch(true, 0); w._testReach = 0.05; w._handUnderNow = false;
    assert.equal(under(w), false, 'latch on, hand not past the via point: not under');
    // a back clutch item wants from its first frame, and between two clutches (reach 0) it keeps wanting
    const c = PHASES['back clutch'](); c.w._testReach = 0;
    assert.equal(under(c.w), true, 'back clutch at reach 0');
    c.w._sell = { ...backClutch(), plan: [{ ...backClutch().plan[0], name: 'writhe' }] };
    assert.equal(under(c.w), false, 'a writhe item on the back wants nothing');
    // standing: the recovery hand weight against standW
    const st = PHASES['standing recovery']();
    assert.ok(st.w._recoveryHandWeight() >= AROUND.standW);
    st.w.scene.time.now = 3400; assert.ok(st.w._recoveryHandWeight() < AROUND.standW);
    assert.equal(under(st.w), false, 'standing, hand weight below standW: out');
}));

test('George: out of context (pinned, picked up, a move, another sell part) restores the normal order on the very next draw', () => withFlag(BOTH, () => {
    const exits = {
        pinned: w => { w.state = 'pinned'; }, possum: w => { w.state = 'possum'; }, falling: w => { w.state = 'falling'; },
        'picked up (grabbed)': w => { w.state = 'grabbed'; }, 'a move': w => { w._activeMove = {}; },
        'another sell part': w => { w.state = 'down'; w._sell = backClutch('head'); },
    };
    for (const [name, exit] of Object.entries(exits)) {
        const r = rig(G, { state: 'down', hold: true });
        draw(r.w); assert.equal(r.flags.at(-1), true, `${name}: before`);
        exit(r.w);
        draw(r.w);
        assert.equal(r.flags.at(-1), false, `${name}: restored on the next draw`);
    }
}));

test('flags: sellart off, a rig without handUnder, or no reach never swaps the depth (Lou in every phase)', () => {
    withFlag('?sellart=off', () => { for (const make of Object.values(PHASES)) assert.equal(under(make().w), false); });
    withFlag(BOTH, () => {
        const louPhases = { down: { state: 'down', hold: true }, clutch: { state: 'down', sell: backClutch() }, rise: { state: 'gettingUp' }, standing: { state: 'standing' } };
        for (const [name, opts] of Object.entries(louPhases)) {
            const { w, flags } = rig(LOU, opts);
            assert.equal(w._gripLatch.on, true);
            assert.equal(under(w), false, `Lou ${name}: his depths are unchanged`);
            draw(w); assert.equal(flags.at(-1), false, `Lou ${name}`);
        }
        // handUnder false on George's own data is the same as absent
        const textures = { ...G.textures, backSell: { ...G.textures.backSell, handUnder: false, aroundVia: undefined } };
        const r = rig({ ...G, textures }, { state: 'standing' });
        assert.equal(under(r.w), false);
        // no reach (hand not on the back this frame): not under
        const n = rig(G, { state: 'down', hold: true, reach: 0 });
        assert.equal(under(n.w), false);
    });
});

// Skeleton.setDepth on a stand-in that records each part's depth.
function depths(handUnder, extra = {}) {
    const names = ['farForearm', 'farHand', 'farUpArm', 'pelvisUnderlay', 'farThigh', 'farShin', 'farBoot', 'head', 'torso', 'trunks', 'pelvisOverlay',
        'nearThigh', 'nearShin', 'nearBoot', 'pelvisMask', 'nearHand', 'nearForearm', 'nearUpArm'];
    const self = { ...extra };
    for (const n of names) self[n] = { depth: null, setDepth(d) { this.depth = d; } };
    if (handUnder !== undefined) Skeleton.prototype.setHandUnder.call(self, handUnder);
    Skeleton.prototype.setDepth.call(self, 10);
    return Object.fromEntries(names.map(n => [n, self[n].depth]));
}

test('Skeleton.setDepth: handUnder puts the near forearm and hand behind the torso and leaves every other part where it was', () => {
    const normal = depths(undefined), off = depths(false), under = depths(true);
    assert.deepEqual(off, normal, 'handUnder false is the existing order, exactly');
    assert.ok(normal.nearForearm > normal.torso, 'normally the near forearm is in front of the torso');
    assert.ok(under.nearForearm < under.torso, 'handUnder: behind the torso');
    assert.ok(under.nearHand < under.torso && under.nearHand < under.nearForearm);
    assert.ok(under.nearForearm > under.head, 'still in front of the head and the far leg');
    assert.equal(under.nearUpArm, normal.nearUpArm, 'the near upper arm stays in front');
    for (const k of Object.keys(normal)) if (k !== 'nearForearm' && k !== 'nearHand') assert.equal(under[k], normal[k], k);
    // wins over the forearm-over-upper-arm opt-in, and a rig without a hand part is fine
    const optIn = depths(true, { _forearmOverUpperArm: true });
    assert.ok(optIn.nearForearm < optIn.torso);
    // restored exactly when the flag clears
    const self = depths(undefined);
    assert.deepEqual(depths(false, { _forearmOverUpperArm: true }), depths(undefined, { _forearmOverUpperArm: true }));
    assert.deepEqual(self, normal);
});

// Rev 3 D11: a rig whose forearm draws over the upper arm keeps that depth while its hand is behind the body, and a torso-alpha
// mask hides the forearm where the torso is painted. A part that can't take filters falls back to the Rev 2 depth order.
function maskable(extra = {}) {
    const masks = [];
    const names = ['farForearm', 'farHand', 'farUpArm', 'pelvisUnderlay', 'farThigh', 'farShin', 'farBoot', 'head', 'torso', 'trunks', 'pelvisOverlay',
        'nearThigh', 'nearShin', 'nearBoot', 'pelvisMask', 'nearHand', 'nearForearm', 'nearUpArm'];
    const self = { ...extra };
    for (const n of names) self[n] = { depth: null, setDepth(d) { this.depth = d; } };
    for (const n of ['nearForearm', 'nearHand']) {
        const part = self[n];
        part.enableFilters = () => { part.filters = { internal: { camera: { tag: `${n}-filter-camera` },
            addMask: (mask, invert, camera) => { const m = { mask, invert, camera, active: true, setActive(v) { this.active = v; } }; masks.push(m); return m; } } }; };
    }
    return { self, masks };
}

test('D11: with forearmOverUpperArm the forearm keeps its depth over the upper arm and an inverted torso mask is switched on; off restores it', () => {
    const { self, masks } = maskable({ _forearmOverUpperArm: true });
    Skeleton.prototype.setHandUnder.call(self, true); Skeleton.prototype.setDepth.call(self, 10);
    assert.ok(self.nearForearm.depth > self.nearUpArm.depth, 'forearm still over the upper arm: no bezel at the elbow');
    assert.ok(self.nearForearm.depth > self.torso.depth, 'not moved behind the torso by depth');
    assert.equal(masks.length, 2, 'one mask for the forearm, one for a separate hand');
    for (const m of masks) { assert.equal(m.mask, self.torso); assert.equal(m.invert, true); assert.equal(m.active, true); assert.match(m.camera.tag, /filter-camera/, 'viewed through the filter\'s own camera'); }
    // while it stays on, no new mask is made
    Skeleton.prototype.setDepth.call(self, 10); assert.equal(masks.length, 2);
    // off: the masks go inactive (free), the depth is the normal one
    Skeleton.prototype.setHandUnder.call(self, false); Skeleton.prototype.setDepth.call(self, 10);
    assert.ok(masks.every(m => m.active === false));
    assert.equal(self.nearForearm.depth, 10 + 0.00402);
    // on again: the same masks are reused
    Skeleton.prototype.setHandUnder.call(self, true); Skeleton.prototype.setDepth.call(self, 10);
    assert.equal(masks.length, 2); assert.ok(masks.every(m => m.active === true));
});

test('D11: a rig without forearmOverUpperArm, or a part that can\'t take filters, goes behind the torso by depth as in Rev 2 and makes no mask', () => {
    const plain = maskable({ _forearmOverUpperArm: false });
    Skeleton.prototype.setHandUnder.call(plain.self, true); Skeleton.prototype.setDepth.call(plain.self, 10);
    assert.ok(plain.self.nearForearm.depth < plain.self.torso.depth); assert.equal(plain.masks.length, 0);
    const noFilters = maskable({ _forearmOverUpperArm: true });
    delete noFilters.self.nearForearm.enableFilters;
    Skeleton.prototype.setHandUnder.call(noFilters.self, true); Skeleton.prototype.setDepth.call(noFilters.self, 10);
    assert.ok(noFilters.self.nearForearm.depth < noFilters.self.torso.depth, 'falls back to depth');
    // and going back out of the fallback restores the normal depth
    Skeleton.prototype.setHandUnder.call(noFilters.self, false); Skeleton.prototype.setDepth.call(noFilters.self, 10);
    assert.ok(noFilters.self.nearForearm.depth > noFilters.self.torso.depth);
});

// Rev 3 D10 (T8.2): the want decides IF, the clearance test decides WHEN.
test('D10: a wanted swap waits for the hand to clear the torso art, never happens on the want alone', () => withFlag(BOTH, () => {
    for (const [name, make] of Object.entries(PHASES)) {
        const { w, flags, hand } = make(); w._testReach = PHASE_WANT[name]; hand.clear = false;
        for (let i = 0; i < 5; i++) { draw(w); assert.equal(flags.at(-1), false, `${name}: wanted, hand over the art: not under`); }
        assert.equal(w._handPending, true, `${name}: pending while it waits`);
        hand.clear = true; draw(w);
        assert.equal(flags.at(-1), true, `${name}: swaps on the first clear frame`);
        assert.equal(w._handPending, false);
        assert.equal(w._handSkips ?? 0, 0);
    }
}));

test('D10: leaving waits for clearance too, and a change dropped before it ever cleared is counted as a skip', () => withFlag(BOTH, () => {
    const { w, flags, hand } = rig(G, { state: 'down', hold: true });
    draw(w); assert.equal(flags.at(-1), true);                        // under (clear)
    hand.clear = false; w._testReach = 0.05;                           // the hand is on its way back out past the via point
    for (let i = 0; i < 4; i++) { draw(w); assert.equal(flags.at(-1), true, 'no longer wanted but the hand is still over the art: stays under'); }
    hand.clear = true; draw(w);
    assert.equal(flags.at(-1), false, 'out on the first clear frame');
    // wanted again before the hand ever cleared: nothing swapped, one skip
    hand.clear = false; w._testReach = 0.7;
    draw(w); assert.equal(flags.at(-1), false); assert.equal(w._handPending, true);
    w._testReach = 0.05;
    draw(w); assert.equal(flags.at(-1), false); assert.equal(w._handSkips, 1);
}));

test('D10: out of context resets at once even when the hand is not clear; an unmeasurable hand never swaps in', () => withFlag(BOTH, () => {
    const { w, flags, hand } = rig(G, { state: 'down', hold: true });
    draw(w); assert.equal(flags.at(-1), true);
    hand.clear = false; w.state = 'pinned'; draw(w);
    assert.equal(flags.at(-1), false, 'pinned: normal order immediately');
    const r = rig(G, { state: 'standing', clear: null });
    for (let i = 0; i < 3; i++) { draw(r.w); assert.equal(r.flags.at(-1), false); }
    assert.equal(r.w._handPending, true);
    // a skeleton with no measurement at all
    const bare = rig(G, { state: 'standing' }); delete bare.w.skeleton.handClearance; draw(bare.w);
    assert.equal(bare.flags.at(-1), false);
}));
