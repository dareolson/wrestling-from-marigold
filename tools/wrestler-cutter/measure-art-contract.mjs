#!/usr/bin/env node

// Measures the four art-contract properties that CHARACTER_ART_SOURCE_STANDARD.md
// lists as human-review items "until a real broadcast-analysis harness implements
// those measurements": value-family flatness, view-to-view identity drift,
// broadcast-scale presentation, and micro-pattern energy.
//
// This is that harness's first version. It is ADVISORY by default and exits 0
// whatever it finds — the standard's own rule is that an unchecked style target
// must not be described as an automated pass, and the inverse holds too: a
// number is not an art-direction ruling. Pass --strict to make the proposed
// thresholds blocking, which is appropriate in CI once they are ratified.
//
// Why no Node pin (unlike the production commands): this writes no artifact and
// records no hash. decodeRgbaPng is pure JS inflate plus unfilter, so every
// number here reproduces on any Node version. The pin exists because off-pin
// runs produce artwork whose PNG bytes differ; nothing here produces artwork.
//
// Usage:
//   node tools/wrestler-cutter/measure-art-contract.mjs --sheet <sheet.png>
//        [--manifest <manifest.json>] [--families 179,147,54,42,0]
//        [--json] [--strict]
//
// Two sheets are compared by running it twice and diffing the numbers. The
// metrics are intentionally scale-free so a 4096 master sheet and a single
// assembled proof produce comparable figures.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';

const DEFAULT_MANIFEST = fileURLToPath(
    new URL('./templates/rig-source-manifest.v2.example.json', import.meta.url));

// Rec.709. The runtime uses Phaser's colorMatrix.grayscale(1), which is a
// luminance matrix; these are the standard coefficients for it. Any consistent
// choice works for comparing two sheets, but this one matches what the player
// actually sees closely enough to reason about.
const LUMA_R = 0.2126, LUMA_G = 0.7152, LUMA_B = 0.0722;

// Alpha at or below this is not the figure. 254 rather than 0 deliberately:
// every measurement here is about interior paint, and counting antialiased edge
// pixels as figure would let edge softness masquerade as continuous tone —
// which is the exact confusion the flatness metric exists to resolve.
const OPAQUE = 254;

// Proposed thresholds. NOT ratified — they are the numbers this tool argues for,
// recorded here so a run is reproducible and an argument about them is about the
// number rather than about the measurement.
const PROPOSED = {
    flatnessWithin4: 0.90,     // fraction of interior pixels within +-4 luma of a family
    identityDriftMax: 0.12,    // max relative spread of a view-invariant quantity
    patternEnergyMax: 22,      // sign changes per 100px inside the figure at game scale
    periodicityMax: 0.25,      // autocorrelation peak of the luma derivative at lag 1-8px
};

const GAME_SCALES = [265, 209, 154];

function parseArgs(argv) {
    const flags = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) flags[key] = true;
        else { flags[key] = next; i++; }
    }
    return flags;
}

// ---------------------------------------------------------------------------
// Region extraction
// ---------------------------------------------------------------------------

// A "region" is one figure: a rectangle of the sheet plus the luma and opacity
// of every pixel in it. Master panels come from the manifest; a sheet with no
// matching panels is measured whole, which is what makes assembled proofs and
// single-part images work without special-casing them.
function regionFrom(image, rect, label) {
    const { x, y, w, h } = rect;
    const luma = new Float32Array(w * h);
    const opaque = new Uint8Array(w * h);
    // Region-local RGB, packed. The first version of this kept a reference to
    // the whole sheet's buffer and indexed it with region-local offsets, so
    // every unique-colour count came back as 1 — a metric that reported a
    // constant is worse than no metric, so it is stored per region now.
    const packed = new Int32Array(w * h);
    for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
            const src = ((y + row) * image.w + (x + col));
            const i = row * w + col;
            opaque[i] = image.alpha[src] > OPAQUE ? 1 : 0;
            const p = src * 4;
            luma[i] = LUMA_R * image.rgba[p] + LUMA_G * image.rgba[p + 1] + LUMA_B * image.rgba[p + 2];
            packed[i] = (image.rgba[p] << 16) | (image.rgba[p + 1] << 8) | image.rgba[p + 2];
        }
    }
    return { label, w, h, luma, opaque, packed, rect };
}

function regionsFor(image, manifest) {
    const panels = manifest?.sourceSheet?.masterPanels ?? {};
    const order = manifest?.sourceSheet?.productionGrid?.viewOrder ?? [];
    const usable = order
        .map(view => ({ view, panel: panels[view] }))
        .filter(({ panel }) => panel
            && panel.x >= 0 && panel.y >= 0
            && panel.x + panel.w <= image.w && panel.y + panel.h <= image.h);

    if (usable.length) {
        const painted = usable.filter(({ panel }) => {
            for (let row = 0; row < panel.h; row++) {
                const base = (panel.y + row) * image.w + panel.x;
                for (let col = 0; col < panel.w; col++) if (image.alpha[base + col] > OPAQUE) return true;
            }
            return false;
        });
        if (painted.length) return painted.map(({ view, panel }) => regionFrom(image, panel, view));
    }
    return [regionFrom(image, { x: 0, y: 0, w: image.w, h: image.h }, 'sheet')];
}

// Tight bounds of the opaque figure inside a region, plus its per-row widths.
// Everything downstream keys off these, so a region with no paint is reported
// rather than silently producing zeros.
function figureOf(region) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
    const rowWidth = new Int32Array(region.h);
    const rowMin = new Int32Array(region.h).fill(-1);
    for (let row = 0; row < region.h; row++) {
        let lo = -1, hi = -1, n = 0;
        for (let col = 0; col < region.w; col++) {
            if (!region.opaque[row * region.w + col]) continue;
            if (lo < 0) lo = col;
            hi = col; n++;
        }
        if (lo >= 0) {
            rowWidth[row] = hi - lo + 1;
            rowMin[row] = lo;
            minY = Math.min(minY, row); maxY = Math.max(maxY, row);
            minX = Math.min(minX, lo); maxX = Math.max(maxX, hi);
            count += n;
        }
    }
    if (!count) return null;
    return { minX, maxX, minY, maxY, count, rowWidth, rowMin, height: maxY - minY, width: maxX - minX };
}

// ---------------------------------------------------------------------------
// A. Value-family flatness
// ---------------------------------------------------------------------------

// Greedily pick the K luma centres that cover the most interior pixels within
// +-4, then report that coverage. Deliberately does NOT require declared family
// values: the question "is this flat-value art" is answerable from the art
// alone, and asking it that way lets two sheets with different palettes be
// compared directly. Pass --families to additionally check declared centres.
function measureFlatness(region, figure, familyCount, declared) {
    const hist = new Float64Array(256);
    let total = 0;
    const seen = new Set();
    for (let i = 0; i < region.luma.length; i++) {
        if (!region.opaque[i]) continue;
        hist[Math.round(region.luma[i])]++;
        total++;
        // Unique colour count is capped: past a few thousand the exact number
        // carries no extra signal and the Set costs real memory on a 4096 sheet.
        if (seen.size < 50000) seen.add(region.packed[i]);
    }
    if (!total) return null;

    const window = (h, c, r) => {
        let sum = 0;
        for (let v = Math.max(0, c - r); v <= Math.min(255, c + r); v++) sum += h[v];
        return sum;
    };

    const working = Float64Array.from(hist);
    const centres = [];
    for (let k = 0; k < familyCount; k++) {
        let best = 0, bestValue = -1;
        for (let c = 0; c < 256; c++) {
            const v = window(working, c, 4);
            if (v > bestValue) { bestValue = v; best = c; }
        }
        centres.push(best);
        for (let v = Math.max(0, best - 4); v <= Math.min(255, best + 4); v++) working[v] = 0;
    }

    const coverage = (cs, r) => {
        const hit = new Uint8Array(256);
        for (const c of cs) for (let v = Math.max(0, c - r); v <= Math.min(255, c + r); v++) hit[v] = 1;
        let sum = 0;
        for (let v = 0; v < 256; v++) if (hit[v]) sum += hist[v];
        return sum / total;
    };

    return {
        interiorPixels: total,
        uniqueColours: seen.size >= 50000 ? '>=50000' : seen.size,
        bestCentres: [...centres].sort((a, b) => a - b),
        within4: coverage(centres, 4),
        within8: coverage(centres, 8),
        declaredWithin4: declared ? coverage(declared, 4) : null,
        declaredWithin8: declared ? coverage(declared, 8) : null,
    };
}

// ---------------------------------------------------------------------------
// B. View-to-view identity drift
// ---------------------------------------------------------------------------

// Comparing a front head to a profile head directly is meaningless — they are
// supposed to differ. What must NOT differ across camera angles are the
// character's own measurements and drawing treatment.
//
// But only SOME of these are invariant, and the first version of this function
// got that wrong: it grouped hairline position and head dark-mass with the
// genuinely invariant quantities and duly reported 122.9% "drift" across a
// turnaround where the back view is correctly almost all hair. That is the same
// error as the arm-overhang metric — a number that is large for a legitimate
// reason and therefore carries no signal.
//
// So the quantities are split by what they can honestly claim:
//   ALWAYS invariant — figure height, head-to-figure ratio, ink fraction.
//   FACE-VIEWS ONLY  — hairline position, head dark-mass, hair value. These are
//                      compared only among views that actually show a face,
//                      detected from the art (head dark-mass under half) rather
//                      than from a declared role, so the tool works on a sheet
//                      with no manifest.
function measureIdentity(region, figure) {
    if (!figure) return null;
    const { minY, maxY, rowWidth } = figure;
    const height = maxY - minY;

    // Neck: the narrowest row in the top 30% of the figure. Robust across views
    // because the neck is the narrowest thing between crown and shoulders in all
    // five, whatever the camera is doing.
    let neckRow = minY, neckWidth = Infinity;
    const searchEnd = minY + Math.max(4, Math.round(height * 0.30));
    for (let row = minY + Math.round(height * 0.05); row <= searchEnd; row++) {
        if (rowWidth[row] > 0 && rowWidth[row] < neckWidth) { neckWidth = rowWidth[row]; neckRow = row; }
    }
    const headHeight = neckRow - minY;
    if (headHeight <= 2) return null;

    // Hairline: scanning down from the crown, the first row where the head stops
    // being mostly dark. This is the quantity that caught three different
    // hairlines across five panels of one approved master.
    const DARK = 96;
    let hairlineRow = -1, wasDark = false, hairPixels = 0, hairLumaSum = 0, headPixels = 0;
    for (let row = minY; row < neckRow; row++) {
        let dark = 0, n = 0;
        for (let col = 0; col < region.w; col++) {
            const i = row * region.w + col;
            if (!region.opaque[i]) continue;
            n++; headPixels++;
            if (region.luma[i] < DARK) { dark++; hairPixels++; hairLumaSum += region.luma[i]; }
        }
        if (!n) continue;
        const frac = dark / n;
        if (frac >= 0.5) wasDark = true;
        else if (wasDark && hairlineRow < 0) hairlineRow = row;
    }
    if (hairlineRow < 0) hairlineRow = neckRow;

    let inkPixels = 0;
    for (let i = 0; i < region.luma.length; i++) {
        if (region.opaque[i] && region.luma[i] < 48) inkPixels++;
    }

    const darkMassFractionOfHead = headPixels ? hairPixels / headPixels : 0;
    return {
        figureHeightPx: height,
        headHeightRatio: headHeight / height,
        inkFractionOfFigure: figure.count ? inkPixels / figure.count : 0,
        // A view whose head is more than half dark is looking away; its hairline
        // is the nape, not a hairline, and comparing it to a front view's is
        // comparing two different features.
        neckRowOffset: headHeight,
        showsFace: darkMassFractionOfHead < 0.5,
        hairlineFromCrownRatio: (hairlineRow - minY) / headHeight,
        darkMassFractionOfHead,
        darkMassLuma: hairPixels ? hairLumaSum / hairPixels : 0,
    };
}

// Relative spread: (max - min) / mean. Scale-free, so one tolerance covers
// quantities with very different units.
function spread(values) {
    const clean = values.filter(v => Number.isFinite(v));
    if (clean.length < 2) return 0;
    const min = Math.min(...clean), max = Math.max(...clean);
    const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
    return mean === 0 ? 0 : (max - min) / Math.abs(mean);
}

// ---------------------------------------------------------------------------
// C. Broadcast simulation + D. micro-pattern energy
// ---------------------------------------------------------------------------

// Box-average downscale to a target figure height, then grayscale is already
// applied (luma), then the scanline: Arena.js lays a black 1px row on every
// second screen row at alpha 0.18.
function broadcastAt(region, figure, targetHeight, headRowCount = 0) {
    const scale = targetHeight / Math.max(1, figure.height);
    const outW = Math.max(1, Math.round(figure.width * scale));
    const outH = Math.max(1, Math.round(figure.height * scale));
    const luma = new Float32Array(outW * outH);
    const cover = new Float32Array(outW * outH);

    for (let row = 0; row < outH; row++) {
        const y0 = figure.minY + Math.floor(row / scale);
        const y1 = Math.min(figure.maxY, figure.minY + Math.floor((row + 1) / scale) - 1);
        for (let col = 0; col < outW; col++) {
            const x0 = figure.minX + Math.floor(col / scale);
            const x1 = Math.min(figure.maxX, figure.minX + Math.floor((col + 1) / scale) - 1);
            let sum = 0, n = 0, opaque = 0, cells = 0;
            for (let y = y0; y <= Math.max(y0, y1); y++) {
                for (let x = x0; x <= Math.max(x0, x1); x++) {
                    const i = y * region.w + x;
                    cells++;
                    if (!region.opaque[i]) continue;
                    sum += region.luma[i]; n++; opaque++;
                }
            }
            const o = row * outW + col;
            cover[o] = cells ? opaque / cells : 0;
            luma[o] = n ? sum / n : 0;
        }
    }

    // Scanline, applied after downscale because that is the order the player
    // gets: the filter lives in screen space, not in the art.
    for (let row = 1; row < outH; row += 2) {
        for (let col = 0; col < outW; col++) luma[row * outW + col] *= (1 - 0.18);
    }

    // Silhouette connectivity: 8-connected largest component of the covered mask
    // over total covered. A figure that breaks into pieces at 154px has a
    // silhouette hole, which the standard rejects outright.
    const mask = new Uint8Array(outW * outH);
    let covered = 0;
    for (let i = 0; i < mask.length; i++) if (cover[i] >= 0.5) { mask[i] = 1; covered++; }
    let largest = 0;
    const queue = new Int32Array(mask.length);
    for (let start = 0; start < mask.length; start++) {
        if (mask[start] !== 1) continue;
        let head = 0, tail = 0, size = 0;
        queue[tail++] = start; mask[start] = 2;
        while (head < tail) {
            const cur = queue[head++]; size++;
            const cx = cur % outW, cy = (cur / outW) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= outW || ny >= outH) continue;
                const ni = ny * outW + nx;
                if (mask[ni] !== 1) continue;
                mask[ni] = 2; queue[tail++] = ni;
            }
        }
        largest = Math.max(largest, size);
    }

    // Pattern energy: mean sign changes in the horizontal luma derivative per
    // 100px, inside the figure only. Regular hatching, dither and halftone all
    // raise this; flat fills with a few strokes do not. Measured after downscale
    // because a pattern only beats the scanline grid once it is projected.
    //
    // Measured over the head band as well as the whole figure. The first version
    // measured the figure only, and back3q — the one view with regular comb
    // hatching in its hair — scored LOWEST of the five, because a hatched head
    // is a few percent of a whole wrestler. A pattern metric averaged over
    // mostly-flat skin cannot see the pattern.
    const energyOver = (rowStart, rowEnd) => {
        let changes = 0, runs = 0;
        for (let row = rowStart; row < rowEnd; row++) {
            let prevSign = 0, prevLuma = null, span = 0;
            for (let col = 0; col < outW; col++) {
                const o = row * outW + col;
                if (cover[o] < 0.5) { prevLuma = null; prevSign = 0; continue; }
                span++;
                if (prevLuma !== null) {
                    const d = luma[o] - prevLuma;
                    const sign = Math.abs(d) < 2 ? 0 : Math.sign(d);
                    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) changes++;
                    if (sign !== 0) prevSign = sign;
                }
                prevLuma = luma[o];
            }
            runs += span;
        }
        return runs ? (changes / runs) * 100 : 0;
    };
    const headRows = Math.min(outH, Math.max(0, Math.round(headRowCount * scale)));

    // Periodicity, which is the property the contract actually names: "repeating
    // details whose projected screen period is 1-8 px" beat against the
    // scanline grid. Sign-change counting cannot express this — it scored a
    // comb-hatched head and a face with eyes and a mouth the same, because both
    // are simply busy. Normalized autocorrelation of the horizontal luma
    // derivative can: a regular pattern of period p puts a strong positive peak
    // at lag p, while facial detail and fabric folds decay toward zero without
    // one. Reported as the strongest peak in the 1-8px band and the lag it sits
    // at, so a finding names the period to go and look for.
    const periodicityOver = (rowStart, rowEnd) => {
        const MAX_LAG = 8;
        const acc = new Float64Array(MAX_LAG + 1);
        let energy = 0;
        for (let row = rowStart; row < rowEnd; row++) {
            let runStart = -1;
            for (let col = 0; col <= outW; col++) {
                const inside = col < outW && cover[row * outW + col] >= 0.5;
                if (inside && runStart < 0) runStart = col;
                if (inside || runStart < 0) continue;
                const len = col - runStart;
                if (len >= MAX_LAG + 3) {
                    const d = new Float64Array(len - 1);
                    for (let i = 0; i < len - 1; i++) {
                        d[i] = luma[row * outW + runStart + i + 1] - luma[row * outW + runStart + i];
                    }
                    let e = 0;
                    for (let i = 0; i < d.length; i++) e += d[i] * d[i];
                    if (e > 1e-6) {
                        energy += e;
                        for (let k = 1; k <= MAX_LAG; k++) {
                            let sum = 0;
                            for (let i = 0; i + k < d.length; i++) sum += d[i] * d[i + k];
                            acc[k] += sum;
                        }
                    }
                }
                runStart = -1;
            }
        }
        if (energy <= 0) return { peak: 0, lag: null };
        let peak = 0, lag = null;
        for (let k = 1; k <= MAX_LAG; k++) {
            const r = acc[k] / energy;
            if (r > peak) { peak = r; lag = k; }
        }
        return { peak, lag };
    };

    const values = [];
    for (let i = 0; i < luma.length; i++) if (cover[i] >= 0.5) values.push(luma[i]);
    values.sort((a, b) => a - b);
    const at = f => values.length ? values[Math.min(values.length - 1, Math.floor(f * values.length))] : 0;

    return {
        targetHeight,
        renderedPx: `${outW}x${outH}`,
        connectivity: covered ? largest / covered : 0,
        lumaP05: at(0.05), lumaMedian: at(0.50), lumaP95: at(0.95),
        sourceRange: at(0.95) - at(0.05),
        patternEnergyPer100px: energyOver(0, outH),
        figurePeriodicity: periodicityOver(0, outH),
        headPeriodicity: headRows > 3 ? periodicityOver(0, headRows) : null,
    };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function pct(v) { return `${(v * 100).toFixed(1)}%`; }
function num(v, d = 2) { return Number(v).toFixed(d); }

export function measureSheet(image, manifest, options = {}) {
    const familyCount = options.familyCount
        ?? manifest?.artContract?.maximumStructuralValueFamilies ?? 5;
    const declared = options.declaredFamilies ?? null;

    const regions = regionsFor(image, manifest);
    const views = [];
    for (const region of regions) {
        const figure = figureOf(region);
        if (!figure) { views.push({ view: region.label, empty: true }); continue; }
        const identity = measureIdentity(region, figure);
        views.push({
            view: region.label,
            flatness: measureFlatness(region, figure, familyCount, declared),
            identity,
            broadcast: GAME_SCALES.map(h => broadcastAt(region, figure, h, identity?.neckRowOffset ?? 0)),
        });
    }

    const measured = views.filter(v => v.identity);
    const faceViews = measured.filter(v => v.identity.showsFace);

    const drift = measured.length > 1 ? {
        figureHeightPx: spread(measured.map(v => v.identity.figureHeightPx)),
        headHeightRatio: spread(measured.map(v => v.identity.headHeightRatio)),
        inkFractionOfFigure: spread(measured.map(v => v.identity.inkFractionOfFigure)),
    } : null;

    const faceDrift = faceViews.length > 1 ? {
        hairlineFromCrownRatio: spread(faceViews.map(v => v.identity.hairlineFromCrownRatio)),
        darkMassFractionOfHead: spread(faceViews.map(v => v.identity.darkMassFractionOfHead)),
        darkMassLuma: spread(faceViews.map(v => v.identity.darkMassLuma)),
    } : null;

    return {
        views, drift, faceDrift,
        faceViews: faceViews.map(v => v.view),
        rearViews: measured.filter(v => !v.identity.showsFace).map(v => v.view),
        familyCount, declared, proposed: PROPOSED,
    };
}

function report(result, sheetPath) {
    const lines = [];
    lines.push(`sheet: ${sheetPath}`);
    lines.push(`figures measured: ${result.views.filter(v => !v.empty).length}   value families assumed: ${result.familyCount}`);
    lines.push('');

    lines.push('A. VALUE FLATNESS  — how much of the interior sits in a few flat families');
    lines.push(`   proposed gate: >= ${pct(PROPOSED.flatnessWithin4)} within +-4 luma of a family`);
    lines.push('');
    lines.push('   view        interior px   unique RGB   best centres              within+-4   within+-8');
    for (const v of result.views) {
        if (v.empty || !v.flatness) { lines.push(`   ${v.view.padEnd(11)} (no paint)`); continue; }
        const f = v.flatness;
        const flag = f.within4 >= PROPOSED.flatnessWithin4 ? ' ' : '!';
        lines.push(`  ${flag}${v.view.padEnd(11)} ${String(f.interiorPixels).padStart(11)}   ${String(f.uniqueColours).padStart(10)}   ${`[${f.bestCentres.join(', ')}]`.padEnd(24)} ${pct(f.within4).padStart(9)}   ${pct(f.within8).padStart(9)}`);
    }
    if (result.declared) {
        lines.push('');
        lines.push(`   against declared families [${result.declared.join(', ')}]:`);
        for (const v of result.views) {
            if (v.empty || !v.flatness) continue;
            lines.push(`     ${v.view.padEnd(11)} within+-4 ${pct(v.flatness.declaredWithin4).padStart(7)}   within+-8 ${pct(v.flatness.declaredWithin8).padStart(7)}`);
        }
    }
    lines.push('');

    lines.push('B. IDENTITY DRIFT  — quantities that must NOT change with camera angle');
    lines.push(`   proposed gate: relative spread <= ${pct(PROPOSED.identityDriftMax)} on each row`);
    lines.push('');
    if (!result.drift) {
        lines.push('   single figure — drift is undefined, nothing to compare');
    } else {
        lines.push('   view        face?   figure h   head/fig   ink%    hairline   darkmass%   darkmass L');
        for (const v of result.views) {
            if (!v.identity) continue;
            const d = v.identity;
            lines.push(`   ${v.view.padEnd(11)} ${(d.showsFace ? 'yes' : 'no').padStart(5)}   ${String(d.figureHeightPx).padStart(8)}   ${num(d.headHeightRatio, 3).padStart(8)}   ${pct(d.inkFractionOfFigure).padStart(5)}   ${num(d.hairlineFromCrownRatio, 3).padStart(8)}   ${pct(d.darkMassFractionOfHead).padStart(9)}   ${num(d.darkMassLuma, 1).padStart(10)}`);
        }
        lines.push('');
        lines.push('   spread, all views (these cannot change with camera):');
        for (const [key, value] of Object.entries(result.drift)) {
            const flag = value <= PROPOSED.identityDriftMax ? ' ' : '!';
            lines.push(`   ${flag} ${key.padEnd(26)} ${pct(value).padStart(8)}`);
        }
        if (result.faceDrift) {
            lines.push('');
            lines.push(`   spread, face-showing views only [${result.faceViews.join(', ')}]:`);
            for (const [key, value] of Object.entries(result.faceDrift)) {
                const flag = value <= PROPOSED.identityDriftMax ? ' ' : '!';
                lines.push(`   ${flag} ${key.padEnd(26)} ${pct(value).padStart(8)}`);
            }
            if (result.rearViews.length) {
                lines.push(`   (excluded as rear views: ${result.rearViews.join(', ')} — a nape is not a hairline)`);
            }
        }
    }
    lines.push('');

    lines.push('C/D. BROADCAST SIMULATION  — downscale, grayscale, scanline every 2nd row @ 0.18');
    lines.push(`   proposed gate: connectivity 100%, busyness <= ${PROPOSED.patternEnergyMax}/100px, periodicity peak <= ${PROPOSED.periodicityMax}`);
    lines.push('');
    lines.push('   view        target   rendered    connect   luma p05/med/p95   src range   busy   fig period   head period');
    for (const v of result.views) {
        if (!v.broadcast) continue;
        for (const b of v.broadcast) {
            const worstPeak = Math.max(b.figurePeriodicity.peak, b.headPeriodicity?.peak ?? 0);
            const flag = (b.connectivity >= 0.999
                && b.patternEnergyPer100px <= PROPOSED.patternEnergyMax
                && worstPeak <= PROPOSED.periodicityMax) ? ' ' : '!';
            const show = pp => pp === null ? '        n/a'
                : `${num(pp.peak, 2)}${pp.lag ? ` @${pp.lag}px` : ''}`.padStart(11);
            lines.push(`  ${flag}${v.view.padEnd(11)} ${String(b.targetHeight).padStart(6)}   ${b.renderedPx.padStart(8)}   ${pct(b.connectivity).padStart(7)}   ${`${num(b.lumaP05, 0)}/${num(b.lumaMedian, 0)}/${num(b.lumaP95, 0)}`.padStart(15)}   ${num(b.sourceRange, 0).padStart(9)}   ${num(b.patternEnergyPer100px, 1).padStart(4)}   ${show(b.figurePeriodicity)}   ${show(b.headPeriodicity)}`);
        }
    }
    lines.push('');
    lines.push('   "src range" is the source contrast after scanline, NOT what the player sees.');
    lines.push('   Measured from ARENA_LIGHTING_EVIDENCE, source skin at luma 179 arrives on');
    lines.push('   screen at median ~92 with the figure topping out near 146 — roughly half the');
    lines.push('   range. Halve any separation budget read off this column. Modelling the arena');
    lines.push('   pass properly needs a real capture, which is Gate B, not this tool.');
    lines.push('Advisory. These four properties are human-review items in');
    lines.push('CHARACTER_ART_SOURCE_STANDARD.md; a number here is evidence for that review,');
    lines.push('not a substitute for it. Thresholds are proposed, not ratified.');
    return lines.join('\n');
}

function failures(result) {
    const out = [];
    for (const v of result.views) {
        if (v.flatness && v.flatness.within4 < PROPOSED.flatnessWithin4) {
            out.push(`${v.view}: value flatness ${pct(v.flatness.within4)} below ${pct(PROPOSED.flatnessWithin4)}`);
        }
        for (const b of v.broadcast ?? []) {
            if (b.connectivity < 0.999) out.push(`${v.view} @${b.targetHeight}px: silhouette breaks (${pct(b.connectivity)} connected)`);
            if (b.patternEnergyPer100px > PROPOSED.patternEnergyMax) out.push(`${v.view} @${b.targetHeight}px: busyness ${num(b.patternEnergyPer100px, 1)}/100px`);
            if (b.figurePeriodicity.peak > PROPOSED.periodicityMax) out.push(`${v.view} @${b.targetHeight}px: figure repeats at ${b.figurePeriodicity.lag}px (peak ${num(b.figurePeriodicity.peak, 2)})`);
            if ((b.headPeriodicity?.peak ?? 0) > PROPOSED.periodicityMax) out.push(`${v.view} @${b.targetHeight}px: head repeats at ${b.headPeriodicity.lag}px (peak ${num(b.headPeriodicity.peak, 2)})`);
        }
    }
    for (const [key, value] of Object.entries({ ...(result.drift ?? {}), ...(result.faceDrift ?? {}) })) {
        if (value > PROPOSED.identityDriftMax) out.push(`identity drift ${key}: ${pct(value)} above ${pct(PROPOSED.identityDriftMax)}`);
    }
    return out;
}

async function main() {
    const flags = parseArgs(process.argv.slice(2));
    const sheetPath = flags.sheet ?? process.argv.slice(2).find(a => a.endsWith('.png'));
    if (!sheetPath) {
        console.error('usage: measure-art-contract.mjs --sheet <sheet.png> [--manifest <m.json>] [--families a,b,c] [--json] [--strict]');
        process.exit(2);
    }

    let manifest = {};
    try {
        manifest = JSON.parse(await readFile(flags.manifest ?? DEFAULT_MANIFEST, 'utf8'));
    } catch {
        // A sheet with no manifest is measured whole. That is the supported way
        // to point this at an assembled proof or a candidate from another tool.
    }

    const declaredFamilies = typeof flags.families === 'string'
        ? flags.families.split(',').map(v => Number(v.trim())).filter(Number.isFinite)
        : null;

    const image = decodeRgbaPng(await readFile(sheetPath));
    const result = measureSheet(image, manifest, { declaredFamilies });

    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else console.log(report(result, path.relative(process.cwd(), sheetPath)));

    const found = failures(result);
    if (flags.strict && found.length) {
        console.error('');
        for (const f of found) console.error(`error: ${f}`);
        console.error(`${found.length} proposed threshold${found.length === 1 ? '' : 's'} not met`);
        process.exit(1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
