// Shared helpers for the reference-pass generators (author_piledriver.mjs,
// author_bodyslam.mjs): a beat table in, an editor draft and its generated
// clip module out. Each beat is [time, pose, transform x, reference frame or
// null, ease?, transform y?]; frames become editor-only references.

import { writeFileSync } from 'node:fs';
import { normalizeDraft, exportModule } from './model.js';

export const pose = (fields) => ({
    lArm: 0, rArm: 0, lElbow: 0.7, rElbow: 0.7, lLeg: -0.08, rLeg: 0.08, lKnee: 0.22, rKnee: 0.22,
    lean: 0, crouch: 0, tilt: 0, lift: 0, ...fields,
});

export function buildDraft({ id, duration, attacker, defender, events, characters, transformY = () => 0 }) {
    const track = (beats, role) => ({
        keyframes: beats.map(([at, beatPose, x, , ease = 'linear']) => ({
            at, ease, pose: beatPose, transform: { x, y: transformY(role, at) }, parts: {},
        })),
    });
    const references = [];
    for (const [role, beats] of [['attacker', attacker], ['defender', defender]]) {
        for (const [at, , , frame] of beats) {
            if (frame !== null) references.push({ role, at, frame, dx: 0, dy: 0, scale: 1, flip: false });
        }
    }
    return normalizeDraft({
        id, duration, posture: 'upright',
        tracks: { attacker: track(attacker, 'attacker'), defender: track(defender, 'defender') },
        events, references,
        preview: { facing: { attacker: 1, defender: -1 }, characters },
    });
}

export function writeDraftAndClip(draft, draftFile, clipFile) {
    const draftPath = new URL(`./drafts/${draftFile}`, import.meta.url);
    const clipPath = new URL(`../../src/animation/clips/${clipFile}`, import.meta.url);
    writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
    writeFileSync(clipPath, exportModule(draft));
    console.log(`wrote ${draftPath.pathname}\nwrote ${clipPath.pathname}`);
}
