// In-page sampler of every skeleton part's draw depth while a clip plays, for
// both wrestlers. Evidence tooling (move-performance plan T0.2): it reads the
// live Arena scene and changes nothing.
//   const probe = await installDepthProbe(page);  ... run the move ...  const rows = await probe.collect();
// One row per rendered frame in which a clip advanced: the clip id and time,
// each wrestler's y, base depth (12 + y*0.03, the Wrestler.draw formula) and
// state, and `parts` = { partName: depth } for every textured part. `z` is each
// part's index in the scene display list: Phaser's depth sort is stable, so
// equal-depth parts draw in `z` order (lower first, i.e. behind).

export async function installDepthProbe(page) {
    await page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const rows = (window.__depthRows = []);
        let last = new Map();
        const parts = w => {
            const out = {}, z = {};
            for (const [k, v] of Object.entries(w.skeleton)) {
                if (v && typeof v === 'object' && v.texture && typeof v.depth === 'number') {
                    out[k] = v.depth;
                    z[k] = sc.children.list.indexOf(v);
                }
            }
            return [out, z];
        };
        const tick = () => {
            for (const h of sc.moveRuntime?._active?.values?.() ?? []) {
                if (last.get(h.id) === h.time) continue;
                last.set(h.id, h.time);
                const side = w => { const [p, z] = parts(w); return { x: Math.round(w.x), y: Math.round(w.y),
                    state: w.state, base: 12 + w.y * 0.03, parts: p, z }; };
                rows.push({ clip: h.clip.id, t: h.time, w1: side(sc.w1), w2: side(sc.w2),
                    attacker: h.bindings.attacker === sc.w1 ? 'w1' : 'w2' });
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    return { collect: () => page.evaluate(() => window.__depthRows) };
}
