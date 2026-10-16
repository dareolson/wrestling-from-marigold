// Procedurally generated crowd audio — no asset files, pure Web Audio API.
// Murmur: a looped pink-noise bed whose volume and brightness track the crowd
// heat meter. Pops: gain swells on big match events. Bell: synthesized strikes.
// Impact: match foley (body on the mat, a fist landing, boots to the chest),
// fired once from a confirmed gameplay contact — see impact().
// Everything runs through a ~3.2kHz lowpass so it sits inside the vintage
// broadcast sound of the recovered-footage aesthetic.

export default class CrowdAudio {
    constructor() {
        this._ctx    = null;
        this._master = null;
        this._filter = null;
        this._murmur = null; // heat-tracked bed level
        this._pop    = null; // event swell multiplier on top of the bed
        this._heat   = -1;
    }

    // Must be called from a user gesture — browsers block audio before one.
    // Idempotent; safe to bind to several unlock events.
    start() {
        if (this._ctx) return;
        const ctx = this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();

        this._master = ctx.createGain();
        this._master.gain.value = 0.3;
        const tone = ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.frequency.value = 3200;
        this._master.connect(tone);
        tone.connect(ctx.destination);
        // Foley shares the broadcast lowpass but not the crowd's master level,
        // so a landing reads over the bed rather than inside it.
        this._fx = ctx.createGain();
        this._fx.gain.value = 0.45;
        this._fx.connect(tone);
        const noiseLen = ctx.sampleRate;
        this._noise = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        const nd = this._noise.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;

        // 4-second pink-ish noise loop (Paul Kellet style one-pole stack)
        const len = 4 * ctx.sampleRate;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d   = buf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.997 * b0 + 0.029 * w;
            b1 = 0.985 * b1 + 0.032 * w;
            b2 = 0.950 * b2 + 0.048 * w;
            d[i] = (b0 + b1 + b2 + w * 0.05) * 3.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop   = true;

        // Bandpass centered on crowd-voice range; center rises with heat
        this._filter = ctx.createBiquadFilter();
        this._filter.type = 'bandpass';
        this._filter.frequency.value = 450;
        this._filter.Q.value = 0.6;

        this._murmur = ctx.createGain();
        this._murmur.gain.value = 0.08;
        this._pop = ctx.createGain();
        this._pop.gain.value = 1.0;

        src.connect(this._filter);
        this._filter.connect(this._murmur);
        this._murmur.connect(this._pop);
        this._pop.connect(this._master);
        src.start();
    }

    // heat 0..1 — bed volume and filter brightness follow the meter
    setHeat(h) {
        if (!this._ctx || Math.abs(h - this._heat) < 0.01) return;
        this._heat = h;
        const t = this._ctx.currentTime;
        this._murmur.gain.setTargetAtTime(0.06 + h * 0.30, t, 0.25);
        this._filter.frequency.setTargetAtTime(400 + h * 700, t, 0.25);
    }

    // size 0..1 — crowd reaction: fast swell, slow settle back to the bed
    pop(size) {
        if (!this._ctx) return;
        const g = this._pop.gain;
        const t = this._ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setTargetAtTime(1 + size * 2.6, t, 0.06);
        g.setTargetAtTime(1, t + 0.25, 0.8);
    }

    // Timekeeper's bell — inharmonic sine partials per strike
    bell(times = 3) {
        if (!this._ctx) return;
        const ctx = this._ctx;
        for (let i = 0; i < times; i++) {
            const t = ctx.currentTime + i * 0.45;
            for (const [freq, vol, decay] of [[960, 0.30, 1.3], [1420, 0.18, 0.9], [2620, 0.08, 0.5]]) {
                const osc = ctx.createOscillator();
                const g   = ctx.createGain();
                osc.frequency.value = freq;
                g.gain.setValueAtTime(vol, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + decay);
                osc.connect(g);
                g.connect(this._master);
                osc.start(t);
                osc.stop(t + decay);
            }
        }
    }

    // Match foley. kind: 'mat' (a body landing — slams, suplexes, drops),
    // 'strike' (a fist or forearm), 'kick' (boots to the chest). size 0..1.
    // Gameplay calls this from its confirmed hit handler only, never from a
    // clip seek, so scrubbing is silent and a cancelled move makes no sound.
    impact(kind = 'mat', size = 1) {
        if (!this._ctx) return;
        const ctx = this._ctx, t = ctx.currentTime, k = Math.max(0, Math.min(1, size));
        // A pitch-dropping sine: the body of a thud.
        const thud = (from, to, sweep, vol, decay) => {
            const osc = ctx.createOscillator(), g = ctx.createGain();
            osc.frequency.setValueAtTime(from, t);
            osc.frequency.exponentialRampToValueAtTime(to, t + sweep);
            g.gain.setValueAtTime(vol * k, t);
            g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
            osc.connect(g); g.connect(this._fx);
            osc.start(t); osc.stop(t + decay + 0.02);
        };
        // Filtered noise: the slap of skin, canvas, ring boards.
        const burst = (type, freq, q, vol, decay, delay = 0) => {
            const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
            src.buffer = this._noise;
            f.type = type; f.frequency.value = freq; f.Q.value = q;
            g.gain.setValueAtTime(vol * k, t + delay);
            g.gain.exponentialRampToValueAtTime(0.0008, t + delay + decay);
            src.connect(f); f.connect(g); g.connect(this._fx);
            src.start(t + delay, Math.random() * 0.5); src.stop(t + delay + decay + 0.02);
        };
        if (kind === 'strike') {
            burst('bandpass', 1900, 1.4, 1.2, 0.05);
            thud(170, 95, 0.05, 1.0, 0.1);
        } else if (kind === 'kick') {
            burst('bandpass', 950, 1.0, 0.6, 0.07);
            thud(130, 58, 0.09, 0.85, 0.16);
        } else {
            thud(115, 40, 0.16, 1.0, 0.38);            // the body
            burst('bandpass', 1150, 0.8, 0.5, 0.07);    // canvas slap
            burst('lowpass', 190, 0.7, 0.45, 0.5, 0.01); // ring boards
            thud(64, 60, 0.4, 0.25, 0.6);               // ring ropes / springs humming
        }
    }
}
