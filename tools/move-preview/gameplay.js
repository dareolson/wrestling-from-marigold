// Run the actual executors and fixed game steps, including damage, landing and
// aftermath. Rewinding resets the pair and replays locally, with no browser RPC.
export const GAMEPLAY_MOVES = {
    'runner-back-drop': { executor: '_doBackBodyDropV2', gap: 150 },
    'runner-hip-toss': { executor: '_doRunnerHipToss', gap: 150 },
    'runner-arm-drag': { executor: '_doRunnerArmDrag', gap: 150 },
    'snapmare-live': { executor: '_doSnapmareFromTieUp', gap: 100 },
    'jab-live': { executor: '_doJab', gap: 85 },
    'clothesline-live': { executor: '_doClothesline', gap: 75, duration: 1.25 },
    'body-slam-live': { executor: '_doBodySlam', gap: 85 },
    // Stage 8: the man is already on the mat (prone / supine), mid-ring so the attacker has room in depth; `view` frames the whole attacker: camera zoom, centre `dx` px past the man along the facing, and `y`
    'hand-stomp-live': { executor: '_doHandStomp', gap: 90, lying: 'prone', y: 330, view: { zoom: 1.3, dx: 60, y: 290 } },
    'knee-drop-live': { executor: '_doKneeDropV2', gap: 90, lying: 'supine', y: 330, view: { zoom: 1.3, dx: 60, y: 290 } },
};
export function gameplayPreview(win, scene, move, facing, setup) {
    const def = GAMEPLAY_MOVES[move];
    let frame = 0, handle, duration;
    function reset() {
        for (const h of [...scene.moveRuntime._active.values()]) scene.moveRuntime.cancel(h, 'preview-reset');
        setup(def.gap);
        let seed = 12345;
        win.Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        for (const w of [scene.w1, scene.w2]) {
            w._landing = null; w._landNext = null; w._jolt = null; w._sell = null; w._pain = null;
            w.runPhase = null; w.state = 'standing'; w.lying = null; w.stamina = 100; w.wear = 0;
        }
        if (move === 'clothesline-live') {
            scene.w2.state = 'running'; scene.w2.runPhase = 'returning'; scene.w2.runFacing = -facing; scene.w2.runTarget = scene.w1.x - facing * 400;
        }
        if (def.lying) {   // the man is on the mat, head the way he faces (prone) or away (supine), the pair on the ring's middle depth
            for (const w of [scene.w1, scene.w2]) w.y = def.y;
            scene.w2.facing = facing; scene.w2.state = 'down'; scene.w2.lying = def.lying; scene.w2.stateTimer = 99;
        }
        scene.w1[def.executor](scene.w2);
        handle = scene.w1._activeMove ?? { clip: { id: move, duration: def.duration }, time: 0 };
        duration = handle.clip.duration + 2.4;
        frame = 0;
    }
    reset();
    return {
        get handle() { return handle; }, get duration() { return duration; },
        seek(time) {
            const target = Math.max(0, Math.round(time * 60));
            if (target < frame) reset();
            while (frame < target) {
                win.__T += 1000 / 60;
                win.__WFM_GAME.step(win.__T, 1000 / 60);
                frame++;
            }
        },
        get phase() {
            const d = scene.w2;
            if (d._landing) return 'Impact / mat bounce';
            if (d._sell) return 'Selling';
            if (d.state === 'down') return 'Settling';
            return d.state === 'standing' && frame > 30 ? 'Recovered' : 'Throw';
        },
    };
}
