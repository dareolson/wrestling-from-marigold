import { gameplayPreview, GAMEPLAY_MOVES } from './gameplay.js';
import { backBodyDropV2Clip } from '../../src/animation/clips/backBodyDropV2.js';
import { runnerHipTossClip } from '../../src/animation/clips/runnerHipToss.js';
import { runnerArmDragClip } from '../../src/animation/clips/runnerArmDrag.js';
import { buildClip, PLAYCLIP } from '../debug/toehold_t30c_clip.mjs';
import { halfBostonCrabClip } from '../../src/animation/clips/halfBostonCrab.js';
import { SETUP } from '../debug/toehold_t30_lib.mjs';
const RUNNERS = { 'runner-back-drop': backBodyDropV2Clip, 'runner-hip-toss': runnerHipTossClip, 'runner-arm-drag': runnerArmDragClip };
const $ = id => document.getElementById(id);
const started = performance.now();
const root = '/research/animation/light-moves-2026-11';
const paths = { revision: `${root}/t3-foreground`, seed: `${root}/t3-knee-capture` };
const FRONT = [['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm']];
let win, scene, clip, handle, data, signature = '', time = 0, facing = 1, playing = true, ready = false, loading = false;
let rendered = -1, rollAt = null, gameplay = null;
const run = (fn, args) => win.eval(`(${fn.toString()})(${JSON.stringify(args)})`);
const status = text => { $('status').textContent = text; };
async function loadData() {
    // the toe-hold waypoint files exist for the two approved pairings only; other rigs reuse the Lou-on-George ones
    const tag = `${$('att').value === 'george-roster-v1' ? 'george-lou' : 'lou-george'}-${facing > 0 ? 'right' : 'left'}`;
    const read = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
    const [W, rep, crab] = await Promise.all([read(`${paths.revision}/${tag}/waypoints.json`), read(`${paths.seed}/${tag}/report.json`), read('/tools/move-preview/half-boston-crab.json')]);
    return { W, rep, crab };
}
async function rebuild(next, preserve = false) {
    const t0 = performance.now();
    data = next; signature = JSON.stringify(data);
    const rep = data.rep, p3 = rep['3-kneel'].authored;
    const orders = $('front').checked ? { p1: FRONT, p2: FRONT, cap: FRONT } : { p1: rep['1-grab'].authored.order, p2: rep['2-step-over'].authored.order, cap: p3.order };
    gameplay = null;
    const selected = $('move').value;
    if (GAMEPLAY_MOVES[selected]) {
        const oldTime = time;
        gameplay = gameplayPreview(win, scene, selected, facing, gap => run(SETUP, { facing, sep: gap }));
        handle = gameplay.handle; clip = { ...handle.clip, duration: gameplay.duration };
        rollAt = null; time = preserve ? Math.min(oldTime, clip.duration - .001) : 0; rendered = -1;
        $('front').disabled = true; $('scrub').max = clip.duration - .001;
        draw(); status('Live game preview · impact, bounce and aftermath included'); return;
    }
    const crab = selected === 'half-boston-crab';
    const toe = crab || $('move').value === 'toehold';
    clip = crab ? halfBostonCrabClip(120, { spec: data.crab, attackerRigId: $('att').value, defenderRigId: $('def').value }) : toe ? buildClip(data.W, p3.def.fists, orders) : RUNNERS[$('move').value]?.(150) ?? scene.moveRuntime._clips.get($('move').value);
    rollAt = crab ? clip.events.find(e => e.type === 'roll').at : toe ? clip.rollAt : null;
    for (const h of [...scene.moveRuntime._active.values()]) scene.moveRuntime.cancel(h, 'preview-reset');
    run(SETUP, { facing, sep: 120 });
    if (crab) {
        // the game's own clip, registered and played like the executor does (src/animation/clips/halfBostonCrab.js)
        scene.moveRuntime.register(clip);
        handle = scene.moveRuntime.play(clip.id, { attacker: scene.w1, defender: scene.w2 }, { rate: 0, onEvent() {} });
        scene.w1._activeMove = scene.w2._activeMove = handle;
        scene.w1._fixedHold = scene.w2._fixedHold = true;
        scene.w1.state = scene.w2.state = 'holding';
        scene.w2.facing = -scene.w1.facing; scene.w2.lying = 'supine';
    } else if (toe) {
        await run(PLAYCLIP, { id: 'live-toehold', clip, rate: 0 });
        handle = scene.w1._activeMove;
    } else {
        scene.moveRuntime.register(clip);
        handle = scene.moveRuntime.play(clip.id, { attacker: scene.w1, defender: scene.w2 }, { rate: 0, onEvent() {} });
        scene.w1._activeMove = scene.w2._activeMove = handle;
        scene.w1._fixedHold = scene.w2._fixedHold = true;
        scene.w1.state = scene.w2.state = 'holding';
    }
    $('front').disabled = !toe || crab;
    time = preserve ? Math.min(time, clip.duration - .001) : 0;
    rendered = -1;
    $('scrub').max = clip.duration - .001;
    draw();
    status(`Live revision ready · updated in ${Math.round(performance.now() - t0)} ms`);
}
function draw() {
    if (!ready || !handle || Math.abs(time - rendered) < .00001) return;
    if (gameplay) {
        gameplay.seek(time); handle = gameplay.handle;
        rendered = time; $('scrub').value = time; $('time').value = `${time.toFixed(2)} s`;
        $('phase').value = gameplay.phase; return;
    }
    $('phase').value = '';
    scene.moveRuntime.seek(handle, time);
    if (rollAt !== null) scene.w2.lying = time >= rollAt ? 'prone' : 'supine';
    win.__T += 1000 / 60;
    win.__WFM_GAME.step(win.__T, 1000 / 60);
    rendered = time;
    $('scrub').value = time;
    $('time').value = `${time.toFixed(2)} s`;
}
async function boot() {
    ready = false; handle = null; gameplay = null; signature = ''; status('Loading the game…');
    $('game').src = `/?arena=1&notitle=1&light=v1&p1=${$('att').value}&p2=${$('def').value}`;
}
$('game').addEventListener('load', async () => {
    win = $('game').contentWindow;
    try {
        const deadline = performance.now() + 30000;
        while (!win.__WFM_GAME?.scene.scenes[0]?.w2) {
            if (performance.now() > deadline) throw new Error('Game did not become ready within 30 s');
            await new Promise(r => setTimeout(r, 50));
        }
        scene = win.__WFM_GAME.scene.scenes[0];
        const selected = $('move').value;
        $('move').replaceChildren(new Option('Back body drop · runner', 'runner-back-drop'), new Option('Hip toss · runner', 'runner-hip-toss'), new Option('Arm drag · runner', 'runner-arm-drag'), new Option('Snapmare · impact & sell', 'snapmare-live'), new Option('Jab · live', 'jab-live'), new Option('Clothesline · impact & sell', 'clothesline-live'), new Option('Body slam · impact & sell', 'body-slam-live'), new Option('Hand stomp · live', 'hand-stomp-live'), new Option('Knee drop (leap) · live', 'knee-drop-live'), new Option('Half Boston crab', 'half-boston-crab'), new Option('Toe hold · previous revision', 'toehold'));
        for (const id of [...scene.moveRuntime._clips.keys()].filter(id => id !== 'live-toehold').sort()) $('move').add(new Option(id, id));
        if ([...$('move').options].some(o => o.value === selected)) $('move').value = selected;
        win.__WFM_GAME.loop.sleep();
        scene._p1AI = scene._p2AI = null;
        scene.tweens.getDelta = () => 1000 / 60;
        win.__idle = { ...scene.w1.pose }; win.__T = scene.time.now;
        // A fixed camera for the first preview, without a preliminary bounds sweep.
        scene.cameras.main.stopFollow?.(); scene.cameras.main.removeBounds?.();
        const camera = () => { if (!ready) return; const g = GAMEPLAY_MOVES[$('move').value], v = g?.view; scene.cameras.main.setZoom(v ? v.zoom : g ? 1.0 : 1.3); scene.cameras.main.centerOn(v ? scene.w2.x + facing * v.dx : g ? 560 : 600, v ? v.y : g ? 250 : 340); };
        const old = scene.cameras.main.preRender.bind(scene.cameras.main);
        scene.cameras.main.preRender = (...args) => { camera(); return old(...args); };
        ready = true;
        await rebuild(await loadData());
        window.__MOVE_PREVIEW_READY_MS = performance.now() - started;
        status(`Preview ready in ${(window.__MOVE_PREVIEW_READY_MS / 1000).toFixed(1)} s · edits reload here`);
    } catch (e) { ready = false; status(e.message); }
});
// the Pair preset fills the two rig menus (the scripted tools drive it); the menus take any roster rig
$('pair').onchange = () => { const lou = $('pair').value === 'lou-george'; $('att').value = lou ? 'thesz-procreate-v1' : 'george-roster-v1'; $('def').value = lou ? 'george-roster-v1' : 'thesz-procreate-v1'; boot(); };
$('att').onchange = $('def').onchange = boot;
$('move').onchange = () => ready && rebuild(data);
$('mirror').onclick = async () => { if (!ready) return; facing *= -1; $('mirror').textContent = facing > 0 ? 'Face left' : 'Face right'; await rebuild(await loadData(), true); };
$('front').onchange = () => ready && rebuild(data, true);
$('reload').onclick = async () => { if (ready) await rebuild(await loadData(), true); };
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };
$('restart').onclick = () => { time = 0; draw(); };
function seek(t) { playing = false; $('play').textContent = 'Play'; time = Math.max(0, Math.min(clip?.duration - .001 || 0, t)); draw(); }
$('scrub').oninput = e => seek(+e.target.value);
$('back').onclick = () => seek(time - 1 / 60);
$('next').onclick = () => seek(time + 1 / 60);
let previous = performance.now();
function tick(now) {
    if (ready && handle && playing) { time = (time + Math.min((now - previous) / 1000, .1) * +$('speed').value) % (clip.duration - .001); draw(); }
    previous = now; requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
setInterval(async () => {
    if (!ready || loading || !['half-boston-crab','toehold'].includes($('move').value)) return;
    loading = true;
    try { const next = await loadData(); if (JSON.stringify(next) !== signature) await rebuild(next, true); }
    catch (e) { status(`Keeping last working revision · ${e.message}`); }
    finally { loading = false; }
}, 1000);
// Small automation seam: use the same buttons and timeline in smoke checks.
window.__MOVE_PREVIEW = { get ready() { return ready; }, get time() { return time; }, seek, get handle() { return handle; } };
boot();
