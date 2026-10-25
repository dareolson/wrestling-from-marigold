// Lying hold -> rise step probe (PLAN_GEORGE_TRANSFER T6.3, Rev 2 rise continuity).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/hold_rise_probe.mjs [out.json] [rig,rig,...] [holdSec,holdSec,...]
//
// The receiver is put on its back with the back pain a suplex leaves, a lying hold is started and stepped by
// hand (game.step, 1/60 s, tween clock pinned, Math.random seeded: the harness of rise_handoff_probe.mjs) for
// holdSec, and then the game's own tick starts the rise (`_tickSell`, `_startRiseUp`). The step is the per-part
// corner displacement (Hausdorff, rise_handoff_probe.partSteps) between the last HOLD frame and the first RISE
// frame, both facings, with the carry (the game) and without it (`_riseHold` cleared after the rise starts,
// i.e. the rise as it was before Rev 2). `natural` is the largest step between two ordinary hold frames and
// between two ordinary rise frames next to the swap, so the swap can be read against the motion around it.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';
import { INSTALL, STEP, partSteps, pointSteps } from './rise_handoff_probe.mjs';

const BEGIN_HOLD = ({ facing, lying }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = window.__rw;
    w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
    w.x = 520; w.y = 355; w.facing = facing; w.lying = lying;
    sc.w2.x = w.x + facing * 200; sc.w2.y = w.y; sc.w2.state = 'standing'; sc.w2.vx = 0; sc.w2.vy = 0;
    w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null; w._hold = null;
    w._sellArtInterrupted = null; w._sellArtSelection = null; w.skeleton.setPartVariants?.({}); w._gripLatch = null;
    w._riseFrom = 0; w._riseHold = null;
    w._pain = null; w.stamina = 100; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0;
    Object.assign(w.pose, { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6 });
    w._hurt(8, 'suplex'); w._pain.phase = 'mat'; w._pain.planned = true;
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    w._hold = { t: 0, lying };
    window.__film = { n: 0 };
    return { pain: w._pain ? { part: w._pain.part } : null };
};
const START_RISE = ({ carry }) => {
    const w = window.__rw;
    const hold = w._lyingHold();
    w._tickSell(1 / 60);                    // what tickDown does on the frame the down timer ends
    const held = w._lyingHold();
    w._startRiseUp();
    if (!carry) w._riseHold = null;
    return { hold: !!hold, w: held?.w ?? null, offsets: held?.offsets ?? null, riseHold: w._riseHold };
};

const maxOf = o => Math.max(...Object.values(o));
const worst = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
const sh = c => execSync(c, { encoding: 'utf8' }).trim();

export async function probe(rig, holdSecs, { facings = [1, -1], lying = 'supine' } = {}) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    process.env.WFM_QS = 'notitle=1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400);
        await page.evaluate(INSTALL);
        const cases = [];
        for (const facing of facings) for (const holdSec of holdSecs) for (const carry of [true, false]) {
            const begin = await page.evaluate(BEGIN_HOLD, { facing, lying });
            const hold = [];
            for (let i = 0; i < Math.round(holdSec * 60); i++) hold.push(await page.evaluate(STEP));
            const start = await page.evaluate(START_RISE, { carry });
            const rise = [];
            for (let i = 0; i < 6; i++) rise.push(await page.evaluate(STEP));
            const last = hold.at(-1), first = rise[0];
            const natHold = hold.slice(-10).slice(1).map((f, k) => maxOf(partSteps(hold.slice(-10)[k], f)));
            const natRise = rise.slice(1).map((f, k) => maxOf(partSteps(rise[k], f)));
            const swap = partSteps(last, first);
            cases.push({ rig, facing, holdSec, carry, begin, state: [last.state, first.state], riseT: first.riseT, hold: start.hold, offsets: start.offsets,
                swapMax: maxOf(swap), swapWorst: worst(swap), swapParts: swap, swapPoints: pointSteps(last, first),
                naturalHoldMax: Math.max(...natHold), naturalRiseMax: Math.max(...natRise),
                backDistLast: last.backDist, backDistFirst: first.backDist });
        }
        return cases;
    } finally { await h.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [out = 'hold-rise-probe.json', rigArg = 'thesz-procreate-v1,george-roster-v1', secArg = '0.7,1.3,2.5,3.1,5.4'] = process.argv.slice(2);
    const all = [];
    for (const rig of rigArg.split(',')) {
        const cases = await probe(rig, secArg.split(',').map(Number));
        all.push(...cases);
        for (const c of cases) console.log(`${rig} f${c.facing} hold ${c.holdSec}s ${c.carry ? 'carry' : 'no carry'}: ${c.state.join('->')} swap max ${c.swapMax} (${c.swapWorst?.join(' ')}) natural hold ${c.naturalHoldMax.toFixed(2)} rise ${c.naturalRiseMax.toFixed(2)} backDist ${c.backDistLast} -> ${c.backDistFirst}`);
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ tool: 'tools/debug/hold_rise_probe.mjs', git: sh('git rev-parse --short HEAD'), cases: all }, null, 1));
    process.exit(0);
}
