// The charge puts him down, face or stomach (PLAN_GRAPPLES T3c.8): real lockup input whips the receiver into a corner (grapples=v1), the
// attacker charges (down held at the press = the stomach), and the run is read past the end of the get-up. Measures all four corners
// for both kits and both parts; films the near-left and far-right corners (every game frame) for the page's normal and quarter speed.
//   WFM_URL=http://localhost:5173 node tools/debug/corner_knockdown.mjs [--no-film]
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root = 'research/animation/whip-2026-10';
const FILM = !process.argv.includes('--no-film');
mkdirSync(root, { recursive: true });
const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];   // attacker-receiver
const CORNERS = [['left-near', 'left', 'down'], ['right-near', 'right', 'down'], ['left-far', 'left', 'up'], ['right-far', 'right', 'up']];
const FILMED = new Set(['left-near', 'right-far']);
const PARTS = ['face', 'gut'];

const READ = async () => {
    const { Skeleton } = { Skeleton: (await import('/src/Skeleton.js')).default };
    const { ringBoundsAtY } = await import('/src/constants.js');
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize;
    const k = box.width / g.width;
    const pts = d.skeleton.jointAttachmentPoints, all = Object.values(pts).filter(p => p);
    const hb = d.skeleton.head?.getBounds?.() ?? null;
    const sp = d._sellPose?.() ?? null, cur = d._sell?.plan[d._sell.i] ?? null;
    let wrist = null;
    if (sp && cur) {
        const T = Skeleton.groundedTarget(pts, cur.part, d.s * d._heightScale);
        wrist = Object.fromEntries(Object.entries(sp.reach).map(([side, r]) => [side, { w: r.w, dist: T && pts[`${side}Wrist`] ? Math.hypot(pts[`${side}Wrist`].x - T.x, pts[`${side}Wrist`].y - T.y) : null }]));
    }
    const b = ringBoundsAtY(d.y);
    return {
        a: { x: a.x, y: a.y, s: a.s, state: a.state, phase: a.runPhase, charge: !!a._charge, ep: !!a._cornerEp },
        d: { x: d.x, y: d.y, s: d.s, state: d.state, facing: d.facing, lying: d.lying, variant: d._fallVariant ?? null, stamina: d.stamina, stateTimer: d.stateTimer, ep: d._cornerEp ? d._cornerEp.id : null, knock: !!d._cornerKnock,
            pain: d._pain ? { part: d._pain.part, severity: d._pain.severity, planned: d._pain.planned } : null,
            sell: cur ? { name: cur.name, part: cur.part, duration: cur.duration, t: d._sell.t, forced: !!cur.forced } : null, wrist,
            head: hb ? { minX: hb.x, maxX: hb.x + hb.width } : null, getUp: d._getUp?.id ?? null, ext: { minX: Math.min(...all.map(p => p.x)), maxX: Math.max(...all.map(p => p.x)), minY: Math.min(...all.map(p => p.y)), maxY: Math.max(...all.map(p => p.y)) } },
        rope: { left: b.left, right: b.right },
        scr: { x: box.x + (d.x - cam.worldView.x) * cam.zoom * k, y: box.y + (d.y - cam.worldView.y) * cam.zoom * k, k: cam.zoom * k },
        moves: sc.matchEvents.filter(e => e.move === 'cornerCharge').length,
    };
};

const runCase = async (h, { cornerKey, dirKey, vert, part, stamina = 100, shots }) => {
    const facing = dirKey === 'right' ? 1 : -1;
    await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    await h.page.evaluate((s) => { window.__WFM_GAME.scene.scenes[0].w2.stamina = s; }, stamina);
    const rows = [];
    const moves0 = (await h.page.evaluate(READ)).moves;   // the match log keeps counting across cases
    let n = 0, clip = null, arrived = -1, pressed = -1, standAfter = -1;
    for (let i = 0; i < 1500; i++) {
        let press = [], hold = [];
        if (i === 48) { press = ['action']; hold = [dirKey, vert]; }
        if (arrived >= 0 && pressed < 0 && i - arrived >= 15) { pressed = i; press = ['run']; if (part === 'gut') hold = ['down']; }
        await h.page.evaluate(STEP, { press: { a: press }, hold: { a: hold } });
        const m = await h.page.evaluate(READ);
        m.moves -= moves0;
        rows.push({ i, ...m });
        if (arrived < 0 && m.d.state === 'cornered') arrived = i;
        if (shots && arrived >= 0 && i >= arrived - 20) {
            if (!clip) {
                const c = await h.page.evaluate(({ cornerKey, vert }) => {
                    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize;
                    const k = box.width / g.width, y = vert === 'down' ? 439 : 264, t = (445 - y) / (445 - 258), left = cornerKey.startsWith('left');
                    const x = left ? 40 + 170 * t : 920 - 170 * t;
                    return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k, in: left ? 1 : -1, k: cam.zoom * k };
                }, { cornerKey, vert });
                const W = 520, H = 300;
                clip = { x: Math.max(0, Math.min(c.x + c.in * 150 * c.k - W / 2, 1100 - W)), y: Math.max(0, c.y - H * 0.88), width: W, height: H };
            }
            await h.page.screenshot({ path: `${shots}/s${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 72, clip }); n++;
        }
        const wasHit = rows.some(r => r.moves > 0);
        if (wasHit && standAfter < 0 && m.d.state === 'standing') standAfter = i;
        if (standAfter >= 0 && i > standAfter + 90) break;
        if (pressed >= 0 && !wasHit && i > pressed + 240) break;   // never landed
    }
    return { rows, arrived, pressed, n };
};

const summarise = (rows, arrived, pressed, cornerKey, part) => {
    const hitI = rows.findIndex(r => r.moves > 0);
    const out = { cornerKey, part, arrived, pressed, landed: hitI >= 0 };
    if (hitI < 0) return out;
    const dir = cornerKey.startsWith('left') ? 1 : -1;
    const at = (pred, from = hitI) => rows.findIndex((r, k) => k >= from && pred(r));
    const fallI = at(r => r.d.state === 'falling'), downI = at(r => r.d.state === 'down'), upI = at(r => r.d.state === 'gettingUp'), standI = at(r => r.d.state === 'standing', Math.max(downI, 0));
    const ms = (a, b) => Math.round((b - a) * 1000 / 60);
    out.states = rows.slice(arrived).map(r => r.d.state).filter((s, k, arr) => s !== arr[k - 1]);
    out.neverCorneredAfterHit = rows.slice(hitI + 1).every(r => r.d.state !== 'cornered' && r.d.ep === null);
    out.damageEvents = rows.filter(r => r.moves > 0).length > 0 ? Math.max(...rows.map(r => r.moves)) : 0;
    out.variant = rows[downI].d.variant; out.lying = rows[downI].d.lying; out.facingOnLanding = rows[downI].d.facing;
    out.reactionMs = fallI > 0 ? ms(hitI, fallI) : null; out.fallMs = downI > 0 && fallI > 0 ? ms(fallI, downI) : null;
    out.chargeMs = ms(pressed, rows.findIndex((r, k) => k > pressed && rows[k - 1].a.phase === 'charge' && r.a.phase !== 'charge'));
    const L = rows[downI], s = L.d.s;
    out.landing = { x: +L.d.x.toFixed(1), downMargin60s: +(60 * s).toFixed(1), toLeftRope: +(L.d.ext.minX - L.rope.left).toFixed(1), toRightRope: +(L.rope.right - L.d.ext.maxX).toFixed(1), bodyMinX: +L.d.ext.minX.toFixed(1), bodyMaxX: +L.d.ext.maxX.toFixed(1), ropeLeft: +L.rope.left.toFixed(1), ropeRight: +L.rope.right.toFixed(1) };
    // the tightest margin to the rope behind him over the whole fall and lie, joints only (the sprite boxes are coarse)
    const lying = rows.filter((r, k) => k >= fallI && (r.d.state === 'falling' || r.d.state === 'down'));
    const marginOf = (r) => (dir > 0 ? r.d.ext.minX - r.rope.left : r.rope.right - r.d.ext.maxX);
    out.corneredMargin = +marginOf(rows[hitI]).toFixed(1);   // the standing baseline: he already stands back-to-the-rope at the corner
    out.tightestRopeMargin = { falling: +Math.min(...lying.filter(r => r.d.state === 'falling').map(marginOf)).toFixed(1), lying: +Math.min(...lying.filter(r => r.d.state === 'down').map(marginOf)).toFixed(1) };
    const gapOf = (r) => { const e = r.d.ext, ax = r.a.x; return ax > e.maxX ? ax - e.maxX : ax < e.minX ? e.minX - ax : 0; };
    out.attackerGapOnLanding = { hipToHip: +Math.abs(L.a.x - L.d.x).toFixed(1), toNearestJoint: +gapOf(L).toFixed(1) };
    const headGap = (r) => (r.d.head ? (r.a.x > r.d.head.maxX ? r.a.x - r.d.head.maxX : r.a.x < r.d.head.minX ? r.d.head.minX - r.a.x : 0) : null);
    out.attackerGapToHeadSprite = { onLanding: headGap(L) == null ? null : +headGap(L).toFixed(1), min: +Math.min(...lying.map(headGap).filter(v => v != null)).toFixed(1) };
    out.attackerMinGapToJoints = +Math.min(...lying.map(gapOf)).toFixed(1);
    // the sell
    const sells = rows.filter(r => r.d.sell);
    out.sellPlayed = sells.length > 0 && sells.every(r => r.d.sell.part === (part === 'gut' ? 'gut' : 'head') && r.d.sell.name === 'clutch');
    out.sell = sells.length ? { part: sells[0].d.sell.part, forced: sells[0].d.sell.forced, durationS: +sells[0].d.sell.duration.toFixed(2), frames: sells.length, startedMsAfterDown: ms(downI, rows.indexOf(sells[0])), downTimeAtLanding: +L.d.stateTimer.toFixed(2), severity: L.d.pain?.severity } : null;
    const held = sells.filter(r => r.d.wrist && Object.values(r.d.wrist).some(x => x.w >= 0.99));
    const dist = (side) => held.map(r => r.d.wrist[side]?.dist).filter(v => v != null);
    out.wristToTarget = { nearHand: dist('near').length ? { min: +Math.min(...dist('near')).toFixed(1), max: +Math.max(...dist('near')).toFixed(1) } : null, farHand: dist('far').length ? { min: +Math.min(...dist('far')).toFixed(1), max: +Math.max(...dist('far')).toFixed(1) } : null, heldFrames: held.length };
    out.getUp = upI > 0 ? rows[upI].d.getUp : null; out.gotUp = standI > 0;
    out.sellEndedBeforeRise = sells.length ? rows.indexOf(sells.at(-1)) < upI : null;
    const end = rows.at(-1);
    out.leftovers = { episode: end.d.ep, knock: end.d.knock, attackerCharge: end.a.charge, attackerEpisode: end.a.ep, defenderState: end.d.state, attackerState: end.a.state };
    return out;
};

const runs = [], films = [];
for (const [pair, att, def] of (process.env.PAIR ? PAIRS.filter(p => p[0] === process.env.PAIR) : PAIRS)) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const [cornerKey, dirKey, vert] of CORNERS) for (const part of PARTS) {
            const id = `${pair}-${cornerKey}-${part}`;
            if (process.env.ONLY && !id.includes(process.env.ONLY)) continue;
            const film = FILM && FILMED.has(cornerKey);
            const dir = `${root}/corner-knockdown-frames/${id}`;
            if (film) mkdirSync(dir, { recursive: true });
            const { rows, arrived, pressed, n } = await runCase(h, { cornerKey, dirKey, vert, part, shots: film ? dir : null });
            if (arrived < 0) { console.log({ id, error: 'never cornered' }); continue; }
            const rec = { id, pair, ...summarise(rows, arrived, pressed, cornerKey, part) };
            if (film) { rec.frames = n; films.push(rec); }
            runs.push(rec);
            console.log(JSON.stringify(rec));
        }
    } finally { await h.close(); }
}
if (!process.env.ONLY) writeFileSync(`${root}/corner-knockdown-results.json`, JSON.stringify({ runs, films }, null, 2));
