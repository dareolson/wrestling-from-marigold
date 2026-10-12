import Arena from './scenes/Arena.js';
import FrontDoor from './scenes/FrontDoor.js';

// Phaser auto-starts the FIRST scene. Direct arena launches (debug tools, which
// read scenes[0], and ?p1=/?arena=1 links) list the Arena first; normal launches
// list the title first, so the Arena is never booted behind it. (Booting it
// and stopping it in postBoot still ran its preload: ~36 wrestler images
// downloaded behind the title. Review, 2026-10-11.)
const params = new URLSearchParams(location.search);
const directArena = ['arena', 'p1', 'p2', 'ts', 'lighting'].some(key => params.has(key));

window.__WFM_GAME = new Phaser.Game({
    type: Phaser.AUTO,
    width: 960,
    height: 600,
    backgroundColor: '#080808',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
        gamepad: true,
    },
    scene: directArena ? [Arena, FrontDoor] : [FrontDoor, Arena],
});
