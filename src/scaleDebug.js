// ?scaleDebug=1 (PLAN_SCALE T3.4): render-only size overlay. At each wrestler's root, a thin bar the height his painted figure should stand at for that row (the height ladder's
// ink per unit of draw scale x his drawScale()), and a red flash on any frame the pop check would flag (|d scale / scale| over the bar, normalised to a 60 fps frame, as in
// tools/debug/scale_pop_soak.mjs). It reads the game and draws into its own Graphics; it never writes to a wrestler.
import ladder from '../research/scale-2026-11/height-ladder.json' with { type: 'json' };

export const POP_BAR = 0.02;            // the pop check's bar (PLAN_SCALE S0 review)
export const FLASH_FRAMES = 24;

const INK_PER_DS = Object.fromEntries(ladder.rigs.map(r => [r.id, r.inkPerDs]));

/** The painted standing height a rig should have at this draw scale, or null for a rig that isn't on the ladder. */
export const expectedInkHeight = (rigId, drawScale, table = INK_PER_DS) => (table[rigId] != null ? table[rigId] * drawScale : null);

/** One frame's signed size change, normalised to a 60 fps frame: (cur - prev) / prev * (1/60) / dt. 0 when there is no previous frame or no time passed. */
export const popAmount = (prev, cur, dtSec) => (prev > 0 && dtSec > 0 ? ((cur - prev) / prev) * (1 / 60) / dtSec : 0);

export const isPop = (prev, cur, dtSec, bar = POP_BAR) => Math.abs(popAmount(prev, cur, dtSec)) > bar;

export default class ScaleDebug {
    constructor(scene) {
        this.gfx = scene.add.graphics().setDepth(200);
        this.prev = new Map();
        this.flash = new Map();
    }

    /** Call once per frame after the wrestlers have drawn. dtSec is game seconds for this frame. */
    update(wrestlers, dtSec) {
        const g = this.gfx;
        g.clear();
        for (const w of wrestlers) {
            const ds = w.drawScale(), prev = this.prev.get(w);
            this.prev.set(w, ds);
            if (prev !== undefined && isPop(prev, ds, dtSec)) this.flash.set(w, FLASH_FRAMES);
            const bar = expectedInkHeight(w.artRigId ?? w.rigId, ds);
            if (bar != null) {
                const x = w.x - 70 * ds;
                g.lineStyle(1, 0x33ddff, 0.9);
                g.lineBetween(x, w.y, x, w.y - bar);
                g.lineBetween(x - 4, w.y - bar, x + 4, w.y - bar);
                g.lineBetween(x - 4, w.y, x + 4, w.y);
            }
            const f = this.flash.get(w) ?? 0;
            if (f > 0) {
                g.lineStyle(3, 0xff2222, f / FLASH_FRAMES);
                g.strokeCircle(w.x, w.y, 26 * ds + 10);
                this.flash.set(w, f - 1);
            }
        }
    }
}
