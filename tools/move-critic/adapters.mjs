// Non-clip performances the coverage report tracks beside the registered clips.
// These are state-driven (sells, rises), not seekable MoveRuntime clips, so the
// registry cannot list them. Each id is what tools/move-critic/capabilities.json
// consumers of kind "adapter" refer to. Sources checked 2026-10-25.
export const ADAPTERS = Object.freeze([
    { id: 'sell:clutch', source: 'src/animation/sells.js clutchSell + src/animation/sellAppearance.js',
        summary: 'Grounded clutch sell, with sell-art hand (?sellart)' },
    { id: 'sell:lyingHold', source: 'src/Wrestler.js _hold + src/animation/backRisePerformance.js holdWeight',
        summary: 'Hand stays on the back while down after the last back clutch' },
    { id: 'rise:back', source: 'src/Skeleton.js updateGetUp + src/animation/backRisePerformance.js',
        summary: 'Protected / carried back-pain rise into the standing recovery' },
    { id: 'rise:handoff', source: 'src/Wrestler.js _standFromRise + Skeleton.standingChannels (?risefix=1)',
        summary: 'Rise -> standing swap frame' },
    { id: 'rise:quick', source: 'src/Wrestler.js _startQuickRise + Skeleton.updateFall',
        summary: 'Quick rise from the fall clips' },
]);
export const ADAPTER_IDS = Object.freeze(ADAPTERS.map(a => a.id));
