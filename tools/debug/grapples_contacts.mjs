// PLAN_GRAPPLES T1.2: contact measurements for the tie-up, held in the `even` pose with every grip at weight 1.
//   WFM_URL=http://localhost:5173 WFM_QS='grapples=v1&notitle=1' node tools/debug/grapples_contacts.mjs [gap=70] [out.json]
// Per rig pairing (Lou attacker vs George, George attacker vs Lou), per facing of the attacker: hand-to-target px per grip,
// collar elbow flex, head gap, over 30 held frames after 20 settling frames.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';

const gaps = (process.argv[2] ?? 'auto').split(',').map(x => (x === 'auto' ? x : Number(x)));
const outFile = process.argv[3];
const LOU = 'thesz-procreate-v1', GEORGE = process.env.WFM_GEORGE ?? 'george-roster-v1';
const PAIRS = [[LOU, GEORGE], [GEORGE, LOU]];
const rows = [];
for (const [ra, rd] of PAIRS) {
    const prev = [process.env.WFM_P1, process.env.WFM_P2];
    process.env.WFM_P1 = ra; process.env.WFM_P2 = rd;
    const h = await launch();
    await h.page.waitForTimeout(3500);
    for (const gap of gaps) for (const facing of [1, -1]) {
        const res = await h.page.evaluate(async ({ gap, facing, armsArg }) => {
            const { LOCKUP, LOCKUP_ARMS, lockupPoseChannels, lockupGrips, holdGapFor } = await import('/src/animation/lockup.js');
            const { grapplesCandidate } = await import('/src/Wrestler.js');
            const game = window.__WFM_GAME, sc = game.scene.scenes[0];
            game.loop.sleep(); sc._p1AI = null; sc._p2AI = null;
            const a = sc.w1, d = sc.w2;
            for (const w of [a, d]) { w.state = 'standing'; w.stamina = 100; w.vx = 0; w.scene.tweens.killTweensOf(w.pose); }
            a.y = d.y = 400; a.facing = facing; d.facing = -facing;
            const mid = 520, s = a.s;
            if (gap === 'auto') { gap = holdGapFor(sc._lockupArmLength(a)); a.x = mid - facing * gap * s / 2; d.x = mid + facing * gap * s / 2; }
            a.x = mid - facing * gap * s / 2; d.x = mid + facing * gap * s / 2;
            a.state = d.state = 'lockup';
            sc.lockupState = { attacker: a, defender: d, timer: 0, grapple: { seed: 1, t: 0, stealAt: null, breakAt: null, grips: { attacker: { collar: 1, elbow: 1 }, defender: { collar: 1, elbow: 1 } } } };
            // Hold the pair at exactly `gap` (what the T1.3 flag branch of _tickLockup does) instead of the legacy 100*s tween.
            sc._tickLockup = () => { a.x = mid - facing * gap * s / 2; d.x = mid + facing * gap * s / 2; };
            const [A0, E0] = armsArg ? armsArg.split(',').map(Number) : [LOCKUP_ARMS.arm, LOCKUP_ARMS.elbow];
            const arms = { lArm: A0, rArm: A0, lElbow: E0, rElbow: E0, tilt: 0, lift: 0, bend: 0 };
            const setPose = () => {
                for (const w of [a, d]) {
                    const lSide = w.skeleton.lChannelSide(w.facing);
                    Object.assign(w.pose, arms, lockupPoseChannels({ even: 1, attacker: 0, defender: 0 }, lSide));
                }
            };
            let T = performance.now();
            const frame = () => { sc.lockupState.timer = 0; setPose(); T += 1000 / 60; game.step(T, 1000 / 60); };
            for (let i = 0; i < 20; i++) frame();
            const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
            const ang = (p, q) => Math.atan2(q.y - p.y, q.x - p.x);
            const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
            const worst = {}, flex = { min: 9, max: -9 }, heads = [], necks = [], unreachable = {};
            const nearOf = (w) => w.skeleton.lChannelSide(w.facing) === 'near' ? 'l' : 'r';
            for (let i = 0; i < 30; i++) {
                frame();
                const lists = lockupGrips(a, d, sc.lockupState.grapple.grips);
                for (const [role, actor] of [['attacker', a], ['defender', d]]) {
                    const pts = actor.skeleton.jointAttachmentPoints;
                    for (const g of lists[role]) {
                        const handSide = g.arm === 'l' ? actor.skeleton.lChannelSide(actor.facing) : (actor.skeleton.lChannelSide(actor.facing) === 'near' ? 'far' : 'near');
                        const target = g.at ?? g.partner.skeleton.jointAttachmentPoints[`${handSide}${g.joint}`];
                        const err = dist(pts[`${handSide}Wrist`], target);
                        const k = `${role}.${g.joint === 'Neck' ? 'collar' : 'elbow'}`;
                        worst[k] = Math.max(worst[k] ?? 0, err);
                        if (err > 3) unreachable[k] = (unreachable[k] ?? 0) + 1;
                    }
                }
                const sk = a.skeleton, p = sk.jointAttachmentPoints, side = a.skeleton.lChannelSide(a.facing) === 'near' ? 'near' : 'far';
                // Attacker's collar arm is its near-camera arm: its elbow flex.
                const S = p.nearShoulder, E = p.nearElbow, W = p.nearWrist;
                const f = Math.abs(wrap(ang(E, W) - ang(S, E)));
                flex.min = Math.min(flex.min, f); flex.max = Math.max(flex.max, f);
                const hx = (w) => (w.skeleton.head ? { x: w.skeleton.head.x, y: w.skeleton.head.y } : w.skeleton.jointAttachmentPoints.neck);
                heads.push(dist(hx(a), hx(d)) / a.s);
                necks.push(Math.abs(a.skeleton.jointAttachmentPoints.neck.x - d.skeleton.jointAttachmentPoints.neck.x) / a.s);
            }
            const pp = a.skeleton.jointAttachmentPoints, armLen = (Math.hypot(pp.nearElbow.x - pp.nearShoulder.x, pp.nearElbow.y - pp.nearShoulder.y) + Math.hypot(pp.nearWrist.x - pp.nearElbow.x, pp.nearWrist.y - pp.nearElbow.y)) / a.s;
            const draw = { aOutline: null };
            return { gapUsed: gap, armLen, worst, unreachable, flex, headGap: { min: Math.min(...heads), max: Math.max(...heads) }, neckGapX: { min: Math.min(...necks), max: Math.max(...necks) }, s: a.s, lSide: a.skeleton.lChannelSide(a.facing), lSideD: d.skeleton.lChannelSide(d.facing) };
        }, { gap, facing, armsArg: process.env.ARMS });
        if (process.env.SHOT) await h.screenshot(process.env.SHOT.replace('.png', `-${ra.slice(0, 4)}-${facing > 0 ? 'R' : 'L'}-${gap}.png`));
        rows.push({ attacker: ra, defender: rd, facing, gap: res.gapUsed ?? gap, ...res });
        const r = rows.at(-1), f2 = (x) => x.toFixed(1);
        console.log(`${ra.slice(0, 4)}>${rd.slice(0, 4)} f${facing > 0 ? 'R' : 'L'} gap ${r.gapUsed.toFixed(1)}: collar err A ${f2(r.worst['attacker.collar'])} D ${f2(r.worst['defender.collar'])} | elbow err A ${f2(r.worst['attacker.elbow'])} D ${f2(r.worst['defender.elbow'])} | unreach ${JSON.stringify(r.unreachable)} | flex ${r.flex.min.toFixed(2)}-${r.flex.max.toFixed(2)} | armLen ${f2(r.armLen)} | head gap ${f2(r.headGap.min)} neckX ${f2(r.neckGapX.min)} | lSide A ${r.lSide} D ${r.lSideD}`);
    }
    await h.close();
    [process.env.WFM_P1, process.env.WFM_P2] = prev;
}
if (outFile) writeFileSync(outFile, JSON.stringify(rows, null, 1));
