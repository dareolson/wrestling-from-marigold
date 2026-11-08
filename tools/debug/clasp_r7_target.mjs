// PLAN_GRAPPLES T2.2 r7, step 1: where the attacker's elbow hand is pointed, against what the partner's body actually shows.
// Per pair, facing and held frame: for each candidate side ('same' = today, 'other') the target point, whether it is inside the partner's drawn
// torso silhouette (texture alpha), and its distance to the nearest VISIBLE pixel of that arm (screenshots with the arm's parts hidden vs shown,
// diffed in the page: the pixels that change are the arm pixels not covered by anything drawn over them).
//   WFM_URL=http://localhost:5174 node tools/debug/clasp_r7_target.mjs <out.json>
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const FRAMES = [30, 50, 70];
// candidates: today's far-arm target, then points on the near arm: the elbow-cup formula (past the elbow along the upper arm's line), the elbow, and points down the forearm
const CANDS = [['far -0.6 (today)', { side: 'same', above: null }], ['near -0.6', { side: 'other', above: null }], ['near 0 (elbow)', { side: 'other', above: 0 }], ['near fore .25', { side: 'other', fore: 0.25 }], ['near fore .5', { side: 'other', fore: 0.5 }]];

// target point, torso test and the screen frame of the partner's arm, in the page
const INFO = async ({ cand }) => {
    const side = cand.side;
    const sc = window.__WFM_GAME.scene.scenes[0], g = sc.lockupState.grapple, att = g.grabber, par = g.grabbed;
    const { lockupGrips, gripTarget } = await import('/src/animation/lockup.js');
    const it = lockupGrips(att, par, g.grips).attacker.find(i => i.joint === 'Elbow');
    const lSide = att.skeleton.lChannelSide(att.facing), handSide = it.arm === 'l' ? lSide : (lSide === 'near' ? 'far' : 'near');
    const on0 = side === 'other' ? (handSide === 'near' ? 'far' : 'near') : handSide;
    const pp = par.skeleton.jointAttachmentPoints;
    const T = cand.fore !== undefined ? { x: pp[`${on0}Elbow`].x + (pp[`${on0}Wrist`].x - pp[`${on0}Elbow`].x) * cand.fore, y: pp[`${on0}Elbow`].y + (pp[`${on0}Wrist`].y - pp[`${on0}Elbow`].y) * cand.fore } : gripTarget({ ...it, side, above: cand.above === null ? it.above : cand.above }, handSide);
    const on = side === 'other' ? (handSide === 'near' ? 'far' : 'near') : handSide;   // the partner arm the target sits on
    const torso = par.skeleton.torso, m = torso.getWorldTransformMatrix(), p = m.applyInverse(T.x, T.y);
    const lx = p.x + torso.originX * torso.width, ly = p.y + torso.originY * torso.height;
    const inside = lx >= 0 && ly >= 0 && lx < torso.width && ly < torso.height;
    const alpha = inside ? (sc.textures.getPixelAlpha(Math.floor(lx + torso.frame.cutX), Math.floor(ly + torso.frame.cutY), torso.texture.key, torso.frame.name) ?? 0) : 0;
    const cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), gs = window.__WFM_GAME.scale.gameSize, k = box.width / gs.width;
    const scr = (x, y) => ({ x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k });
    const parts = ['UpArm', 'Forearm', 'Hand'].map(n => `${on}${n}`).filter(n => par.skeleton[n]?.setVisible);
    return { handSide, on, T, scrT: scr(T.x, T.y), scale: cam.zoom * k, torsoAlpha: alpha, insideTorsoImage: inside, clasp: it.clasp, parts, partner: att === sc.w1 ? 'd' : 'a' };
};
const SHOW = ({ parts, partner, show }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = partner === 'a' ? sc.w1 : sc.w2;
    for (const n of parts) w.skeleton[n].setVisible(show);
    // the loop is asleep, so draw the scene again by hand (same order Phaser's own step uses)
    const r = window.__WFM_GAME.renderer; r.preRender(); sc.sys.render(r); r.postRender();
};
// diff two PNG buffers (base64) in the page: returns the pixels that changed, nearest to (cx, cy), and the changed count
const DIFF = async ({ a, b, cx, cy }) => {
    const load = (s) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const draw = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
    const A = draw(ia), B = draw(ib);
    let n = 0, best = Infinity;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        const o = (y * A.width + x) * 4;
        if (Math.abs(A.data[o] - B.data[o]) + Math.abs(A.data[o + 1] - B.data[o + 1]) + Math.abs(A.data[o + 2] - B.data[o + 2]) > 24) { n++; best = Math.min(best, Math.hypot(x - cx, y - cy)); }
    }
    return { changed: n, nearest: Number.isFinite(best) ? best : null };
};

const results = {};
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`; results[id] = {};
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            for (let i = 0; i <= FRAMES.at(-1); i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                if (!FRAMES.includes(i)) continue;
                for (const [name, cand] of CANDS) {
                    const info = await h.page.evaluate(INFO, { cand });
                    const box = await h.page.evaluate(() => { const b = document.querySelector('canvas').getBoundingClientRect(); return { x: b.x, y: b.y }; });
                    const clip = { x: Math.max(0, info.scrT.x - 90), y: Math.max(0, info.scrT.y - 90), width: 180, height: 180 };
                    await h.page.evaluate(SHOW, { parts: info.parts, partner: info.partner, show: false });
                    const hidden = (await h.page.screenshot({ type: 'png', clip })).toString('base64');
                    await h.page.evaluate(SHOW, { parts: info.parts, partner: info.partner, show: true });
                    const shown = (await h.page.screenshot({ type: 'png', clip })).toString('base64');
                    const d = await h.page.evaluate(DIFF, { a: hidden, b: shown, cx: info.scrT.x - clip.x, cy: info.scrT.y - clip.y });
                    results[id][`f${i}.${name}`] = { onArm: info.on, torsoAlpha: info.torsoAlpha, insideTorsoSilhouette: info.torsoAlpha > 0, visibleArmPx: d.changed, nearestVisibleArmScreenPx: d.nearest === null ? null : +d.nearest.toFixed(1), nearestWorldPx: d.nearest === null ? null : +(d.nearest / info.scale).toFixed(1) };
                }
            }
            console.log(id, JSON.stringify(results[id]));
        }
    } finally { await h.close(); }
}
writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
