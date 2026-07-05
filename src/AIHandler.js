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
        dropkickOdds:     0.28,  // medium-range dropkick frequency
        pounceBudget:     1,     // one follow-up drop per knockdown, then backs off
        lockupPreference: 'slam',
        tauntOdds:        0.10,
        showboatAfter:    0,     // never breaks rhythm to pose
        cooldownScale:    1.35,  // heavy hitter, slower between engagements
        staggerSlamOdds:  0.25,  // sometimes grabs a stumbler for the slam instead of headbutting
        evadeOdds:        0.06,  // rarely gives ground — he plants and trades
        blockOdds:        0.14,  // stands his ground and stuffs tie-ups
    },
    george: {
        stallChance:      0.012, // ~once per 1.5s — backs off constantly
        retreatStamina:   35,    // retreats earlier than the brawler, but fights enough to matter
        cheapShotOdds:    0.60,  // mostly jabs, avoids clean tie-ups
        dropkickOdds:     0.10,  // rarely leaves his feet — he's a staller
        lockupPreference: 'headlock', // drain stamina with holds
        holdOdds:         0.70,  // lockup → headlock this often (attrition is the game plan)
        tauntOdds:        0.35,  // preens and poses often when safe
        showboatAfter:    2,     // backs off to preen after landing 2 moves
        ropeSeek:         true,  // drifts toward ropes when hurt
        beggingOff:       true,  // backs into corner below retreatStamina
        attrition:        true,  // hunts the sleeper once the opponent is worn down
        cooldownScale:    0.85,  // busy hands — jabs and holds come in quicker beats
        staggerSlamOdds:  0.40,  // jab → stagger → piledriver is his real damage engine
        evadeOdds:        0.22,  // slippery — backsteps out of exchanges constantly
        blockOdds:        0.14,  // will brace to stuff a tie-up when cornered
        coverStamina:     55,    // covers earlier — he lands piledrivers, he has to convert them
        pinWait:          [1.2, 2.0], // hustles into re-covers; lazy 2.2–3.4 default gave p1 the rise
        attritionAt:      70,    // sleeper hunt opens while George still has gas (below 35 he's begging off)
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
        this._defWait     = 0;     // beat between defensive-mixup rolls
        this._blockTimer  = 0;     // remaining time to keep the block key held
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
        this._defWait     = Math.max(0, this._defWait - dt);

        const self = this._self;
        const opp  = this._opp;
        if (!self || !opp) return;

        // Reaction delay: when the opponent hits the mat, take a beat before pouncing
        const oppDown = opp.state === 'down' || opp.state === 'possum';
        if (oppDown && !this._oppWasDown) this._react = 0.15 + Math.random() * 0.2;
        if (!oppDown) this._pounces = 0; // fresh down-spell, fresh pounce budget
        this._oppWasDown = oppDown;

        // Mash to escape holds and kick out of pins. A drained wrestler mashes
        // slower — holds genuinely stick once you're worn down. Rates are
        // per-second (× dt) so behavior is stable across frame rate and the
        // debug time-scale.
        if (self.state === 'sleeping' || self.state === 'headlocked') {
            const rate = 4.8 * (0.3 + 0.7 * self.stamina / 100);
            if (Math.random() < rate * dt) this._press('action');
            return;
        }
        if (self.state === 'pinned') {
            if (Math.random() < 7.2 * dt) this._press('action');
            return;
        }

        // In lockup: choose a follow-up
        if (self.state === 'lockup') {
            this._handleLockup();
            return;
        }
        this._contested = false; // lockup over — next one gets a fresh contest roll

        // Mid block stance: keep the key held for the decided window (keys are
        // cleared every tick, so the hold has to be re-pressed each frame).
        // If the block just stuffed a grapple, drop the stance immediately —
        // the staggered attacker is the punish window.
        if (this._blockTimer > 0) {
            if (opp.state === 'staggered') {
                this._blockTimer = 0;
            } else {
                this._blockTimer -= dt;
                this._hold('block');
                return;
            }
        }

        // Only act while standing (not mid-move, falling, etc.)
        if (self.state !== 'standing') return;

        this._updateMovement(dt);
        // No decisions while backing off — stalling and swinging at once reads wrong
        if (this._cooldown <= 0 && this._stallTimer <= 0) this._chooseAction(dt);
    }

    isDown(key)   { return !!this._keys[key]; }
    justDown(key) { return !!this._justPressed[key]; }

    // Drop any held keys. Arena calls this while the win banner is up —
    // pausing tick() alone freezes the key map with the last frame's presses
    // still down, and a frozen justDown('action') re-fires every frame
    // (zombie pins on the loser mid-banner, stale pinState into the next match).
    clear() {
        this._keys        = {};
        this._justPressed = {};
    }

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
        this._offense  = (1.35 + Math.random() * 1.0) * (this._cfg.cooldownScale ?? 1);
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

        // Stall — randomly decide to back off (George does this constantly).
        // stallChance is per-frame-at-60fps, scaled by dt for time-scale safety.
        if (!lowStam && this._stallTimer <= 0 && dist < FAR) {
            if (Math.random() < cfg.stallChance * 60 * dt) {
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

    _chooseAction(dt) {
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

        // Showboat — after landing a couple of moves, break rhythm: back off,
        // then preen. Suppressed when the opponent is badly hurt: even George
        // has killer instinct once he smells a finish (posing here let the
        // opponent recover everything the holds had drained).
        if (cfg.showboatAfter && this._landed >= cfg.showboatAfter && opp.stamina >= 50) {
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
            const pinnable = opp.stamina < (cfg.coverStamina ?? 45) && this._pinWait <= 0 && !this._nearRopes(opp);
            if (pinnable) {
                this._press('action'); // pin
                this._cooldown = 0.5;
                const [pwLo, pwHi] = cfg.pinWait ?? [2.2, 3.4];
                this._pinWait = pwLo + Math.random() * (pwHi - pwLo);
            } else if (this._offense <= 0 && (this._pounces ?? 0) < (cfg.pounceBudget ?? 2) && !this._nearRopes(opp)) {
                // Each drop re-downs them, so cap follow-ups per down-spell and
                // never chain them at the ropes — back off and let them rise
                this._attack('power', 0.9); // elbow drop
                this._pounces = (this._pounces ?? 0) + 1;
            } else if (this._stallTimer <= 0 && this._offense <= 0) {
                this._stallTimer = 0.8; // step back, wait for the rise
            }
            return;
        }

        // Opponent staggered — convert it. Deliberately ahead of the offense
        // gate: this is the combo window. A stumbling wrestler can't resist a
        // tie-up, so grapple here goes straight to the kit's big slam
        // (piledriver/body slam); otherwise headbutt for the knockdown.
        // Rolled per beat so not every stagger converts.
        if (opp.state === 'staggered' && dist < GRAPPLE_REACH) {
            // At the ropes, downing them is a dead end (no covers there) —
            // wait for them to stand, then the lockup→whip counter relocates
            // the fight mid-ring. Slamming here caused 50-slam grind loops.
            if (this._nearRopes(opp)) { this._cooldown = 0.5; return; }
            const roll = Math.random();
            const slam = cfg.staggerSlamOdds ?? 0;
            if (roll < slam)             this._attack('action', 0.9);  // grab → slam
            else if (roll < slam + 0.45) this._attack('power', 0.85);  // headbutt
            else                         this._cooldown = 0.45;
            return;
        }

        // Defensive mixup — the AI can't read the opponent's buttons, so it
        // plays the range: anyone parked at grapple distance might tie up
        // (block stuffs it) or strike (evade slips it). Rolled per beat via
        // _defWait, and deliberately BEFORE the offense gate — you defend
        // between your own attack beats, not instead of them.
        if (opp.state === 'standing' && dist < GRAPPLE_REACH * 1.15 && this._defWait <= 0 && !lowStam) {
            const r  = Math.random();
            const ev = cfg.evadeOdds ?? 0;
            const bl = cfg.blockOdds ?? 0;
            if (r < ev && self._evadeCooldown <= 0) {
                this._press('evade');
                this._defWait = 1.6 + Math.random();
                return;
            }
            if (r < ev + bl) {
                this._blockTimer = 0.35 + Math.random() * 0.45;
                this._defWait    = 1.8 + Math.random();
                return;
            }
            this._defWait = 0.4; // failed roll — re-roll next beat, not next frame
        }

        // All attacks below respect the global offense cooldown
        if (this._offense > 0) return;

        // Whipped opponent returning off the ropes — clothesline the rebound,
        // or matador-sidestep the charge (George's favorite trick)
        if (opp.state === 'running' && opp.runPhase === 'returning') {
            if (Math.abs(opp.x - self.x) < 130 * scale) {
                if (Math.random() < (cfg.evadeOdds ?? 0) * 1.5 && self._evadeCooldown <= 0) {
                    this._press('evade');
                    this._cooldown = 0.6;
                    return;
                }
                this._attack('action', 1.0); // clothesline
            }
            return;
        }

        // Blocking opponents are still fair game — for strikes only
        if (opp.state !== 'standing' && opp.state !== 'blocking') return; // don't interrupt ongoing moves

        // Close range
        if (dist < JAB_REACH) {
            // Strikes beat block: jab the turtle, never grapple it
            if (opp.state === 'blocking') {
                this._attack('power', 0.6); // jab
                return;
            }
            // Attrition finisher: a worn opponent can't just shrug the sleeper
            // off anymore — this is how George wins matches
            if (cfg.attrition && opp.stamina < (cfg.attritionAt ?? 60) && !this._nearRopes(opp) && Math.random() < 0.5) {
                this._attack('finisher', 1.4); // sleeper hold
                return;
            }
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
        if (Math.random() < cfg.tauntOdds * 0.3 * dt) {
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
            // George: cash in on a worn opponent with the piledriver (plain
            // follow-up), otherwise headlock to drain, or whip to create space
            if (this._opp.stamina < 40 && Math.random() < 0.5) {
                this._press('action'); // → piledriver
            } else if (Math.random() < (cfg.holdOdds ?? 0.55)) {
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
