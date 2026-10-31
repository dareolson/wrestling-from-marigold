// PLAN_GRAPPLES T1.11 (D13): the leg measures. All px at s = 1, along the facing, per leg. Geometry is read every frame from the
// skeleton's joint points; the trunks mask is sampled (every third film frame), and the page says which.
//
//   in page: await page.evaluate(INSTALL_LEGS); then window.__legs(w, trunksV | null) -> one record per man (trunksV = that rig's TRUNKS_V: masks it)
//   node:    legSummary(rows, idle) -> worst per phase, with frame and leg; legFails(summary) -> the threshold misses
//
// Definitions (the thresholds stand in for D13; Derek's eye decides it):
//   kneeLine   signed perpendicular distance of the knee from the hip-ankle line, positive toward the facing (null when hip to ankle < 1 px).
//              Pass: >= -0.5.   flex = (shin angle - thigh angle, wrapped to +-pi) * facing, beside it: a backward knee has flex > 0.
//   stagger    (near - far) * facing, horizontal, for ankles and knees; |value| tested. Pass: ankles >= 20, knees >= 14.
//   hipAngle   torso pitch - thigh pitch, each the angle from straight down in the world frame, signed + toward the facing, difference
//              wrapped to +-pi. Report only (idle is the reference).
//   trunks     share of the torso image's pixels (alpha >= 128) below TRUNKS_V that the same man's own thighs cover, in percent.
//              Pass: within 10 points of idle for that rig and facing. Masked samples only.
//   feet       sole y (painted `_soleAnchorFrac` of each shin, through the shin's world matrix) minus the root y, at s = 1.
//              Pass: each planted foot within 1.5 px of idle's. The stepping foot in the drive and break is exempt.
export const TRUNKS_V = { 'thesz-procreate-v1': 0.71, 'george-roster-v1': 0.68 };   // waistband's lowest edge as a share of the torso image height (read off the textures)
export const LIMITS = { kneeLine: -0.5, ankleStagger: 20, kneeStagger: 14, trunksPts: 10, sole: 1.5 };

export const INSTALL_LEGS = () => {
    const cv = [document.createElement('canvas'), document.createElement('canvas')];
    const draw = (ctx, img, clipV) => {
        const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
        ctx.save();
        ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - draw.ox, m.ty - draw.oy);
        ctx.translate(-img.originX * fw, -img.originY * fh);
        if (clipV !== undefined) { ctx.beginPath(); ctx.rect(0, clipV * fh, fw, fh); ctx.clip(); }
        if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
        ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        ctx.restore();
    };
    const mask = (i, w, imgs, clipV, W, H) => {
        const c = cv[i]; c.width = W; c.height = H;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, W, H);
        for (const img of imgs) if (img.visible) draw(ctx, img, clipV);
        const px = ctx.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
        for (let k = 0; k < out.length; k++) out[k] = px[k * 4 + 3] >= 128 ? 1 : 0;
        return out;
    };
    const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    window.__legs = (w, trunksV = null) => {
        const sk = w.skeleton, p = sk.jointAttachmentPoints, f = w.facing, s = w.s;
        const leg = (side) => {
            const H = p[`${side}Hip`], K = p[`${side}Knee`], A = p[`${side}Ankle`];
            const ux = A.x - H.x, uy = A.y - H.y, len = Math.hypot(ux, uy);
            const thigh = Math.atan2(K.x - H.x, K.y - H.y), shin = Math.atan2(A.x - K.x, A.y - K.y);
            return {
                kneeLine: len < 1 ? null : +(((K.x - H.x) * (uy / len) - (K.y - H.y) * (ux / len)) * f / s).toFixed(3),
                flex: +(wrap(shin - thigh) * f).toFixed(4), thigh: +(thigh * f).toFixed(4),
                hip: [+(H.x - w.x).toFixed(2), +(H.y - w.y).toFixed(2)], knee: [+(K.x - w.x).toFixed(2), +(K.y - w.y).toFixed(2)], ankle: [+(A.x - w.x).toFixed(2), +(A.y - w.y).toFixed(2)],
            };
        };
        const near = leg('near'), far = leg('far');
        const q = sk.torso, m = q.getWorldTransformMatrix(), fw = q.width, fh = q.height;
        const top = { x: m.a * (fw / 2 - q.originX * fw) + m.tx, y: m.b * (fw / 2 - q.originX * fw) + m.ty }, bot = { x: m.a * (fw / 2 - q.originX * fw) + m.c * (fh - q.originY * fh) + m.tx, y: m.b * (fw / 2 - q.originX * fw) + m.d * (fh - q.originY * fh) + m.ty };
        const torsoPitch = Math.atan2(bot.x - top.x, bot.y - top.y) * f;
        const sole = (shin) => {
            const a = shin._soleAnchorFrac, mm = shin.getWorldTransformMatrix(), lx = (shin.flipX ? 1 - a.u : a.u) * shin.width - shin.originX * shin.width, ly = a.v * shin.height - shin.originY * shin.height;
            return { x: +((mm.a * lx + mm.c * ly + mm.tx - w.x) / s).toFixed(2), y: +((mm.b * lx + mm.d * ly + mm.ty - w.y) / s).toFixed(2) };
        };
        const out = {
            near, far, torsoPitch: +torsoPitch.toFixed(4),
            hipAngle: { near: +wrap(torsoPitch - near.thigh).toFixed(4), far: +wrap(torsoPitch - far.thigh).toFixed(4) },
            stagger: { ankle: +((near.ankle[0] - far.ankle[0]) * f / s).toFixed(2), knee: +((near.knee[0] - far.knee[0]) * f / s).toFixed(2) },
            sole: { near: sole(sk.nearShin), far: sole(sk.farShin) },
            trunks: null,
        };
        if (trunksV !== null) {
            const v = trunksV;
            const W = 360, H = 360; draw.ox = Math.floor(w.x - W / 2); draw.oy = Math.floor(w.y - H + 40);
            const T = mask(0, w, [sk.torso], v, W, H), L = mask(1, w, [sk.nearThigh, sk.farThigh], undefined, W, H);
            let n = 0, c = 0; for (let k = 0; k < T.length; k++) if (T[k]) { n++; if (L[k]) c++; }
            out.trunks = { px: n, covered: c, share: n ? +(100 * c / n).toFixed(2) : null };
        }
        return out;
    };
};

// ---- node ------------------------------------------------------------------------------------------------------------------
// rows: STEP rows with `legs: { a, d }` (masks on some); idle: { a, d } the same record taken standing, same facing, same root y.
// Per man and phase: the worst of each measure with its frame and leg. `step` marks the stepping foot in the drive; the break exempts both.
const steppingFoot = (g) => (g && g.phase === 'drive' && g.step && g.step.u !== null ? (g.step.index % 2 === 0 ? 'near' : 'far') : null);
export function legSummary(rows, idle) {
    const out = { a: {}, d: {} }, wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    for (const side of ['a', 'd']) {
        const prev = {};
        for (const r of rows) {
            if (!r.locked || !r.legs) continue;
            const L = r.legs[side], I = idle[side], ph = r.g?.phase ?? 'locked', o = out[side][ph] ??= { frames: 0 };
            o.frames++;
            const keep = (k, v, rec, better) => { if (v !== null && (o[k] === undefined || better(v, o[k].v))) o[k] = { v: +v.toFixed(3), i: r.i, ...rec }; };
            for (const leg of ['near', 'far']) {
                keep('kneeLine', L[leg].kneeLine, { leg }, (a, b) => a < b);
                keep('flexMax', L[leg].flex, { leg }, (a, b) => a > b);
                keep('hipAngleMin', L.hipAngle[leg], { leg }, (a, b) => a < b);
                keep('hipAngleMax', L.hipAngle[leg], { leg }, (a, b) => a > b);
                const planted = ph === 'break' ? false : steppingFoot(r.g) !== leg;
                if (planted) keep('soleDelta', Math.abs(L.sole[leg].y - I.sole[leg].y), { leg }, (a, b) => a > b);
                // frame-to-frame change (rows are consecutive frames)
                const pv = prev[leg];
                if (pv) {
                    keep('snapHip', Math.abs(wrap(L.hipAngle[leg] - pv.hip)), { leg }, (a, b) => a > b);
                    if (L[leg].kneeLine !== null && pv.knee !== null) keep('snapKnee', Math.abs(L[leg].kneeLine - pv.knee), { leg }, (a, b) => a > b);
                }
                prev[leg] = { hip: L.hipAngle[leg], knee: L[leg].kneeLine };
            }
            keep('ankleStagger', Math.abs(L.stagger.ankle), {}, (a, b) => a < b);
            keep('kneeStagger', Math.abs(L.stagger.knee), {}, (a, b) => a < b);
            if (L.trunks?.share !== null && L.trunks) keep('trunksDelta', Math.abs(L.trunks.share - I.trunks.share), { share: L.trunks.share }, (a, b) => a > b);
        }
        out[side].idle = { kneeLine: [idle[side].near.kneeLine, idle[side].far.kneeLine], flex: [idle[side].near.flex, idle[side].far.flex], stagger: idle[side].stagger, hipAngle: idle[side].hipAngle, trunks: idle[side].trunks?.share ?? null, sole: idle[side].sole };
    }
    return out;
}

// The threshold misses of a summary: [{ side, phase, measure, value, i, leg }]
export function legFails(sum) {
    const fails = [];
    for (const side of ['a', 'd']) for (const [ph, o] of Object.entries(sum[side])) {
        if (ph === 'idle') continue;
        const t = (m, bad, x) => { if (x && bad(x.v)) fails.push({ side, phase: ph, measure: m, value: x.v, i: x.i, leg: x.leg ?? null }); };
        t('kneeLine', (v) => v < LIMITS.kneeLine, o.kneeLine);
        t('ankleStagger', (v) => v < LIMITS.ankleStagger, o.ankleStagger);
        t('kneeStagger', (v) => v < LIMITS.kneeStagger, o.kneeStagger);
        t('trunksDelta', (v) => v > LIMITS.trunksPts, o.trunksDelta);
        t('soleDelta', (v) => v > LIMITS.sole, o.soleDelta);
    }
    return fails;
}
