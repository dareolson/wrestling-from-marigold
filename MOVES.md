# Wrestling from Marigold — Move Library

## Control Scheme

| | P1 (Keyboard) | P2 (Keyboard) | Gamepad (any standard) |
|---|---|---|---|
| Move | WASD | Arrow Keys | Left stick / D-pad |
| Grapple | F | Enter | A / Cross |
| Power | G | Shift | X / Square |
| Finisher | H | Space | Y / Triangle |

Gamepad support is built in — plug in any standard Bluetooth or USB controller and it maps automatically.

---

## Move Reference

### Grapple (F / Enter / A) — context-sensitive

| Opponent State | Move | Range | P1 | P2 |
|---|---|---|---|---|
| Standing | Irish whip | 110px | ✓ | ✓ |
| Staggered | Body slam | 110px | ✓ | — |
| Staggered | Piledriver | 110px | — | ✓ |
| Running (returning from rope) | Clothesline | 150px | ✓ | ✓ |
| Downed | Pin | 110px | ✓ | ✓ |

### Power (G / Shift / X)

| Opponent State | Move | Range | P1 | P2 |
|---|---|---|---|---|
| Standing — point-blank | Jab | 85px | ✓ | ✓ |
| Staggered | Headbutt | 110px | ✓ | ✓ |
| Downed | Elbow drop | 110px | ✓ | ✓ |
| Standing — medium | Dropkick | 220px | ✓ | ✓ |

### Finisher (H / Space / Y)

| Opponent State | Move | Range | Notes |
|---|---|---|---|
| Standing | Sleeper hold | 120px | 4-second hold; mash to escape |

---

## Move Details

### Irish Whip
Sends the opponent running toward the near rope at full speed. They bounce back — intercept with a clothesline, or let them return to standing. Starting point of the game's primary combo chain.

### Clothesline
Only available against a returning runner. Instant knockdown. No wind-up.

### Body Slam *(P1)*
500ms lift. Opponent placed inverted on attacker's shoulder, then thrown sideways. Lands flat — downed 4.5s.

### Piledriver *(P2)*
Same lift as the body slam but the opponent is driven straight down, head-first at the attacker's feet. Downed 6.5s — the longest knockdown in the current kit.

### Dropkick
Attacker launches forward with both legs extended. Fires at medium range (110–220px); won't trigger inside body slam range. Opponent knocked down. Attacker stumbles briefly on landing.

### Elbow drop
Attacker slides over a downed opponent, raises elbow, drops. Resets the opponent's down timer back to 4.5s — use it to buy time before going for the pin.

### Sleeper hold
Rear chinlock applied for up to 4 seconds. Visual deepens: `z → zz → zzz`. Defender mashes grapple key to break free. Full hold sends opponent down for 6.5s.

### Jab
Point-blank strike (≤ 85px). Snaps the near arm forward; no wind-up. Puts opponent into a 0.9s stagger — they stumble back, arms up, unable to act. Doesn't knock down on its own; use it to open a combo (jab → Irish whip, jab → headbutt, jab → jab → headbutt).

### Headbutt
Follow-up strike vs a staggered opponent. Body lunges forward, head leads. Knocks them down for a standard fall. The intended finisher of the jab combo chain.

### Pin
3-count at 0.85s per beat (2.55s total). Defender mashes grapple key to kick out.

---

## Roster Move Sets

Each wrestler is constructed with a `moveSet` array. `tryAction`, `tryPower`, and `tryFinisher` only execute moves that appear in the set — this is the character differentiation hook.

| Archetype | Grapple | Power (close) | Power (medium) | Finisher |
|---|---|---|---|---|
| **Brawler** (P1) | Irish whip / clothesline / pin | Body slam | Dropkick | Sleeper hold |
| **Powerhouse** (P2) | Irish whip / clothesline / pin | Piledriver | Dropkick | Sleeper hold |
| *Technical (planned)* | Irish whip / clothesline / pin | Suplex | Dropkick | Figure four |
| *Heel (planned)* | Irish whip / clothesline / pin | Atomic drop | Dropkick | Bear hug |

---

## Planned Moves

| Move | Slot | Type | Era notes |
|---|---|---|---|
| Suplex | Power (close) | Throw | Classic — arc opponent overhead and behind; lands differently from body slam |
| Atomic drop | Power (close) | Strike | Lift and drop tailbone-first on knee; comedy bump, shorter down time |
| Figure four leglock | Finisher | Submission | On downed opponent; very 1950s NWA; both wrestlers take damage |
| Bear hug | Finisher | Submission | Standing sustained hold; health drain variant of sleeper |
| Turnbuckle ram | Power | Throw | Whip or carry opponent into corner post |
| Flying elbow (rope) | Power | Aerial | Run to rope, climb, drop — Phase 3 rope interaction |
| Lou Thesz press | Finisher | Signature | Running tackle into mounted punches — Lou Thesz boss move |

---

## Technical Reference

### Adding a move

1. Add pose snapshots to `POSES` in `Wrestler.js`
2. Add a `poseSeq` entry to `MOVE_DEFS`
3. Implement `_doXxx(other)` on `Wrestler` — spatial logic, tweens, state transitions
4. Wire into `tryAction`, `tryPower`, or `tryFinisher`
5. Add the move name to the wrestler's `moveSet` array in `Arena.js`

### Pose system

Poses live in `POSES` as `{ lLeg, rLeg, lArm, rArm }` — all angles are facing-relative (positive = toward facing direction). `tweenPose` interpolates the live `this.pose` object; the walk cycle blends in additively on top.

### Input system

`Wrestler` uses an `InputHandler` instance (`this.input`) — never raw keyboard objects. `InputHandler` wraps either keyboard keys or a gamepad pad and exposes:

```js
input.isDown('left' | 'right' | 'up' | 'down' | 'action' | 'power' | 'finisher')
input.justDown('action' | 'power' | 'finisher')
```

To add a gamepad player, pass `new InputHandler('gamepad', { scene, padIndex: 0 })` instead of a keyboard handler.
