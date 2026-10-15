// Print the critic's findings for one or more traces.
//   node tools/move-critic/report.mjs <trace.json>... [--json out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { critique } from './metrics.mjs';
import { specFor } from './specs.mjs';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');
const pct = x => `${(x * 100).toFixed(1)}%`;
const s = x => `${x.toFixed(3)}s`;
const all = [];
for (const file of files) {
    const trace = JSON.parse(readFileSync(file, 'utf8'));
    const r = critique(trace, specFor(trace.meta.id));
    all.push(r);
    console.log(`\n=== ${r.id} (${r.duration}s; ${r.characters.attacker} vs ${r.characters.defender}) ===`);
    for (const role of ['attacker', 'defender']) {
        const f = r.floor[role], sl = r.slide[role], sp = r.support[role], c = r.continuity[role], st = r.stiffness[role];
        console.log(`${role}:`);
        console.log(`  floor: worst ${pct(f.worstFrac)} of height below mat (${f.worstPart} @${s(f.worstAt)}), ${f.frames} frames`);
        console.log(`  foot slide: ${pct(sl.totalFrac)} total${sl.worst ? `; worst ${sl.worst.side} ${sl.worst.slidePx.toFixed(1)}px ${s(sl.worst.from)}–${s(sl.worst.to)}` : ''}`);
        console.log(`  floating (no mat, no partner): ${sp.floatingSec.toFixed(3)}s${sp.spans.length ? ' ' + sp.spans.map(x => `${s(x.from)}–${s(x.to)}`).join(', ') : ''}`);
        console.log(`  pops: ${c.pops.length}${c.pops.length ? ' ' + c.pops.slice(0, 4).map(p => `${p.joint}@${s(p.at)}`).join(', ') : ''}; velocity hitches at ${c.hitchTimes.length} frames${c.hitchTimes.length ? ': ' + c.hitchTimes.slice(0, 8).map(s).join(', ') : ''}`);
        console.log(`  stiffness: spine turns ${st.spineTurnRad.toFixed(2)} rad, limbs bend ${st.bendRad.toFixed(2)} rad${st.ratio != null ? ` (bend/turn ${st.ratio.toFixed(2)})` : ''}`);
    }
    for (const c of r.contacts) console.log(`contact ${c.label}: worst gap ${pct(c.worstFrac)} of height @${s(c.worstAt)} over ${c.frames} frames`);
    for (const i of r.impacts) console.log(`impact @${s(i.event)} ${i.strike}: gap ${pct(i.gapFrac)}, limb at ${pct(i.reachFrac)} of its max reach; closest approach ${i.offsetSec >= 0 ? '+' : ''}${i.offsetSec.toFixed(3)}s from the event`);
    for (const l of r.landings) console.log(`${l.label}: ${l.at == null ? 'never' : s(l.at)} (event ${l.event == null ? '—' : s(l.event)}, ${l.offsetSec == null ? '' : (l.offsetSec >= 0 ? '+' : '') + l.offsetSec.toFixed(3) + 's'})`);
    if (r.overlap) console.log(`body overlap (torso/head interpenetration > 6% height): ${r.overlap.sec.toFixed(3)}s, worst ${pct(r.overlap.worstFrac)} @${s(r.overlap.worstAt)}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(all, null, 1));
