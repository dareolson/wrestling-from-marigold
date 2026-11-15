// Reference stills for George's gesture-hand art (PLAN_GEORGE_PERFORMANCE): George held in each gesture pose, both facings, the upper body
// cropped, plus the near forearm's on-screen angle. The forearm art is drawn on its own canvas and rotated by the rig, so these show the
// view the new hands must read in. `hairFarArm` is a provisional pose for the hair check (C), not choreography.
//   WFM_URL=http://localhost:5197 node tools/debug/george_arm_refs.mjs <outDir>
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const URL = process.env.WFM_URL ?? 'http://localhost:5197', out = process.argv[2];
const { CROWD_TAUNT, SUPERIORITY } = await import('../../src/animation/clips/georgeCrowdTaunt.js');
const POSES = {
    crowdPresentHold: CROWD_TAUNT.keys.hold,
    crowdRecoil: CROWD_TAUNT.keys.recoil,
    crowdDismissSweep: CROWD_TAUNT.keys.sweepMid,
    superiorityPresent: SUPERIORITY.keys.present,
    // the near arm cannot reach the hair on this flat rig (best: palm 19 px short with the elbow on the head); the FAR arm, drawn behind
    // the head, puts the palm at the crown 1.5 px from target with its elbow hidden behind the head
    hairFarArm: { rArm: 2.95, rElbow: 1.05, lArm: 0.15, lElbow: 0.8, lean: -0.06, bend: 0 },
};
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
await p.goto(`${URL}/?arena=1&notitle=1&light=v1&faces=0&p1=george-roster-v1&p2=thesz-procreate-v1`);
await p.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
const meta = {};
for (const facing of [1, -1]) for (const [name, pose] of Object.entries(POSES)) {
  const r = await p.evaluate(({ facing, pose }) => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null;
    const A = sc.w1, D = sc.w2; A.x = 480; D.x = 480 + facing * 400; A.y = D.y = 380; A.facing = facing; A.state = 'taunting';
    Object.assign(A.pose, pose); A._choreoUntil = sc.time.now + 1e9; A.combatBlend = 0;
    let T = sc.time.now; for (let i = 0; i < 3; i++) { T += 1000 / 60; g.step(T, 1000 / 60); A.facing = facing; Object.assign(A.pose, pose); }
    const side = pose.rArm > 1.5 ? (A.skeleton.lChannelSide(A.facing) === 'near' ? 'far' : 'near') : A.skeleton.lChannelSide(A.facing), P = A.skeleton.jointAttachmentPoints, e = P[`${side}Elbow`], w = P[`${side}Wrist`];
    const c = sc.game.canvas.getBoundingClientRect(), k = c.width / sc.scale.width;
    return { clip: { x: c.left + (A.x - 85) * k, y: c.top + (A.y - 215) * k, width: 170 * k, height: 130 * k },
      forearmDeg: +(Math.atan2(w.y - e.y, (w.x - e.x) * facing) * 180 / Math.PI).toFixed(1), wristAboveFeetPx: +(A.y - w.y).toFixed(1), side }; }, { facing, pose });
  await p.screenshot({ path: `${out}/${name}_${facing > 0 ? 'R' : 'L'}.png`, clip: r.clip });
  meta[`${name}_${facing > 0 ? 'R' : 'L'}`] = { forearmDegFromForwardDown: r.forearmDeg, wristAboveFeetPx: r.wristAboveFeetPx, armSlot: r.side };
}
writeFileSync(`${out}/poses.json`, JSON.stringify({ poses: POSES, measured: meta }, null, 1));
console.log(JSON.stringify(meta));
await b.close();
