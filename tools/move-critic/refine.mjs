// Automated refinement pass over a move-editor draft. Writes a NEW draft; the
// source is never modified.
//
//   node tools/move-critic/refine.mjs <draftId|path.json> <out.json> [--cast a,d] [--plan name]
//
// Method (the standard motion-cleanup recipe):
//   1. Bake: resample every track to linear keys at BAKE_FPS (plus the original
//      key, event and contact times), so later edits cannot change the motion's
//      timing shape the way splitting an eased segment would.
//   2. Apply the plan's ops in order. Each op fixes one channel family over a
//      time window, blended in/out over `ramp` seconds so a fix never pops:
//        reach  — solve a wrist/ankle onto a target with the editor's own drag IK
//                 (applyChainDrag: same joint limits as posing by hand).
//                 Targets: a partner joint, a partner part's painted centre,
//                 or `plant` (stay where it was at the window start).
//        shift  — add dx/dy (rig units) to an actor's staging transform.
//        retime — move an event marker.
//   3. Write the refined draft. Re-run sample.mjs + report.mjs to grade it.
//
// Expects the dev server on 127.0.0.1:5173.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { PLANS } from './plans.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const [source, outPath] = args;
const cast = flag('--cast', null);
const planName = flag('--plan', null);
const BAKE_FPS = Number(flag('--bake-fps', 30));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:5173/tools/move-editor/');
await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
await page.evaluate(() => localStorage.clear());
const draftIn = source.endsWith('.json') ? JSON.parse(readFileSync(source, 'utf8')) : null;
if (draftIn) await page.evaluate(d => window.__MOVE_EDITOR.adoptDraft(d), draftIn);
else await page.evaluate(id => window.__MOVE_EDITOR.loadLibraryDraft(id), source);
await page.waitForTimeout(1200);

const id = await page.evaluate(() => window.__MOVE_EDITOR.draft.id);
const plan = PLANS[planName ?? id];
if (!plan) throw new Error(`no refine plan for "${planName ?? id}" (plans.mjs)`);

const log = await page.evaluate(async ({ plan, cast, BAKE_FPS }) => {
    const E = window.__MOVE_EDITOR;
    const model = await import('/tools/move-editor/model.js');
    const ROLES = ['attacker', 'defender'];
    const notes = [];
    const original = JSON.parse(JSON.stringify(E.draft));
    if (cast) {
        const [attacker, defender] = cast.split(',');
        original.preview = { ...original.preview, characters: { attacker, defender } };
    }

    // 1. Bake.
    const times = new Set();
    for (let i = 0; i / BAKE_FPS < original.duration; i++) times.add(Math.round(i / BAKE_FPS * 1000) / 1000);
    times.add(original.duration);
    for (const track of Object.values(original.tracks)) for (const k of track.keyframes) times.add(k.at);
    for (const e of original.events ?? []) times.add(e.at);
    for (const c of original.contacts ?? []) { times.add(c.from); times.add(c.to); }
    const sorted = [...times].filter(t => t >= 0 && t <= original.duration).sort((a, b) => a - b);
    const baked = JSON.parse(JSON.stringify(original));
    for (const role of ROLES) {
        baked.tracks[role].keyframes = sorted.map(at => {
            const s = model.sampleDraft(original, at).tracks[role];
            const frame = { at, ease: 'linear', pose: { ...model.basePose(), ...s.pose }, transform: { x: 0, y: 0, ...s.transform }, parts: { ...s.parts } };
            if (s.facing !== undefined) frame.facing = s.facing;
            return frame;
        });
    }
    baked.id = `${original.id}-refined`;
    E.adoptDraft(baked);
    await new Promise(r => setTimeout(r, 800));
    notes.push(`baked ${sorted.length} keys per role at ${BAKE_FPS} fps (+ authored key/event/contact times)`);

    const draft = () => E.draft;
    const load = at => {
        const sampled = model.sampleDraft(draft(), at);
        for (const role of ROLES) {
            const actor = E.actors[role], state = sampled.tracks[role];
            actor.pose = { ...model.basePose(), ...state.pose };
            actor.transform = { x: 0, y: 0, ...state.transform };
            actor.parts = { ...state.parts };
            actor.facing = state.facing !== undefined ? E.stagingFacing() * state.facing : (draft().preview?.facing?.[role] ?? actor.facing);
        }
        for (const role of ROLES) E.renderActor(role);
    };
    const centre = (role, part) => {
        const img = E.actors[role].skeleton[part];
        return img ? { x: img.x, y: img.y } : null;
    };
    const weight = (at, op) => {
        const ramp = op.ramp ?? 0.1;
        if (at >= op.from && at <= op.to) return 1;
        const d = at < op.from ? op.from - at : at - op.to;
        if (d >= ramp) return 0;
        const x = 1 - d / ramp;
        return x * x * (3 - 2 * x);
    };
    const keysIn = (role, op) => draft().tracks[role].keyframes.filter(k => weight(k.at, op) > 0);

    // 2. Ops.
    for (const op of plan.ops) {
        if (op.op === 'retime') {
            const e = draft().events.find(ev => ev.type === op.event);
            notes.push(`retime ${op.event}: ${e.at} → ${op.at}`);
            e.at = op.at;
            continue;
        }
        if (op.op === 'shift') {
            for (const k of keysIn(op.role, op)) {
                const w = weight(k.at, op);
                k.transform.x = Math.round((k.transform.x + w * (op.dx ?? 0)) * 100) / 100;
                k.transform.y = Math.round((k.transform.y + w * (op.dy ?? 0)) * 100) / 100;
            }
            notes.push(`shift ${op.role} dx=${op.dx ?? 0} dy=${op.dy ?? 0} over ${op.from}–${op.to}`);
            continue;
        }
        if (op.op === 'stopAt') {
            // Retarget an actor's TRAVEL so a limb meets the partner's painted
            // front edge at `at` instead of passing through it: the travel up to
            // `at` is scaled, everything after shifts by the same amount.
            const { outline } = await import('/tools/move-critic/page-outline.js');
            load(op.at);
            const actor = E.actors[op.role], partner = E.actors[op.role === 'attacker' ? 'defender' : 'attacker'];
            const dir = actor.facing;
            const tip = Math.max(...op.limbs.map(l => dir * actor.skeleton.jointAttachmentPoints[l].x));
            const front = Math.min(...op.parts.filter(p => partner.skeleton[p]).flatMap(p => outline(partner.skeleton[p]).map(([x]) => dir * x)));
            const dxPx = front - tip;
            const dx = dxPx / E.SCALE * dir * E.stagingFacing();
            const keys = draft().tracks[op.role].keyframes;
            const x0 = keys[0].transform.x;
            const xAt = model.sampleDraft(draft(), op.at).tracks[op.role].transform.x;
            for (const k of keys) {
                const share = k.at >= op.at ? 1 : (xAt === x0 ? k.at / op.at : (k.transform.x - x0) / (xAt - x0));
                k.transform.x = Math.round((k.transform.x + share * dx) * 100) / 100;
            }
            const restX = model.sampleDraft(draft(), op.at).tracks[op.role].transform.x;
            const partnerX = model.sampleDraft(draft(), op.at).tracks[op.role === 'attacker' ? 'defender' : 'attacker'].transform.x;
            notes.push(`stopAt ${op.role} ${op.limbs.join('/')} → ${op.parts.join('/')} front @${op.at}: travel ${dx >= 0 ? '+' : ''}${dx.toFixed(1)} rig units (${(dxPx).toFixed(1)}px); separation at contact ${Math.abs(partnerX - restX).toFixed(1)} rig units`);
            continue;
        }
        if (op.op === 'reach') {
            const side = op.limb.startsWith('near') ? 'near' : 'far';
            const kind = op.limb.endsWith('Wrist') ? 'wrist' : 'ankle';
            const partner = op.role === 'attacker' ? 'defender' : 'attacker';
            let planted = null;
            if (op.target.plant) {
                load(op.from);
                const p = E.actors[op.role].skeleton.jointAttachmentPoints[op.limb];
                planted = { x: p.x, y: p.y };
            }
            let worstBefore = 0, worstAfter = 0, n = 0, rejected = 0;
            for (const k of keysIn(op.role, op)) {
                load(k.at);
                const sk = E.actors[op.role].skeleton;
                const goal = planted ?? (op.target.part ? centre(partner, op.target.part) : E.actors[partner].skeleton.jointAttachmentPoints[op.target.joint]);
                if (!goal) continue;
                const target = { x: goal.x + (op.offset?.x ?? 0) * (E.actors[op.role].facing), y: goal.y + (op.offset?.y ?? 0) };
                const before = { ...E.actors[op.role].pose };
                const gap0 = Math.hypot(sk.jointAttachmentPoints[op.limb].x - target.x, sk.jointAttachmentPoints[op.limb].y - target.y);
                for (let i = 0; i < 4; i++) {
                    E.applyChainDrag(op.role, side, kind, target);
                    E.renderActor(op.role);
                }
                const w = weight(k.at, op);
                const keyed = { ...k.pose };
                for (const [ch, v] of Object.entries(E.actors[op.role].pose)) {
                    if (before[ch] === v) continue;
                    k.pose[ch] = Math.round((before[ch] + w * (v - before[ch])) * 1000) / 1000;
                }
                load(k.at);
                let after = E.actors[op.role].skeleton.jointAttachmentPoints[op.limb];
                let gap1 = Math.hypot(after.x - target.x, after.y - target.y);
                // Keep a fix only if it helps: some rigs re-solve the limb
                // themselves (an upright leg re-grounds its sole), and the IK
                // then fights the rig instead of the pose.
                if (gap1 > gap0) { k.pose = keyed; gap1 = gap0; rejected++; }
                if (w === 1) { worstBefore = Math.max(worstBefore, gap0); worstAfter = Math.max(worstAfter, gap1); n++; }
            }
            notes.push(`reach ${op.role} ${op.limb} → ${op.target.plant ? 'plant' : op.target.part ? `part:${op.target.part}` : op.target.joint} ${op.from}–${op.to}: worst ${worstBefore.toFixed(1)}px → ${worstAfter.toFixed(1)}px over ${n} full-weight keys${rejected ? `, ${rejected} keys left alone (IK made them worse)` : ''}${op.why ? ` (${op.why})` : ''}`);
            continue;
        }
        throw new Error(`unknown op ${op.op}`);
    }
    return { notes, draft: JSON.parse(JSON.stringify(E.draft)) };
}, { plan, cast, BAKE_FPS });

const out = { ...log.draft, refinement: { source, plan: planName ?? id, notes: log.notes } };
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
for (const n of log.notes) console.log(`· ${n}`);
console.log(`wrote ${outPath}${errors.length ? `  page errors: ${errors.join(' | ')}` : ''}`);
await browser.close();
