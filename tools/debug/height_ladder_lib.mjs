// PLAN_SCALE T3.3: what pins a roster rig's standing height. Shared by scale_height_ladder.mjs (writes the ladder) and tests/heightLadder.test.js (fails when it moves).
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { theszProcreateV1 } from '../../src/characters/thesz_procreate_v1.js';
import { georgeRosterV1 } from '../../src/characters/george_roster_v1.js';
import { kowalskiRosterV1 } from '../../src/characters/kowalski_roster_v1.js';
import { guidoRosterV1 } from '../../src/characters/guido_roster_v1.js';
export const LADDER_RIGS = [theszProcreateV1, georgeRosterV1, kowalskiRosterV1, guidoRosterV1];   // Lou first: the ratios are to him
const BODY_ART = ['head', 'torso', 'thigh', 'shin', 'far_thigh', 'far_shin'];                       // the parts that set the standing height
const NUMS = ['heightScale', 'torsoH', 'thighH', 'shinH', 'headScale'];
export function rigFingerprint(rig) {
    const dir = new URL(`../../src/assets/wrestlers/${rig.id}/`, import.meta.url);
    const art = {};
    for (const n of BODY_ART) { const f = new URL(`${n}.png`, dir); if (existsSync(f)) art[n] = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16); }
    return { numbers: Object.fromEntries(NUMS.map(k => [k, rig.textures[k] ?? null])), art };
}
