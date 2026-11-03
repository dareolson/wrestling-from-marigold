// PLAN_GRAPPLES T4b.2: the go-behind and the waistlock hold, forced from a real tie-up, ?waistlock=v1 (and grapples on), 1/60 s steps,
// deterministic (loop asleep, seeded Math.random, fixed tween delta, AIs nulled, input scripted).
//
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_waistlock.mjs [outRoot=research/animation/grapples-2026-10/g4b-a] [pairs=lg,gl] [shots=1]
//
// Per attacker (Lou on George = lg, George on Lou = gl), both facings, both sides (up = far, down = near): the attacker presses power with the
// direction held at frame 36 (0.6 s, after the engage and the tugs). Writes <outRoot>/frames/<id>/sNNNN.jpg and <outRoot>/film.json.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { partSteps } from './rise_handoff_probe.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL, SETUP } from './grapples_film.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = { lg: { id: 'lou-george', att: LOU, def: GEORGE }, gl: { id: 'george-lou', att: GEORGE, def: LOU } };
const PRESS_AT = 36;
const TAG = process.env.WL_TAG ?? '', ONLY = process.env.WL_ONLY?.split(',') ?? null;   // WL_TAG=2b prefixes the ids and writes film-2b.json; WL_ONLY=lou-george-up,... films a subset

export const STEP = async ({ press, hold, mask }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    window.__keys.a = new Set(press?.a ?? []); window.__keys.d = new Set(press?.d ?? []);
    window.__keys.ad = new Set(hold?.a ?? []); window.__keys.dd = new Set(hold?.d ?? []);
    window.__T += 1000 / 60;
    const t0 = performance.now();
    game.step(window.__T, 1000 / 60);
    const ms = performance.now() - t0;
    const mk = (w, names) => ({
        x: w.x, y: w.y, facing: w.facing, state: w.state, s: w.s,
        parts: w.skeleton._parts.map((img, i) => {
            const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
            const c = [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([x, y]) => [+(m.a * x + m.c * y + m.tx).toFixed(2), +(m.b * x + m.d * y + m.ty).toFixed(2)]);
            return { n: names[i], vis: !!img.visible, c };
        }),
        pts: Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, { x: +p.x.toFixed(2), y: +p.y.toFixed(2) }])),
    });
    const ws = sc.waistlockState, ls = sc.lockupState;
    const row = { ms, held: !!ws, locked: !!(ws || ls), lockup: !!ls, mask: mask && (ws || ls) ? window.__maskOverlap(a, d, true) : null, a: mk(a, window.__names.a), d: mk(d, window.__names.d), wl: null };
    if (ws?.grips) {
        const { waistlockGrips } = await import('/src/animation/waistlock.js'), { gripTarget } = await import('/src/animation/lockup.js');
        const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
        const lists = waistlockGrips(ws.attacker, ws.defender, ws.grips);
        const errs = {};
        for (const [role, actor] of [['attacker', ws.attacker], ['defender', ws.defender]]) {
            const pts = actor.skeleton.jointAttachmentPoints, lSide = actor.skeleton.lChannelSide(actor.facing);
            for (const it of lists[role]) {
                const handSide = it.arm === 'l' ? lSide : (lSide === 'near' ? 'far' : 'near');
                const target = gripTarget(it, handSide), S = pts[`${handSide}Shoulder`], E = pts[`${handSide}Elbow`], W = pts[`${handSide}Wrist`];
                errs[`${role}.${handSide}`] = { err: +dist(W, target).toFixed(2), w: +it.w.toFixed(3), over: +(dist(S, target) - (dist(S, E) + dist(E, W))).toFixed(2) };
            }
        }
        row.wl = { t: ws.t, phase: ws.phase, errs, ay: ws.attacker.y, dy: ws.defender.y };
    }
    return row;
};

const maxPart = (p, c) => Math.max(0, ...Object.values(partSteps(p, c)));

function summarize(rows) {
    const out = { frames: rows.length };
    const wl = rows.filter(r => r.wl), n0 = rows.findIndex(r => r.wl), end = rows.findIndex((r, i) => i > n0 && !r.held);
    out.startFrame = n0; out.endFrame = end; out.heldMs = +(wl.length * 1000 / 60).toFixed(0);
    out.phases = [...new Set(wl.map(r => r.wl.phase))];
    // overlap, worst per phase, masked every third frame
    out.byPhase = {};
    for (const r of rows) if (r.mask && r.wl) { const p = out.byPhase[r.wl.phase] ??= { belowBody: 0, below: 0, torso: 0, above: 0 }; for (const k of Object.keys(p)) p[k] = Math.max(p[k], r.mask[k]); }
    // hands: full-weight frames only (w >= .99)
    out.hands = {};
    for (const r of wl) for (const [k, e] of Object.entries(r.wl.errs)) if (e.w >= 0.99) { const h = out.hands[k] ??= { max: 0, frames: 0, over3: 0, outOfReach: 0, maxOver: -1e9 }; h.max = Math.max(h.max, e.err); h.frames++; if (e.err > 3) h.over3++; if (e.over > 0) h.outOfReach++; h.maxOver = Math.max(h.maxOver, e.over); }
    for (const h of Object.values(out.hands)) { h.max = +h.max.toFixed(2); h.maxOver = +h.maxOver.toFixed(2); }
    // ANKLE MOVEMENT, both feet, no support classification (px per frame at s = 1, per phase, per man); there are no steps yet, so a planted sole and a swinging one are not told apart
    out.slide = {};
    for (let i = Math.max(1, n0); i < rows.length; i++) {
        const p = rows[i - 1], c = rows[i];
        if (!p.wl || !c.wl) continue;
        for (const side of ['a', 'd']) for (const foot of ['nearAnkle', 'farAnkle']) {
            const pa = p[side].pts[foot], ca = c[side].pts[foot];
            if (!pa || !ca) continue;
            const v = Math.hypot(ca.x - pa.x, ca.y - pa.y) / c[side].s, k = `${side === 'a' ? 'attacker' : 'defender'}.${c.wl.phase}`;
            // the frame the attacker's facing flips mirrors his whole body: a separate number, not a slide
            const key = p[side].facing !== c[side].facing ? `${k}.facingFlipFrame` : k;
            out.slide[key] = Math.max(out.slide[key] ?? 0, +v.toFixed(2));
        }
    }
    // closest x between any two of the men's ankle, knee and hip joints in the circle (NOT silhouette clearance: two men can share an x and be apart in depth): smallest gap between the two men's ankles and hips in x (px at s = 1) and the most body overlap
    const lowGap = (r) => {
        const xs = (side) => ['nearAnkle', 'farAnkle', 'nearHip', 'farHip', 'nearKnee', 'farKnee'].map(k => r[side].pts[k]?.x).filter(Number.isFinite);
        const A = xs('a'), D = xs('d');
        return Math.min(...A.flatMap(x => D.map(y => Math.abs(x - y)))) / r.a.s;
    };
    const circle = wl.filter(r => r.wl.phase === 'goBehind');
    out.closestXJoints = circle.length ? +Math.min(...circle.map(lowGap)).toFixed(1) : null;
    // first-frame and worst whole-body part step (px/frame) in the go-behind, against the same man's step over the rest of the tie-up
    const step = (i) => Math.max(maxPart({ parts: rows[i - 1].a.parts }, { parts: rows[i].a.parts }), maxPart({ parts: rows[i - 1].d.parts }, { parts: rows[i].d.parts }));
    out.stepFirst = n0 > 0 ? +step(n0).toFixed(2) : null;
    out.stepGoBehind = +Math.max(0, ...rows.map((r, i) => (i && r.wl?.phase === 'goBehind' ? step(i) : 0))).toFixed(2);
    out.stepHold = +Math.max(0, ...rows.map((r, i) => (i && r.wl?.phase === 'hold' ? step(i) : 0))).toFixed(2);
    out.stepRelease = +Math.max(0, ...rows.map((r, i) => (i && r.wl?.phase === 'release' ? step(i) : 0))).toFixed(2);
    // the tie-up's own worst step after the engage (frame 12 on), for scale
    out.stepTieUpWorst = +Math.max(0, ...rows.map((r, i) => (i >= 12 && i < n0 && r.lockup && rows[i - 1].lockup ? step(i) : 0))).toFixed(2);
    // the let-go back to standing: move() turns the defender round to face the man behind him
    out.stepAfter = end > 0 ? +Math.max(0, ...rows.map((r, i) => (i >= end && i < end + 8 ? step(i) : 0))).toFixed(2) : null;   // the first 8 frames standing
    out.stepTurn = end > 0 ? +Math.max(0, ...rows.map((r, i) => (i >= end + 8 && i < end + 40 ? step(i) : 0))).toFixed(2) : null;   // the rest of the tail, where the turn beat ends and move() turns the defender
    out.turnFrame = end > 0 ? rows.findIndex((r, i) => i >= end && r.d.facing !== rows[end].d.facing) - end : null;
    // spacing and depth in the hold
    const hold = wl.filter(r => r.wl.phase === 'hold');
    if (hold.length) { const r = hold[Math.floor(hold.length / 2)]; out.holdGapX = +(Math.abs(r.a.x - r.d.x) / r.d.s).toFixed(1); out.holdDy = +(r.a.y - r.d.y).toFixed(1); out.holdFacing = [r.a.facing, r.d.facing]; }
    const aft = rows.slice(end >= 0 ? end : 0).find(r => !r.held);
    out.after = aft ? { states: [aft.a.state, aft.d.state] } : null;
    return out;
}

async function run(page, info, spec, shotDir) {
    await page.evaluate(SETUP, { facing: spec.facing, midX: 520, startGap: 90, defRope: null, flag: true, layer: false, seed: 11 });
    const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
    const mid = await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return (sc.w1.x + sc.w2.x) / 2; });
    const clip = { width: 380, height: 330, x: Math.max(0, Math.round(mX(mid) - 190)), y: Math.round(mY(430) - 330) };
    if (shotDir) { rmSync(shotDir, { recursive: true, force: true }); mkdirSync(shotDir, { recursive: true }); }
    const rows = []; let endAt = null;
    for (let i = 0; i < 320; i++) {
        const press = { a: [], d: [] }, hold = { a: [], d: [] };
        if (i === PRESS_AT) { press.a.push('power'); hold.a.push(spec.side < 0 ? 'up' : 'down'); }
        const row = await page.evaluate(STEP, { press, hold, mask: true });
        row.i = i; rows.push(row);
        if (shotDir) await page.screenshot({ path: join(shotDir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 82, clip });
        if (i > PRESS_AT && !row.locked && endAt === null) endAt = i;
        if (endAt !== null && i - endAt >= 30) break;
    }
    return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/grapples-2026-10/g4b-a', pairsArg = 'lg,gl', shots = '1'] = process.argv.slice(2);
    const results = [];
    for (const pair of pairsArg.split(',').map(k => PAIRS[k])) {
        process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(2500);
            const info = await page.evaluate(INSTALL);
            await page.evaluate(INSTALL_MASKS);
            for (const facing of [-1, 1]) for (const side of [-1, 1]) {
                const id = `${TAG ? TAG + '-' : ''}${pair.id}-${facing < 0 ? 'l' : 'r'}-${side < 0 ? 'up' : 'down'}`;
                if (ONLY && !ONLY.includes(`${pair.id}-${side < 0 ? 'up' : 'down'}`)) continue;
                const rows = await run(page, info, { facing, side }, shots === '1' ? join(outRoot, 'frames', id) : null);
                const r = { id, pair: pair.id, facing, side: side < 0 ? 'up (far)' : 'down (near)', ...summarize(rows) };
                if (shots === '1') for (const ph of ['goBehind', 'hold']) {   // the worst masked sample of the phase, as an image: red attacker, blue defender, white under the belt, yellow torso on torso, green above
                    const w = rows.filter(x => x.mask && x.wl?.phase === ph).sort((x, y) => (y.mask.belowBody + y.mask.torso) - (x.mask.belowBody + x.mask.torso))[0];
                    if (w) writeFileSync(join(outRoot, 'frames', `${id}-mask-${ph}.png`), Buffer.from(w.mask.image.split(',')[1], 'base64'));
                }
                for (const x of rows) if (x.mask) delete x.mask.image;
                results.push(r);
                console.log(`[waistlock] ${id}: held ${r.heldMs} ms, closest x between joints in the circle ${r.closestXJoints}, overlap by phase ${JSON.stringify(r.byPhase)}, hands ${JSON.stringify(r.hands)}, slide ${JSON.stringify(r.slide)}`);
            }
        } finally { await h.close(); }
    }
    mkdirSync(outRoot, { recursive: true });
    writeFileSync(join(outRoot, TAG ? `film-${TAG}.json` : 'film.json'), JSON.stringify({ tool: 'tools/debug/grapples_waistlock.mjs', runs: results }, null, 1));
    console.log('wrote', join(outRoot, TAG ? `film-${TAG}.json` : 'film.json'), results.length, 'runs');
}
