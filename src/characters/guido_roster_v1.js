// Guido's rig. Measured base geometry is GENERATED (src/characters/generated/guido_roster_v1.base.js, from
// tools/wrestler-cutter/prepare-roster-character.py guido); this file holds only what is authored on top.
// To revise the art (new knee/elbow overlap, re-cut PSD): ART_REVISION.md. Never paste generated numbers here.
import { george } from './george.js';
import { GUIDO_ROSTER_V1_BASE as BASE } from './generated/guido_roster_v1.base.js';
const { sockets, ...base } = BASE;
export const guidoRosterV1 = {
    id: 'guido-roster-v1', skinCol: george.skinCol, trunksCol: george.trunksCol,
    idlePose: 'rosterWrestlingIdle', tauntPose: george.tauntPose, begsOff: george.begsOff, struts: george.struts,
    sellStyle: george.sellStyle, moveSet: george.moveSet,
    textures: {
        ...base,
        rigProfile: { sockets },
    },
};
export const guido_roster_v1 = guidoRosterV1;
