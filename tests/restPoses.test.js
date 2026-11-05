// PLAN_FALLS T1.1: the rest poses (Skeleton.REST_POSES) and lyingBase. The missile poses (GROUNDED_*) stay as they are; the flag picks which one a lying man draws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { limitKnees } from '../src/animation/sells.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';

const CHANNELS = ['hip', 'torso', 'farThigh', 'farShin', 'nearThigh', 'nearShin', 'farArm', 'farFore', 'nearArm', 'nearFore'];

test('lyingBase with the flag off returns the missile pose objects themselves (identity)', () => {
    assert.equal(Skeleton.lyingBase('supine', false), Skeleton.GROUNDED_SUPINE);
    assert.equal(Skeleton.lyingBase('prone', false), Skeleton.GROUNDED_FLAT);
    assert.equal(Skeleton.lyingBase('flat', false), Skeleton.GROUNDED_FLAT);
    assert.equal(Skeleton.lyingBase('supine', undefined), Skeleton.GROUNDED_SUPINE);
});

test('lyingBase with the flag on returns the rest poses, prone for prone and flat', () => {
    assert.equal(Skeleton.lyingBase('supine', true), Skeleton.REST_POSES.supine);
    assert.equal(Skeleton.lyingBase('prone', true), Skeleton.REST_POSES.prone);
    assert.equal(Skeleton.lyingBase('flat', true), Skeleton.REST_POSES.prone);
});

test('the rest poses carry the missile\'s channels, t 0, and are frozen', () => {
    for (const [name, rest] of Object.entries(Skeleton.REST_POSES)) {
        const missile = name === 'supine' ? Skeleton.GROUNDED_SUPINE : Skeleton.GROUNDED_FLAT;
        assert.deepEqual(Object.keys(rest).sort(), Object.keys(missile).sort(), name);
        assert.equal(rest.t, 0);
        assert.ok(Object.isFrozen(rest));
        for (const c of CHANNELS) assert.ok(Number.isFinite(rest[c]), `${name}.${c}`);
    }
});

test('torso angle and hip height are the missile\'s: the neck, shoulders and hips (and so a pin\'s cover) do not move', () => {
    assert.equal(Skeleton.REST_POSES.supine.hip, Skeleton.GROUNDED_SUPINE.hip); assert.equal(Skeleton.REST_POSES.supine.torso, Skeleton.GROUNDED_SUPINE.torso);
    assert.equal(Skeleton.REST_POSES.prone.hip, Skeleton.GROUNDED_FLAT.hip); assert.equal(Skeleton.REST_POSES.prone.torso, Skeleton.GROUNDED_FLAT.torso);
});

test('rest pose legs sit inside the knee limits (limitKnees changes nothing) and no knee is past straight', () => {
    for (const [name, rest] of Object.entries(Skeleton.REST_POSES)) {
        const clamped = limitKnees({ ...rest });
        for (const c of CHANNELS) assert.equal(clamped[c], rest[c], `${name}.${c} limitKnees`);
        for (const side of ['near', 'far']) {
            const flex = rest[`${side}Thigh`] - rest[`${side}Shin`];
            assert.ok(flex <= JOINT_LIMITS.knee.max, `${name} ${side} flex ${flex}`);
        }
    }
});

test('rest pose elbows are bent inside the joint limits and the missile test passes: no arm within 15 degrees of the torso line', () => {
    for (const [name, rest] of Object.entries(Skeleton.REST_POSES)) {
        for (const side of ['near', 'far']) {
            const d = rest[`${side}Fore`] - rest[`${side}Arm`], flex = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));   // the angles wrap
            assert.ok(flex <= JOINT_LIMITS.elbow.max, `${name} ${side} elbow ${flex}`);
        }
    }
    // the upper arm's angle off the torso's own line (the line, not the direction): channels are angles from straight down, so the line difference is mod pi
    const off = (arm, torso) => { let d = Math.abs(arm - torso) % Math.PI; if (d > Math.PI / 2) d = Math.PI - d; return d * 180 / Math.PI; };
    for (const [name, rest] of Object.entries(Skeleton.REST_POSES)) {
        for (const side of ['near', 'far']) assert.ok(off(rest[`${side}Arm`], rest.torso) >= 15, `${name} ${side} upper arm ${off(rest[`${side}Arm`], rest.torso).toFixed(1)} deg`);
    }
    // the missile fails it, which is the point
    assert.ok(off(Skeleton.GROUNDED_SUPINE.nearArm, Skeleton.GROUNDED_SUPINE.torso) < 15);
});
