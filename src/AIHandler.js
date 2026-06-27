// AI input handler — same interface as InputHandler (isDown / justDown).
// Personalities shape decision-making; 'george' is a cowardly heel who
// stalls, seeks ropes, cheap-shots, and turns aggressive only when the
// opponent is vulnerable.

const PERSONALITIES = {
    brawler: {
        stallChance:      0.003, // ~once per 5s at 60fps
        retreatStamina:   20,    // backs off below this %
        cheapShotOdds:    0.30,  // jab vs grapple when standing close
        lockupPreference: 'slam',
        tauntOdds:        0.10,
    },
    george: {
        stallChance:      0.012, // ~once per 1.5s — backs off constantly
        retreatStamina:   45,    // retreats much earlier
        cheapShotOdds:    0.70,  // mostly jabs, avoids clean tie-ups
        lockupPreference: 'headlock', // drain stamina with holds
        tauntOdds:        0.35,  // preens and poses often when safe
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

        const self = this._self;
        const opp  = this._opp;
        if (!self || !opp) return;

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

        // Only act while standing (not mid-move, falling, etc.)
        if (self.state !== 'standing') return;

        this._updateMovement(dt);
        if (this._cooldown <= 0) this._chooseAction();
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

    _updateMovement(dt) {
        const self  = this._self;
        const opp   = this._opp;
        const cfg   = this._cfg;
        const dx    = opp.x - self.x;
        const dy    = opp.y - self.y;
        const dist  = Math.hypot(dx, dy);
        const scale = self.s;
        const IDEAL = 100 * scale; // preferred fighting distance
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

        // George rope-seeks when hurt: drift toward the nearest horizontal edge
        if (cfg.ropeSeek && lowStam) {
            const toLeft = self.x < 480; // which side is closer
            this._hold(toLeft ? 'left' : 'right');
            return;
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

        // Begging off — George backs into corner and gestures when hurt
        if (cfg.beggingOff && lowStam) {
            if (Math.random() < 0.04) {
                this._press('finisher'); // taunt (begging off gesture)
                this._cooldown = 2.0;
            }
            return;
        }

        // Opponent is down or playing possum — pounce
        if (opp.state === 'down' || opp.state === 'possum') {
            if (dist < GRAPPLE_REACH) {
                // Low stamina on opponent → go for pin; otherwise elbow drop
                if (opp.stamina < 45) {
                    this._press('action'); // pin
                    this._cooldown = 0.5;
                } else {
                    this._press('power'); // elbow drop
                    this._cooldown = 0.9;
                }
            }
            return;
        }

        // Opponent staggered — headbutt to knock them down
        if (opp.state === 'staggered' && dist < GRAPPLE_REACH) {
            this._press('power');
            this._cooldown = 0.85;
            return;
        }

        if (opp.state !== 'standing') return; // don't interrupt ongoing moves

        // Close range
        if (dist < JAB_REACH) {
            if (Math.random() < cfg.cheapShotOdds) {
                this._press('power'); // jab
                this._cooldown = 0.55;
            } else {
                this._press('action'); // grapple → lockup
                this._cooldown = 0.8;
            }
            return;
        }

        // Medium range — dropkick or close the gap
        if (dist < MED_REACH) {
            if (Math.random() < 0.5) {
                this._press('power'); // dropkick
                this._cooldown = 1.2;
            }
            return;
        }

        // Out of range — occasional taunt while approaching
        if (Math.random() < cfg.tauntOdds * 0.005) {
            this._press('finisher');
            this._cooldown = 2.5;
        }
    }

    _handleLockup() {
        // Wait a beat before committing to a follow-up
        if (this._cooldown > 0) return;

        const cfg = this._cfg;
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
    }
}
