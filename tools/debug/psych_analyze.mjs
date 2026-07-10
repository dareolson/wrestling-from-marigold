// Analyze psych_probe JSON: match arc, escalation, nearfall rhythm, dead air,
// space usage, state occupancy, move variety, OOB incidents.
import { readFileSync } from 'node:fs';

const RING = { nearY: 445, farY: 258, nearL: 40, nearR: 920, farL: 210, farR: 750 };
const boundsAt = (y) => {
    const t = (RING.nearY - y) / (RING.nearY - RING.farY);
    return { left: RING.nearL + (RING.farL - RING.nearL) * t, right: RING.nearR + (RING.farR - RING.nearR) * t };
};

const matches = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const BEATS = new Set(['knockdown', 'nearfall', 'kickout', 'ropeBreak', 'grappleBlock', 'sleeperApplied', 'sleeperEscape', 'pinAttempt', 'pinfall', 'sleeperKO', 'dodge']);
const BIG = new Set(['piledriver', 'suplex', 'topDive', 'dive', 'sleeperHold', 'bodySlam']);

matches.forEach((m, mi) => {
    console.log(`\n================ MATCH ${mi + 1} ================`);
    const ev = m.events;
    const end = ev.find(e => e.type === 'pinfall' || e.type === 'sleeperKO' || e.type === 'timeLimitDraw');
    const dur = ev.length ? ev[ev.length - 1].t : 0;
    console.log(`duration ~${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}  end: ${end ? (end.type + ' ' + (end.winner ?? '')) : '??'}  events: ${ev.length}`);

    // Move counts + first-use timing of big moves
    const counts = {}, firstUse = {};
    let lastMove = null, streak = 0, maxStreak = 0, maxStreakMove = null;
    for (const e of ev) {
        if (!e.move) continue;
        counts[e.move] = (counts[e.move] || 0) + 1;
        if (!(e.move in firstUse)) firstUse[e.move] = { t: e.t, stam: e.defenderStamina };
        if (e.move === lastMove) { streak++; } else { streak = 1; lastMove = e.move; }
        if (streak > maxStreak) { maxStreak = streak; maxStreakMove = e.move; }
    }
    console.log('move counts:', Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
    console.log('longest same-move streak:', maxStreak, maxStreakMove);
    console.log('big-move first use:', Object.entries(firstUse).filter(([k]) => BIG.has(k))
        .map(([k, v]) => `${k}@${Math.floor(v.t / 60)}:${String(v.t % 60).padStart(2, '0')}(def stam ${v.stam})`).join('  '));

    // Kickout / nearfall rhythm
    const kicks = ev.filter(e => e.type === 'kickout');
    console.log('kickouts:', kicks.map(k => `t=${k.t} count=${k.atCount} stam=${k.defenderStamina}`).join(' | ') || 'none');
    const pins = ev.filter(e => e.type === 'pinAttempt');
    console.log(`pin attempts: ${pins.length}, nearfalls: ${ev.filter(e => e.type === 'nearfall').length}, ropeBreaks: ${ev.filter(e => e.type === 'ropeBreak').length}`);

    // Dead air between meaningful beats
    let lastBeat = 0; const gaps = [];
    for (const e of ev) { if (BEATS.has(e.type)) { gaps.push({ gap: e.t - lastBeat, at: e.t }); lastBeat = e.t; } }
    gaps.sort((a, b) => b.gap - a.gap);
    console.log('worst beat gaps (s):', gaps.slice(0, 5).map(g => `${g.gap}@t${g.at}`).join(' '));

    // Heat arc: quartile averages
    if (m.heat.length) {
        const q = 4, per = Math.ceil(m.heat.length / q);
        const arcs = [];
        for (let i = 0; i < q; i++) {
            const slice = m.heat.slice(i * per, (i + 1) * per);
            if (slice.length) arcs.push(Math.round(slice.reduce((a, h) => a + h[1], 0) / slice.length));
        }
        console.log('heat arc (quartile avg):', arcs.join(' -> '), ` peak ${Math.max(...m.heat.map(h => h[1]))}`);
    }

    // Damage arc: stamina traces at quartiles
    if (m.pos.length) {
        const q = [0, 0.25, 0.5, 0.75, 0.996];
        console.log('stamina arc (p1/p2):', q.map(f => {
            const p = m.pos[Math.min(m.pos.length - 1, Math.floor(f * m.pos.length))];
            return `${p[4]}/${p[8]}`;
        }).join(' -> '));
    }

    // Space usage from pos trace
    if (m.pos.length) {
        let centerBoth = 0, ropeTime = { p1: 0, p2: 0 }, cells = new Set();
        const uHist = new Array(6).fill(0); const yHist = new Array(4).fill(0);
        let sumDist = 0;
        for (const p of m.pos) {
            const [t, x1, y1, st1, s1, x2, y2, st2, s2] = p;
            for (const [who, x, y] of [['p1', x1, y1], ['p2', x2, y2]]) {
                const b = boundsAt(y);
                const u = Math.max(0, Math.min(0.999, (x - b.left) / (b.right - b.left)));
                const v = Math.max(0, Math.min(0.999, (y - RING.farY) / (RING.nearY - RING.farY)));
                uHist[Math.floor(u * 6)]++;
                yHist[Math.floor(v * 4)]++;
                cells.add(`${Math.floor(u * 8)},${Math.floor(v * 4)}`);
                if (u < 0.12 || u > 0.88) ropeTime[who]++;
            }
            const b1 = boundsAt(y1), b2 = boundsAt(y2);
            const u1 = (x1 - b1.left) / (b1.right - b1.left), u2 = (x2 - b2.left) / (b2.right - b2.left);
            if (u1 > 0.3 && u1 < 0.7 && u2 > 0.3 && u2 < 0.7) centerBoth++;
            sumDist += Math.hypot(x2 - x1, y2 - y1);
        }
        const n = m.pos.length;
        console.log(`space: both-in-center-third ${Math.round(centerBoth / n * 100)}% | rope-adjacent p1 ${Math.round(ropeTime.p1 / n * 100)}% p2 ${Math.round(ropeTime.p2 / n * 100)}% | grid cells visited ${cells.size}/32`);
        console.log('x-position histogram (left->right sixths):', uHist.map(v => Math.round(v / (n * 2) * 100) + '%').join(' '));
        console.log('y-position histogram (far->near quarters):', yHist.map(v => Math.round(v / (n * 2) * 100) + '%').join(' '));
        console.log('avg separation:', Math.round(sumDist / n), 'px');
    }

    // State occupancy
    for (const who of ['p1', 'p2']) {
        const occ = m.occ[who] || {};
        const tot = Object.values(occ).reduce((a, b) => a + b, 0) || 1;
        const top = Object.entries(occ).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([k, v]) => `${k} ${Math.round(v / tot * 100)}%`).join(', ');
        console.log(`${who} state occupancy: ${top}`);
    }

    // OOB incidents
    if (m.oob.length) {
        const byState = {};
        for (const o of m.oob) byState[`${o.who}:${o.st}`] = (byState[`${o.who}:${o.st}`] || 0) + 1;
        console.log('OOB samples (frames outside ring plane):', Object.entries(byState).map(([k, v]) => `${k}=${v}`).join(' '));
        const worst = m.oob.reduce((a, o) => (o.y > (a?.y ?? 0) ? o : a), null);
        console.log('worst y:', JSON.stringify(worst));
        console.log('first few:', JSON.stringify(m.oob.slice(0, 5)));
    } else console.log('OOB: none');
});
