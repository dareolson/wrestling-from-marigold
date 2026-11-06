// PLAN_FALLS T3.15: the wear table over the soak JSON. Per run and summed, per 30 game-second bucket: wear-gated strike knockdowns (jab, front kick, shove, double axe
// handle, knee lift: the ones KNOCKDOWN_WEAR decides), always-fall strikes (headbutt, corner charge), wear-driven exceptional landings (suplex, body slam, back body drop), landed strikes, mean wear of both men.
//   node tools/debug/falls_g3_wear_table.mjs [dir=research/animation/falls-2026-11/g3/wear] [--json out.json]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'research/animation/falls-2026-11/g3/wear';
const GATED = new Set(['jab', 'frontKick', 'shove', 'doubleAxeHandle', 'kneeLift']), ALWAYS = new Set(['headbutt', 'cornerCharge']);
const BIG = new Set(['suplex', 'bodySlam', 'backBodyDrop']);   // landings whose tier the wear decides; the piledriver is exceptional on its own
const BUCKET = 30;
const runs = readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('table')).sort().map(f => ({ name: f.replace('.json', ''), ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }));

const table = runs.map(r => {
    const n = Math.ceil(r.gameSec / BUCKET), t0 = r.S.wear[0]?.t ?? 0;
    const b = Array.from({ length: n }, () => ({ gated: 0, always: 0, exceptional: 0, strikes: 0, wearSum: 0, wearN: 0 }));
    const at = (t) => Math.min(n - 1, Math.max(0, Math.floor((t - t0) / BUCKET)));
    const gatedKd = [], exc = [];
    for (const s of r.S.strikes) b[at(s.t)].strikes++;
    for (const f of r.falls) {   // `g`: the soak's game clock stamped on the event
        if (GATED.has(f.move)) { b[at(f.g ?? f.t)].gated++; gatedKd.push(f); } else if (ALWAYS.has(f.move)) b[at(f.g ?? f.t)].always++;
    }
    for (const l of r.S.landings) if (l.tier === 'exceptional' && BIG.has(l.source)) { b[at(l.t)].exceptional++; exc.push(l); }
    for (const w of r.S.wear) { const k = b[at(w.t)]; k.wearSum += w.p1 + w.p2; k.wearN += 2; }
    return { name: r.name, gameSec: r.gameSec, errors: r.errors.length, stuck: r.S.stuck.length, strikes: r.S.strikes.length, first: gatedKd[0] ? +(gatedKd[0].g ?? gatedKd[0].t) : null, gated: gatedKd.length, exceptional: exc.length, exceptionalAt: exc.map(l => `${l.t}s ${l.source} wear ${l.wear}`), piledrivers: r.S.landings.filter(l => l.source === 'piledriver').length,
        buckets: b.map((k, i) => ({ from: i * BUCKET, gated: k.gated, always: k.always, exceptional: k.exceptional, strikes: k.strikes, meanWear: k.wearN ? +(k.wearSum / k.wearN).toFixed(1) : null })) };
});
for (const t of table) {
    console.log(`\n${t.name}: ${t.gameSec} s, ${t.strikes} landed strikes, first gated knockdown ${t.first ?? 'none'}, gated ${t.gated}, wear-driven exceptional ${t.exceptional}${t.exceptionalAt.length ? ' (' + t.exceptionalAt.join('; ') + ')' : ''}, piledrivers ${t.piledrivers}, errors ${t.errors}, stuck ${t.stuck}`);
    console.log('  bucket   kd(gated)  kd(always)  exceptional  strikes  meanWear');
    for (const k of t.buckets) console.log(`  ${String(k.from).padStart(3)}-${String(k.from + BUCKET).padEnd(4)} ${String(k.gated).padStart(8)} ${String(k.always).padStart(10)} ${String(k.exceptional).padStart(12)} ${String(k.strikes).padStart(8)} ${String(k.meanWear).padStart(9)}`);
}
const j = process.argv.indexOf('--json');
if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify(table, null, 1));
