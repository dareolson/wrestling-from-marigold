// Expression heads (Derek 2026-11-14 trial, "it looks amazing, let's lock it in": on by default, `?faces=0` turns them off): generated heads
// (research/art/<name>-expressions-2026-11-14, cut and registered to each rig's head.png canvas by register_cells.py) swapped onto the head in a match.
// Three families (talk: closed/speaking/shouting, pain: flinch/clench/cry, smug: smirk/grin/chuckle) x three wear stages x three mouth frames.
// Driven by headPerformance.js: damage taken adds wear (monotonic) and starts pain; damage he deals starts a boast; standing over a downed man
// he shouts at him or the crowd now and then. No gameplay effect; a rig without a FACE_RIGS entry, or `?faces=0`, loads and changes nothing.
import { newHeadPerformance, addHeadWear, startHeadSpeech, startHeadReaction, sampleHeadPerformance } from './headPerformance.js';

export const facesTrial = () => typeof location === 'undefined' || new URLSearchParams(location.search).get('faces') !== '0';

// `restKeys`: the face between reactions, per wear stage: the clean stage is his own head texture (Derek 2026-11-14: the talk atlas's closed
// mouth is the wrong resting face); the worn stages are Codex's resting heads drawn from it (rest_1, rest_2).
// Personality is in the art (Derek 2026-11-14): George the arrogant heel, Lou and Guido babyfaces (the `smug` slot is their fired-up face),
// Kowalski the monster heel (snarls; the `smug` slot is menace).
const face = (rigId, name, headKey) => ({ dir: `src/assets/wrestlers/${rigId}/expressions-trial`, prefix: `${name}_face`, restKeys: [headKey, `${name}_face_rest_1`, `${name}_face_rest_2`] });
const FACE_RIGS = {
    'george-roster-v1':   face('george-roster-v1', 'george', 'george_rv1_head'),
    'thesz-procreate-v1': face('thesz-procreate-v1', 'lou', 'thesz_pv1_head'),
    'guido-roster-v1':    face('guido-roster-v1', 'guido', 'guido_rv1_head'),
    'kowalski-roster-v1': face('kowalski-roster-v1', 'kowalski', 'kowalski_rv1_head'),
};
const FAMILIES = ['talk', 'pain', 'smug'];

const cellName = (family, stage, mouth) => `${family}_${stage}_${mouth}`;

export function faceAssets() {
    const out = [];
    for (const { dir, prefix } of Object.values(FACE_RIGS)) {
        for (const family of FAMILIES) for (let stage = 0; stage < 3; stage++) for (let mouth = 0; mouth < 3; mouth++) {
            const name = cellName(family, stage, mouth);
            out.push({ key: `${prefix}_${name}`, file: `${dir}/${name}.png` });
        }
        for (const name of ['rest_1', 'rest_2']) out.push({ key: `${prefix}_${name}`, file: `${dir}/${name}.png` });
    }
    return out;
}

// Seconds of quiet between taunts while he stands over a downed man, and how long one lasts.
const TAUNT_GAP = [2.5, 5.5];
const TAUNT_MS = 1800;
const BOAST_DELAY_MS = 350;

export class FaceDriver {
    static for(wrestler) {
        return facesTrial() && FACE_RIGS[wrestler.rigId] ? new FaceDriver(wrestler, FACE_RIGS[wrestler.rigId]) : null;
    }

    constructor(wrestler, rig) {
        this.w = wrestler;
        this.prefix = rig.prefix;
        this.restKeys = rig.restKeys;
        this.state = newHeadPerformance();
        this.taken = 0;          // wrestler._damageTaken seen so far
        this.dealt = 0;          // opponent._damageTaken seen so far
        this.boastAt = null;
        this.nextTauntAt = null;
        this.key = null;
    }

    tick(now, other) {
        const w = this.w;
        const taken = w._damageTaken ?? 0, dealt = other?._damageTaken ?? 0;
        if (taken > this.taken) {
            this.state = startHeadReaction(addHeadWear(this.state, taken - this.taken), 'pain', now);
            this.boastAt = null;
        }
        if (dealt > this.dealt) this.boastAt = now + BOAST_DELAY_MS;
        this.taken = taken; this.dealt = dealt;
        if (this.boastAt !== null && now >= this.boastAt) {
            this.state = startHeadReaction(this.state, 'smug', now);
            this.boastAt = null;
        }
        // trash talk: he stands and the other man is down
        const gloating = w.state === 'standing' && (other?.state === 'down' || other?.state === 'possum');
        if (!gloating) this.nextTauntAt = null;
        else if (this.nextTauntAt === null) this.nextTauntAt = now + 600;
        else if (now >= this.nextTauntAt && !this._busy(now)) {
            this.state = startHeadSpeech(this.state, Math.random() < 0.65 ? 'opponent' : 'audience', now, TAUNT_MS);
            this.nextTauntAt = now + TAUNT_MS + 1000 * (TAUNT_GAP[0] + Math.random() * (TAUNT_GAP[1] - TAUNT_GAP[0]));
        }
        const s = sampleHeadPerformance(this.state, now);
        const resting = s.family === 'talk' && !s.talking;
        const key = resting ? this.restKeys[s.stage] : `${this.prefix}_${cellName(s.family, s.stage, s.mouth)}`;
        const head = w.skeleton?.head;
        if (key !== this.key && head?.setTexture && w.scene.textures.exists(key)) {
            head.setTexture(key);
            this.key = key;
        }
    }

    _busy(now) {
        const r = this.state.reaction;
        return !!r && now < r.start + r.duration;
    }
}
