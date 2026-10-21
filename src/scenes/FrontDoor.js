import { TitleStreet } from './TitleStreet.js';
import roomUrl from '../assets/story/dressing-room-v1.jpg';
import trainerUrl from '../assets/story/trainer-medium-v1.png';
import busStepUrl from '../assets/story/arrival-bus-step-v1.jpg';
import walkUrl from '../assets/story/arrival-walk-v1.jpg';
import firstSightUrl from '../assets/story/arrival-first-sight-v1.jpg';
import guidoCloseupUrl from '../assets/story/arrival-guido-closeup-v1.jpg';
import sideDoorUrl from '../assets/story/arrival-side-door-v1.jpg';
import bustleUrl from '../assets/story/arrival-entrance-bustle-v1.jpg';
import twoShotUrl from '../assets/story/dressing-room-two-shot-v1.jpg';
import reactionUrl from '../assets/story/dressing-room-guido-reaction-v1.jpg';
import tapeStartUrl from '../assets/story/dressing-room-tape-start-v1.jpg';
import offeredUrl from '../assets/story/dressing-room-wrist-offered-v1.jpg';
import departureUrl from '../assets/story/dressing-room-time-to-go-v1.jpg';

const SAVE_KEY = 'wfm.story.v1';
const INK = '#f6e4bd';
// First five arrival compositions are approved; completion shots await review.
const ARRIVAL = [
    { title: 'MARIGOLD ARENA · CHICAGO, 1952', cue: 'exterior-crowd' },
    { title: 'GRACE & ASHLAND', texture: 'arrival-bus', url: busStepUrl, cue: 'bus-arrival' },
    { title: 'EAST ON GRACE', texture: 'arrival-walk', url: walkUrl, cue: 'street-footsteps' },
    { texture: 'arrival-reveal', url: firstSightUrl, cue: 'arena-crowd-approach' },
    { texture: 'arrival-bustle', url: bustleUrl, cue: 'entrance-ticket-chatter' },
    { texture: 'arrival-closeup', url: guidoCloseupUrl, cue: 'marquee-hum' },
    { title: 'THE SIDE ENTRANCE', texture: 'arrival-door', url: sideDoorUrl, cue: 'service-door',
        text: 'TRAINER: You Moretti?\nGUIDO: Guido Moretti.\nTRAINER: In here, Guido.' },
];
const ROOM_SHOTS = {
    'room-two-shot': twoShotUrl, 'room-reaction': reactionUrl,
    'room-tape-start': tapeStartUrl, 'room-wrist-offered': offeredUrl,
    'room-departure': departureUrl,
};
// Empty dialogue entries are intentional visual pauses, advanced by the player.
const BOOKING = [
    ['', '', 'room-two-shot'],
    ['TRAINER', 'You’ve got George tonight. Give him a fight.\nWhen he catches you, you take the fall.', 'room-tape-start'],
    ['GUIDO', 'You’re telling me to throw it?\nWho’s got money on it?', 'room-two-shot'],
    ['TRAINER', 'This isn’t about a bet.', 'room-two-shot'],
    ['GUIDO', 'No way. If he beats me, he beats me.\nI’m not lying down.', 'room-reaction'],
    ['TRAINER', 'Hey. Do you want to work? George is the name they paid to see.\nYou give him a good match, you take the fall, you get to come back.'],
    ['GUIDO', 'And if I win?', 'room-reaction'],
    ['TRAINER', 'You’ll never work here or anywhere, ever again.\nThat’s the way it is.'],
    ['GUIDO', 'So what, you’re paying me to lose? What if I can whip him?', 'room-reaction'],
    ['TRAINER', 'Try if you want. But you probably don’t want to make George mad.\nHe’s tougher than he looks.'],
    ['', '', 'room-wrist-offered'],
    ['TRAINER', 'Try to get a little offense in. They don’t like George,\nso they’ll like you by default. Give ’em a reason to cheer.', 'room-two-shot'],
    ['TRAINER', 'Where’s your robe?'],
    ['GUIDO', 'Haven’t got one.', 'room-two-shot'],
    ['TRAINER', 'I’ve got an old one. You can wear it tonight.'],
    ['TRAINER', 'Take the fall, and I’ll buy you one of your own.\nMORETTI across the back.'],
    ['', '', 'room-departure'],
];

export default class FrontDoor extends Phaser.Scene {
    constructor() { super('FrontDoor'); }
    preload() {
        TitleStreet.preload(this);
        this.load.image('story-dressing-room', roomUrl);
        this.load.image('story-trainer', trainerUrl);
        ARRIVAL.filter(shot => shot.texture).forEach(shot => this.load.image(shot.texture, shot.url));
        Object.entries(ROOM_SHOTS).forEach(([key, url]) => this.load.image(key, url));
    }
    create() {
        this.selection = 0;
        this.state = 'title';
        this.panel = this.add.container(0, 0).setDepth(10);
        this.background = this.add.container(480, 300);
        this.street = new TitleStreet(this, this.background);
        this.arrivalPlate = this.add.image(480, 300, 'arrival-bus').setDepth(1).setVisible(false);
        this.room = this.add.container(480, 300).setDepth(2).setVisible(false);
        this.room.add(this.add.image(0, 0, 'story-dressing-room').setDisplaySize(1000, 625));
        this.trainer = this.add.image(-210, 285, 'story-trainer').setOrigin(0.5, 1);
        this.trainer.setScale(565 / this.trainer.height);
        this.room.add(this.trainer);
        this.roomShot = this.add.image(0, 0, 'room-two-shot').setDisplaySize(960, 600).setVisible(false);
        this.room.add(this.roomShot);
        this.lastCue = null;
        this.shade = this.add.rectangle(480, 300, 960, 600, 0x080a10, 1).setDepth(5).setAlpha(0);
        const handler = event => {
            if (event.repeat) return;
            if (event.code === 'ArrowDown') this.select(1);
            if (event.code === 'ArrowUp') this.select(-1);
            if (['Enter', 'Space'].includes(event.code)) this.activate();
            if (event.code === 'Escape') this.showTitle();
            if (event.code === 'KeyS' && this.state === 'arrival') this.beginBooking();
        };
        this.input.keyboard.on('keydown', handler);
        this.events.once('shutdown', () => this.input.keyboard.off('keydown', handler));
        this.showTitle();
    }
    label(x, y, text, size = 22, color = INK) {
        return this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color,
            align: 'center', lineSpacing: 10, wordWrap: { width: 800 }, shadow: { offsetX: 1, offsetY: 2, color: '#170c08', blur: 4, fill: true } }).setOrigin(0.5);
    }
    clear() { this.panel.removeAll(true); this.options = []; this.selection = 0; }
    readSave() {
        try {
            const data = JSON.parse(localStorage.getItem(SAVE_KEY));
            return data?.version === 1 && ['booking', 'ready'].includes(data.stage) ? data : null;
        } catch { return null; }
    }
    save(stage, decision = null) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, stage, decision })); this.saveFailed = false; }
        catch { this.saveFailed = true; }
    }
    showTitle() {
        this.clear(); this.state = 'title'; this.shade.setAlpha(0);
        this.tweens.killTweensOf(this.background);
        this.background.setScale(1);
        this.background.setPosition(480, 300);
        this.tweens.killTweensOf(this.room);
        this.room.setVisible(false);
        this.tweens.killTweensOf(this.arrivalPlate);
        this.arrivalPlate.setVisible(false);
        const saved = this.readSave();
        // Keep the menu legible over the illustrated street.
        this.panel.add(this.add.rectangle(480, 506, 320, 136, 0x080a10, 0.58));
        this.buttons([
            ['NEW GAME', () => { this.state = 'arrival'; this.index = 0; this.showArrival(); }],
            ['CONTINUE', () => saved.stage === 'ready' ? this.ready(saved.decision) : this.beginBooking(), !saved],
            ['EXHIBITION', () => this.scene.start('Arena')],
        ], 465, 38);
        this.panel.add(this.label(480, 578, '↑ ↓ SELECT    ENTER CONFIRM    ·    CLICK TO SELECT', 12, '#c4b69a'));
    }
    buttons(entries, top, spacing = 44) {
        this.options = entries.map(([text, action, disabled], i) => {
            const item = this.label(480, top + i * spacing, text, 20, disabled ? '#756e62' : INK);
            this.panel.add(item);
            if (!disabled) item.setInteractive({ useHandCursor: true }).on('pointerover', () => { this.selection = i; this.highlight(); })
                .on('pointerdown', action);
            return { item, action, disabled };
        });
        this.selection = this.options.findIndex(option => !option.disabled);
        this.highlight();
    }
    highlight() {
        this.options.forEach((option, i) => option.item.setColor(option.disabled ? '#756e62' : i === this.selection ? '#fff7df' : '#c4b69a')
            .setText(`${i === this.selection ? '›  ' : ''}${option.item.text.replace(/^›  /, '')}`));
    }
    select(direction) {
        if (!this.options.length) return;
        do { this.selection = (this.selection + direction + this.options.length) % this.options.length; }
        while (this.options[this.selection].disabled);
        this.highlight();
    }
    activate() {
        if (this.options.length) this.options[this.selection]?.action();
        else if (this.state === 'arrival') { this.index++; this.showArrival(); }
        else if (this.state === 'booking') { this.index++; this.showBooking(); }
    }
    card(kicker, text, hint = 'ENTER / CLICK TO CONTINUE    ·    ESC TITLE') {
        this.clear(); this.shade.setAlpha(0.76);
        this.panel.add(this.label(480, 326, kicker, 17, '#d6ac63'));
        this.panel.add(this.label(480, 403, text, 23));
        if (hint) {
            const next = this.label(480, 563, hint, 12, '#c4b69a').setInteractive({ useHandCursor: true });
            next.on('pointerdown', () => this.activate()); this.panel.add(next);
        }
    }
    // Named cues are silent until licensed audio is attached. A sound director
    // can subscribe without coupling asset playback to dialogue progression.
    cue(name) {
        this.lastCue = name;
        this.events.emit('story-cue', name);
    }
    showArrival() {
        if (this.index >= ARRIVAL.length) return this.beginBooking();
        const shot = ARRIVAL[this.index];
        this.clear(); this.shade.setAlpha(0);
        this.tweens.killTweensOf(this.background);
        this.tweens.killTweensOf(this.arrivalPlate);
        this.arrivalPlate.setVisible(Boolean(shot.texture));
        if (shot.texture) this.arrivalPlate.setTexture(shot.texture).setDisplaySize(960, 600);
        // Keep the art unobscured except for the editable door exchange.
        if (shot.title) {
            this.panel.add(this.add.rectangle(480, 36, 960, 72, 0x080a10, 0.55));
            this.panel.add(this.label(480, 36, shot.title, 18));
        }
        if (shot.text) {
            this.panel.add(this.add.rectangle(480, 490, 960, 220, 0x080a10, 0.87));
            this.panel.add(this.label(480, 475, shot.text, 21));
        }
        this.panel.add(this.add.rectangle(480, 574, 960, 52, 0x080a10, 0.7));
        const next = this.label(480, 574, 'ENTER / CLICK TO CONTINUE    ·    S SKIP ARRIVAL    ·    ESC TITLE', 12)
            .setInteractive({ useHandCursor: true });
        next.on('pointerdown', () => this.activate()); this.panel.add(next);
        this.cue(shot.cue);
        if (this.street.motion) {
            const target = shot.texture ? this.arrivalPlate : this.background;
            this.tweens.add({ targets: target, scaleX: target.scaleX * 1.04,
                scaleY: target.scaleY * 1.04, duration: 4000, ease: 'Sine.easeInOut' });
        }
    }
    stageRoom() {
        this.roomShot.setVisible(false);
        this.tweens.killTweensOf(this.arrivalPlate);
        this.arrivalPlate.setVisible(false);
        this.tweens.killTweensOf(this.background);
        this.room.setVisible(true).setScale(1).setPosition(480, 300);
        this.tweens.killTweensOf(this.room);
        if (this.street.motion) this.tweens.add({ targets: this.room, scale: 1.04,
            duration: 12000, ease: 'Sine.easeInOut' });
        this.cue('dressing-room-muffled-crowd');
    }
    beginBooking() {
        this.save('booking'); this.state = 'booking'; this.index = 0;
        this.stageRoom(); this.showBooking();
    }
    showRoomShot(texture) {
        this.roomShot.setVisible(Boolean(texture));
        if (texture) this.roomShot.setTexture(texture).setDisplaySize(960, 600);
        this.tweens.killTweensOf(this.room);
        this.room.setScale(1);
        if (this.street.motion) this.tweens.add({ targets: this.room, scale: 1.04,
            duration: 8000, ease: 'Sine.easeInOut' });
    }
    showBooking() {
        if (this.index >= BOOKING.length) return this.ready('accept');
        const [speaker, text, texture] = BOOKING[this.index];
        this.clear(); this.shade.setAlpha(0);
        this.showRoomShot(texture);
        if (text) {
            this.panel.add(this.add.rectangle(480, 520, 960, 160, 0x080a10, 0.9));
            this.panel.add(this.label(480, 460, speaker, 16, '#d6ac63'));
            this.panel.add(this.label(480, 513, text, 20));
        } else if (texture === 'room-departure') {
            this.panel.add(this.add.rectangle(480, 34, 960, 68, 0x080a10, 0.6));
            this.panel.add(this.label(480, 34, 'A FEW MINUTES LATER', 17));
        }
        this.panel.add(this.add.rectangle(480, 579, 960, 42, 0x080a10, 0.7));
        const next = this.label(480, 579, 'ENTER / CLICK TO CONTINUE    ·    ESC TITLE', 12, '#c4b69a')
            .setInteractive({ useHandCursor: true });
        next.on('pointerdown', () => this.activate()); this.panel.add(next);
        this.cue(text ? (speaker === 'TRAINER' ? 'trainer-line' : 'guido-line') : texture);
    }
    ready(decision) {
        this.save('ready', decision); this.state = 'ready';
        if (!this.room.visible) this.stageRoom();
        this.clear(); this.shade.setAlpha(0);
        this.showRoomShot('room-departure');
        this.panel.add(this.add.rectangle(480, 520, 960, 160, 0x080a10, 0.9));
        this.panel.add(this.label(480, 460, 'FIRST NIGHT · GORGEOUS GEORGE', 17, '#d6ac63'));
        this.panel.add(this.label(480, 490, 'Opening preview complete. Guido’s first match is still in development.', 15, '#c4b69a'));
        this.buttons([['PLAY EXHIBITION', () => this.scene.start('Arena')], ['RETURN TO TITLE', () => this.showTitle()]], 530, 35);
        if (this.saveFailed) this.panel.add(this.label(480, 583, 'Progress could not be saved in this browser.', 12));
    }
}
