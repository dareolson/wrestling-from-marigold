// Pure measurements over a sample.mjs trace. Nothing here touches a browser,
// so every number can be unit-tested and recomputed after a refinement pass.
//
// Distances are reported in px of the editor view AND as a fraction of the
// actor's standing height (`h`), so thresholds mean the same on every rig.
//
// What a machine can grade here is physical plausibility — feet, floor,
// contact, continuity, timing of the hit. Whether a pose READS is not in this
// file; the contact sheet is for that.

const ROLES = ['attacker', 'defender'];
const LIMB_ENDS = ['nearWrist', 'farWrist', 'nearAnkle', 'farAnkle'];
const TRACKED = ['neck', 'nearShoulder', 'farShoulder', 'nearHip', 'farHip', 'nearElbow', 'farElbow',
    'nearWrist', 'farWrist', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle'];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const allPoints = actor => Object.values(actor.outline).flat();
const lowestY = points => points.reduce((m, p) => Math.max(m, p[1]), -Infinity);
// Lou and George paint the boot into the shin image; the reference rig has a
// separate boot part.
const footPoints = (actor, side) => actor.outline[`${side}Boot`] ?? actor.outline[`${side}Shin`];

/** Standing height of each role, from its first frame: floor to top of paint. */
export function standingHeights(trace) {
    const first = trace.frames[0].actors;
    return Object.fromEntries(ROLES.map(role => {
        const a = first[role];
        const top = allPoints(a).reduce((m, p) => Math.min(m, p[1]), Infinity);
        return [role, a.floorY - top];
    }));
}

/**
 * How far each actor's STANDING feet paint below its floor line in frame 0.
 * In a three-quarter view the near edge of a sole paints below the contact
 * line (George's by ~20px, Lou's by ~4px), so the lowest painted pixel is
 * not where a body meets the mat; every floor test is offset by this.
 */
export function soleOverhang(trace) {
    const first = trace.frames[0].actors;
    return Object.fromEntries(ROLES.map(role => {
        const a = first[role];
        const feet = ['near', 'far'].map(side => footPoints(a, side)).filter(Boolean);
        return [role, Math.max(0, ...feet.map(pts => lowestY(pts) - a.floorY))];
    }));
}
const matY = (actor, role, overhang) => actor.floorY + (overhang?.[role] ?? 0);

/** Per frame: how far painted pixels go below the actor's (calibrated) mat line. */
export function floorPenetration(trace, { tolerance = 0.012 } = {}) {
    const h = standingHeights(trace);
    const over = soleOverhang(trace);
    const out = {};
    for (const role of ROLES) {
        const tol = tolerance * h[role];
        let worst = 0, worstAt = 0, worstPart = null, frames = 0;
        for (const f of trace.frames) {
            const a = f.actors[role];
            let deepest = 0, part = null;
            for (const [name, pts] of Object.entries(a.outline)) {
                const d = lowestY(pts) - matY(a, role, over);
                if (d > deepest) { deepest = d; part = name; }
            }
            if (deepest > tol) frames++;
            if (deepest > worst) { worst = deepest; worstAt = f.at; worstPart = part; }
        }
        out[role] = { worstPx: worst, worstFrac: worst / h[role], worstAt, worstPart, frames };
    }
    return out;
}

// A boot is "on the mat" when its paint reaches within `near` of the floor.
function bootGrounded(actor, side, near, floor) {
    const pts = footPoints(actor, side);
    return pts ? lowestY(pts) >= floor - near : false;
}

/**
 * Foot slide: horizontal travel of a boot's lowest painted point while it stays
 * on the mat. A planted foot should not skate; a step lifts it first.
 */
export function footSlide(trace, { near = 0.015, ignoreBelow = 0.004 } = {}) {
    const h = standingHeights(trace);
    const over = soleOverhang(trace);
    const out = {};
    for (const role of ROLES) {
        const tol = near * h[role];
        const spans = [];
        for (const side of ['near', 'far']) {
            let span = null;
            for (let i = 1; i < trace.frames.length; i++) {
                const prev = trace.frames[i - 1].actors[role], cur = trace.frames[i].actors[role];
                const planted = bootGrounded(prev, side, tol, matY(prev, role, over)) && bootGrounded(cur, side, tol, matY(cur, role, over));
                if (!planted) { if (span) spans.push(span); span = null; continue; }
                const solePrev = soleX(prev, side), soleCur = soleX(cur, side);
                const dx = Math.abs(soleCur - solePrev);
                span ??= { side, from: trace.frames[i - 1].at, to: 0, slidePx: 0 };
                span.to = trace.frames[i].at;
                span.slidePx += dx;
            }
            if (span) spans.push(span);
        }
        const bad = spans.filter(s => s.slidePx / h[role] > ignoreBelow * 4);
        const total = spans.reduce((t, s) => t + s.slidePx, 0);
        out[role] = { totalPx: total, totalFrac: total / h[role], worst: bad.sort((a, b) => b.slidePx - a.slidePx)[0] ?? null, spans: bad };
    }
    return out;
}

function soleX(actor, side) {
    const pts = footPoints(actor, side);
    const bottom = lowestY(pts);
    const low = pts.filter(p => p[1] >= bottom - 3);
    return low.reduce((s, p) => s + p[0], 0) / low.length;
}

/**
 * Support: frames where an actor touches neither the mat nor the partner.
 * Unsupported bodies are fine in a flight; in a hold or a throw they are a
 * floating body. `airborne` lists [from, to] spans the move intends as flight.
 */
export function support(trace, { near = 0.02, touch = 0.04, airborne = {} } = {}) {
    const h = standingHeights(trace);
    const over = soleOverhang(trace);
    const out = {};
    for (const role of ROLES) {
        const other = ROLES.find(r => r !== role);
        const spans = [];
        let span = null;
        for (const f of trace.frames) {
            const a = f.actors[role], b = f.actors[other];
            const grounded = lowestY(allPoints(a)) >= matY(a, role, over) - near * h[role];
            const held = minGap(a, b) <= touch * h[role];
            const intended = (airborne[role] ?? []).some(([s, e]) => f.at >= s && f.at <= e);
            const floating = !grounded && !held && !intended;
            if (floating) { span ??= { from: f.at, to: f.at }; span.to = f.at; }
            else if (span) { spans.push(span); span = null; }
        }
        if (span) spans.push(span);
        out[role] = { floatingSec: spans.reduce((t, s) => t + (s.to - s.from), 0), spans };
    }
    return out;
}

// Closest approach between the two actors' painted outlines (sampled points).
function minGap(a, b) {
    const pa = allPoints(a), pb = allPoints(b);
    let best = Infinity;
    for (let i = 0; i < pa.length; i += 2) for (let j = 0; j < pb.length; j += 2) {
        const d = Math.hypot(pa[i][0] - pb[j][0], pa[i][1] - pb[j][1]);
        if (d < best) best = d;
    }
    return best;
}

/**
 * Pops: a joint jumping much further in one frame than it moves around it.
 * Also velocity hitches: an abrupt speed change, typically a linear key.
 */
export function continuity(trace, { popFrac = 0.035, hitchFrac = 0.025 } = {}) {
    const h = standingHeights(trace);
    const out = {};
    for (const role of ROLES) {
        const pops = [], hitches = [];
        for (const joint of TRACKED) {
            const p = trace.frames.map(f => f.actors[role].joints[joint]).filter(Boolean);
            if (p.length !== trace.frames.length) continue;
            const v = [];
            for (let i = 1; i < p.length; i++) v.push({ x: p[i].x - p[i - 1].x, y: p[i].y - p[i - 1].y });
            for (let i = 0; i < v.length; i++) {
                const step = Math.hypot(v[i].x, v[i].y);
                const around = [v[i - 2], v[i - 1], v[i + 1], v[i + 2]].filter(Boolean).map(s => Math.hypot(s.x, s.y));
                const typical = around.sort((a, b) => a - b)[Math.floor(around.length / 2)] ?? 0;
                if (step > popFrac * h[role] && step > 3 * typical) pops.push({ joint, at: trace.frames[i + 1].at, px: step });
                if (i > 0) {
                    const dv = Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y);
                    if (dv > hitchFrac * h[role]) hitches.push({ joint, at: trace.frames[i].at, px: dv });
                }
            }
        }
        out[role] = { pops, hitches, hitchTimes: [...new Set(hitches.map(x => x.at))] };
    }
    return out;
}

// Anatomical joint names. `lKnee`/`rAnkle` name the limb by pose channel, which
// is the same limb in both facings; `lSide` (Skeleton.lChannelSide) says
// whether the l channels draw on the near or the far slot for that actor, so
// the name resolves to nearKnee/farKnee only at measurement time. Near/far
// names pass through untouched.
const ANATOMICAL = /^([lr])(Shoulder|Elbow|Wrist|Hip|Knee|Ankle)$/;
export function resolveJointName(name, lSide) {
    const m = ANATOMICAL.exec(name);
    if (!m) return name;
    const l = lSide ?? 'near';
    const side = m[1] === 'l' ? l : (l === 'near' ? 'far' : 'near');
    return `${side}${m[2]}`;
}
// lSide of one role at one frame: the frame's own record (facing can change
// mid-clip), else the trace meta, else the facing-right default.
const lSideOf = (trace, frame, role) => frame.actors[role].lSide ?? trace.meta.lSide?.[role] ?? 'near';

function pointToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/**
 * Declared contacts (draft.contacts) and spec contacts: worst gap in the window.
 * A contact may carry `tol` (fraction of the source actor's height; default
 * DEFAULT_TOL) and `kind` ('purchase' | 'trap' | 'brace' | 'support'); the row
 * reports both plus pass/fail. `source` and the joints of `target` may be
 * anatomical (`lAnkle`), and `target` may be `seg:<jointA>-<jointB>`: the
 * distance to the nearest point of that drawn segment.
 */
export const DEFAULT_TOL = 0.08;
export function contacts(trace, specs = []) {
    const h = standingHeights(trace);
    const declared = (trace.meta.contacts ?? []).map(c => ({ ...c, label: `${c.role} ${c.source}→${c.target}` }));
    return [...declared, ...specs].map(c => {
        const partner = c.role === 'attacker' ? 'defender' : 'attacker';
        let worst = 0, worstAt = c.from, worstIndex = null, n = 0;
        trace.frames.forEach((f, index) => {
            if (f.at < c.from || f.at > c.to) return;
            const src = f.actors[c.role].joints[resolveJointName(c.source, lSideOf(trace, f, c.role))];
            const d = contactGap(f.actors[partner], c.target, src, lSideOf(trace, f, partner));
            if (!src || d == null) return;
            n++;
            if (d > worst) { worst = d; worstAt = f.at; worstIndex = index; }
        });
        const tol = c.tol ?? DEFAULT_TOL;
        return { label: c.label ?? `${c.role} ${c.source}→${c.target}`, from: c.from, to: c.to, frames: n,
            worstPx: worst, worstFrac: worst / h[c.role], worstAt, worstIndex,
            kind: c.kind ?? null, tol, pass: n > 0 && worst / h[c.role] <= tol };
    });
}

// Distance from `src` to a contact target on `actor`: a segment, or a point.
function contactGap(actor, target, src, lSide) {
    if (!src) return null;
    const seg = /^seg:([A-Za-z]+)-([A-Za-z]+)$/.exec(target);
    if (seg) {
        const a = actor.joints[resolveJointName(seg[1], lSide)], b = actor.joints[resolveJointName(seg[2], lSide)];
        return a && b ? pointToSegment(src, a, b) : null;
    }
    const tgt = targetPoint(actor, resolveJointName(target, lSide));
    return tgt ? dist(src, tgt) : null;
}

// Named contact points (Codex review, finding 1: solve and grade against the
// SAME definition). `fist:near|far` is the centre of the painted fist: on
// Lou and George the hand is painted into the forearm image and the "wrist"
// joint sits at its far end (the knuckles), so the fist centre is a little
// back from it toward the elbow (12% of the forearm); `face` is the
// front of the painted head — the head outline's points in its leading
// quarter (toward where the actor faces), middle band — not the head image's
// origin, which sits at the neck.
export function namedPoint(actor, name) {
    const fist = name.match(/^fist:(near|far)$/);
    if (fist) {
        const e = actor.joints[`${fist[1]}Elbow`], w = actor.joints[`${fist[1]}Wrist`];
        if (!e || !w) return null;
        return { x: w.x - (w.x - e.x) * 0.12, y: w.y - (w.y - e.y) * 0.12 };
    }
    if (name === 'face') {
        const pts = actor.outline.head;
        if (!pts?.length) return null;
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const front = actor.facing >= 0 ? x1 - (x1 - x0) * 0.25 : x0 + (x1 - x0) * 0.25;
        const band = pts.filter(p => (actor.facing >= 0 ? p[0] >= front : p[0] <= front) && p[1] > y0 + (y1 - y0) * 0.3 && p[1] < y0 + (y1 - y0) * 0.75);
        if (!band.length) return null;
        return { x: band.reduce((t, p) => t + p[0], 0) / band.length, y: band.reduce((t, p) => t + p[1], 0) / band.length };
    }
    return null;
}

// A contact target may be a joint, a named point, or a part's painted centroid ("part:head").
function targetPoint(actor, target) {
    const named = namedPoint(actor, target);
    if (named) return named;
    if (target.startsWith('part:')) {
        const pts = actor.outline[target.slice(5)];
        if (!pts?.length) return null;
        return { x: pts.reduce((s, p) => s + p[0], 0) / pts.length, y: pts.reduce((s, p) => s + p[1], 0) / pts.length };
    }
    return actor.joints[target] ?? null;
}

/**
 * Impact timing: at each `impact` event, how close the striking limb is to its
 * target, and whether the strike is at its reach (speed near its peak, or the
 * limb at max extension) rather than still loading.
 */
export function impacts(trace, strikes = []) {
    const h = standingHeights(trace);
    const events = (trace.meta.events ?? []).filter(e => e.type === 'impact');
    return events.flatMap(event => strikes.map(s => {
        const partner = s.role === 'attacker' ? 'defender' : 'attacker';
        const series = trace.frames.map(f => {
            const a = f.actors[s.role], src = namedPoint(a, s.source) ?? a.joints[s.source], tgt = targetPoint(f.actors[partner], s.target);
            const limb = s.source.startsWith('fist:') ? `${s.source.slice(5)}Wrist` : s.source;
            const root = a.joints[limb.replace(/Wrist$/, 'Shoulder').replace(/Ankle$/, 'Hip')];
            return { at: f.at, gap: src && tgt ? dist(src, tgt) : null, reach: src && root ? dist(src, root) : null };
        });
        const at = series.reduce((best, x) => Math.abs(x.at - event.at) < Math.abs(best.at - event.at) ? x : best);
        const closest = series.filter(x => x.gap != null).reduce((b, x) => x.gap < b.gap ? x : b);
        const maxReach = Math.max(...series.map(x => x.reach ?? 0));
        return { event: event.at, strike: `${s.role} ${s.source}→${s.target}`,
            gapPx: at.gap, gapFrac: at.gap / h[s.role],
            reachFrac: at.reach / maxReach,
            closestAt: closest.at, offsetSec: closest.at - event.at };
    }));
}

/** Overlap: frames where the two torsos' painted outlines interpenetrate deeply. */
export function bodyOverlap(trace, { parts = ['torso', 'head'], deep = 0.06 } = {}) {
    const h = standingHeights(trace);
    let worst = 0, worstAt = 0, frames = 0;
    for (const f of trace.frames) {
        const centers = ROLES.map(r => parts.map(p => {
            const pts = f.actors[r].outline[p];
            if (!pts) return null;
            const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
            const rad = Math.min(...['x', 'y'].map((_, k) => (Math.max(...pts.map(q => q[k])) - Math.min(...pts.map(q => q[k]))) / 2));
            return { cx, cy, rad };
        }).filter(Boolean));
        let depth = 0;
        for (const a of centers[0]) for (const b of centers[1]) {
            depth = Math.max(depth, a.rad + b.rad - Math.hypot(a.cx - b.cx, a.cy - b.cy));
        }
        const frac = depth / Math.min(h.attacker, h.defender);
        if (frac > deep) frames++;
        if (frac > worst) { worst = frac; worstAt = f.at; }
    }
    return { worstFrac: worst, worstAt, frames, sec: frames / trace.meta.fps };
}

/**
 * Stiffness: how much each body bends versus how much it just rotates. Per
 * frame, the spread of limb/torso angles relative to the spine; a body that
 * turns over as one plank keeps that spread constant while its spine swings.
 */
export function stiffness(trace) {
    const out = {};
    for (const role of ROLES) {
        const spine = [], shape = [];
        for (const f of trace.frames) {
            const j = f.actors[role].joints;
            if (!j.neck || !j.nearHip) continue;
            const s = Math.atan2(j.nearHip.y - j.neck.y, j.nearHip.x - j.neck.x);
            spine.push(s);
            const rel = [['nearShoulder', 'nearElbow'], ['farShoulder', 'farElbow'], ['nearHip', 'nearKnee'], ['farHip', 'farKnee']]
                .filter(([a, b]) => j[a] && j[b])
                .map(([a, b]) => wrap(Math.atan2(j[b].y - j[a].y, j[b].x - j[a].x) - s));
            shape.push(rel);
        }
        const spineTravel = spine.slice(1).reduce((t, s, i) => t + Math.abs(wrap(s - spine[i])), 0);
        const shapeTravel = shape.slice(1).reduce((t, rel, i) => t + rel.reduce((u, r, k) => u + Math.abs(wrap(r - (shape[i][k] ?? r))), 0) / rel.length, 0);
        out[role] = { spineTurnRad: spineTravel, bendRad: shapeTravel, ratio: spineTravel > 0.3 ? shapeTravel / spineTravel : null };
    }
    return out;
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Every metric, with a move's spec (contacts, strikes, flight spans). */
export function critique(trace, spec = {}) {
    return {
        id: trace.meta.id, duration: trace.meta.duration, characters: trace.meta.characters,
        heights: standingHeights(trace),
        floor: floorPenetration(trace),
        slide: footSlide(trace),
        support: support(trace, { airborne: spec.airborne ?? {} }),
        continuity: continuity(trace),
        contacts: contacts(trace, spec.contacts ?? []),
        impacts: impacts(trace, spec.strikes ?? []),
        overlap: spec.solo ? null : bodyOverlap(trace),
        stiffness: stiffness(trace),
        landings: landings(trace, spec.landings ?? []),
    };
}

/** Landing: when a body part first reaches the mat, relative to its event. */
export function landings(trace, specs = []) {
    const over = soleOverhang(trace);
    return specs.map(s => {
        const event = (trace.meta.events ?? []).find(e => e.type === s.event);
        const hit = trace.frames.find(f => {
            const a = f.actors[s.role], pts = a.outline[s.part];
            return f.at >= (s.after ?? 0) && pts && lowestY(pts) >= matY(a, s.role, over) - 4;
        });
        return { label: `${s.role} ${s.part} lands`, event: event?.at ?? null, at: hit?.at ?? null,
            offsetSec: hit && event ? hit.at - event.at : null };
    });
}
