// stage.mjs constraints for the dropkick v2 candidate: at contact both
// ankles at George's chest, the boots (which extend past the ankle) on its
// front surface. Offsets from his neck: dy down to mid-chest, dx toward Lou.
// Solved on shipped Lou; Procreate Lou's longer legs land ~15 px higher, so
// the targets sit low enough that both hit the chest, not the face.
import { AT } from './author_dropkick_v2.mjs';

export const hands = [
    { at: AT.kick, role: 'attacker', limb: 'nearAnkle', to: { role: 'defender', joint: 'neck', dx: 34, dy: 56 } },
    { at: AT.kick, role: 'attacker', limb: 'farAnkle', to: { role: 'defender', joint: 'neck', dx: 34, dy: 42 } },
];
