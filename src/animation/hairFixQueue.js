// PLAN_GEORGE_PERFORMANCE T-D2: when George's wear stage goes up he wants to fix his hair at the next safe moment. This is only the
// bookkeeping (the stage change, the 6 s expiry, the 8 s cooldown, the safe-moment gate); Wrestler plays the clip. Times in ms.
export const HAIR_FIX = { expireMs: 6000, cooldownMs: 8000, farPx: 150 };

export class HairFixQueue {
    constructor(stage = 0) {
        this.stage = stage;
        this.pending = null;      // { stage, expires }
        this.cooldownUntil = 0;
    }

    // call every frame with his current wear stage; a rise queues a fix (a newer rise replaces an older pending one)
    observe(stage, now) {
        if (stage > this.stage) this.pending = { stage, expires: now + HAIR_FIX.expireMs };
        this.stage = stage;
    }

    // the safe moment: the caller says whether he is standing free (no move, not on the ropes); the other man is down or far enough away
    static safe({ standing, otherState, dist }) {
        return !!standing && (otherState === 'down' || otherState === 'possum' || dist >= HAIR_FIX.farPx);
    }

    // returns the stage to fix at, or null; consuming it starts the cooldown
    take(now, safe) {
        if (!this.pending) return null;
        if (now >= this.pending.expires) { this.pending = null; return null; }
        if (!safe || now < this.cooldownUntil) return null;
        const { stage } = this.pending;
        this.pending = null;
        this.cooldownUntil = now + HAIR_FIX.cooldownMs;
        return stage;
    }

    // a taunt hair check or any fix counts toward the cooldown
    noteFix(now) { this.cooldownUntil = now + HAIR_FIX.cooldownMs; }
}
