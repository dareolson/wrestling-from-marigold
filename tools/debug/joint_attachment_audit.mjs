// Verifies that every articulated child part covers its true parent joint
// for George and Lou Thesz across extreme upright poses, both facings, and
// the grounded/get-up sequence.
//
//   node tools/debug/joint_attachment_audit.mjs
//
// This is an art-aware check: it inverse-transforms world samples into each
// rendered PNG and measures the nearest opaque parent/child pixels around the
// true joint. A display rectangle containing the joint is not enough — the
// old audit made that mistake and passed transparent gaps.

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';

const MAX_INK_GAP = 2.5;
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
    await h.page.evaluate(() => {
        const texturePixels = new Map();
        const JOINT_PARTS = {
            neck:         ['torso',     'head'],
            farShoulder:  ['torso',     'farUpArm'],
            nearShoulder: ['torso',     'nearUpArm'],
            farElbow:     ['farUpArm',  'farForearm'],
            nearElbow:    ['nearUpArm', 'nearForearm'],
            farHip:       ['torso',     'farThigh'],
            nearHip:      ['torso',     'nearThigh'],
            farKnee:      ['farThigh',  'farShin'],
            nearKnee:     ['nearThigh', 'nearShin'],
        };

        function pixelsFor(img) {
            const key = img.texture.key;
            if (texturePixels.has(key)) return texturePixels.get(key);
            const source = img.texture.getSourceImage();
            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(source, 0, 0);
            const pixels = { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
            texturePixels.set(key, pixels);
            return pixels;
        }

        function opaqueAt(img, wx, wy) {
            if (!img?.texture || img.texture.key === 'sk_pixel') return true;
            const dx = wx - img.x;
            const dy = wy - img.y;
            const c = Math.cos(img.rotation);
            const s = Math.sin(img.rotation);
            const lx = c * dx + s * dy;
            const ly = -s * dx + c * dy;
            let u = lx / img.displayWidth + img.originX;
            const v = ly / img.displayHeight + img.originY;
            if (img.flipX) u = 1 - u;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
            const frame = img.frame;
            const px = Math.max(0, Math.min(frame.cutWidth - 1, Math.floor(u * frame.cutWidth)));
            const py = Math.max(0, Math.min(frame.cutHeight - 1, Math.floor(v * frame.cutHeight)));
            const pixels = pixelsFor(img);
            const sx = frame.cutX + px;
            const sy = frame.cutY + py;
            return pixels.data[(sy * pixels.width + sx) * 4 + 3] >= 32;
        }

        function inkNear(img, joint, radius = 14) {
            const points = [];
            const x0 = Math.floor(joint.x - radius), x1 = Math.ceil(joint.x + radius);
            const y0 = Math.floor(joint.y - radius), y1 = Math.ceil(joint.y + radius);
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    if ((x - joint.x) ** 2 + (y - joint.y) ** 2 > radius ** 2) continue;
                    if (opaqueAt(img, x + 0.5, y + 0.5)) points.push([x, y]);
                }
            }
            return points;
        }

        window.__auditJointInk = (sk) => {
            const out = {};
            for (const [name, [parentName, childName]] of Object.entries(JOINT_PARTS)) {
                const joint = sk.jointAttachmentPoints?.[name];
                if (!joint) continue;
                const a = inkNear(sk[parentName], joint);
                const b = inkNear(sk[childName], joint);
                let gap = Infinity;
                for (const [ax, ay] of a) {
                    for (const [bx, by] of b) {
                        const d = Math.hypot(ax - bx, ay - by);
                        if (d < gap) gap = d;
                        if (gap === 0) break;
                    }
                    if (gap === 0) break;
                }
                out[name] = { inkGap: gap, parentPixels: a.length, childPixels: b.length };
            }
            return out;
        };
    });

    for (const facing of [-1, 1]) {
        for (const poseName of UPRIGHT_POSES) {
            const result = await h.page.evaluate(({ facing, pose }) => {
                const sc = window.__WFM_GAME.scene.scenes[0];
                const w = sc.w1;
                w.state = 'standing';
                w.facing = facing;
                w.pose = { ...pose };
                w.vx = 0;
                w.vy = 0;
                w.moveBlend = 1;
                w.draw();
                return window.__auditJointInk(w.skeleton);
            }, { facing, pose: POSES[poseName] });
            check(character, `facing ${facing} / ${poseName}`, result);
        }

        for (const riseT of GET_UP_SAMPLES) {
            const result = await h.page.evaluate(({ facing, riseT }) => {
                const sc = window.__WFM_GAME.scene.scenes[0];
                const w = sc.w1;
                w.state = 'gettingUp';
                w.facing = facing;
                w.riseT = riseT;
                w.draw();
                return window.__auditJointInk(w.skeleton);
            }, { facing, riseT });
            check(character, `facing ${facing} / get-up ${riseT}`, result);
        }
    }

    await h.close();
}

function check(character, sample, result) {
    const bad = Object.entries(result ?? {}).filter(([, v]) => !Number.isFinite(v.inkGap) || v.inkGap > MAX_INK_GAP);
    if (bad.length) {
        failed++;
        const detail = bad.map(([joint, v]) => `${joint}=${Number.isFinite(v.inkGap) ? v.inkGap.toFixed(2) : 'no ink'}`).join(', ');
        console.log(`FAIL  ${character} / ${sample}: ${detail}`);
        return;
    }
    const max = Math.max(...Object.values(result).map(v => v.inkGap));
    console.log(`PASS  ${character} / ${sample}: max ink gap ${max.toFixed(2)}px`);
}

delete process.env.WFM_P1;
delete process.env.WFM_P2;
process.exit(failed ? 1 : 0);
