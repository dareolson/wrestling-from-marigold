import Arena from './scenes/Arena.js';

new Phaser.Game({
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
    scene: [Arena],
});
