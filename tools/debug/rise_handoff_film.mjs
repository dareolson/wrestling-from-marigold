// G5 film: the stand-up, frame by frame, default vs ?risefix=1 (PLAN_RISE_HANDOFF T3.1).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/rise_handoff_film.mjs [outRoot] [row,row,...|all]
//
// Same forced rises and fixed 1/60 s stepping as rise_handoff_probe.mjs. For each row x facing x column it
// screenshots every step from 250 ms before the swap to 400 ms after it and writes
// <outRoot>/<column>/<row>-<l|r>/{manifest.json, strip/}, in the shape tools/debug/g4_package.py reads
// (events.swap is t0; samples carry the per-frame largest part step as `step`).
//   column: default (?risefix=off, the pre-fix look) | risefix (?risefix=1)        l = receiver facing -1, r = facing +1
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP, partSteps } from './rise_handoff_probe.mjs';

// risefix is default-on (Derek 2026-10-25): the `default` (pre-fix) column asks for risefix=off explicitly.
export const COLUMNS = { default: 'risefix=off', risefix: 'risefix=1' };
// opp 'behind' is where a suplex thrower stands: the receiver turns on the first standing frame
export const ROWS = {
    'lou-suplex':        { rig: 'thesz-procreate-v1', kind: 'gettingUp', lying: 'supine', pain: true, opp: 'behind', label: 'Lou, suplex receiver (thrower behind: he turns)' },
    'lou-supine':        { rig: 'thesz-procreate-v1', kind: 'gettingUp', lying: 'supine', pain: false, opp: 'front', label: 'Lou, from his back (opponent in front: no turn)' },
    'lou-prone':         { rig: 'thesz-procreate-v1', kind: 'gettingUp', lying: 'prone', pain: false, opp: 'front', label: 'Lou, from his front (no turn)' },
    'george-supine':     { rig: 'george-roster-v1', kind: 'gettingUp', lying: 'supine', pain: false, opp: 'front', label: 'George, from his back (no turn)' },
    'george-prone':      { rig: 'george-roster-v1', kind: 'gettingUp', lying: 'prone', pain: false, opp: 'front', label: 'George, from his front (no turn)' },
    'george-suplex':     { rig: 'george-roster-v1', kind: 'gettingUp', lying: 'supine', pain: false, opp: 'behind', label: 'George, from his back (opponent behind: he turns)' },
    'lou-quick':         { rig: 'thesz-procreate-v1', kind: 'quick', lying: 'supine', pain: false, opp: 'front', label: 'Lou, quick rise from the possum (no turn)' },
};
const PRE_MS = 250, POST_MS = 400, STEP_MS = 1000 / 60;
const gitInfo = () => { const sh = c => execSync(c, { encoding: 'utf8' }).trim();
    return { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain --untracked-files=no') !== '' }; };

async function filmRig(rig, column, rows, outRoot) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    process.env.WFM_QS = ['notitle=1', COLUMNS[column]].filter(Boolean).join('&');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400);
        await page.evaluate(INSTALL);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
            const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = { x: 0, y: 0, width: 300, height: 330 };
        clip.x = Math.round(box.x + 520 * box.w / box.gw - 150); clip.y = Math.round(box.y + (355 + 30) * box.h / box.gh - 330);
        for (const [name, row] of rows) for (const facing of [-1, 1]) {
            const dir = join(outRoot, column, `${name}-${facing < 0 ? 'l' : 'r'}`);
            rmSync(dir, { recursive: true, force: true }); mkdirSync(join(dir, 'strip'), { recursive: true });
            await page.evaluate(BEGIN, { ...row, facing, pose: 'stale' });
            const frames = [];
            let swap = null, riseStart = null, prev = null;
            for (let i = 0; i < 400; i++) {
                const f = await page.evaluate(STEP);
                if (riseStart === null) riseStart = { gameMs: f.now, step: i };
                if (swap === null && f.state === 'standing') swap = { gameMs: f.now, step: i, facing: f.facing };
                const turned = prev && prev.facing !== f.facing;
                const rec = { i, now: f.now, state: f.state, facing: f.facing, backDist: f.backDist, riseT: f.riseT,
                    // `step`: largest part step from the previous frame with the facing mirror taken out; `rawStep`: as drawn
                    step: prev ? +Math.max(...Object.values(partSteps(prev, f, turned ? prev.x : null))).toFixed(2) : 0,
                    rawStep: prev ? +Math.max(...Object.values(partSteps(prev, f))).toFixed(2) : 0,
                    file: `s${String(i).padStart(4, '0')}.jpg` };
                prev = f;
                // shoot only the stretch the strip keeps: the last part of the rise and 400 ms of standing
                if (f.state === 'risingUp' || f.state === 'standing' || (f.state === 'gettingUp' && f.riseT >= 0.55)) {
                    await page.screenshot({ path: join(dir, 'strip', rec.file), type: 'jpeg', quality: 90, clip });
                    frames.push(rec);
                }
                if (swap !== null && f.now - swap.gameMs >= POST_MS) break;
            }
            if (!swap) throw new Error(`${name}: no swap`);
            const kept = frames.filter(r => r.now - swap.gameMs >= -PRE_MS - 1);
            const keepSet = new Set(kept.map(r => r.file));
            for (const r of frames) if (!keepSet.has(r.file)) rmSync(join(dir, 'strip', r.file), { force: true });
            const rel = r => +(r.now - swap.gameMs).toFixed(2);
            const manifest = {
                tool: 'tools/debug/rise_handoff_film.mjs', git: gitInfo(), scenario: `${name}-${facing < 0 ? 'l' : 'r'}`, config: column,
                urlFlags: COLUMNS[column], row: { name, ...row }, receiverFacing: { atImpact: facing, afterSwap: swap.facing },
                events: { riseStart: { gameMs: riseStart.gameMs, relImpactMs: +(riseStart.gameMs - swap.gameMs).toFixed(2) },
                    swap: { gameMs: swap.gameMs, relImpactMs: 0, step: swap.step - frames[0].i } },
                frames: kept.map(r => ({ file: `strip/${r.file}`, gameMs: r.now, relImpactMs: rel(r), step: r.step, rawStep: r.rawStep })),
                samples: kept.map(r => ({ rel: rel(r), state: r.state, riseT: r.state === 'gettingUp' ? r.riseT : null, facing: r.facing,
                    backDist: r.backDist, nearForearm: null, step: r.step, rawStep: r.rawStep })),
            };
            writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
            const at = kept.find(r => rel(r) === 0);
            console.log(`[film] ${column}/${name}-${facing < 0 ? 'l' : 'r'}: ${kept.length} frames, swap step ${at?.step} px (raw ${at?.rawStep}), turned ${swap.facing !== facing}`);
        }
    } finally { await h.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/rise-handoff-2026-10/g5-film', rowArg = 'all'] = process.argv.slice(2);
    const names = rowArg === 'all' ? Object.keys(ROWS) : rowArg.split(',');
    for (const column of Object.keys(COLUMNS)) {
        const byRig = new Map();
        for (const n of names) { const r = ROWS[n]; byRig.set(r.rig, [...(byRig.get(r.rig) ?? []), [n, r]]); }
        for (const [rig, rows] of byRig) await filmRig(rig, column, rows, outRoot);
    }
    process.exit(0);
}
