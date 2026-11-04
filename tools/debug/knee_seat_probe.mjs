// T4c.4j: does the atomic drop land on a bent knee? Plays the drop (nobody reverses) on both pairs and facings and reports, from the stepped film:
// the seat-to-knee gap per frame (the carry's own log: his seat, Skeleton.seatWorld, against the top of the raised thigh's knee end) from the hitch's start to the recoil, the first
// frame the gap is under CONTACT px, the raised thigh's angle from vertical and the shin's fold at that frame (drawn joints), the support sole's drift in its plant (the soles after the step),
// and the damage marker's frame against first contact. Raw px / rad / s.
//   WFM_URL=http://localhost:5173 node tools/debug/knee_seat_probe.mjs [--series] [--json out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';

const CONTACT = 3, LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', out = [];
for (const [label, att, def] of [['Lou on George', LOU, GEORGE], ['George on Lou', GEORGE, LOU]]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        for (const facing of [-1, 1]) {
            const rows = await film(h.page, info, { facing, case: 'drop', rev: 6 }, null, { quiet: 8 });
            const clip = rows.filter(r => r.t.clip === 'atomicDrop');
            const T = ATOMIC.lift + ATOMIC.hitch, I = ATOMIC.impact;
            const gaps = clip.map(r => ({ t: r.t.time, g: r.t.carry?.find(c => c.i === 1)?.gap ?? null, w: r.t.carry?.find(c => c.i === 1)?.w ?? 0, r })).filter(x => x.g !== null);
            if (process.env.SERIES || process.argv.includes('--series')) for (const x of gaps.filter(x => x.t >= T - 0.1 && x.t <= I + 0.3)) console.log(`  t ${x.t.toFixed(3)} gap ${x.g.toFixed(1)} w ${x.w}`);
            const first = gaps.find(x => x.g < CONTACT);
            // the raised leg: the attacker's knee that is higher
            const kneeInfo = (r) => {
                const p = r.a.pts, f = r.a.facing, leg = (side) => { const hip = p[`${side}Hip`], k = p[`${side}Knee`], an = p[`${side}Ankle`]; return { side, th: Math.atan2(k.x - hip.x, k.y - hip.y) * f, sh: Math.atan2(an.x - k.x, an.y - k.y) * f, ank: (an.x - k.x) * f }; };
                const a = ['near', 'far'].map(leg).reduce((m, l) => (Math.abs(l.th) > Math.abs(m.th) ? l : m));
                return { side: a.side, thighFromVertical: +Math.abs(a.th).toFixed(2), fold: +(a.th - a.sh).toFixed(2), shinFromVertical: +a.sh.toFixed(2), ankleAheadOfKnee: +a.ank.toFixed(1) };
            };
            const events = rows.flatMap(r => (r.events ?? []).filter(e => e.type === 'move' || e.type === 'atomicDrop').map(e => ({ t: r.t.time, e: e.type })));
            const minGap = gaps.filter(x => x.t >= T && x.t <= I + 0.12).reduce((m, x) => (x.g < m.g ? x : m), { g: Infinity });
            const hold = gaps.filter(x => first && x.t >= first.t && x.t <= first.t + 0.12).map(x => x.g);
            // the support (r channel) sole: after the step, via Skeleton.soleWorld (a: the attacker); both soles, the one that drifts least is the planted one
            const win = clip.filter(r => r.t.time >= ATOMIC.lift - 0.2 && r.t.time <= I + 0.2);
            const drift = [0, 1].map(k => Math.max(...win.map(r => Math.hypot(r.soles[0][k].x - win[0].soles[0][k].x, r.soles[0][k].y - win[0].soles[0][k].y))));
            const step = [0, 1].map(k => Math.max(...win.slice(1).map((r, i) => Math.hypot(r.soles[0][k].x - win[i].soles[0][k].x, r.soles[0][k].y - win[i].soles[0][k].y))));
            const res = { label, facing, firstContact: first?.t ?? null, impactConst: I, minGapBeforeRecoil: +minGap.g.toFixed(1), gapsHeld: hold.map(g => +g.toFixed(1)), knee: first ? kneeInfo(first.r) : null,
                supportSoleDrift: drift.map(v => +v.toFixed(1)), supportSoleMaxStep: step.map(v => +v.toFixed(2)), events: events.slice(0, 3) };
            out.push(res);
            console.log(`${label.padEnd(14)} ${facing < 0 ? 'L' : 'R'} first contact (gap < ${CONTACT} px) ${first ? first.t.toFixed(3) : 'NEVER'} s vs ATOMIC.impact ${I}; min gap before recoil ${minGap.g.toFixed(1)} px; the 8 frames from contact ${hold.map(g => g.toFixed(1)).join('/')}; thigh/fold at contact ${first ? JSON.stringify(kneeInfo(first.r)) : '-'}; sole drift (near/far) ${drift.map(v => v.toFixed(1)).join('/')} px, max step ${step.map(v => v.toFixed(2)).join('/')}`);
        }
    } finally { await h.close(); }
}
const i = process.argv.indexOf('--json'); if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify(out, null, 1) + '\n');
