// PLAN_GRAPPLES T1.11 sensitivity: from one held pose, change ONE channel and report what moves (leg measures, same draw call the game uses).
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_legs_sens.mjs [role=attacker]
import { launch } from './harness.mjs';
import { INSTALL, SETUP } from './grapples_film.mjs';
import { INSTALL_LEGS, TRUNKS_V } from './grapples_legs.mjs';

const role = process.argv[2] ?? 'attacker';
const PROBE = async ({ role, tv, base, variants, facing }) => {
    const { lockupPoseChannels } = await import('/src/animation/lockup.js');
    const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1;
    const lSide = w.skeleton.lChannelSide(w.facing), near = lSide === 'far' ? 'r' : 'l', far = near === 'l' ? 'r' : 'l';
    const ch = lockupPoseChannels({ even: 0, attacker: 0, defender: 0, [role]: 1 }, lSide);
    const draw = (pose) => { w.skeleton.updateUpright(w.x, w.y, w.s, w.facing, pose, 0, 0, w.facing * (pose.lean ?? 0), 0, 0.5, 0); return window.__legs(w, tv); };
    const mk = (edit) => { const p = { ...window.__idle, tilt: 0, lift: 0, ...ch }; edit?.(p, { near, far }); return p; };
    const baseFn = base ? eval(base) : null;
    const ref = draw(mk(baseFn));
    const sum = (r) => ({ kneeN: r.near.kneeLine, kneeF: r.far.kneeLine, ankle: r.stagger.ankle, knee: r.stagger.knee, hipN: r.hipAngle.near, trunks: r.trunks.share, soleN: r.sole.near.y, soleF: r.sole.far.y, ankN: r.near.ankle[0], hipX: r.near.hip[0] });
    const R = sum(ref), out = { ref: R, d: {} };
    for (const [name, edit] of Object.entries(variants)) {
        const r = sum(draw(mk((p, c) => { baseFn?.(p, c); eval(edit)(p, c); })));
        out.d[name] = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +(v - R[k]).toFixed(2)]));
    }
    return out;
};
const VARIANTS = {
    'crouch +.1': '(p) => { p.crouch += .1 }', 'bend +.1': '(p) => { p.bend += .1 }', 'tilt +.1': '(p) => { p.tilt = .1 }',
    'nearLeg +.1': '(p, c) => { p[c.near + "Leg"] += .1 }', 'farLeg +.1': '(p, c) => { p[c.far + "Leg"] += .1 }',
    'nearShin abs -.3': '(p, c) => { delete p[c.near + "Knee"]; p[c.near + "Shin"] = -.3 }',
    'nearShin abs +.1 (sets key)': '(p, c) => { delete p[c.near + "Knee"]; p[c.near + "Shin"] = .1 }',
};
for (const [att, def] of [['thesz-procreate-v1', 'george-roster-v1'], ['george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL); await h.page.evaluate(INSTALL_LEGS);
        for (const facing of [1, -1]) {
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            const noKnee = (p, c) => { delete p[c.near + 'Knee']; delete p[c.far + 'Knee']; };
            for (const [label, base] of [['as is (lKnee positive)', null], ['knees removed (crouch path)', noKnee]]) {
                const o = await h.page.evaluate(PROBE, { role, tv: TRUNKS_V[att], base: base && `(${base})`, variants: VARIANTS, facing });
                console.log(`\n${att.slice(0, 5)} facing ${facing}, ${role}, ${label}: ref ${JSON.stringify(o.ref)}`);
                for (const [k, v] of Object.entries(o.d)) console.log(`  ${k.padEnd(28)} ${JSON.stringify(v)}`);
            }
        }
    } finally { await h.close(); }
}
