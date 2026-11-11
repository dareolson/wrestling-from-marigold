// PLAN_LIGHT_MOVES T2.6b: the arm bar as it is today (no changes), real `_doArmBar` on a downed man, both pairings, both facings, 1/60 s steps (loop asleep).
// A 30 fps crop of every second game frame (<framesDir>/<case>/sNNNN.jpg, normal speed) and tight stills (still-<t>.png), the same framing as ankle_lock_audit.mjs.
//   node tools/debug/arm_bar_frames.mjs <framesDir>
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, STEP } from './grapples_film.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const STILLS = [0.3, 0.9, 1.4, 1.95, 2.4, 2.7];
const SEP = 70, framesDir = process.argv[2];

const SETUP = ({ facing, sep }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234;
    Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing; a.x = 520; d.x = 520 + facing * sep * a.s;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    d.state = 'down'; d.lying = 'supine'; d.stateTimer = 99;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    a._doArmBar(d);
    return a._activeMove?.clip?.duration ?? null;
};
const TIME = () => { const sc = window.__WFM_GAME.scene.scenes[0]; return sc.w1._activeMove ? sc.w1._activeMove.time : null; };
const CROP = () => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width; const x = (sc.w1.x + sc.w2.x) / 2, y = (sc.w1.y + sc.w2.y) / 2; return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k }; };

for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`;
            const dur = await h.page.evaluate(SETUP, { facing, sep: SEP });
            mkdirSync(`${framesDir}/${id}`, { recursive: true });
            let clip = null, n = 0; const stills = new Set(); let frames = 0;
            for (let i = 0; i < 400; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const t = await h.page.evaluate(TIME);
                if (t === null) { if (frames) break; continue; }
                frames++;
                if (!clip) { const c = await h.page.evaluate(CROP); clip = { x: Math.max(0, c.x - 270), y: Math.max(0, c.y - 285), width: 540, height: 350 }; }
                if (i % 2 === 0) await h.page.screenshot({ path: `${framesDir}/${id}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
                const st = STILLS.find(s => t >= s && !stills.has(s));
                if (st !== undefined) { stills.add(st); await h.page.screenshot({ path: `${framesDir}/${id}/still-${st}.png`, clip: { x: clip.x + 90, y: clip.y + 10, width: 360, height: 330 } }); }
            }
            console.log(id, 'clip', dur, 's,', frames, 'frames');
        }
    } finally { await h.close(); }
}
