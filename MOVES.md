# Wrestling from Marigold — Move Library

## Control Scheme

| | P1 (Keyboard) | P2 (Keyboard) | Gamepad (any standard) |
|---|---|---|---|
| Move | WASD | Arrow Keys | Left stick / D-pad |
| Grapple | F | Enter | A / Cross |
| Power | G | Shift | X / Square |
| Finisher | H | Space | Y / Triangle |
| Run | R | / | B / Circle |
| Evade (tap) | E | , | LB / L1 |
| Block (hold) | T | . | RB / R1 |

Gamepad *mapping* exists in `InputHandler.js` (the table above), but it isn't wired up yet: `Arena.js` only ever constructs `InputHandler('keyboard', ...)` for both players and never assigns a gamepad handler, so the mapping never runs in-game. See Technical Reference → Input system for how to wire one in.

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
| Standing/staggered — beyond grapple range | Thesz press | 120–300px | Thesz's kit only. Flying body press straight into the cover; whiff = attacker crashes flat (2.6s punish window) |

### Defense (No Mercy style)

The mixup triangle: **strike beats block · block beats grapple · evade beats strike**.

| Input | Move | Effect |
|---|---|---|
| Evade — tap (E / , / LB) | Backstep | Quick hop away with dodge frames — jabs, headbutts, axe handles, and dropkicks whiff; grapples find nothing. Costs 2 stamina, 0.55s cooldown. Concedes ground. |
| Block — hold (T / . / RB) | Braced stance | A grapple or sleeper attempt on you is **stuffed** — the attacker staggers (free punish window). But strikes hit you normally, and stamina doesn't recover while blocking. |

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

### Thesz press *(Thesz)*
Lou's original finisher — the flying body press, not the mounted-punches
version. Launches from beyond grapple range (120–300px) at a standing or
staggered opponent: a low horizontal leap that takes them straight down with
the attacker on top, **directly into the pin**. Drains 24, so on a worn
opponent (<~40 stamina) the cover lands below the kickout floor — this is the
kill shot. Evade beats it: whiffing leaves the attacker flat on the mat for
2.6s, the longest self-inflicted punish window in the game. Blocking does not
stop a flying body.

---

## Roster Move Sets

Each wrestler is constructed with a `moveSet` array. `tryAction`, `tryPower`, and `tryFinisher` only execute moves that appear in the set — this is the character differentiation hook.

**Source of truth:** each character module's own `moveSet` — [`src/characters/george.js`](src/characters/george.js) and [`src/characters/thesz.js`](src/characters/thesz.js). `Arena.js` consumes those arrays directly and validates them against [`src/moves/registry.js`](src/moves/registry.js), which is the canonical list of every move ID and what it is (category, clip, executor, damage key). Don't transcribe kits into this table — it will drift. Arena used to keep its own copies and they did exactly that.

The live roster is George vs Thesz (the older Brawler/Powerhouse archetypes were retired when George was promoted, 2026-07-26):

| Character | Kit size | Identity moves | Deliberately lacks |
|---|---|---|---|
| **George** (`?p1=george`) | 17 | Piledriver, headbutt, knee lift — brawler pressure | Thesz press, body slam |
| **Thesz** (`?p1=thesz`) | 16 | **Thesz press** (finisher), suplex, body slam, the holds | Piledriver, headbutt, knee lift |

Both carry the shared base — Irish whip, clothesline, pin, elbow drop, dropkick, double axe handle, sleeper hold, headlock, arm drag, jab — plus hammerlock, back body drop, and knee drop.

`armBar` and `ankleLock` are fully implemented (poses, executors, damage values, lockup gating) but appear in **neither** kit, so they are currently unreachable in game. `tests/moveRegistry.test.js` asserts that set, so adding either to a kit is a deliberate roster decision rather than an accident.

---

## Planned Moves

| Move | Slot | Type | Era notes |
|---|---|---|---|
| Atomic drop | Power (close) | Strike | Lift and drop tailbone-first on knee; comedy bump, shorter down time |
| Figure four leglock | Finisher | Submission | On downed opponent; very 1950s NWA; both wrestlers take damage |
| Bear hug | Finisher | Submission | Standing sustained hold; health drain variant of sleeper |
| Turnbuckle ram | Power | Throw | Whip or carry opponent into corner post |
| Flying elbow (rope) | Power | Aerial | Run to rope, climb, drop — Phase 3 rope interaction |

---

## Technical Reference

### Adding a move

1. Add pose snapshots to `POSES` in `Wrestler.js`
2. Author the choreography:
   - **New moves should use a seekable clip** — a module in `src/animation/clips/` with its own timing and authored event markers, added to `REGISTERED_MOVE_CLIPS` in [`src/animation/clips/index.js`](src/animation/clips/index.js). See `jab.js` (single-actor) and `hammerlock.js` (paired) as the two worked examples, and `RIG_AND_MOVE_PIPELINE.md` for the migration gates.
   - The legacy alternative is a `poseSeq` entry in `MOVE_DEFS` plus a separately-timed `scene.time.delayedCall` for the gameplay beat. Most existing moves still work this way, but it duplicates the timing in two places — which is why they're being migrated.
3. Implement `_doXxx(other)` on `Wrestler` — spatial logic, state transitions, damage
4. Wire into `tryAction`, `tryPower`, `tryFinisher`, `tryRunningAttack`, or `tryDive` (see each move's `trigger` in the registry for which entry point owns what)
5. Add a `MOVE_SPECS` entry in [`src/moves/registry.js`](src/moves/registry.js) — id, category, clip, executor, damage key, trigger note
6. Add the move ID to the character's `moveSet` in **`src/characters/*.js`** — *not* in `Arena.js`, which reads those arrays. A move ID not in `MOVE_SPECS` throws at scene construction.
7. Add a scenario to `tools/debug/play.mjs` so the move has a live regression check

`tests/moveRegistry.test.js` enforces steps 2, 5, and 6 agree with each other.

### Pose system

Poses live in `POSES` as `{ lLeg, rLeg, lArm, rArm }` — all angles are facing-relative (positive = toward facing direction). `tweenPose` interpolates the live `this.pose` object; the walk cycle blends in additively on top.

### Input system

`Wrestler` uses an `InputHandler` instance (`this.input`) — never raw keyboard objects. `InputHandler` wraps either keyboard keys or a gamepad pad and exposes:

```js
input.isDown('left' | 'right' | 'up' | 'down' | 'action' | 'power' | 'finisher')
input.justDown('action' | 'power' | 'finisher')
```

To add a gamepad player, pass `new InputHandler('gamepad', { scene, padIndex: 0 })` instead of a keyboard handler.
