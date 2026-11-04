import { compileClip, eventsBetween, sampleClip, windowWeight } from './AnimationClip.js';
import { clipLayerDepths } from './clipLayers.js';
import { carryTarget, pelvisOf, thighTop, toFrame, torsoFrame } from './carry.js';
import { captureFacingAxis, captureStagingContext, stagedWorldPoint, stagingAt } from './clipStaging.js';

// `staging` is the role's immutable playback context, or null when this track
// authors no transform channels (the clip does not own this actor's position).
// It is passed as a second argument rather than folded into `sample` so the
// sampled frame stays pure clip data — the same object a tool or test can
// inspect — and so a target that ignores staging is unchanged.
//
// `facingAxis` is the anchor's facing at play() (+1/-1), or null when the clip
// authors no facing; a sampled `facing` resolves against it.
function applySample(target, sample, staging, facingAxis = null) {
    if (!target) return;
    if (typeof target.applyAnimationSample === 'function') {
        target.applyAnimationSample(sample, staging, facingAxis);
        return;
    }
    if (facingAxis && sample.facing && 'facing' in target) target.facing = facingAxis * sample.facing;
    if (sample.pose && 'pose' in target) target.pose = { ...target.pose, ...sample.pose };
    if (sample.transform) {
        // Generic targets get the same contract as a real Wrestler: x/y resolve
        // through the staging frame, any other authored channel is a direct
        // write. A target with no captureStagingOrigin was captured at its own
        // x/y with facing +1 and scale 1, so an actor sitting at the origin
        // still sees the raw authored value.
        const point = staging ? stagedWorldPoint(staging, sample.transform) : null;
        for (const [key, value] of Object.entries(sample.transform)) {
            if (!(key in target)) continue;
            if (point && (key === 'x' || key === 'y')) target[key] = point[key];
            else target[key] = value;
        }
    }
    target.skeleton?.setPartVariants?.(sample.parts ?? {});
}

// Scene-clock animation orchestration. Gameplay still owns damage, legality,
// AI, and state transitions; this runtime only samples synchronized visual
// tracks and emits authored markers.
export default class MoveRuntime {
    constructor({ onEvent = null } = {}) {
        this._clips = new Map();
        this._active = new Map();
        this._nextId = 1;
        this._onEvent = onEvent;
    }

    register(source) {
        const clip = source._compiled ? source : compileClip(source);
        this._clips.set(clip.id, clip);
        return clip;
    }

    play(clipId, bindings, { rate = 1, onEvent = null, onComplete = null, onCancel = null } = {}) {
        const clip = this._clips.get(clipId);
        if (!clip) throw new Error(`Unknown animation clip "${clipId}"`);
        // Participation claims the pose just as tweenPose does. In particular,
        // a defender must not keep playing its own strike under a paired throw.
        // Cancel first: old teardown may start recovery tweens, which the new
        // owner's prepare hook must stop before the first sample is applied.
        const targets = new Set(Object.keys(clip.tracks).map(role => bindings[role]).filter(Boolean));
        for (const active of [...this._active.values()]) {
            const initiator = Object.values(active.bindings).find(target => targets.has(target));
            if (initiator) this.cancel(active, 'clip-replaced', { initiator });
        }
        for (const role of Object.keys(clip.tracks)) {
            bindings[role]?.prepareAnimationClip?.(clip.tracks[role]);
        }
        const handle = {
            id: this._nextId++,
            clip,
            bindings,
            time: 0,
            rate,
            onEvent,
            // Natural completion and cancellation are DIFFERENT outcomes and get
            // different callbacks. onComplete fires only when the clip reaches
            // its duration (release drains, graceful recovery are legitimate).
            // onCancel fires when the move is torn down early — through
            // cancel/cancelTarget/shutdown or a bound actor claiming its pose —
            // and must NOT run any completion-only gameplay (no release damage,
            // no "the hold finished" state). A move must never receive both.
            onComplete,
            onCancel,
            cancelled: false,
            // One row per plant per frame (the solve's target, sole and residual); kept for the probes, null on clips with no plants.
            plantLog: clip.plants?.length ? [] : null,
            // One row per carry per frame for the probes (kept only where a carry has a thigh frame).
            carryLog: clip.carry?.some(c => c.frame === 'thigh') ? [] : null,
            // Per-role staging frame, captured ONCE here from the bound actors'
            // live positions and the anchor's facing/scale, then never rewritten
            // for the life of the handle. Capturing at play() rather than on
            // first sample is what makes seeking deterministic: every _apply
            // resolves against the same origins no matter what order times are
            // visited in. Null when no bound track authors transform channels.
            staging: captureStagingContext(clip, bindings),
            // The axis authored facing resolves against; null when the clip
            // authors none. Captured once, like staging.
            facingAxis: captureFacingAxis(clip, bindings),
        };
        this._active.set(handle.id, handle);
        this._apply(handle);
        return handle;
    }

    seek(handle, time, { emitEvents = false } = {}) {
        if (!this._active.has(handle.id)) return null;
        const from = handle.time;
        handle.time = Math.max(0, Math.min(handle.clip.duration, time));
        if (emitEvents && handle.time >= from) {
            this._emit(handle, from, handle.time);
            // A marker dispatched above can cancel this very handle (the same
            // self-cancellation hazard as update()). Once that happens the
            // handle is torn down — sampling and applying a pose for it here
            // would be a post-cancellation write.
            if (handle.cancelled) return null;
        }
        return this._apply(handle);
    }

    update(deltaSeconds) {
        for (const handle of [...this._active.values()]) {
            // An event handler fired by one clip can cancel another (e.g. a
            // jab's impact makes the defender sell, cancelling the defender's
            // own in-flight jab). We iterate a snapshot, so skip any handle a
            // prior handler already cancelled — otherwise it would advance and
            // even emit one extra frame after cancellation.
            if (!this._active.has(handle.id)) continue;
            const from = handle.time;
            const to = Math.min(handle.clip.duration, from + Math.max(0, deltaSeconds) * handle.rate);
            handle.time = to;
            this._emit(handle, from, to);
            // A marker dispatched above (via either the per-handle or global
            // onEvent) can cancel THIS handle mid-dispatch — onCancel has
            // already run and the handle is torn down. Applying a sample or
            // completing it here would be a post-cancellation write, and
            // could even fire onComplete after onCancel already fired.
            if (handle.cancelled) continue;
            this._apply(handle);
            if (to >= handle.clip.duration) {
                this._active.delete(handle.id);
                this._release(handle);
                handle.onComplete?.(handle);
            }
        }
    }

    cancel(handle, reason = 'cancelled', meta = null) {
        // The _active.delete guard makes cancellation idempotent and re-entrancy
        // safe: if an onCancel handler (or the pose-claim it triggers) loops back
        // into cancel for the same handle, the second delete returns false and we
        // no-op instead of firing onCancel twice or re-releasing.
        if (!handle || !this._active.delete(handle.id)) return false;
        handle.cancelled = true;
        handle.reason = reason;
        // Opaque caller-supplied context (e.g. which actor initiated a
        // pose-claim cancellation) — MoveRuntime doesn't interpret this, it's
        // just carried onto the handle for onCancel to read instead of the
        // handler having to guess the initiator from actor state.
        handle.cancelMeta = meta;
        // Logical teardown first (clear gameplay handles/state), then visual
        // (reset part variants on any target this handle no longer owns).
        handle.onCancel?.(handle);
        this._release(handle);
        return true;
    }

    cancelTarget(target, reason = 'target-cancelled') {
        for (const handle of [...this._active.values()]) {
            if (Object.values(handle.bindings).includes(target)) this.cancel(handle, reason);
        }
    }

    shutdown() {
        for (const handle of [...this._active.values()]) this.cancel(handle, 'shutdown');
        this._clips.clear();
    }

    // After every bound actor has drawn: pull declared grips onto the
    // partner's drawn joint (AnimationClip.js grips), then apply declared
    // part layering. The gripping actor redraws, so this runs once both are
    // placed for the frame.
    afterDraw() {
        // Planted soles first (_plant): the leg is solved onto its held point before anything is placed from the body's drawn joints.
        // The two legs of one man share his pelvis (the rig sinks it to the soles' mean), so solving one moves the other's sole: sweep the list until it settles.
        for (const handle of this._active.values()) {
            const plants = handle.clip.plants ?? [], passes = plants.length > 1 ? 3 : 1;
            for (let pass = 1; pass <= passes; pass++) for (const [index, plant] of plants.entries()) this._plant(handle, plant, index, pass === passes);
        }
        // Carry (carry.js): the carried man is placed on the carrier's torso and redrawn, so the grips below pull onto a hip that is already where it stays.
        for (const handle of this._active.values()) {
            for (const [index, carry] of (handle.clip.carry ?? []).entries()) this._carry(handle, carry, index);
        }
        for (const handle of this._active.values()) {
            const grips = handle.clip.grips;
            if (!grips?.length) continue;
            const byRole = new Map();
            for (const grip of grips) {
                const w = windowWeight(grip, handle.time);
                const actor = handle.bindings[grip.role], partner = handle.bindings[grip.to.role];
                if (!(w > 0) || !actor?.holdGrips || !partner?.skeleton) continue;
                if (!byRole.has(actor)) byRole.set(actor, []);
                byRole.get(actor).push({ arm: grip.arm, partner, joint: grip.to.joint, side: grip.to.side, w });
            }
            for (const [actor, list] of byRole) actor.holdGrips(list);
        }
        // Then cross-actor layers (clipLayers.js). After every grip, because a
        // grip redraws its actor and a draw resets depth. Nothing to undo
        // later: the next draw() resets depth again.
        for (const handle of this._active.values()) {
            if (!handle.clip.layers && !handle.clip.layerTie) continue;
            for (const [img, depth] of clipLayerDepths(handle.clip, handle.time, handle.bindings)) img.setDepth(depth);
        }
    }

    // One frame of one plant (AnimationClip.js plants): over its window a sole holds the world point it had the first frame the weight is above zero (a
    // frame where that foot is on the mat, which `plantLog` records). The clip's `leg` channel ('l' | 'r') is solved by two unknowns, its thigh (`lLeg`)
    // and its absolute shin (`lShin`, the clip owns the shin: T4c.4h), by damped Newton on the DRAWN painted sole (Skeleton.soleWorld), so the pelvis
    // re-solve that follows a leg change is in the loop. The solved channels stay in the pose (the next frame's sample rewrites them). At weight w the
    // sole goes to the sampled sole blended w of the way to the held point. A target out of the leg's reach stops at the nearest the solve gets; the
    // residual is logged and the clip's x keys are the fix, not a pelvis solver.
    _plant(handle, plant, index, last = true) {
        const w = windowWeight(plant, handle.time), man = handle.bindings[plant.role], sk = man?.skeleton;
        if (!(w > 0.001) || !sk?.soleWorld || typeof man.draw !== 'function') return;
        const side = sk.lChannelSide(man.facing) === 'near' ? (plant.leg === 'l' ? 'near' : 'far') : (plant.leg === 'l' ? 'far' : 'near');
        const legKey = `${plant.leg}Leg`, shinKey = `${plant.leg}Shin`;
        if (!Number.isFinite(man.pose[legKey]) || !Number.isFinite(man.pose[shinKey])) return;
        const natural = sk.soleWorld(side);
        if (!natural) return;
        const state = ((handle._plants ??= [])[index] ??= { target: { ...natural }, onMat: Math.abs(natural.y - man.y) });
        const want = { x: natural.x + (state.target.x - natural.x) * w, y: natural.y + (state.target.y - natural.y) * w };
        // Start from last frame's solution (the target is fixed, so it is close) blended with the sampled legs by the weight; Jacobian by finite difference each step.
        const natural2 = [man.pose[legKey], man.pose[shinKey]];
        let cur = state.last ? natural2.map((v, k) => v + (state.last[k] - v) * Math.min(1, w * 1.5)) : natural2;
        // The shin stays inside the knee's range against its own thigh (leg + .85 crouch): no hyperextension, no fold past FOLD_MAX (JOINT_LIMITS.knee.max, less a margin).
        const thighOf = (a) => a + 0.85 * (man.pose.crouch ?? 0);
        const at = (a, b) => { b = Math.max(thighOf(a) - 2.45, Math.min(thighOf(a), b)); man.pose[legKey] = a; man.pose[shinKey] = b; man.draw(); return sk.soleWorld(side); };
        const EPS = 0.02, miss = (q) => Math.hypot(want.x - q.x, want.y - q.y);
        let p = at(cur[0], cur[1]);
        for (let it = 0; it < 6 && miss(p) > 0.2; it++) {
            const pa = at(cur[0] + EPS, cur[1]), pb = at(cur[0], cur[1] + EPS);
            const J = [[(pa.x - p.x) / EPS, (pb.x - p.x) / EPS], [(pa.y - p.y) / EPS, (pb.y - p.y) / EPS]];
            const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
            if (Math.abs(det) < 1e-6) { p = at(cur[0], cur[1]); break; }
            const ex = want.x - p.x, ey = want.y - p.y;
            let da = (J[1][1] * ex - J[0][1] * ey) / det, db = (-J[1][0] * ex + J[0][0] * ey) / det;
            const big = Math.max(Math.abs(da), Math.abs(db)); if (big > 0.5) { da *= 0.5 / big; db *= 0.5 / big; }
            let k = 1, next = cur, q = p;
            for (let h = 0; h < 4; h++, k /= 2) {   // halve the step until the miss shrinks
                next = [cur[0] + da * k, cur[1] + db * k]; q = at(next[0], next[1]);
                if (miss(q) < miss(p)) break;
            }
            if (!(miss(q) < miss(p))) { p = at(cur[0], cur[1]); break; }
            cur = next; p = q;
        }
        state.last = cur;
        if (last) handle.plantLog?.push({ time: handle.time, index, w, side, target: state.target, sole: p, want, onMat: state.onMat, err: Math.hypot(want.x - p.x, want.y - p.y), leg: cur[0], shin: cur[1], thigh: thighOf(cur[0]), hip: { ...sk.jointAttachmentPoints[`${side}Hip`] } });
    }

    // One frame of one carry: weight from its window; captures the anchor the first frame the weight is above zero; then turns the carried man to the
    // carrier's lean, moves him so his drawn pelvis lands on the target (x by the wrestler's x, y by the pose `lift`, measured per frame because a rig
    // scales lift), and redraws him. Nothing is kept between frames but the anchor: the next sample rewrites x, tilt and lift.
    _carry(handle, carry, index) {
        const w = windowWeight(carry, handle.time);
        const carrier = handle.bindings[carry.on], man = handle.bindings[carry.role];
        if (!(w > 0) || !carrier?.skeleton?.jointAttachmentPoints?.neck || !man?.skeleton?.jointAttachmentPoints?.nearHip || typeof man.draw !== 'function') return;
        const pelvis = () => pelvisOf(man.skeleton.jointAttachmentPoints);
        let want, contact = null, point = pelvis;
        if (carry.frame === 'thigh') {
            // T4c.4j: he sits on the carrier's raised thigh. The target is the top of that thigh's knee end; his SEAT (Skeleton.seatWorld) is the point that goes there, his tilt left
            // to his own keys. `leg` is the carrier's clip channel ('l' | 'r'); which limb draws it is the rig's (lChannelSide).
            const cp = carrier.skeleton.jointAttachmentPoints, sk = carrier.skeleton;
            const side = (sk.lChannelSide(carrier.facing) === 'near') === (carry.leg === 'l') ? 'near' : 'far';
            if (!cp[`${side}Hip`] || !cp[`${side}Knee`] || !man.skeleton.seatWorld?.()) return;
            contact = thighTop(cp[`${side}Hip`], cp[`${side}Knee`]);
            const seat0 = man.skeleton.seatWorld();
            point = () => man.skeleton.seatWorld();
            want = { x: seat0.x + (contact.x - seat0.x) * w, y: seat0.y + (contact.y - seat0.y) * w, tilt: man.pose.tilt ?? 0 };
        } else {
            const state = ((handle._carry ??= [])[index] ??= {
                anchor: toFrame(torsoFrame(carrier.skeleton.jointAttachmentPoints, carrier.facing), pelvisOf(man.skeleton.jointAttachmentPoints)),
            });
            want = carryTarget({ carrierPts: carrier.skeleton.jointAttachmentPoints, carrierFacing: carrier.facing, anchor: state.anchor, natural: pelvis(), naturalTilt: man.pose.tilt ?? 0, ratio: carry.tilt, w });
        }
        man.pose.tilt = want.tilt;
        man.draw();
        man.x += want.x - point().x;
        man.draw();
        // The pose `lift` is not linear in the drawn height (the rig blends its hip toward the canonical height as the lift grows), so the correction is re-measured: a few
        // passes of "move it by the height a 10-unit lift buys", stopping when the point is on the target.
        for (let pass = 0; pass < 6; pass++) {
            const p = point(), err = p.y - want.y;
            if (pass > 0 && Math.abs(err) < 0.3) break;
            const lift0 = man.pose.lift ?? 0;
            man.pose.lift = lift0 + 10;
            man.draw();
            const unit = (p.y - point().y) / 10;
            man.pose.lift = Math.abs(unit) > 1e-6 ? lift0 + err / unit : lift0;
            man.draw();
        }
        const seat = contact ? man.skeleton.seatWorld() : null;
        handle.carryLog?.push({ time: handle.time, index, w, lift: man.pose.lift, x: man.x, tilt: man.pose.tilt, ...(contact && seat ? { gap: Math.hypot(seat.x - contact.x, seat.y - contact.y), seat, contact } : {}) });
    }

    _apply(handle) {
        const sampled = sampleClip(handle.clip, handle.time);
        for (const [role, sample] of Object.entries(sampled.tracks)) {
            applySample(handle.bindings[role], sample, stagingAt(handle.staging?.roles[role] ?? null, handle.time), handle.facingAxis);
        }
        return sampled;
    }

    _emit(handle, from, to) {
        for (const event of eventsBetween(handle.clip, from, to)) {
            handle.onEvent?.(event, handle);
            // The per-handle callback can cancel its own handle (or another
            // one it's chained to). If it just cancelled THIS handle, onCancel
            // has already run — stop here rather than also notifying the
            // global listener about an event on a now-dead handle, and don't
            // dispatch any later marker crossed by the same update.
            if (handle.cancelled) return;
            this._onEvent?.(event, handle);
            if (handle.cancelled) return;
        }
    }

    _release(handle) {
        for (const target of Object.values(handle.bindings)) {
            const stillOwned = [...this._active.values()]
                .some(active => Object.values(active.bindings).includes(target));
            if (!stillOwned) target?.skeleton?.setPartVariants?.({});
        }
    }
}
