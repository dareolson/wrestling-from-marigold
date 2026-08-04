// Thigh-tail protrusion diagnostic (2026-07-28).
//
// knee_ink_gap_sweep proves the knee never OPENS (no transparent separation).
// It says nothing about the opposite failure: the standardized thigh carries a
// long painted tail past the anatomical knee (box.h 85 vs bone thighH 49 => ~36
// display-units of skin below the knee). When the shin rotates during the walk
// cycle / leg sweeps, that hidden tail escapes from behind the shin and reads
// as a pink flap below or beside the knee.
//
// This sweep measures exactly that escaped material. For each leg it takes the
// true knee point (Skeleton's nearKneeDebug/farKneeDebug) and the thigh's own
// hip origin, forms the hip->knee bone direction, and counts every OPAQUE thigh
// pixel that is (a) DISTAL to the knee (past it, along the bone) and (b) NOT
// covered by that leg's shin/boot art. Those are the protruding-tail pixels.
// Reported: pixel count, max reach past the knee (display px), and max lateral
// spread. A clean overlap joint has ~0 escaped pixels through the whole range.
//
//   node tools/debug/lou_thigh_protrusion_sweep.mjs [thesz|george]
//
// Convention-independent: uses only world points + the same opaque-pixel probe
// knee_ink_gap_sweep uses, so it does not depend on any local pivot math.

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';

const CHAR = process.argv[2] || 'thesz';

// Acceptance: a small anti-alias fringe on the shin edge is tolerable, a flap
// is not. Reach past the knee must stay tiny and the escaped-pixel count low.
// PASS is judged on what the game ACTUALLY renders: the gait (walk) cycle and
// every named gameplay pose in POSES (each with its real folded shin/crouch).
// The synthetic straight-shin FK sweep (-1.5..1.5) is ALSO reported, but it is
// a worst-case stress probe that includes leg angles the game never reaches
// (backward past ~-0.52) with an unnaturally straight shin, so it does not gate
// PASS -- see the residual note in thesz.js's thigh comment.
// Threshold anchored on measured references: the ORIGINAL long-tail thigh (the
// defect this diagnostic was written for) escaped 14.6px past the knee in
// gameplay; George (the shipped/accepted rig) sits at 2.8px; the trimmed thigh
// lands ~4.9px. thesz can't quite reach George's number because its PAINTED knee
// is slightly wider than the shin AND sits ~12px below the bone knee (a
// structural rig trait, not tail slack — fixing it fully needs the shin-side
// distalAnchorFrac re-derivation thesz.js deliberately rejects). 6px cleanly
// separates "trimmed" from "flap": it passes the fix + George and fails the
// original defect or any regression back toward it.
const MAX_REACH = 6.0;   // display px a tail pixel may poke past the knee
const MAX_COUNT = 120;   // escaped opaque thigh pixels allowed in any one frame
const POSE_NAMES = Object.keys(POSES);

process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = CHAR === 'george' ? 'thesz' : 'george';
const h = await launch();
await h.page.waitForTimeout(300);

const result = await h.page.evaluate(async ({ POSE_NAMES, POSES }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
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
        texturePixels.set(key, pixels);
        return pixels;
    }
    function opaqueAt(img, wx, wy) {
        if (!img || !img.visible || !img.texture || img.texture.key === 'sk_pixel') return false;
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
        const sx = frame.cutX + px, sy = frame.cutY + py;
        return pixels.data[(sy * pixels.width + sx) * 4 + 3] >= 32;
    }
    // Axis-aligned world bounds of a rotated display box (same inverse
    // transform opaqueAt uses, so it matches the probe exactly).
    function worldAABB(img) {
        const wdt = img.displayWidth, hgt = img.displayHeight;
        const ox = img.originX, oy = img.originY;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const fx of [-ox, 1 - ox]) for (const fy of [-oy, 1 - oy]) {
            const lx = fx * wdt, ly = fy * hgt;
            const wx = img.x + c * lx - s * ly;
            const wy = img.y + s * lx + c * ly;
            minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
            minY = Math.min(minY, wy); maxY = Math.max(maxY, wy);
        }
        return { minX, minY, maxX, maxY };
    }

    // Measure escaped thigh-tail pixels for one leg.
    // thigh: the thigh Image; shin/boot: coverers; knee/hip: world points.
    function measure(thigh, coverers, knee, hip) {
        const dirx = knee.x - hip.x, diry = knee.y - hip.y;
        const len = Math.hypot(dirx, diry) || 1;
        const ux = dirx / len, uy = diry / len;         // along-bone (hip->knee)
        const px = -uy, py = ux;                          // lateral
        const b = worldAABB(thigh);
        let count = 0, maxReach = 0, maxLat = 0;
        let cx = 0, cy = 0;
        for (let y = Math.floor(b.minY); y <= Math.ceil(b.maxY); y++) {
            for (let x = Math.floor(b.minX); x <= Math.ceil(b.maxX); x++) {
                if (!opaqueAt(thigh, x + 0.5, y + 0.5)) continue;
                const rel = (x + 0.5 - knee.x) * ux + (y + 0.5 - knee.y) * uy; // distal distance past knee
                if (rel <= 0.5) continue;                 // not past the knee => legitimate thigh body
                let covered = false;
                for (const cimg of coverers) { if (opaqueAt(cimg, x + 0.5, y + 0.5)) { covered = true; break; } }
                if (covered) continue;
                count++;
                if (rel > maxReach) maxReach = rel;
                const lat = Math.abs((x + 0.5 - knee.x) * px + (y + 0.5 - knee.y) * py);
                if (lat > maxLat) maxLat = lat;
                cx += x; cy += y;
            }
        }
        return { count, maxReach, maxLat, cx: count ? cx / count : 0, cy: count ? cy / count : 0 };
    }

    function frame() {
        const sk = w.skeleton;
        const near = measure(sk.nearThigh, [sk.nearShin, sk.nearBoot].filter(Boolean), sk.nearKneeDebug, { x: sk.nearThigh.x, y: sk.nearThigh.y });
        const far = measure(sk.farThigh, [sk.farShin, sk.farBoot].filter(Boolean), sk.farKneeDebug, { x: sk.farThigh.x, y: sk.farThigh.y });
        return { near, far };
    }

    const rows = [];
    const neutral = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
    for (const facing of [1, -1]) {
        w.facing = facing;
        // ── Gait / walk cycle (real knee flexion) ─────────────────────────
        w.state = 'standing';
        w.pose = { ...neutral };
        w.vx = facing * 120; w.vy = 0;
        w.moveBlend = 1;
        for (let i = 0; i < 32; i++) {
            const phase = (i / 32) * Math.PI * 2;
            w.walkPhase = phase;
            w.draw();
            const f = frame();
            rows.push({ mode: 'gait', facing, key: phase.toFixed(2), ...f });
        }
        // ── Real gameplay poses (each with its own folded shin / crouch) ──
        w.vx = 0; w.moveBlend = 0; w.walkPhase = 0;
        for (const name of POSE_NAMES) {
            w.pose = { ...neutral, ...POSES[name] };
            w.draw();
            const f = frame();
            rows.push({ mode: 'pose', facing, key: name, ...f });
        }
        // ── Synthetic straight-shin FK stress sweep (informational) ───────
        for (let a = -1.5; a <= 1.5001; a += 0.15) {
            const av = Math.round(a * 100) / 100;
            w.pose = { ...neutral, lLeg: av, rLeg: -av };
            w.draw();
            const f = frame();
            rows.push({ mode: 'fk', facing, key: av.toFixed(2), ...f });
        }
    }
    return rows;
}, { POSE_NAMES, POSES });

await h.close();

const cat = {}; // per mode+side worst reach
// Gating categories = what the game actually renders (gait + named poses).
const GATING = new Set(['gait', 'pose']);
let gateCount = 0, gateReach = 0, gateWorst = null;
for (const r of result) {
    for (const side of ['near', 'far']) {
        const m = r[side];
        const k = `${r.mode}-${side}`;
        if (!cat[k] || m.maxReach > cat[k].reach) cat[k] = { reach: m.maxReach, count: m.count, key: r.key, facing: r.facing };
        if (GATING.has(r.mode)) {
            if (m.count > gateCount) gateCount = m.count;
            if (m.maxReach > gateReach) gateReach = m.maxReach;
            if (m.count > 0 && (!gateWorst || m.maxReach > gateWorst.m.maxReach)) gateWorst = { side, ...r, m };
        }
    }
}

console.log(`Character: ${CHAR}   samples: ${result.length}`);
console.log(`per-category worst reach past knee (display px):`);
for (const k of Object.keys(cat).sort())
    console.log(`  ${k.padEnd(10)} ${cat[k].reach.toFixed(2)}px (count ${cat[k].count}) @facing ${cat[k].facing} ${cat[k].key}`);
console.log(`\nGAMEPLAY (gait + named poses): max reach ${gateReach.toFixed(2)}px, max escaped ${gateCount}px`);
if (gateWorst) console.log(`  worst gameplay frame: ${gateWorst.mode} "${gateWorst.key}" facing ${gateWorst.facing} ${gateWorst.side} leg -> reach ${gateWorst.m.maxReach.toFixed(2)}px`);
console.log(`(fk-* rows are a straight-shin stress sweep incl. unreachable angles — reported, not gated.)`);

const pass = gateCount <= MAX_COUNT && gateReach <= MAX_REACH;
console.log(pass
    ? `\nPASS -- no thigh tail escapes the shin in gameplay (<= ${MAX_COUNT}px & <= ${MAX_REACH}px reach).`
    : `\nFAIL -- thigh tail protrudes past the shin in gameplay (limit ${MAX_COUNT}px count / ${MAX_REACH}px reach).`);
process.exit(pass ? 0 : 1);
