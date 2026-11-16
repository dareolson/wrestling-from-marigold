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

// ?light=v1 (PLAN_LIGHT_MOVES Stage 4, T4.1): each kit fills the leg-hold slot (Finisher + Down on a downed man) with its own hold. Swaps on top of the lists above, so
// flag off is those lists untouched: Lou's ankle lock becomes the half Boston crab, George and Guido swap their figure-four for the ankle lock (the figure-four's
// art is parked); Kowalski keeps the ankle lock. Opus's defaults for Derek 2026-11-13; change a row here and run `npm run moves:kits`.
export const LIGHT_KIT_SWAPS = {
    thesz:  { ankleLock: 'halfBostonCrab' },
    george: { figureFour: 'ankleLock', jab: 'clubBlow' },   // Stage 10: George and Kowalski club where they used to jab
    guido:  { figureFour: 'ankleLock' },
    kowalski: { jab: 'clubBlow' },
};
// Stage 6 runner answers (T6.5): Action answers a returning runner with the back body drop when the kit holds it, else the clothesline; Power with the hip toss
// or the arm drag. Under ?light=v1 each kit keeps one Action answer so no two kits share a pair: Lou and George the back body drop, Kowalski and Guido the clothesline.
export const LIGHT_KIT_REMOVE = {
    thesz:    ['clothesline'],
    george:   ['clothesline'],
    kowalski: ['backBodyDrop'],
    guido:    ['backBodyDrop'],
};
// Stage 7 (T7.1): the snapmare from the tie-up (Lockup + Power, Back held) goes to Lou and Guido as Opus's default; it adds a move, so those two light kits are one longer.
// Stage 12 (Opus's defaults for Derek, 2026-11-15): wristlock Guido; wristlock-to-hammerlock Lou; headlock takeover Lou + George; flying mare Guido + Lou; test of strength Kowalski + Lou; leapfrog Guido + George; backward roll George + Guido;
// abdominal stretch Kowalski + George; body scissors Lou + Kowalski; Indian deathlock George + Kowalski; backdrop suplex Lou + Kowalski. Inputs: research/animation/light-moves-2026-11/g12/inputs.md.
export const LIGHT_KIT_ADD = {
    // Stage 8: every kit that holds kneeDrop also holds the hand stomp (Down + Power on a man on his stomach). Stages 10-11 (Opus's defaults for Derek, 2026-11-15): club blow replaces the jab for George and Kowalski (LIGHT_KIT_SWAPS);
    // running forearm Lou + Guido; shoulder block Kowalski + George; mounted punches everyone; chop Lou + Kowalski; uppercut Guido + Kowalski; back elbow George + Kowalski; leg sweep Lou + Guido;
    // axe handle to the back George + Kowalski; body stomps George + Kowalski.
    thesz:    ['snapmare', 'handStomp', 'runningForearm', 'mountedPunches', 'chop', 'legSweep', 'wristlockHammerlock', 'headlockTakeover', 'flyingMare', 'testOfStrength', 'bodyScissors', 'backdropSuplex'],
    george:   ['handStomp', 'shoulderBlock', 'mountedPunches', 'backElbow', 'axeHandleBack', 'bodyStomps', 'headlockTakeover', 'leapfrog', 'backwardRoll', 'abdominalStretch', 'indianDeathlock'],
    kowalski: ['handStomp', 'shoulderBlock', 'mountedPunches', 'chop', 'uppercut', 'backElbow', 'axeHandleBack', 'bodyStomps', 'testOfStrength', 'abdominalStretch', 'bodyScissors', 'indianDeathlock', 'backdropSuplex'],
    guido:    ['snapmare', 'handStomp', 'runningForearm', 'mountedPunches', 'uppercut', 'legSweep', 'wristlock', 'flyingMare', 'leapfrog', 'backwardRoll'],
};
export const lightKit = name => [...(ROSTER_KITS[name] ?? []).map(id => LIGHT_KIT_SWAPS[name]?.[id] ?? id).filter(id => !LIGHT_KIT_REMOVE[name]?.includes(id)), ...(LIGHT_KIT_ADD[name] ?? [])];
export const kitFor = (name, light) => (light ? lightKit(name) : ROSTER_KITS[name]);

// The AIHandler personality each roster member plays (Arena.js presets read this).
export const ROSTER_PERSONALITIES = {
    thesz:    'thesz',
    george:   'george',
    kowalski: 'kowalski',
    guido:    'guido',
};
