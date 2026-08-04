// Seekable jab preview / test seam — inspect the migrated jab clip at any
// authored phase WITHOUT live gameplay, both facings, headless (no Phaser).
//
//   node tools/debug/jab_preview.mjs
//
// Prints the sampled attacker stance and the resolved striking-forearm slot at
// wind-up / extension / impact / recovery / rest, in both facings, and proves
// the single impact marker fires exactly once when stepped at 30/60/120 Hz and
// never fires while merely seeking. This is the same seam tests/jabClip.test.js
// exercises programmatically; run it by hand to eyeball a phase.

import { compileClip, sampleClip } from '../../src/animation/AnimationClip.js';
import MoveRuntime from '../../src/animation/MoveRuntime.js';
import { jabClip, JAB_PHASES, JAB_IMPACT_AT, JAB_DURATION } from '../../src/animation/clips/jab.js';

const clip = compileClip(jabClip);
const f2 = n => (n >= 0 ? ' ' : '') + n.toFixed(2);

// Same near/far mapping Wrestler._resolveVariantSlots uses: the jab drives
// lArm, rendered as the near arm facing right and the far arm facing left.
const strikingForearm = (facing, name) => (facing >= 0 ? 'near' : 'far') + 'Forearm=' + name;

for (const facing of [1, -1]) {
    console.log(`\n── facing ${facing >= 0 ? 'right (+1)' : 'left (-1)'} ─────────────────────────────`);
    for (const [phase, at] of Object.entries(JAB_PHASES)) {
        const s = sampleClip(clip, at).tracks.attacker;
        const fore = strikingForearm(facing, s.parts.strikingForearm ?? 'base');
        const p = s.pose;
        console.log(
            `  ${phase.padEnd(10)} t=${at.toFixed(3)}  ` +
            `lArm=${f2(p.lArm)} rArm=${f2(p.rArm)} lean=${f2(p.lean)} crouch=${f2(p.crouch)}  ${fore}`,
        );
    }
}

// Deterministic single-fire across sampling rates.
console.log('\n── impact marker (must fire exactly once) ─────────────────────');
for (const hz of [30, 60, 120]) {
    let impacts = 0;
    const runtime = new MoveRuntime({ onEvent: e => { if (e.type === 'impact') impacts++; } });
    runtime.register(jabClip);
    runtime.play('jab', { attacker: { pose: {}, skeleton: { setPartVariants() {} } } });
    const dt = 1 / hz;
    for (let t = 0; t < JAB_DURATION + dt; t += dt) runtime.update(dt);
    console.log(`  ${String(hz).padStart(3)} Hz -> impact fired ${impacts} time(s)  ${impacts === 1 ? 'OK' : 'FAIL'}`);
}

// Seeking is inspection, not gameplay: it must never emit the impact.
let seekImpacts = 0;
const seekRuntime = new MoveRuntime({ onEvent: e => { if (e.type === 'impact') seekImpacts++; } });
seekRuntime.register(jabClip);
const handle = seekRuntime.play('jab', { attacker: { pose: {}, skeleton: { setPartVariants() {} } } });
seekRuntime.seek(handle, JAB_IMPACT_AT + 0.05);
seekRuntime.seek(handle, JAB_DURATION);
console.log(`\n  seek past impact -> fired ${seekImpacts} time(s)  ${seekImpacts === 0 ? 'OK' : 'FAIL'}`);
