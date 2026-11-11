// Real `_doArmBar` on a downed man, both pairings/facings, 1/60 s steps.
// Default: light=v1 candidate. LIGHT=0: legacy. NOFILM=1: stills/audit only.
// A 30 fps crop of every second game frame (<framesDir>/<case>/sNNNN.jpg, normal speed) and tight stills (still-<t>.png), the same framing as ankle_lock_audit.mjs.
//   node tools/debug/arm_bar_frames.mjs <framesDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, STEP } from './grapples_film.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const STILLS = [0.3, 0.9, 1.4, 1.95, 2.4, 2.7];
const SEP = +process.env.SEP || 70, framesDir = process.argv[2];

// T2.7: the attacker's lower body (thighs, shins, boots, trunks, pelvis layers) against the man's hips, legs and belly (his legs and the half of the torso image on the
// hip side of its midpoint, along hip -> neck). Same part-matrix redraw as grapples_masks.mjs; game px.
const INSTALL_LOWER = () => {
    const cv = [0, 1].map(() => document.createElement('canvas'));
    const mask = (i, w, ox, oy, cw, ch, only) => {
        const c = cv[i]; c.width = cw; c.height = ch;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        for (const img of w.skeleton._parts) {
            if (!img.visible || img.alpha <= 0 || !img.frame || !only(img)) continue;
            const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
            ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox, m.ty - oy); ctx.translate(-img.originX * fw, -img.originY * fh);
            if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
            if (img.flipY) { ctx.translate(0, fh); ctx.scale(1, -1); }
            ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        }
        const px = ctx.getImageData(0, 0, cw, ch).data, out = new Uint8Array(cw * ch);
        for (let k = 0; k < out.length; k++) out[k] = px[k * 4 + 3] > 128 ? 1 : 0;
        return out;
    };
    window.__lowerOverlap = (a, d) => {
        const ox = Math.floor(Math.min(a.x, d.x) - 240), oy = Math.floor(Math.min(a.y, d.y) - 340), cw = Math.ceil(Math.abs(a.x - d.x) + 480), ch = 420;
        const sa = a.skeleton, sd = d.skeleton, up = [sa.nearUpArm, sa.farUpArm, sa.nearForearm, sa.farForearm, sa.nearHand, sa.farHand, sa.head, sa.torso];
        const A = mask(0, a, ox, oy, cw, ch, i => !up.includes(i) || i === sa.torso);
        const legsOf = w => [w.skeleton.nearThigh, w.skeleton.farThigh, w.skeleton.nearShin, w.skeleton.farShin, w.skeleton.nearBoot, w.skeleton.farBoot];
        const P = sd.jointAttachmentPoints, hx = (P.nearHip.x + P.farHip.x) / 2, nx = P.neck.x, mid = (hx + nx) / 2;
        const lo = Math.min(hx, mid) - ox, hi = Math.max(hx, mid) - ox, L = mask(1, d, ox, oy, cw, ch, i => legsOf(d).includes(i)), T = mask(1, d, ox, oy, cw, ch, i => i === sd.torso);
        let legs = 0, belly = 0;
        for (let y = 0, k = 0; y < ch; y++) for (let x = 0; x < cw; x++, k++) if (A[k]) { if (L[k]) legs++; else if (T[k] && x >= lo && x <= hi) belly++; }
        return { legs, belly };
    };
};
const SETUP = ({ facing, sep }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234;
    Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing; a.x = 520; d.x = 520 + facing * sep * a.s;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    d.state = 'down'; d.lying = 'supine'; d.stateTimer = 99;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    a._doArmBar(d);
    return a._activeMove?.clip?.duration ?? null;
};
const TIME = () => { const sc = window.__WFM_GAME.scene.scenes[0]; return sc.w1._activeMove ? sc.w1._activeMove.time : null; };
const CROP = () => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width; const x = sc.w2.x, y = (sc.w1.y + sc.w2.y) / 2; return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k }; };
const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    const ap = a.skeleton.jointAttachmentPoints, dp = d.skeleton.jointAttachmentPoints;
    const side = d.skeleton.lChannelSide(d.facing), other = side === 'near' ? 'far' : 'near';
    const E = dp[side + 'Elbow'], W = dp[side + 'Wrist'];
    const palm = s => a.skeleton.partAnchorPoint(s + 'Forearm', 'clutch') ?? ap[s + 'Wrist'];
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const as = a.skeleton.lChannelSide(a.facing), ao = as === 'near' ? 'far' : 'near';
    const pinned = [];
    for (const [role, w] of [['a', a], ['d', d]]) for (const ch of ['lElbow', 'rElbow']) if (w.pose[ch] <= -2.995 || w.pose[ch] >= 2.745) pinned.push(role + '.' + ch);
    const knees = [];
    for (const w of [a, d]) for (const sd of ['near', 'far']) {
        const p = w.skeleton.jointAttachmentPoints, H = p[sd + 'Hip'], K = p[sd + 'Knee'], A = p[sd + 'Ankle'];
        let flex = -Math.atan2(((K.y-H.y)*(A.x-K.x)-(K.x-H.x)*(A.y-K.y))*w.facing, (K.x-H.x)*(A.x-K.x)+(K.y-H.y)*(A.y-K.y));
        if (flex < -2.6) flex += 2*Math.PI;
        knees.push(flex);
        if (flex <= -.095 || flex >= 2.545) pinned.push((w === a ? 'a' : 'd') + '.' + sd + 'Knee');
    }
    const mask = window.__maskOverlap(a, d), lower = window.__lowerOverlap(a, d);
    return { t: a._activeMove?.time, clip: a._activeMove?.clip.id,
        lower, mask: { below: mask.below, belowBody: mask.belowBody, torso: mask.torso, above: mask.above },
        kneeToMat: ['near', 'far'].map(sd => a.y - ap[sd + 'Knee'].y), ankleToMat: ['near', 'far'].map(sd => a.y - ap[sd + 'Ankle'].y), ax: a.x, ay: a.y,
        wristGap: dist(palm(as), W), forearmGap: dist(palm(ao), { x: E.x+(W.x-E.x)*.55, y: E.y+(W.y-E.y)*.55 }),
        geometry: { shoulder: ap[as+'Shoulder'], elbow: ap[as+'Elbow'], palm: palm(as), target: W },
        pinned, knees, ankles: [ap.nearAnkle, ap.farAnkle], torsoTilt: a.pose.tilt, defender: { x: d.x, y: d.y },
    };
};

for (const [pair, att, def] of PAIRS) {
    if (process.env.ONLY && !pair.startsWith(process.env.ONLY)) continue;
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1' + (process.env.LIGHT === '0' ? '' : '&light=v1');
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL); await h.page.evaluate(INSTALL_MASKS); await h.page.evaluate(INSTALL_LOWER);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`;
            const dur = await h.page.evaluate(SETUP, { facing, sep: SEP });
            mkdirSync(`${framesDir}/${id}`, { recursive: true });
            let clip = null, n = 0; const stills = new Set(); let frames = 0; const rows = [];
            for (let i = 0; i < 400; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const t = await h.page.evaluate(TIME);
                if (t === null) { if (frames) break; continue; }
                frames++;
                rows.push(await h.page.evaluate(READ));
                if (!clip) { const c = await h.page.evaluate(CROP); clip = { x: Math.max(0, c.x - 270), y: Math.max(0, c.y - 255), width: 540, height: 350 }; }
                if (!process.env.NOFILM && i % 2 === 0) await h.page.screenshot({ path: `${framesDir}/${id}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
                const st = STILLS.find(s => t >= s && !stills.has(s));
                if (st !== undefined) { stills.add(st); await h.page.screenshot({ path: `${framesDir}/${id}/still-${st}.png`, clip: { x: clip.x + 90, y: clip.y + 10, width: 360, height: 330 } }); }
            }
            const held = rows.filter(r => r.t >= 1.05 && r.t <= 3);
            const maxSlide = Math.max(0, ...held.slice(1).flatMap((r, i) => r.ankles.map((p, j) => Math.hypot(p.x-held[i].ankles[j].x, p.y-held[i].ankles[j].y))));
            const summary = { clip: rows[0].clip, frames, heldFrames: held.length, maxWristGap: Math.max(...held.map(r=>r.wristGap)), maxForearmGap: Math.max(...held.map(r=>r.forearmGap)), pinnedFrames: rows.filter(r=>r.pinned.length).length, maxHeldAnkleSlide: maxSlide, kneeRange: [Math.min(...rows.flatMap(r=>r.knees)), Math.max(...rows.flatMap(r=>r.knees))],
                heldLowerMax: { legs: Math.max(...held.map(r=>r.lower.legs)), belly: Math.max(...held.map(r=>r.lower.belly)) },
                heldMaskMax: { below: Math.max(...held.map(r=>r.mask.below)), belowBody: Math.max(...held.map(r=>r.mask.belowBody)), torso: Math.max(...held.map(r=>r.mask.torso)), above: Math.max(...held.map(r=>r.mask.above)) },
                heldKneeToMat: [0, 1].map(j => [Math.min(...held.map(r=>r.kneeToMat[j])), Math.max(...held.map(r=>r.kneeToMat[j]))].map(v => +v.toFixed(1))),
                heldAnkleToMat: [0, 1].map(j => [Math.min(...held.map(r=>r.ankleToMat[j])), Math.max(...held.map(r=>r.ankleToMat[j]))].map(v => +v.toFixed(1))),
                hipStep: [0, 50, 70, 150, 210].length && rows.slice(1).reduce((m, r, i) => Math.max(m, Math.abs(r.ax - rows[i].ax)), 0) };
            writeFileSync(`${framesDir}/${id}/audit.json`, JSON.stringify({ summary, rows }, null, 2));
            console.log(id, JSON.stringify(summary));
        }
    } finally { await h.close(); }
}
