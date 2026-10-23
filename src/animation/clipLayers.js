// Cross-actor part layering for paired clips (PLAN_MOVE_PERFORMANCE.md D1).
//
// A wrestler's depth is 12 + y*0.03 and its parts sit in fixed sub-bands
// above that (Skeleton.setDepth). Two actors staged at the same y therefore
// interleave part by part, and exact ties fall to display-list order, which
// follows the player slot, not the role (move-performance-baseline/README.md).
// A clip can opt out of that with:
//
//   layers: [
//     // back -> front; holds from `from` up to (not including) `to`, like parts
//     { from: 1.30, to: 3.55, order: [['defender','rLeg'], ['attacker','lLeg']] },
//   ],
//   layerTie: ['defender', 'attacker'],   // breaks exact sub-depth ties, back -> front
//
// Limbs are anatomical. Each resolves to near/far parts per actor per frame
// with skeleton.lChannelSide(facing), so identity holds through both facings
// and every rig. Wrestler.draw() resets every depth each frame, so overrides
// need no teardown: the first draw after the clip ends restores defaults.

export const LAYER_LIMBS = Object.freeze(['lLeg', 'rLeg', 'lArm', 'rArm', 'torso', 'head']);

// Gap between stacked limbs. Sub-depths are multiples of 0.00001, so this
// clears any one limb's top part.
export const LAYER_STEP = 0.00002;
// Per tie index; half a sub-depth unit, so it only reorders exact ties.
export const LAYER_TIE_STEP = 0.000005;

const SIDE_PARTS = Object.freeze({
    Leg: ['Thigh', 'Shin', 'Boot'],
    Arm: ['UpArm', 'Forearm', 'Hand'],
});
const TORSO_PARTS = Object.freeze(['pelvisUnderlay', 'torso', 'trunks', 'pelvisOverlay', 'pelvisMask']);
const ALL_PARTS = Object.freeze([
    ...['near', 'far'].flatMap(side => [...SIDE_PARTS.Leg, ...SIDE_PARTS.Arm].map(p => `${side}${p}`)),
    ...TORSO_PARTS, 'head',
]);

const flip = side => (side === 'near' ? 'far' : 'near');

// Images of one actor's limb, skipping parts the rig doesn't have.
export function limbParts(actor, limb) {
    const sk = actor?.skeleton;
    if (!sk) return [];
    let names;
    if (limb === 'torso') names = TORSO_PARTS;
    else if (limb === 'head') names = ['head'];
    else {
        const lSide = sk.lChannelSide?.(actor.facing ?? 1) ?? 'near';
        const side = limb[0] === 'l' ? lSide : flip(lSide);
        names = SIDE_PARTS[limb.slice(1)].map(p => `${side}${p}`);
    }
    return names.map(n => sk[n]).filter(img => img && Number.isFinite(img.depth));
}

function allParts(actor) {
    const sk = actor?.skeleton;
    return sk ? ALL_PARTS.map(n => sk[n]).filter(img => img && Number.isFinite(img.depth)) : [];
}

export function validateLayers(source) {
    const errors = [];
    const tracks = source?.tracks ?? {};
    const duration = source?.duration;
    const layers = source?.layers;
    if (layers !== undefined && !Array.isArray(layers)) errors.push('layers must be an array');
    for (const [index, win] of (Array.isArray(layers) ? layers : []).entries()) {
        const at = `layers[${index}]`;
        if (!Number.isFinite(win?.from) || !Number.isFinite(win?.to) || win.from < 0 || win.to > duration || win.from >= win.to) {
            errors.push(`${at} needs 0 <= from < to <= duration`);
        }
        if (!Array.isArray(win?.order) || win.order.length < 2) {
            errors.push(`${at}.order needs at least two [role, limb] entries`);
            continue;
        }
        const seen = new Set();
        for (const entry of win.order) {
            const [role, limb] = Array.isArray(entry) ? entry : [];
            if (!tracks[role]) errors.push(`${at}.order role "${role}" has no track`);
            if (!LAYER_LIMBS.includes(limb)) errors.push(`${at}.order limb "${limb}" must be one of ${LAYER_LIMBS.join(', ')}`);
            const key = `${role}.${limb}`;
            if (seen.has(key)) errors.push(`${at}.order lists ${key} twice`);
            seen.add(key);
        }
    }
    if (Array.isArray(layers) && errors.length === 0) {
        // Windows are [from, to) intervals: any set that overlaps pairwise is
        // active together at the latest `from` among them, so checking the
        // active set at every `from` covers every overlap.
        for (const t of new Set(layers.map(w => w.from))) {
            const active = layers.filter(w => w.from <= t && t < w.to);
            if (active.length < 2) continue;
            const cycle = findCycle(active);
            if (cycle) errors.push(`layers contradict each other at ${t}s: ${cycle.join(' < ')}`);
        }
    }
    const tie = source?.layerTie;
    if (tie !== undefined) {
        if (!Array.isArray(tie) || tie.length < 2) errors.push('layerTie needs at least two roles');
        else {
            for (const role of tie) if (!tracks[role]) errors.push(`layerTie role "${role}" has no track`);
            if (new Set(tie).size !== tie.length) errors.push('layerTie lists a role twice');
        }
    }
    return { ok: errors.length === 0, errors };
}

// Every chain says each earlier limb is behind every later one. A cycle in
// that "behind" graph is a contradiction.
function findCycle(windows) {
    const edges = new Map();
    for (const { order } of windows) {
        const keys = order.map(([role, limb]) => `${role}.${limb}`);
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                if (!edges.has(keys[i])) edges.set(keys[i], new Set());
                edges.get(keys[i]).add(keys[j]);
            }
        }
    }
    const state = new Map(); // 1 visiting, 2 done
    const path = [];
    const visit = node => {
        state.set(node, 1);
        path.push(node);
        for (const next of edges.get(node) ?? []) {
            if (state.get(next) === 1) return [...path.slice(path.indexOf(next)), next];
            if (!state.has(next)) {
                const found = visit(next);
                if (found) return found;
            }
        }
        path.pop();
        state.set(node, 2);
        return null;
    };
    for (const node of edges.keys()) {
        if (!state.has(node)) {
            const found = visit(node);
            if (found) return found;
        }
    }
    return null;
}

// One window's depths. Starts at the lowest current depth among the listed
// limbs and stacks each limb above the previous by LAYER_STEP, keeping each
// limb's own part offsets (joint caps, shin-under-thigh). `depthOf` lets a
// caller chain windows on top of earlier overrides. Unlisted parts are absent
// from the result.
export function layerDepths(window, actors, depthOf = img => img.depth) {
    const limbs = window.order.map(([role, limb]) => limbParts(actors[role], limb)).filter(parts => parts.length);
    const out = new Map();
    if (!limbs.length) return out;
    let cursor = Math.min(...limbs.flat().map(depthOf));
    for (const parts of limbs) {
        const low = Math.min(...parts.map(depthOf));
        let top = cursor;
        for (const img of parts) {
            const d = cursor + (depthOf(img) - low);
            out.set(img, d);
            top = Math.max(top, d);
        }
        cursor = top + LAYER_STEP;
    }
    return out;
}

// Everything a compiled clip asks for at `time`: the tie offsets first, then
// each active window in declaration order on top. Empty for a clip with
// neither field.
export function clipLayerDepths(clip, time, actors) {
    const out = new Map();
    const tie = clip.layerTie;
    const windows = (clip.layers ?? []).filter(w => w.from <= time && time < w.to);
    if (!tie && !windows.length) return out;
    if (tie) {
        tie.forEach((role, index) => {
            if (!index) return;
            for (const img of allParts(actors[role])) out.set(img, img.depth + index * LAYER_TIE_STEP);
        });
    }
    const depthOf = img => (out.has(img) ? out.get(img) : img.depth);
    for (const win of windows) {
        for (const [img, d] of layerDepths(win, actors, depthOf)) out.set(img, d);
    }
    return out;
}
