// Phase A comparison deliverable for CLAUDE_GEORGE_V9_BROADCAST_PASS.md.
//
// Captures shipped George, unchanged george-ai-pilot-v8, and the new
// downsample-only george-ai-pilot-v9-broadcast under identical positions/
// poses/facings in the REAL Arena scene (not the rig-tuner harness — the
// scanlines overlay this diagnostic exists to test only lives in Arena, via
// createScanlines()). Scanlines are hidden per-capture by finding the
// display object whose texture key is 'scanlines' and toggling setVisible —
// Arena.createScanlines() itself is untouched, and no production query flag
// is added, per the brief's explicit instruction.
//
//   node tools/debug/george_v9_broadcast_comparison.mjs
//
// Writes tools/debug/shots/george-v9-broadcast/<condition>__<char>[__scanlines-on|__crop4x].png
// plus an index.json manifest and a static index.html grid for easy review.

import { launch } from './harness.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('./shots/george-v9-broadcast', import.meta.url));
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHAR_IDS = {
    shipped: 'george',
    v8: 'george-ai-pilot-v8',
    v9: 'george-ai-pilot-v9-broadcast',
};

// RING.nearLeft.y / farLeft.y from src/constants.js.
const DEPTHS = { near: 445, far: 258 };

const POSES = {
    idle: null, // idle = wrestler's own default pose (moveBlend 0)
    gaitPassing: { moveBlend: 1, walkPhase: Math.PI / 2 },
    overhead: { pose: { lLeg: 0, rLeg: 0, lArm: Math.PI, rArm: Math.PI, lean: 0, crouch: 0 } },
    deepElbowKnee: { pose: { lLeg: 1.72, rLeg: -0.3, lArm: -2.6, rArm: -2.6, lean: 0.1, crouch: 0.3 } },
};

// Full pose x depth x facing sweep, captured scanlines-HIDDEN at actual
// gameplay scale (no camera zoom) — this alone answers "does v9 read better
// than v8 across the game's real pose/depth/facing range."
const FULL_SWEEP = [];
for (const poseTag of Object.keys(POSES)) {
    for (const depthTag of Object.keys(DEPTHS)) {
        for (const facing of [1, -1]) {
            FULL_SWEEP.push({ poseTag, depthTag, facing });
        }
    }
}

// Focused scanlines-on/off + enlarged-crop subset: near depth only (the
// largest, most scanline-exposed case — scanline density is constant in
// screen space, so it bites hardest on the largest-rendered art), idle +
// overhead poses, facing 1 only. This is the specific "fine strokes vs.
// scanline overlay" question the brief exists to answer, not a general
// re-verification of the whole pose range (that's FULL_SWEEP's job).
const SCANLINE_SUBSET = [
    { poseTag: 'idle', depthTag: 'near', facing: 1 },
    { poseTag: 'overhead', depthTag: 'near', facing: 1 },
];

const CROP = { w: 260, h: 340 }; // page px around the wrestler, generous enough for any sampled pose

process.env.WFM_P1 = 'george';
process.env.WFM_P2 = 'george';
const h = await launch();
await h.page.waitForTimeout(300);

async function setCondition(page, charTag, condition, scanlinesVisible) {
    return page.evaluate(({ charId, condition, scanlinesVisible }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        // Swap w1's texture-bearing skeleton in place rather than reloading
        // the page per character — Arena only ever constructs two fixed
        // wrestlers from ?p1=/?p2= at boot, so this directly reconstructs
        // w1's Skeleton against the requested character's already-preloaded
        // textures (CHARACTERS in Arena.js preloads all pilot candidates +
        // shipped george unconditionally, so every key used here is already
        // in the texture cache).
        const CHAR_TEXTURES = window.__WFM_CHAR_TEXTURES;
        const w = sc.w1;
        const textures = CHAR_TEXTURES[charId];
        w.skeleton.destroy();
        w.skeleton = new (Object.getPrototypeOf(w.skeleton).constructor)(sc, w.skinCol, w.trunksCol, textures);

        const scanlines = sc.children.list.find(o => o.texture?.key === 'scanlines');
        if (scanlines) scanlines.setVisible(scanlinesVisible);

        w.state = 'standing';
        w.vx = 0; w.vy = 0;
        w.x = 480;
        w.y = condition.y;
        w.facing = condition.facing;
        // idle/gait conditions must use a REAL idle pose, not whatever
        // custom w.pose a previous 'overhead'/'deepElbowKnee' condition left
        // behind (w.pose persists across draw() calls; only the explicit
        // custom-pose branch below ever reassigns it) — captured once,
        // before this script's first mutation, in window.__WFM_IDLE_POSE.
        if (!condition.poseMod) {
            w.moveBlend = 0; w.walkPhase = 0; w.pose = { ...window.__WFM_IDLE_POSE };
        } else if (condition.poseMod.pose) {
            w.moveBlend = 0; w.pose = condition.poseMod.pose;
        } else {
            w.moveBlend = condition.poseMod.moveBlend; w.walkPhase = condition.poseMod.walkPhase;
            w.pose = { ...window.__WFM_IDLE_POSE }; // gait blends the idle pose with the walk cycle, not a leftover custom pose
        }
        w.draw();
        return { x: w.x, y: w.y };
    }, { charId: CHAR_IDS[charTag], condition, scanlinesVisible });
}

async function shoot(page, center, path) {
    const clip = {
        x: Math.max(0, center.x - CROP.w / 2),
        y: Math.max(0, center.y - CROP.h * 0.75),
        width: CROP.w,
        height: CROP.h,
    };
    await page.screenshot({ path, clip });
}

async function shootEnlarged(page, srcPath, destPath, factor = 4) {
    const b64 = fs.readFileSync(srcPath).toString('base64');
    const dataUrl = await page.evaluate(async ({ b64, factor }) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth * factor; c.height = img.naturalHeight * factor;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false; // nearest-neighbor, for honest pixel inspection
        ctx.drawImage(img, 0, 0, c.width, c.height);
        ctx.fillStyle = '#0f0';
        ctx.font = '16px monospace';
        ctx.fillText(`${factor}x NEAREST-NEIGHBOR ENLARGEMENT — not gameplay scale`, 6, 20);
        return c.toDataURL('image/png');
    }, { b64, factor });
    fs.writeFileSync(destPath, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}

// Capture a real idle pose ONCE, before any mutation below, so 'idle' and
// 'gait' conditions can always restore it explicitly rather than trusting
// whatever custom w.pose a previous condition left behind.
await h.page.evaluate(() => {
    window.__WFM_IDLE_POSE = { ...window.__WFM_GAME.scene.scenes[0].w1.pose };
});

// Expose Arena's per-character texture tables to the page once, keyed by
// char.id — read directly off the already-imported CHARACTERS list so this
// script can never drift from whatever Arena.js actually preloaded.
await h.page.addScriptTag({
    content: `
        import('/src/characters/george.js').then(async (george) => {
            const [{ georgeAiPilotV8 }, { georgeAiPilotV9Broadcast }] = await Promise.all([
                import('/src/characters/george_ai_pilot_v8.js'),
                import('/src/characters/george_ai_pilot_v9_broadcast.js'),
            ]);
            window.__WFM_CHAR_TEXTURES = {
                george: george.george.textures,
                'george-ai-pilot-v8': georgeAiPilotV8.textures,
                'george-ai-pilot-v9-broadcast': georgeAiPilotV9Broadcast.textures,
            };
        });
    `,
    type: 'module',
});
await h.page.waitForFunction(() => window.__WFM_CHAR_TEXTURES, null, { timeout: 10000 });

const manifest = [];

// Full sweep: scanlines hidden, actual gameplay scale.
for (const cond of FULL_SWEEP) {
    const condition = { y: DEPTHS[cond.depthTag], facing: cond.facing, poseMod: POSES[cond.poseTag] };
    const tag = `${cond.poseTag}__${cond.depthTag}__f${cond.facing}`;
    const row = { tag, poseTag: cond.poseTag, depthTag: cond.depthTag, facing: cond.facing, scanlines: false, files: {} };
    for (const charTag of Object.keys(CHAR_IDS)) {
        const center = await setCondition(h.page, charTag, condition, false);
        const outPath = `${OUT_DIR}/${tag}__${charTag}.png`;
        await shoot(h.page, center, outPath);
        row.files[charTag] = outPath.split('/').pop();
    }
    manifest.push(row);
    console.log(`sweep: ${tag}`);
}

// Focused subset: scanlines on AND off, plus a 4x nearest-neighbor crop of
// the scanlines-off shot for close inspection.
for (const cond of SCANLINE_SUBSET) {
    for (const scanlinesOn of [true, false]) {
        const condition = { y: DEPTHS[cond.depthTag], facing: cond.facing, poseMod: POSES[cond.poseTag] };
        const tag = `${cond.poseTag}__${cond.depthTag}__f${cond.facing}__scanlines-${scanlinesOn ? 'on' : 'off'}`;
        const row = { tag, poseTag: cond.poseTag, depthTag: cond.depthTag, facing: cond.facing, scanlines: scanlinesOn, files: {}, crops: {} };
        for (const charTag of Object.keys(CHAR_IDS)) {
            const center = await setCondition(h.page, charTag, condition, scanlinesOn);
            const outPath = `${OUT_DIR}/${tag}__${charTag}.png`;
            await shoot(h.page, center, outPath);
            row.files[charTag] = outPath.split('/').pop();
            if (!scanlinesOn) {
                const cropPath = `${OUT_DIR}/${tag}__${charTag}__crop4x.png`;
                await shootEnlarged(h.page, outPath, cropPath);
                row.crops[charTag] = cropPath.split('/').pop();
            }
        }
        manifest.push(row);
        console.log(`scanline-subset: ${tag}`);
    }
}

await h.close();
delete process.env.WFM_P1;
delete process.env.WFM_P2;

fs.writeFileSync(`${OUT_DIR}/index.json`, JSON.stringify(manifest, null, 2));

const html = `<!doctype html><html><head><meta charset="utf-8"><title>George v9 broadcast comparison</title>
<style>
body{font-family:monospace;background:#111;color:#eee;padding:16px}
.row{margin-bottom:28px;border-top:1px solid #444;padding-top:8px}
.cols{display:flex;gap:8px;flex-wrap:wrap}
.col{text-align:center}
.col img{max-width:260px;background:#222;border:1px solid #333}
h3{margin:4px 0}
</style></head><body>
<h1>George v9 broadcast-downsample comparison (shipped | v8 | v9)</h1>
${manifest.map(row => `
<div class="row">
  <h3>${row.tag}${row.scanlines !== undefined ? ` — scanlines ${row.scanlines ? 'ON' : 'off'}` : ''}</h3>
  <div class="cols">
    ${Object.entries(row.files).map(([tag, file]) => `<div class="col"><div>${tag}</div><img src="${file}"></div>`).join('')}
  </div>
  ${row.crops ? `<div class="cols">${Object.entries(row.crops).map(([tag, file]) => `<div class="col"><div>${tag} (4x crop)</div><img src="${file}"></div>`).join('')}</div>` : ''}
</div>`).join('')}
</body></html>`;
fs.writeFileSync(`${OUT_DIR}/index.html`, html);

console.log(`\nWrote ${manifest.length} conditions to ${OUT_DIR}/index.html`);
