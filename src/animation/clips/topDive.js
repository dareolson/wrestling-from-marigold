// The top-rope dive flies the same body flight as the diving elbow (posed in
// tools/move-editor/author_dive.mjs), under its own id so the registry maps
// one clip per move; _doTopDive stretches it to the longer 700 ms flight.
import { divingElbowClip } from './divingElbow.js';

export const topDiveClip = { ...divingElbowClip, id: 'topDive' };
