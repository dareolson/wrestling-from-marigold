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
const PART_FILES = { head: 'head.png', torso: 'torso.png', upperArm: 'upper_arm.png', forearm: 'forearm.png', thigh: 'thigh.png', shin: 'shin.png' };
const BOX_PARTS = ['torso', 'upperArm', 'forearm', 'thigh', 'shin'];

// ─── Baselines (captured before any edit — export emits diffs only) ─────────
const deep = o => JSON.parse(JSON.stringify(o));
const P0 = deep(P), TEX0 = deep(TEX), RIG0 = deep(RIG), POSES0 = deep(POSES);
const CHAR0 = { george: deep(george.textures), thesz: deep(thesz.textures) };

// ─── Per-character knob schema ───────────────────────────────────────────────
// field: Skeleton instance field (read every frame → live).
// def: effective value when the config key is absent.
// angle: UI/config in degrees ↔ radians internally, exported as `deg * Math.PI / 180`.
const CHAR_KNOBS = [
    { key: 'headScale',       field: '_headScale',       def: () => 1,   min: 0.3, max: 2,   step: 0.005, headOnly: true },
    { key: 'headOffsetX',     field: '_headOffsetX',     def: () => 0,   min: -60, max: 60,  step: 1, headOnly: true },
    { key: 'headOffsetY',     field: '_headOffsetY',     def: () => 0,   min: -60, max: 60,  step: 1, headOnly: true },
    { key: 'armOffsetX',      field: '_armOffsetX',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'armOffsetY',      field: '_armOffsetY',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'legOffsetX',      field: '_legOffsetX',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'legOffsetY',      field: '_legOffsetY',      def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearLegOffsetY',  field: '_nearLegOffsetY',  def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearLegTilt',     field: '_nearLegTilt',     def: () => 0,   min: -60, max: 60,  step: 0.5, angle: true },
    { key: 'nearShinOffsetX', field: '_nearShinOffsetX', def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearShinOffsetY', field: '_nearShinOffsetY', def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'nearShinTilt',    field: '_nearShinTilt',    def: () => 0,   min: -60, max: 60,  step: 0.5, angle: true },
    { key: 'nearShinScale',   field: '_nearShinScale',   def: () => RIG.NEAR_SHIN_SCALE, min: 0.5, max: 1.6, step: 0.01 },
    { key: 'farLegOffsetX',   field: '_farLegOffsetX',   def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'farLegOffsetY',   field: '_farLegOffsetY',   def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'farLegTilt',      field: '_farLegTilt',      def: () => null, min: -60, max: 60, step: 0.5, angle: true, nullable: true },
    { key: 'farShinOffsetX',  field: '_farShinOffsetX',  def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'farShinOffsetY',  field: '_farShinOffsetY',  def: () => 0,   min: -60, max: 60,  step: 1 },
    { key: 'thighH',          field: '_thighH',          def: () => P.thighH, min: 20, max: 120, step: 1 },
    { key: 'shinH',           field: '_shinH',           def: () => P.shinH,  min: 20, max: 120, step: 1 },
];

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

// Global P/RIG edits that constructor-captured instance fields must follow
// (only when the character doesn't override them).
function syncCapturedGlobals() {
    if (!skeleton) return;
    const cfg = currentChar().textures;
    if (cfg.thighH === undefined) skeleton._thighH = P.thighH;
    if (cfg.shinH === undefined) skeleton._shinH = P.shinH;
    if (cfg.nearShinScale === undefined) skeleton._nearShinScale = RIG.NEAR_SHIN_SCALE;
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
        CX, GROUND_Y, state.zoom, state.facing, pose, state.walkPhase,
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
            const s = state.zoom;
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
    POSES[name][channel] = v;
    refreshPoseRows();
}
function setCharacter(id) {
    state.charId = id;
    rebuildSkeleton();
    buildCharPanel();
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
    for (const ch of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) {
        const lim = ch === 'crouch' ? [0, 1] : ch === 'lean' ? [-1, 1] : [-3.5, 3.5];
        const r = sliderRow(pd, ch,
            () => currentPose()[ch] ?? 0,
            v => setPose(state.poseName, ch, v),
            lim[0], lim[1], 0.01);
        poseRowRefreshers.push(r.refresh);
    }
    el(pd, `<div class="btnrow"><button class="small" id="poseReset">reset pose to baseline</button></div>`)
        .querySelector('#poseReset').addEventListener('click', () => {
            POSES[state.poseName] = deep(POSES0[state.poseName]);
            refreshPoseRows(); renderExport();
        });

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
        } else if (key === 'FAR_ARM_SCALE' || key === 'NEAR_SHIN_SCALE') {
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
        `Character knobs — ${c.id}${c.id === 'placeholder' ? ' (not exportable — no character file)' : ` (src/characters/${c.id}.js)`}`;
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
        }
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
            if (e.box.w !== b.box.w || e.box.h !== b.box.h) {
                lines.push(`    ${part}: { key: '${e.key}', box: { w: ${fmt(e.box.w)}, h: ${fmt(e.box.h)} } },`);
            }
        }
        if (lines.length) blocks.push(`// ── src/characters/${id}.js — textures ──\n${lines.join('\n')}`);
    }

    const poseLines = Object.keys(POSES).filter(name => {
        const a = POSES[name], b = POSES0[name] ?? {};
        return ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch'].some(ch => !near(a[ch] ?? 0, b[ch] ?? 0));
    }).map(name => {
        const p = POSES[name];
        return `    ${name}: { lLeg: ${fmt(p.lLeg ?? 0)}, rLeg: ${fmt(p.rLeg ?? 0)}, lArm: ${fmt(p.lArm ?? 0)}, rArm: ${fmt(p.rArm ?? 0)}, lean: ${fmt(p.lean ?? 0)}, crouch: ${fmt(p.crouch ?? 0)} },`;
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
