// Kowalski's rig. Measured base geometry is GENERATED (src/characters/generated/kowalski_roster_v1.base.js, from
// tools/wrestler-cutter/prepare-roster-character.py kowalski); this file holds only what is authored on top.
// To revise the art (new knee/elbow overlap, re-cut PSD): ART_REVISION.md. Never paste generated numbers here.
import { thesz } from './thesz.js';
import { KOWALSKI_ROSTER_V1_BASE as BASE } from './generated/kowalski_roster_v1.base.js';
const { sockets, ...base } = BASE;
export const kowalskiRosterV1 = {
    id: 'kowalski-roster-v1', skinCol: thesz.skinCol, trunksCol: thesz.trunksCol,
    idlePose: thesz.idlePose, tauntPose: thesz.tauntPose, begsOff: thesz.begsOff, struts: thesz.struts,
    sellStyle: thesz.sellStyle, moveSet: thesz.moveSet,
    textures: {
        ...base,
        rigProfile: { sockets },
    },
};
export const kowalski_roster_v1 = kowalskiRosterV1;
