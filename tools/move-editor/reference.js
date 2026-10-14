// Reference sprite layer: a frame of a downloaded sprite sheet drawn faded
// behind an actor, so a move can be posed by matching it. Frames come from
// `Sprite sheets/reference/<sheet>/fNNN.png` (tools: see that folder's
// INDEX.md). Which frame shows when lives on the draft (model.js
// activeReference); this module only draws it. Pose reference only — nothing
// here reaches an exported clip.

import { activeReference } from './model.js';

// Editor actors stand about 340 px tall at the editor's SCALE and the Genesis
// sheet's standing frames about 82 px, so this maps one onto the other before
// the per-reference `scale` nudge.
const BASE_SCALE = 4.15;

export function createReferenceLayer(ctx) {
    const view = { show: true, opacity: 0.45, sheet: 'raw-genesis-44459' };
    const images = {};
    const loading = new Set();
    const crisp = new Set();

    const keyFor = (sheet, frame) => `ref:${sheet}:${frame}`;
    const urlFor = (sheet, frame) =>
        encodeURI(`/Sprite sheets/reference/${sheet}/f${String(frame).padStart(3, '0')}.png`);

    function ensureLoaded(sheet, frame) {
        const key = keyFor(sheet, frame);
        if (ctx.scene.textures.exists(key)) {
            // Pixel art scaled 4x: keep the pixels hard so limb edges stay legible.
            if (!crisp.has(key)) { ctx.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST); crisp.add(key); }
            return key;
        }
        if (!loading.has(key)) {
            loading.add(key);
            ctx.scene.load.image(key, urlFor(sheet, frame));
            ctx.scene.load.once('loaderror', file => {
                if (file.key === key) ctx.status(`No reference frame ${frame} in sheet "${sheet}".`, true);
            });
            ctx.scene.load.once('complete', () => loading.delete(key));
            ctx.scene.load.start();
        }
        return null;
    }

    function update() {
        for (const role of ctx.roles) {
            const entry = view.show ? activeReference(ctx.getDraft(), role, ctx.getPlayhead()) : null;
            const key = entry ? ensureLoaded(view.sheet, entry.frame) : null;
            let image = images[role];
            if (!key) { image?.setVisible(false); continue; }
            if (!image) image = images[role] = ctx.scene.add.image(0, 0, key).setOrigin(0.5, 1);
            if (image.texture.key !== key) image.setTexture(key);
            const root = ctx.actorRoot(role);
            const scale = BASE_SCALE * (entry.scale ?? 1);
            image.setVisible(true)
                .setPosition(root.x + (entry.dx ?? 0) * ctx.scale, root.y + (entry.dy ?? 0) * ctx.scale)
                .setScale(scale)
                .setFlipX(!!entry.flip)
                .setAlpha(view.opacity)
                // Over both actors (they draw at 10–20), under the handles
                // (90): behind an opaque body the sprite is mostly hidden.
                // The selected role's reference sits on top of the other's.
                .setDepth(role === ctx.getSelectedRole() ? 31 : 30);
        }
    }

    return { view, update };
}
