// PLAN_FALLS T0.1 (and every later falls gate): films every path to the mat and measures it, deterministic (loop asleep, seeded Math.random, fixed tween delta,
// AIs nulled), 1/60 s steps, both rigs as the man who goes down, both facings.
//
//   WFM_URL=http://localhost:5173 node tools/debug/falls_probe.mjs [outDir=research/animation/falls-2026-11/before] [paths=all] [shots=1]
//   WFM_QS='falls=v1' runs the same paths with the flag on (the after columns of G1-G3); WFM_TAG=after prefixes nothing, it only names the output.
//
// Paths: the four Skeleton.FALLS variants (startFall, `exact`), the flip (startClotheslineFall), and the throws that lay a man down: body slam, hip toss and
// snapmare (supine), suplex (both men supine), piledriver (prone). Pair lg = Lou throws, George goes down; gl = George throws, Lou goes down.
// Per run (id = <path>-<victim>-<l|r>, facing = the attacker's) it writes frames/<id>/sNNNN.jpg (raw film: .git/info/exclude) and, in rows-<id>.json, per frame the
// states, joints and the lowest corner of each hand part. The summary (summary.json) is computed here, in game px at the victim's scale unless noted:
//   pelvis height above the mat per frame from the fall's start to the rest; contact frame = first frame the pelvis is within CONTACT_PX of its rest height;
//   gravity (D4): per-frame drop never decreases (violations, one allowed), the fastest frame is the last before contact, fall time against free fall from the
//     pelvis height with g picked once (a standing man's free fall = 0.40 s at s = 1, from Lou's standing pelvis height); falls from standing only;
//   bounce: pelvis rises after contact (count, px); arms at rest: angle of shoulder->wrist off the torso line hip->neck, folded to 0-90 (missile = under 15 deg);
//   each hand's lowest drawn corner above the mat at contact and at rest; max joint step at the hand-offs (fall -> down, throw -> down, rest -> get-up first frames).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
export const PAIRS = { lg: { id: 'lou-george', att: LOU, def: GEORGE, victim: 'george' }, gl: { id: 'george-lou', att: GEORGE, def: LOU, victim: 'lou' } };
export const PATHS = {
    backward: { kind: 'fall', call: "w.startFall(4.5, 'backward', true)" },
    sitBack: { kind: 'fall', call: "w.startFall(4.5, 'sitBack', true)" },
    forward: { kind: 'fall', call: "w.startFall(4.5, 'forward', true)" },
    kneesForward: { kind: 'fall', call: "w.startFall(4.5, 'kneesForward', true)" },
    flip: { kind: 'fall', call: 'w.startClotheslineFall(w.facing === 1 ? -1 : 1)' },
    bodySlam: { kind: 'throw', call: 'a._doBodySlam(w)' },
    hipToss: { kind: 'throw', call: 'a._doHipToss(w)' },
    snapmare: { kind: 'throw', call: 'a._doSnapmare(w)' },
    suplex: { kind: 'throw', call: 'a._doSuplex(w)' },
    piledriver: { kind: 'throw', call: 'a._doPiledriver(w)' },
};
export const TRIGGER_AT = 8, CONTACT_PX = 4, FREE_FALL_SEC = 0.40, MAT_PAUSE = 40, F = 60;

// ---- in page ---------------------------------------------------------------------------------------------------------------
const SETUP = async ({ facing, gap }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let a0 = 0x5eed1234;
    Math.random = () => { a0 = (a0 + 0x6D2B79F5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null; sc.waistlockState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null; w._fixedHold = false;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null; w.fallProgress = 0; w.flipProgress = 0;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing;
    const mid = 520;
    a.x = mid - facing * gap * a.s / 2; d.x = mid + facing * gap * a.s / 2;
    const keys = new Set();
    a.input = d.input = { justDown: (k) => keys.has(k), isDown: (k) => keys.has(k) };
    return { x: [a.x, d.x], s: a.s };
};
const TRIGGER = (call) => { const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, w = sc.w2; return eval(call); };   // eslint-disable-line no-eval
const FRAME = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    // no separate hand art on these rigs: the forearm part carries the hand
    const hand = (w, n) => { const img = w.skeleton[n] ?? w.skeleton[n.replace('Hand', 'Forearm')]; if (!img?.visible) return null; const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
        return +Math.max(...[[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([x, y]) => m.b * x + m.d * y + m.ty)).toFixed(2); };
    const mk = (w) => ({ x: +w.x.toFixed(2), y: +w.y.toFixed(2), s: w.s, facing: w.facing, state: w.state, lying: w.lying, sold: !!w._sell, fv: w._fallVariant ?? null, fp: +(w.fallProgress ?? 0).toFixed(4), flp: +(w.flipProgress ?? 0).toFixed(4),
        pts: Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, { x: +p.x.toFixed(2), y: +p.y.toFixed(2) }])),
        hands: { near: hand(w, 'nearHand'), far: hand(w, 'farHand') } });
    const h = a._activeMove ?? d._activeMove;
    return { clip: h?.clip?.id ?? null, ct: h ? +h.time.toFixed(4) : null, a: mk(a), d: mk(d) };
};
// the rest: clear the sell, let the lying pose draw alone for a frame, then start the rise
const REST = () => { const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w2; w._sell = null; w._lyingHoldCleared = true; w.stateTimer = Math.max(w.stateTimer, 5); };
const RISE = () => { const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w2; w.stateTimer = 0; };

// ---- measures --------------------------------------------------------------------------------------------------------------
const r1 = (v) => (v == null ? null : +v.toFixed(1)), r2 = (v) => (v == null ? null : +v.toFixed(2));
const hip = (p) => ({ x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 });
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const stepOf = (A, B) => { let best = { px: 0, joint: null }; for (const k of Object.keys(A.pts)) if (B.pts[k]) { const s = dist(A.pts[k], B.pts[k]); if (s > best.px) best = { px: s, joint: k }; } return { px: r2(best.px), joint: best.joint }; };
const lineAngle = (a, b) => { let d = Math.abs(a - b) % Math.PI; if (d > Math.PI / 2) d = Math.PI - d; return d * 180 / Math.PI; };
const armOff = (v) => {
    const t = { x: v.pts.neck.x - hip(v.pts).x, y: v.pts.neck.y - hip(v.pts).y }, ang = Math.atan2(t.y, t.x);
    const off = {};
    for (const n of ['near', 'far']) { const a = { x: v.pts[`${n}Wrist`].x - v.pts[`${n}Shoulder`].x, y: v.pts[`${n}Wrist`].y - v.pts[`${n}Shoulder`].y }; off[n] = r1(lineAngle(Math.atan2(a.y, a.x), ang)); }
    return off;
};

export function measure(rows, kind, g) {
    const start = rows.findIndex((r, i) => i >= TRIGGER_AT && (r.d.state !== 'standing' || r.clip));
    const restIdx = rows.findIndex(r => r.rest), riseIdx = rows.findIndex(r => r.rise);
    const h = (r) => r.d.y - hip(r.d.pts).y;
    const rest = rows[restIdx], restH = h(rest), s = rest.d.s;
    const stand = h(rows[0]);
    let contact = start;
    while (contact < restIdx && h(rows[contact]) > restH + CONTACT_PX * s) contact++;
    const out = { frames: rows.length, start, contact, rest: restIdx, s: r2(s), standingPelvisPx: r1(stand), restPelvisPx: r1(restH), fallFrames: contact - start, fallSec: r2((contact - start) / F) };
    const heights = []; for (let i = start; i <= contact; i++) heights.push(h(rows[i]));
    out.pelvisPath = heights.map(r1);
    const drops = []; for (let i = 1; i < heights.length; i++) drops.push(heights[i - 1] - heights[i]);
    if (kind === 'fall') {
        const total = heights[0] - heights[heights.length - 1];
        let viol = 0; for (let i = 1; i < drops.length; i++) if (drops[i] < drops[i - 1] - 0.05 * s) viol++;
        const maxAt = drops.indexOf(Math.max(...drops));
        const free = Math.sqrt(2 * (heights[0] / s) / g);
        out.gravity = { dropsPx: drops.map(r1), decreasingSteps: viol, fastestFrameIsLast: maxAt === drops.length - 1, fastestFrame: maxAt + 1, ofFrames: drops.length, fallSec: r2(drops.length / F), freeFallSec: r2(free), ratio: r2(drops.length / F / free), pelvisDropPx: r1(total) };
    }
    // bounce: rises of the pelvis after contact, up to the rest
    let bounces = 0, peak = 0, low = h(rows[contact]), up = false;
    for (let i = contact + 1; i <= restIdx; i++) { const v = h(rows[i]); if (v > low + 0.75) { up = true; peak = Math.max(peak, v - low); } else if (up && v < low + 0.25) { bounces++; up = false; low = v; peak = peak; } low = Math.min(low, v); }
    if (up) bounces++;
    out.bounce = { count: bounces, peakPx: r1(peak) };
    out.armsAtRest = { offTorsoDeg: armOff(rest.d), missile: Object.values(armOff(rest.d)).some(v => v < 15) };
    const gap = (r, n) => (r.d.hands[n] == null ? null : r1(r.d.y - r.d.hands[n])), wrist = (r, n) => r1(r.d.y - r.d.pts[`${n}Wrist`].y);
    out.handGapPx = { contact: { near: gap(rows[contact], 'near'), far: gap(rows[contact], 'far') }, rest: { near: gap(rest, 'near'), far: gap(rest, 'far') }, wristAboveMat: { contact: { near: wrist(rows[contact], 'near'), far: wrist(rows[contact], 'far') }, rest: { near: wrist(rest, 'near'), far: wrist(rest, 'far') } },
        note: 'mat line minus the arm part\'s lowest drawn-box corner (the forearm part carries the hand; its bbox, not the painted palm): 0 = on the mat, positive = above it. wristAboveMat is the wrist joint' };
    // hand-offs: the state change into `down`, the first rows after it (the 0.3 s blend), and the get-up
    const toDown = rows.findIndex((r, i) => i > start && r.d.state === 'down' && rows[i - 1].d.state !== 'down');
    const maxStep = (a, b) => { let m = { px: 0 }; for (let i = Math.max(1, a); i <= b; i++) { const st = stepOf(rows[i - 1].d, rows[i].d); if (st.px > m.px) m = { ...st, frame: i }; } return m; };
    out.steps = {
        intoDown: toDown > 0 ? { frame: toDown, ...stepOf(rows[toDown - 1].d, rows[toDown].d) } : null,
        blend: toDown > 0 ? maxStep(toDown, Math.min(toDown + 18, restIdx)) : null,
        wholeFall: maxStep(start + 1, contact),
        intoRise: riseIdx > 0 ? { frame: riseIdx, ...stepOf(rows[riseIdx - 1].d, rows[riseIdx].d), firstFrames: maxStep(riseIdx, Math.min(riseIdx + 3, rows.length - 1)) } : null,
    };
    out.sold = rows.slice(contact, restIdx).some(r => r.d.sold);
    return out;
}

// ---- main ------------------------------------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/falls-2026-11/before', pathsArg = 'all', shots = '1', pairsArg = 'lg,gl'] = process.argv.slice(2);
    const pathIds = pathsArg === 'all' ? Object.keys(PATHS) : pathsArg.split(',');
    mkdirSync(outRoot, { recursive: true });
    const runs = [];
    for (const pair of pairsArg.split(',').map(k => PAIRS[k])) {
        process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1' + (process.env.WFM_XQ ? '&' + process.env.WFM_XQ : '');
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(2500);
            const info = await page.evaluate(INSTALL);
            const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
            const clip = { width: 560, height: 330, x: Math.max(0, Math.round(mX(520) - 280)), y: Math.round(mY(440) - 330) };
            for (const pid of pathIds) for (const facing of [-1, 1]) {
                const spec = PATHS[pid], id = `${pid}-${pair.victim}-${facing < 0 ? 'l' : 'r'}`, dir = join(outRoot, 'frames', id);
                const placed = await page.evaluate(SETUP, { facing, gap: spec.kind === 'throw' ? 55 : 220 });
                if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
                const rows = [], snap = async () => { const i = rows.length; if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 60, clip }); };
                let downAt = null, mark = null;
                for (let i = 0; i < 700; i++) {
                    if (i === TRIGGER_AT) await page.evaluate(TRIGGER, spec.call);
                    const row = await page.evaluate(FRAME); rows.push(row); await snap();
                    if (row.d.state === 'down' && downAt === null) downAt = i;
                    if (downAt !== null && !row.clip && row.d.state === 'down' && i - downAt >= MAT_PAUSE && row.a.state !== 'holding') { mark = i; break; }
                }
                if (mark === null) { console.log(`[falls] ${id}: never reached the mat (${rows.at(-1).d.state})`); continue; }
                // rest: clear the sell and let the bare lying pose draw one frame; then the rise, 12 frames
                await page.evaluate(REST); const rest = await page.evaluate(FRAME); rest.rest = true; rows.push(rest); await snap();
                await page.evaluate(RISE);
                for (let k = 0; k < 12; k++) { const r = await page.evaluate(FRAME); if (k === 0) r.rise = true; rows.push(r); await snap(); }
                writeFileSync(join(outRoot, `rows-${id}.json`), JSON.stringify(rows));
                runs.push({ id, path: pid, kind: spec.kind, victim: pair.victim, attacker: pair.att === LOU ? 'lou' : 'george', facing, rowsFile: `rows-${id}.json`, frames: rows.length, risingState: rows.at(-1).d.state });
                console.log(`[falls] ${id}: ${rows.length} frames, down at ${downAt}, rest at ${rows.findIndex(r => r.rest)}`);
            }
        } finally { await h.close(); }
    }
    // The summary covers every rows file in the folder (so a run can be redone for one pair: pairsArg), not only this launch's runs.
    const { readFileSync, readdirSync } = await import('node:fs');
    const all = readdirSync(outRoot).filter(f => /^rows-.*\.json$/.test(f)).sort().map(f => {
        const id = f.slice(5, -5), [pid, victim, side] = id.split('-'), spec = PATHS[pid];
        return { id, path: pid, kind: spec.kind, victim, attacker: victim === 'lou' ? 'george' : 'lou', facing: side === 'l' ? -1 : 1, rowsFile: f };
    });
    const load = (r) => JSON.parse(readFileSync(join(outRoot, r.rowsFile), 'utf8'));
    // g, picked once: a standing man's free fall is FREE_FALL_SEC at scale 1 (Lou's standing pelvis height, the first row of a Lou run)
    const lr = load(all.find(r => r.victim === 'lou'));
    const standLou = (lr[0].d.y - hip(lr[0].d.pts).y) / lr[0].d.s, g = 2 * standLou / (FREE_FALL_SEC * FREE_FALL_SEC);
    for (const r of all) { const rows = load(r); r.frames = rows.length; r.m = measure(rows, r.kind, g); }
    writeFileSync(join(outRoot, 'summary.json'), JSON.stringify({ tool: 'tools/debug/falls_probe.mjs', flags: process.env.WFM_XQ ?? '', g: { value: r2(g), unit: 'px/s^2 at scale 1', standingPelvisPx: r1(standLou), freeFallSec: FREE_FALL_SEC }, runs: all }, null, 1));
    console.log(`summary: ${all.length} runs, g = ${r2(g)} px/s^2`);
}
