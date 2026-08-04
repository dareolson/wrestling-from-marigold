// Lou (thesz) leg-offset sweep for the final-leg-tune pass.
// Boots the game ONCE, then for each candidate applies the measured thigh/shin
// pivot metadata (fixed) plus a set of Lou-specific screen offsets (swept) to
// the LIVE skeleton, redraws a battery of poses in both facings, and reports:
//   - worst joint ink gap across near/far hip+knee (the joint_attachment_audit
//     correctness metric; >2.5px or "no ink" = REJECT)
//   - near/far trueKnee-vs-shinOrigin (pivot-orbit metric; smaller = the shin
//     rotates about the true knee, not orbiting it)
//   - near/far artThigh-vs-artShin (painted-knee coincidence; smaller = the
//     thigh's painted knee lands on the shin's painted knee)
//
// The pivots are applied by mutating the live Image fields the renderer already
// reads (_pivotOffsetFrac/_distalAnchorFrac); the offsets by mutating the
// Skeleton's private _legOffsetX etc. Nothing here is reimplemented — every
// number comes back out of the same draw() the game runs.
//
//   node tools/debug/lou_leg_offset_sweep.mjs
//
// Candidates are defined in CANDIDATES below.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { POSES } from '../../src/Wrestler.js';
import fs from 'node:fs';
import path from 'node:path';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const PORT = 5197;

// Measured pivot metadata (fixed across all candidates) — report.json.
const PIVOTS = {
    thighPivotOffsetFrac: -0.0767,
    thighDistalAnchorFrac: { u: 0.5444, v: 1.0 },
    shinPivotOffsetFrac: -0.1167,
};

// Offset candidates. baseline = current shipped offsets (no pivots) is added
// separately. Each candidate overrides only the fields it names; unnamed leg
// offsets keep their shipped value.
const SHIPPED_OFFSETS = {
    legOffsetX: -15, legOffsetY: -15, nearLegOffsetY: 0,
    nearShinOffsetX: -22, nearShinOffsetY: 9,
    farShinOffsetX: 6, farShinOffsetY: -3,
    farLegOffsetX: 6, farLegOffsetY: -2,
};

// Near and far leg offsets render independently (near offsets only move near
// leg parts, far offsets only far), so we sweep each side separately. STAGE
// selects which. Shared vertical offsets (legOffsetY) stay at shipped.
const STAGE = process.env.SWEEP_STAGE || 'near';
const CANDIDATES = [];
if (STAGE === 'near') {
    CANDIDATES.push({ name: 'A_pivots_shippedOff', pivots: true, offsets: {} });
    for (const lox of [0, -3, -5, -8, -11, -15]) {
        for (const nsx of [0, -4, -8, -12, -16, -22]) {
            CANDIDATES.push({ name: `L${lox}_S${nsx}`, pivots: true, offsets: { legOffsetX: lox, nearShinOffsetX: nsx } });
        }
    }
} else if (STAGE === 'far') {
    for (const flx of [0, 2, 4, 6, 8]) {
        for (const fsx of [0, 2, 4, 6]) {
            CANDIDATES.push({ name: `FL${flx}_FS${fsx}`, pivots: true, offsets: { farLegOffsetX: flx, farShinOffsetX: fsx } });
        }
    }
} else { // explicit — full named offset sets (Derek's rig-tuner export vs mine)
    CANDIDATES.push({ name: 'DEREK_pivots', pivots: true, offsets: {
        legOffsetX: -1, nearLegOffsetY: 6, nearShinOffsetX: -13, nearShinOffsetY: 6,
        farLegOffsetX: 19, farLegOffsetY: 4, farShinOffsetX: 13, farShinOffsetY: -2,
    } });
    CANDIDATES.push({ name: 'DEREK_noPivots', pivots: false, offsets: {
        legOffsetX: -1, nearLegOffsetY: 6, nearShinOffsetX: -13, nearShinOffsetY: 6,
        farLegOffsetX: 19, farLegOffsetY: 4, farShinOffsetX: 13, farShinOffsetY: -2,
    } });
}

// Pose battery: the named upright poses the joint audit uses, plus a dense
// symmetric leg-angle sweep matching knee_ink_gap_sweep's range (±1.5 rad),
// so a candidate that passes here passes the acceptance tests.
const TEST_POSES = [
    { tag: 'theszIdle', pose: POSES.theszIdle },
    { tag: 'powerIdle', pose: POSES.powerIdle },
    { tag: 'block', pose: POSES.block },
];
for (const a of [-1.5, -1.0, -0.6, -0.3, 0, 0.3, 0.6, 1.0, 1.5]) {
    TEST_POSES.push({ tag: `leg${a}`, pose: { lLeg: a, rLeg: -a, lArm: 0, rArm: 0, lean: 0, crouch: 0 } });
}

async function up(url, ms = 20000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); }
    throw new Error('no server');
}

// Art knee offsets measured directly from the committed PNGs (same method as
// knee_pivot_audit.mjs).
async function measureArtKneeOffsets(browser) {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    const files = {
        thigh: path.join(REPO, 'src/assets/wrestlers/thesz/thigh.png'),
        shin: path.join(REPO, 'src/assets/wrestlers/thesz/shin.png'),
    };
    const out = {};
    for (const [part, file] of Object.entries(files)) {
        const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
        out[part] = await page.evaluate(async (url) => {
            const img = new Image(); img.src = url; await img.decode();
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
            const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
            const T = 10;
            function rowXCenter(y) { let mn = -1, mx = -1; for (let x = 0; x < width; x++) { if (data[(y * width + x) * 4 + 3] > T) { if (mn === -1) mn = x; mx = x; } } return mn === -1 ? null : (mn + mx) / 2; }
            let minY = -1, maxY = -1;
            for (let y = 0; y < height; y++) { if (rowXCenter(y) !== null) { if (minY === -1) minY = y; maxY = y; } }
            const avg = (a, b) => { const v = []; for (let y = a; y <= b; y++) { const r = rowXCenter(y); if (r !== null) v.push(r); } return v.reduce((s, n) => s + n, 0) / v.length; };
            return { width, height, topXCenter: avg(minY, minY + 2), bottomXCenter: avg(maxY - 2, maxY), canvasCenterX: width / 2 };
        }, dataUrl);
    }
    await page.close();
    return {
        thighKneeOffsetFrac: (out.thigh.bottomXCenter - out.thigh.canvasCenterX) / out.thigh.width,
        shinKneeOffsetFrac: (out.shin.topXCenter - out.shin.canvasCenterX) / out.shin.width,
    };
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: REPO, stdio: 'ignore' });
const base = `http://localhost:${PORT}`;
await up(base);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

const artOffsets = await measureArtKneeOffsets(browser);

const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
await page.goto(`${base}?p1=thesz&p2=george`, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.locator('canvas').click();
await page.waitForTimeout(800);

// Install measurement helpers in-page (ink gap + knee coincidence).
await page.evaluate((artOffsets) => {
    const texturePixels = new Map();
    function pixelsFor(img) {
        const key = img.texture.key;
        if (texturePixels.has(key)) return texturePixels.get(key);
        const source = img.texture.getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0);
        const pixels = { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
        texturePixels.set(key, pixels); return pixels;
    }
    function opaqueAt(img, wx, wy) {
        if (!img?.texture || img.texture.key === 'sk_pixel') return true;
        const dx = wx - img.x, dy = wy - img.y;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        const lx = c * dx + s * dy, ly = -s * dx + c * dy;
        let u = lx / img.displayWidth + img.originX;
        const v = ly / img.displayHeight + img.originY;
        if (img.flipX) u = 1 - u;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
        const frame = img.frame;
        const px = Math.max(0, Math.min(frame.cutWidth - 1, Math.floor(u * frame.cutWidth)));
        const py = Math.max(0, Math.min(frame.cutHeight - 1, Math.floor(v * frame.cutHeight)));
        const pixels = pixelsFor(img);
        return pixels.data[((frame.cutY + py) * pixels.width + (frame.cutX + px)) * 4 + 3] >= 32;
    }
    function inkNear(img, joint, radius = 14) {
        const pts = [];
        for (let y = Math.floor(joint.y - radius); y <= Math.ceil(joint.y + radius); y++)
            for (let x = Math.floor(joint.x - radius); x <= Math.ceil(joint.x + radius); x++) {
                if ((x - joint.x) ** 2 + (y - joint.y) ** 2 > radius ** 2) continue;
                if (opaqueAt(img, x + 0.5, y + 0.5)) pts.push([x, y]);
            }
        return pts;
    }
    function gap(parentImg, childImg, joint) {
        const a = inkNear(parentImg, joint), b = inkNear(childImg, joint);
        if (!a.length || !b.length) return Infinity;
        let g = Infinity;
        for (const [ax, ay] of a) for (const [bx, by] of b) { const d = Math.hypot(ax - bx, ay - by); if (d < g) g = d; }
        return g;
    }
    const JOINTS = {
        farHip: ['torso', 'farThigh'], nearHip: ['torso', 'nearThigh'],
        farKnee: ['farThigh', 'farShin'], nearKnee: ['nearThigh', 'nearShin'],
    };
    window.__kneeCoin = (sk, side) => {
        const knee = sk[side === 'near' ? 'nearKneeDebug' : 'farKneeDebug'];
        const thighR = sk[side === 'near' ? 'nearThighRenderDebug' : 'farThighRenderDebug'];
        const shinR = sk[side === 'near' ? 'nearShinRenderDebug' : 'farShinRenderDebug'];
        if (!knee || !thighR || !shinR) return null;
        const thighLx = thighR.facing * artOffsets.thighKneeOffsetFrac * thighR.texDims.w * thighR.s;
        const thighLy = thighR.texDims.h * thighR.s;
        const artThigh = sk._endXY(thighR.x, thighR.y, thighLx, thighLy, thighR.angle);
        const shinLx = shinR.facing * artOffsets.shinKneeOffsetFrac * shinR.texDims.w * shinR.s;
        const artShin = sk._endXY(shinR.x, shinR.y, shinLx, 0, shinR.angle);
        return {
            shinOrigin: Math.hypot(knee.x - shinR.x, knee.y - shinR.y),
            artThighVsArtShin: Math.hypot(artThigh.x - artShin.x, artThigh.y - artShin.y),
        };
    };
    window.__inkGaps = (sk) => {
        const out = {};
        for (const [name, [p, c]] of Object.entries(JOINTS)) {
            const j = sk.jointAttachmentPoints?.[name];
            if (!j) { out[name] = Infinity; continue; }
            out[name] = gap(sk[p], sk[c], j);
        }
        return out;
    };
}, artOffsets);

const slot = await page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    return (sc.w1.skeleton.nearThigh.texture?.key || '').startsWith('thesz') ? 'w1' : 'w2';
});

async function evalCandidate(cand) {
    return await page.evaluate(({ cand, PIVOTS, SHIPPED_OFFSETS, TEST_POSES, slot }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = sc[slot];
        const sk = w.skeleton;
        // Apply pivots (or clear) to the live Image fields.
        if (cand.pivots) {
            sk.nearThigh._pivotOffsetFrac = PIVOTS.thighPivotOffsetFrac;
            sk.farThigh._pivotOffsetFrac = PIVOTS.thighPivotOffsetFrac;
            sk.nearThigh._distalAnchorFrac = PIVOTS.thighDistalAnchorFrac;
            sk.farThigh._distalAnchorFrac = PIVOTS.thighDistalAnchorFrac;
            sk.nearShin._pivotOffsetFrac = PIVOTS.shinPivotOffsetFrac;
            sk.farShin._pivotOffsetFrac = PIVOTS.shinPivotOffsetFrac;
        } else {
            for (const im of [sk.nearThigh, sk.farThigh, sk.nearShin, sk.farShin]) { im._pivotOffsetFrac = 0; im._distalAnchorFrac = null; }
        }
        // Apply offsets = shipped overridden by candidate.
        const off = { ...SHIPPED_OFFSETS, ...cand.offsets };
        sk._legOffsetX = off.legOffsetX; sk._legOffsetY = off.legOffsetY; sk._nearLegOffsetY = off.nearLegOffsetY;
        sk._nearShinOffsetX = off.nearShinOffsetX; sk._nearShinOffsetY = off.nearShinOffsetY;
        sk._farShinOffsetX = off.farShinOffsetX; sk._farShinOffsetY = off.farShinOffsetY;
        sk._farLegOffsetX = off.farLegOffsetX; sk._farLegOffsetY = off.farLegOffsetY;

        const SIDE_JOINTS = { near: ['nearHip', 'nearKnee'], far: ['farHip', 'farKnee'] };
        const agg = {
            near: { maxInk: 0, noInk: 0, failPose: null, art: 0, origin: 0 },
            far: { maxInk: 0, noInk: 0, failPose: null, art: 0, origin: 0 },
        };
        for (const facing of [1, -1]) {
            for (const tp of TEST_POSES) {
                w.state = 'standing'; w.facing = facing; w.pose = { ...tp.pose }; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.draw();
                const gaps = window.__inkGaps(sk);
                for (const side of ['near', 'far']) {
                    for (const j of SIDE_JOINTS[side]) {
                        const g = gaps[j];
                        if (!Number.isFinite(g)) { agg[side].noInk++; if (!agg[side].failPose) agg[side].failPose = `${j}@${facing}/${tp.tag}`; }
                        else if (g > agg[side].maxInk) { agg[side].maxInk = g; }
                    }
                    const kc = window.__kneeCoin(sk, side);
                    if (kc) { agg[side].art = Math.max(agg[side].art, kc.artThighVsArtShin); agg[side].origin = Math.max(agg[side].origin, kc.shinOrigin); }
                }
            }
        }
        return agg;
    }, { cand, PIVOTS, SHIPPED_OFFSETS, TEST_POSES, slot });
}

console.log('STAGE:', STAGE, '| art knee offsets:', JSON.stringify(artOffsets));
const rows = [];
{
    const r = await evalCandidate({ name: 'BASELINE_noPivots', pivots: false, offsets: {} });
    rows.push({ name: 'BASELINE_noPivots', ...r });
}
for (const cand of CANDIDATES) {
    const r = await evalCandidate(cand);
    rows.push({ name: cand.name, ...r });
}
const sides = STAGE === 'explicit' ? ['near', 'far'] : [STAGE === 'near' ? 'near' : 'far'];
for (const side of sides) {
    console.log(`--- ${side} side ---`);
    console.log(`name`.padEnd(20), `${side}MaxInk`, 'noInk', `${side}Art`, `${side}Orig`, 'failPose');
    for (const r of rows) {
        const s = r[side];
        console.log(r.name.padEnd(20), s.maxInk.toFixed(2).padStart(9), String(s.noInk).padStart(5), s.art.toFixed(2).padStart(7), s.origin.toFixed(2).padStart(7), ' ', s.failPose || '');
    }
}
fs.writeFileSync(path.join(REPO, `Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/evidence/final-leg-tune/sweep_${STAGE}.json`), JSON.stringify({ stage: STAGE, artOffsets, PIVOTS, rows }, null, 2));

await browser.close();
server.kill();
