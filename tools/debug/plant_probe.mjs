// T4c.4i: do the thrower's soles hold in the snapmare? Plays the snapmare (the `reverse` case) on both pairs and facings and reads the thrower's two painted soles
// after each step (Skeleton.soleWorld, read after the whole frame, so it sees what the solve's later redraws did): excursion from the
// held point and the largest frame step inside each plant window, the solve's own residual and whether the capture frame was on the mat. Raw px at the game's scale.
//   WFM_URL=http://localhost:5173 node tools/debug/plant_probe.mjs [--json out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';
import { SNAPMARE } from '../../src/animation/waistlockThrows.js';
import { snapmareClip } from '../../src/animation/clips/snapmare.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const out = [];
for (const [label, att, def] of [['Lou on George', LOU, GEORGE], ['George on Lou', GEORGE, LOU]]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        for (const facing of [-1, 1]) {
            const rows = await film(h.page, info, { facing, case: 'reverse', rev: 6 }, null, { quiet: 8 });
            const clipRows = rows.filter(r => r.t.clip === 'snapmare');
            // the post-step sole (Skeleton.soleWorld: the painted anchor through the shin's live transform; the art variant in use sets the anchor, so a static anchor read
            // off the idle pose, as the quad method of throw_support_review.mjs does, is wrong on the frames that swap art)
            const point = (r, name) => r.soles[1][name === 'near' ? 0 : 1];
            const R = SNAPMARE.reach, I = SNAPMARE.land;
            if (process.env.PLANT_SERIES) for (const r of clipRows.filter(r => r.t.time > R && r.t.time < I + 0.3)) { const q = point(r, 'near'); console.log('  t', r.t.time.toFixed(3), 'near sole', q.x.toFixed(1), q.y.toFixed(1), 'plant', JSON.stringify(r.t.plant?.[0] ?? null), 'post', JSON.stringify(r.soles[1][0] && { x: +r.soles[1][0].x.toFixed(1), y: +r.soles[1][0].y.toFixed(1) })); }
            const windows = { 'reach-end..landing': [R + 0.03, I], 'whole plant (R+.03..I+.15)': [R + 0.03, I + 0.15] };
            for (const [name, [a, b]] of Object.entries(windows)) {
                const ph = clipRows.filter(r => r.t.time >= a && r.t.time <= b);
                for (const foot of ['near', 'far']) {
                    const p0 = point(ph[0], foot);
                    const exc = Math.max(...ph.map(r => Math.hypot(point(r, foot).x - p0.x, point(r, foot).y - p0.y)));
                    const step = Math.max(...ph.slice(1).map((r, k) => Math.hypot(point(r, foot).x - point(ph[k], foot).x, point(r, foot).y - point(ph[k], foot).y)));
                    out.push({ label, facing, window: name, foot, excursion: +exc.toFixed(1), maxStep: +step.toFixed(2) });
                    console.log(`${label.padEnd(14)} ${facing < 0 ? 'L' : 'R'} ${name.padEnd(27)} ${foot.padEnd(4)} sole excursion ${exc.toFixed(1).padStart(6)} px, max step ${step.toFixed(2)} px/frame`);
                }
            }
            // near-knee height over the mat at the impact (the lower knee, against the held sole's height), release time and the step out after it
            const at = (t) => clipRows.reduce((m, r) => (Math.abs(r.t.time - t) < Math.abs(m.t.time - t) ? r : m));
            const imp = at(I), mat = point(at(R + 0.04), 'near').y;
            const kneeH = Math.max(...['nearKnee', 'farKnee'].map(k => mat - imp.d.pts[k].y)), lowKnee = Math.min(...['nearKnee', 'farKnee'].map(k => mat - imp.d.pts[k].y));
            const rel = snapmareClip.plants[0].out, afterWin = clipRows.filter(r => r.t.time >= rel[0]);
            const stepOut = Math.max(...afterWin.map(r => Math.hypot(point(r, 'near').x - point(afterWin[0], 'near').x, point(r, 'near').y - point(afterWin[0], 'near').y)));
            console.log(`${label.padEnd(14)} ${facing < 0 ? 'L' : 'R'} at the impact the knees are ${lowKnee.toFixed(1)} / ${kneeH.toFixed(1)} px over the held sole's height; the forward foot is released ${rel[0].toFixed(3)}-${rel[1].toFixed(3)} s; it moves ${stepOut.toFixed(1)} px after the release starts`);
            const logs = clipRows.flatMap(r => r.t.plant ?? []);
            const err = Math.max(0, ...logs.map(l => l.err)), firstOn = ['0', '1'].map(i => logs.find(l => String(l.i) === i)?.onMat);
            console.log(`${label.padEnd(14)} ${facing < 0 ? 'L' : 'R'} solve residual max ${err.toFixed(2)} px over ${logs.length} plant-frames; capture-frame sole height off the mat (leg l, r): ${firstOn.join(', ')} px`);
            out.push({ label, facing, residualMax: err, captureOffMat: firstOn });
        }
    } finally { await h.close(); }
}
const i = process.argv.indexOf('--json'); if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify(out, null, 1) + '\n');
