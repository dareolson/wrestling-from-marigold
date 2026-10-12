import backgroundUrl from '../assets/story/marigold-title-clean-v1.png';
import carUrl from '../assets/story/marigold-sedan-v1.png';
import patronUrl from '../assets/story/marigold-patron-walk-v1.png';
import crowdUrl from '../assets/story/marigold-waiting-patrons-v1.png';

// All positions are authored in the 960 × 600 canvas. The complete street
// belongs to FrontDoor's background container, including its camera push.
export class TitleStreet {
    static preload(scene) {
        scene.load.image('marigold-exterior', backgroundUrl);
        scene.load.image('marigold-sedan', carUrl);
        scene.load.image('marigold-patron', patronUrl);
        scene.load.image('marigold-waiting', crowdUrl);
    }

    constructor(scene, parent) {
        this.scene = scene;
        this.disposed = false;
        this.timers = new Set();
        this.actors = new Set();
        this.motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.layer = scene.add.container(-480, -300);
        parent.add(this.layer);
        this.layer.add(scene.add.image(480, 300, 'marigold-exterior').setDisplaySize(960, 600));

        const sheet = scene.textures.get('marigold-patron');
        const source = sheet.getSourceImage();
        for (let i = 0; i < 4; i++) {
            const left = Math.round(i * source.width / 4);
            const right = Math.round((i + 1) * source.width / 4);
            if (!sheet.has(`walk-${i}`)) sheet.add(`walk-${i}`, 0, left, 0, right - left, source.height);
        }
        if (!scene.anims.exists('marigold-patron-walk')) scene.anims.create({
            key: 'marigold-patron-walk',
            frames: [0, 1, 2, 3].map(i => ({ key: 'marigold-patron', frame: `walk-${i}` })),
            frameRate: 5, repeat: -1,
        });

        // Rotating hubcaps use the sedan's own pixels; no separate art style.
        const sedan = scene.textures.get('marigold-sedan');
        for (const [name, x] of [['rear-hub', 354], ['front-hub', 1375]]) {
            if (!sedan.has(name)) sedan.add(name, 0, x, 574, 122, 122);
        }
        this.addCar(75, 357, 200, false);
        this.addCar(720, 379, 155, false);
        this.layer.add(scene.add.image(420, 443, 'marigold-waiting').setOrigin(0.5, 1).setDisplaySize(64, 83));
        this.layer.add(scene.add.image(616, 439, 'marigold-waiting').setOrigin(0.5, 1)
            .setDisplaySize(53, 70).setFlipX(true).setTint(0xddd5c7));

        // A registered dark mask briefly extinguishes one painted bulb.
        this.bulb = scene.add.circle(441, 265, 2.4, 0x59301b).setAlpha(0);
        this.layer.add(this.bulb);
        if (this.motion) {
            this.later(4200, () => this.flicker());
            this.later(1800, () => this.enterPatron());
            this.later(6000, () => this.passCar());
        }
        scene.events.once('shutdown', () => this.destroy());
    }

    later(delay, callback) {
        if (this.disposed) return;
        const timer = this.scene.time.delayedCall(delay, () => {
            this.timers.delete(timer);
            if (!this.disposed) callback();
        });
        this.timers.add(timer);
    }

    flicker() {
        this.scene.tweens.add({ targets: this.bulb, alpha: 0.92, duration: 55,
            yoyo: true, repeat: 2,
            onComplete: () => this.later(Phaser.Math.Between(6500, 13000), () => this.flicker()) });
    }

    addCar(x, y, width, moving) {
        const actor = this.scene.add.container(x, y);
        actor.add(this.scene.add.image(0, 0, 'marigold-sedan', '__BASE').setOrigin(0).setDisplaySize(width, width / 2));
        this.layer.add(actor);
        this.actors.add(actor);
        if (moving) {
            const scale = width / 1774;
            for (const [frame, centerX] of [['rear-hub', 415], ['front-hub', 1436]]) {
                const hub = this.scene.add.image(centerX * scale, 635 * scale, 'marigold-sedan', frame)
                    .setDisplaySize(122 * scale, 122 * scale);
                actor.add(hub);
                this.scene.tweens.add({ targets: hub, angle: 360, duration: 900, repeat: -1 });
            }
        }
        return actor;
    }

    passCar() {
        const car = this.addCar(-245, 356, 230, true);
        this.scene.tweens.add({ targets: car, x: 980, duration: 10500, ease: 'Linear', onComplete: () => {
            this.removeActor(car);
            this.later(Phaser.Math.Between(11000, 18000), () => this.passCar());
        } });
    }

    enterPatron() {
        const patron = this.scene.add.sprite(451, 443, 'marigold-patron', 'walk-0')
            .setOrigin(0.5, 1).setDisplaySize(55, 80).play('marigold-patron-walk');
        this.layer.add(patron);
        this.actors.add(patron);
        this.scene.tweens.add({ targets: patron, x: 547, duration: 5200, ease: 'Linear', onComplete: () => {
            // Short final approach into the warm doorway; no perpetual drift.
            this.scene.tweens.add({ targets: patron, x: 554, y: 431, alpha: 0,
                duration: 900, onComplete: () => {
                    this.removeActor(patron);
                    this.later(Phaser.Math.Between(8000, 14000), () => this.enterPatron());
                } });
        } });
    }

    removeActor(actor) {
        this.scene.tweens.killTweensOf(actor);
        if (actor.list) actor.list.forEach(child => this.scene.tweens.killTweensOf(child));
        this.actors.delete(actor);
        actor.destroy();
    }

    destroy() {
        if (this.disposed) return;
        this.disposed = true;
        this.timers.forEach(timer => timer.remove(false));
        this.timers.clear();
        this.scene.tweens.killTweensOf(this.bulb);
        [...this.actors].forEach(actor => this.removeActor(actor));
        this.layer.destroy();
    }
}
