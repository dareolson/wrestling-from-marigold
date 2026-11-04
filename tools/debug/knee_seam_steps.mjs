// T4c.4h step 5: the frame-to-frame step of each leg joint (hip, knee, ankle, both legs, px) around the seams of the atomic drop and the snapmare:
// the first clip frames (the lead-in out of the hold / the drop's reversal) and the frames after the clip ends. Both attackers, both facings, as played.
//   WFM_URL=http://localhost:5173 node tools/debug/knee_seam_steps.mjs
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';

const LIM = 2.5;
const JOINTS = ['nearKnee', 'farKnee', 'nearAnkle', 'farAnkle'];
for (const [label, att, def] of [['Lou on George', 'thesz-procreate-v1', 'george-roster-v1'], ['George on Lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        for (const facing of [-1, 1]) for (const cs of ['drop', 'reverse']) {
            const rows = await film(h.page, info, { facing, case: cs, rev: 6 }, null, { quiet: 12 });
            const clip = cs === 'drop' ? 'atomicDrop' : 'snapmare';
            const first = rows.findIndex(r => r.t.clip === clip), last = rows.length - 1 - [...rows].reverse().findIndex(r => r.t.clip === clip);
            const step = (side, i) => Math.max(...JOINTS.map(j => { const p = rows[i - 1]?.[side]?.pts?.[j], q = rows[i][side]?.pts?.[j]; return p && q ? Math.hypot(q.x - p.x, q.y - p.y) : 0; }));
            for (const [side, who] of [['a', 'attacker'], ['d', 'defender']]) {
                const entry = [0, 1, 2, 3].map(k => step(side, first + k)), exit = [1, 2, 3, 4].map(k => rows[last + k] ? step(side, last + k) : NaN);
                const inside = rows.slice(first + 4, last + 1).map((_, k) => step(side, first + 4 + k));
                const worst = Math.max(...inside), at = first + 4 + inside.indexOf(worst);
                console.log(`${label} ${facing < 0 ? 'L' : 'R'} ${cs.padEnd(7)} ${who.padEnd(8)} entry ${entry.map(v => v.toFixed(1)).join('/')}  exit ${exit.map(v => v.toFixed(1)).join('/')}  worst inside ${worst.toFixed(1)} at clip frame ${at - first}${worst > LIM ? '  (> ' + LIM + ')' : ''}`);
            }
        }
    } finally { await h.close(); }
}
