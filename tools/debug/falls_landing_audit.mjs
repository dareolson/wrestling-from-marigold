// PLAN_FALLS T2.3 / T2.4c: joint and continuity audit of the landing, off the rows falls_probe.mjs wrote (drawn joints, 1/60 s). Rows carry the landing's own record
// (`land`: kind, intensity, incoming speed, seconds since contact, additive; `blend`: the ground blend is running), so the phases and the landing's end are the
// runtime's, not a fixed time. Rows from before T2.4c carry none: the audit falls back to the first `down` frame and says so (`runtimePhases: false`).
//   node tools/debug/falls_landing_audit.mjs <rowsDir> [out.json]
// Per run: contact (landing start) and the landing's actual end and duration; the phase of every landing frame (landingResponse's: compression / rebound / contact /
// settle); the first hop (commanded lift and drawn pelvis rise over its own take-off-to-landing baseline, wince excluded) and re-contact frames; each hand classed
// never supported / stayed / released / replanted (3 px line, from the contact frame; a hand already up at contact never released); signed flex of every knee and
// elbow against BOTH limits with no tolerance (knee JOINT_LIMITS, elbow the ordinary -0.12 floor and JOINT_LIMITS.elbow.max) and clamp hits (flex within CLAMP_EPS of a
// limit); and the largest joint step at each seam taken from the runtime transitions (fall -> landing, blend end, landing -> sell, sell start, landing end -> rest), kept
// apart from the velocity inside the impact window (the first 0.2 s after contact, where a fast frame is expected).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { landingResponse, flexChange } from '../../src/animation/falls.js';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';

const dir = process.argv[2], outFile = process.argv[3];
const F = 60, ELBOW_MIN = -0.12, HAND_LINE = 3, IMPACT_SEC = 0.2, CLAMP_EPS = 0.01, QUANT = 0.005;   // QUANT: the rows round joints to 0.01 px, so a drawn flex reads +-0.005 rad off; it is the measurement's grain, not a tolerance on the pose
const LIM = { knee: [JOINT_LIMITS.knee.min, JOINT_LIMITS.knee.max], elbow: [ELBOW_MIN, JOINT_LIMITS.elbow.max] };
const r1 = (v) => (v == null ? null : +v.toFixed(1)), r2 = (v) => (v == null ? null : +v.toFixed(2));
const hip = (p) => ({ x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), dot = (a, b) => a.x * b.x + a.y * b.y;
const stepOf = (A, B) => { let best = { px: 0, joint: null }; for (const k of Object.keys(A.pts)) if (B.pts[k]) { const s = Math.hypot(A.pts[k].x - B.pts[k].x, A.pts[k].y - B.pts[k].y); if (s > best.px) best = { px: s, joint: k }; } return best; };
// Signed flex of a joint from the drawn points. The bend's handedness is fixed per limb from the run's rest row (where every limb is bent the proper way, or straight and
// then the other limb of the pair decides), NOT re-chosen per frame from the torso normal: with the thigh pointing up (a drawn-up knee) that choice flipped and a real
// 2.4 rad knee read as -2.4 (+2 pi = 3.9). T2.5: found when a pinned 2.55 knee read 3.73.
const handOf = (v) => {
    const p = v.pts, t = sub(p.neck, hip(p)), n = v.facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
    const side = (a, b) => { const u = sub(b, a); return dot({ x: -u.y, y: u.x }, n) / Math.hypot(u.x, u.y); };
    const h = {};
    for (const j of ['Knee', 'Elbow']) {
        const [from, to] = j === 'Knee' ? ['Hip', 'Knee'] : ['Shoulder', 'Elbow'];
        const c = ['near', 'far'].map(sd => side(p[`${sd}${from}`], p[`${sd}${to}`]));
        const best = Math.abs(c[0]) >= Math.abs(c[1]) ? c[0] : c[1];
        for (let k = 0; k < 2; k++) h[`${['near', 'far'][k]}${j}`] = Math.sign(Math.abs(c[k]) >= 0.2 ? c[k] : best) || 1;
    }
    return h;
};
let HAND = null;
const flexes = (v) => {
    const p = v.pts, o = {};
    const flex = (a, b, c, hh) => { const u = sub(b, a), l = sub(c, b), q = { x: -hh * u.y, y: hh * u.x }; return Math.atan2(dot(l, q), dot(l, u)); };
    for (const sd of ['near', 'far']) {
        o[`${sd}Knee`] = -flex(p[`${sd}Hip`], p[`${sd}Knee`], p[`${sd}Ankle`], HAND[`${sd}Knee`]);
        o[`${sd}Elbow`] = flex(p[`${sd}Shoulder`], p[`${sd}Elbow`], p[`${sd}Wrist`], HAND[`${sd}Elbow`]);
    }
    return o;
};

const out = [];
for (const f of readdirSync(dir).filter(n => /^rows-.*\.json$/.test(n)).sort()) {
    const id = f.slice(5, -5), rows = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const restIdx = rows.findIndex(r => r.rest), s = rows[0].d.s;
    HAND = handOf(rows[restIdx].d);
    const runtimePhases = rows.some(r => r.d.land);
    const firstDown = rows.findIndex((r, i) => i > 0 && r.d.state === 'down' && rows[i - 1].d.state !== 'down');
    const contact = runtimePhases ? rows.findIndex(r => r.d.land) : firstDown;
    const h = (r) => (r.d.y - hip(r.d.pts).y) / s;
    const restH = h(rows[restIdx]);
    // the landing's actual end: the first frame after contact with no landing record (the response is done or something cleared it)
    const landEnd = runtimePhases ? (rows.findIndex((r, i) => i > contact && !r.d.land)) : Math.min(restIdx, contact + Math.round(0.6 * F));
    const landDur = r2((landEnd - contact) / F);
    const phaseOf = (r) => { const l = r.d.land; if (!l) return null; const x = landingResponse(l.kind, l.i, l.vy, l.t, l.tier); return { phase: x.phase, lift: x.lift }; };
    const phases = rows.map(r => phaseOf(r));
    const blendEnd = runtimePhases ? rows.findIndex((r, i) => i > contact && !r.d.blend) : null;
    const soldAt = rows.findIndex((r, i) => i > 0 && r.d.sold && !rows[i - 1].d.sold);
    const additive = runtimePhases ? !!rows[contact].d.land.add : null;
    // first hop: from the first 'rebound' frame to the frame the phase leaves 'rebound'. Commanded = landingResponse's lift; drawn = the pelvis over a straight line between the
    // frames before and after the hop (the blend base moves under it), so the drawn rise is the hop and not the ease. The wince (after the last contact) is not in the window.
    let firstHop = null;
    if (runtimePhases) {
        const a = phases.findIndex((p, i) => i >= contact && p?.phase === 'rebound');
        if (a > 0) {
            let b = a; while (b < rows.length && phases[b]?.phase === 'rebound') b++;
            const y0 = h(rows[a - 1]), y1 = h(rows[b]), span = b - (a - 1);
            let peak = 0, peakAt = a;
            for (let i = a; i < b; i++) { const base = y0 + (y1 - y0) * (i - (a - 1)) / span, rise = h(rows[i]) - base; if (rise > peak) { peak = rise; peakAt = i; } }
            firstHop = { from: a, to: b, commandedPx: r1(Math.max(...phases.slice(a, b).map(p => p.lift))), drawnPx: r1(peak), peakFrame: peakAt, recontactFrame: b };
        }
    }
    // contacts after the first, from the phases (the frames the response says the pelvis is back on the mat)
    const recontacts = runtimePhases ? phases.map((p, i) => (p && i > contact && p.phase !== 'rebound' && phases[i - 1]?.phase === 'rebound' ? i : null)).filter(v => v != null) : [];
    // hands: classified from the contact frame to the landing's end. Support = the lowest corner of the forearm part within HAND_LINE of the mat (a box, not a painted palm).
    const hand = {}, last = Math.min(landEnd, restIdx);
    for (const n of ['near', 'far']) {
        const gap = (r) => (r.d.hands[n] == null ? null : (r.d.y - r.d.hands[n]) / s);
        const g0 = gap(rows[contact]);
        let rel = null, rep = null;
        for (let i = contact; i <= last; i++) { const g = gap(rows[i]); if (g == null) continue; if (g0 != null && g0 <= HAND_LINE) { if (rel == null && g > HAND_LINE) rel = i; else if (rel != null && rep == null && g <= HAND_LINE) rep = i; } }
        const klass = g0 == null ? 'no part' : g0 > HAND_LINE ? (Math.min(...rows.slice(contact, last + 1).map(gap).filter(v => v != null)) <= HAND_LINE ? 'up at contact, planted later' : 'never supported') : rel == null ? 'stayed' : rep == null ? 'released' : 'released, replanted';
        hand[n] = { class: klass, gapAtContact: r1(g0), gapAtRest: r1(gap(rows[restIdx])), releaseFrame: rel, replantFrame: rep, maxGap: r1(Math.max(...rows.slice(contact, last + 1).map(gap).filter(v => v != null))) };
    }
    // flex: contact to rest, both limits, no tolerance; split into the landing and what follows it (the sell's frames)
    const fl = rows.map((r, i) => (i >= contact && i <= restIdx ? flexes(r.d) : null));
    const flexMin = {}, flexMax = {}, misses = [], clamps = {};
    for (const k of Object.keys(flexes(rows[contact].d))) {
        const [lo, hi] = LIM[k.endsWith('Knee') ? 'knee' : 'elbow'];
        const seq = fl.map((v, i) => (v ? { i, v: v[k] } : null)).filter(Boolean);
        flexMin[k] = r2(Math.min(...seq.map(q => q.v))); flexMax[k] = r2(Math.max(...seq.map(q => q.v)));
        // cause: the landing's own flex change at that frame (landingResponse, bend-only, >= 0) is taken off the drawn flex; a frame still outside the limit without it
        // belongs to the base under the offsets (the blend from the clip's body, or the sell's pose), a frame inside it was pushed out by the landing.
        const own = (q) => { const l = rows[q.i].d.land; if (!l) return 0; const jt = k.endsWith('Knee') ? 'knee' : 'elbow'; return flexChange(landingResponse(l.kind, l.i, l.vy, l.t, l.tier).d, jt, k.startsWith('near') ? 'near' : 'far'); };
        const bad = seq.filter(q => q.v < lo - QUANT || q.v > hi + QUANT), byLanding = bad.filter(q => q.v - own(q) >= lo - QUANT && q.v - own(q) <= hi + QUANT), inLand = (q) => q.i < landEnd;
        if (bad.length) misses.push(`${k} outside [${lo}, ${hi}] in ${bad.length} frames (min ${flexMin[k]}, max ${flexMax[k]}; ${byLanding.length} pushed out by the landing's offsets, ${bad.length - byLanding.length} already outside under them: ${bad.filter(q => !byLanding.includes(q)).map(q => rows[q.i].d.blend ? 'blend' : rows[q.i].d.sold ? 'sell' : 'base').filter((v, i, a) => a.indexOf(v) === i).join('/')}; frames ${bad[0].i}-${bad.at(-1).i})`);
        clamps[k] = seq.filter(q => Math.abs(q.v - lo) <= CLAMP_EPS || Math.abs(q.v - hi) <= CLAMP_EPS).length;
    }
    if (process.env.AUDIT_DUMP === id) for (let i = contact; i <= Math.min(landEnd + 3, restIdx); i++) console.log(i, phases[i]?.phase ?? '-', rows[i].d.blend ? 'blend' : '', rows[i].d.sold ? 'sold' : '', 'lift', r1(phases[i]?.lift ?? 0), Object.entries(fl[i]).map(([k, v]) => `${k} ${r2(v)}`).join('  '));
    const maxStep = (a, b) => { let m = { px: 0 }; for (let i = Math.max(1, a); i <= Math.min(b, rows.length - 1); i++) { const st = stepOf(rows[i - 1].d, rows[i].d); if (st.px > m.px) m = { ...st, frame: i }; } return { px: r1(m.px / s), joint: m.joint, frame: m.frame }; };
    const seam = (frame, label) => (frame > 0 && frame < rows.length ? { label, frame, px: r1(stepOf(rows[frame - 1].d, rows[frame].d).px / s) } : null);
    const impactEnd = contact + Math.round(IMPACT_SEC * F);
    out.push({
        id, runtimePhases, contact, landingEnd: landEnd, landingSec: landDur, additive, rest: restIdx, restPelvisPx: r1(restH), contactPelvisPx: r1(h(rows[contact])), pelvisAtContactVsRest: r1(h(rows[contact]) - restH),
        blendEnd, sellStart: soldAt > 0 ? soldAt : null,
        phases: runtimePhases ? Object.fromEntries(['compression', 'rebound', 'contact', 'settle'].map(ph => [ph, phases.filter(p => p?.phase === ph).length])) : null,
        rebound: { firstHop, recontactFrames: recontacts, heightPx: firstHop ? firstHop.drawnPx : 0 },
        hands: hand, flexMin, flexMax, clampHits: clamps, flexMisses: misses,
        steps: {
            note: 'px at s = 1, max over joints; impact window = the first 0.2 s after contact (velocity expected); seams are single frames at the runtime transitions',
            seams: [seam(contact, 'fall -> landing'), blendEnd > 0 ? seam(blendEnd, 'blend end') : null, soldAt > 0 ? seam(soldAt, 'sell start') : null, seam(landEnd, 'landing end -> sell/rest')].filter(Boolean),
            impactWindow: maxStep(contact + 1, impactEnd),
            afterImpactToRest: maxStep(impactEnd + 1, restIdx - 1),
        },
    });
}
if (outFile) writeFileSync(outFile, JSON.stringify(out, null, 1));
for (const r of out) console.log(JSON.stringify({ id: r.id, runtime: r.runtimePhases, contact: r.contact, land: `${r.landingSec}s end ${r.landingEnd}${r.additive ? ' additive' : ''}`, hop: r.rebound.firstHop && `cmd ${r.rebound.firstHop.commandedPx} drawn ${r.rebound.firstHop.drawnPx}`, recontact: r.rebound.recontactFrames, hands: Object.fromEntries(Object.entries(r.hands).map(([k, v]) => [k, `${v.class} gap ${v.gapAtContact}->${v.gapAtRest}`])), flexMin: r.flexMin, flexMax: r.flexMax, clamps: r.clampHits, misses: r.flexMisses, seams: r.steps.seams.map(q => `${q.label}@${q.frame} ${q.px}`), impact: r.steps.impactWindow.px, after: `${r.steps.afterImpactToRest.px}@${r.steps.afterImpactToRest.frame} ${r.steps.afterImpactToRest.joint}` }));
