// PLAN_LIGHT_MOVES Stage 12 (T12.11): the input routing of the ten new moves through the real code paths, with the keys a player would hold: tryAction / tryPower / tryFinisher / tickDown,
// Arena._tickLockup (the tie-up) and Arena._tickHeadlock. For each: the kit's holder presses the keys against the situation and the move's clip is the one playing; plus the negatives (a kit
// without the move, a plain press, the old move on its old keys, and the backdrop's wear gate).
//   WFM_URL=http://localhost:5231 node tools/debug/g12_inputs.mjs
import { chromium } from 'playwright-core';
const URL0 = process.env.WFM_URL ?? 'http://localhost:5231';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
// [attacker, defender, route, keys held, just-pressed, situation, expected move (a clip id, or a return value / other clip for the negatives)]
const CASES = [
    ['lou', 'george', 'tie', ['BACK'], 'action', 'tie', 'wristlock'],
    ['guido', 'lou', 'tie', ['BACK'], 'action', 'tie', 'wristlock'],
    ['george', 'lou', 'tie', ['BACK'], 'action', 'tie', 'irishWhip'],
    ['lou', 'george', 'tie', ['FWD'], 'action', 'tie', 'irishWhip'],
    ['lou', 'george', 'headlock', [], 'power', 'headlock', 'headlockTakeover'],
    ['george', 'lou', 'headlock', [], 'power', 'headlock', 'headlockTakeover'],
    ['kowalski', 'lou', 'headlock', [], 'power', 'headlock', null],
    ['guido', 'lou', 'tie', ['down'], 'power', 'tie', 'flyingMare'],
    ['lou', 'george', 'tie', ['down'], 'power', 'tie', 'flyingMare'],
    ['george', 'lou', 'tie', ['down'], 'power', 'tie', 'armDrag'],
    ['lou', 'george', 'tie', ['BACK'], 'power', 'tie', 'snapmareTieUp'],
    ['kowalski', 'lou', 'tie', ['up'], 'power', 'tie', 'testOfStrength'],
    ['lou', 'george', 'tie', ['up'], 'power', 'tie', 'testOfStrength'],
    ['guido', 'lou', 'tie', ['up'], 'power', 'tie', 'armDrag'],
    ['guido', 'lou', 'tryPower', ['up'], 'power', 'runner', 'leapfrog'],
    ['george', 'lou', 'tryPower', ['up'], 'power', 'runner', 'leapfrog'],
    ['guido', 'lou', 'tryPower', [], 'power', 'runner', 'armDrag'],
    ['lou', 'george', 'tryPower', ['up'], 'power', 'runner', 'hipToss'],
    ['george', 'lou', 'tickDown', ['BACK'], null, 'rollDown', 'backwardRoll'],
    ['guido', 'lou', 'tickDown', ['BACK'], null, 'rollDown', 'backwardRoll'],
    ['george', 'lou', 'tickDown', [], null, 'rollDown', 'rise'],
    ['lou', 'george', 'tickDown', ['BACK'], null, 'rollDown', 'rise'],
    ['kowalski', 'lou', 'tryAction', ['BACK'], 'action', 'staggered', 'abdominalStretch'],
    ['george', 'lou', 'tryAction', ['BACK'], 'action', 'staggered', 'abdominalStretch'],
    ['guido', 'lou', 'tryAction', ['BACK'], 'action', 'staggered', 'lockup'],
    ['lou', 'george', 'tryAction', ['up'], 'action', 'supine', 'bodyScissors'],
    ['kowalski', 'lou', 'tryAction', ['up'], 'action', 'supine', 'bodyScissors'],
    ['george', 'lou', 'tryAction', ['up'], 'action', 'supine', 'pin'],
    ['lou', 'george', 'tryAction', ['down'], 'action', 'supine', 'mountedPunches'],
    ['george', 'lou', 'tryFinisher', ['BACK'], 'finisher', 'supine', 'indianDeathlock'],
    ['kowalski', 'lou', 'tryFinisher', ['BACK'], 'finisher', 'supine', 'indianDeathlock'],
    ['lou', 'george', 'tryFinisher', ['BACK'], 'finisher', 'supine', 'halfBostonCrab'],
    ['george', 'lou', 'tryFinisher', ['down'], 'finisher', 'supine', 'ankleLock'],
    ['lou', 'george', 'waistlock', [], 'power', 'waistWorn', 'backdropSuplex'],
    ['kowalski', 'lou', 'waistlock', [], 'power', 'waistWorn', 'backdropSuplex'],
    ['lou', 'george', 'waistlock', [], 'power', 'waistFresh', null],
    ['george', 'lou', 'waistlock', [], 'power', 'waistWorn', null],
];
const browser = await chromium.launch({ channel: 'chrome' });
let bad = 0;
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
for (const [a, d, route, keys, jd, sit, want] of CASES) {
    await page.goto(`${URL0}/?arena=1&notitle=1&light=v1${route === 'waistlock' ? '&waistlock=v1' : ''}&p1=${RIGS[a]}&p2=${RIGS[d]}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
    const r = await page.evaluate(({ route, keys, jd, sit }) => {
        const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
        g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; let T = sc.time.now; const step = () => { T += 1000 / 60; g.step(T, 1000 / 60); };
        const idle = { justDown: () => false, isDown: () => false };
        for (const w of [A, D]) { w.state = 'standing'; w.y = 400; w.stamina = 100; w.wear = 0; w.lying = null; w.vx = w.vy = 0; w._activeMove = null; }
        A.x = 520; A.facing = 1; D.facing = -1; A.input = idle; D.input = idle;
        const held = new Set(keys.map(k => k === 'BACK' ? 'left' : k === 'FWD' ? 'right' : k));
        const pressed = { justDown: k => k === jd, isDown: k => held.has(k) };
        D.x = 520 + 100 * A.s;
        if (sit === 'tie') { A.state = D.state = 'lockup'; sc.lockupState = { attacker: A, defender: D, timer: 0 }; }
        if (sit === 'headlock') { D.x = 520 + 68 * A.s; D.facing = 1; A.state = 'holding'; D.state = 'headlocked'; sc.headlockState = { attacker: A, defender: D, timer: 1 }; }
        if (sit === 'runner') { D.state = 'running'; D.runPhase = 'returning'; D.runFacing = -1; D.facing = -1; D.runTarget = A.x - 200; D.x = 520 + 110; }
        if (sit === 'staggered') { D.x = 520 + 78; D.startStagger(); }
        if (sit === 'supine') { D.x = 520 + 90; D.state = 'down'; D.lying = 'supine'; D.stateTimer = 99; }
        if (sit === 'rollDown') { A.x = 640; D.x = 640 + 170; A.state = 'down'; A.lying = 'supine'; A.stateTimer = 0.5; }
        if (sit === 'waistWorn' || sit === 'waistFresh') {
            A.x = 520; D.x = 520 + 70; D.wear = sit === 'waistWorn' ? 70 : 0; D.stamina = sit === 'waistWorn' ? 60 : 100;
            A.state = D.state = 'lockup'; sc._startWaistlock(A, D, -1, 0, 0);
            for (let i = 0; i < 70; i++) step();   // through the circle, into the hold
        }
        step();
        // step() ran a frame of the arena: put the situation back where a frame may have moved it
        const clipOf = () => A._activeMove?.clip?.id ?? null;
        let ret = null;
        A.input = pressed;
        if (route === 'tie') { sc._tickLockup(1 / 60); }
        else if (route === 'headlock') { sc._tickHeadlock(1 / 60); }
        else if (route === 'waistlock') { if (sc.waistlockState) sc._waistlockEndings(sc.waistlockState); }
        else if (route === 'tickDown') { A._lastOther = D; A.tickDown(0.6); }
        else ret = A[route](D);
        A.input = idle;
        const clip = clipOf(), logged = sc.matchEvents?.filter(e => e.type === 'move').map(e => e.move).at(-1) ?? null;
        for (let i = 0; i < 5; i++) step();
        return { ret, clip, logged, aState: A.state, dState: D.state, aActive: !!A._activeMove };
    }, { route, keys, jd, sit });
    // what the case reports: the clip playing, else the return value, else the last logged move, else what the state shows
    const norm = x => (x == null ? null : String(x).split(':')[0].replace(/V2.*$/, '').replace(/Runner$/, '').replace(/^jab.*/, 'jab'));
    const got = norm(r.clip) ?? norm(r.ret) ?? (want === 'rise' && r.aState === 'gettingUp' ? 'rise' : null) ?? norm(r.logged);
    const ok = want === null ? !r.clip : got === want || norm(r.logged) === want;
    if (!ok) bad++;
    console.log(ok ? 'ok  ' : 'FAIL', a, '>', d, route, JSON.stringify(keys), sit, '| got', got ?? r.logged ?? r.ret, '(want ' + want + ') | clip', r.clip, '| ret', r.ret, '| he is', r.aState, '| man', r.dState);
}
console.log('page errors', errors);
console.log(bad ? `${bad} FAILED` : 'all routed');
await browser.close();
process.exit(bad ? 1 : 0);
