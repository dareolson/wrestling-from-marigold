// backSell.handUnder (PLAN_GEORGE_TRANSFER Rev 2 D6, T6.4/T6.5): while the grip latch is on, the near forearm (and hand)
// draw BEHIND the torso, in every back-sell phase (back clutch, lying hold, rise, standing recovery) and only
// there. The depth follows the latch (and so its dwell), and any state that is not a back-sell phase restores the
// normal order on its first draw. Rigs without the flag (Lou) never change their draw order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { POSES } from '../src/Wrestler.js';
import Skeleton from '../src/Skeleton.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { newGripLatch } from '../src/animation/sellAppearance.js';
import { onlyListed } from './support/promotedFlags.js';

const BOTH = '?sellart=v1&aftermath=v2';
const noop = () => {};
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
const G = georgeRosterV1, LOU = theszProcreateV1;
const SETTLED = { lLeg: 0, rLeg: 0.1, lArm: 0.1, rArm: 0.1, lean: 0, crouch: 0, lElbow: 0.7, rElbow: 0.7 };

function rig(character, { state = 'standing', latchOn = true, sell = null, hold = false, dist = 9 } = {}) {
    const flags = [];
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
            carriedRiseEndArm: () => ({ arm: 0.3, elbow: 1.1 }), setHandUnder: v => flags.push(v),
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateGroundedReach: noop, updateGrounded: noop, updateGetUp: noop, updateFall: noop, updateUpright: noop },
    });
    w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: state === 'gettingUp' ? 'rise' : 'recover', since: 1000, until: 3500, planned: true };
    return { w, flags };
}
const backClutch = (part = 'back') => ({ plan: [{ name: 'clutch', part, lying: 'supine', limb: null, rolls: 0, duration: 1, amp: 1 }], i: 0, t: 0.5, facing0: 1 });
const PHASES = {
    'back clutch': () => rig(G, { state: 'down', sell: backClutch() }),
    'lying hold': () => rig(G, { state: 'down', hold: true }),
    'rise': () => rig(G, { state: 'gettingUp' }),
    'standing recovery': () => rig(G, { state: 'standing' }),
};

test('George: the forearm goes under the torso in every back-sell phase while the latch is on', () => withFlag(BOTH, () => {
    for (const [name, make] of Object.entries(PHASES)) {
        const { w, flags } = make();
        assert.equal(w._handUnder(), true, name);
        w.draw();
        assert.equal(flags.at(-1), true, `${name}: draw hands the flag to the skeleton`);
    }
}));

test('George: latch off, or a state that is not a back-sell phase, restores the normal order on the very next draw', () => withFlag(BOTH, () => {
    const { w, flags } = rig(G, { state: 'down', hold: true });
    w.draw(); assert.equal(flags.at(-1), true);
    w._gripLatch = { ...w._gripLatch, on: false };
    assert.equal(w._handUnder(), false, 'latch off');
    // every way out of the back sell, from a state where the latch is still on
    const exits = {
        pinned: w => { w.state = 'pinned'; }, possum: w => { w.state = 'possum'; }, falling: w => { w.state = 'falling'; },
        'picked up (grabbed)': w => { w.state = 'grabbed'; }, 'a move': w => { w._activeMove = {}; },
        'another sell part': w => { w.state = 'down'; w._sell = backClutch('head'); },
    };
    for (const [name, exit] of Object.entries(exits)) {
        const r = rig(G, { state: 'down', hold: true });
        r.w.draw(); assert.equal(r.flags.at(-1), true, `${name}: before`);
        exit(r.w); r.w._gripLatch = newGripLatch(true, 0);   // the latch is still on: only the state changed
        r.w.draw();
        assert.equal(r.flags.at(-1), false, `${name}: restored on the next draw`);
    }
    // the flag follows the latch frame by frame: on, off, on
    const r = rig(G, { state: 'standing' });
    const seen = [];
    for (const on of [true, true, false, false, true]) { r.w._gripLatch = on ? newGripLatch(true, 0) : null; r.w.draw(); seen.push(r.flags.at(-1)); }
    assert.deepEqual(seen, [true, true, false, false, true]);
}));

test('flags: sellart off, no latch, or a rig without handUnder never swaps the depth (Lou in every phase)', () => {
    withFlag('?sellart=off', () => { for (const make of Object.values(PHASES)) assert.equal(make().w._handUnder(), false); });
    withFlag(BOTH, () => {
        for (const [name, make] of Object.entries(PHASES)) {
            const { w } = make(); w._gripLatch = null;
            assert.equal(w._handUnder(), false, `${name}: no latch`);
        }
        const louPhases = { down: { state: 'down', hold: true }, clutch: { state: 'down', sell: backClutch() }, rise: { state: 'gettingUp' }, standing: { state: 'standing' } };
        for (const [name, opts] of Object.entries(louPhases)) {
            const { w, flags } = rig(LOU, opts);
            assert.equal(w._gripLatch.on, true);
            assert.equal(w._handUnder(), false, `Lou ${name}: his depths are unchanged`);
            w.draw(); assert.equal(flags.at(-1), false, `Lou ${name}`);
        }
        // handUnder false on George's own data is the same as absent
        const textures = { ...G.textures, backSell: { ...G.textures.backSell, handUnder: false } };
        const r = rig({ ...G, textures }, { state: 'standing' });
        assert.equal(r.w._handUnder(), false);
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
