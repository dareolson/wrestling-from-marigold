// The ground strikes through the real executor (PLAN_LIGHT_MOVES T10.4 mounted punches, T11.6 body stomps): every rig pairing (ALL=1) or Lou<->George, both facings. At each hit (the frame the man is hurt and the one after) the
// attacker's fist tip (mounted: either arm) or boot ankle (stomps) against the target on the man (his face / the middle of his back), px as drawn, plus the largest joint step.
//   node tools/debug/ground_measure.mjs mountedPunches|bodyStomps   (WFM_URL, ALL=1, JSON=<path>)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { RIGS, POINTS } from './strike_lib.mjs';
import { MASKS } from './toehold_t30_lib.mjs';
const URL = process.env.WFM_URL ?? 'http://localhost:5197';
const move = process.argv[2] ?? 'mountedPunches', MOUNT = move === 'mountedPunches';
const probe = MOUNT ? 'fists' : 'ankle', target = MOUNT ? 'face' : 'chest', lying = MOUNT ? 'supine' : 'prone';
const pairs = [];
if (process.env.ALL) { for (const a of RIGS) for (const d of RIGS) pairs.push([a, d]); } else pairs.push([RIGS[0], RIGS[1]], [RIGS[1], RIGS[0]]);
const RUN = async ({ move, probe, target, lying, facing, masks }) => {
    (0, eval)(`(${masks})()`);
    const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
    let T = sc.time.now; const step = () => { T += 1000 / 60; g.step(T, 1000 / 60); };
    for (const w of [A, D]) { w.scene.tweens.killTweensOf(w); w._activeMove = null; w.state = 'standing'; w.y = 330; w.vx = w.vy = 0; w.stamina = 100; w.wear = 0; w.lying = null; }
    A.input = { justDown: () => false, isDown: () => false }; D.input = A.input;
    A.x = 520; A.facing = facing; D.x = 520 + facing * 90; D.facing = lying === 'supine' ? -facing : facing;
    D.state = 'down'; D.lying = lying; D.stateTimer = 99;
    step(); step();
    const hits = []; let f = 0;
    const orig = D._hurt.bind(D); D._hurt = (...a) => { hits.push(f); return orig(...a); };
    // painted pixels at the hit: the sole (lowest 10 rows of the stomping leg's shin + boot) or the fists (hands and forearms of both arms) against the man's torso / head; min distance and overlap
    const painted = () => {
        const sk = A.skeleton, ds = D.skeleton, side = sk.lChannelSide(A.facing), ox = Math.floor(Math.min(A.x, D.x) - 260), oy = Math.floor(Math.min(A.y, D.y) - 260), cw = 560, ch = 460;
        const mine = move === 'mountedPunches' ? [sk.nearForearm, sk.nearHand, sk.farForearm, sk.farHand] : [sk[side + 'Shin'], sk[side + 'Boot']];
        const a = window.__partsMask(A, mine, ox, oy, cw, ch), d = window.__partsMask(D, [move === 'mountedPunches' ? ds.head : ds.torso], ox, oy, cw, ch);
        let low = -1; if (move !== 'mountedPunches') for (let i = 0; i < a.length; i++) if (a[i]) low = Math.max(low, Math.floor(i / cw));
        const pa = [], pd = []; let over = 0;
        for (let i = 0; i < a.length; i++) { const y = Math.floor(i / cw); if (a[i] && (move === 'mountedPunches' || y > low - 10)) { pa.push(i); if (d[i]) over++; } if (d[i] && (i % 2 === 0)) pd.push(i); }
        let best = Infinity; for (const i of pa) { const x = i % cw, y = Math.floor(i / cw); for (const j of pd) { const dd = (x - j % cw) ** 2 + (y - Math.floor(j / cw)) ** 2; if (dd < best) best = dd; } }
        return { dist: Number.isFinite(best) ? Math.sqrt(best) : null, over, n: pa.length };
    };
    let maxStep = 0, prev = null; const rows = [], pix = [];
    A['_do' + move[0].toUpperCase() + move.slice(1)](D);
    for (f = 1; f <= 240; f++) {
        step();
        const cur = Object.values(A.skeleton.jointAttachmentPoints).map(p => [p.x, p.y]);
        if (prev) for (let i = 0; i < cur.length; i++) maxStep = Math.max(maxStep, Math.hypot(cur[i][0] - prev[i][0], cur[i][1] - prev[i][1]) / A.s);
        prev = cur;
        rows.push({ f, miss: POINTS_FN({ probe, target }).dist, ay: A.y, dy: D.y });
        if (hits.length && f <= hits.at(-1) + 1) pix.push({ f, hit: hits.at(-1), ...painted() });
        if (!A._activeMove && f > 10) break;
    }
    D._hurt = orig; A._cancelActiveMove('measure');
    const pixAt = h => { const p = pix.filter(x => x.hit === h && x.dist != null); return p.length ? { dist: Math.min(...p.map(x => x.dist)), over: Math.max(...p.map(x => x.over)) } : null; };
    return { hits: hits.map(h => ({ f: h, miss: Math.min(...rows.filter(r => r.f === h || r.f === h + 1).map(r => r.miss)), painted: pixAt(h) })), maxStep, end: A.state, dState: D.state, frames: f };
};
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const out = [];
for (const [a, d] of pairs) {
    await page.goto(`${URL}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
    await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; });
    for (const facing of [1, -1]) {
        const r = await page.evaluate(`(${RUN.toString().replace('POINTS_FN', '(' + POINTS.toString() + ')')})(${JSON.stringify({ move, probe, target, lying, facing, masks: MASKS.toString() })})`);
        const row = { attacker: a.split('-')[0], defender: d.split('-')[0], facing: facing > 0 ? 'R' : 'L', hits: r.hits.length, miss: r.hits.map(h => +h.miss.toFixed(1)).join('/'), painted: r.hits.map(h => h.painted ? `${h.painted.dist.toFixed(1)}d${h.painted.over}o` : '-').join('/'), maxStep: +r.maxStep.toFixed(1), end: r.end, dState: r.dState };
        out.push(row);
        console.log(move, row.attacker, '>', row.defender, row.facing, '| hits', row.hits, '| joint miss px', row.miss, '| painted dist(d)/overlap(o) px', row.painted, '| max joint step', row.maxStep, 'px/frame | he ends', r.end, '| man', r.dState);
    }
}
const all = out.flatMap(r => r.miss ? r.miss.split('/').map(Number) : []).sort((x, y) => x - y);
console.log(`SUMMARY ${move}: ${out.filter(r => r.hits).length}/${out.length} runs hit; miss px min ${all[0]} median ${all[all.length >> 1]} max ${all.at(-1)}; max joint step ${Math.max(...out.map(r => r.maxStep))} px/frame`);
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(out, null, 1));
console.log('errors', errors);
await browser.close();
