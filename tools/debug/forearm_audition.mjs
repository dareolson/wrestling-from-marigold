// Audition forearm donors on Procreate Lou in real game frames.
//
//   node tools/debug/forearm_audition.mjs <dir>
//
// <dir> holds the donors already resized onto the runtime forearm's exact
// 117x351 canvas (whole-canvas scaling, never tight-bbox), named as in `names`
// below. Pauses the live scene mid-hammerlock (Lou on George, facing right)
// and at idle/lockup with George moved away, swaps the forearm sprite's
// texture, and renders the real sprites at 3x without the broadcast filter.
// Writes hl-R-*, theszProcreateIdle-*, lockup-* PNGs into <dir>.
// Nothing in the game changes. Facing-left hammerlock is not captured.
import { launch } from './harness.mjs';
import { readFile } from 'node:fs/promises';
const OUT = process.argv[2];
const names = ['forearm-palm-donor-v1','forearm-palm-donor-v2','forearm-palm-donor-v3','forearm-grip-donor-v1'];
const b64 = {};
for (const n of names) b64[n] = 'data:image/png;base64,' + (await readFile(`${OUT}/${n}.png`)).toString('base64');
process.env.WFM_P1 = 'thesz-procreate-v1';
process.env.WFM_P2 = 'george';
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1, null, { timeout: 30000 });
    await h.page.waitForTimeout(10000); // intro card
    await h.page.evaluate(async (b64) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        for (const [k, src] of Object.entries(b64)) {
            const img = new Image(); img.src = src; await img.decode();
            sc.textures.addImage('aud_' + k, img);
        }
    }, b64);

    // Frame helper: crop around both wrestlers in screen space.
    const crop = () => h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main;
        const r = sc.game.canvas.getBoundingClientRect();
        const k = r.width / sc.game.config.width;
        const sx = x => r.left + (x - cam.worldView.x) * cam.zoom * k;
        const sy = y => r.top + (y - cam.worldView.y) * cam.zoom * k;
        const xs = [sc.w1.x, sc.w2.x], y = Math.max(sc.w1.y, sc.w2.y);
        const x0 = sx(Math.min(...xs)) - 110, x1 = sx(Math.max(...xs)) + 110;
        const y1 = sy(y) + 25, y0 = y1 - 300;
        return { x: Math.max(0, x0), y: Math.max(0, y0), width: x1 - x0, height: y1 - y0 };
    });
    const swap = (part, key) => h.page.evaluate(({ part, key }) => {
        const sk = window.__WFM_GAME.scene.scenes[0].w1.skeleton;
        const img = sk[part];
        img._audOrig ??= img.texture.key;
        img.setTexture(key ?? img._audOrig);
    }, { part, key });


    const shot = async (file) => {
        const url = await h.page.evaluate(() => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const parts = (window.__AUD_SOLO ? [...sc.w1.skeleton._parts] : [...sc.w1.skeleton._parts, ...sc.w2.skeleton._parts]).filter(i => i?.visible && i.texture);
            const K = 3, cx = window.__AUD_SOLO ? sc.w1.x : (sc.w1.x + sc.w2.x) / 2, by = Math.max(sc.w1.y, sc.w2.y) + 12;
            const W = 520, H = 640;
            const c = document.createElement('canvas'); c.width = W; c.height = H;
            const g = c.getContext('2d'); g.fillStyle = '#5a6672'; g.fillRect(0, 0, W, H);
            g.setTransform(K, 0, 0, K, W / 2 - cx * K, H - by * K);
            for (const img of parts.sort((a, b) => a.depth - b.depth)) {
                const m = img.getWorldTransformMatrix(), f = img.frame;
                g.save(); g.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                g.translate(-img.displayOriginX, -img.displayOriginY);
                if (img.flipX) { g.translate(f.cutWidth, 0); g.scale(-1, 1); }
                if (img.flipY) { g.translate(0, f.cutHeight); g.scale(1, -1); }
                g.globalAlpha = img.alpha ?? 1;
                g.drawImage(img.texture.getSourceImage(), f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
                g.restore();
            }
            return c.toDataURL('image/png');
        });
        const { writeFile } = await import('node:fs/promises');
        await writeFile(file, Buffer.from(url.split(',')[1], 'base64'));
    };
    // 1) Hammerlock: Lou (w1) on George, paused deep in the hold.
    for (const facing of [1]) {
        await h.page.evaluate((facing) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            if (sc.scene.isPaused()) sc.scene.resume();
            const a = sc.w1, d = sc.w2;
            a.cancelActiveMove?.(); d.cancelActiveMove?.();
            a.x = 480; a.y = 330; d.x = 480 + facing * 40; d.y = 330;
            a.facing = facing; d.facing = -facing;
            a.state = 'lockup'; d.state = 'lockup';
            a._doHammerlock(d);
        }, facing);
        await h.page.waitForTimeout(850);
        await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].scene.pause());
        await h.page.waitForTimeout(100);
        console.log('hold', facing, await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return [sc.w1.state, sc.w2.state, sc.w1.pose.lArm?.toFixed(2), sc.w1.pose.lElbow?.toFixed(2)].join(' '); }));
        const working = facing > 0 ? 'nearForearm' : 'farForearm';
        const clip = await crop();
        await swap(working, null);
        await h.page.waitForTimeout(80);
        await shot(`${OUT}/hl-${facing > 0 ? 'R' : 'L'}-current.png`);
        for (const n of names) {
            await swap(working, 'aud_' + n);
            await h.page.waitForTimeout(80);
            await shot(`${OUT}/hl-${facing > 0 ? 'R' : 'L'}-${n}.png`);
        }
        await swap(working, null);
    }

    // 2) Guard / lockup-reach poses for the palm fists, far arm (the one that faces the camera palm-side).
    for (const pose of ['theszProcreateIdle', 'lockup']) {
        await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; if (sc.scene.isPaused()) sc.scene.resume(); window.__AUD_SOLO = true; });
        await h.page.waitForTimeout(1800); // let the hold release
        await h.page.evaluate((pose) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.w1.x = 560; sc.w1.y = 330; sc.w2.x = 250; sc.w2.y = 300;
            sc.w1.facing = 1; sc.w1.state = 'idle';
            sc.w1._lockPose = pose; sc.w1.tweenPose(pose, 0);
        }, pose);
        await h.page.waitForTimeout(250);
        console.log('pose', pose, await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return [sc.w1.state, sc.w1.facing, sc.w1.x|0, sc.w2.x|0].join(' '); }));
        await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].scene.pause());
        await h.page.waitForTimeout(100);
        const clip = await crop();
        await swap('farForearm', null);
        await h.page.waitForTimeout(80);
        await shot(`${OUT}/${pose}-current.png`);
        for (const n of names) {
            await swap('farForearm', 'aud_' + n);
            await h.page.waitForTimeout(80);
            await shot(`${OUT}/${pose}-${n}.png`);
        }
        await swap('farForearm', null);
    }
} finally { await h.close(); }
console.log('done');
