// Knee audit (Derek 2026-10-29, G3 "gumby legs"): a human knee bends until the leg is straight and goes no further. This measures the DRAWN
// knee through every forced get-up: per frame, for the near and far leg, d = shin channel - thigh channel as _applyGrounded is handed them.
// Table convention (Skeleton grounded channels): d < 0 = flexed (heel toward the seat), d = 0 straight, d > 0 = hyperextended.
// Forced rises as getups_film.mjs does (INSTALL / BEGIN / STEP of rise_handoff_probe.mjs; Lou = w1 so the rig is p1), 1/60 s steps,
// from the rise's first frame to standing + 20 frames. Per case it reports the worst (largest) d for each leg, where, and how many frames d > tol.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_knee.mjs [outJson] [--flagoff]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN } from './rise_handoff_probe.mjs';

const OUT = process.argv[2]?.startsWith('--') || !process.argv[2] ? 'research/animation/getups-2026-10/knee/knee-audit.json' : process.argv[2];
const OFF = process.argv.includes('--flagoff');
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const TOL = 0.02; // rad (about 1 deg): below this is straight
// family -> how it is forced (lying, back-sell pain, opponent front = straight variant / behind = turn variant)
const CASES = [
    { id: 'backKneeHurt-turn', family: 'backKneeHurt', lying: 'supine', pain: false, opp: 'behind' },
    { id: 'backKneeHurt-straight', family: 'backKneeHurt', lying: 'supine', pain: false, opp: 'front' },
    { id: 'backKneeHurtBack-straight', family: 'backKneeHurt', lying: 'supine', pain: true, opp: 'front' },
    { id: 'backTuck', family: 'backTuck', lying: 'supine', pain: false, opp: 'front' },
    { id: 'frontKnee-turn', family: 'frontKnee', lying: 'prone', pain: false, opp: 'behind' },
    { id: 'frontKnee-straight', family: 'frontKnee', lying: 'prone', pain: false, opp: 'front' },
];

// in-page: the knee of both legs, twice. `handed` = the channels _applyGrounded is given (shin - thigh; key tables, stall droop, hold blend,
// hand routing); `drawn` = the angles it draws the legs with (_recordJointAttachment Hip / Knee: with T4.3's clamp these differ). Reading the
// parts' world rotations is not usable: the near and far images carry different base angles. d = shin - thigh, table convention:
// < 0 flexed, 0 straight, > 0 past straight. Under the clamp each frame is also drawn once unclamped (`_getUps` off, same hand pose: the
// legs do not depend on it) and then clamped, and the ankle and boot-bottom moves between the two are recorded (px, screen y down; a
// boot "lift" is its lowest point rising).
const WRAP = () => {
    const sk = window.__rw.skeleton;
    if (sk.__kneeWrapped) return;
    const orig = sk._applyGrounded.bind(sk), recOrig = sk._recordJointAttachment.bind(sk);
    let cap = null;
    sk._recordJointAttachment = (name, img, x, y, angle) => { if (cap && /^(near|far)(Hip|Knee)$/.test(name)) cap[name] = angle; return recOrig(name, img, x, y, angle); };
    const snap = () => {
        const out = {};
        for (const side of ['near', 'far']) {
            const b = sk[`${side}Boot`] ?? sk[`${side}Shin`], a = sk.jointAttachmentPoints?.[`${side}Ankle`]; // Lou and George paint the boot into the shin: no boot image
            let bottom = null;
            if (b?.visible) { const m = b.getWorldTransformMatrix(), fw = b.width, fh = b.height, ox = b.originX * fw, oy = b.originY * fh;
                bottom = Math.max(...[[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([p, q]) => m.b * p + m.d * q + m.ty)); }
            out[side] = { ax: a?.x ?? null, ay: a?.y ?? null, bottom };
        }
        let all = -1e9;
        for (const img of sk._parts) if (img.visible) { const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
            all = Math.max(all, ...[[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([p, q]) => m.b * p + m.d * q + m.ty)); }
        out.all = all;
        return out;
    };
    sk._applyGrounded = (x, y, s, facing, g) => {
        const handed = { near: g.nearShin - g.nearThigh, far: g.farShin - g.farThigh }, f = facing >= 0 ? 1 : -1;
        let before = null;
        if (sk._getUps) { sk._getUps = false; orig(x, y, s, facing, g); before = snap(); sk._getUps = true; }
        cap = {}; orig(x, y, s, facing, g); const after = snap(), c = cap; cap = null;
        const move = (side) => (before && before[side].ax !== null && after[side].ax !== null ? Math.hypot(after[side].ax - before[side].ax, after[side].ay - before[side].ay) : 0);
        const lift = (side) => (before && before[side].bottom !== null && after[side].bottom !== null ? before[side].bottom - after[side].bottom : 0);
        const foot = (o) => (o ? Math.max(o.near.bottom ?? -1e9, o.far.bottom ?? -1e9) - y : null); // lowest foot point vs the ground line y (+ = below it)
        sk.__lastG = { handed, drawn: { near: f * (c.nearKnee - c.nearHip), far: f * (c.farKnee - c.farHip) },
            footBelow: { before: foot(before), after: foot(after), body: after.all - y },
            ankleMove: { near: move('near'), far: move('far') }, bootLift: { near: lift('near'), far: lift('far') } };
    };
    sk.__kneeWrapped = true;
};
const KNEE = () => {
    const w = window.__rw, sk = w.skeleton, g = sk.__lastG;
    sk.__lastG = null; // a frame that does not go through _applyGrounded (standing) reports null
    const r4 = (v) => +v.toFixed(4);
    return { state: w.state, riseT: +(w.riseT ?? 0).toFixed(4), facing: w.facing,
        near: g ? r4(g.handed.near) : null, far: g ? r4(g.handed.far) : null,
        dnear: g ? r4(g.drawn.near) : null, dfar: g ? r4(g.drawn.far) : null,
        ankleMove: g ? +Math.max(g.ankleMove.near, g.ankleMove.far).toFixed(2) : null,
        bootLift: g ? +Math.max(g.bootLift.near, g.bootLift.far).toFixed(2) : null,
        footBefore: g?.footBelow.before != null ? +g.footBelow.before.toFixed(2) : null, footAfter: g ? +g.footBelow.after.toFixed(2) : null, bodyBelow: g ? +g.footBelow.body.toFixed(2) : null, bootSink: g ? +Math.max(-g.bootLift.near, -g.bootLift.far).toFixed(2) : null };
};

const results = [];
for (const [name, rig] of Object.entries(RIGS)) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    for (const c of CASES) {
        process.env.WFM_QS = OFF ? 'notitle=1' : `notitle=1&getups=v1&getup=${c.family}`;
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(400);
            await page.evaluate(INSTALL);
            await page.evaluate(WRAP);
            for (const facing of [-1, 1]) {
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: c.lying, pain: c.pain, facing, pose: 'stale', opp: c.opp });
                const id = await page.evaluate(() => window.__rw._getUp?.id ?? null);
                const rows = []; let standI = null;
                for (let i = 0; i < 400; i++) {
                    await page.evaluate(() => { const game = window.__WFM_GAME; window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); });
                    const k = await page.evaluate(KNEE);
                    rows.push({ i, ...k });
                    if (standI === null && k.state === 'standing') standI = i;
                    if (standI !== null && i - standI >= 20) break;
                }
                const worst = (key) => rows.reduce((m, r) => (r[key] !== null && r[key] > m.v ? { v: r[key], i: r.i, t: r.riseT, st: r.state } : m), { v: -9 });
                const over = (key) => rows.filter(r => r[key] !== null && r[key] > TOL).length;
                const maxOf = (key) => rows.reduce((m, r) => (r[key] !== null && r[key] > m.v ? { v: r[key], i: r.i, t: r.riseT, st: r.state } : m), { v: 0, i: -1 });
                const res = { rig: name, case: c.id, getUp: id, facing, frames: rows.length, standI, near: worst('near'), far: worst('far'), nearOver: over('near'), farOver: over('far'),
                    drawnNear: worst('dnear'), drawnFar: worst('dfar'), drawnNearOver: over('dnear'), drawnFarOver: over('dfar'),
                    ankleMove: maxOf('ankleMove'), bootLift: maxOf('bootLift'), bootSink: maxOf('bootSink'),
                    footBefore: maxOf('footBefore'), footAfter: maxOf('footAfter'), bodyBelow: maxOf('bodyBelow'), rows };
                results.push(res);
                console.log(`[knee] ${name.padEnd(6)} ${c.id.padEnd(26)} f${facing > 0 ? '+' : '-'} ${String(id).padEnd(22)} handed worst n ${res.near.v.toFixed(3)} f ${res.far.v.toFixed(3)} | DRAWN worst n ${res.drawnNear.v.toFixed(3)} f ${res.drawnFar.v.toFixed(3)} over ${res.drawnNearOver}/${res.drawnFarOver} | ankle move max ${res.ankleMove.v} px @${res.ankleMove.i}, foot lift ${res.bootLift.v} sink ${res.bootSink.v} | lowest foot vs ground y: before ${res.footBefore.v} after ${res.footAfter.v} (body ${res.bodyBelow.v})`);
            }
        } finally { await h.close(); }
    }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ flagOff: OFF, tol: TOL, results }, null, 1));
process.exit(0);
