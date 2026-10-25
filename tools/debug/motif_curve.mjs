// Near-hand -> back-waist distance curve across the whole suplex aftermath
// (PLAN_SUPLEX_RISE T4.0 / D4). Reads the manifests aftermath_film.mjs wrote
// (per-step `backDist`, `sell`, `state`, `riseT`, `nearForearm`) and reports, per
// run, the ms with distance > the rig's contactPx in each window:
//   lying   clutch end (sell leaves its back clutch) -> rise start
//   rise    rise start -> riseT 0.85 (end of the protective weight window)
//   handoff riseT 0.85 -> state 'standing'
//   standing standing -> +2000 ms
// plus the near-forearm texture key as runs, so the grip art can be read against
// distance. Only receivers with a painted backWaist (Lou) have a distance; others
// report null.
//
//   node tools/debug/motif_curve.mjs [root] [configs=aft,on] [scenarios=all] [outPrefix]
// Writes <root>/motif-curve[-<tag>].json and .svg.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { theszProcreateV1 } from '../../src/characters/thesz_procreate_v1.js';
import { georgeRosterV1 } from '../../src/characters/george_roster_v1.js';

// The pass line is the rig's own (textures.backSell.contactPx, PLAN_GEORGE_TRANSFER T3.2). A rig that has no
// backSell yet is measured against DEFAULT_PX and the output says so; it is a reporting line, not rig data.
export const DEFAULT_PX = 15;
export const THRESH_PX = DEFAULT_PX;
const RIGS = Object.fromEntries([theszProcreateV1, georgeRosterV1].map(c => [c.id, c.textures.backSell?.contactPx ?? null]));
export const contactPxFor = rig => RIGS[rig] ?? DEFAULT_PX;
const STEP_MS = 1000 / 60;
const SCENARIOS = ['suplex', 'suplexFlip', 'suplexReverse', 'suplexReverseFlip'];

export function analyse(manifest, thresh = contactPxFor(manifest.receiver?.rig)) {
    const S = manifest.samples;
    const idx = pred => S.findIndex(pred);
    let lastClutch = -1;
    S.forEach((s, i) => { if (s.sell?.name === 'clutch' && s.sell.part === 'back') lastClutch = i; });
    const clutchEnd = lastClutch >= 0 ? lastClutch + 1 : null;
    const riseStart = idx(s => s.state === 'gettingUp');
    const r85 = idx(s => s.state === 'gettingUp' && s.riseT >= 0.85);
    const standing = idx(s => s.state === 'standing' && S.indexOf(s) > riseStart);
    const impact = idx(s => s.state === 'down');
    const plus2 = standing >= 0 ? idx((s, i) => i >= standing && s.rel - S[standing].rel >= 2000) : -1;
    const win = (a, b) => {
        if (a == null || a < 0 || b == null || b < 0 || b < a) return null;
        const seg = S.slice(a, b);
        const withD = seg.filter(s => s.backDist != null);
        if (!withD.length) return { ms: null, spanMs: +(seg.length * STEP_MS).toFixed(1), samples: seg.length, maxPx: null };
        const far = withD.filter(s => s.backDist > thresh);
        return { ms: +(far.length * STEP_MS).toFixed(1), spanMs: +(seg.length * STEP_MS).toFixed(1), samples: seg.length,
            maxPx: +Math.max(...withD.map(s => s.backDist)).toFixed(2), minPx: +Math.min(...withD.map(s => s.backDist)).toFixed(2) };
    };
    // lying-hold liveness: how far the contact point travels while the hand is held (px), and
    // the first time after standing that the contact is back within the threshold for good
    const holdSeg = clutchEnd != null && riseStart > clutchEnd ? S.slice(clutchEnd, riseStart).filter(x => x.nearContact) : [];
    const range = k => holdSeg.length ? +(Math.max(...holdSeg.map(x => x.nearContact[k])) - Math.min(...holdSeg.map(x => x.nearContact[k]))).toFixed(2) : null;
    const holdMotion = { samples: holdSeg.length, xRangePx: range('x'), yRangePx: range('y'),
        distMinPx: holdSeg.length ? Math.min(...holdSeg.map(x => x.backDist)) : null, distMaxPx: holdSeg.length ? Math.max(...holdSeg.map(x => x.backDist)) : null };
    let arrive = -1;
    if (standing >= 0) for (let i = standing; i < S.length; i++) if (S[i].backDist != null && S[i].backDist <= thresh) { arrive = i; break; }
    const standingArrivalMs = arrive >= 0 ? +(S[arrive].rel - S[standing].rel).toFixed(1) : null;
    const rel = i => (i != null && i >= 0 ? S[i].rel : null);
    // D5 (T4.7): across the handoff, riseT .85 -> standing + 400 ms: the longest unbroken stretch
    // with the hand > THRESH_PX from the back, and the largest per-step jump of the near contact.
    let handoffSpan = null;
    if (r85 >= 0 && standing >= 0) {
        const end = idx((s, i) => i >= standing && s.rel - S[standing].rel >= 400);
        const seg = S.slice(r85, end >= 0 ? end + 1 : S.length);
        let run = 0, best = 0, jump = 0, jumpAt = null;
        seg.forEach((s, i) => {
            if (s.backDist != null && s.backDist > thresh) { run++; best = Math.max(best, run); } else run = 0;
            const prev = seg[i - 1];
            if (prev?.nearContact && s.nearContact) {
                const d = Math.hypot(s.nearContact.x - prev.nearContact.x, s.nearContact.y - prev.nearContact.y);
                if (d > jump) { jump = d; jumpAt = s.rel; }
            }
        });
        handoffSpan = { fromMs: S[r85].rel, toMs: seg.at(-1).rel, longestRunOverMs: +(best * STEP_MS).toFixed(1),
            maxStepPx: +jump.toFixed(2), maxStepAtMs: jumpAt };
    }
    const windows = {
        lying: win(clutchEnd, riseStart),
        rise: win(riseStart, r85 >= 0 ? r85 : standing),
        handoff: win(r85, standing),
        standing: win(standing, plus2 >= 0 ? plus2 : S.length),
    };
    // texture runs on the near forearm
    const runs = [];
    for (const s of S) {
        if (!runs.length || runs.at(-1).key !== s.nearForearm) runs.push({ key: s.nearForearm, fromMs: s.rel, toMs: s.rel });
        else runs.at(-1).toMs = s.rel;
    }
    // the contact latch (needs `latch` in the samples, aftermath_film.mjs): flips and the shortest gap between two
    const flips = [];
    S.forEach((x, i) => { const p = S[i - 1]; if (x.latch != null && p?.latch != null && x.latch !== p.latch) flips.push({ atMs: x.rel, to: x.latch }); });
    const latch = S.some(x => x.latch != null) ? { flips: flips.length, to: flips.map(f => `${f.to ? 'on' : 'off'}@${f.atMs}`), minGapMs: flips.length > 1 ? +Math.min(...flips.slice(1).map((f, i) => f.atMs - flips[i].atMs)).toFixed(1) : null } : null;
    return { latch, events: { impactMs: rel(impact), clutchEndMs: rel(clutchEnd), riseStartMs: rel(riseStart), rise85Ms: rel(r85), standingMs: rel(standing), plus2sMs: rel(plus2) },
        windows, handoffSpan, holdMotion, standingArrivalMs, textureRuns: runs, hasDistance: S.some(s => s.backDist != null), thresholdPx: thresh, thresholdFromRig: RIGS[manifest.receiver?.rig] != null };
}

const palette = ['#1b6ca8', '#c0392b', '#2e8b57', '#8e44ad'];
function svg(runs) {
    const W = 1100, H = 420, L = 56, R = 16, T = 28, B = 44;
    const all = runs.flatMap(r => r.curve);
    const x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0]));
    const y1 = Math.max(60, Math.ceil(Math.max(...all.map(p => p[1])) / 10) * 10);
    const X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - v / y1) * (H - T - B);
    let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,sans-serif" font-size="11"><rect width="${W}" height="${H}" fill="#fff"/>`;
    for (let v = 0; v <= y1; v += 10) o += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eee"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" fill="#555">${v}</text>`;
    for (let v = Math.ceil(x0 / 1000) * 1000; v <= x1; v += 1000) o += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - B}" stroke="#eee"/><text x="${X(v)}" y="${H - B + 14}" text-anchor="middle" fill="#555">${v} ms</text>`;
    for (const px of new Set(runs.map(r => r.thresh))) o += `<line x1="${L}" x2="${W - R}" y1="${Y(px)}" y2="${Y(px)}" stroke="#d00" stroke-dasharray="4 3"/><text x="${W - R}" y="${Y(px) - 4}" text-anchor="end" fill="#d00">${px} px</text>`;
    o += `<text x="${L}" y="16" fill="#222" font-weight="600">near hand contact → backWaist (px) vs ms from impact; ticks = clutch end, rise start, standing</text>`;
    runs.forEach((r, k) => {
        const c = palette[k % palette.length];
        o += `<polyline fill="none" stroke="${c}" stroke-width="1.4" points="${r.curve.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}"/>`;
        for (const [name, ms] of Object.entries({ c: r.events.clutchEndMs, r: r.events.riseStartMs, s: r.events.standingMs }))
            if (ms != null) o += `<line x1="${X(ms)}" x2="${X(ms)}" y1="${H - B - 6}" y2="${H - B}" stroke="${c}" stroke-width="2"/>`;
        o += `<rect x="${L + 8 + k * 230}" y="${H - 22}" width="10" height="10" fill="${c}"/><text x="${L + 22 + k * 230}" y="${H - 13}" fill="#222">${r.label}</text>`;
    });
    return o + '</svg>';
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [root = 'research/animation/suplex-rise-2026-10', cfgArg = 'aft,on', scArg = 'all', tag = ''] = process.argv.slice(2);
    const configs = cfgArg.split(','), scenarios = scArg === 'all' ? SCENARIOS : scArg.split(',');
    const out = { tool: 'tools/debug/motif_curve.mjs', defaultThresholdPx: DEFAULT_PX, stepMs: +STEP_MS.toFixed(3), runs: {} };
    const plot = [];
    for (const c of configs) for (const sc of scenarios) {
        const f = join(root, c, sc, 'manifest.json');
        if (!existsSync(f)) continue;
        const m = JSON.parse(readFileSync(f, 'utf8'));
        const a = analyse(m);
        out.runs[`${c}/${sc}`] = { git: m.git, receiver: m.receiver, facing: m.receiverFacing, ...a };
        if (a.hasDistance) plot.push({ thresh: a.thresholdPx, label: `${c}/${sc} (facing ${m.receiverFacing.atImpact})`, events: a.events,
            curve: m.samples.filter(s => s.rel >= 0 && s.backDist != null && (a.events.plus2sMs == null || s.rel <= a.events.plus2sMs)).map(s => [s.rel, s.backDist]) });
    }
    const base = join(root, `motif-curve${tag ? '-' + tag : ''}`);
    writeFileSync(base + '.json', JSON.stringify(out, null, 1));
    if (plot.length) writeFileSync(base + '.svg', svg(plot));
    for (const [k, r] of Object.entries(out.runs)) {
        if (!r.hasDistance) { console.log(`${k}: no backWaist distance (receiver has none)`); continue; }
        const w = r.windows;
        const px = r.thresholdPx;
        console.log(`${k}${r.thresholdFromRig ? '' : ' (pass line ' + px + ' px: rig has no backSell, default)'}: >${px}px ms — lying ${w.lying?.ms}/${w.lying?.spanMs}, rise ${w.rise?.ms}/${w.rise?.spanMs}, handoff ${w.handoff?.ms}/${w.handoff?.spanMs}, standing ${w.standing?.ms}/${w.standing?.spanMs}; hold travel x ${r.holdMotion.xRangePx} y ${r.holdMotion.yRangePx} px, dist ${r.holdMotion.distMinPx}-${r.holdMotion.distMaxPx}; latch flips ${r.latch ? r.latch.flips + ' ' + JSON.stringify(r.latch.to) + ' min gap ' + r.latch.minGapMs : 'n/a'}; hand back within ${px}px ${r.standingArrivalMs} ms after standing; handoff (.85 -> standing+400): longest run >${px}px ${r.handoffSpan?.longestRunOverMs} ms, max step ${r.handoffSpan?.maxStepPx} px at ${r.handoffSpan?.maxStepAtMs}`);
    }
}
