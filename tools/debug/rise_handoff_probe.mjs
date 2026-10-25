// Rise -> standing handoff probe (PLAN_RISE_HANDOFF T1.1).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/rise_handoff_probe.mjs [outDir] [rig,rig,...|all] [flags,...]
//     flags: default | off  (default = risefix=off; off = sellart=off&aftermath=off&risefix=off); add "fix" for ?risefix=1 (T2.2),
//            "fixoff" for risefix with both flags off.
//
// Nothing in src/ is touched. The game loop is put to sleep and advanced by hand in fixed 1/60 s
// steps (game.step) with the tween clock pinned and Math.random seeded, the way
// aftermath_film.mjs does. The rises are FORCED in page: the receiver is set down on its back or
// front, given (or not) the pain context a suplex leaves, and the game's own _startRiseUp /
// _startQuickRise is called, so the swap is the game's own onComplete.
//
// Per case it records the last rising frame and the first 10 standing frames: every textured
// part's world transform (and the four corners of its frame), jointAttachmentPoints, the painted
// backWaist, this.pose, combatBlend, recovery weights and riseT / fallProgress. The step is the
// per-part corner displacement between the last rising frame and the first standing frame.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';

export const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'thesz', 'george', 'thesz-roster-v1', 'guido-roster-v1', 'kowalski-roster-v1', 'thesz-front3q-r1'];
// risefix is default-on (Derek 2026-10-25): the pre-fix configs ask for risefix=off explicitly.
export const FLAGS = { default: 'risefix=off', off: 'sellart=off&aftermath=off&risefix=off', fix: 'risefix=1', fixoff: 'sellart=off&aftermath=off&risefix=1' };
// kind: gettingUp = _startRiseUp; quick = _startQuickRise. pain: the back pain a suplex leaves (supine only).
export const CASES = [
    { id: 'supine-pain', kind: 'gettingUp', lying: 'supine', pain: true },
    { id: 'supine', kind: 'gettingUp', lying: 'supine', pain: false },
    { id: 'prone', kind: 'gettingUp', lying: 'prone', pain: false },
    { id: 'quick-supine', kind: 'quick', lying: 'supine', pain: false },
    { id: 'quick-prone', kind: 'quick', lying: 'prone', pain: false },
    // floored mid-stride: moveBlend is frozen while he is down, so the stand-up inherits a gait
    { id: 'supine-gait', kind: 'gettingUp', lying: 'supine', pain: false, gait: true },
];
const POST = 10;

// In-page: take over the clock, seed random, park the other wrestler.
export const INSTALL = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    let a = 0x5eed1234;
    Math.random = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const w = window.__rw = sc.w1;
    window.__T = sc.time.now;
    // part names from the skeleton's own fields
    const sk = w.skeleton, names = [];
    sk._parts.forEach((p, i) => { names[i] = null; });
    for (const [k, v] of Object.entries(sk)) { const i = sk._parts.indexOf(v); if (i >= 0 && !names[i]) names[i] = k; }
    window.__names = names.map((n, i) => n ?? `part${i}`);
    return { rig: new URLSearchParams(location.search).get('p1'), search: location.search, names: window.__names };
};

// In-page: put the receiver down the way a knockdown leaves it, then start the rise.
export const BEGIN = ({ kind, lying, pain, facing, pose, opp = 'front', gait = false }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = window.__rw;
    w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
    w.x = 520; w.y = 355; w.facing = facing; w.lying = lying;
    // Wrestler.move() turns a standing wrestler to face the other one. `opp: 'front'` puts the opponent on the side
    // the receiver faces (no turn at the swap: pure pose continuity); `'behind'` puts him on the other side, which is
    // where a suplex thrower stands (the receiver turns to face him on the first standing frame: the mirror, H5).
    sc.w2.x = w.x + (opp === 'front' ? facing : -facing) * 200; sc.w2.y = w.y; sc.w2.state = 'standing'; sc.w2.vx = 0; sc.w2.vy = 0;
    w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null; w._hold = null;
    w._sellArtInterrupted = null; w._sellArtSelection = null; w.skeleton.setPartVariants?.({}); w._gripLatch = null;
    w._pain = null; w.stamina = 100; w.combatBlend = 0; w.moveBlend = gait ? 1 : 0; w.walkPhase = gait ? 1.3 : 0;
    // The pose a real suplex receiver carries to the rise: measured live (aftermath_film.mjs, Lou receiving,
    // 2026-10-24: this.pose at the last rising frame). `pose: 'idle'` is a rested wrestler instead.
    Object.assign(w.pose, pose === 'idle'
        ? { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.7, rElbow: 0.7, lKnee: 0, rKnee: 0 }
        : { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6 });
    if (pain) { w._hurt(8, 'suplex'); w._pain.phase = 'mat'; w._pain.planned = true; }
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    window.__film = { n: 0 };
    if (kind === 'quick') w._startQuickRise(); else w._startRiseUp();
    return { pain: w._pain ? { ...w._pain } : null };
};

export const STEP = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], w = window.__rw, sk = w.skeleton;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const Sk = sk.constructor;
    const parts = sk._parts.map((img, i) => {
        const m = img.getWorldTransformMatrix();
        const fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
        const c = [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]]
            .map(([x, y]) => [+(m.a * x + m.c * y + m.tx).toFixed(3), +(m.b * x + m.d * y + m.ty).toFixed(3)]);
        return { n: window.__names[i], vis: !!img.visible, c: c.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]) };
    });
    const pts = {};
    for (const [k, p] of Object.entries(sk.jointAttachmentPoints ?? {})) if (p) pts[k] = { x: +p.x.toFixed(3), y: +p.y.toFixed(3) };
    const wa = sk.torso?._semanticAnchors?.backWaist;
    const bw = wa ? Sk.imageAnchorPoint(sk.torso, wa) : null;
    const near = sk.nearForearm, cA = near?._semanticAnchors?.clutch;
    const contact = (cA && Sk.imageAnchorPoint(near, cA)) || sk.jointAttachmentPoints?.nearWrist || null;
    const pt = p => p ? { x: +p.x.toFixed(3), y: +p.y.toFixed(3) } : null;
    return {
        now: sc.time.now, state: w.state, facing: w.facing, riseT: +(w.riseT ?? 0).toFixed(5), fallProgress: +(w.fallProgress ?? 0).toFixed(5),
        pose: JSON.parse(JSON.stringify(w.pose)), combatBlend: +(w.combatBlend ?? 0).toFixed(4),
        recoveryW: +(w._recoveryWeight?.() ?? 0).toFixed(4), handW: +(w._recoveryHandWeight?.() ?? 0).toFixed(4),
        pain: w._pain ? { part: w._pain.part, phase: w._pain.phase, carried: w._pain.carried ?? null } : null,
        torsoRot: +sk.torso.getWorldTransformMatrix().rotation.toFixed(5),
        x: w.x, y: w.y, s: w.s * (w._heightScale ?? 1), parts, pts, backWaist: pt(bw), contact: pt(contact),
        backDist: bw && contact ? +Math.hypot(contact.x - bw.x, contact.y - bw.y).toFixed(3) : null,
    };
};

// Largest corner-set (Hausdorff) displacement per part between two recorded frames.
export function partSteps(a, b, mirrorX = null) {
    const out = {};
    const mx = c => mirrorX === null ? c : [2 * mirrorX - c[0], c[1]];
    a.parts.forEach((pa0, i) => {
        const pb = b.parts[i];
        const pa = { ...pa0, c: pa0.c.map(mx) };
        if (!pa.vis || !pb.vis) return;
        // Corner sets compared as sets (Hausdorff), so a flipX toggle between the grounded and upright
        // renderers is not counted as a jump of the sprite's own corners.
        const near = (c, set) => Math.min(...set.map(d => Math.hypot(c[0] - d[0], c[1] - d[1])));
        out[pa.n] = +Math.max(...pa.c.map(c => near(c, pb.c)), ...pb.c.map(c => near(c, pa.c))).toFixed(2);
    });
    return out;
}
export const pointSteps = (a, b, mirrorX = null) => Object.fromEntries(Object.keys(a.pts).filter(k => b.pts[k])
    .map(k => [k, +Math.hypot((mirrorX === null ? a.pts[k].x : 2 * mirrorX - a.pts[k].x) - b.pts[k].x, a.pts[k].y - b.pts[k].y).toFixed(2)]));

const gitInfo = () => { const sh = c => execSync(c, { encoding: 'utf8' }).trim();
    return { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain --untracked-files=no') !== '' }; };

export async function probeRig(rig, flagName, { shots = null, facings = [-1, 1], pose = 'stale', opps = ['front', 'behind'] } = {}) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    process.env.WFM_QS = ['notitle=1', FLAGS[flagName]].filter(Boolean).join('&');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400);
        const info = await page.evaluate(INSTALL);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
            const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = () => { const cx = box.x + 520 * box.w / box.gw, bottom = box.y + (355 + 30) * box.h / box.gh;
            return { x: Math.round(cx - 150), y: Math.round(bottom - 330), width: 300, height: 330 }; };
        const cases = [];
        for (const c of CASES) for (const facing of facings) for (const opp of opps) {
            const begin = await page.evaluate(BEGIN, { ...c, facing, pose, opp });
            const frames = [];
            let swapAt = null;
            for (let i = 0; i < 400; i++) {
                const f = await page.evaluate(STEP);
                frames.push(f);
                if (swapAt === null && f.state === 'standing') {
                    swapAt = i;
                    if (shots) {
                        await page.screenshot({ path: join(shots, `${rig}__${c.id}__f${facing}${opp === 'behind' ? 'b' : ''}__standing.png`), clip: clip() });
                    }
                }
                if (swapAt === null && shots && frames.length >= 2) {
                    // keep the last two rising frames' shot: overwritten until the swap
                    await page.screenshot({ path: join(shots, `${rig}__${c.id}__f${facing}${opp === 'behind' ? 'b' : ''}__rise.png`), clip: clip() });
                }
                if (swapAt !== null && i - swapAt >= POST - 1) break;
            }
            if (swapAt === null || swapAt === 0) { cases.push({ ...c, facing, opp, error: `no swap (swapAt ${swapAt})` }); continue; }
            const standErr = await page.evaluate(() => window.__rw.skeleton._standCache?.value?.errPx ?? null);
            const last = frames[swapAt - 1], prev = frames[swapAt - 2], first = frames[swapAt];
            const standing = frames.slice(swapAt, swapAt + POST);
            const turned = last.facing !== first.facing, mx = turned ? last.x : null;
            cases.push({
                ...c, facing, opp, turned, pain: begin.pain, standErrPx: standErr === null ? null : +standErr.toFixed(2), swapStep: swapAt, riseFrames: swapAt,
                lastRising: last, standing: standing.map((f, k) => k < 1 ? f : { ...f, parts: undefined }),
                // swap = raw step the player sees; swapPose = the same with the facing mirror taken out (== swap when no turn)
                swapPose: { parts: partSteps(last, first, mx), points: pointSteps(last, first, mx) },
                swap: { parts: partSteps(last, first), points: pointSteps(last, first), backWaist: last.backWaist && first.backWaist
                    ? +Math.hypot(last.backWaist.x - first.backWaist.x, last.backWaist.y - first.backWaist.y).toFixed(2) : null,
                    carriedDistLast: last.backDist, carriedDistFirst: first.backDist },
                natural: { parts: partSteps(prev, last), points: pointSteps(prev, last) },
                after: standing.slice(1).map((f, k) => Math.max(...Object.values(partSteps(standing[k], f)))),
            });
        }
        return { rig, flagName, flags: FLAGS[flagName], search: info.search, names: info.names, cases };
    } finally { await h.close(); }
}

const maxOf = o => Math.max(...Object.values(o));

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outDir = 'research/animation/rise-handoff-2026-10/baseline', rigArg = 'all', flagArg = 'default,off'] = process.argv.slice(2);
    const rigs = rigArg === 'all' ? RIGS : rigArg.split(',');
    const flags = flagArg.split(',');
    mkdirSync(join(outDir, 'shots'), { recursive: true });
    const runs = [];
    for (const rig of rigs) for (const f of flags) {
        const r = await probeRig(rig, f, { shots: f === flags[0] ? join(outDir, 'shots') : null });
        runs.push(r);
        console.log(`[probe] ${rig} ${f}: ` + r.cases.map(c => c.error ? `${c.id}/${c.facing} ERROR ${c.error}`
            : `${c.id}/${c.facing}/${c.opp} max ${maxOf(c.swap.parts)}${c.turned ? ` pose-only ${maxOf(c.swapPose.parts)} TURN` : ''} (nat ${maxOf(c.natural.parts)})`).join(' | '));
    }
    writeFileSync(join(outDir, 'handoff.json'), JSON.stringify({ tool: 'tools/debug/rise_handoff_probe.mjs', git: gitInfo(), runs }));
    process.exit(0);
}
