# Wrestling from Marigold — Product Requirements Document

*Presented by the Midwest Wrestling Federation*

---

## Concept

**Wrestling from Marigold** is a browser-based 2D wrestling simulation game set in the golden age of professional wrestling — Chicago, late 1940s to mid-1950s. It is presented as a recovered television broadcast from the MWF (Midwest Wrestling Federation), airing live from the Marigold Arena.

The game looks and feels like watching a real broadcast from 1952. Black and white. Scanlines. Film grain. A ringside camera angle that puts the crowd behind the action. You feel the audience. You feel the arena. You feel the pressure of performing live.

There is no game like this.

---

## Identity

| Element | Detail |
|---|---|
| **Game title** | Wrestling from Marigold |
| **Promotion** | Midwest Wrestling Federation (MWF) |
| **Broadcast moniker** | WFM |
| **Era** | Late 1940s — mid 1950s |
| **Setting** | Marigold Arena, Chicago, Illinois |
| **Sequel hook** | Game 2 will cover the NWA territory era (1970s-80s), different venue, different visual identity, same engine |

---

## Visual Direction

### The Broadcast Aesthetic

The entire game is rendered as if it is a live television broadcast from 1952. Every visual element passes through a post-processing filter stack:

- **Grayscale** — full black and white, no color
- **Film grain** — animated noise overlay, randomized each frame
- **Scanlines** — horizontal lines at low opacity across the full screen
- **Vignette** — darkened edges simulating a cathode ray tube
- **Contrast / blown highlights** — whites bloom slightly, deep blacks
- **Screen flicker** — subtle brightness oscillation
- **Signal noise** — occasional horizontal jitter or static burst

The result should be indistinguishable from a real photograph or screenshot of a 1950s broadcast at a glance.

### Camera Angle

Ringside. Camera sits at crowd level, slightly below the ring apron, looking up at the action. The wrestlers perform between the camera and the crowd. The audience fills the background — signs, faces, reactions. The ring ropes frame the action.

This is the opposite of Fire Pro Wrestling's god-view. You are not a strategist looking down. You are in the third row. You feel the house.

### Typography

Period-appropriate. Block serif letterforms. Athletic commission style. Feels like it belongs on a championship belt or a 1952 newspaper sports section.

### Title Screen

A vintage broadcast card:

```
MIDWEST WRESTLING FEDERATION
        presents
  WRESTLING FROM MARIGOLD
    Live from Marigold Arena
        Chicago, Illinois
```

Scanlines over it. Crowd murmur in the background. The MWF crest. Then the card cuts to the arena.

### Logo / Crest

Shield or crest shape. Block serif MWF lettermark. Designed as if it was always meant to be gold on black — rendered in grayscale in-game.

---

## Gameplay Philosophy

### Simulation, Not Arcade

This is not a button-masher. Matches take time. Wrestlers absorb punishment and show it. A body slam early in the match is different from a body slam in minute fifteen.

- Wrestlers take a realistic amount of time to get up after significant moves
- Stamina degrades visibly over the course of a match
- Momentum matters — working a body part, wearing down an opponent, setting up a finish
- Every move in the game existed in real wrestling from this era — nothing invented

### The Performance Element

Wrestling is performance. The crowd is not background decoration — they are the third competitor. A heel who stalls, who hides in the ropes, who cheap-shots the babyface, will draw heat. A babyface who fires up, who absorbs punishment and fights back, will get the crowd behind them. The camera angle makes this visceral.

Crowd reaction is a game mechanic. It affects atmosphere, audio, and potentially comeback momentum.

### Match Pacing

Matches follow real wrestling structure:
- Feeling out period early
- Heat segment — one wrestler controls
- Hope spots — the other fights back
- Near falls build to the finish
- Clean finishes: pin, submission, count-out, disqualification

No health bars visible in the traditional sense — the wrestlers' behavior and the crowd tell you where the match stands.

---

## Core Mechanics

### Movement
- 8-directional movement around the ring
- Ring boundary awareness — ropes, apron, floor
- Irish whip into ropes

### Grapple System (Fire Pro-inspired)
- Timing-based grapple initiation — not pure button mashing
- Grapple position determines available moves (front, back, side, ground)
- Reversal window — skilled players can counter
- Strong grapple vs. weak grapple inputs

### Move Categories
All moves are period-accurate to 1940s-50s catch wrestling and early pro wrestling:
- **Strikes** — forearm, headbutt, European uppercut, body punch
- **Throws** — body slam, hip toss, arm drag, fireman's carry
- **Submissions** — figure four, Boston crab, sleeper hold, armbar, hammerlock
- **Aerial** (minimal, era-accurate) — dropkick, flying headscissors
- **Ground work** — headlock on mat, leg work, pin attempts

### Stamina System
- Stamina depletes with moves and absorbing damage
- Low stamina = slower recovery, weaker grapple attempts, visible fatigue in animation
- Stamina recovers slowly during rest holds and between exchanges
- Rest holds are not filler — they are strategy

### Pin System
- Kickout timing window — harder to kick out as damage accumulates
- Referee count visible and audible
- Rope break mechanic — crawl to ropes to break a pin or submission

### Crowd Reaction System
- Crowd audio and visual react to match events
- Heel tactics (stalling, eye rake, using ropes) draw audible heat
- Babyface comebacks draw pops
- Near falls spike crowd noise
- Crowd level affects arena atmosphere — a hot crowd makes the game feel different

---

## Roster

### Approach
Wrestlers from this era are historical figures, most deceased, whose estates have limited commercial interest in a non-commercial browser game. The game presents them respectfully as the legends they were.

Names and likenesses will be clearly inspired by real historical wrestlers. The game is a celebration of the era.

### Initial Roster (TBD — research required)
- **Gorgeous George** — the original showman. Ultimate heel. Robe, golden locks, valet with hairspray.
- **Lou Thesz** — the technician. NWA World Champion. Legitimate shooter. The standard of the era.
- **Buddy Rogers** — the original Nature Boy. Arrogant heel. Figure four leglock.
- **Antonino Rocca** — high-flying babyface. Enormous crowd favorite. Aerial style ahead of his time.
- **Primo Carnera** — former heavyweight boxing champion turned wrestler. Massive, intimidating.

Roster size at launch: 6-8 wrestlers. Quality over quantity.

### Wrestler Profiles
Each wrestler has:
- Signature moves (3-5)
- Finishing move (1)
- Stamina rating
- Strength rating
- Speed rating
- Crowd alignment (heel / babyface)
- Entrance (period-accurate)

---

## Match Types (v1)

- **Singles match** — standard. Pin or submission. 
- **Time limit draw** — 60-minute Broadway option (accelerated in-game time)

Additional match types in future versions.

---

## Controls

### Local Multiplayer (Primary)
Two players, one machine.

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | WASD | Arrow keys |
| Weak grapple / strike | F | numpad 1 |
| Strong grapple | G | numpad 2 |
| Run | Hold move key | Hold move key |
| Pin attempt | H | numpad 3 |
| Kickout | Mash F | Mash numpad 1 |

### Gamepad Support
Browser Gamepad API — Xbox and PlayStation controllers supported natively. One controller per player.

### Single Player
vs. CPU opponent with basic AI. More sophisticated AI in future versions.

---

## Audio

- **Crowd audio** — reactive, not looped. Different crowd sounds for heat, pops, near falls, finish.
- **Move sounds** — era-appropriate. Thud of a body slam. Slap of a forearm.
- **Arena ambience** — the sound of a 1950s indoor arena. Echoey, slightly lo-fi.
- **Announcer** (optional) — period-style play-by-play, either recorded or text-based
- **No licensed music** — original compositions or public domain period-appropriate music

All audio passes through the same lo-fi filter as the visuals — slightly compressed, slightly degraded, as if coming through a 1952 television speaker.

---

## Technical Stack

| Layer | Tool |
|---|---|
| Language | JavaScript / TypeScript |
| Rendering | HTML5 Canvas via Phaser 3 |
| Visual effects | CSS filters + Canvas post-processing |
| Controls | Keyboard + Gamepad API |
| Hosting | GitHub Pages (free, no server required) |
| Multiplayer | Local only (v1) |

### Why Phaser
- Purpose-built for 2D browser games
- Handles game loop, input, sprite animation, collision
- Large community, well-documented
- Canvas-based — post-processing filters apply cleanly over the entire output

### No Backend Required (v1)
The game runs entirely in the browser. No server, no database, no auth. Host on GitHub Pages for free.

---

## Development Phases

### Phase 1 — Proof of Concept
- Ring renders correctly with camera angle
- Post-processing filter stack applied (B&W, grain, scanlines, vignette)
- One wrestler on screen, idle animation
- Crowd visible in background
- Confirm the visual direction works before building game logic

### Phase 2 — Core Engine
- Two wrestlers, movement, ring boundary
- Basic grapple system
- 5-6 moves per wrestler
- Pin and kickout system
- Basic stamina

### Phase 3 — Full Roster + Polish
- All 6-8 wrestlers with full move sets
- Crowd reaction system
- Audio
- Entrance sequences
- Title screen and menus

### Phase 4 — Local Multiplayer
- Two-player keyboard support
- Gamepad support

### Phase 5 — Launch
- GitHub Pages deployment
- Public announcement

---

## What This Is Not

- Not a button-masher
- Not a 3D game (v1)
- Not a licensed product
- Not trying to compete with modern WWE games
- Not trying to be everything — it is one specific thing made with full commitment

---

## The Sequel

**Game 2** covers the NWA territory era, 1970s-80s. Different venue. Color — but muted, washed out, VHS-era palette. Different roster. Same engine. The two games are a series without sharing a brand — each is its own artifact from its own era.

---

*Document version 1.0 — 2026-05-14*
