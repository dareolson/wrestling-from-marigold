// How many pixels of the near forearm are visibly drawn inside the torso's painted art right now (PLAN_GEORGE_TRANSFER Rev 3 D11).
// Rendered, not computed: the canvas region `clip` (page px) is screenshotted with the forearm visible twice (to find the canvas's own
// per-frame speckle) and with it hidden; the pixels that change when it is hidden are the forearm's visible pixels, each mapped
// through the camera back to world space and looked up in the torso alpha (rig/silhouette.js: alpha >= 128, and the painted interior
// alpha >= 250), with how deep inside the art the leaked pixels are (the distance to the nearest unpainted pixel; the edge pixels of any
// torso are partly transparent, so a ring along the outline is expected). Works on any frame of the match (player 1 is the wrestler).
export async function countForearmInside(page, clip, who = 'w1', debug = null) {
    await page.evaluate(async () => { window.__sil ??= await import('/src/rig/silhouette.js'); });
    // A film puts the game loop to sleep and steps it by hand, so nothing re-renders between steps: draw the frame again ourselves
    // (no update: the state does not move) after each change of visibility.
    const render = () => page.evaluate(() => { const g = window.__WFM_GAME, r = g.renderer; r.preRender(); g.events.emit('prerender', r, 0, 0); g.scene.render(r); r.postRender(); g.events.emit('postrender', r, 0, 0); });
    const shot = async () => { await render(); return (await page.screenshot({ clip })).toString('base64'); };
    const s1 = await shot(), s2 = await shot();
    await page.evaluate(who => { window.__WFM_GAME.scene.scenes[0][who].skeleton.nearForearm.setVisible(false); }, who);
    const s3 = await shot();
    await page.evaluate(who => { window.__WFM_GAME.scene.scenes[0][who].skeleton.nearForearm.setVisible(true); }, who);
    await render();
    const result = await page.evaluate(async ({ s1, s2, s3, clip, who }) => {
        const sc = window.__WFM_GAME.scene.scenes[0], sk = sc[who].skeleton, cam = sc.cameras.main, g = window.__WFM_GAME.scale.gameSize;
        const box = document.querySelector('canvas').getBoundingClientRect();
        const load = async b64 => { const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
        const [A, B, C] = await Promise.all([load(s1), load(s2), load(s3)]);
        const sil = window.__sil.silhouetteOf(sk.torso), deepSil = window.__sil.silhouetteOf(sk.torso, 250);
        // how deep inside the painted art a leaked pixel is: the distance to the nearest NOT painted pixel (the inverted alpha's field)
        if (!window.__inv) {
            const src = sk.torso.texture.getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
            const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(src, 0, 0); const d = cx.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
            for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] >= 128 ? 0 : 255;
            window.__inv = window.__sil.buildSilhouette(c.width, c.height, a, { threshold: 128, pad: 8 });
        }
        const toWorld = (px, py) => cam.getWorldPoint((clip.x + px - box.x) * g.width / box.width, (clip.y + py - box.y) * g.height / box.height);
        const lum = (d, i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        let forearm = 0, inside = 0, deep = 0, noisy = 0, maxDepth = 0, deeper = 0; const leaks = [], shown = [];
        for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
            const i = (y * A.width + x) * 4;
            if (Math.abs(lum(A.data, i) - lum(B.data, i)) > 25) { noisy++; continue; }
            if (Math.abs(lum(A.data, i) - lum(C.data, i)) <= 25) continue;
            forearm++; shown.push(x, y);
            const p = toWorld(x + 0.5, y + 0.5);
            if (window.__sil.silhouetteDistance(sk.torso, p, sil) === 0) { inside++; const dep = window.__sil.silhouetteDistance(sk.torso, p, window.__inv); if (dep > maxDepth) maxDepth = dep; if (dep > 2) deeper++; leaks.push(x, y, Math.round(dep * 10)); }
            if (window.__sil.silhouetteDistance(sk.torso, p, deepSil) === 0) deep++;
        }
        return { forearmPx: forearm, insideTorsoArtPx: inside, insidePaintedInteriorPx: deep, maxDepthInsideGamePx: +maxDepth.toFixed(2), deeperThan2PxInside: deeper, speckle: noisy, masked: !!sk.nearForearm._torsoMask?.active, depthOverTorso: sk.nearForearm.depth > sk.torso.depth, _leaks: leaks, _shown: shown };
    }, { s1, s2, s3, clip, who });
    const { _leaks, _shown, ...out } = result;
    if (debug) { // WFM_COUNT_DEBUG: save the frame with the forearm's pixels tinted blue and the leaked ones red, and the frame without it
        const { writeFileSync } = await import('node:fs');
        writeFileSync(`${debug}-shown.png`, Buffer.from(s1, 'base64')); writeFileSync(`${debug}-hidden.png`, Buffer.from(s3, 'base64'));
        const diag = await page.evaluate(who => {
            const sc = window.__WFM_GAME.scene.scenes[0], sk = sc[who].skeleton, f = sk.nearForearm, cam = sc.cameras.main, fc = f.filters?.internal?.camera;
            const b = o => { const r = o.getBounds(); return [r.x, r.y, r.width, r.height].map(v => +v.toFixed(1)); };
            return { mainCam: { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height, rotation: cam.rotation, x: cam.x, y: cam.y },
                filterCam: fc && { zoom: fc.zoom, scrollX: fc.scrollX, scrollY: fc.scrollY, width: fc.width, height: fc.height, rotation: fc.rotation, x: fc.x, y: fc.y },
                forearm: { bounds: b(f), rotation: f.rotation, scale: [f.scaleX, f.scaleY], origin: [f.originX, f.originY], displaySize: [f.displayWidth, f.displayHeight], pos: [f.x, f.y], flip: [f.flipX, f.flipY], crop: !!f.isCropped, depth: f.depth },
                torso: { bounds: b(sk.torso), rotation: sk.torso.rotation, scale: [sk.torso.scaleX, sk.torso.scaleY], pos: [sk.torso.x, sk.torso.y], depth: sk.torso.depth },
                mask: { active: f._torsoMask?.active, needsUpdate: f._torsoMask?.needsUpdate, dyn: f._torsoMask?._dynamicTexture ? [f._torsoMask._dynamicTexture.width, f._torsoMask._dynamicTexture.height] : null },
                filtersPadding: f.filtersPadding ?? null, filterOnlyIncludesThis: f.filtersAutoFocus ?? null };
        }, who);
        writeFileSync(`${debug}.json`, JSON.stringify({ leaks: _leaks, shown: _shown, diag }));
    }
    return out;
}
