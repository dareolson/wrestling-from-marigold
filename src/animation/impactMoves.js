// Visual performance variants share the move's existing pain/sell definition.
const MOVES = Object.freeze({
    backBodyDropV2: 'backBodyDrop', hipTossRunner: 'hipToss', armDragRunner: 'armDrag',
    snapmareTieUp: 'snapmare', bodySlamV2: 'bodySlam', bodySlamV2George: 'bodySlam',
    armBarV2: 'armBar', ankleLockV2: 'ankleLock',
});
export const impactMoveId = id => MOVES[id] ?? id;
