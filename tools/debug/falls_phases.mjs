// PLAN_FALLS T3.8: the phases of the supported falls (sitBack, kneesForward, forward, spill), read off the probe rows: FIRST SUPPORT (the part that takes the weight first is
// within SUPPORT_PX of where it rests: the hands for forward, the knees for kneesForward, the pelvis for sitBack and spill), the KEYED ABSORPTION that follows it (the fall's own
// keys still moving), and the RESPONSE START (the landing's first frame: the tween's end). Dead beat = frames in that window where no joint moves more than DEAD_PX.
//   node tools/debug/falls_phases.mjs [out=research/animation/falls-2026-11/g3/phases.json]
import { readFileSync, writeFileSync } from 'node:fs';
const root = 'research/animation/falls-2026-11';
const out = process.argv[2] ?? `${root}/g3/phases.json`;
const SUPPORT_PX = 3, DEAD_PX = 1.0, F = 60;
const SRC = [['g2/after', 'george'], ['g2/after-gl', 'lou']];
const FALLS = { forward: ['nearHand', 'farHand'], kneesForward: ['nearKnee', 'farKnee'], sitBack: ['pelvis'], spill: ['pelvis'] };
const r1 = (v) => +v.toFixed(1);
const res = [];
for (const [fall, parts] of Object.entries(FALLS)) for (const [dir, victim] of SRC) for (const side of ['l', 'r']) {
    const id = `${fall}-${victim}-${side}`, file = fall === 'spill' ? `${root}/g3/spill/rows-${id}.json` : `${root}/${dir}/rows-${id}.json`;
    let rows; try { rows = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const s = rows[0].d.s, restIdx = rows.findIndex(r => r.rest), start = rows.findIndex((r, i) => i >= 8 && r.d.state !== 'standing');
    const landStart = rows.findIndex(r => r.d.land);
    // the height of each part above the mat line at rest; support = within SUPPORT_PX (s = 1) of it
    const height = (r, part) => { const d = r.d; if (part === 'pelvis') return (d.y - (d.pts.nearHip.y + d.pts.farHip.y) / 2) / s; if (part.endsWith('Hand')) return d.hands[part.slice(0, -4)] == null ? null : -d.hands[part.slice(0, -4)] / s; return -d.pts[part].y / s; };
    const rest = rows[restIdx], base = Object.fromEntries(parts.map(p => [p, height(rest, p)]));
    const supported = (r, p) => { const h = height(r, p); return h != null && h - base[p] <= SUPPORT_PX; };
    let first = -1; for (let i = start; i < rows.length && first < 0; i++) if (parts.some(p => supported(rows[i], p))) first = i;
    const speed = (i) => Math.max(...Object.keys(rows[i].d.pts).map(k => Math.hypot(rows[i].d.pts[k].x - rows[i - 1].d.pts[k].x, rows[i].d.pts[k].y - rows[i - 1].d.pts[k].y))) / s;
    const win = []; for (let i = first; i < landStart; i++) win.push(r1(speed(i)));
    const dead = win.filter(v => v < DEAD_PX).length;
    res.push({ id, fall, victim, side, supportPart: parts.join('/'), firstSupport: first, responseStart: landStart, gapFrames: landStart - first, gapMs: Math.round((landStart - first) / F * 1000), maxJointSpeedPerFrame: win, deadFrames: dead });
}
writeFileSync(out, JSON.stringify(res, null, 1));
for (const r of res.filter(r => r.side === 'l')) console.log(`${r.id.padEnd(22)} first support ${r.firstSupport} (${r.supportPart}), response at ${r.responseStart}: ${r.gapFrames} f / ${r.gapMs} ms, dead frames ${r.deadFrames}, speeds ${r.maxJointSpeedPerFrame.join(' ')}`);
