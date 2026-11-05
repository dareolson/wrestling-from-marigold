// PLAN_FALLS T2.3: joint and continuity audit of the landing, off the rows falls_probe.mjs wrote (drawn joints, 1/60 s). Per run: contact and re-contact frames, rebound height,
// each hand's release and replant (the hand part's lowest corner against the mat, 3 px line), signed knee/elbow flex min per joint (the audit's reading off the drawn joints,
// flex > 0 = bent the proper way; limits: knee -0.10, elbow -0.12 ordinary floor), and the largest joint step at each seam (fall -> landing, landing -> sell, landing end -> rest),
// separated from the velocity inside the impact window (the first 0.20 s after contact, where a fast frame is expected).
//   node tools/debug/falls_landing_audit.mjs <rowsDir> [out.json]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2], outFile = process.argv[3];
const F = 60, KNEE_MIN = -0.10, ELBOW_MIN = -0.12, HAND_LINE = 3, IMPACT_SEC = 0.2;
const r1 = (v) => (v == null ? null : +v.toFixed(1)), r2 = (v) => (v == null ? null : +v.toFixed(2));
const hip = (p) => ({ x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), dot = (a, b) => a.x * b.x + a.y * b.y;
const stepOf = (A, B) => { let best = { px: 0, joint: null }; for (const k of Object.keys(A.pts)) if (B.pts[k]) { const s = Math.hypot(A.pts[k].x - B.pts[k].x, A.pts[k].y - B.pts[k].y); if (s > best.px) best = { px: s, joint: k }; } return best; };
const flexes = (v) => {
    const p = v.pts, t = sub(p.neck, hip(p)), n = v.facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
    const flex = (a, b, c) => { const u = sub(b, a), l = sub(c, b); let q = { x: -u.y, y: u.x }; if (dot(q, n) < 0) q = { x: -q.x, y: -q.y }; return Math.atan2(dot(l, q), dot(l, u)); };
    const o = {};
    for (const sd of ['near', 'far']) {
        o[`${sd}Knee`] = -flex(p[`${sd}Hip`], p[`${sd}Knee`], p[`${sd}Ankle`]);
        o[`${sd}Elbow`] = flex(p[`${sd}Shoulder`], p[`${sd}Elbow`], p[`${sd}Wrist`]);
        if (o[`${sd}Knee`] < -2.6) o[`${sd}Knee`] += 2 * Math.PI;
        if (o[`${sd}Elbow`] < -2.9) o[`${sd}Elbow`] += 2 * Math.PI;
    }
    return o;
};

const out = [];
for (const f of readdirSync(dir).filter(n => /^rows-.*\.json$/.test(n)).sort()) {
    const id = f.slice(5, -5), rows = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const restIdx = rows.findIndex(r => r.rest), s = rows[0].d.s;
    const contact = rows.findIndex((r, i) => i > 0 && r.d.state === 'down' && rows[i - 1].d.state !== 'down');
    const h = (r) => (r.d.y - hip(r.d.pts).y) / s;
    const restH = h(rows[restIdx]);
    const end = Math.min(restIdx - 1, contact + Math.round(0.8 * F));
    // rebound: the pelvis against the contact frame's height (and the rest height); contacts = frames the pelvis is back within 0.5 px of its lowest since the last peak
    const base = Math.min(...rows.slice(contact, end + 1).map(h)), hs = rows.slice(contact, end + 1).map(h);
    let peaks = [], contacts = [contact];
    for (let i = 1; i < hs.length - 1; i++) { if (hs[i] > hs[i - 1] && hs[i] >= hs[i + 1] && hs[i] > base + 0.75) peaks.push({ frame: contact + i, rise: r2(hs[i] - base) }); }
    for (let i = 1; i < hs.length; i++) if (hs[i - 1] > base + 0.75 && hs[i] <= base + 0.75) contacts.push(contact + i);
    // hands: lowest corner above the mat line; release = first frame over HAND_LINE after contact, replant = the first frame back under it
    const hand = {};
    for (const n of ['near', 'far']) {
        const gap = (r) => (r.d.hands[n] == null ? null : (r.d.y - r.d.hands[n]) / s);
        let rel = null, rep = null;
        for (let i = contact; i <= end; i++) { const g = gap(rows[i]); if (g == null) continue; if (rel == null && g > HAND_LINE) rel = i; else if (rel != null && rep == null && g <= HAND_LINE) rep = i; }
        hand[n] = { gapAtContact: r1(gap(rows[contact])), gapAtRest: r1(gap(rows[restIdx])), releaseFrame: rel, replantFrame: rep, maxGap: r1(Math.max(...rows.slice(contact, end + 1).map(gap).filter(v => v != null))) };
    }
    // flex over the fall, the landing and the sell's first frames
    const win = rows.slice(contact, restIdx + 1), fl = win.map(r => flexes(r.d));
    const flexMin = {}, misses = [];
    for (const k of Object.keys(fl[0])) { flexMin[k] = r2(Math.min(...fl.map(v => v[k]))); const lim = k.endsWith('Knee') ? KNEE_MIN : ELBOW_MIN; const bad = fl.filter(v => v[k] < lim - 0.05).length; if (bad) misses.push(`${k} below ${lim} in ${bad} frames (min ${flexMin[k]})`); }
    // steps
    const impactEnd = contact + Math.round(IMPACT_SEC * F);
    const maxStep = (a, b) => { let m = { px: 0 }; for (let i = Math.max(1, a); i <= b; i++) { const st = stepOf(rows[i - 1].d, rows[i].d); if (st.px > m.px) m = { ...st, frame: i }; } return { px: r1(m.px / s), joint: m.joint, frame: m.frame }; };
    const soldAt = rows.findIndex((r, i) => i > contact && r.d.sold && !rows[i - 1].d.sold);
    const landEnd = contact + Math.round(0.6 * F);
    out.push({
        id, contact, rest: restIdx, restPelvisPx: r1(restH), contactPelvisPx: r1(h(rows[contact])), pelvisAtContactVsRest: r1(h(rows[contact]) - restH),
        rebound: { peaks, contactFrames: contacts, heightPx: peaks.length ? Math.max(...peaks.map(p => p.rise)) : 0, count: peaks.length },
        hands: hand, flexMin, flexMisses: misses,
        steps: {
            note: 'px at s = 1, max over joints; impact = the first 0.2 s after contact (velocity expected); seams are single frames',
            fallToLanding: contact > 0 ? { frame: contact, px: r1(stepOf(rows[contact - 1].d, rows[contact].d).px / s) } : null,
            impactWindow: maxStep(contact + 1, impactEnd),
            afterImpactToRest: maxStep(impactEnd + 1, restIdx - 1),
            sellStart: soldAt > 0 ? { frame: soldAt, px: r1(stepOf(rows[soldAt - 1].d, rows[soldAt].d).px / s) } : null,
            landingEnd: { frame: landEnd, px: r1(stepOf(rows[landEnd - 1].d, rows[landEnd].d).px / s) },
        },
    });
}
if (outFile) writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const r of out) console.log(JSON.stringify({ id: r.id, contact: r.contact, contactVsRest: r.pelvisAtContactVsRest, rebound: r.rebound, hands: Object.fromEntries(Object.entries(r.hands).map(([k, v]) => [k, `gap ${v.gapAtContact}->${v.gapAtRest} max ${v.maxGap} rel ${v.releaseFrame} rep ${v.replantFrame}`])), flexMin: r.flexMin, misses: r.flexMisses, steps: { fall: r.steps.fallToLanding?.px, impact: r.steps.impactWindow.px, after: r.steps.afterImpactToRest.px + '@' + r.steps.afterImpactToRest.frame + ' ' + r.steps.afterImpactToRest.joint, sell: r.steps.sellStart?.px, end: r.steps.landingEnd.px } }));
