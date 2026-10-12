import backgroundUrl from '../assets/story/marigold-title-clean-v1.jpg';
import { TITLE_CARS } from './titleCars.js';
import patronUrl from '../assets/story/marigold-patron-walk-v1.png';
import crowdUrl from '../assets/story/marigold-waiting-patrons-v1.png';

// All positions are authored in the 960 × 600 canvas. The complete street
// belongs to FrontDoor's background container, including its camera push.
//
const PARKED_TYRES_Y = 466;
const PASSING_TYRES_Y = 486;

export class TitleStreet {
    static preload(scene) {
        scene.load.image('marigold-exterior', backgroundUrl);
        TITLE_CARS.forEach(car => scene.load.image(car.key, car.url));
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

        // Parked cars use models 0 and 1, so the first car to pass is model 2.
        this.nextCar = 2;
        for (const car of TITLE_CARS) {
            const texture = scene.textures.get(car.key);
            const k = texture.getSourceImage().width / car.masterWidth;
            for (const [index, hub] of car.hubs.entries()) {
                const name = `hub-${index}`;
                if (!texture.has(name)) texture.add(name, 0,
                    Math.round(hub.cropX * k), Math.round(hub.cropY * k),
                    Math.round(hub.size * k), Math.round(hub.size * k));
            }
        }

        // A registered dark mask briefly extinguishes one painted bulb.
        this.bulb = scene.add.circle(441, 265, 2.4, 0x59301b).setAlpha(0);
        this.layer.add(this.bulb);

        // People stand on the sidewalk, cars are in the street in front of
        // them: two layers, so a patron who appears while a car is passing can
        // never draw over it (children draw in insertion order).
        this.people = scene.add.container(0, 0);
        this.cars = scene.add.container(0, 0);
        this.layer.add([this.people, this.cars]);

        this.addCar(75, PARKED_TYRES_Y, 200, false, 0);
        this.addCar(720, PARKED_TYRES_Y, 155, false, 1);
        // Waiting groups keep the image's own proportions (they were drawn at
        // 64 × 83 from a near-square image: about 25% too thin).
        const waiting = scene.textures.get('marigold-waiting').getSourceImage();
        this.people.add(scene.add.image(420, 443, 'marigold-waiting').setOrigin(0.5, 1).setScale(83 / waiting.height));
        this.people.add(scene.add.image(616, 439, 'marigold-waiting').setOrigin(0.5, 1)
            .setScale(70 / waiting.height).setFlipX(true).setTint(0xddd5c7));
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

    addCar(x, tyresY, width, moving, modelIndex = 0) {
        const definition = TITLE_CARS[modelIndex];
        const scale = width / definition.masterWidth;
        const actor = this.scene.add.container(x, tyresY - definition.tyreBottom * scale);
        const body = this.scene.add.image(0, 0, definition.key, '__BASE').setOrigin(0);
        body.setDisplaySize(width, definition.masterHeight * scale);
        actor.add(body);
        actor.setData('vehicle', true);
        actor.setData('model', definition.key);
        actor.setData('tyresY', tyresY);
        this.cars.add(actor);
        this.actors.add(actor);
        if (moving) for (const [index, hub] of definition.hubs.entries()) {
            const wheel = this.scene.add.image(hub.centerX * scale, hub.centerY * scale,
                definition.key, `hub-${index}`).setDisplaySize(hub.size * scale, hub.size * scale);
            actor.add(wheel);
            this.scene.tweens.add({ targets: wheel, angle: 360, duration: 900, repeat: -1 });
        }
        return actor;
    }

    passCar(modelIndex = this.nextCar++ % TITLE_CARS.length) {
        const car = this.addCar(-245, PASSING_TYRES_Y, 230, true, modelIndex);
        car.setData('passing', true);
        this.scene.tweens.add({ targets: car, x: 980, duration: 10500, ease: 'Linear', onComplete: () => {
            this.removeActor(car);
            this.later(Phaser.Math.Between(11000, 18000), () => this.passCar());
        } });
        return car;
    }

    enterPatron() {
        const patron = this.scene.add.sprite(451, 443, 'marigold-patron', 'walk-0')
            .setOrigin(0.5, 1).setDisplaySize(55, 80).play('marigold-patron-walk');
        this.people.add(patron);
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
