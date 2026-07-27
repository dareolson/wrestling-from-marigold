// WFM Rig Tuner — dev-only visual editor for the skeleton rig's tuning
// values. Imports the REAL game modules (Skeleton.js, Wrestler.js POSES,
// character configs) — no reimplementation — and mutates the exported
// P/TEX/RIG seam plus per-character config/instance knobs live, then emits
// paste-ready JS grouped by target file. Never writes source files itself.
//
// Scope cap (AI_HANDOFF 2026-07-14): constants tuner + pose previewer ONLY.
// No animation timeline, no keyframing, no clip authoring.

import Skeleton, { P, TEX, RIG } from '/src/Skeleton.js';
import { POSES } from '/src/Wrestler.js';
import { george } from '/src/characters/george.js';
import { thesz } from '/src/characters/thesz.js';

// ─── Characters ──────────────────────────────────────────────────────────────
const placeholder = {
    // idlePose matches Arena's brawler preset — the runtime placeholder kit.
    id: 'placeholder', skinCol: 0xffe4c4, trunksCol: 0x3355aa, textures: {}, idlePose: 'brawlerIdle',
};
const CHARS = { george, thesz, placeholder };
// Roster is now just george/thesz (2026-07-26, promoted-george roster
// change) -- both ids match their src/characters/ filename base exactly, so
// no filename override table is needed anymore. The former george-ai-pilot-v8
// -specific entry (which needed one, since its id used hyphens but its file
// used underscores) is vaulted along with the rest of the pilot family; see
// _vault/characters/.
const charFilename = id => id;
// pelvisOverlay/nearShin/farShin/nearForearm/farForearm (george, since the
// 2026-07-26 promoted-george roster change): same filenames Arena.js's own
// PART_FILES map uses for these opt-in parts.
const PART_FILES = {
    head: 'head.png', torso: 'torso.png', pelvisOverlay: 'pelvis_overlay.png',
    upperArm: 'upper_arm.png', forearm: 'forearm.png', thigh: 'thigh.png', shin: 'shin.png',
    nearShin: 'near_shin.png', farShin: 'far_shin.png',
    nearForearm: 'near_forearm.png', farForearm: 'far_forearm.png',
};
const BOX_PARTS = ['torso', 'upperArm', 'forearm', 'thigh', 'shin', 'pelvisOverlay', 'nearForearm', 'farForearm', 'nearShin', 'farShin'];
// torso/pelvisOverlay each get their own slider row below, but on george
// they're the SAME box object in george.js (a Codex-flagged 2026-07-26
// registration bug from the george-ai-pilot-v8 lineage: two independent { w, h }
// literals drifted apart, 78 vs 80, producing a doubled/drifting trunks
// outline). Dragging either slider here moves both live, by construction.
// If a future export is pasted back into the character file, keep them as
// one shared object (not two literals with matching numbers) — copy-pasting
// two separate box literals reopens the same drift risk the next time only
// one of them gets tuned.
// Which canvas edge's ink-center "measure from art" reads for each part's
// pivotOffsetFrac (2026-07-15) — whichever edge is the one that visually
// reads as a joint (see Skeleton.js _placePart's comment): the thigh/upperArm
// show their joint at the bottom edge (knee/elbow), shin/forearm/torso at the
// top edge (knee/elbow/neck). Same convention tools/debug/knee_pivot_audit.mjs
// already uses for thigh (bottom) and shin (top). nearForearm/farForearm and
// nearShin/farShin (george's split near/far bitmaps) follow the
// same generic forearm/shin convention; pelvisOverlay is placed exactly like
// torso (same box/origin, see Skeleton.js) so it follows torso's edge too.
const PIVOT_EDGE = {
    torso: 'top', upperArm: 'bottom', forearm: 'top', thigh: 'bottom', shin: 'top',
    pelvisOverlay: 'top', nearForearm: 'top', farForearm: 'top', nearShin: 'top', farShin: 'top',
};
// Skeleton instance image(s) each config part's pivotOffsetFrac must be
// pushed into live (near+far share one config value but are separate Images
// — see Skeleton.js constructor).
const PIVOT_PART_IMAGES = {
    torso: ['torso'], upperArm: ['nearUpArm', 'farUpArm'], forearm: ['nearForearm', 'farForearm'],
    thigh: ['nearThigh', 'farThigh'], shin: ['nearShin', 'farShin'],
    pelvisOverlay: ['pelvisOverlay'], nearForearm: ['nearForearm'], farForearm: ['farForearm'],
    nearShin: ['nearShin'], farShin: ['farShin'],
};

// ─── Baselines (captured before any edit — export emits diffs only) ─────────
const deep = o => JSON.parse(JSON.stringify(o));
const P0 = deep(P), TEX0 = deep(TEX), RIG0 = deep(RIG), POSES0 = deep(POSES);
const CHAR0 = { george: deep(george.textures), thesz: deep(thesz.textures) };

// ─── Per-character knob schema ───────────────────────────────────────────────
// field: Skeleton instance field (read every frame → live).
// def: effective value when the config key is absent.
// angle: UI/config in degrees ↔ radians internally, exported as `deg * Math.PI / 180`.
const CHAR_KNOBS = [
    // Not a Skeleton field (Wrestler.js folds it into draw()'s local `s`
    // before Skeleton ever sees it — see renderScale() above) — `field` is
    // still set for setCharKnob's uniform read/write-back-to-config path;
    // nothing reads skeleton._heightScale, it's inert on that object.
    { key: 'heightScale',     field: '_heightScale',     def: () => 1,   min: 0.5, max: 1.3, step: 0.005 },
    { key: 'headScale',       field: '_headScale',       def: () => 1,   min: 0.3, max: 2,   step: 0.005, headOnly: true },
    { key: 'headOffsetX',     field: '_headOffsetX',     def: () => 0,   min: -60, max: 60,  step: 1, headOnly: true },
    { key: 'headOffsetY',     field: '_headOffsetY',     def: () => 0,   min: -60, max: 60,  step: 1, headOnly: true },
    { key: 'armOffsetX',      field: '_armOffsetX',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'armOffsetY',      field: '_armOffsetY',      def: () => 0,   min: -60, max: 60,  step: 1 },
    // Near/far arm parity with the leg knobs below (2026-07-15).
    { key: 'nearArmTilt',       field: '_nearArmTilt',       def: () => 0,    min: -60, max: 60, step: 0.5, angle: true },
    { key: 'farArmOffsetX',     field: '_farArmOffsetX',     def: () => 0,    min: -60, max: 60, step: 1 },
    { key: 'farArmOffsetY',     field: '_farArmOffsetY',     def: () => 0,    min: -60, max: 60, step: 1 },
    { key: 'farArmTilt',        field: '_farArmTilt',        def: () => null, min: -60, max: 60, step: 0.5, angle: true, nullable: true },
    { key: 'nearForearmOffsetX', field: '_nearForearmOffsetX', def: () => 0,  min: -60, max: 60, step: 1 },
    { key: 'nearForearmOffsetY', field: '_nearForearmOffsetY', def: () => 0,  min: -60, max: 60, step: 1 },
    { key: 'farForearmOffsetX',  field: '_farForearmOffsetX',  def: () => 0,  min: -60, max: 60, step: 1 },
    { key: 'farForearmOffsetY',  field: '_farForearmOffsetY',  def: () => 0,  min: -60, max: 60, step: 1 },
    { key: 'legOffsetX',      field: '_legOffsetX',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'legOffsetY',      field: '_legOffsetY',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearLegOffsetY',  field: '_nearLegOffsetY',  def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearLegTilt',     field: '_nearLegTilt',     def: () => 0,   min: -60, max: 60,  step: 0.5, angle: true },
    { key: 'nearShinOffsetX', field: '_nearShinOffsetX', def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearShinOffsetY', field: '_nearShinOffsetY', def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearShinTilt',    field: '_nearShinTilt',    def: () => 0,   min: -60, max: 60,  step: 0.5, angle: true },
    { key: 'nearShinScale',   field: '_nearShinScale',   def: () => RIG.NEAR_SHIN_SCALE, min: 0.5, max: 1.6, step: 0.01 },
    { key: 'farShinScale',    field: '_farShinScale',    def: () => RIG.FAR_SHIN_SCALE,  min: 0.5, max: 1.6, step: 0.01 },
    { key: 'farThighScale',   field: '_farThighScale',   def: () => RIG.FAR_THIGH_SCALE, min: 0.5, max: 1.6, step: 0.01 },
    { key: 'farLegOffsetX',   field: '_farLegOffsetX',   def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'farLegOffsetY',   field: '_farLegOffsetY',   def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'farLegTilt',      field: '_farLegTilt',      def: () => null, min: -60, max: 60, step: 0.5, angle: true, nullable: true },
    { key: 'farShinOffsetX',  field: '_farShinOffsetX',  def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'farShinOffsetY',  field: '_farShinOffsetY',  def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'thighH',          field: '_thighH',          def: () => P.thighH, min: 20, max: 120, step: 1 },
    { key: 'shinH',           field: '_shinH',           def: () => P.shinH,  min: 20, max: 120, step: 1 },
];

// Pose channel groups: the original 6 always have a value (default 0/undefined
// treated as 0); the 4 elbow/knee overrides (2026-07-15) are nullable —
// undefined means "use Skeleton.js's derived angle", same convention as the
// farLegTilt character knob above.
const POSE_ABS_CH = ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch'];
const POSE_NULLABLE_CH = ['lForearm', 'rForearm', 'lShin', 'rShin'];

// ─── Live state ──────────────────────────────────────────────────────────────
const state = {
    charId: 'george',
    // Preview the pose the game actually rests in for this character (Codex
    // parity review, 2026-07-14) — tuning against generic `idle` hid a knee
    // regression because the game never shows thesz in it.
    poseName: CHARS.george.idlePose ?? 'idle',
    facing: 1,
    zoom: 1.5,
    walkPhase: 0,
    animateWalk: false,
    moveBlend: 0,
    combatBlend: 0,
    runBlend: 0,
    // Game parity: Wrestler.js passes liftScale 0.5 except while running
    // (1.0) — the tool previously hardcoded 1 (Codex parity review).
    liftScale: 0.5,
    showHandles: true,
    ref: { alpha: 0.5, scale: 1, front: true },
};
let scene = null;
let skeleton = null;
let handles = [];
let refImage = null;
let draggingHandle = false;

const currentChar = () => CHARS[state.charId];
const currentPose = () => POSES[state.poseName] ?? POSES.idle;
// Wrestler.js's draw() folds textures.heightScale into its local `s` before
// ever reaching Skeleton — this tool constructs Skeleton directly and must
// mirror that fold (2026-07-19) or it stops being WYSIWYG for any character
// that sets heightScale (see george.js/thesz.js). Read live off the char
// config, same as every other texture knob, so tuner edits apply immediately.
const renderScale = () => state.zoom * (currentChar().textures.heightScale ?? 1);

// ─── Value plumbing ──────────────────────────────────────────────────────────
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Write a per-character knob: config object (survives skeleton rebuilds,
// feeds export) + live Skeleton instance field. `v` is in config units
// (degrees for angle knobs), or null for nullable knobs.
function setCharKnob(key, v) {
    const spec = CHAR_KNOBS.find(k => k.key === key);
    const cfg = currentChar().textures;
    const base = (CHAR0[state.charId] ?? {})[key];
    if (v === null && spec.nullable) {
        delete cfg[key];
        if (skeleton) skeleton[spec.field] = null;
        return;
    }
    const stored = spec.angle ? v * Math.PI / 180 : v;
    // Setting a knob back to its unset default when it was never in the
    // config: drop the key instead of pinning the default into the file.
    if (base === undefined && !spec.nullable && near(stored, spec.angle ? spec.def() : spec.def())) {
        delete cfg[key];
    } else {
        cfg[key] = stored;
    }
    if (skeleton) skeleton[spec.field] = stored;
}

function getCharKnob(key) {
    const spec = CHAR_KNOBS.find(k => k.key === key);
    const raw = currentChar().textures[key];
    const eff = raw !== undefined ? raw : spec.def();
    if (eff === null) return null;
    return spec.angle ? eff * 180 / Math.PI : eff;
}

// pivotOffsetFrac (2026-07-15): a scalar on the object-form texture entry
// (see Skeleton.js's resolveTexEntry/_placePart), not a live Skeleton
// instance field like the other knobs — box.w/h work today by mutating the
// same object _texDims already points at, but pivotOffsetFrac is a plain
// number, copied by value at construction, so it has to be pushed into each
// relevant Image explicitly (near+far share one config value on two Images).
function getPivotOffsetFrac(part) {
    return currentChar().textures[part]?.pivotOffsetFrac ?? 0;
}
function setPivotOffsetFrac(part, v) {
    const entry = currentChar().textures[part];
    if (!entry || typeof entry !== 'object') return;
    if (near(v, 0)) delete entry.pivotOffsetFrac; else entry.pivotOffsetFrac = v;
    if (skeleton) for (const imgKey of PIVOT_PART_IMAGES[part]) skeleton[imgKey]._pivotOffsetFrac = v;
}

// Ports tools/debug/knee_pivot_audit.mjs's ink-bounding-box scan into the
// browser, reading the already-loaded Phaser texture instead of re-fetching
// the PNG — same threshold/averaging, so results match that script exactly.
// edge: 'top' | 'bottom' — which canvas edge's ink x-center to measure
// (see PIVOT_EDGE). Returns a signed fraction of canvas width, unflipped-
// source convention (+ = toward facing), same as pivotOffsetFrac itself.
function measureArtPivotFrac(key, edge) {
    const src = scene.textures.get(key).getSourceImage();
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    const T = 10;
    const rowXCenter = y => {
        let mn = -1, mx = -1;
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > T) { if (mn === -1) mn = x; mx = x; }
        }
        return mn === -1 ? null : (mn + mx) / 2;
    };
    let minY = -1, maxY = -1;
    for (let y = 0; y < height; y++) { if (rowXCenter(y) !== null) { if (minY === -1) minY = y; maxY = y; } }
    if (minY === -1) return 0;
    const avg = (y0, y1) => {
        const vals = [];
        for (let y = y0; y <= y1; y++) { const v = rowXCenter(y); if (v !== null) vals.push(v); }
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const edgeXCenter = edge === 'top' ? avg(minY, minY + 2) : avg(maxY - 2, maxY);
    return (edgeXCenter - width / 2) / width;
}

// Global P/RIG edits that constructor-captured instance fields must follow
// (only when the character doesn't override them).
function syncCapturedGlobals() {
    if (!skeleton) return;
    const cfg = currentChar().textures;
    if (cfg.thighH === undefined) skeleton._thighH = P.thighH;
    if (cfg.shinH === undefined) skeleton._shinH = P.shinH;
    if (cfg.nearShinScale === undefined) skeleton._nearShinScale = RIG.NEAR_SHIN_SCALE;
    if (cfg.farShinScale === undefined) skeleton._farShinScale = RIG.FAR_SHIN_SCALE;
    if (cfg.farThighScale === undefined) skeleton._farThighScale = RIG.FAR_THIGH_SCALE;
}

// Per-character display-box override (object-form entries only — string-form
// parts follow the global TEX panel instead).
function charBoxEntries() {
    const cfg = currentChar().textures;
    return BOX_PARTS.filter(p => cfg[p] && typeof cfg[p] === 'object' && cfg[p].box);
}

function rebuildSkeleton() {
    if (skeleton) skeleton.destroy();
    const c = currentChar();
    skeleton = new Skeleton(scene, c.skinCol, c.trunksCol, c.textures);
    skeleton.setDepth(10);
    buildHandles();
}

// ─── Phaser scene ────────────────────────────────────────────────────────────
const GROUND_Y = 470, CX = 480;

function preload() {
    for (const char of [george, thesz]) {
        for (const part of Object.keys(PART_FILES)) {
            const entry = char.textures[part];
            if (!entry) continue;
            const key = typeof entry === 'string' ? entry : entry.key;
            this.load.image(key, `/src/assets/wrestlers/${char.id}/${PART_FILES[part]}`);
        }
    }
}

function create() {
    scene = this;
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, 0x3a3a46, 1);
    g.lineBetween(0, GROUND_Y, 960, GROUND_Y);        // mat line
    g.lineStyle(1, 0x26262e, 1);
    g.lineBetween(CX, 40, CX, 580);                    // center guide
    rebuildSkeleton();
    buildPanel();
    window.__RIG_TOOL = {
        scene: () => scene,
        skeleton: () => skeleton,
        state,
        P, TEX, RIG, POSES, CHARS,
        setCharKnob, setRig, setP, setPose, exportText,
        setCharacter, setPoseName,
        getPivotOffsetFrac, setPivotOffsetFrac, measureArtPivotFrac,
    };
}

function update(_, dtMs) {
    if (!skeleton) return;
    if (state.animateWalk) {
        state.walkPhase = (state.walkPhase + dtMs / 1000 * 7) % (Math.PI * 2);
        ui.walkPhase?.refresh();
    }
    const pose = currentPose();
    const lean = state.facing * (0.07 * state.moveBlend + (pose.lean ?? 0));
    skeleton.updateUpright(
        CX, GROUND_Y, renderScale(), state.facing, pose, state.walkPhase,
        state.combatBlend, lean, state.moveBlend, state.liftScale, state.runBlend
    );
    for (const h of handles) {
        const part = h.spec.part(skeleton);
        const on = state.showHandles && !!part;
        h.circle.setVisible(on);
        if (on && !h.dragging) h.circle.setPosition(part.x, part.y);
    }
}

// ─── Drag handles ────────────────────────────────────────────────────────────
const HANDLE_SPECS = [
    { name: 'head (headOffset)',       color: 0xffd24a, kx: 'headOffsetX',     ky: 'headOffsetY',     part: sk => sk._headIsImage && sk._neckInTorso ? sk.head : null },
    { name: 'shoulder (armOffset)',    color: 0x66ccff, kx: 'armOffsetX',      ky: 'armOffsetY',      part: sk => sk.nearUpArm },
    { name: 'far shoulder (farArmOffset)', color: 0x2e6b8b, kx: 'farArmOffsetX', ky: 'farArmOffsetY', part: sk => sk.farUpArm },
    { name: 'near forearm (nearForearmOffset)', color: 0xa8e0ff, kx: 'nearForearmOffsetX', ky: 'nearForearmOffsetY', part: sk => sk.nearForearm },
    { name: 'far forearm (farForearmOffset)', color: 0x4a8cae, kx: 'farForearmOffsetX', ky: 'farForearmOffsetY', part: sk => sk.farForearm },
    { name: 'near thigh (legOffsetX / nearLegOffsetY)', color: 0x8ef58e, kx: 'legOffsetX', ky: 'nearLegOffsetY', part: sk => sk.nearThigh },
    { name: 'far thigh (farLegOffset)', color: 0x2e8b57, kx: 'farLegOffsetX',  ky: 'farLegOffsetY',   part: sk => sk.farThigh },
    { name: 'near shin (nearShinOffset)', color: 0xff8ec8, kx: 'nearShinOffsetX', ky: 'nearShinOffsetY', part: sk => sk.nearShin },
    { name: 'far shin (farShinOffset)', color: 0xc85c8e, kx: 'farShinOffsetX', ky: 'farShinOffsetY',  part: sk => sk.farShin },
];

function buildHandles() {
    for (const h of handles) h.circle.destroy();
    handles = [];
    for (const spec of HANDLE_SPECS) {
        const c = scene.add.circle(0, 0, 7, spec.color, 0.85)
            .setStrokeStyle(1.5, 0xffffff, 0.9).setDepth(50)
            .setInteractive({ draggable: true, useHandCursor: true });
        const h = { spec, circle: c, dragging: false, sx: 0, sy: 0, vx0: 0, vy0: 0 };
        c.on('dragstart', p => {
            h.dragging = draggingHandle = true;
            h.sx = p.x; h.sy = p.y;
            h.vx0 = getCharKnob(spec.kx) ?? 0;
            h.vy0 = getCharKnob(spec.ky) ?? 0;
        });
        c.on('drag', p => {
            const s = renderScale();
            setCharKnob(spec.kx, Math.round(h.vx0 + state.facing * (p.x - h.sx) / s));
            setCharKnob(spec.ky, Math.round(h.vy0 + (p.y - h.sy) / s));
            c.setPosition(p.x, p.y);
            refreshCharRows();
        });
        c.on('dragend', () => { h.dragging = draggingHandle = false; renderExport(); });
        handles.push(h);
    }
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────
const controls = document.getElementById('controls');
const ui = {};          // named refreshable rows
let charRowRefreshers = [];
let poseRowRefreshers = [];

function group(title, open = false) {
    const d = document.createElement('details');
    d.open = open;
    d.innerHTML = `<summary>${title}</summary><div class="body"></div>`;
    controls.appendChild(d);
    return d.querySelector('.body');
}

function el(parent, html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const node = div.firstElementChild;
    parent.appendChild(node);
    return node;
}

// Slider + number pair bound to get/set (UI units). Returns { refresh }.
function sliderRow(parent, label, get, set, min, max, step, onDone) {
    const row = el(parent, `<div class="row"><label title="${label}">${label}</label>
        <input type="range" min="${min}" max="${max}" step="${step}">
        <input type="number" min="${min}" max="${max}" step="${step}"></div>`);
    const [range, num] = row.querySelectorAll('input');
    const refresh = () => {
        const v = get();
        if (v === null || v === undefined) { range.value = 0; num.value = ''; return; }
        range.value = v; num.value = Math.round(v * 1000) / 1000;
    };
    const handle = v => { set(v); refresh(); renderExport(); onDone?.(); };
    range.addEventListener('input', () => handle(parseFloat(range.value)));
    num.addEventListener('change', () => { const v = parseFloat(num.value); if (!Number.isNaN(v)) handle(v); });
    refresh();
    return { refresh };
}

function selectRow(parent, label, options, get, set) {
    const row = el(parent, `<div class="row"><label>${label}</label><select></select></div>`);
    const sel = row.querySelector('select');
    for (const o of options) sel.add(new Option(o, o));
    sel.value = get();
    sel.addEventListener('change', () => set(sel.value));
    return { refresh: () => { sel.value = get(); } };
}

function checkRow(parent, label, get, set) {
    const row = el(parent, `<div class="row"><label>${label}</label><input type="checkbox"></div>`);
    const cb = row.querySelector('input');
    cb.checked = get();
    cb.addEventListener('change', () => { set(cb.checked); renderExport(); });
    return { refresh: () => { cb.checked = get(); } };
}

function refreshCharRows() { charRowRefreshers.forEach(r => r()); }
function refreshPoseRows() { poseRowRefreshers.forEach(r => r()); }

// ─── Setters used by panels + scripting hook ────────────────────────────────
function setRig(key, v) {
    RIG[key] = key === 'FAR_THIGH_TILT' ? v * Math.PI / 180 : v;
    syncCapturedGlobals();
}
function setP(key, v) { P[key] = v; syncCapturedGlobals(); refreshCharRows(); }
function setPose(name, channel, v) {
    if (!POSES[name]) return;
    if (v === null && POSE_NULLABLE_CH.includes(channel)) {
        delete POSES[name][channel];
        refreshPoseRows();
        return;
    }
    POSES[name][channel] = v;
    refreshPoseRows();
}
function setCharacter(id) {
    state.charId = id;
    rebuildSkeleton();
    buildCharPanel();
    buildSocketsPanel();
    ui.charSel?.refresh();
    // Follow the character's runtime resting pose so tuning happens against
    // what the game actually renders (Codex parity review, 2026-07-14).
    setPoseName(CHARS[id].idlePose ?? 'idle');
    renderExport();
}
function setPoseName(name) {
    state.poseName = name;
    ui.poseSel?.refresh();
    refreshPoseRows();
}

// ─── Panels ──────────────────────────────────────────────────────────────────
let charPanelBody = null;
let socketsPanelBody = null;

function buildPanel() {
    // Preview
    const pv = group('Preview', true);
    ui.charSel = selectRow(pv, 'character', Object.keys(CHARS), () => state.charId, setCharacter);
    ui.poseSel = selectRow(pv, 'pose', Object.keys(POSES), () => state.poseName, setPoseName);
    checkRow(pv, 'face left', () => state.facing < 0, v => { state.facing = v ? -1 : 1; });
    sliderRow(pv, 'zoom (s)', () => state.zoom, v => { state.zoom = v; }, 0.4, 3, 0.05);
    ui.walkPhase = sliderRow(pv, 'walkPhase', () => state.walkPhase, v => { state.walkPhase = v; }, 0, 6.28, 0.01);
    checkRow(pv, 'animate walk', () => state.animateWalk, v => { state.animateWalk = v; });
    sliderRow(pv, 'moveBlend', () => state.moveBlend, v => { state.moveBlend = v; }, 0, 1, 0.01);
    sliderRow(pv, 'combatBlend', () => state.combatBlend, v => { state.combatBlend = v; }, 0, 1, 0.01);
    sliderRow(pv, 'runBlend', () => state.runBlend, v => { state.runBlend = v; }, 0, 1, 0.01);
    sliderRow(pv, 'liftScale', () => state.liftScale, v => { state.liftScale = v; }, 0, 1, 0.05);
    el(pv, `<div class="hint">game liftScale: 0.5 walking, 1.0 running</div>`);
    checkRow(pv, 'drag handles', () => state.showHandles, v => { state.showHandles = v; });
    el(pv, `<div class="legend">${HANDLE_SPECS.map(h =>
        `<span><span class="dot" style="background:#${h.color.toString(16).padStart(6, '0')}"></span>${h.name}</span>`).join('')}</div>`);

    // Pose dials
    const pd = group('Pose dials (POSES values)', true);
    el(pd, `<div class="hint">Edits the selected pose's values live. Sequencing/timeline is out of scope.</div>`);
    for (const ch of POSE_ABS_CH) {
        const lim = ch === 'crouch' ? [0, 1] : ch === 'lean' ? [-1, 1] : [-3.5, 3.5];
        const r = sliderRow(pd, ch,
            () => currentPose()[ch] ?? 0,
            v => setPose(state.poseName, ch, v),
            lim[0], lim[1], 0.01);
        poseRowRefreshers.push(r.refresh);
    }
    el(pd, `<div class="hint">Elbow/knee overrides below (2026-07-15) — independent joint
        rotation. Unchecked = Skeleton.js's derived angle (today's behavior for every
        pose that predates this).</div>`);
    for (const ch of POSE_NULLABLE_CH) {
        const wrap = el(pd, `<div class="row"><label>${ch}</label>
            <input type="checkbox" title="override derived angle"><span class="val">override</span></div>`);
        const cb = wrap.querySelector('input');
        const r = sliderRow(pd, `↳ value`, () => currentPose()[ch] ?? 0,
            v => { if (cb.checked) setPose(state.poseName, ch, v); }, -3.5, 3.5, 0.01);
        const refresh = () => { cb.checked = currentPose()[ch] !== undefined; r.refresh(); };
        cb.checked = currentPose()[ch] !== undefined;
        cb.addEventListener('change', () => {
            setPose(state.poseName, ch, cb.checked ? (currentPose()[ch] ?? 0) : null);
            r.refresh(); renderExport();
        });
        poseRowRefreshers.push(refresh);
    }
    el(pd, `<div class="btnrow"><button class="small" id="poseReset">reset pose to baseline</button></div>`)
        .querySelector('#poseReset').addEventListener('click', () => {
            POSES[state.poseName] = deep(POSES0[state.poseName]);
            refreshPoseRows(); renderExport();
        });

    // rigProfile.sockets — own top-level, open-by-default group (2026-07-26:
    // this used to live at the bottom of the much longer "Character knobs"
    // group below, past ~30 generic offset-knob rows and ~40 per-part box
    // rows — easy to lose while scrolling, and easy to confuse with the
    // similarly-named legOffsetX/farLegOffsetX rows just above it in that
    // list. Pulled out and put first since these are the ONLY controls that
    // actually move the neck/shoulders/hips on any character that supplies
    // rigProfile.sockets (george, thesz) — the generic
    // offset knobs are silently inert wherever the matching socket exists,
    // see buildSocketsPanel's own hint text below.
    socketsPanelBody = group('Character sockets (rigProfile.sockets)', true);
    buildSocketsPanel();

    // Global bones (P)
    const pb = group('Skeleton.js — P (bone lengths / blocks)');
    el(pb, `<div class="hint">thighH/shinH apply to characters without their own override.</div>`);
    for (const key of Object.keys(P)) {
        sliderRow(pb, key, () => P[key], v => setP(key, v), 4, 200, 1);
    }

    // Global TEX
    const tx = group('Skeleton.js — TEX (display boxes)');
    el(tx, `<div class="hint">Parts using string-form texture entries follow these. Object-form
        per-character boxes (shin etc.) are in the character group below.</div>`);
    for (const part of Object.keys(TEX)) {
        sliderRow(tx, `${part}.w`, () => TEX[part].w, v => { TEX[part].w = v; }, 10, 220, 1);
        sliderRow(tx, `${part}.h`, () => TEX[part].h, v => { TEX[part].h = v; }, 10, 220, 1);
    }

    // RIG scalars
    const rg = group('Skeleton.js — RIG (overlap / stagger)');
    for (const key of Object.keys(RIG)) {
        if (key === 'FAR_THIGH_TILT') {
            sliderRow(rg, 'FAR_THIGH_TILT (deg)', () => RIG.FAR_THIGH_TILT * 180 / Math.PI, v => setRig(key, v), -60, 60, 0.5);
        } else if (key === 'FAR_ARM_SCALE' || key === 'NEAR_SHIN_SCALE' || key === 'FAR_SHIN_SCALE') {
            sliderRow(rg, key, () => RIG[key], v => setRig(key, v), 0.4, 1.6, 0.01);
        } else {
            sliderRow(rg, key, () => RIG[key], v => setRig(key, v), -40, 40, 1);
        }
    }

    // Per-character knobs (rebuilt on character switch)
    charPanelBody = group(`Character knobs`, true);
    buildCharPanel();

    // Reference overlay
    const rf = group('Reference overlay', true);
    el(rf, `<div class="hint">Load a reference (e.g. Sprite sheets/New Lou/LouTheszFullBodyRef.png),
        then drag it on the canvas to align.</div>`);
    el(rf, `<div class="row"><input type="file" accept="image/*" id="refFile"></div>`)
        .querySelector('#refFile').addEventListener('change', e => loadRef(e.target.files[0]));
    sliderRow(rf, 'opacity', () => state.ref.alpha, v => { state.ref.alpha = v; refImage?.setAlpha(v); }, 0, 1, 0.01);
    sliderRow(rf, 'scale', () => state.ref.scale, v => { state.ref.scale = v; refImage?.setScale(v); }, 0.05, 4, 0.01);
    checkRow(rf, 'in front of wrestler', () => state.ref.front, v => { state.ref.front = v; refImage?.setDepth(v ? 40 : 2); });

    // Export
    const ex = group('Export — copy values', true);
    el(ex, `<div class="hint">Only values changed from this session's baseline appear. Paste each
        block into the file named in its header. The browser never writes files.</div>`);
    el(ex, `<pre id="exportOut">(no changes yet)</pre>`);
    const btns = el(ex, `<div class="btnrow"><button id="copyAll">copy all</button></div>`);
    btns.querySelector('#copyAll').addEventListener('click', async () => {
        await navigator.clipboard.writeText(exportText());
        btns.querySelector('#copyAll').textContent = 'copied ✓';
        setTimeout(() => { btns.querySelector('#copyAll').textContent = 'copy all'; }, 1200);
    });
}

function buildCharPanel() {
    charPanelBody.innerHTML = '';
    charRowRefreshers = [];
    const c = currentChar();
    charPanelBody.parentElement.querySelector('summary').textContent =
        `Character knobs — ${c.id}${c.id === 'placeholder' ? ' (not exportable — no character file)' : ` (src/characters/${charFilename(c.id)}.js)`}`;
    const hasHead = !!c.textures.head;
    for (const spec of CHAR_KNOBS) {
        if (spec.headOnly && !hasHead) continue;
        const label = spec.angle ? `${spec.key} (deg)` : spec.key;
        if (spec.nullable) {
            // farLegTilt: checkbox arms the per-character override; unchecked = global default
            const wrap = el(charPanelBody, `<div class="row"><label>${label}</label>
                <input type="checkbox" title="override global"><span class="val">override</span></div>`);
            const cb = wrap.querySelector('input');
            const r = sliderRow(charPanelBody, `↳ value`, () => getCharKnob(spec.key) ?? 0,
                v => { if (cb.checked) setCharKnob(spec.key, v); }, spec.min, spec.max, spec.step);
            cb.checked = getCharKnob(spec.key) !== null;
            cb.addEventListener('change', () => {
                setCharKnob(spec.key, cb.checked ? (getCharKnob(spec.key) ?? 0) : null);
                r.refresh(); renderExport();
            });
            charRowRefreshers.push(() => { cb.checked = getCharKnob(spec.key) !== null; r.refresh(); });
        } else {
            const r = sliderRow(charPanelBody, label, () => getCharKnob(spec.key),
                v => setCharKnob(spec.key, v), spec.min, spec.max, spec.step);
            charRowRefreshers.push(r.refresh);
        }
    }
    const boxes = charBoxEntries();
    if (boxes.length) {
        el(charPanelBody, `<div class="hint" style="margin-top:6px">Per-character display boxes:</div>`);
        for (const part of boxes) {
            const box = c.textures[part].box;
            sliderRow(charPanelBody, `${part}.box.w`, () => box.w, v => { box.w = v; }, 10, 220, 1);
            sliderRow(charPanelBody, `${part}.box.h`, () => box.h, v => { box.h = v; }, 10, 220, 1);
            const pivotRow = sliderRow(charPanelBody, `${part}.pivotOffsetFrac`,
                () => getPivotOffsetFrac(part), v => setPivotOffsetFrac(part, v), -0.5, 0.5, 0.001);
            const btns = el(charPanelBody, `<div class="btnrow"><button class="small" id="measure-${part}">measure from art (${PIVOT_EDGE[part]} edge)</button></div>`);
            btns.querySelector(`#measure-${part}`).addEventListener('click', () => {
                const frac = measureArtPivotFrac(c.textures[part].key, PIVOT_EDGE[part]);
                setPivotOffsetFrac(part, Math.round(frac * 1000) / 1000);
                pivotRow.refresh(); renderExport();
            });
        }
        el(charPanelBody, `<div class="hint">pivotOffsetFrac corrects for the part's own art not
            being laterally centered at its ${'{top/bottom}'} joint edge — see Skeleton.js's
            _placePart comment. Opt-in; 0/unset renders exactly as before. "measure from art"
            reads the committed PNG's ink bounding box (same method as
            tools/debug/knee_pivot_audit.mjs) — sanity-check the result before trusting it,
            it's a starting point, not gospel.</div>`);
    }

    // thighH/shinH (CHAR_KNOBS above) are also inert for any character whose
    // thigh/shin carry distalAnchorFrac/soleAnchorFrac (the "authored/
    // painted-sole" rig — george-ai-pilot line): the hip-height solve and
    // knee/ankle placement come from those anchor vectors directly, not the
    // abstract bone length. thighH/shinH still matter there, but only as a
    // walking-gait max-reach clamp near full leg extension — invisible on a
    // static idle-pose render. Adjust visual leg size via the thigh/shin
    // box.w/h rows above instead.
    if (c.textures.thigh?.distalAnchorFrac || c.textures.shin?.soleAnchorFrac || c.textures.nearShin?.soleAnchorFrac) {
        el(charPanelBody, `<div class="hint" style="margin-top:6px">thighH/shinH above are near-inert
            on this rig (authored distal/sole anchors drive placement, not bone length) — use the
            thigh/shin box.w/h rows for visual size instead.</div>`);
    }
}

// rigProfile.sockets — own top-level panel (2026-07-26, moved out of
// buildCharPanel: see buildPanel's comment on why). When present,
// Skeleton.js's updateUpright roots neck/shoulders/hips from these authored
// torso-relative u/v fractions (_socketPoint) INSTEAD of headOffsetX/Y,
// armOffsetX/Y, farArmOffsetX/Y, legOffsetX/Y, nearLegOffsetY,
// farLegOffsetX/Y — those CHAR_KNOBS rows are silently inert for any
// character with a matching socket (confirmed empirically: setting them
// produces zero render change on george, thesz, and george-ai-pilot-v8, all
// three of which supply rigProfile.sockets). This is the panel that
// actually moves those joints. u/v are fractions of the torso's own canvas
// (0..1); mutated in place on the same object Skeleton.js's constructor
// captured a reference to, so changes are live without a character
// switch/rebuild.
function buildSocketsPanel() {
    socketsPanelBody.innerHTML = '';
    const c = currentChar();
    const sockets = c.textures.rigProfile?.sockets;
    socketsPanelBody.parentElement.querySelector('summary').textContent =
        `Character sockets (rigProfile.sockets) — ${c.id}${sockets ? '' : ' (none on this character)'}`;
    if (!sockets) {
        el(socketsPanelBody, `<div class="hint">This character has no rigProfile.sockets — neck/
            shoulder/hip position comes from the generic offset knobs in Character knobs below
            instead (armOffsetX/Y, legOffsetX/Y, etc. all apply normally here).</div>`);
        return;
    }
    el(socketsPanelBody, `<div class="hint">The actual controls for neck/shoulder${sockets.nearHip ? '/hip' : ''}
        position on this rig — armOffsetX/Y, farArmOffsetX/Y${sockets.nearHip ? ', legOffsetX/Y, nearLegOffsetY, farLegOffsetX/Y' : ''}
        and headOffsetX/Y (down in Character knobs) have no effect wherever a matching socket
        exists below.</div>`);
    for (const name of Object.keys(sockets)) {
        const sock = sockets[name];
        sliderRow(socketsPanelBody, `sockets.${name}.u`, () => sock.u, v => { sock.u = v; }, 0, 1, 0.001);
        sliderRow(socketsPanelBody, `sockets.${name}.v`, () => sock.v, v => { sock.v = v; }, 0, 1, 0.001);
    }
}

// ─── Reference overlay ───────────────────────────────────────────────────────
function loadRef(file) {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
        if (scene.textures.exists('ref_overlay')) {
            refImage?.destroy();
            scene.textures.remove('ref_overlay');
        }
        scene.textures.addImage('ref_overlay', img);
        refImage = scene.add.image(CX, GROUND_Y - img.height * state.ref.scale / 2, 'ref_overlay')
            .setAlpha(state.ref.alpha).setScale(state.ref.scale)
            .setDepth(state.ref.front ? 40 : 2)
            .setInteractive({ draggable: true, useHandCursor: true });
        refImage.on('drag', (p, dx, dy) => refImage.setPosition(dx, dy));
        URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
}

// ─── Export ──────────────────────────────────────────────────────────────────
const fmt = n => {
    const r = Math.round(n * 1000) / 1000;
    return Object.is(r, -0) ? '0' : String(r);
};
const fmtTilt = rad => `${fmt(rad * 180 / Math.PI)} * Math.PI / 180`;

function exportText() {
    const blocks = [];

    const scalarDiffs = (cur, base, tiltKeys = []) => Object.keys(cur)
        .filter(k => typeof cur[k] === 'number' && !near(cur[k], base[k]))
        .map(k => `    ${k}: ${tiltKeys.includes(k) ? fmtTilt(cur[k]) : fmt(cur[k])},`);

    const pDiff = scalarDiffs(P, P0);
    if (pDiff.length) blocks.push(`// ── src/Skeleton.js — P ──\n${pDiff.join('\n')}`);

    const texDiff = Object.keys(TEX)
        .filter(p => TEX[p].w !== TEX0[p].w || TEX[p].h !== TEX0[p].h)
        .map(p => `    ${p}:${' '.repeat(Math.max(1, 9 - p.length))}{ w: ${fmt(TEX[p].w)}, h: ${fmt(TEX[p].h)} },`);
    if (texDiff.length) blocks.push(`// ── src/Skeleton.js — TEX ──\n${texDiff.join('\n')}`);

    const rigDiff = scalarDiffs(RIG, RIG0, ['FAR_THIGH_TILT']);
    if (rigDiff.length) blocks.push(`// ── src/Skeleton.js — RIG ──\n${rigDiff.join('\n')}`);

    for (const id of ['george', 'thesz']) {
        const cfg = CHARS[id].textures, base = CHAR0[id];
        const lines = [];
        for (const spec of CHAR_KNOBS) {
            const cur = cfg[spec.key], b = base[spec.key];
            if (cur === undefined && b === undefined) continue;
            if (cur === undefined) { lines.push(`    // ${spec.key}: removed (was ${spec.angle ? fmtTilt(b) : fmt(b)}) — falls back to default`); continue; }
            if (b !== undefined && near(cur, b)) continue;
            lines.push(`    ${spec.key}: ${spec.angle ? fmtTilt(cur) : fmt(cur)},`);
        }
        for (const part of BOX_PARTS) {
            const e = cfg[part], b = base[part];
            if (!e || typeof e !== 'object' || !e.box || !b || typeof b !== 'object') continue;
            const boxChanged = e.box.w !== b.box.w || e.box.h !== b.box.h;
            const pivotChanged = !near(e.pivotOffsetFrac ?? 0, b.pivotOffsetFrac ?? 0);
            if (boxChanged || pivotChanged) {
                const pivotField = e.pivotOffsetFrac ? `, pivotOffsetFrac: ${fmt(e.pivotOffsetFrac)}` : '';
                lines.push(`    ${part}: { key: '${e.key}', box: { w: ${fmt(e.box.w)}, h: ${fmt(e.box.h)} }${pivotField} },`);
            }
        }
        const sockets = cfg.rigProfile?.sockets, socketsBase = base.rigProfile?.sockets;
        if (sockets && socketsBase) {
            const socketLines = Object.keys(sockets)
                .filter(name => !near(sockets[name].u, socketsBase[name].u) || !near(sockets[name].v, socketsBase[name].v))
                .map(name => `            ${name}: ${' '.repeat(Math.max(1, 13 - name.length))}{ u: ${fmt(sockets[name].u)}, v: ${fmt(sockets[name].v)} },`);
            if (socketLines.length) lines.push(`    rigProfile: {\n        sockets: {\n${socketLines.join('\n')}\n        },\n    },`);
        }
        if (lines.length) blocks.push(`// ── src/characters/${charFilename(id)}.js — textures ──\n${lines.join('\n')}`);
    }

    // Nullable channels (lForearm/rForearm/lShin/rShin) need definedness
    // compared, not just value — near(undefined ?? 0, 0) would silently miss
    // "removed the override" and "set it to literal 0" both reading as 0.
    const poseLines = Object.keys(POSES).filter(name => {
        const a = POSES[name], b = POSES0[name] ?? {};
        const absChanged = POSE_ABS_CH.some(ch => !near(a[ch] ?? 0, b[ch] ?? 0));
        const nullableChanged = POSE_NULLABLE_CH.some(ch => {
            if (a[ch] === undefined && b[ch] === undefined) return false;
            if (a[ch] === undefined || b[ch] === undefined) return true;
            return !near(a[ch], b[ch]);
        });
        return absChanged || nullableChanged;
    }).map(name => {
        const p = POSES[name];
        const abs = POSE_ABS_CH.map(ch => `${ch}: ${fmt(p[ch] ?? 0)}`).join(', ');
        const overrides = POSE_NULLABLE_CH.filter(ch => p[ch] !== undefined).map(ch => `${ch}: ${fmt(p[ch])}`);
        return `    ${name}: { ${[abs, ...overrides].join(', ')} },`;
    });
    if (poseLines.length) blocks.push(`// ── src/Wrestler.js — POSES ──\n${poseLines.join('\n')}`);

    return blocks.length ? blocks.join('\n\n') : '(no changes yet)';
}

function renderExport() {
    const out = document.getElementById('exportOut');
    if (out) out.textContent = exportText();
}

// ─── Boot ────────────────────────────────────────────────────────────────────
new Phaser.Game({
    type: Phaser.AUTO,
    width: 960,
    height: 600,
    parent: 'stage',
    backgroundColor: '#141418',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { preload, create, update },
});
