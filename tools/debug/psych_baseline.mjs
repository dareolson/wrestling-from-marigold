// Supplemental analysis for the post-Thesz-press baseline measurement
// (FEEL_AUDIT.md addendum, 2026-07-11). psych_analyze.mjs covers heat/space/
// move-variety; this script adds the metrics that audit needed and
// psych_analyze doesn't compute:
//   - finish type + winner + duration (compact, per-match)
//   - offense share (% of attributed attacking events per side)
//   - kickout depth distribution (count of 1 / 2 / 2.9 etc, all matches)
//   - time of first major-finisher attempt (piledriver/theszPress/sleeperHold)
//   - time from first below-15-stamina moment (either wrestler) to the bell
//
// Usage: node tools/debug/psych_baseline.mjs <label> <file1.json> [file2.json ...]
// Each file is a psych_probe.mjs OUT file: a JSON array of match objects.
// Matches from all files given for one label are concatenated and both
// reported per-match and summarized in aggregate.

import { readFileSync } from 'node:fs';

const [, , label, ...files] = process.argv;
if (!label || files.length === 0) {
    console.error('usage: node psych_baseline.mjs <label> <file1.json> [file2.json ...]');
    process.exit(1);
}

const FINISHERS = new Set(['piledriver', 'theszPress', 'sleeperHold']);

const matches = [];
for (const f of files) {
    const arr = JSON.parse(readFileSync(f, 'utf8'));
    for (const m of arr) matches.push({ ...m, _src: f });
}

console.log(`\n======== ${label}: ${matches.length} matches ========\n`);

const rows = [];

matches.forEach((m, mi) => {
    const ev = m.events;
    const end = ev.find(e => e.type === 'pinfall' || e.type === 'sleeperKO' || e.type === 'timeLimitDraw');
    const dur = ev.length ? ev[ev.length - 1].t : 0;
    const finish = end ? end.type : '??';
    const winner = end?.winner ?? (finish === 'timeLimitDraw' ? 'draw' : '??');

    // Offense share: events with an `attacker` field (move/knockdown/stagger/
    // pinAttempt/sleeperApplied) attributed to p1 vs p2.
    let p1Off = 0, p2Off = 0;
    for (const e of ev) {
        if (e.attacker === 'p1') p1Off++;
        else if (e.attacker === 'p2') p2Off++;
    }
    const offTotal = p1Off + p2Off || 1;
    const offenseShare = `p1 ${Math.round(p1Off / offTotal * 100)}% / p2 ${Math.round(p2Off / offTotal * 100)}%`;

    // Kickout depth distribution for this match
    const kicks = ev.filter(e => e.type === 'kickout');
    const kickHist = {};
    for (const k of kicks) kickHist[k.atCount] = (kickHist[k.atCount] || 0) + 1;

    // First major-finisher attempt (piledriver / theszPress / sleeperHold)
    let firstFinisher = null;
    for (const e of ev) {
        if (e.move && FINISHERS.has(e.move)) { firstFinisher = { t: e.t, move: e.move, stam: e.defenderStamina }; break; }
    }

    // Below-15-stamina-to-bell: from the pos trace (0.5s samples of both
    // wrestlers' stamina), find the earliest sample where either side <15,
    // then measure to the last event's timestamp (the bell).
    let firstBelow15 = null;
    for (const p of m.pos) {
        const [t, , , , s1, , , , s2] = p;
        if (s1 < 15 || s2 < 15) { firstBelow15 = t; break; }
    }
    const toBell = firstBelow15 != null ? Math.round((dur - firstBelow15) * 10) / 10 : null;

    // Per-minute stamina arcs from the pos trace (Batch A table format:
    // average stamina per minute per side) plus the floor each side touched.
    const minutes = Math.max(1, Math.ceil(dur / 60));
    const arcs = { p1: [], p2: [] };
    const minStam = { p1: 100, p2: 100 };
    for (let min = 0; min < minutes; min++) {
        const slice = m.pos.filter(p => p[0] >= min * 60 && p[0] < (min + 1) * 60);
        if (!slice.length) { arcs.p1.push('-'); arcs.p2.push('-'); continue; }
        arcs.p1.push(Math.round(slice.reduce((a, p) => a + p[4], 0) / slice.length));
        arcs.p2.push(Math.round(slice.reduce((a, p) => a + p[8], 0) / slice.length));
    }
    for (const p of m.pos) {
        if (p[4] < minStam.p1) minStam.p1 = p[4];
        if (p[8] < minStam.p2) minStam.p2 = p[8];
    }

    // Move distribution + repetition (for reference alongside psych_analyze)
    const counts = {};
    for (const e of ev) if (e.move) counts[e.move] = (counts[e.move] || 0) + 1;
    const topMoves = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([k, v]) => `${k}:${v}`).join(' ');

    const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

    console.log(`--- match ${mi + 1} (${m._src}) ---`);
    console.log(`  duration ${fmt(dur)}  finish: ${finish} winner: ${winner}  events: ${ev.length}  pos-samples: ${m.pos.length}  heat-samples: ${m.heat.length}`);
    console.log(`  offense share: ${offenseShare}`);
    console.log(`  kickout depth: ${Object.entries(kickHist).map(([k, v]) => `${k}x${v}`).join(' ') || 'none'}  (n=${kicks.length})`);
    console.log(`  first major-finisher attempt: ${firstFinisher ? `${firstFinisher.move}@${fmt(firstFinisher.t)} (def stam ${firstFinisher.stam})` : 'none thrown'}`);
    console.log(`  first <15-stamina @ ${firstBelow15 != null ? fmt(firstBelow15) : 'never'}  ->  to bell: ${toBell != null ? toBell + 's' : 'n/a'} (${firstBelow15 != null ? Math.round(firstBelow15 / dur * 100) : '-'}% into match)`);
    console.log(`  top moves: ${topMoves}`);
    console.log(`  per-min stamina p1: ${arcs.p1.join(' ')}  (min ${minStam.p1})`);
    console.log(`  per-min stamina p2: ${arcs.p2.join(' ')}  (min ${minStam.p2})`);
    console.log(`  OOB frames: ${m.oob.length}`);

    rows.push({ dur, finish, winner, p1Off, p2Off, kicks, kickHist, firstFinisher, firstBelow15, toBell });
});

// ── Aggregate ────────────────────────────────────────────────────────────
console.log(`\n--- ${label} aggregate (n=${matches.length}) ---`);
const durations = rows.map(r => r.dur);
console.log(`durations (s): ${durations.join(', ')}  avg ${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}`);
const finishCounts = {};
for (const r of rows) finishCounts[r.finish] = (finishCounts[r.finish] || 0) + 1;
console.log(`finish types: ${Object.entries(finishCounts).map(([k, v]) => `${k}:${v}`).join(' ')}`);
const winnerCounts = {};
for (const r of rows) winnerCounts[r.winner] = (winnerCounts[r.winner] || 0) + 1;
console.log(`winners: ${Object.entries(winnerCounts).map(([k, v]) => `${k}:${v}`).join(' ')}`);

const allKickHist = {};
let totalKicks = 0;
for (const r of rows) for (const [k, v] of Object.entries(r.kickHist)) { allKickHist[k] = (allKickHist[k] || 0) + v; totalKicks += v; }
console.log(`kickout depth (all matches, n=${totalKicks}): ${Object.entries(allKickHist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v} (${Math.round(v / totalKicks * 100)}%)`).join(' ')}`);

const finisherTimes = rows.filter(r => r.firstFinisher).map(r => r.firstFinisher.t);
console.log(`first-finisher times (s): ${finisherTimes.join(', ') || 'none'}  ${finisherTimes.length ? `median ${finisherTimes.slice().sort((a, b) => a - b)[Math.floor(finisherTimes.length / 2)]}` : ''}  (${matches.length - finisherTimes.length}/${matches.length} matches never threw one)`);

const toBells = rows.filter(r => r.toBell != null).map(r => r.toBell);
console.log(`below-15-to-bell (s): ${toBells.join(', ') || 'n/a (nobody dropped below 15 in any match)'}  ${toBells.length ? `median ${toBells.slice().sort((a, b) => a - b)[Math.floor(toBells.length / 2)]}` : ''}`);
