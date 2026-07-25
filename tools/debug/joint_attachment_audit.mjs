// Verifies that every articulated child part covers its true parent joint
// for George and Lou Thesz across extreme upright poses, both facings, and
// the grounded/get-up sequence.
//
//   node tools/debug/joint_attachment_audit.mjs
//
// This is a geometry contract check. Positive margin means the joint is
// inside the child's render box; zero is a fragile butt-joint; negative is a
// structural detachment. Cutter verification separately checks that the
// authored joint row contains opaque art.

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';

const MIN_MARGIN = 0.5;
const UPRIGHT_POSES = [
    'powerIdle',
    'theszIdle',
    'block',
    'axeHandleUp',
    'armBarLock',
    'hammerlockCrank',
];
const GET_UP_SAMPLES = [0, 0.34, 0.72, 1];

let failed = 0;

for (const character of ['george', 'thesz']) {
    process.env.WFM_P1 = character;
    process.env.WFM_P2 = character === 'george' ? 'thesz' : 'george';
    const h = await launch();
    await h.page.waitForTimeout(300);

    for (const facing of [-1, 1]) {
        for (const poseName of UPRIGHT_POSES) {
            const margins = await h.page.evaluate(({ facing, pose }) => {
                const sc = window.__WFM_GAME.scene.scenes[0];
                const w = sc.w1;
                w.state = 'standing';
                w.facing = facing;
                w.pose = { ...pose };
                w.vx = 0;
                w.vy = 0;
                w.moveBlend = 1;
                w.draw();
                return w.skeleton.jointAttachmentMargins;
            }, { facing, pose: POSES[poseName] });
            check(character, `facing ${facing} / ${poseName}`, margins);
        }

        for (const riseT of GET_UP_SAMPLES) {
            const margins = await h.page.evaluate(({ facing, riseT }) => {
                const sc = window.__WFM_GAME.scene.scenes[0];
                const w = sc.w1;
                w.state = 'gettingUp';
                w.facing = facing;
                w.riseT = riseT;
                w.draw();
                return w.skeleton.jointAttachmentMargins;
            }, { facing, riseT });
            check(character, `facing ${facing} / get-up ${riseT}`, margins);
        }
    }

    await h.close();
}

function check(character, sample, margins) {
    const bad = Object.entries(margins ?? {}).filter(([, v]) => v.min < MIN_MARGIN);
    if (bad.length) {
        failed++;
        const detail = bad.map(([joint, v]) => `${joint}=${v.min.toFixed(2)}`).join(', ');
        console.log(`FAIL  ${character} / ${sample}: ${detail}`);
        return;
    }
    const min = Math.min(...Object.values(margins).map(v => v.min));
    console.log(`PASS  ${character} / ${sample}: min ${min.toFixed(2)}px`);
}

delete process.env.WFM_P1;
delete process.env.WFM_P2;
process.exit(failed ? 1 : 0);
