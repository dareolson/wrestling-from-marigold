// Pure decision logic extracted from Wrestler.tryPower.
//
// No Phaser dependency: the caller (Wrestler.js) is responsible for the
// input/state guard clauses (this.state !== 'standing', input.justDown),
// computing `dist` (plain Euclidean distance is fine — see Wrestler.js),
// and actually executing the chosen move via the existing `_do*` methods.
// This module only decides WHICH move (if any) should fire, given a
// snapshot of the runtime state, and returns the same string/false values
// tryPower has always returned.
//
// context shape:
//   {
//     dist:        number  // distance between attacker and other
//     scale:       number  // attacker's `this.s`
//     otherState:  string  // other.state
//     moveSet:     array   // attacker's this.moveSet (or anything with .includes)
//   }
export function resolvePowerMove(context) {
    const { dist, scale, otherState, moveSet } = context;

    const jabReach = 85  * scale;
    const reach    = 110 * scale;
    const medReach = 220 * scale;

    // Headbutt: follow-up strike on a staggered opponent — knocks them down
    if (otherState === 'staggered' && dist <= reach && moveSet.includes('headbutt')) {
        return 'headbutt';
    }

    if ((otherState === 'down' || otherState === 'possum') && dist <= reach && moveSet.includes('elbowDrop')) {
        return 'elbowDrop';
    }

    // Jab: point-blank strike vs standing — staggers, sets up follow-ups.
    // Strikes beat block: a blocking opponent is a legal strike target.
    const strikable = otherState === 'standing' || otherState === 'blocking';
    if (strikable && dist <= jabReach && moveSet.includes('jab')) {
        return 'jab';
    }

    if (strikable && dist <= medReach && moveSet.includes('dropkick')) {
        return 'dropkick';
    }

    return false;
}
