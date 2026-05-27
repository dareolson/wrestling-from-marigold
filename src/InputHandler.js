// Abstracts keyboard and gamepad input behind a common interface.
// Wrestler calls isDown(action) and justDown(action) without knowing the source.
//
// Standard gamepad layout (Xbox / PS / generic Bluetooth):
//   btn 0  = A / Cross      → action (grapple)
//   btn 2  = X / Square     → power
//   btn 3  = Y / Triangle   → finisher
//   btn 12 = D-pad Up
//   btn 13 = D-pad Down
//   btn 14 = D-pad Left
//   btn 15 = D-pad Right
//   axis 0 = Left stick X
//   axis 1 = Left stick Y

const STICK_DEAD = 0.4;

const PAD_BUTTONS = { action: 0, power: 2, finisher: 3 };
const PAD_DPAD    = { up: 12, down: 13, left: 14, right: 15 };
const PAD_AXIS    = { left: [0, -1], right: [0, 1], up: [1, -1], down: [1, 1] };

export default class InputHandler {
    // type: 'keyboard' | 'gamepad'
    // For keyboard: pass the keys object { up, down, left, right, action, power, finisher }
    // For gamepad:  pass { scene, padIndex }
    constructor(type, source) {
        this.type   = type;
        this.source = source;
    }

    isDown(action) {
        if (this.type === 'keyboard') {
            return this.source[action]?.isDown ?? false;
        }
        const pad = this._pad();
        if (!pad) return false;
        if (PAD_DPAD[action] !== undefined && pad.buttons[PAD_DPAD[action]]?.isDown) return true;
        if (PAD_AXIS[action]) {
            const [axisIdx, sign] = PAD_AXIS[action];
            if (pad.axes[axisIdx]?.getValue() * sign > STICK_DEAD) return true;
        }
        return pad.buttons[PAD_BUTTONS[action]]?.isDown ?? false;
    }

    justDown(action) {
        if (this.type === 'keyboard') {
            const key = this.source[action];
            return key ? Phaser.Input.Keyboard.JustDown(key) : false;
        }
        const pad = this._pad();
        if (!pad) return false;
        // D-pad and stick don't use justDown — only face buttons do
        return pad.buttons[PAD_BUTTONS[action]]?.justDown ?? false;
    }

    _pad() {
        const gp = this.source.scene?.input?.gamepad;
        return gp?.getPad(this.source.padIndex ?? 0) ?? null;
    }
}
