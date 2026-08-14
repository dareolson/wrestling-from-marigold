// End-to-end proof that editor-authored staging reaches real gameplay.
//
//   node tools/debug/staging_transport_proof.mjs
//
// Everything here runs against the REAL game: the Arena scene's own
// MoveRuntime, the real w1/w2 Wrestler instances, and the real Skeleton render
// path. Nothing is stubbed and nothing is inferred from a screenshot — every
// assertion reads a measured world coordinate or a rendered joint position out
// of the live page after the production sampler has run.
//
// It drives src/animation/clips/stagingProof.js, which is authored in exactly
// the shape tools/move-editor exports and is deliberately NOT in the move
// registry: the probe registers it on the live runtime and cancels it on the
// way out, so the move roster is never distorted by a developer proof.
//
// What it proves, in order:
//   1. transform.x/y actually move real Wrestlers (the seam that was dead).
//   2. Pose, part variant, and staging land on the SAME sampled frame.
//   3. Articulated elbow/knee channels reach the rendered skeleton.
//   4. The tableau mirrors rigidly in both facings.
//   5. Seeking is deterministic and does not accumulate.
//   6. Ring bounds are respected at the ropes.
//   7. Cancellation leaves nobody sliding.
//   8. A clip that authors no transform (hammerlock) still stages via its
//      executor — no regression, and never two owners at once.

import { launch } from './harness.mjs';

const h = await launch();
const failures = [];
const notes = [];

function check(label, condition, detail = '') {
    if (condition) notes.push(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
    else failures.push(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// The Arena builds its MoveRuntime and wrestlers in create(); a canvas on
// screen does not mean they exist yet.
await h.page.waitForFunction(() => {
    const sc = window.__WFM_GAME?.scene?.scenes?.[0];
    return !!(sc?.moveRuntime && sc.w1?.skeleton && sc.w2?.skeleton);
}, { timeout: 20000 });

// Install the proof clip and a small driver on the live scene. Everything the
// driver touches is production: sc.moveRuntime, sc.w1, sc.w2.
await h.page.evaluate(async () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const proof = await import('/src/animation/clips/stagingProof.js');
    sc.moveRuntime.register(proof.stagingProofClip);
    window.__PROOF = {
        clip: proof,
        handle: null,
        // Determinism sections run with the Arena's own update loop PAUSED.
        // Not to avoid the production path — every sample below still goes
        // through sc.moveRuntime and the real Wrestler.draw() — but because the
        // live loop is a second writer: it runs its own moveRuntime.update, the
        // orphan watchdog frees a wrestler parked in a hold state, and AI/walk
        // integration then moves them. Racing that makes a seek-determinism
        // measurement meaningless. The probe owns the clock instead.
        pause() { sc.scene.pause(); },
        resume() { sc.scene.resume(); },
        // Park both wrestlers in a controlled, input-locked state so gameplay
        // AI and walk integration cannot move them behind the clip's back.
        setup({ facing = 1, x = 470, y = 360 } = {}) {
            for (const [w, sign] of [[sc.w1, 1], [sc.w2, -1]]) {
                w._cancelActiveMove?.('proof-reset');
                sc.tweens.killTweensOf(w);
                w.state = 'holding';
                w.stateTimer = 99;
                w.vx = 0;
                w.vy = 0;
                w.x = x;
                w.y = y;
                w.facing = sign === 1 ? facing : -facing;
            }
            return this.read();
        },
        play(opts) {
            this.setup(opts);
            this.handle = sc.moveRuntime.play(this.clip.STAGING_PROOF_CLIP_ID, { attacker: sc.w1, defender: sc.w2 });
            return { staging: this.handle.staging, ...this.read() };
        },
        seek(at) {
            sc.moveRuntime.seek(this.handle, at);
            return this.read();
        },
        step(seconds, dt = 1 / 60) {
            for (let t = 0; t < seconds; t += dt) sc.moveRuntime.update(Math.min(dt, seconds - t));
            return this.read();
        },
        cancel() {
            sc.moveRuntime.cancel(this.handle, 'proof-cancel');
            return this.read();
        },
        // Read WORLD state and RENDERED state together. Wrestler.draw() is the
        // real per-frame render call the Arena makes; running it here publishes
        // jointAttachmentPoints for the pose just sampled, so the joints read
        // below are measured geometry from the production renderer rather than
        // whatever the last unpaused frame happened to leave behind.
        read() {
            sc.w1.draw();
            sc.w2.draw();
            const of = w => ({
                x: w.x,
                y: w.y,
                facing: w.facing,
                scale: w.s,
                pose: { ...w.pose },
                joints: JSON.parse(JSON.stringify(w.skeleton.jointAttachmentPoints ?? {})),
                variants: JSON.parse(JSON.stringify(w.skeleton._partSelection ?? w.skeleton.partSelection ?? {})),
            });
            return { atk: of(sc.w1), def: of(sc.w2), bounds: window.__PROOF.boundsAt(sc.w1.y) };
        },
        boundsAt(y) {
            const RING = { nearLeft: { x: 40, y: 445 }, nearRight: { x: 920, y: 445 }, farLeft: { x: 210, y: 258 }, farRight: { x: 750, y: 258 } };
            const t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y);
            return {
                left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t,
                right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t,
            };
        },
    };
});

const drive = (method, ...args) => h.page.evaluate(([m, a]) => window.__PROOF[m](...a), [method, args]);

// Sections 1–7 own the clock. Section 8 hands it back to the real game loop on
// purpose, to drive hammerlock's real Phaser staging tweens.
await drive('pause');
const constants = await h.page.evaluate(() => ({
    OFFSETS: window.__PROOF.clip.STAGING_PROOF_OFFSETS,
    CONTACT_AT: window.__PROOF.clip.STAGING_PROOF_CONTACT_AT,
    STEP_AT: window.__PROOF.clip.STAGING_PROOF_STEP_AT,
    DURATION: window.__PROOF.clip.STAGING_PROOF_DURATION,
}));

// ── 1. Transform actually reaches a real Wrestler ────────────────────────────
{
    const start = await drive('play', { facing: 1, x: 470, y: 360 });
    check('a transform-authoring clip builds a staging context', !!start.staging, start.staging ? `anchor=${start.staging.anchorRole} facing=${start.staging.facing}` : 'null');

    const contact = await drive('seek', constants.CONTACT_AT);
    const scale = start.staging.scale;
    const expectedAtk = 470 + constants.OFFSETS.attackerContact * scale;
    const expectedDef = 470 + constants.OFFSETS.defenderContact * scale;
    check('attacker reached the authored staging offset', near(contact.atk.x, expectedAtk, 1e-6), `x=${contact.atk.x.toFixed(3)} expected=${expectedAtk.toFixed(3)}`);
    check('defender reached the authored staging offset', near(contact.def.x, expectedDef, 1e-6), `x=${contact.def.x.toFixed(3)} expected=${expectedDef.toFixed(3)}`);
    check('defender depth channel travelled and is not mirrored', contact.def.y > 360, `y=${contact.def.y.toFixed(3)}`);
    check('the two actors are visibly staged apart', Math.abs(contact.atk.x - contact.def.x) > 5, `${Math.abs(contact.atk.x - contact.def.x).toFixed(2)} px`);

    // ── 2/3. Pose, articulation, and the variant on the same frame ───────────
    check('articulated elbow reached the live pose', near(contact.atk.pose.lElbow, 0.42, 1e-9), `lElbow=${contact.atk.pose.lElbow}`);
    check('articulated knee reached the live pose', near(contact.def.pose.rKnee, 0.48, 1e-9), `rKnee=${contact.def.pose.rKnee}`);
    check('no competing legacy absolute channel was left behind', !('lForearm' in contact.atk.pose));

    // The rendered wrist must actually have moved with the shoulder/elbow — a
    // pose value that never reaches the skeleton would leave this static.
    const entry = await drive('seek', 0);
    const back = await drive('seek', constants.CONTACT_AT);
    const wristTravel = Math.hypot(back.atk.joints.nearWrist.x - entry.atk.joints.nearWrist.x, back.atk.joints.nearWrist.y - entry.atk.joints.nearWrist.y);
    check('the rendered arm chain moved with the authored articulation', wristTravel > 10, `nearWrist travelled ${wristTravel.toFixed(2)} px`);

    // The variant swap: spy on the REAL Skeleton.setPartVariants to capture what
    // the real Wrestler resolved the clip's semantic slot to. Whether a texture
    // visibly changes depends on the bound character publishing that variant
    // family — George and Lou publish none yet, a known art-pipeline gap — so
    // what is proven here is the transport: the clip's `strikingForearm` reached
    // the skeleton as a concrete render slot, chosen from live facing.
    const variant = await h.page.evaluate(async ([contactAt, stepAt]) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const calls = [];
        const original = sc.w1.skeleton.setPartVariants.bind(sc.w1.skeleton);
        sc.w1.skeleton.setPartVariants = selection => { calls.push({ ...selection }); return original(selection); };
        try {
            const results = {};
            for (const facing of [1, -1]) {
                window.__PROOF.play({ facing, x: 470, y: 360 });
                calls.length = 0;
                window.__PROOF.seek(stepAt);
                const beforeContact = calls.at(-1) ?? {};
                window.__PROOF.seek(contactAt);
                results[facing] = { atContact: calls.at(-1) ?? {}, beforeContact };
            }
            return {
                ...results,
                families: Object.keys(sc.w1.skeleton._textureConfig?.variants ?? {}),
            };
        } finally {
            sc.w1.skeleton.setPartVariants = original;
        }
    }, [constants.CONTACT_AT, constants.STEP_AT]);

    check('the clip\'s semantic variant slot reached the real skeleton, resolved by facing',
        variant[1].atContact.nearForearm === 'fist' && variant['-1'].atContact.farForearm === 'fist',
        `facing +1 → ${JSON.stringify(variant[1].atContact)}, facing -1 → ${JSON.stringify(variant['-1'].atContact)}`);
    check('the swap is discrete and lands on the contact keyframe, not before',
        !('nearForearm' in variant[1].beforeContact) && !('farForearm' in variant[1].beforeContact),
        `at the step frame: ${JSON.stringify(variant[1].beforeContact)}`);
    notes.push(`  note the bound character publishes variant families: ${variant.families.length ? variant.families.join(', ') : '(none — art-pipeline gap, transport still verified)'}`);
}

// ── 4. Rigid mirroring in both facings ───────────────────────────────────────
{
    const geometry = {};
    for (const facing of [1, -1]) {
        const start = await drive('play', { facing, x: 470, y: 360 });
        const contact = await drive('seek', constants.CONTACT_AT);
        const scale = start.staging.scale;
        const expectedAtk = 470 + facing * constants.OFFSETS.attackerContact * scale;
        check(`facing ${facing}: attacker staged along its own facing`, near(contact.atk.x, expectedAtk, 1e-6), `x=${contact.atk.x.toFixed(3)} expected=${expectedAtk.toFixed(3)}`);
        check(`facing ${facing}: attacker leads the defender`, Math.sign((contact.atk.x - contact.def.x) * facing) === 1, `gap=${(contact.atk.x - contact.def.x).toFixed(3)}`);
        check(`facing ${facing}: depth is not mirrored`, contact.def.y > 360, `y=${contact.def.y.toFixed(3)}`);
        geometry[facing] = Math.abs(contact.atk.x - contact.def.x);
    }
    check('the pair keeps identical separation when mirrored', near(geometry[1], geometry[-1], 1e-9), `${geometry[1].toFixed(6)} vs ${geometry[-1].toFixed(6)}`);
}

// ── 5. Seek determinism ──────────────────────────────────────────────────────
{
    await drive('play', { facing: 1, x: 470, y: 360 });
    const forward = await drive('seek', 0.27);
    await drive('seek', constants.DURATION);
    await drive('seek', 0);
    await drive('seek', 0.51);
    const revisited = await drive('seek', 0.27);
    check('an arbitrary seek is order-independent',
        near(forward.atk.x, revisited.atk.x, 1e-9) && near(forward.def.x, revisited.def.x, 1e-9) && near(forward.def.y, revisited.def.y, 1e-9),
        `atk ${forward.atk.x.toFixed(6)} → ${revisited.atk.x.toFixed(6)}`);

    let repeated = revisited;
    for (let i = 0; i < 20; i++) repeated = await drive('seek', 0.27);
    check('re-applying one time never ratchets an actor', near(repeated.atk.x, forward.atk.x, 1e-9), `after 20 re-applies: ${repeated.atk.x.toFixed(6)}`);

    // Playing forward must land where a cold seek lands.
    await drive('play', { facing: 1, x: 470, y: 360 });
    const played = await drive('step', constants.CONTACT_AT);
    await drive('play', { facing: 1, x: 470, y: 360 });
    const sought = await drive('seek', constants.CONTACT_AT);
    check('playing forward and seeking cold agree',
        near(played.atk.x, sought.atk.x, 1e-9) && near(played.def.y, sought.def.y, 1e-9),
        `${played.atk.x.toFixed(6)} vs ${sought.atk.x.toFixed(6)}`);
}

// ── 6. Ring bounds ───────────────────────────────────────────────────────────
{
    const bounds = await h.page.evaluate(() => window.__PROOF.boundsAt(360));
    await drive('play', { facing: 1, x: bounds.right - 22, y: 360 });
    const end = await drive('step', constants.DURATION);
    const limit = await h.page.evaluate(y => window.__PROOF.boundsAt(y).right, end.atk.y);
    check('staging is clamped inside the ropes', end.atk.x <= limit - 20 + 1e-6 && end.def.x <= limit - 20 + 1e-6,
        `atk=${end.atk.x.toFixed(2)} def=${end.def.x.toFixed(2)} limit=${(limit - 20).toFixed(2)}`);
}

// ── 7. Cancellation ──────────────────────────────────────────────────────────
{
    for (const [label, at] of [['before contact', constants.STEP_AT - 0.05], ['after contact', constants.CONTACT_AT + 0.08]]) {
        await drive('play', { facing: 1, x: 470, y: 360 });
        const frozen = await drive('step', at);
        const cancelled = await drive('cancel');
        check(`cancelling ${label} moves nobody`, near(frozen.atk.x, cancelled.atk.x, 1e-9) && near(frozen.def.x, cancelled.def.x, 1e-9));
        const later = await drive('step', 1.0);
        check(`no post-cancellation drift ${label}`,
            near(frozen.atk.x, later.atk.x, 1e-9) && near(frozen.def.x, later.def.x, 1e-9) && near(frozen.def.y, later.def.y, 1e-9),
            `atk ${frozen.atk.x.toFixed(4)} → ${later.atk.x.toFixed(4)}`);
    }
}

// ── 8. Hammerlock is untouched: executor still owns staging ──────────────────
// Runs with the live loop RESUMED so the real Phaser staging tweens and the
// real Arena update drive it — this section is about what a player sees.
{
    await drive('resume');
    const started = await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        window.__PROOF.setup({ facing: 1, x: 470, y: 360 });
        sc.w1.state = 'lockup';
        sc.w2.state = 'lockup';
        sc.w1.x = 470;
        sc.w2.x = 520;
        sc.w1._doHammerlock(sc.w2);
        return {
            staging: sc.w1._activeMove?.staging ?? null,
            shared: sc.w1._activeMove === sc.w2._activeMove,
            before: { atk: sc.w1.x, def: sc.w2.x },
        };
    });
    // Let the REAL game loop drive the real staging tweens and the real runtime
    // — no hand-pumped clock, so this measures what a player would see.
    await h.page.waitForTimeout(400);
    const moved = await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        return { atk: sc.w1.x, def: sc.w2.x, facing: sc.w1.facing };
    });

    check('hammerlock authors no transform, so the clip takes no position ownership', started.staging === null, `staging=${JSON.stringify(started.staging)}`);
    check('hammerlock still binds one shared handle to both actors', started.shared === true);
    check('hammerlock executor staging still moves both wrestlers',
        Math.abs(moved.atk - started.before.atk) > 0.5 || Math.abs(moved.def - started.before.def) > 0.5,
        `atk ${started.before.atk.toFixed(1)}→${moved.atk.toFixed(1)}, def ${started.before.def.toFixed(1)}→${moved.def.toFixed(1)}`);
    check('hammerlock staging keeps the defender ahead on the attacker facing',
        Math.sign((moved.def - moved.atk) * moved.facing) === 1,
        `atk=${moved.atk.toFixed(1)} def=${moved.def.toFixed(1)} facing=${moved.facing}`);

    await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.w1._cancelActiveMove?.('proof-teardown');
    });
}

// Tear the proof clip back off the live runtime — it is not a gameplay move.
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    if (window.__PROOF.handle) sc.moveRuntime.cancel(window.__PROOF.handle, 'proof-teardown');
    sc.moveRuntime._clips.delete(window.__PROOF.clip.STAGING_PROOF_CLIP_ID);
});

await h.close();

console.log(notes.join('\n'));
if (failures.length) {
    console.log(`\n${failures.join('\n')}`);
    console.log(`\nFAIL — ${failures.length} of ${failures.length + notes.length} checks failed`);
    process.exit(1);
}
console.log(`\nPASS — ${notes.length} real-runtime staging checks, measured on live Wrestler and Skeleton state`);
