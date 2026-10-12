import backgroundUrl from '../assets/story/marigold-title-clean-v1.jpg';
import queueManUrl from '../assets/story/marigold-queue-man-v1.png';
import queueWomanUrl from '../assets/story/marigold-queue-woman-v1.png';

// All positions are authored in the 960 × 600 canvas. The complete street
// belongs to FrontDoor's background container, including its camera push.
//
const QUEUE_MODELS = ['marigold-queue-man', 'marigold-queue-woman'];
// Front of the line is nearest the door. Rear patrons are closer to camera.
const QUEUE_SLOTS = [
    { x: 523, y: 440, height: 67 }, { x: 495, y: 441, height: 69 },
    { x: 466, y: 442, height: 72 }, { x: 436, y: 443, height: 75 },
    { x: 403, y: 444, height: 78 }, { x: 368, y: 445, height: 81 },
];

export class TitleStreet {
    static preload(scene) {
        scene.load.image('marigold-exterior', backgroundUrl);
        scene.load.image('marigold-queue-man', queueManUrl);
        scene.load.image('marigold-queue-woman', queueWomanUrl);
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

        this.queue = [];
        this.queueBusy = false;
        this.admittedCount = 0;
        this.nextPatron = 0;
        for (const key of QUEUE_MODELS) {
            const sheet = scene.textures.get(key);
            const source = sheet.getSourceImage();
            for (let i = 0; i < 4; i++) {
                const left = Math.round(i * source.width / 4);
                const right = Math.round((i + 1) * source.width / 4);
                if (!sheet.has(`pose-${i}`)) sheet.add(`pose-${i}`, 0, left, 0, right - left, source.height);
            }
            if (!scene.anims.exists(`${key}-walk`)) scene.anims.create({
                key: `${key}-walk`,
                frames: [1, 2, 3, 2].map(i => ({ key, frame: `pose-${i}` })),
                frameRate: 5, repeat: -1,
            });
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

        // Traffic is on hold pending a parked-car drawing matched to this
        // street. Keep the separate cars layer for that future integration.
        QUEUE_SLOTS.forEach((slot, i) => this.queue.push(this.addPatron(slot, i)));
        if (this.motion) {
            this.later(4200, () => this.flicker());
            this.later(3200, () => this.enterPatron());
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

    addPatron(slot, variation = this.nextPatron++) {
        const key = QUEUE_MODELS[variation % QUEUE_MODELS.length];
        const patron = this.scene.add.sprite(slot.x, slot.y, key, 'pose-0').setOrigin(0.5, 1);
        patron.setScale(slot.height / patron.frame.height);
        patron.setData('queueModel', key);
        // Small tonal variations distinguish repeated background actors.
        if (variation % 4 > 1) patron.setTint(0xd4c6b4);
        this.people.add(patron);
        this.actors.add(patron);
        this.people.sort('y');
        return patron;
    }

    walk(patron) { patron.play(`${patron.getData('queueModel')}-walk`); }
    stand(patron) { patron.stop().setFrame('pose-0'); }

    enterPatron() {
        if (this.disposed || this.queueBusy || !this.motion) return;
        this.queueBusy = true;
        const patron = this.queue.shift();
        this.walk(patron);
        this.scene.tweens.add({ targets: patron, x: 551, y: 432, duration: 1600,
            ease: 'Linear', onComplete: () => {
                this.scene.tweens.add({ targets: patron, x: 557, y: 427, alpha: 0,
                    duration: 450, onComplete: () => {
                        this.removeActor(patron);
                        this.admittedCount++;
                        this.advanceQueue();
                    } });
            } });
    }

    advanceQueue() {
        this.queue.forEach((patron, i) => {
            const slot = QUEUE_SLOTS[i];
            const scale = slot.height / patron.frame.height;
            this.later(i * 170, () => {
                this.walk(patron);
                this.scene.tweens.add({ targets: patron, x: slot.x, y: slot.y,
                    scaleX: scale, scaleY: scale, duration: 1100, ease: 'Linear',
                    onUpdate: () => this.people.sort('y'),
                    onComplete: () => this.stand(patron) });
            });
        });
        // Replenish the tail after the line settles; only moving people walk.
        this.later(2000, () => {
            const slot = QUEUE_SLOTS.at(-1);
            const newcomer = this.addPatron({ ...slot, x: slot.x - 45 });
            newcomer.setAlpha(0);
            this.walk(newcomer);
            this.scene.tweens.add({ targets: newcomer, alpha: 1, duration: 500 });
            this.scene.tweens.add({ targets: newcomer, x: slot.x, duration: 2400,
                ease: 'Linear', onComplete: () => {
                    this.stand(newcomer);
                    this.queue.push(newcomer);
                    this.queueBusy = false;
                    this.later(Phaser.Math.Between(5000, 9000), () => this.enterPatron());
                } });
        });
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
        this.queue.length = 0;
        this.queueBusy = false;
        this.layer.destroy();
    }
}
