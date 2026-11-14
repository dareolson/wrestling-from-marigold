// Browser-safe toe-hold clip construction and runtime playback, shared by live preview and evidence recording.
import { T, FPS, DIST, fistKeys, armsAt } from './toehold_t30c_lib.mjs';
const lerp = (a, b, k) => a + (b - a) * k;
const mixObj = (a, b, k) => Object.fromEntries(Object.keys(a).map(key => [key, typeof a[key] === 'number' ? lerp(a[key], b[key] ?? a[key], k) : a[key]]));
const strip = ({ fists, ...r }) => r;

// ---- clip from waypoints ----------------------------------------------------------------------------------------------------------------------------------
export const buildClip = (W, fists, orders) => {
    const wps = [{ ...W.waypoints[0], t: 0 }, ...W.waypoints].sort((a, b) => a.t - b.t);
    const at = t => {
        let i = wps.length - 1; while (i > 0 && wps[i].t > t + 1e-9) i--;
        const a = wps[i], b = wps[Math.min(i + 1, wps.length - 1)], k = b.t === a.t ? 0 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
        return { att: strip(mixObj(a.att, b.att, k)), gap: lerp(a.gap, b.gap, k), attY: lerp(a.attY ?? 0, b.attY ?? 0, k), def: strip(mixObj(a.def, b.def, k)), attSign: a.attSign, defSign: a.defSign, twist: a.twist };
    };
    const fk = fistKeys(fists, T.peaks);
    const times = [...new Set([...wps.map(w => w.t), ...[...fk.l, ...fk.r].map(k => k[0]), T.end].map(t => +t.toFixed(4)))].filter(t => t <= T.end + 1e-9).sort((a, b) => a - b);
    const frames = { attacker: [], defender: [] };
    for (const t of times) {
        const s = at(t), def = t >= T.rollEnd - .05 ? { ...s.def, ...armsAt(fk, t) } : s.def;
        frames.attacker.push({ at: t, pose: s.att, x: DIST - s.gap, y: s.attY, facing: s.attSign, parts: {} });
        frames.defender.push({ at: t, pose: def, x: DIST, y: 0, facing: s.defSign, parts: s.defSign > 0 ? { lShin: s.twist ? 'ankleTwist' : 'base', nearForearm: 'grip', farForearm: 'grip' } : { lShin: 'base', nearForearm: 'base', farForearm: 'base' } });
    }
    const phases = [{ from: 0, to: T.turnFlip, attSign: 1, defSign: -1 }, { from: T.turnFlip, to: T.rollFlip, attSign: -1, defSign: -1 }, { from: T.rollFlip, to: T.end, attSign: -1, defSign: 1 }];
    return { duration: T.end, frames, phases, rollAt: T.rollFlip, layers: [{ from: 0, to: .85, order: orders.p1 }, { from: .85, to: T.turnFlip, order: orders.p2 }, { from: T.turnFlip, to: T.end, order: orders.cap }] };
};

// ---- in page ----------------------------------------------------------------------------------------------------------------------------------------------
export const PLAYCLIP = ({ id, clip, rate }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    return import('/src/rig/articulation.js').then(({ shinsFromFolds }) => {
        const kf = frames => frames.map(f => ({ at: f.at, ease: f.ease ?? 'linear', pose: shinsFromFolds(f.pose), transform: { x: f.x, y: f.y }, facing: f.facing, parts: f.parts }));
        const a0 = a.facing, dur = clip.duration, grips = [];
        clip.phases.forEach((ph, i) => {
            const as = a.skeleton.lChannelSide(a0 * ph.attSign), ds = d.skeleton.lChannelSide(a0 * ph.defSign), sf = s => (s === ds ? 'same' : 'other');
            const inW = i === 0 ? [0, .004] : [ph.from + .002, ph.from + .004], outW = i === clip.phases.length - 1 ? [dur - .01, dur] : [ph.to - (ph.release ?? .004), ph.to - .002];
            for (const [arm, side, anchor] of [['l', sf(as), 'heel'], ['r', sf(as === 'near' ? 'far' : 'near'), 'toe']].filter(([arm]) => !ph.arms || ph.arms.includes(arm)))
                grips.push({ role: 'attacker', arm, to: { role: 'defender', joint: 'Ankle', side, anchor }, in: inW, out: outW, natural: true, palm: 'clutch' });
        });
        sc.moveRuntime.register({ id, duration: dur, events: [{ at: clip.rollAt, type: 'roll' }], tracks: { attacker: { keyframes: kf(clip.frames.attacker) }, defender: { keyframes: kf(clip.frames.defender) } }, grips, plants: [], layers: clip.layers });
        a.state = d.state = 'holding';
        window.__clipDone = false;
        const h = sc.moveRuntime.play(id, { attacker: a, defender: d }, { rate, onEvent: e => { if (e.type === 'roll') d.lying = 'prone'; }, onComplete() { window.__clipDone = true; }, onCancel() { window.__clipDone = true; } });
        a._activeMove = d._activeMove = h; a._fixedHold = d._fixedHold = true;
        d.facing = -a.facing; d.lying = 'supine';
        return true;
    });
};
