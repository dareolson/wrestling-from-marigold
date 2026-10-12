import Arena from './scenes/Arena.js';
import FrontDoor from './scenes/FrontDoor.js';

// Keep the arena first for existing rig/debug tools that inspect scenes[0].
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
    scene: [Arena, FrontDoor],
    callbacks: {
        postBoot(game) {
            if (!directArena) {
                game.scene.stop('Arena');
                game.scene.start('FrontDoor');
            }
        },
    },
});
