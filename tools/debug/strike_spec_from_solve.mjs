// Prints the spec lines (`reach`, `lunge`, `hit`, per-rig `attacker` overrides) for a move from its strike_solve.mjs JSON, Lou as the base and the other rigs as differences.
// node tools/debug/strike_spec_from_solve.mjs clubBlow   (reads research/animation/light-moves-2026-11/g10/solve/<move>.json)
import { readFileSync } from 'node:fs';
const move = process.argv[2];
const solved = JSON.parse(readFileSync(`research/animation/light-moves-2026-11/g10/solve/${move}.json`, 'utf8'));
const LOU = 'thesz-procreate-v1', short = { 'george-roster-v1': 'GEORGE', 'kowalski-roster-v1': 'KOWALSKI', 'guido-roster-v1': 'GUIDO' };
const fmt = o => '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ') + ' }';
const base = solved[LOU], { lunge: bl, ...bp } = base.pose;
console.log(`reach: ${base.reach}, lunge: ${bl},\nhit: ${fmt(bp)},\nattacker: {`);
for (const [rig, r] of Object.entries(solved)) {
    if (rig === LOU) continue;
    const { lunge, ...p } = r.pose, diff = Object.fromEntries(Object.entries(p).filter(([k, v]) => bp[k] !== v));
    console.log(`    [${short[rig]}]: { reach: ${r.reach}, lunge: ${lunge}, hit: ${fmt(diff)} },   // miss R ${r.missR ?? r.miss} / L ${r.missL ?? r.miss} px`);
}
console.log(`},   // Lou: miss R ${base.missR ?? base.miss} / L ${base.missL ?? base.miss} px`);
