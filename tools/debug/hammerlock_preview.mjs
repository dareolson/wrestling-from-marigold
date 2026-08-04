// Seekable hammerlock preview / gate — inspect the first PAIRED clip at any
// authored phase and exercise its interruption matrix WITHOUT live gameplay,
// headless (no Phaser). Complements the two live natural-release scenarios in
// play.mjs (Lou->George, George->Lou), which a browser can't easily interrupt
// mid-hold.
//
//   node tools/debug/hammerlock_preview.mjs
//
// Prints the synchronized attacker + defender stance at entry / contact / set /
// crank / release; proves the three markers fire exactly once and in order at
// 30/60/120 Hz and never while seeking; and drives the REAL _doHammerlock
// executor (on Wrestler.prototype, no Scene) through natural release plus
// cancellation during entry and during the crank, printing the teardown so the
// "no stranded drain/handle/fixed-hold" guarantees are eyeball-checkable.

import { compileClip, sampleClip } from '../../src/animation/AnimationClip.js';
import MoveRuntime from '../../src/animation/MoveRuntime.js';
import {
    hammerlockClip,
    HAMMERLOCK_DURATION,
    HAMMERLOCK_CONTACT_AT,
    HAMMERLOCK_DRAIN_AT,
    HAMMERLOCK_PHASES,
} from '../../src/animation/clips/hammerlock.js';
import Wrestler from '../../src/Wrestler.js';

const clip = compileClip(hammerlockClip);
const f2 = n => (n >= 0 ? ' ' : '') + n.toFixed(2);
const arms = p => `lArm=${f2(p.lArm)} rArm=${f2(p.rArm)} lean=${f2(p.lean)} crouch=${f2(p.crouch)}`;

console.log('── paired tracks per phase (attacker cranks / defender is folded) ──');
for (const [phase, at] of Object.entries(HAMMERLOCK_PHASES)) {
    const s = sampleClip(clip, at).tracks;
    console.log(`  ${phase.padEnd(8)} t=${at.toFixed(3)}`);
    console.log(`     attacker  ${arms(s.attacker.pose)}`);
    console.log(`     defender  ${arms(s.defender.pose)}`);
}

console.log('\n── markers (must be once + in order: acquire-contact, apply-drain, release-contact) ──');
for (const hz of [30, 60, 120]) {
    const seen = [];
    const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
    runtime.register(hammerlockClip);
    const bind = { pose: {}, skeleton: { setPartVariants() {} } };
    runtime.play('hammerlock', { attacker: { ...bind, pose: {} }, defender: { ...bind, pose: {} } });
    const dt = 1 / hz;
    for (let t = 0; t < HAMMERLOCK_DURATION + dt; t += dt) runtime.update(dt);
    const ok = seen.join(',') === 'acquire-contact,apply-drain,release-contact';
    console.log(`  ${String(hz).padStart(3)} Hz -> [${seen.join(', ')}]  ${ok ? 'OK' : 'FAIL'}`);
}

{
    let events = 0;
    const runtime = new MoveRuntime({ onEvent: () => events++ });
    runtime.register(hammerlockClip);
    const handle = runtime.play('hammerlock', {
        attacker: { pose: {}, skeleton: { setPartVariants() {} } },
        defender: { pose: {}, skeleton: { setPartVariants() {} } },
    });
    for (const at of Object.values(HAMMERLOCK_PHASES)) runtime.seek(handle, at);
    runtime.seek(handle, HAMMERLOCK_DURATION);
    console.log(`  seek through every phase -> fired ${events} time(s)  ${events === 0 ? 'OK' : 'FAIL'}`);
}

// ── interruption matrix on the REAL executor ───────────────────────────────────
function makeScene() {
    const runtime = new MoveRuntime();
    runtime.register(hammerlockClip);
    const scene = {
        moveRuntime: runtime, timerCalls: 0,
        tweens: { add: () => {}, killTweensOf: () => {} },
        time: { delayedCall: () => { scene.timerCalls++; } },
    };
    return scene;
}
function makeWrestler(scene, idlePose) {
    return Object.assign(Object.create(Wrestler.prototype), {
        scene, state: 'lockup', facing: 1, x: 480, y: 360, stamina: 100,
        pose: {}, idlePose, skeleton: { setPartVariants() {} },
        _activeMove: null, _fixedHold: false,
    });
}
function report(label, atk, def, scene) {
    const legal = ['standing', 'staggered'].includes(atk.state) && ['standing', 'staggered'].includes(def.state);
    const clean = atk._activeMove === null && def._activeMove === null && !atk._fixedHold && !def._fixedHold;
    const ok = legal && clean && scene.timerCalls === 0;
    console.log(`  ${label.padEnd(22)} atk[${atk.state} stam=${atk.stamina}] def[${def.state} stam=${def.stamina}] ` +
        `handles=${clean ? 'clear' : 'STRANDED'} timers=${scene.timerCalls}  ${ok ? 'OK' : 'FAIL'}`);
}
function run(kind) {
    const scene = makeScene();
    const atk = makeWrestler(scene, 'theszIdle');
    const def = makeWrestler(scene, 'powerIdle');
    const rt = scene.moveRuntime;
    const step = (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) rt.update(Math.min(dt, secs - t)); };
    atk._doHammerlock(def);
    if (kind === 'natural')          step(HAMMERLOCK_DURATION + 0.05);
    else if (kind === 'entry')     { step(HAMMERLOCK_CONTACT_AT - 0.03); rt.cancel(atk._activeMove); step(HAMMERLOCK_DURATION); }
    else if (kind === 'crank')     { step(HAMMERLOCK_DRAIN_AT + 0.1);  rt.cancel(atk._activeMove); step(HAMMERLOCK_DURATION); }
    else if (kind === 'defender')  { step(0.6); def.tweenPose('sellChest', 120, 'Linear'); step(HAMMERLOCK_DURATION); }
    else if (kind === 'shutdown')  { step(0.6); rt.shutdown(); }
    report(kind, atk, def, scene);
}
console.log('\n── real _doHammerlock teardown (release drain only on natural finish) ──');
for (const kind of ['natural', 'entry', 'crank', 'defender', 'shutdown']) run(kind);
