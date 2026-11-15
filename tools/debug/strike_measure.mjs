// The real executor, Lou<->George (or every rig pairing with ALL=1), both facings: where the attacker's probe point is against the target point on the impact frame (PLAN_LIGHT_MOVES Stages 10-11).
// node tools/debug/strike_measure.mjs clubBlow   (WFM_URL, ALL=1, JSON=<path>)
// "miss" = distance from the attacker's probe (fist tip / forearm / hand / elbow / wrists / shoulder) to the target point (neck / chest / chin / upper back / face), px as drawn, read on the frame the hit
// fires and the one after (the joints read back a frame late), the smaller of the two. Report it as measured; whether it reads is Derek's call.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { SETUP } from './toehold_t30_lib.mjs';
import { RIGS, PROBES, POINTS } from './strike_lib.mjs';
const URL = process.env.WFM_URL ?? 'http://localhost:5197';
const move = process.argv[2] ?? 'clubBlow', spec = PROBES[move];
const pairs = [];
if (process.env.ALL) { for (const a of RIGS) for (const d of RIGS) pairs.push([a, d]); } else pairs.push([RIGS[0], RIGS[1]], [RIGS[1], RIGS[0]]);

const KINDS = { backElbow: 'runner', axeHandleBack: 'staggered', runningForearm: 'runnerAtk' };
// in-page: play the move once and read the frames around the hit
const RUN = async ({ move, probe, target, kind }) => {
    const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
    const step = () => { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
    D.state = 'standing'; D.lying = null; D.stateTimer = 0;
    step();
    const face = A.facing;
    if (kind === 'runner') { D.state = 'running'; D.runPhase = 'returning'; D.runFacing = -face; D.facing = -face; D.runTarget = A.x - face * 400; D.x = A.x + face * 110 * A.s; }   // a returning runner coming at him
    if (kind === 'runnerAtk') { A.state = 'running'; A.runPhase = 'returning'; A.runFacing = face; D.x = A.x + face * 110 * A.s; }   // the attacker is the runner, the man stands 110 away
    if (kind === 'staggered') { D.startStagger(); for (let i = 0; i < 6; i++) step(); }   // bent over, whichever stagger he is in
    let hitFrame = null, f = 0;
    const orig = D._hurt.bind(D); D._hurt = (...args) => { if (hitFrame === null) hitFrame = f; return orig(...args); };
    const x0 = A.x, rows = []; let maxStep = 0, prev = null;
    A['_do' + move[0].toUpperCase() + move.slice(1)](D);
    for (f = 1; f <= 120; f++) {
        step();
        const cur = Object.values(A.skeleton.jointAttachmentPoints).map(p => [p.x, p.y]);
        if (prev) for (let i = 0; i < cur.length; i++) maxStep = Math.max(maxStep, Math.hypot(cur[i][0] - prev[i][0], cur[i][1] - prev[i][1]) / A.s);
        prev = cur;
        rows.push({ f, miss: POINTS_FN({ probe, target }).dist });
        if (hitFrame !== null && f > hitFrame + 1) break;
    }
    D._hurt = orig;
    A._cancelActiveMove('measure'); D._cancelActiveMove('measure');   // the next run must not inherit this clip's staging
    const h = hitFrame ?? -1, at = rows.filter(r => r.f >= h - 1 && r.f <= h + 1);   // the key lands on the frame before the event fires: read the three frames around it
    return { hit: h >= 0, hitFrame: h, miss: at.length ? Math.min(...at.map(r => r.miss)) : null, maxStep, steppedX: (A.x - x0) * A.facing / A.s, dState: D.state };
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const out = [];
for (const [a, d] of pairs) {
    await page.goto(`${URL}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
    await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; window.__idle = { ...sc.w1.pose }; window.__T = sc.time.now; });
    for (const facing of [1, -1]) {
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, sep: 80 })})`);
        const src = `(${RUN.toString().replace('POINTS_FN', '(' + POINTS.toString() + ')')})(${JSON.stringify({ move, probe: spec.probe, target: spec.target, kind: KINDS[move] ?? null })})`;
        const r = await page.evaluate(src);
        const row = { attacker: a.split('-')[0], defender: d.split('-')[0], facing: facing > 0 ? 'R' : 'L', hit: r.hit, hitFrame: r.hitFrame, miss: r.miss == null ? null : +r.miss.toFixed(1), maxStep: +r.maxStep.toFixed(1), steppedX: +r.steppedX.toFixed(1), dState: r.dState };
        out.push(row);
        console.log(move, row.attacker, '>', row.defender, row.facing, '| hit', r.hit ? 'f' + r.hitFrame : 'NONE', '| miss', row.miss, 'px | max joint step', row.maxStep, 'px/frame | stepped in', row.steppedX, 'px | he is', r.dState);
    }
}
const misses = out.filter(r => r.miss != null).map(r => r.miss).sort((x, y) => x - y);
console.log(`SUMMARY ${move}: ${out.filter(r => r.hit).length}/${out.length} hit; miss px min ${misses[0]?.toFixed(1)} median ${misses[misses.length >> 1]?.toFixed(1)} max ${misses.at(-1)?.toFixed(1)}; max joint step ${Math.max(...out.map(r => r.maxStep)).toFixed(1)} px/frame`);
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
console.log('errors', errors);
await browser.close();
