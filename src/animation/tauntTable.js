// PLAN_GEORGE_PERFORMANCE Stage E: a taunt set per wrestler, picked by direction. The taunt button reads the direction held at the press,
// relative to his facing, into one of five slots; each character's kit maps a slot to a taunt id (the executors live in Wrestler._tauntExecutors).
// The slots are the one input layer: a controller's d-pad or stick maps onto the same five, so nothing here knows about a keyboard.
export const TAUNT_SLOTS = ['neutral', 'up', 'down', 'forward', 'back'];

// A slot a kit leaves out falls back to neutral. Written out in full per wrestler (like ROSTER_KITS) so a change to one never changes another.
// DEFAULTS taken by Opus 2026-11-15 for Derek at gate GE.
export const TAUNT_KITS = {
    george:   { neutral: 'strut', up: 'hairCheck', forward: 'crowd', down: 'superiority' },
    lou:      { neutral: 'armsWide', up: 'earCup', forward: 'pointFist' },
    guido:    { neutral: 'fistPump', up: 'earCup' },
    kowalski: { neutral: 'armsWide', up: 'chestBeat', forward: 'throatSlash' },
};

// rig id (Arena PRESETS key) -> kit; the old Lou rigs share Lou's
export function tauntKitKey(rigId) {
    if (!rigId) return null;
    if (rigId.startsWith('george')) return 'george';
    if (rigId.startsWith('guido')) return 'guido';
    if (rigId.startsWith('kowalski')) return 'kowalski';
    if (rigId.startsWith('thesz')) return 'lou';
    return null;
}

// The held direction at the press: up and down win over a horizontal (as tryPower reads them); left/right become forward/back by facing.
export function readTauntSlot(input, facing) {
    if (input.isDown('up')) return 'up';
    if (input.isDown('down')) return 'down';
    const right = input.isDown('right'), left = input.isDown('left');
    if (right === left) return 'neutral';
    return (right ? 1 : -1) === (facing >= 0 ? 1 : -1) ? 'forward' : 'back';
}

// the input key that holds a slot at this facing (what the AI holds while it presses the taunt)
export function tauntSlotKey(slot, facing) {
    return slot === 'up' ? 'up' : slot === 'down' ? 'down' : slot === 'forward' ? (facing >= 0 ? 'right' : 'left') : slot === 'back' ? (facing >= 0 ? 'left' : 'right') : null;
}

export const tauntIdFor = (kit, slot) => kit?.[slot] ?? kit?.neutral ?? null;
export const tauntSlotsOf = kit => TAUNT_SLOTS.filter(s => kit?.[s]);

// the AI picks among the slots its wrestler has; neutral is the common one
export function aiTauntSlot(kit, rand = Math.random()) {
    const slots = tauntSlotsOf(kit), weight = s => (s === 'neutral' ? 2 : 1), total = slots.reduce((a, s) => a + weight(s), 0);
    let r = rand * total;
    for (const s of slots) { r -= weight(s); if (r < 0) return s; }
    return slots[0] ?? 'neutral';
}
