// AI input handler — same interface as InputHandler (isDown / justDown).
// Personalities shape decision-making; 'george' is a cowardly heel who
// stalls, seeks ropes, cheap-shots, and turns aggressive only when the
// opponent is vulnerable.

import { ringBoundsAtY } from './constants.js';

const PERSONALITIES = {
    brawler: {
        stallChance:      0.003, // ~once per 5s at 60fps
        retreatStamina:   20,    // backs off below this %
        cheapShotOdds:    0.30,  // jab vs grapple when standing close
        dropkickOdds:     0.40,  // medium-range dropkick frequency
        lockupPreference: 'slam',
        tauntOdds:        0.10,
        showboatAfter:    0,     // never breaks rhythm to pose
    },
    george: {
        stallChance:      0.012, // ~once per 1.5s — backs off constantly
        retreatStamina:   45,    // retreats much earlier
        cheapShotOdds:    0.60,  // mostly jabs, avoids clean tie-ups
        dropkickOdds:     0.10,  // rarely leaves his feet — he's a staller
        lockupPreference: 'headlock', // drain stamina with holds
        tauntOdds:        0.35,  // preens and poses often when safe
        showboatAfter:    2,     // backs off to preen after landing 2 moves
        ropeSeek:         true,  // drifts toward ropes when hurt
        beggingOff:       true,  // backs into corner below retreatStamina
    },
};

export default class AIHandler {
    constructor(personality = 'brawler') {
        this._cfg         = PERSONALITIES[personality] ?? PERSONALITIES.brawler;
        this._keys        = {};
        this._justPressed = {};
        this._self        = null;
        this._opp         = null;
        this._cooldown    = 0;
        this._stallTimer  = 0;
        this._retreating  = false;
        this._offense     = 0;     // global cooldown after any attack — paces overall aggression
        this._landed      = 0;     // attacks thrown since last showboat break
        this._showboat    = false; // mid showboat beat (stall, then taunt)
        this._react       = 0;     // human-feel delay before pouncing on a downed opponent
        this._oppWasDown  = false;
        this._pinWait     = 0;     // cooldown after a pin attempt — no instant re-covers
    }

    // Called once after both wrestlers are constructed.
    setWrestlers(self, opponent) {
        this._self = self;
        this._opp  = opponent;
    }

    // Called at the top of each game tick — clears last frame's presses and decides.
    tick(dt) {
        this._justPressed = {};
        this._keys        = {};
        this._cooldown    = Math.max(0, this._cooldown - dt);
        this._stallTimer  = Math.max(0, this._stallTimer - dt);
        this._offense     = Math.max(0, this._offense - dt);
        this._react       = Math.max(0, this._react - dt);
        this._pinWait     = Math.max(0, this._pinWait - dt);

        const self = this._self;
        const opp  = this._opp;
        if (!self || !opp) return;

        // Reaction delay: when the opponent hits the mat, take a beat before pouncing
        const oppDown = opp.state === 'down' || opp.state === 'possum';
        if (oppDown && !this._oppWasDown) this._react = 0.15 + Math.random() * 0.2;
        if (!oppDown) this._pounces = 0; // fresh down-spell, fresh pounce budget
        this._oppWasDown = oppDown;

        // Mash to escape holds and kick out of pins
        if (self.state === 'sleeping' || self.state === 'headlocked') {
            if (Math.random() < 0.08) this._press('action');
            return;
        }
        if (self.state === 'pinned') {
            if (Math.random() < 0.12) this._press('action');
            return;
        }

        // In lockup: choose a follow-up
        if (self.state === 'lockup') {
            this._handleLockup();
            return;
        }
        this._contested = false; // lockup over — next one gets a fresh contest roll

        // Only act while standing (not mid-move, falling, etc.)
        if (self.state !== 'standing') return;

        this._updateMovement(dt);
        // No decisions while backing off — stalling and swinging at once reads wrong
        if (this._cooldown <= 0 && this._stallTimer <= 0) this._chooseAction();
    }

    isDown(key)   { return !!this._keys[key]; }
    justDown(key) { return !!this._justPressed[key]; }

    // ── Internal ──────────────────────────────────────────────────────────────

    _press(key) {
        this._keys[key]        = true;
        this._justPressed[key] = true;
    }

    _hold(key) {
        this._keys[key] = true;
    }

    // Offensive press: sets the per-action cooldown plus a randomized global
    // offense cooldown so attacks come in beats, not machine-gun bursts.
    _attack(key, cooldown) {
        this._press(key);
        this._cooldown = cooldown;
        this._offense  = 1.1 + Math.random() * 0.9;
        this._landed++;
    }

    _updateMovement(dt) {
        const self  = this._self;
        const opp   = this._opp;
        const cfg   = this._cfg;
        const dx    = opp.x - self.x;
        const dy    = opp.y - self.y;
        const dist  = Math.hypot(dx, dy);
        const scale = self.s;
        const IDEAL = 82 * scale; // preferred fighting distance — just inside jab reach
        const FAR   = 210 * scale;

        const lowStam = self.stamina < cfg.retreatStamina;

        // Stall — randomly decide to back off (George does this constantly)
        if (!lowStam && this._stallTimer <= 0 && dist < FAR) {
            if (Math.random() < cfg.stallChance) {
                this._stallTimer = 1.2 + Math.random() * 1.4;
            }
        }

        if (this._stallTimer > 0) {
            // Backing away from opponent
            if (Math.abs(dx) > 8) this._hold(dx > 0 ? 'left' : 'right');
            if (Math.abs(dy) > 8) this._hold(dy > 0 ? 'up'   : 'down');
            return;
        }

        // George rope-seeks when hurt — but in waves, not permanently. A heel
        // who never leaves the ropes can never be pinned (covers rope-break
        // there), so seek for a few seconds, then drift back into the match.
        if (cfg.ropeSeek && lowStam) {
            this._ropeTimer = (this._ropeTimer ?? 0) - dt;
            if (this._ropeTimer <= 0) {
                this._ropeSeeking = !this._ropeSeeking;
                this._ropeTimer   = this._ropeSeeking ? 2.5 + Math.random() * 1.5
                                                      : 3.0 + Math.random() * 2.0;
            }
            if (this._ropeSeeking) {
                const toLeft = self.x < 480; // which side is closer
                this._hold(toLeft ? 'left' : 'right');
                return;
            }
            // Off-wave: fall through to normal spacing/approach below
        }

        // Close enough — hold position, let _chooseAction handle the rest
        if (dist < IDEAL) return;

        // Move toward opponent
        if (Math.abs(dx) > 8) this._hold(dx > 0 ? 'right' : 'left');
        if (Math.abs(dy) > 8) this._hold(dy > 0 ? 'down'  : 'up');
    }

    _chooseAction() {
        const self  = this._self;
        const opp   = this._opp;
        const cfg   = this._cfg;
        const dx    = opp.x - self.x;
        const dy    = opp.y - self.y;
        const dist  = Math.hypot(dx, dy);
        const scale = self.s;
        const lowStam = self.stamina < cfg.retreatStamina;

        const JAB_REACH     = 88  * scale;
        const GRAPPLE_REACH = 112 * scale;
        const MED_REACH     = 220 * scale;
        const TAUNT_SAFE    = 150 * scale; // finisher press taunts instead of sleeping past this

        // Showboat — after landing a couple of moves, break rhythm: back off, then preen
        if (cfg.showboatAfter && this._landed >= cfg.showboatAfter) {
            this._landed    = 0;
            this._showboat  = true;
            this._stallTimer = 0.9 + Math.random() * 0.6;
            return;
        }
        if (this._showboat && this._stallTimer <= 0) {
            this._showboat = false;
            if (dist > TAUNT_SAFE || opp.state !== 'standing') {
                this._press('finisher'); // taunt
                this._cooldown = 2.2;
                return;
            }
        }

        // Begging off — George backs into corner and gestures when hurt,
        // but throws a desperate cheap shot if you walk right into him
        if (cfg.beggingOff && lowStam) {
            if (dist < JAB_REACH && opp.state === 'standing' && Math.random() < 0.4) {
                this._attack('power', 1.0); // jab
            } else if (dist > TAUNT_SAFE && Math.random() < 0.04) {
                this._press('finisher'); // taunt (begging off gesture)
                this._cooldown = 2.0;
            }
            return;
        }

        // Opponent is down or playing possum — pounce, after a human reaction beat
        if (opp.state === 'down' || opp.state === 'possum') {
            if (this._react > 0 || dist >= GRAPPLE_REACH) return;
            // Pins break instantly at the ropes — don't cover there, and don't
            // machine-gun re-covers after a kickout or rope break
            const pinnable = opp.stamina < 45 && this._pinWait <= 0 && !this._nearRopes(opp);
            if (pinnable) {
                this._press('action'); // pin
                this._cooldown = 0.5;
                this._pinWait  = 2.2 + Math.random() * 1.2;
            } else if (this._offense <= 0 && (this._pounces ?? 0) < 2 && !this._nearRopes(opp)) {
                // Each drop re-downs them, so cap follow-ups per down-spell and
                // never chain them at the ropes — back off and let them rise
                this._attack('power', 0.9); // elbow drop
                this._pounces = (this._pounces ?? 0) + 1;
            } else if (this._stallTimer <= 0 && this._offense <= 0) {
                this._stallTimer = 0.8; // step back, wait for the rise
            }
            return;
        }

        // Opponent staggered — headbutt to knock them down. Deliberately ahead
        // of the offense gate: jab → headbutt is the combo that converts a
        // stagger into a knockdown before it wears off. Rolled per beat so
        // roughly half the staggers convert.
        if (opp.state === 'staggered' && dist < GRAPPLE_REACH) {
            if (Math.random() < 0.55) this._attack('power', 0.85);
            else                      this._cooldown = 0.45;
            return;
        }

        // All attacks below respect the global offense cooldown
        if (this._offense > 0) return;

        // Whipped opponent returning off the ropes — clothesline the rebound
        if (opp.state === 'running' && opp.runPhase === 'returning') {
            if (Math.abs(opp.x - self.x) < 130 * scale) {
                this._attack('action', 1.0); // clothesline
            }
            return;
        }

        if (opp.state !== 'standing') return; // don't interrupt ongoing moves

        // Close range
        if (dist < JAB_REACH) {
            // A hurt opponent hiding at the ropes can't be pinned there — tie up
            // and whip them off the ropes instead of striking them in place
            if (opp.stamina < 45 && this._nearRopes(opp)) {
                this._attack('action', 0.8); // grapple → lockup → whip
            } else if (Math.random() < cfg.cheapShotOdds) {
                this._attack('power', 0.55); // jab
            } else {
                this._attack('action', 0.8); // grapple → lockup
            }
            return;
        }

        // Medium range — dropkick or close the gap.
        // Failed roll sets a short cooldown so the odds are per-beat, not
        // per-frame (per-frame rolls saturate to 100% within a second).
        if (dist < MED_REACH) {
            if (Math.random() < cfg.dropkickOdds) {
                this._attack('power', 1.2); // dropkick
            } else {
                this._cooldown = 0.5;
            }
            return;
        }

        // Out of range — occasional taunt while approaching
        if (Math.random() < cfg.tauntOdds * 0.005) {
            this._press('finisher');
            this._cooldown = 2.5;
        }
    }

    // Same rope proximity check the game uses for rope breaks, slightly wider
    _nearRopes(w) {
        const b   = ringBoundsAtY(w.y);
        const thr = 34 * w.s;
        return w.x <= b.left + thr || w.x >= b.right - thr;
    }

    _handleLockup() {
        // Wait a beat before committing to a follow-up
        if (this._cooldown > 0) return;

        // Pressing grapple as the DEFENDER steals the lockup — two AIs doing
        // that unconditionally trade steals forever. Contest at most once per
        // lockup, and usually just eat the follow-up.
        const ls = this._self.scene?.lockupState;
        if (ls && ls.defender === this._self) {
            if (!this._contested) {
                this._contested = true;
                if (Math.random() < 0.35) this._press('action'); // steal it
            }
            this._cooldown = 0.4;
            return;
        }

        const cfg = this._cfg;

        // Opponent clinging to the ropes: whip them across the ring so the
        // rebound (and the pin that follows) happens mid-ring
        if (this._nearRopes(this._opp)) {
            this._hold(this._self.facing > 0 ? 'right' : 'left');
            this._press('action'); // → irish whip
            this._cooldown = 0.8;
            this._offense  = 1.1 + Math.random() * 0.9;
            this._landed++;
            return;
        }

        if (cfg.lockupPreference === 'headlock') {
            // George: headlock to drain stamina, or irish whip to create space
            if (Math.random() < 0.55) {
                this._hold('down');
                this._press('action'); // → headlock
            } else {
                // Whip in the facing direction
                this._hold(this._self.facing > 0 ? 'right' : 'left');
                this._press('action'); // → irish whip
            }
        } else {
            // Brawler: straight slam
            this._press('action');
        }
        this._cooldown = 0.8;
        this._offense  = 1.1 + Math.random() * 0.9;
        this._landed++;
    }
}
