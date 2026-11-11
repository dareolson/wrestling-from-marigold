// T2.7b: tight crops of the attacker's hips on held frames, for the thigh-art question. Variants hide one part group at a time so the culprit shows.
//   node tools/debug/arm_bar_hips_crops.mjs <outDir> [variants: base,noPelvis,noFar,noTrunks]   (light=v1; LIGHT=0 not meaningful)
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, STEP } from './grapples_film.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const TIMES = [1.4, 1.95, 2.4], out = process.argv[2], variants = (process.argv[3] || 'base').split(',');
const SETUP = ({ facing }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle); w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing; a.x = 520; d.x = 520 + facing * 70 * a.s;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    d.state = 'down'; d.lying = 'supine'; d.stateTimer = 99;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    a._doArmBar(d);
};
const HIDE = (v) => {   // wraps the attacker's draw so the hidden group stays hidden through the render of each step
    const a = window.__WFM_GAME.scene.scenes[0].w1, sk = a.skeleton;
    const groups = { noPelvis: ['pelvisUnderlay', 'pelvisOverlay', 'pelvisMask'], noFar: ['farThigh', 'farShin', 'farBoot'], noTrunks: ['trunks'], noNear: ['nearThigh', 'nearShin', 'nearBoot'], noTorso: ['torso'] };
    const names = groups[v] ?? [];
    if (!a.__drawOrig) a.__drawOrig = a.draw.bind(a);
    a.draw = (...args) => { const r = a.__drawOrig(...args); for (const n of names) sk[n]?.setVisible(false); return r; };
};
const AT = () => { const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width, p = a.skeleton.jointAttachmentPoints, hx = (p.nearHip.x + p.farHip.x) / 2, hy = (p.nearHip.y + p.farHip.y) / 2; return { x: box.x + (hx - cam.worldView.x) * cam.zoom * k, y: box.y + (hy - cam.worldView.y) * cam.zoom * k, t: a._activeMove?.time ?? null, s: cam.zoom * k }; };
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) for (const v of variants) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`; mkdirSync(`${out}/${id}`, { recursive: true });
            await h.page.evaluate(SETUP, { facing }); const done = new Set();
            if (v !== 'base') await h.page.evaluate(HIDE, v); else await h.page.evaluate(() => { const a = window.__WFM_GAME.scene.scenes[0].w1; if (a.__drawOrig) a.draw = a.__drawOrig; });
            for (let i = 0; i < 300; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const r = await h.page.evaluate(AT);
                if (r.t === null) break;
                const tt = TIMES.find(x => r.t >= x && !done.has(x));
                if (tt !== undefined) { done.add(tt); await h.page.screenshot({ path: `${out}/${id}/${v}-${tt}.png`, clip: { x: Math.max(0, r.x - 70 * r.s), y: Math.max(0, r.y - 55 * r.s), width: 140 * r.s, height: 120 * r.s } }); }
            }
        }
    } finally { await h.close(); }
}
