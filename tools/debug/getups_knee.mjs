// G1b (PLAN_GETUPS T2.1b): knee tuck candidates through backKneeHurt, forced rises, with a gap probe per frame.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_knee.mjs [outRoot] [rig,rig]
//
// Candidates: tuck 0 (today) / 6 / 10 / 14 px, and tuck 0 with the thigh drawn over the shin. Each: facing -1 and 1, the
// opponent behind (the turn: the knee folds deepest in the kneel and the push). Per frame it rasterises each leg's thigh and shin
// alpha around the knee joint and counts the pixels inside the convex hull of (thigh U shin) that neither covers
// ("gap", radius 8 and 12 px of the joint: the inside of a folded knee is a real notch, so the radius keeps it out).
// Writes <outRoot>/<candidate>/<rig>-<l|r>/sNNNN.jpg (raw, not committed) and <outRoot>/knee.json.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
export const CANDIDATES = { t0: '', t6: 'kneeTuck=6', t10: 'kneeTuck=10', t14: 'kneeTuck=14', over: 'kneeOrder=thigh' };

// In-page: thigh/shin alpha around each knee joint, gap inside the hull, and the knee in clip-relative screen px.
export const KNEE_PROBE = ({ radii }) => {
    const sk = window.__rw.skeleton, R = 40, N = R * 2;
    const alpha = (img, kx, ky) => {
        const c = document.createElement('canvas'); c.width = c.height = N;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        const src = img.texture?.getSourceImage?.();
        if (!img.visible || !src || img.texture.key === 'sk_pixel' || img.texture.key === '__DEFAULT') return null;
        const m = img.getWorldTransformMatrix(), fr = img.frame;
        ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - kx + R, m.ty - ky + R);
        ctx.scale(img.flipX ? -1 : 1, img.flipY ? -1 : 1);
        ctx.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, -img.originX * img.width, -img.originY * img.height, img.width, img.height);
        const d = ctx.getImageData(0, 0, N, N).data, a = new Uint8Array(N * N);
        for (let i = 0; i < N * N; i++) a[i] = d[i * 4 + 3] > 40 ? 1 : 0;
        return a;
    };
    const hull = (pts) => {
        pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const half = (ps) => { const h = []; for (const p of ps) { while (h.length >= 2 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } h.pop(); return h; };
        return [...half(pts), ...half([...pts].reverse())];
    };
    const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const out = {};
    for (const side of ['near', 'far']) {
        const k = sk.jointAttachmentPoints?.[`${side}Knee`], th = sk[`${side}Thigh`], sh = sk[`${side}Shin`];
        if (!k || !th || !sh) continue;
        const at = alpha(th, k.x, k.y), as = alpha(sh, k.x, k.y);
        if (!at || !as) { out[side] = null; continue; }
        const rec = { gap: {} };
        for (const r of radii) {
            const pts = [];
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((at[y * N + x] || as[y * N + x]) && Math.hypot(x - R, y - R) <= r + 10) pts.push([x, y]);
            const poly = pts.length > 2 ? hull(pts) : [];
            let gap = 0;
            if (poly.length > 2) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
                if (Math.hypot(x - R, y - R) <= r && !at[y * N + x] && !as[y * N + x] && inside(poly, x + 0.5, y + 0.5)) gap++;
            rec.gap[r] = gap;
        }
        rec.knee = k;
        out[side] = rec;
    }
    return out;
};

async function filmRig(name, rig, outRoot, results) {
    for (const [cand, qs] of Object.entries(CANDIDATES)) {
        process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
        process.env.WFM_QS = ['notitle=1', 'getups=v1', qs].filter(Boolean).join('&');
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForTimeout(400);
            await page.evaluate(INSTALL);
            const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
                const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
            const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
            for (const facing of [-1, 1]) {
                const id = `${name}-${facing < 0 ? 'l' : 'r'}`;
                const dir = join(outRoot, cand, id);
                rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: false, facing, pose: 'stale', opp: 'behind' });
                const rows = []; let standAt = null;
                for (let i = 0; i < 200; i++) {
                    const f = await page.evaluate(STEP);
                    const probe = f.state === 'gettingUp' ? await page.evaluate(KNEE_PROBE, { radii: [8, 12] }) : null;
                    const toClip = (k) => k ? { x: +((k.x * box.w / box.gw + box.x) - clip.x).toFixed(1), y: +((k.y * box.h / box.gh + box.y) - clip.y).toFixed(1) } : null;
                    rows.push({ i, now: f.now, state: f.state, facing: f.facing, riseT: f.riseT,
                        near: probe?.near ? { gap8: probe.near.gap[8], gap12: probe.near.gap[12], at: toClip(probe.near.knee) } : null,
                        far: probe?.far ? { gap8: probe.far.gap[8], gap12: probe.far.gap[12], at: toClip(probe.far.knee) } : null });
                    await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90, clip });
                    if (standAt === null && f.state === 'standing') standAt = f.now;
                    if (standAt !== null && f.now - standAt >= 300) break;
                }
                const sum = (side, key) => rows.reduce((t, r) => t + (r[side]?.[key] ?? 0), 0), max = (side, key) => Math.max(0, ...rows.map(r => r[side]?.[key] ?? 0));
                results.push({ rig: name, cand, facing, frames: rows.length, rows,
                    near: { gap8Sum: sum('near', 'gap8'), gap8Max: max('near', 'gap8'), gap12Sum: sum('near', 'gap12'), gap12Max: max('near', 'gap12') },
                    far: { gap8Sum: sum('far', 'gap8'), gap8Max: max('far', 'gap8'), gap12Sum: sum('far', 'gap12'), gap12Max: max('far', 'gap12') } });
                console.log(`[knee] ${cand}/${id}: ${rows.length} frames, gap8 near max ${max('near', 'gap8')} sum ${sum('near', 'gap8')}; far max ${max('far', 'gap8')} sum ${sum('far', 'gap8')}`);
            }
        } finally { await h.close(); }
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/getups-2026-10/g1b', rigArg = 'lou,george'] = process.argv.slice(2);
    mkdirSync(outRoot, { recursive: true });
    const results = [];
    for (const n of rigArg.split(',')) await filmRig(n, RIGS[n], outRoot, results);
    writeFileSync(join(outRoot, 'knee.json'), JSON.stringify(results));
    process.exit(0);
}
