// Shared by g12_play.mjs and g12_page.mjs (PLAN_LIGHT_MOVES Stage 12): the ten mat and lockup moves, the situation each one is played in, the input a player holds and the default kit.
export { RIGS } from './strike_lib.mjs';
// id, executor, situation, title, the input, the default kits
export const MOVES = [
    ['wristlock',        '_doWristlock',        'tie',      'T12.1 Wristlock into arm wringer', 'Tie-up, Back + Action',                        'Lou, Guido'],
    ['headlockTakeover', '_doHeadlockTakeover', 'headlock', 'T12.2 Headlock takeover',          'In the headlock, Power',                       'Lou, George'],
    ['flyingMare',       '_doFlyingMare',       'tie',      'T12.3 Flying mare',                'Tie-up, Down + Power (Back + Power is the snapmare)', 'Guido, Lou'],
    ['testOfStrength',   '_doTestOfStrength',   'tie',      'T12.4 Test of strength',           'Tie-up, Up + Power (Up + Action is the suplex)', 'Kowalski, Lou'],
    ['leapfrog',         '_doLeapfrog',         'runner',   'T12.5 Leapfrog over a runner',     'Up + Power as a runner comes back off the ropes', 'Guido, George'],
    ['backwardRoll',     '_doBackwardRoll',     'roll',     'T12.6 Backward roll',              'On his back at the rise, hold Back (away from the man)', 'George, Guido'],
    ['abdominalStretch', '_doAbdominalStretch', 'stagger',  'T12.7 Abdominal stretch',          'Back + Action vs a staggered man',             'Kowalski, George'],
    ['bodyScissors',     '_doBodyScissors',     'supine',   'T12.8 Body scissors',              'Up + Action next to a man on his back',        'Lou, Kowalski'],
    ['indianDeathlock',  '_doIndianDeathlock',  'supine',   'T12.9 Indian deathlock',           'Back + Finisher on a man on his back',         'George, Kowalski'],
    ['backdropSuplex',   '_doBackdropSuplex',   'behind',   'T12.10 Backdrop suplex',           'Power in the waistlock hold (waistlock=v1) on a worn man (wear >= 60)',    'Lou, Kowalski'],
];

// in-page: put both men in the move's situation (w1 is the attacker). Closes over nothing; Playwright serialises it.
export const SETUP = ({ facing, kind }) => {
    const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
    sc._p1AI = sc._p2AI = null;
    const idle = { justDown: () => false, isDown: () => false };
    for (const w of [A, D]) { w.scene.tweens.killTweensOf(w); w._activeMove = null; w.state = 'standing'; w.y = 330; w.vx = w.vy = 0; w.stamina = 100; w.wear = 0; w.lying = null; w.input = idle; w._fixedHold = false; }
    A.x = 520; A.facing = facing; D.facing = -facing;
    const s = A.s;
    if (kind === 'tie') D.x = 520 + facing * 100 * s;
    if (kind === 'headlock') { D.x = 520 + facing * 68 * s; D.facing = facing; }
    if (kind === 'runner') { D.state = 'running'; D.runPhase = 'returning'; D.runFacing = -facing; D.facing = -facing; D.runTarget = A.x - facing * 200; D.x = A.x + facing * 300; }
    if (kind === 'roll') { A.state = 'down'; A.lying = 'supine'; A.stateTimer = 99; D.x = 520 + facing * 170; }
    if (kind === 'stagger') { D.x = 520 + facing * 80 * s; D.startStagger(); }
    if (kind === 'supine') { D.x = 520 + facing * 90; D.state = 'down'; D.lying = 'supine'; D.stateTimer = 99; }
    if (kind === 'behind') { A.y = 330 - 12 * s; D.x = 520 + facing * 70 * s; D.facing = facing; D.wear = 70; D.stamina = 60; }   // as the waistlock hold leaves them: both facing one way, he 12 upstage
};

// Existing moves in the same situations, for scale: what the shipped throws and holds show on the same measures (BASE=1 in g12_play.mjs).
export const BASE_MOVES = [
    ['hipToss', '_doHipToss', 'tie'], ['suplex', '_doSuplex', 'tie'], ['snapmareTieUp', '_doSnapmareFromTieUp', 'tie'], ['headlock', '_doHeadlock', 'tie'],
    ['halfBostonCrab', '_doHalfBostonCrab', 'supine'], ['ankleLock', '_doAnkleLock', 'supine'], ['armBar', '_doArmBar', 'supine'], ['piledriver', '_doPiledriver', 'tie'],
];
