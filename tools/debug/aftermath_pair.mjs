// Pairing sheet + hand-art check for tools/debug/aftermath_film.mjs output
// (PLAN_SUPLEX_RISE T1.2).
//
//   node tools/debug/aftermath_pair.mjs [root=research/animation/suplex-rise-2026-10] [--a off] [--b on]
//
// --a / --b name any two configs of aftermath_film.mjs (off | aft | on). The
// default pair writes <root>/pair-sheet.html and <root>/hand-art-check.json;
// any other pair writes pair-sheet-<a>-<b>.html / hand-art-check-<a>-<b>.json.
// `aft` (aftermath=v2 only) vs `on` (sellart=v1&aftermath=v2) attributes a
// difference to sellart; `off` vs `on` changes two flags at once.
// A-side (variables named off) and B-side (named on) frames are paired by match
// events, not frame index: the B-run clock is
// piecewise-linearly warped onto the off-run clock through every event both
// runs logged (suplex, impact, clutchPeak, riseStart, rise*, standing,
// recovery*), then the nearest recorded frame is used. With identical event
// times the warp is the identity; it only matters when the plans differ.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { CONFIGS } from './aftermath_film.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i < 0 ? dflt : args.splice(i, 2)[1]; };
const A = flag('a', 'off'), B = flag('b', 'on');
for (const c of [A, B]) if (!(c in CONFIGS)) throw new Error(`unknown config ${c}; have ${Object.keys(CONFIGS).join(', ')}`);
const root = args[0] ?? 'research/animation/suplex-rise-2026-10';
const SUFFIX = A === 'off' && B === 'on' ? '' : `-${A}-${B}`;
const SCENARIOS = ['suplexReverse', 'suplexReverseFlip', 'suplex', 'suplexFlip'];
const FLICKER_MAX_MS = 250; // a non-grip run shorter than this between two grip runs counts as a flicker
const SAMPLE_EVERY_MS = 100;

const load = (cfg, sc) => {
    const p = join(root, cfg, sc, 'manifest.json');
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
};

// Near-forearm texture runs -> grip runs, gaps between grip runs, flicker verdict.
function handArtCheck(m) {
    const isGrip = k => /grip/.test(k ?? '');
    const runs = m.nearForearmTexture;
    const grips = runs.filter(r => isGrip(r.key));
    const gaps = [];
    for (let i = 0; i < runs.length; i++) {
        if (isGrip(runs[i].key) || i === 0 || i === runs.length - 1) continue;
        if (isGrip(runs[i - 1].key) && isGrip(runs[i + 1].key)) {
            gaps.push({ fromMs: runs[i].fromMs, toMs: runs[i].toMs, key: runs[i].key,
                durationMs: +(runs[i + 1].fromMs - runs[i - 1].toMs).toFixed(1) });
        }
    }
    const riseStart = m.events.riseStart?.relImpactMs ?? null;
    const lastBefore = grips.filter(r => riseStart !== null && r.toMs < riseStart).at(-1) ?? null;
    const first = riseStart === null ? null : grips.find(r => r.fromMs >= riseStart - 1) ?? null;
    return {
        gripRuns: grips.map(r => ({ fromMs: r.fromMs, toMs: r.toMs })),
        gripToGripGaps: gaps,
        flickers: gaps.filter(g => g.durationMs < FLICKER_MAX_MS),
        lastGripBeforeRiseEndsMs: lastBefore?.toMs ?? null,
        riseStartMs: riseStart,
        fistBetweenClutchAndRiseMs: lastBefore && riseStart !== null ? +(riseStart - lastBefore.toMs).toFixed(1) : null,
        gripReturnsAfterRiseStartMs: first && riseStart !== null ? +(first.fromMs - riseStart).toFixed(1) : null,
        gripDroppedAtMs: first ? first.toMs : null,
    };
}

function warp(offM, onM) {
    const pairs = Object.keys(offM.events).filter(k => onM.events[k])
        .map(k => [offM.events[k].relImpactMs, onM.events[k].relImpactMs]).sort((a, b) => a[0] - b[0]);
    return t => {
        if (!pairs.length) return t;
        if (t <= pairs[0][0]) return pairs[0][1] + (t - pairs[0][0]);
        if (t >= pairs.at(-1)[0]) return pairs.at(-1)[1] + (t - pairs.at(-1)[0]);
        for (let i = 1; i < pairs.length; i++) {
            if (t <= pairs[i][0]) {
                const [a0, b0] = pairs[i - 1], [a1, b1] = pairs[i];
                return a1 === a0 ? b0 : b0 + (t - a0) * (b1 - b0) / (a1 - a0);
            }
        }
        return t;
    };
}
const nearest = (frames, t) => frames.reduce((b, f) => Math.abs(f.relImpactMs - t) < Math.abs(b.relImpactMs - t) ? f : b);

const EVENT_ORDER = ['suplex', 'impact', 'clutchPeak', 'riseStart', 'rise020', 'rise034', 'rise055', 'rise085', 'standing',
    'recovery+200ms', 'recovery+1000ms', 'recovery+2000ms'];
const fmt = n => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))} ms`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const check = {};
const sections = [];
for (const sc of SCENARIOS) {
    const off = load(A, sc), on = load(B, sc);
    if (!off || !on) continue;
    const tOn = warp(off, on);
    check[sc] = { receiver: on.receiver.rig, facing: on.receiverFacing.atImpact, off: handArtCheck(off), on: handArtCheck(on) };

    const evRows = EVENT_ORDER.filter(e => off.events[e] || on.events[e]).map(e => {
        const cell = (m, cfg) => m.events[e]
            ? `<figure><img loading="lazy" src="${cfg}/${sc}/closeups/${e}.png"><figcaption>${fmt(m.events[e].relImpactMs)}</figcaption></figure>`
            : '<figure class="none">event did not occur in this run</figure>';
        return `<div class="row"><h4>${esc(e)}</h4>${cell(off, A)}${cell(on, B)}</div>`;
    }).join('');

    const tStart = off.frames[0].relImpactMs, tEnd = off.frames.at(-1).relImpactMs;
    let stripRows = '';
    for (let t = tStart; t <= tEnd; t += SAMPLE_EVERY_MS) {
        const a = nearest(off.frames, t), b = nearest(on.frames, tOn(t));
        stripRows += `<div class="row"><h4>${fmt(a.relImpactMs)}<small>on ${fmt(b.relImpactMs)}</small></h4>`
            + `<figure><img loading="lazy" src="${A}/${sc}/${a.file}"></figure><figure><img loading="lazy" src="${B}/${sc}/${b.file}"></figure></div>`;
    }

    const bar = (m, label) => {
        const span = tEnd - tStart;
        const segs = m.nearForearmTexture.map(r => {
            const l = (r.fromMs - tStart) / span * 100, w = Math.max(0.2, (r.toMs - r.fromMs) / span * 100);
            return `<i class="${/grip/.test(r.key) ? 'g' : 'f'}" style="left:${l}%;width:${w}%" title="${esc(r.key)} ${r.fromMs}→${r.toMs} ms"></i>`;
        }).join('');
        const marks = ['impact', 'riseStart', 'standing'].filter(e => m.events[e]).map(e =>
            `<b style="left:${(m.events[e].relImpactMs - tStart) / span * 100}%" title="${e}"></b>`).join('');
        return `<div class="bar"><span>${label}</span><div>${segs}${marks}</div></div>`;
    };
    const c = check[sc];
    const verdict = (side, label) => {
        const x = c[side];
        return `${label}: grip runs ${x.gripRuns.map(r => `${fmt(r.fromMs)}→${fmt(r.toMs)}`).join(', ') || 'none'}; `
            + `fist between clutch and rise ${x.fistBetweenClutchAndRiseMs ?? '—'} ms; grip returns ${x.gripReturnsAfterRiseStartMs ?? '—'} ms after rise start; `
            + `grip-fist-grip flickers (&lt;${FLICKER_MAX_MS} ms): ${x.flickers.length}`;
    };
    sections.push(`<section id="${sc}"><h2>${sc} <small>receiver ${esc(on.receiver.rig)}, facing ${on.receiverFacing.atImpact > 0 ? 'right' : 'left'}</small></h2>
<p class="meta">commit ${esc(off.git.commit)}${off.git.dirty ? '+dirty' : ''} · ${A} = ${esc(off.urlFlags || 'no flags')} · ${B} = ${esc(on.urlFlags || 'no flags')} · step ${off.stepMs} ms · times relative to impact</p>
<div class="bars">${bar(off, A)}${bar(on, B)}<p class="meta">near-forearm art: <i class="g inl"></i> grip <i class="f inl"></i> base fist/forearm. Ticks: impact, rise start, standing.</p></div>
<p class="meta">${verdict('off', A)}<br>${verdict('on', B)}</p>
<h3>Event close-ups</h3>${evRows}<h3>Strip, every ${SAMPLE_EVERY_MS} ms, paired by event</h3>${stripRows}</section>`);
}

writeFileSync(join(root, `hand-art-check${SUFFIX}.json`), JSON.stringify({ flickerThresholdMs: FLICKER_MAX_MS, scenarios: check }, null, 1));
writeFileSync(join(root, `pair-sheet${SUFFIX}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Suplex rise pairing sheet</title><style>
:root{--bg:#fff;--fg:#1c1f24;--mut:#5d6570;--line:#d5d9de;--g:#2f7d4f;--f:#9aa3ad;--tick:#c0392b}
@media(prefers-color-scheme:dark){:root{--bg:#14171b;--fg:#e6e8eb;--mut:#9aa3ad;--line:#2d333a;--g:#58b47c;--f:#5d6570;--tick:#ff7a68}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}
h2{margin:32px 0 4px}h2 small{font-weight:400;color:var(--mut);font-size:14px}h3{margin:20px 0 6px}h4{margin:0;font-size:13px;width:110px;flex:none}h4 small{display:block;font-weight:400;color:var(--mut)}
.meta{color:var(--mut);margin:4px 0}.row{display:flex;gap:8px;align-items:flex-start;padding:4px 0;border-top:1px solid var(--line)}
figure{margin:0;flex:1;min-width:0}figure img{width:100%;display:block;image-rendering:auto}figcaption{font-size:12px;color:var(--mut)}.none{color:var(--mut);padding:24px 0}
.bar{display:flex;gap:8px;align-items:center;margin:4px 0}.bar span{width:30px}.bar>div{position:relative;flex:1;height:14px;background:var(--line)}
.bar i{position:absolute;top:0;bottom:0;background:var(--f)}.bar i.g{background:var(--g)}.bar b{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--tick)}
.inl{display:inline-block;width:12px;height:10px;position:static;background:var(--f)}.inl.g{background:var(--g)}
</style></head><body><h1>Suplex rise: ${A} vs ${B}</h1>
<p class="meta">Each scenario: left = default game, right = <code>?sellart=v1&amp;aftermath=v2</code>. Stepped at fixed 1/60 s; frames paired by match event.</p>
${sections.join('\n')}</body></html>`);
console.log(`wrote ${join(root, `pair-sheet${SUFFIX}.html`)} and hand-art-check${SUFFIX}.json`);
for (const [sc, c] of Object.entries(check)) {
    console.log(`${sc} (${c.receiver}, facing ${c.facing}): on flickers=${c.on.flickers.length}, fist before rise ${c.on.fistBetweenClutchAndRiseMs} ms, grip returns +${c.on.gripReturnsAfterRiseStartMs} ms after rise start`);
}
