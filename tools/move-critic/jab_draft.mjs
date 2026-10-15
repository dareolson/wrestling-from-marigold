// The jab has no editor draft (clips/jab.js is handwritten). Wrap it in one so
// the critic can sample it: attacker = the clip, defender standing at `x`
// rig units (the game lands a jab anywhere within 85 of them).
//   node tools/move-critic/jab_draft.mjs <x> <out.json>
import { writeFileSync } from 'node:fs';
import { jabClip, JAB_DURATION } from '../../src/animation/clips/jab.js';

const [x = '70', out] = process.argv.slice(2);
const draft = {
    id: 'jab', duration: JAB_DURATION, posture: 'upright',
    tracks: {
        attacker: { keyframes: jabClip.tracks.attacker.keyframes.map(k => ({ at: k.at, ease: k.ease ?? 'linear', pose: k.pose, transform: { x: 0, y: 0 }, parts: k.parts ?? {} })) },
        defender: { keyframes: [{ at: 0, ease: 'linear', pose: {}, transform: { x: Number(x), y: 0 }, parts: {} }] },
    },
    events: jabClip.events,
    preview: { facing: { attacker: 1, defender: -1 }, characters: { attacker: 'thesz', defender: 'george' } },
};
writeFileSync(out, JSON.stringify(draft, null, 2));
