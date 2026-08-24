// The authoring pass that solves the hammerlock's grip.
//
//   node tools/move-editor/author_hammerlock.mjs           # measure only
//   node tools/move-editor/author_hammerlock.mjs --write    # rewrite the draft
//
// This exists because the hammerlock's grip is a GEOMETRIC result, not a set of
// numbers anyone should hand-tune: the attacker's hand has to sit on the
// defender's trapped wrist at every graded frame, while both bodies are moving
// through an authored tableau. Hand-authored joint angles cannot hold that, and
// a reviewer cannot check them by reading them.
//
// So the choreography is DERIVED, in the real editor, through the real gesture:
//
//   1. Park the playhead on a keyframe time.
//   2. Put the defender's trapped wrist where a hammerlock puts it — just
//      behind its own hip, rising up the back as the crank progresses — by
//      solving the defender's near arm onto that point.
//   3. Solve the attacker's near arm onto the defender's resulting wrist.
//   4. Capture both roles.
//
// Steps 2 and 3 are `applyChainDrag`, the exact two-bone solve the editor's
// wrist handle runs. Nothing here reaches around the editor: the tableau, the
// easing, the markers and the variants all stay as authored, and only the four
// arm channels the grip needs are rewritten.
//
// The pass then sweeps readiness against the live rig and reports the worst
// residual over the whole held window — including BETWEEN keyframes, which is
// where a contact solved only at its keyframes falls apart.

import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';

const EDITOR_URL = process.env.WFM_URL ?? 'http://localhost:5198/tools/move-editor/';
const DRAFT_PATH = new URL('./drafts/hammerlock.json', import.meta.url);
const TRACKS_PATH = new URL('../../src/animation/clips/hammerlock.tracks.js', import.meta.url);
const write = process.argv.includes('--write');

// Where the trapped wrist sits, in px relative to the defender's own near hip,
// as a function of clip time. Behind the hip (against the small of the back)
// and rising up the back as the attacker cranks — which is what a hammerlock
// does to the arm it has trapped.
//
// `behind` is signed along the defender's facing, so the tableau mirrors.
// Where the trapped wrist travels, as a SMOOTH function of the hold's phase,
// in px relative to the defender's own near hip: tucked behind the small of the
// back, rising up the back as the attacker cranks. `behind` is signed along the
// defender's facing so the whole thing mirrors.
//
// Smooth, and sampled uniformly, for a measured reason. A two-bone solve has a
// redundancy that is resolved from wherever the arm currently is, so two
// consecutive solves can land on slightly different branches of the same
// solution — and the straight line the runtime interpolates between them bulges
// away from the contact. A hand-picked target path with kinks in it made that
// worse (measured 6.6 px of bulge); a smooth path sampled evenly keeps
// consecutive solves close enough that the line between them stays on the wrist.
const HOLD_FROM = 0.120;
const HOLD_TO = 1.400;
const GRIP_SAMPLE_SECONDS = 0.04;

function gripAt(at) {
    const phase = (at - HOLD_FROM) / (HOLD_TO - HOLD_FROM);
    const eased = phase * phase * (3 - 2 * phase); // smoothstep: no kink at either end
    return {
        at: Math.round(at * 1000) / 1000,
        behind: 10 + 8 * eased,
        lift: 2 + 56 * eased,
    };
}

const GRIP_PATH = (() => {
    const times = new Set([HOLD_FROM, HOLD_TO]);
    for (let at = HOLD_FROM; at < HOLD_TO; at += GRIP_SAMPLE_SECONDS) times.add(Math.round(at * 1000) / 1000);
    // The authored phase boundaries are sampled exactly, so the move's own
    // keyframes survive the pass rather than being averaged away by a grid.
    for (const at of [0.260, 0.300, 0.500]) times.add(at);
    return [...times].sort((a, b) => a - b).map(gripAt);
})();

// Both wrestlers PLANT for the duration of the hold.
//
// Measured, not stylistic. The legacy stance-to-stance choreography swings the
// legs hard through the whole hold (the attacker's far hip travels ~3 rad/s in
// places), and the torso origin is solved from BOTH hip sockets — so a leg
// swing moves the torso, which moves the shoulder, which moves the arm that is
// supposed to be holding a wrist. Measured on the reference rig: 0.015 rad of
// far hip moves the near ELBOW 9.98 px. The grip is solved exactly at each
// keyframe, so that motion reappears as a bulge BETWEEN keyframes, and no
// amount of extra keyframes fixes it because the cause is the travel, not the
// sampling.
//
// Freezing the legs at the catch removes the wobble at its source and is better
// wrestling: a working hammerlock is cranked from a braced base, not from a
// wrestler still walking through his stance. The entry and the catch keep their
// authored leg action; only the hold is planted.
const BRACE_FROM = 0.120;
const BRACED_CHANNELS = ['lLeg', 'rLeg', 'lKnee', 'rKnee'];

// The approach lands ON the catch, not 140ms after it.
//
// This is the one staging change the grip forced, and it is a correction rather
// than a compromise: the attacker cannot catch a wrist that is still 70 rig
// units away and closing. With the approach finishing at 0.26 the whole catch
// window had two bodies moving through each other, and a contact held by two
// independently interpolated chains picks up curvature error proportional to
// how far they travel between keyframes — measured 6.6 px, and densifying the
// keyframes did not help because the travel, not the sampling, was the cause.
//
// Landing the approach at the catch makes the tableau STATIC for the entire
// held window, so the only thing moving during the hold is the two arms. The
// entry tableau, the working tableau, the duration and all three markers are
// untouched; only the rate of the approach changes.
const STAGING_ARRIVAL_AT = 0.120;

// Easing carried by each authored keyframe, so the pass cannot flatten the
// move's timing while it fixes its geometry. Times not listed keep 'linear'.
const KEYFRAME_EASE = { 0.120: 'easeOut', 0.260: 'easeOut', 0.300: 'easeInOut', 0.500: 'easeOut' };

// Emit the solved choreography as a generated module. The keyframes are now
// SOLVED GEOMETRY — the output of a two-bone solve against a moving target —
// not stances anyone picked by hand, and writing them out as named constants
// would dress derived data up as authored data. What stays hand-written in
// hammerlock.js is everything a human actually decides: the duration, the
// phase times, the markers, the staging offsets and the reasoning.
function generateTrackModule(draft) {
    const round = value => Math.round(value * 10000) / 10000;
    const group = (frame, key) => {
        const entries = Object.entries(frame[key] ?? {});
        if (!entries.length) return null;
        const body = entries
            .map(([channel, value]) => `${channel}: ${typeof value === 'number' ? round(value) : JSON.stringify(value)}`)
            .join(', ');
        return `${key}: { ${body} }`;
    };
    const tracks = Object.entries(draft.tracks).map(([role, track]) => {
        const frames = track.keyframes.map(frame => {
            const parts = [`at: ${round(frame.at)}`];
            if (frame.ease && frame.ease !== 'linear') parts.push(`ease: ${JSON.stringify(frame.ease)}`);
            for (const key of ['pose', 'transform', 'parts']) {
                const rendered = group(frame, key);
                if (rendered) parts.push(rendered);
            }
            return `            { ${parts.join(', ')} },`;
        }).join('\n');
        return `    ${role}: {\n        keyframes: [\n${frames}\n        ],\n    },`;
    }).join('\n');

    return `// GENERATED by tools/move-editor/author_hammerlock.mjs — do not hand-edit.
//
// The hammerlock's choreography, solved rather than authored by hand: at every
// keyframe below the attacker's gripping wrist sits ON the defender's trapped
// wrist, because both arms were driven there by the move editor's own two-bone
// solve (the same one its wrist handle runs). Re-run the pass to change it; a
// hand edit here will be silently overwritten and will break the grip, which
// tests/hammerlockAuthoring.test.js and npm run proof:hammerlock both measure.
//
// The move's DECISIONS — duration, phase times, markers, the staging tableau,
// and why any of it is the way it is — live in ./hammerlock.js, which composes
// this data into the shipped clip.
export const HAMMERLOCK_TRACKS = {
${tracks}
};
`;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

try {
    await page.goto(EDITOR_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
    await page.waitForTimeout(400);

    // Start from the committed draft on disk, not from whatever the editor
    // happened to boot with, so the pass is reproducible.
    const source = JSON.parse(readFileSync(DRAFT_PATH, 'utf8'));
    await page.evaluate(draft => window.__MOVE_EDITOR.adoptDraft(draft, { label: 'hammerlock' }), source);
    await page.waitForTimeout(200);

    const solved = await page.evaluate(async ({ path, eases, arrivalAt, braceFrom, bracedChannels }) => {
        const editor = window.__MOVE_EDITOR;
        const $ = id => document.getElementById(id);
        const log = [];

        // Each role's WORKING offset, read off the draft's own last
        // transform-carrying keyframe — the approach is re-timed, never
        // re-invented.
        const working = {};
        for (const role of ['attacker', 'defender']) {
            const frames = editor.draft.tracks[role].keyframes;
            const last = [...frames].reverse().find(frame => Number.isFinite(frame.transform?.x));
            if (!last) throw new Error(`no authored staging for ${role}`);
            working[role] = { ...last.transform };
        }

        // The braced stance, read off the clip's own catch frame rather than
        // invented: whatever the legs were doing when the hand arrived is what
        // they hold for the rest of the hold.
        editor.setPlayhead(braceFrom);
        const braced = {};
        for (const role of ['attacker', 'defender']) {
            braced[role] = Object.fromEntries(bracedChannels.map(channel => [channel, editor.actors[role].pose[channel]]));
        }

        for (const step of path) {
            editor.setPlayhead(step.at);
            // Plant both wrestlers for the hold, from the braced stance the
            // catch frame establishes.
            if (step.at >= braceFrom) {
                for (const role of ['attacker', 'defender']) {
                    if (!braced[role]) continue;
                    for (const channel of bracedChannels) editor.actors[role].pose[channel] = braced[role][channel];
                }
            }
            // Pin the staging BEFORE solving, not just before capturing: the
            // arms are solved against where the bodies actually stand, so
            // moving a body afterwards would break the grip by exactly the
            // distance it moved. (Measured 32 px when this ran in the wrong
            // order — the defender's remaining approach at the catch frame.)
            for (const role of ['attacker', 'defender']) {
                if (step.at >= arrivalAt) editor.actors[role].transform = { ...working[role] };
            }
            // Several solve passes: the two arm chains move each other's
            // reference frame (a solved shoulder shifts the wrist it is solving
            // toward), so one pass leaves px on the table.
            // jointAttachmentPoints are published by the RENDER, so every solve
            // is followed by one: reading them without re-rendering solves
            // against the previous frame and never converges.
            editor.renderActor('defender');
            editor.renderActor('attacker');
            for (let pass = 0; pass < 6; pass++) {
                const defender = editor.actors.defender;
                const hip = defender.skeleton.jointAttachmentPoints.nearHip;
                const target = {
                    x: hip.x - defender.facing * step.behind * editor.SCALE,
                    y: hip.y - step.lift * editor.SCALE,
                };
                editor.applyChainDrag('defender', 'near', 'wrist', target);
                editor.renderActor('defender');
                const trapped = editor.actors.defender.skeleton.jointAttachmentPoints.nearWrist;
                editor.applyChainDrag('attacker', 'near', 'wrist', trapped);
                editor.renderActor('attacker');
            }
            const grip = editor.actors.attacker.skeleton.jointAttachmentPoints.nearWrist;
            const trapped = editor.actors.defender.skeleton.jointAttachmentPoints.nearWrist;
            log.push({
                at: step.at,
                residual: Math.hypot(grip.x - trapped.x, grip.y - trapped.y),
                atk: { lArm: editor.actors.attacker.pose.lArm, lElbow: editor.actors.attacker.pose.lElbow },
                def: { lArm: editor.actors.defender.pose.lArm, lElbow: editor.actors.defender.pose.lElbow },
            });

            // Capture through the real per-role gesture, preserving each
            // keyframe's authored easing. Every step of the grip path is at or
            // after the arrival, so pinning the working offset here is what
            // lands the approach on the catch: the entry keyframe at t=0 keeps
            // the entry tableau, and everything from the catch onward is
            // stationary.
            for (const role of ['defender', 'attacker']) {
                $('role').value = role;
                $('role').dispatchEvent(new Event('change', { bubbles: true }));
                $('ease').value = eases[String(step.at)] ?? 'linear';
                editor.capture();
            }
        }
        return log;
    }, { path: GRIP_PATH, eases: KEYFRAME_EASE, arrivalAt: STAGING_ARRIVAL_AT, braceFrom: BRACE_FROM, bracedChannels: BRACED_CHANNELS });

    // Declare the hold over the whole worked window, and sweep it.
    const report = await page.evaluate(async ({ from, to }) => {
        const editor = window.__MOVE_EDITOR;
        const model = await import('/tools/move-editor/model.js');
        editor.draft.contacts = [{ from, to, role: 'attacker', source: 'nearWrist', target: 'nearWrist', required: true }];
        const swept = editor.readiness();
        const contact = swept.contacts[0];
        return {
            ok: swept.ok,
            blocking: swept.blocking,
            warnings: swept.warnings,
            contact: contact && {
                severity: contact.severity, maxGap: contact.maxGap, worstAt: contact.worstAt,
                graded: contact.graded, measured: contact.measured, reachPx: contact.reachPx,
            },
            draft: model.normalizeDraft(editor.draft),
        };
    }, { from: 0.12, to: 1.4 });

    if (process.env.PROFILE) {
        const detail = await page.evaluate(async () => {
            const editor = window.__MOVE_EDITOR;
            const model = await import('/tools/move-editor/model.js');
            const renderAt = (at) => {
                const sampled = model.sampleDraft(editor.draft, at);
                for (const role of ['attacker', 'defender']) {
                    const state = sampled.tracks[role];
                    editor.actors[role].pose = { ...model.basePose(), ...state.pose };
                    editor.actors[role].transform = { x: 0, y: 0, ...state.transform };
                    editor.actors[role].parts = { ...state.parts };
                    editor.renderActor(role);
                }
                const a = editor.actors.attacker.skeleton.jointAttachmentPoints.nearElbow;
                return { x: Math.round(a.x * 100) / 100, y: Math.round(a.y * 100) / 100 };
            };
            const out = {};
            out.first = renderAt(0.21);
            out.repeat = renderAt(0.21);
            renderAt(0.30);
            out.afterOther = renderAt(0.21);
            renderAt(0.20);
            out.afterNeighbour = renderAt(0.21);
            // And with the pose-channel cache explicitly cleared, the way
            // Wrestler.draw() does before every render path.
            editor.actors.attacker.skeleton.invalidatePoseChannels();
            editor.actors.defender.skeleton.invalidatePoseChannels();
            out.afterInvalidate = renderAt(0.21);
            return out;
        });
        console.log('attacker nearElbow at t=0.21 under different histories:');
        for (const [when, point] of Object.entries(detail)) console.log(`  ${when.padEnd(16)} ${point.x},${point.y}`);
    }
    console.log('solved keyframes:');
    for (const entry of solved) {
        console.log(`  t=${entry.at.toFixed(3)}  residual ${entry.residual.toFixed(3)} px`
            + `  atk lArm ${entry.atk.lArm.toFixed(3)} lElbow ${entry.atk.lElbow.toFixed(3)}`
            + `  def lArm ${entry.def.lArm.toFixed(3)} lElbow ${entry.def.lElbow.toFixed(3)}`);
    }
    console.log(`\nswept hold: ${report.contact.severity.toUpperCase()} — worst ${report.contact.maxGap.toFixed(2)} px at ${report.contact.worstAt.toFixed(3)}s`
        + ` over ${report.contact.graded} graded frames (limb reach ${report.contact.reachPx.toFixed(1)} px)`);
    console.log(`readiness: ${report.ok ? 'READY' : 'NOT READY'}`);
    for (const issue of report.blocking) console.log(`  ✗ ${issue}`);
    for (const warning of report.warnings) console.log(`  ! ${warning}`);
    if (errors.length) console.log(`browser errors: ${errors.join(' | ')}`);

    if (write) {
        writeFileSync(DRAFT_PATH, JSON.stringify(report.draft, null, 4) + '\n');
        writeFileSync(TRACKS_PATH, generateTrackModule(report.draft));
        console.log(`\nwrote ${DRAFT_PATH.pathname}`);
        console.log(`wrote ${TRACKS_PATH.pathname}`);
    } else {
        console.log('\n(measure only — pass --write to update the draft)');
    }
} finally {
    await browser.close();
}
