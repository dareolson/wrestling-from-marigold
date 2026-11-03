// The one place the four roster kits are decided. The game reads these lists
// (Arena.js presets thesz-procreate-v1, george-roster-v1, kowalski-roster-v1,
// guido-roster-v1); the moveSet fields in thesz.js, george.js and the generated
// *_roster_v1.js files (tools/wrestler-cutter/prepare-roster-character.py) are
// not read for these four, so editing one of them changes nothing in play.
// Each list is written out in full on purpose: a change to one wrestler never
// changes another. Moves are shared implementations (src/moves/registry.js); a
// kit is only the list a wrestler may use, and AIHandler's per-wrestler
// personality decides how often and when. To move a move between wrestlers: edit
// the list here, set its AI value in the personality (KIT_AI_ODDS in the
// registry names which), then run `npm run moves:kits`.
export const ROSTER_KITS = {
    // Lou (Procreate rig) and George (roster rig): the shipped kits until Derek assigns more.
    thesz: [
        'irishWhip', 'clothesline', 'cornerCharge', 'bodySlam', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'hipToss', 'jab', 'theszPress',
        'hammerlock', 'backBodyDrop', 'kneeDrop', 'armBar', 'ankleLock', 'goBehind',
    ],
    george: [
        'irishWhip', 'clothesline', 'cornerCharge', 'piledriver', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
        'hammerlock', 'kneeLift', 'backBodyDrop', 'kneeDrop', 'figureFour', 'goBehind',
    ],
    // Kowalski and Guido started from Lou's and George's kits plus the front kick, the
    // first move of the shared library batch (2026-10-21); Kowalski also has the shove.
    kowalski: [
        'irishWhip', 'clothesline', 'cornerCharge', 'bodySlam', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'hipToss', 'jab', 'theszPress',
        'hammerlock', 'backBodyDrop', 'kneeDrop', 'armBar', 'ankleLock', 'frontKick', 'shove',
    ],
    guido: [
        'irishWhip', 'clothesline', 'cornerCharge', 'piledriver', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
        'hammerlock', 'kneeLift', 'backBodyDrop', 'kneeDrop', 'figureFour', 'frontKick',
    ],
};

// The AIHandler personality each roster member plays (Arena.js presets read this).
export const ROSTER_PERSONALITIES = {
    thesz:    'thesz',
    george:   'george',
    kowalski: 'kowalski',
    guido:    'guido',
};
