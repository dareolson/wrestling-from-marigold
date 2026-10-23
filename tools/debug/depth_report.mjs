// Summarise a depth_probe JSON for one clip at chosen clip times (plan T0.2).
//   node tools/debug/depth_report.mjs <depth.json> <clipId> <t,t,...>
// For each time, takes the sampled frame nearest in clip time and prints each
// wrestler's base depth and parts sorted back-to-front, the merged cross-actor
// order, and any exact depth ties between the two wrestlers' parts.
import { readFileSync } from 'node:fs';

const [file, clipId, times] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(file, 'utf8')).filter(r => r.clip === clipId);
if (!rows.length) { console.log(`no ${clipId} rows in ${file}`); process.exit(1); }
const r5 = n => Math.round(n * 1e5) / 1e5;

for (const t of times.split(',').map(Number)) {
    const row = rows.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
    console.log(`\n### clip t=${r5(row.t)} (asked ${t}), attacker=${row.attacker}`);
    for (const w of ['w1', 'w2']) {
        console.log(`${w}${w === row.attacker ? ' (attacker)' : ' (defender)'}: y=${row[w].y} base=${r5(row[w].base)} state=${row[w].state}`);
    }
    const merged = [];
    for (const w of ['w1', 'w2']) for (const [k, d] of Object.entries(row[w].parts)) merged.push({ w, k, d: r5(d), z: row[w].z[k], rel: r5(d - row[w].base) });
    merged.sort((a, b) => a.d - b.d || a.z - b.z); // equal depth: display-list order
    console.log('back → front: ' + merged.map(m => `${m.w}.${m.k}(${m.rel >= 0 ? '+' : ''}${m.rel})`).join(' < '));
    const ties = [];
    for (let i = 0; i < merged.length; i++) for (let j = i + 1; j < merged.length; j++) {
        if (merged[i].d === merged[j].d && merged[i].w !== merged[j].w) ties.push(`${merged[i].w}.${merged[i].k} < ${merged[j].w}.${merged[j].k} @${merged[i].d}`);
    }
    console.log(`cross-actor exact ties (listed back < front, by display-list order): ${ties.length ? ties.join(', ') : 'none'}`);
}
