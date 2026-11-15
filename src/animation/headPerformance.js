// Art-independent head performance trial. Wear persists; expressions are temporary.
export const TALK_TARGETS = Object.freeze(['opponent', 'referee', 'audience']);
export function newHeadPerformance() {
    return { wear: 0, stage: 0, speech: null, reaction: null };
}
export function addHeadWear(state, amount) {
    const wear = Math.min(100, state.wear + Math.max(0, Number.isFinite(amount) ? amount : 0));
    return { ...state, wear, stage: wear >= 65 ? 2 : wear >= 25 ? 1 : 0 };
}
export function startHeadSpeech(state, target, now, duration = 2400) {
    if (!TALK_TARGETS.includes(target)) throw new Error(`Unknown speech target: ${target}`);
    if (state.reaction?.kind === 'pain' && now < state.reaction.start + state.reaction.duration) return state;
    return { ...state, reaction: null, speech: { target, start: now, duration: Math.max(0, duration) } };
}
export function startHeadReaction(state, kind, now, duration = kind === 'pain' ? 1400 : 2400) {
    if (!['pain', 'smug'].includes(kind)) throw new Error(`Unknown reaction: ${kind}`);
    if (kind !== 'pain' && state.reaction?.kind === 'pain' && now < state.reaction.start + state.reaction.duration) return state;
    return { ...state, speech: null, reaction: { kind, start: now, duration: Math.max(0, duration) } };
}
// Irregular closed / speaking / shouting shapes with pauses between phrases.
const PHRASE = [0, 1, 2, 1, 0, 1, 2, 2, 1, 0, 0, 0, 1, 2, 1, 0, 1, 0, 0];
export function sampleHeadPerformance(state, now, interrupted = false) {
    const reaction = state.reaction, age = reaction ? now - reaction.start : -1;
    if (!interrupted && age >= 0 && age < reaction.duration) {
        const pain = reaction.kind === 'pain';
        // Pain: flinch -> cry -> grit, then settle. Boast: smirk -> grin -> short chuckle.
        const frames = pain ? [0, 0, 2, 2, 1, 1, 2, 1, 1, 0] : [0, 0, 1, 1, 2, 1, 2, 1, 0, 0];
        return { stage: state.stage, mouth: frames[Math.min(frames.length - 1, Math.floor(age / reaction.duration * frames.length))],
            family: reaction.kind, talking: false, target: null };
    }
    const speech = state.speech, elapsed = speech ? now - speech.start : -1;
    const talking = !interrupted && elapsed >= 0 && elapsed < speech.duration;
    return { family: 'talk', stage: state.stage, mouth: talking ? PHRASE[Math.floor(elapsed / 95) % PHRASE.length] : 0,
        talking, target: talking ? speech.target : null };
}
