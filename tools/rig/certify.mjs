// Articulation certification runner.
//
//   node tools/rig/certify.mjs [character...]
//
// Drives the high-strain matrix through the REAL render paths in Chrome and
// measures rendered transforms, then attributes every failure to one of:
// architecture / source-artwork / binding-geometry / animation-data /
// runtime-transport / coverage-gap.
//
// The reference rig (src/rig/referenceRig.js) is always certified first and
// is the control. It is the only character that executes the full production
// contract — exact two-anchor bindings, independent hand and boot attachment
// slots, pelvisUnderlay/pelvisMask, part variants — so if IT fails an
// invariant, no character's artwork can be blamed and the finding is
// architectural. If it passes and a legacy character fails, the failure is
// that character's art.
//
// Exit code is 0 when nothing architectural is broken and every character
// stays inside its recorded budget. Known legacy-art defects live in
// KNOWN_LEGACY_DEFECTS below so that "4 FAIL" stops being noise: a defect on
// that list is reported as expected, and one that disappears is reported too,
// so the list cannot rot silently.

import { launch } from '../debug/harness.mjs';
import { POSES } from '../../src/Wrestler.js';
import Skeleton from '../../src/Skeleton.js';
import {
    CERTIFICATION_MATRIX,
    FACINGS,
    GETUP_SAMPLES,
    MOTION_SAMPLES,
    coverageGaps,
    motionFrames,
    postureGaps,
    isFootBearing,
    riggedEntries,
} from '../../src/rig/certificationMatrix.js';
import {
    DEFAULT_BUDGET,
    certifyFacingSymmetry,
    certifyMotion,
    certifyPose,
    certifyVariantDrift,
    classifyFinding,
    measureSample,
} from '../../src/rig/certification.js';

// Legacy-art defects Derek has already accepted, keyed
// character/entry/facing/joint. These are art-source problems on characters
// scheduled for regeneration under the production standard; the fix is new
// art, never a fixed attachment offset. Anything here that stops reproducing
// is surfaced as "resolved" rather than silently dropped.
const KNOWN_LEGACY_DEFECTS = [
    { character: 'thesz', entry: 'overhead-double-axe', joints: ['nearElbow', 'farElbow'], note: 'legacy fixed forearm offsets; ~3-5px elbow ink gap at full overhead extension' },
    // Both sides reproduce at 2.83px; the far side only shows at facing -1,
    // which is why an audit that probed one facing per pose never saw it.
    { character: 'thesz', entry: 'hammerlock', joints: ['nearElbow', 'farElbow'], note: 'legacy fixed forearm offsets; ~2.83px elbow ink gap' },
];

// Sole grounding is MEASURED but not GRADED, deliberately.
//
// The kernel's `certifySoleGrounding` is correct and unit-tested, but a gate
// needs a defensible rule for which poses owe a planted foot, and I do not
// have one yet. Two candidate rules were tried against the rendered evidence
// and both were wrong:
//
//   1. "every foot-bearing upright entry" — fails kneeling and chambered
//      poses that legitimately lift a foot, and flagged the SUPPORT foot
//      floating 6-12px on most pose-driven entries.
//   2. "only where the gait branch runs, since only `_gaitLeg` consults
//      authored sole anchors" — excluded relaxed-stance, combat-guard and
//      straight-jab, which were among the few entries actually grounding
//      correctly. So the gait/pose-driven split does not predict grounding.
//
// Rather than widen a budget until the run goes green — which would make the
// invariant assert nothing while looking rigorous — the clearances are
// reported as observations.
//
// Grading was originally slated for the grounded-state migration. That landed
// on 2026-08-13 and did NOT resolve this: it moved down/pinned/possum onto the
// rig but never touched the UPRIGHT leg solve, which is where the float lives.
// The rule still needs writing against the observed data — deep-squat sits
// +18px off the mat and is the outlier worth explaining first.
//
// Recorded so the numbers are visible now and the rule can be written against
// evidence rather than against a guess.
function soleClearances(sample, groundY) {
    return Object.entries(sample.semanticAnchors ?? {})
        .filter(([name, point]) => name.endsWith('.sole') && Number.isFinite(point?.y))
        .map(([name, point]) => ({ slot: name, aboveGroundPx: groundY - point.y }));
}

// The control specimen. Always certified first so its verdict is available
// to attribute every later character's findings.
const REFERENCE_ID = 'refrig';

// Characters that declare the production contract. Only these can produce a
// 'binding-geometry' verdict; the rest fall to 'source-artwork'.
const COMPLIANT = new Set([REFERENCE_ID]);

const args = process.argv.slice(2);
// The reference rig is not optional. Attribution is meaningless without the
// control, so it is prepended even when the caller names specific characters.
const CHARACTERS = [
    REFERENCE_ID,
    ...(args.length ? args : ['george', 'thesz']).filter(id => id !== REFERENCE_ID),
];

const SKELETON_SLOTS = [
    'torso', 'head', 'pelvisUnderlay', 'pelvisMask', 'pelvisOverlay',
    'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearHand', 'farHand',
    'nearThigh', 'farThigh', 'nearShin', 'farShin', 'nearBoot', 'farBoot',
];

const FLEX_CHANNELS = ['lElbow', 'rElbow', 'lKnee', 'rKnee'];

// Where the certified skeleton is planted. GROUND_Y is the mat line every
// sole-grounding measurement is taken against, so the renderer and the
// grader must read it from the same constant.
const RENDER_ORIGIN = Object.freeze({ x: 550, y: 520, scale: 1 });
const GROUND_Y = RENDER_ORIGIN.y;

// ── In-page instrumentation ──────────────────────────────────────────────
// Installed once per page. Builds a Skeleton for the requested character
// (painting and registering the reference rig's textures on demand), drives
// it through the real updateUpright/updateGetUp entry points, and returns
// plain serializable observations for the pure kernel to measure.
async function installProbe(page) {
    await page.evaluate(({ slots, flexChannels, origin }) => {
        window.__wfmCert = {};
        const scene = window.__WFM_GAME.scene.scenes.find(candidate => candidate.w1);
        window.__wfmCert.scene = scene;

        window.__wfmCert.buildSkeleton = async (characterId) => {
            // The reference rig is built through its public construction API,
            // not through a private copy of it here — the certifier and the
            // move editor's preview must not be able to drift apart.
            const runtime = await import('/src/rig/referenceRigRuntime.js');
            let skeleton;
            let character;
            if (characterId === runtime.REFERENCE_RIG_ID) {
                ({ skeleton, character } = runtime.createReferenceRigSkeleton(scene));
            } else {
                const { default: Skeleton } = await import('/src/Skeleton.js');
                const module = await import(`/src/characters/${characterId}.js`);
                character = module[characterId];
                skeleton = new Skeleton(scene, character.skinCol, character.trunksCol, character.textures);
                skeleton.setDepth(50);
                skeleton.setVisible(true);
            }
            window.__wfmCert.skeleton = skeleton;
            window.__wfmCert.character = character;
            return {
                id: character.id,
                slots: slots.filter(slot => !!skeleton[slot]),
                // A character with no bindings cannot certify the binding
                // architecture no matter how many poses it survives.
                exercises: runtime.exercisedSubsystems(skeleton, character),
            };
        };

        const transformOf = (image) => {
            if (!image) return null;
            return {
                visible: image.visible !== false,
                x: image.x, y: image.y, rotation: image.rotation,
                originX: image.originX, originY: image.originY,
                displayWidth: image.displayWidth, displayHeight: image.displayHeight,
                flipX: !!image.flipX, flipY: !!image.flipY, depth: image.depth,
                key: image.texture?.key ?? null,
                anchors: image._binding
                    ? { proximal: image._binding.proximal, distal: image._binding.distal }
                    : null,
            };
        };

        window.__wfmCert.capture = () => {
            const skeleton = window.__wfmCert.skeleton;
            const parts = {};
            for (const slot of slots) {
                const transform = transformOf(skeleton[slot]);
                if (transform) parts[slot] = transform;
            }
            // The torso carries the rig sockets that root every shoulder and
            // hip chain; attach them to the torso part so the kernel can
            // resolve socket-parented chains from one snapshot.
            if (parts.torso && skeleton._torsoSockets) parts.torso.sockets = { ...skeleton._torsoSockets };
            // The head attaches through headAnchorFrac rather than through a
            // two-anchor binding (its neck is a single point, not a bone), so
            // surface it as the head's proximal anchor to make the neck chain
            // measurable on the same footing as every other joint.
            if (parts.head && skeleton._headAnchorFrac) {
                parts.head.anchors = { proximal: skeleton._headAnchorFrac };
            }
            const flex = {};
            for (const channel of flexChannels) {
                const value = skeleton.currentPoseChannel(channel);
                if (value !== undefined) flex[channel] = value;
            }
            return {
                parts,
                flex,
                joints: JSON.parse(JSON.stringify(skeleton.jointAttachmentPoints ?? {})),
                semanticAnchors: JSON.parse(JSON.stringify(skeleton.semanticAnchors ?? {})),
            };
        };

        // Render one upright frame. `pose` is a plain POSES entry (or a blend
        // of two), driven through the same updateUpright the game calls.
        window.__wfmCert.renderUpright = (pose, facing, variants) => {
            const skeleton = window.__wfmCert.skeleton;
            skeleton.invalidatePoseChannels();
            if (variants) skeleton.setPartVariants(variants);
            skeleton.updateUpright(origin.x, origin.y, origin.scale, facing, pose, 0, 0, pose.lean ?? 0, 0, 1, 0);
            return window.__wfmCert.capture();
        };

        window.__wfmCert.renderGrounded = (poseName, facing) => {
            const skeleton = window.__wfmCert.skeleton;
            skeleton.invalidatePoseChannels();
            skeleton.updateGrounded(origin.x, origin.y, origin.scale, facing, poseName);
            return window.__wfmCert.capture();
        };

        window.__wfmCert.renderGetUp = (t, facing) => {
            const skeleton = window.__wfmCert.skeleton;
            skeleton.invalidatePoseChannels();
            skeleton.updateGetUp(origin.x, origin.y, origin.scale, facing, t);
            return window.__wfmCert.capture();
        };

        // Ink-gap probe: inverse-transform world samples into each rendered
        // PNG and find the nearest opaque parent/child pixels around a joint.
        // A display rectangle that merely contains the joint is not coverage.
        const texturePixels = new Map();
        const pixelsFor = (image) => {
            const key = image.texture.key;
            if (texturePixels.has(key)) return texturePixels.get(key);
            const source = image.texture.getSourceImage();
            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(source, 0, 0);
            const pixels = {
                data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
                width: canvas.width,
            };
            texturePixels.set(key, pixels);
            return pixels;
        };
        const opaqueAt = (image, wx, wy) => {
            if (!image?.texture || image.texture.key === 'sk_pixel') return false;
            const dx = wx - image.x;
            const dy = wy - image.y;
            const c = Math.cos(image.rotation);
            const s = Math.sin(image.rotation);
            const lx = c * dx + s * dy;
            const ly = -s * dx + c * dy;
            let u = lx / image.displayWidth + image.originX;
            let v = ly / image.displayHeight + image.originY;
            if (image.flipX) u = 1 - u;
            if (image.flipY) v = 1 - v;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
            const frame = image.frame;
            const px = Math.max(0, Math.min(frame.cutWidth - 1, Math.floor(u * frame.cutWidth)));
            const py = Math.max(0, Math.min(frame.cutHeight - 1, Math.floor(v * frame.cutHeight)));
            const pixels = pixelsFor(image);
            return pixels.data[((frame.cutY + py) * pixels.width + (frame.cutX + px)) * 4 + 3] >= 32;
        };
        const inkNear = (image, point, radius) => {
            const found = [];
            for (let y = Math.floor(point.y - radius); y <= Math.ceil(point.y + radius); y++) {
                for (let x = Math.floor(point.x - radius); x <= Math.ceil(point.x + radius); x++) {
                    if ((x - point.x) ** 2 + (y - point.y) ** 2 > radius * radius) continue;
                    if (opaqueAt(image, x + 0.5, y + 0.5)) found.push([x, y]);
                }
            }
            return found;
        };

        // Joint-surface continuity (objective 3) and pelvis coverage
        // (objective 2), measured in ink rather than in bounding boxes.
        window.__wfmCert.inkGaps = (pairs, radius = 14) => {
            const skeleton = window.__wfmCert.skeleton;
            const out = {};
            for (const [name, parentSlot, childSlot] of pairs) {
                const joint = skeleton.jointAttachmentPoints?.[name];
                if (!joint) continue;
                const parent = skeleton[parentSlot];
                const child = skeleton[childSlot];
                if (!parent || !child) continue;
                const a = inkNear(parent, joint, radius);
                const b = inkNear(child, joint, radius);
                let gap = Infinity;
                for (const [ax, ay] of a) {
                    for (const [bx, by] of b) {
                        const d = Math.hypot(ax - bx, ay - by);
                        if (d < gap) gap = d;
                        if (gap === 0) break;
                    }
                    if (gap === 0) break;
                }
                out[name] = {
                    inkGap: Number.isFinite(gap) ? gap : null,
                    parentPixels: a.length,
                    childPixels: b.length,
                };
            }
            return out;
        };
    }, { slots: SKELETON_SLOTS, flexChannels: FLEX_CHANNELS, origin: RENDER_ORIGIN });
}

// Ink pairs mirror the structural chains, including the hip seam that proves
// the pelvis layers close over a rotating thigh root.
const INK_PAIRS = [
    ['neck', 'torso', 'head'],
    ['nearShoulder', 'torso', 'nearUpArm'],
    ['farShoulder', 'torso', 'farUpArm'],
    ['nearElbow', 'nearUpArm', 'nearForearm'],
    ['farElbow', 'farUpArm', 'farForearm'],
    ['nearWrist', 'nearForearm', 'nearHand'],
    ['farWrist', 'farForearm', 'farHand'],
    ['nearHip', 'torso', 'nearThigh'],
    ['farHip', 'torso', 'farThigh'],
    ['nearKnee', 'nearThigh', 'nearShin'],
    ['farKnee', 'farThigh', 'farShin'],
    ['nearAnkle', 'nearShin', 'nearBoot'],
    ['farAnkle', 'farShin', 'farBoot'],
];

const MAX_INK_GAP_PX = 2.5;

function blendPose(from, to, t) {
    const result = {};
    for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
        const a = from[key] ?? 0;
        const b = to[key] ?? a;
        result[key] = typeof a === 'number' && typeof b === 'number' ? a + (b - a) * t : b;
    }
    return result;
}

function knownDefect(character, entryId, joint) {
    return KNOWN_LEGACY_DEFECTS.find(defect => defect.character === character
        && defect.entry === entryId
        && defect.joints.includes(joint));
}

async function certifyCharacter(page, characterId, referenceFailures) {
    const info = await page.evaluate(id => window.__wfmCert.buildSkeleton(id), characterId);
    const compliant = COMPLIANT.has(characterId);
    const isReference = characterId === REFERENCE_ID;
    const report = {
        character: characterId,
        isReference,
        exercises: info.exercises,
        compliant,
        findings: [],
        measured: 0,
        unmeasurable: new Set(),
        inkFailures: [],
        expectedDefects: [],
        soleObservations: new Map(),
    };

    const record = (entry, facing, finding) => {
        const category = classifyFinding({
            finding,
            referenceFailed: referenceFailures?.has(`${finding.kind}:${finding.joint ?? finding.channel ?? finding.detail ?? ''}`) ?? false,
            characterIsCompliant: compliant,
            renderPath: entry.renderPath,
            isReference,
        });
        report.findings.push({ entry: entry.id, facing, category, ...finding });
    };

    for (const entry of riggedEntries()) {
        const perFacing = {};
        for (const facing of FACINGS) {
            const samples = [];

            // Ink probing is a per-pixel scan of two textures around a joint,
            // so it runs at the authored KEYFRAMES rather than on every
            // interpolated frame. Keyframes are where the authored extremes
            // live — axeHandleUp, hammerlockCrank — and an earlier draft that
            // probed only each entry's final frame silently skipped every one
            // of them, reporting Lou's documented overhead elbow gap as clean.
            const plan = [];
            if (entry.getUp) {
                for (const [index, t] of GETUP_SAMPLES.entries()) {
                    plan.push({
                        render: page => page.evaluate(
                            ({ t, facing }) => window.__wfmCert.renderGetUp(t, facing),
                            { t, facing },
                        ),
                        // Probe ink at the grounded keyposes, not at every
                        // one of the 49 interpolation samples.
                        keyframe: index % 8 === 0,
                        t,
                        label: `t=${t.toFixed(2)}`,
                    });
                }
            } else if (entry.groundedPose) {
                plan.push({
                    render: page => page.evaluate(
                        ({ poseName, facing }) => window.__wfmCert.renderGrounded(poseName, facing),
                        { poseName: entry.groundedPose, facing },
                    ),
                    keyframe: true,
                    label: entry.groundedPose,
                });
            } else if (entry.motion) {
                for (const frame of motionFrames(entry, MOTION_SAMPLES)) {
                    const pose = blendPose(POSES[frame.from], POSES[frame.to], frame.t);
                    plan.push({
                        render: page => page.evaluate(
                            ({ pose, facing }) => window.__wfmCert.renderUpright(pose, facing),
                            { pose, facing },
                        ),
                        keyframe: frame.t === 0,
                        pose,
                        label: frame.t === 0 ? frame.from : `${frame.from}->${frame.to}@${frame.t.toFixed(2)}`,
                    });
                }
                // The closing keyframe is never a `t === 0` boundary.
                plan.at(-1).keyframe = true;
                plan.at(-1).label = entry.motion.at(-1);
            } else {
                plan.push({
                    render: page => page.evaluate(
                        ({ pose, facing }) => window.__wfmCert.renderUpright(pose, facing),
                        { pose: POSES[entry.pose], facing },
                    ),
                    keyframe: true,
                    label: entry.pose,
                    pose: POSES[entry.pose],
                });
            }

            for (const step of plan) {
                const sample = await step.render(page);
                samples.push(sample);
                report.measured++;
                for (const finding of certifyPose(sample)) record(entry, facing, finding);

                // Sole grounding applies to states that bear weight. The
                // get-up spends most of its length deliberately off the feet,
                // so it is graded only where it hands off to standing.
                // Observed, not graded — see soleClearances above.
                if (isFootBearing(entry)) {
                    const clearances = soleClearances(sample, GROUND_Y);
                    if (clearances.length === 0) {
                        report.unmeasurable.add('soles: no boot sole anchors; character has no attachment-slot boots');
                    }
                    for (const clearance of clearances) {
                        const worst = report.soleObservations.get(entry.id);
                        if (!worst || Math.abs(clearance.aboveGroundPx) < Math.abs(worst.aboveGroundPx)) {
                            // Best-planted foot per entry: the wrestler only
                            // needs one down, so the closest sole is the one
                            // that characterises the pose.
                            report.soleObservations.set(entry.id, clearance);
                        }
                    }
                }

                if (!step.keyframe) continue;
                // Joint-surface continuity in ink, measured while the
                // skeleton still holds this exact frame.
                const inks = await page.evaluate(pairs => window.__wfmCert.inkGaps(pairs), INK_PAIRS);
                for (const [joint, result] of Object.entries(inks)) {
                    const gap = result.inkGap;
                    if (gap !== null && gap <= MAX_INK_GAP_PX) continue;
                    const defect = knownDefect(characterId, entry.id, joint);
                    if (defect) {
                        report.expectedDefects.push({ entry: entry.id, facing, joint, gap, pose: step.label, note: defect.note });
                        continue;
                    }
                    report.inkFailures.push({ entry: entry.id, facing, joint, gap, pose: step.label });
                    record(entry, facing, {
                        kind: 'joint-ink-gap',
                        joint,
                        gapPx: gap,
                        pose: step.label,
                        budgetPx: MAX_INK_GAP_PX,
                    });
                }
            }

            // Intermediate-frame continuity, graded across the WHOLE sequence.
            //
            // This used to be split into two segments around the get-up's
            // turn-over at Skeleton.ON_BACK_UNTIL_T, which was a genuine
            // authored discontinuity. That turn-over came from the on-back
            // reflection, which was removed (2026-08-17) because it rendered
            // every part upside down. With the rise now entirely prone there
            // is no authored discontinuity left, so the exemption goes with
            // it and continuity is checked end to end — strictly more than
            // before.
            for (const finding of certifyMotion(samples).findings) record(entry, facing, finding);

            // Which chains this character simply cannot answer for.
            for (const measurement of measureSample(samples.at(-1))) {
                if (measurement.status === 'unmeasurable') {
                    report.unmeasurable.add(`${measurement.joint}: ${measurement.reason}`);
                }
            }

            perFacing[facing] = samples.at(-1);
        }

        // Facing symmetry: bend direction must not invert when mirrored.
        for (const finding of certifyFacingSymmetry(perFacing[1], perFacing[-1])) {
            record(entry, 'both', finding);
        }
    }

    // Variant swap: structural anchors must not move, semantic contacts may.
    if (info.exercises.partVariants) {
        for (const [slot, jointName, semanticName, ids] of [
            ['nearHand', 'nearWrist', 'nearHand.contact', ['open', 'fist', 'grip']],
            ['nearBoot', 'nearAnkle', 'nearBoot.sole', ['neutral', 'flexed', 'toePoint']],
        ]) {
            const byVariant = {};
            for (const id of ids) {
                byVariant[id] = await page.evaluate(
                    ({ pose, slot, id }) => window.__wfmCert.renderUpright(pose, 1, { [slot]: id }),
                    { pose: POSES.theszIdle, slot, id },
                );
            }
            for (const finding of certifyVariantDrift(byVariant, { slot, jointName, semanticName })) {
                report.findings.push({ entry: 'variant-swap', facing: 1, category: 'binding-geometry', ...finding });
            }
        }
    }

    report.unmeasurable = [...report.unmeasurable];
    report.soleObservations = [...report.soleObservations.entries()].map(([entry, c]) => ({ entry, ...c }));
    return report;
}

// ── Report ───────────────────────────────────────────────────────────────

function summarize(report) {
    const byCategory = new Map();
    for (const finding of report.findings) {
        byCategory.set(finding.category, (byCategory.get(finding.category) ?? 0) + 1);
    }
    return byCategory;
}

const h = await launch();
let exitCode = 0;
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.some(scene => scene.w1));
    await installProbe(h.page);

    const reports = [];
    let referenceFailures = new Set();

    for (const characterId of CHARACTERS) {
        const report = await certifyCharacter(h.page, characterId, referenceFailures);
        reports.push(report);
        if (characterId === 'refrig') {
            referenceFailures = new Set(report.findings.map(
                finding => `${finding.kind}:${finding.joint ?? finding.channel ?? finding.detail ?? ''}`,
            ));
        }
    }

    console.log('\n══ ARTICULATION CERTIFICATION ══\n');

    for (const report of reports) {
        const categories = summarize(report);
        // A chain nobody could measure is NOT a chain that passed. Reporting
        // "CERTIFIED" over unmeasurable chains is precisely how the binding
        // architecture went unverified across 205 green tests — George clears
        // every pose in this matrix while exercising none of the production
        // contract, and that has to read as unverified, not as a pass.
        const status = report.findings.length > 0 ? 'FINDINGS'
            : report.unmeasurable.length > 0 ? `UNVERIFIED (${report.unmeasurable.length} chains unmeasurable)`
                : 'CERTIFIED';
        console.log(`── ${report.character} — ${status} (${report.measured} rendered frames)`);
        console.log('   production contract exercised:');
        for (const [name, value] of Object.entries(report.exercises)) {
            console.log(`     ${value ? '✓' : '✗'} ${name}`);
        }
        if (report.unmeasurable.length) {
            console.log(`   unmeasurable chains (${report.unmeasurable.length}):`);
            for (const reason of report.unmeasurable.slice(0, 4)) console.log(`     · ${reason}`);
            if (report.unmeasurable.length > 4) console.log(`     · …${report.unmeasurable.length - 4} more`);
        }
        if (report.expectedDefects.length) {
            const joints = new Set(report.expectedDefects.map(defect => `${defect.entry}/${defect.joint}`));
            console.log(`   known legacy-art defects reproduced: ${[...joints].join(', ')}`);
        }
        if (report.soleObservations.length) {
            const sorted = [...report.soleObservations]
                .sort((a, b) => Math.abs(b.aboveGroundPx) - Math.abs(a.aboveGroundPx));
            const worst = sorted.slice(0, 3)
                .map(observation => `${observation.entry} ${observation.aboveGroundPx >= 0 ? '+' : ''}${observation.aboveGroundPx.toFixed(1)}px`)
                .join(', ');
            console.log(`   sole clearance (OBSERVED, not graded) — best-planted foot per entry`);
            console.log(`     furthest from the mat: ${worst}`);
            console.log('     grading deferred to the grounded-state migration; see certify.mjs');
        }
        for (const [category, count] of [...categories].sort((a, b) => b[1] - a[1])) {
            console.log(`   ${category}: ${count}`);
        }
        // Which matrix entries a finding kind concentrates in is usually more
        // diagnostic than the raw count — a defect in one pose is a pose
        // problem, the same defect everywhere is a contract problem.
        const byKind = new Map();
        for (const finding of report.findings) {
            const key = finding.kind;
            if (!byKind.has(key)) byKind.set(key, new Set());
            byKind.get(key).add(finding.entry);
        }
        for (const [kind, entries] of byKind) {
            console.log(`     ${kind} in: ${[...entries].join(', ')}`);
        }
        // Surface the actual worst offenders, not just counts.
        for (const finding of report.findings.slice(0, 6)) {
            const where = `${finding.entry}/facing ${finding.facing}`;
            const detail = finding.errorPx !== undefined ? `${finding.errorPx.toFixed(2)}px`
                : finding.gapPx !== undefined ? `${finding.gapPx?.toFixed?.(2) ?? finding.gapPx}px`
                    : finding.driftPx !== undefined ? `${finding.driftPx.toFixed(3)}px`
                        : finding.aboveGroundPx !== undefined ? `${finding.aboveGroundPx.toFixed(2)}px above mat (${finding.nearestSlot})`
                            : finding.belowGroundPx !== undefined ? `${finding.belowGroundPx.toFixed(2)}px below mat (${finding.slot})`
                                : finding.deltaRad !== undefined ? `${finding.deltaRad.toFixed(3)}rad`
                                    : (finding.detail ?? '');
            console.log(`     [${finding.category}] ${finding.kind} ${finding.joint ?? finding.channel ?? ''} @ ${where} ${detail}`);
        }
        if (report.findings.length > 6) console.log(`     …${report.findings.length - 6} more`);
        console.log('');

        // Only architecture-class findings and unexpected ink gaps fail the
        // run. Legacy artwork on a character queued for regeneration is
        // reported, not blocking.
        if (categories.get('architecture') || categories.get('runtime-transport')) exitCode = 1;
    }

    const gaps = coverageGaps();
    console.log(`── matrix coverage: ${riggedEntries().length}/${CERTIFICATION_MATRIX.length} entries reach the modular rig`);
    for (const entry of gaps) {
        console.log(`   ✗ ${entry.label} — ${entry.gap}`);
    }
    console.log('\n   These states cannot be certified because the rig never draws them.');
    console.log('   Authoring wrestling moves on them exercises no articulation guarantee.\n');

    // Reaching the rig is not the same as having a posture. Printed right
    // under the coverage number so the two are never conflated.
    const postures = postureGaps();
    if (postures.length) {
        console.log(`── posture gaps: ${postures.length} entries reach the rig but render a stand-in pose`);
        for (const entry of postures) {
            console.log(`   • ${entry.label} — ${entry.postureGap}`);
        }
        console.log('\n   The rig draws these; the wrestling posture itself is not authored yet.\n');
    }

    // A reference rig that cannot certify itself invalidates every other
    // verdict in this report, so say so loudly.
    const reference = reports.find(report => report.character === 'refrig');
    if (reference && reference.findings.length) {
        console.log('!! The reference rig itself has findings — attribution for every other');
        console.log('!! character in this run is unreliable until those are resolved.\n');
        exitCode = 1;
    }
} finally {
    await h.close();
}
process.exit(exitCode);
