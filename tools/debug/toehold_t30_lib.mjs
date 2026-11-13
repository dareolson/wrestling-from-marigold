// Shared by toehold_t30_stills.mjs and toehold_t30_video.mjs. The in-page functions are serialised by Playwright, so they must not close over anything in this file.
export const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
export const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
export const CROP_W = 520, CROP_H = 300;   // review crop: wide enough that no head, fist or boot is cut off

// ---- the fist sell, as data -------------------------------------------------------------------------------------------------
// Each arm cycles on PERIOD: touching the mat (down) -> lift -> hold up -> strike back to down. The two arms are half a period apart.
// def.fists = { l: { down: { arm, elbow }, up: { arm, elbow } }, r: {...} } comes from the per-case solve in the stills script.
export const PERIOD = .9, DEFAULT_FISTS = { l: { down: { arm: 2.5, elbow: .2 }, up: { arm: 3.0, elbow: .9 } }, r: { down: { arm: 2.5, elbow: .2 }, up: { arm: 3.0, elbow: .9 } } };
export const armKeys = (fist, phase, from, to) => {   // [[t, { arm, elbow }]] piecewise linear, constant down before the first lift
    const out = [[from, fist.down]];
    for (let c = phase; c < to + PERIOD; c += PERIOD) for (const [dt, v] of [[.14, 'down'], [.5, 'up'], [.6, 'up'], [.76, 'down']]) if (c + dt >= from) out.push([c + dt, fist[v]]);
    return out.sort((p, q) => p[0] - q[0]);
};
export const armAt = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = t1 === t0 ? 1 : (t - t0) / (t1 - t0); return { arm: a.arm + (b.arm - a.arm) * k, elbow: a.elbow + (b.elbow - a.elbow) * k }; }
    return keys[keys.length - 1][1];
};
// channel overrides {t: {lArm, lElbow, rArm, rElbow}} for every time the sell has a key, from..to
export const sellFrames = (fists = DEFAULT_FISTS, from = 0, to = 2, phase = from) => {
    const L = armKeys(fists.l, phase, from, to), R = armKeys(fists.r, phase + PERIOD / 2, from, to);
    const ts = [...new Set([...L, ...R].map(k => +k[0].toFixed(3)).filter(t => t >= from && t <= to).concat([from, to]))].sort((a, b) => a - b);
    return ts.map(t => { const l = armAt(L, t), r = armAt(R, t); return { at: t, ch: { lArm: l.arm, lElbow: l.elbow, rArm: r.arm, rElbow: r.elbow } }; });
};

export const SETUP = ({ facing, sep }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
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
    return true;
};
export const CROP = () => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width; const x = (sc.w1.x + sc.w2.x) / 2, y = (sc.w1.y + sc.w2.y) / 2; return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k }; };
export const GRIPPX = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, ds = d.skeleton.lChannelSide(d.facing), as = a.skeleton.lChannelSide(a.facing), ao = as === 'near' ? 'far' : 'near', dof = ds === 'near' ? 'far' : 'near';
    const P = d.skeleton.jointAttachmentPoints, past = k => ({ x: P[ds + 'Ankle'].x + (P[ds + 'Ankle'].x - P[ds + 'Knee'].x) * k, y: P[ds + 'Ankle'].y + (P[ds + 'Ankle'].y - P[ds + 'Knee'].y) * k });
    const palm = s => a.skeleton.partAnchorPoint(s + 'Forearm', 'clutch') ?? a.skeleton.jointAttachmentPoints[s + 'Wrist'], tgt = (s, n) => d.skeleton.partAnchorPoint(s + 'Shin', n) ?? past(n === 'heel' ? .15 : .4);
    const dist = (p, q) => p && q ? +Math.hypot(p.x - q.x, p.y - q.y).toFixed(1) : null;
    return { heel: dist(palm(as), tgt(ds, 'heel')), toe: dist(palm(ao), tgt(ds, 'toe')) };
};
export const STEPF = async () => { const game = window.__WFM_GAME; window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); };
export const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], out = {};
    for (const [role, w] of [['att', sc.w1], ['def', sc.w2]]) {
        const P = w.skeleton.jointAttachmentPoints;
        const knees = {}, pinned = [];
        for (const sd of ['near', 'far']) {
            const H = P[sd + 'Hip'], K = P[sd + 'Knee'], A = P[sd + 'Ankle'];
            let flex = -Math.atan2(((K.y - H.y) * (A.x - K.x) - (K.x - H.x) * (A.y - K.y)) * w.facing, (K.x - H.x) * (A.x - K.x) + (K.y - H.y) * (A.y - K.y));
            if (flex < -2.6) flex += 2 * Math.PI;
            knees[sd] = +flex.toFixed(2); if (flex <= -.095 || flex >= 2.545) pinned.push(sd + 'Knee');
        }
        for (const ch of ['lElbow', 'rElbow']) if (w.pose[ch] <= -2.995 || w.pose[ch] >= 2.745) pinned.push(ch);
        out[role] = { knees, pinned, lSide: w.skeleton.lChannelSide(w.facing), x: w.x, facing: w.facing, pose: Object.fromEntries(Object.entries(w.pose).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, +v.toFixed(3)])),
            pts: Object.fromEntries(['nearHip', 'farHip', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle', 'nearWrist', 'farWrist'].map(k => [k, P[k] ? { x: +P[k].x.toFixed(1), y: +P[k].y.toFixed(1) } : null])) };
    }
    return out;
};

// T3.0 r3 measures: where the held foot is against the attacker's hip, how much of it his body covers, his knees/seat/ankles against the mat line, the fists against the mat.
export const MASKS = () => {
    const cv = document.createElement('canvas');
    // alpha mask (1 = drawn) of the listed parts of one wrestler, in a window of world px
    window.__partsMask = (w, parts, ox, oy, cw, ch) => {
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, cw, ch);
        for (const img of parts) {
            if (!img || !img.visible || img.alpha <= 0 || !img.frame) continue;
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
};
export const METRICS = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, ap = a.skeleton.jointAttachmentPoints, dp = d.skeleton.jointAttachmentPoints, ds = d.skeleton.lChannelSide(d.facing);
    const hipY = (ap.nearHip.y + ap.farHip.y) / 2, ankle = dp[ds + 'Ankle'], sk = a.skeleton, bootImg = d.skeleton[ds + 'Shin'];
    const ox = Math.floor(Math.min(a.x, d.x) - 300), oy = 200, cw = 800, ch = 330;
    // the attacker's body (not his arms) drawn above the held boot
    const covers = ['torso', 'head', 'trunks', 'pelvisMask', 'pelvisOverlay', 'pelvisUnderlay', 'nearThigh', 'nearShin', 'nearBoot', 'farThigh', 'farShin', 'farBoot'].map(n => sk[n]).filter(i => i && bootImg && i.depth > bootImg.depth);
    // the boot is baked into the shin art, so "the foot" is the trapped shin's pixels within 28 px of the ankle
    const B = window.__partsMask(d, [d.skeleton[ds + 'Shin'], bootImg], ox, oy, cw, ch).slice(), C = window.__partsMask(a, covers, ox, oy, cw, ch);
    let boot = 0, hidden = 0; for (let k = 0; k < B.length; k++) if (B[k] && Math.hypot(k % cw + ox - ankle.x, Math.floor(k / cw) + oy - ankle.y) <= 28) { boot++; if (C[k]) hidden++; }
    const mat = d.y;   // the man never moves in y; the attacker's own y drops with `attY`
    return { footMinusHip: +(ankle.y - hipY).toFixed(1), bootPx: boot, bootCoveredPx: hidden,
        kneeToMat: ['near', 'far'].map(sd => +(mat - ap[sd + 'Knee'].y).toFixed(1)), ankleToMat: ['near', 'far'].map(sd => +(mat - ap[sd + 'Ankle'].y).toFixed(1)),
        kneeAboveAnkle: ['near', 'far'].map(sd => +(ap[sd + 'Ankle'].y - ap[sd + 'Knee'].y).toFixed(1)),
        seatToMat: +(mat - hipY).toFixed(1), hipY, mat };
};
// Fists. mat = lowest drawn row of the man's torso (the mat at his chest depth). A fist's contact point = the lowest drawn pixel of the hand alone: his forearm+hand pixels within HAND_R of the
// painted palm ('clutch' anchor, else the wrist joint), so the forearm cannot be what touches. rel = contact point minus mat (neg = above; contact = 0..4).
export const FISTS = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, sk = d.skeleton, ox = Math.floor(d.x - 300), oy = 200, cw = 800, ch = 330, HAND_R = 22;
    const low = M => { for (let y = ch - 1; y >= 0; y--) for (let x = 0; x < cw; x++) if (M[y * cw + x]) return y; return -1; };
    const matRow = low(window.__partsMask(d, [sk.torso], ox, oy, cw, ch)), out = { mat: matRow < 0 ? null : matRow + oy, lSide: sk.lChannelSide(d.facing) };
    for (const sd of ['near', 'far']) {
        const M = window.__partsMask(d, [sk[sd + 'Forearm'], sk[sd + 'Hand']], ox, oy, cw, ch), c = sk.partAnchorPoint(sd + 'Forearm', 'clutch') ?? sk.jointAttachmentPoints[sd + 'Wrist'];
        let lowY = -1;
        for (let y = ch - 1; y >= 0 && lowY < 0; y--) for (let x = 0; x < cw; x++) if (M[y * cw + x] && Math.hypot(x + ox - c.x, y + oy - c.y) <= HAND_R) { lowY = y; break; }
        out[sd] = lowY < 0 || matRow < 0 ? null : +(lowY + oy - (matRow + oy)).toFixed(1);
    }
    return out;
};

// Runs of consecutive frames in 0..4 px, per arm, over the preview; a strike counts when the run is >= 3 frames and a lift (< -15) came before it.
export const fistSummary = series => Object.fromEntries(['near', 'far'].map(sd => {
    const v = series.map(x => x[sd]).filter(x => x !== null), runs = []; let run = 0, lifted = false, strikes = 0;
    for (const x of series.map(x => x[sd])) {
        if (x !== null && x >= 0 && x <= 4) run++; else { if (run >= 3 && lifted) strikes++; if (run) runs.push(run); run = 0; }
        if (x !== null && x < -15) lifted = true;
    }
    if (run >= 3 && lifted) strikes++; if (run) runs.push(run);
    return [sd, { strikes, contactFrames: series.filter(x => x[sd] !== null && x[sd] >= 0 && x[sd] <= 4).length, longestRun: Math.max(0, ...runs), highestLift: Math.min(...v), deepest: Math.max(...v) }];
}));

