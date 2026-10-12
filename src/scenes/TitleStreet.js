import backgroundUrl from '../assets/story/marigold-title-clean-v1.jpg';
import carUrl from '../assets/story/marigold-sedan-v1.png';
import patronUrl from '../assets/story/marigold-patron-walk-v1.png';
import crowdUrl from '../assets/story/marigold-waiting-patrons-v1.png';

// All positions are authored in the 960 × 600 canvas. The complete street
// belongs to FrontDoor's background container, including its camera push.
//
// Runtime images are display-sized (review, 2026-10-11): the generated masters
// in Sprite sheets/Story/marigold-title/source-masters/ were 6.8 MB for sprites
// shown at most 230 px wide. Sedan geometry below stays in the MASTER's pixel
// coordinates (SEDAN_MASTER_W wide) and is scaled to whatever texture loads,
// so re-exporting the sedan at another size needs no coordinate edits.
const SEDAN_MASTER_W = 1774;
const SEDAN_HUBS = [['rear-hub', 354, 415], ['front-hub', 1375, 1436]]; // [frame, crop x, centre x]
const HUB_Y = 574, HUB_CENTER_Y = 635, HUB_SIZE = 122;
// Street depth (canvas y of the tyre line). The sidewalk's curb is at about
// y 452: parked cars sit at the curb on the road, the passing car one lane out.
// Cars were previously placed with tyres at ~y 440, i.e. parked ON the sidewalk.
const PARKED_TYRES_Y = 466, PASSING_TYRES_Y = 486;
const TYRE_LINE = 755 / 887; // sedan master: tyre bottoms at y 755 of 887

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
        const k = sedan.getSourceImage().width / SEDAN_MASTER_W;
        for (const [name, x] of SEDAN_HUBS) {
            if (!sedan.has(name)) sedan.add(name, 0, Math.round(x * k), Math.round(HUB_Y * k),
                Math.round(HUB_SIZE * k), Math.round(HUB_SIZE * k));
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

        this.addCar(75, PARKED_TYRES_Y, 200, false);
        this.addCar(720, PARKED_TYRES_Y, 155, false);
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

    // `tyresY` is the canvas y of the tyre bottoms (the car's spot in the street).
    addCar(x, tyresY, width, moving) {
        const y = tyresY - TYRE_LINE * width / 2;
        const actor = this.scene.add.container(x, y);
        actor.add(this.scene.add.image(0, 0, 'marigold-sedan', '__BASE').setOrigin(0).setDisplaySize(width, width / 2));
        this.cars.add(actor);
        this.actors.add(actor);
        if (moving) {
            const scale = width / SEDAN_MASTER_W;
            for (const [frame, , centerX] of SEDAN_HUBS) {
                const hub = this.scene.add.image(centerX * scale, HUB_CENTER_Y * scale, 'marigold-sedan', frame)
                    .setDisplaySize(HUB_SIZE * scale, HUB_SIZE * scale);
                actor.add(hub);
                this.scene.tweens.add({ targets: hub, angle: 360, duration: 900, repeat: -1 });
            }
        }
        return actor;
    }

    passCar() {
        const car = this.addCar(-245, PASSING_TYRES_Y, 230, true);
        this.scene.tweens.add({ targets: car, x: 980, duration: 10500, ease: 'Linear', onComplete: () => {
            this.removeActor(car);
            this.later(Phaser.Math.Between(11000, 18000), () => this.passCar());
        } });
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
