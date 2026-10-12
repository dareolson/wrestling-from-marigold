import { TitleStreet } from './TitleStreet.js';

const SAVE_KEY = 'wfm.story.v1';
const INK = '#f6e4bd';
const ARRIVAL = [
    ['CHICAGO · SATURDAY NIGHT, 1952', 'The Ashland bus leaves you at Grace Street.\nOne bag. Enough money to get home.'],
    ['EAST ON GRACE', 'You follow the sound of the crowd.\nGeorge’s name is on the bill. Yours isn’t.'],
    ['THE SIDE ENTRANCE', 'TRAINER: You Moretti?\nGUY: Guido Moretti.\nTRAINER: In here, Guido.'],
];
const BOOKING = [
    ['TRAINER', 'You’ve got George tonight. Give him a fight.\nWhen he catches you, you take the fall.'],
    ['GUY', 'You’re telling me to throw it?\nWho’s got money on it?'],
    ['TRAINER', 'This isn’t about a bet.'],
    ['GUY', 'No way. If he beats me, he beats me.\nI’m not lying down.'],
    ['TRAINER', 'Hey. Do you want to work? George is the name they paid to see.\nYou give him a good match, you take the fall, you get to come back.'],
    ['GUY', 'And if I win?'],
    ['TRAINER', 'You’ll never work here again. Word gets around.'],
    ['GUY', 'Then what am I supposed to prove?'],
    ['TRAINER', 'That he can trust you with his body. That you can trust him with yours.\nYou still have to wrestle him, kid.'],
];

export default class FrontDoor extends Phaser.Scene {
    constructor() { super('FrontDoor'); }
    preload() { TitleStreet.preload(this); }
    create() {
        this.selection = 0;
        this.state = 'title';
        this.panel = this.add.container(0, 0).setDepth(10);
        this.background = this.add.container(480, 300);
        this.street = new TitleStreet(this, this.background);
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
    showArrival() {
        if (this.index >= ARRIVAL.length) return this.beginBooking();
        const [title, text] = ARRIVAL[this.index];
        this.card(title, text, 'ENTER / CLICK TO CONTINUE    ·    S SKIP ARRIVAL    ·    ESC TITLE');
        if (this.index === 0 && this.street.motion) this.tweens.add({ targets: this.background, scale: 1.04,
            duration: 4000, ease: 'Sine.easeInOut' });
    }
    beginBooking() {
        this.save('booking'); this.state = 'booking'; this.index = 0;
        this.tweens.killTweensOf(this.background); this.showBooking();
    }
    showBooking() {
        if (this.index >= BOOKING.length) return this.choose();
        this.card(...BOOKING[this.index]);
    }
    choose() {
        this.state = 'choice'; this.card('YOUR FIRST BOOKING', 'George gets the fall. You decide whether to stay.', '');
        this.buttons([
            ['ALL RIGHT. I’LL TAKE THE FALL.', () => this.ready('accept')],
            ['I’LL TALK TO GEORGE FIRST.', () => {
                this.state = 'george';
                this.card('GORGEOUS GEORGE', 'Give them something to cheer for, kid.\nWhen I catch you, don’t fight the finish.', '');
                this.buttons([['I’LL STAY.', () => this.ready('talk')], ['I’M LEAVING.', () => this.leave()]], 500, 36);
            }],
            ['THEN KEEP YOUR MONEY.', () => this.leave()],
        ], 478, 36);
    }
    leave() {
        this.state = 'departure';
        this.card('THE SIDE DOOR', 'The trainer lets you reach the door.\n“Last chance, Guido. You want to work?”', '');
        this.buttons([['TURN BACK. TAKE THE BOOKING.', () => this.ready('accept')],
            ['WALK AWAY.', () => {
                try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
                this.state = 'ending'; this.card('THE BUS HOME', 'You leave with your bag. Inside, the show goes on.', '');
                this.buttons([['RETURN TO TITLE', () => this.showTitle()]], 520);
            }]], 493, 40);
    }
    ready(decision) {
        this.save('ready', decision); this.state = 'ready';
        this.card('FIRST NIGHT · GORGEOUS GEORGE', 'You’ve agreed to take the fall.\nNow you have to trust the man in the ring.', '');
        this.panel.add(this.label(480, 462, 'Opening preview complete. Guy’s first match is still in development.', 15, '#c4b69a'));
        this.buttons([['PLAY EXHIBITION', () => this.scene.start('Arena')], ['RETURN TO TITLE', () => this.showTitle()]], 507, 36);
        if (this.saveFailed) this.panel.add(this.label(480, 583, 'Progress could not be saved in this browser.', 12));
    }
}
