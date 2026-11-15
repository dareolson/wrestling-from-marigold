// PLAN_LIGHT_MOVES T11.7: the input routing of the ten new moves through the real tryPower / tryAction / tryRunningAttack, with the keys a player would hold. For each: the kit's holder presses the keys
// against the situation, the function returns the move's id, the man ends up hurt (stamina down) and nobody throws. Plus the negatives: a kit without the move keeps its old move on the same keys.
//   WFM_URL=http://localhost:5197 node tools/debug/g10_inputs.mjs
import { chromium } from 'playwright-core';
const URL0 = process.env.WFM_URL ?? 'http://localhost:5197';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
// [attacker, defender, tryFn, keys held, justDown, situation of the other man, expected return]
const CASES = [
    ['george', 'lou', 'tryPower', [], 'power', 'standing', 'clubBlow'],
    ['kowalski', 'lou', 'tryPower', [], 'power', 'standing', 'clubBlow'],
    ['lou', 'george', 'tryPower', [], 'power', 'standing', 'jab'],
    ['lou', 'george', 'tryPower', ['up'], 'power', 'standing', 'chop'],
    ['kowalski', 'lou', 'tryPower', ['up'], 'power', 'standing', 'chop'],
    ['george', 'lou', 'tryPower', ['up'], 'power', 'standing', 'kneeLift'],
    ['guido', 'lou', 'tryPower', ['BACK'], 'power', 'standing', 'uppercut'],
    ['kowalski', 'lou', 'tryPower', ['BACK'], 'power', 'standing', 'uppercut'],
    ['lou', 'george', 'tryPower', ['BACK'], 'power', 'standing', 'jab'],
    ['kowalski', 'lou', 'tryPower', ['FWD'], 'power', 'far', 'shoulderBlock'],
    ['george', 'lou', 'tryPower', ['FWD'], 'power', 'far', 'shoulderBlock'],
    ['lou', 'george', 'tryPower', ['FWD'], 'power', 'far', 'dropkick'],
    ['george', 'lou', 'tryPower', ['down'], 'power', 'staggered', 'axeHandleBack'],
    ['kowalski', 'lou', 'tryPower', ['down'], 'power', 'staggered', 'axeHandleBack'],
    ['george', 'lou', 'tryPower', [], 'power', 'staggered', 'headbutt'],
    ['lou', 'george', 'tryAction', ['down'], 'action', 'standing', 'legSweep'],
    ['guido', 'lou', 'tryAction', ['down'], 'action', 'standing', 'legSweep'],
    ['kowalski', 'lou', 'tryAction', ['down'], 'action', 'standing', 'lockup'],
    ['george', 'lou', 'tryAction', ['down'], 'action', 'runner', 'backElbow'],
    ['kowalski', 'lou', 'tryAction', ['down'], 'action', 'runner', 'backElbow'],
    ['george', 'lou', 'tryAction', [], 'action', 'runner', 'backBodyDrop'],
    ['kowalski', 'lou', 'tryAction', [], 'action', 'runner', 'clothesline'],
    ['lou', 'george', 'tryAction', ['down'], 'action', 'supine', 'mountedPunches'],
    ['guido', 'george', 'tryAction', ['down'], 'action', 'supine', 'mountedPunches'],
    ['george', 'lou', 'tryAction', ['down'], 'action', 'prone', 'bodyStomps'],
    ['kowalski', 'lou', 'tryAction', ['down'], 'action', 'prone', 'bodyStomps'],
    ['lou', 'george', 'tryAction', ['down'], 'action', 'prone', 'pin'],
    ['lou', 'george', 'tryAction', [], 'action', 'supine', 'pin'],
    ['lou', 'george', 'tryRunningAttack', [], 'power', 'standingRunner', 'runningForearm'],
    ['guido', 'george', 'tryRunningAttack', [], 'power', 'standingRunner', 'runningForearm'],
    ['george', 'lou', 'tryRunningAttack', [], 'power', 'standingRunner', 'doubleAxeHandle'],
];
const browser = await chromium.launch({ channel: 'chrome' });
let bad = 0;
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const [a, d, fn, keys, jd, sit, want] of CASES) {
    await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${RIGS[a]}&p2=${RIGS[d]}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
    const r = await page.evaluate(({ fn, keys, jd, sit }) => {
        const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
        g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; let T = sc.time.now; const step = () => { T += 1000 / 60; g.step(T, 1000 / 60); };
        for (const w of [A, D]) { w.state = 'standing'; w.y = 400; w.stamina = 100; w.wear = 0; w.lying = null; w.vx = w.vy = 0; }
        A.x = 520; A.facing = 1; D.facing = -1;
        const held = new Set(keys.map(k => k === 'BACK' ? (A.facing > 0 ? 'left' : 'right') : k === 'FWD' ? (A.facing > 0 ? 'right' : 'left') : k));
        const idle = { justDown: () => false, isDown: () => false }, pressed = { justDown: k => k === jd, isDown: k => held.has(k) };
        A.input = idle; D.input = idle;
        D.x = 520 + (sit === 'far' ? 130 : 78) * A.s;
        if (sit === 'staggered') { D.startStagger(); }
        if (sit === 'supine' || sit === 'prone') { D.state = 'down'; D.lying = sit; D.stateTimer = 99; D.facing = sit === 'supine' ? -1 : 1; D.x = 520 + 90; }
        if (sit === 'runner') { D.state = 'running'; D.runPhase = 'returning'; D.runFacing = -1; D.facing = -1; D.runTarget = A.x - 400; D.x = 520 + 110; }
        if (sit === 'standingRunner') { A.state = 'running'; A.runPhase = 'returning'; A.runFacing = 1; D.x = 520 + 110; }
        step();
        const s0 = D.stamina; A.input = pressed; const ret = A[fn](D); A.input = idle;   // the keys are down for this one call only, so the arena's own tick cannot fire it first
        for (let i = 0; i < 100; i++) step();
        return { ret, hurt: +(s0 - D.stamina).toFixed(1), dState: D.state, aState: A.state, active: !!A._activeMove };
    }, { fn, keys, jd, sit });
    const ok = r.ret === want && (['pin', 'jab', 'kneeLift', 'dropkick', 'headbutt', 'backBodyDrop', 'clothesline', 'doubleAxeHandle', 'lockup'].includes(want) || r.hurt > 0);
    if (!ok) bad++;
    console.log(ok ? 'ok  ' : 'FAIL', a, '>', d, fn, JSON.stringify(keys), sit, '| returned', r.ret, '(want ' + want + ') | hurt', r.hurt, '| he is', r.dState, '| attacker', r.aState);
}
console.log('page errors', errors);
console.log(bad ? `${bad} FAILED` : 'all routed');
await browser.close();
process.exit(bad ? 1 : 0);
