// Keyed staging solver: satisfy a move's body-to-body constraints at its
// AUTHORED keyframes only (no baking), so the draft stays sparse and
// hand-editable in the move editor.
//
//   node tools/move-critic/stage.mjs <draft.json> <constraints.mjs> <out.json>
//
// The constraints module exports `{ plant: [...], stage: [...], hands: [...] }`:
//   plant: { at, role, side, refAt } slides `role`'s root so its near/far sole
//          stays where it was at refAt (default 0).
//   stage: { at, role, joint, to: { role, joint, dx, dy } }
//          moves `role` (transform.x and pose.lift) so its `joint` lands on
//          the other actor's `joint`, offset by dx px in front of that actor
//          (along its facing) and dy px down.
//   hands: { at, role, limb, to: { role, joint, dx, dy } }
//          solves the limb with the editor's drag IK (applyChainDrag).
// Staging runs first, hands after (Codex review 2026-10-15: place the bodies,
// then solve the grips; never force a wrist onto a body staged out of reach).
// Prints the residual gap of every constraint after solving.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [draftPath, constraintsPath, outPath] = process.argv.slice(2);
const draftIn = JSON.parse(readFileSync(draftPath, 'utf8'));
const { plant = [], stage = [], hands = [] } = await import(pathToFileURL(resolve(constraintsPath)).href);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:5173/tools/move-editor/');
await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
await page.evaluate(() => localStorage.clear());
await page.evaluate(d => window.__MOVE_EDITOR.adoptDraft(d), draftIn);
await page.waitForTimeout(1200);

const result = await page.evaluate(async ({ plant, stage, hands }) => {
    const E = window.__MOVE_EDITOR;
    const model = await import('/tools/move-editor/model.js');
    const ROLES = ['attacker', 'defender'];
    const log = [];
    const load = at => {
        const sampled = model.sampleDraft(E.draft, at);
        for (const role of ROLES) {
            const actor = E.actors[role], state = sampled.tracks[role];
            actor.pose = { ...model.basePose(), ...state.pose };
            actor.transform = { x: 0, y: 0, ...state.transform };
            actor.parts = { ...state.parts };
            actor.facing = state.facing !== undefined ? E.stagingFacing() * state.facing : (E.draft.preview?.facing?.[role] ?? actor.facing);
        }
        for (const role of ROLES) E.renderActor(role);
    };
    const keyAt = (role, at) => {
        const k = E.draft.tracks[role].keyframes.find(f => Math.abs(f.at - at) < 1e-4);
        if (!k) throw new Error(`${role} has no keyframe at ${at}`);
        return k;
    };
    const point = (role, joint) => E.actors[role].skeleton.jointAttachmentPoints[joint];
    // Offsets are screen px, or with `frame: 'body'` they turn with the
    // target's spine (hip→neck), so "in front of his chest" stays in front of
    // it while he tilts back into a fall.
    const goalOf = c => {
        const p = point(c.to.role, c.to.joint);
        const f = E.actors[c.to.role].facing;
        let dx = (c.to.dx ?? 0) * f, dy = c.to.dy ?? 0;
        if (c.to.frame === 'body') {
            const j = E.actors[c.to.role].skeleton.jointAttachmentPoints;
            const a = Math.atan2(j.neck.x - j.nearHip.x, -(j.neck.y - j.nearHip.y));
            [dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
        }
        return { x: p.x + dx, y: p.y + dy };
    };
    const gap = c => { load(c.at); const a = point(c.role, c.joint ?? c.limb), g = goalOf(c); return { dx: g.x - a.x, dy: g.y - a.y, d: Math.hypot(g.x - a.x, g.y - a.y) }; };

    // Plants first: keep a sole where it was at `refAt` by sliding the actor's
    // root (a squat moves the hips back over still feet; the knees don't push
    // the feet forward). Bodies staged against this actor come after.
    const { outline } = await import('/tools/move-critic/page-outline.js');
    const soleX = (role, side) => {
        const sk = E.actors[role].skeleton;
        const pts = outline(sk[`${side}Boot`]?.visible ? sk[`${side}Boot`] : sk[`${side}Shin`]);
        const bottom = Math.max(...pts.map(p => p[1]));
        const low = pts.filter(p => p[1] >= bottom - 3);
        return low.reduce((t, p) => t + p[0], 0) / low.length;
    };
    for (const c of plant) {
        load(c.refAt ?? 0);
        const ref = soleX(c.role, c.side);
        const k = keyAt(c.role, c.at);
        let drift = 0;
        for (let i = 0; i < 4; i++) {
            load(c.at);
            drift = ref - soleX(c.role, c.side);
            if (Math.abs(drift) < 0.3) break;
            k.transform.x = Math.round((k.transform.x + drift / E.SCALE * E.stagingFacing()) * 100) / 100;
        }
        load(c.at);
        log.push(`plant ${c.role} ${c.side} sole @${c.at}: residual ${(ref - soleX(c.role, c.side)).toFixed(1)}px (x ${k.transform.x})`);
    }
    for (const c of stage) {
        const k = keyAt(c.role, c.at);
        k.pose.lift ??= 0;
        const before = gap(c).d;
        for (let i = 0; i < 6; i++) {
            const g = gap(c);
            if (g.d < 0.5) break;
            // x: px → rig units directly. lift: measure its px effect (rigs
            // scale lift by body size and tilt mixes it), then Newton-step.
            k.transform.x += g.dx / E.SCALE * E.stagingFacing();
            const y0 = gap(c).dy;
            k.pose.lift += 5;
            const y1 = gap(c).dy;
            const perUnit = (y1 - y0) / 5;
            k.pose.lift -= 5;
            if (Math.abs(perUnit) > 1e-3) k.pose.lift += -y0 / perUnit;
        }
        k.transform.x = Math.round(k.transform.x * 100) / 100;
        k.pose.lift = Math.round(k.pose.lift * 100) / 100;
        log.push(`stage ${c.role} ${c.joint} → ${c.to.role} ${c.to.joint} @${c.at}: ${before.toFixed(1)}px → ${gap(c).d.toFixed(1)}px (x ${k.transform.x}, lift ${k.pose.lift})`);
    }
    for (const c of hands) {
        const k = keyAt(c.role, c.at);
        const side = c.limb.startsWith('near') ? 'near' : 'far';
        const kind = c.limb.endsWith('Wrist') ? 'wrist' : 'ankle';
        const before = gap(c).d;
        // Keep the best attempt: near a joint limit the drag IK can land
        // further away than it started.
        let best = { d: before, pose: { ...k.pose } };
        for (let i = 0; i < 5; i++) {
            load(c.at);
            const actor = E.actors[c.role];
            const prev = { ...actor.pose };
            E.applyChainDrag(c.role, side, kind, goalOf(c));
            for (const [ch, v] of Object.entries(actor.pose)) if (prev[ch] !== v) k.pose[ch] = Math.round(v * 1000) / 1000;
            const d = gap(c).d;
            if (d < best.d) best = { d, pose: { ...k.pose } };
        }
        k.pose = best.pose;
        log.push(`hand ${c.role} ${c.limb} → ${c.to.role} ${c.to.joint} @${c.at}: ${before.toFixed(1)}px → ${gap(c).d.toFixed(1)}px`);
    }
    return { log, draft: JSON.parse(JSON.stringify(E.draft)) };
}, { plant, stage, hands });

writeFileSync(outPath, `${JSON.stringify(result.draft, null, 2)}\n`);
for (const line of result.log) console.log(line);
console.log(`wrote ${outPath}${errors.length ? `  page errors: ${errors.join(' | ')}` : ''}`);
await browser.close();
