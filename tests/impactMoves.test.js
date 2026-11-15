import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { impactMoveId } from '../src/animation/impactMoves.js';

test('performance variants receive their move pain context without altering damage', () => {
    for (const [clip, part] of [
        ['backBodyDropV2', 'back'], ['hipTossRunner', 'back'], ['armDragRunner', 'arm'],
        ['snapmareTieUp', 'back'], ['bodySlamV2', 'back'], ['bodySlamV2George', 'back'],
        ['armBarV2', 'arm'], ['ankleLockV2', 'knee'],
    ]) {
        let damage = 0;
        const receiver = { _damage: amount => { damage += amount; } };
        Wrestler.prototype._hurt.call(receiver, 17, clip);
        assert.equal(damage, 17, clip);
        assert.equal(receiver._pain.part, part, clip);
        assert.ok(receiver._pain.severity > 0, clip);
        assert.equal(receiver._pain.source, impactMoveId(clip));
        assert.equal(receiver._pain.planned, false, 'the grounded ticker must plan an aftermath sell');
        if (clip === 'armDragRunner') assert.equal(receiver._pain.forceClutch, true, 'economical sellers also acknowledge the arm drag');
    }
});

test('base move IDs and unknown visual IDs keep their existing identity', () => {
    assert.equal(impactMoveId('clothesline'), 'clothesline');
    assert.equal(impactMoveId('customThrow'), 'customThrow');
});

test('snapmare hands off to a back rebound after its unchanged impact marker', () => {
    let opts, kind;
    const a = { _playPairedThrow: (_d, _id, options) => { opts = options; } };
    const d = { _layOnBack() {}, _startLanding: k => { kind = k; } };
    Wrestler.prototype._doSnapmare.call(a, d, 'snapmareTieUp');
    opts.landAtHit(.2);
    assert.equal(kind, 'back');
});
