# Plan: finishers (Opus 2026-11-06)

Derek 2026-11-06: every wrestler gets at least one finisher, and it has to be cool. Lou's comes first: the **Thesz press** as one
authored set piece. It runs **after PLAN_FALLS Stage 4** (the press landing uses the promoted falls system).

## Lou's Thesz press, as Derek described it

From the tie-up, Lou calls the finisher. He drags his opponent to the center of the ring and Irish-whips him at a rope. The opponent
bounces off, and Lou runs at him full blast and meets him soon after the bounce with the Thesz press. Lou mounts him, pins both arms
to the mat, and the ref counts. Once it starts, it **always runs to the end**: no counters, no dodges, no AI or input interruptions.

Decisions (Derek 2026-11-06):
- **Trigger:** the finisher button (Y / Triangle, the taunt button) in the tie-up, once the opponent is worn down
  (wear >= `FINISHER_WEAR`). Below that the button keeps doing what it does today (Lou's hammerlock).
- **Pin:** usually wins. A fresher opponent (lower wear) can kick out at 2.
- **The old press:** the long-range charge press from `tryFinisher` is gone under the flag, and outside a tie-up the finisher button
  taunts. Flag-off doesn't change.

## What exists, what doesn't (measured 2026-11-06)

- Exists: the tie-up and its finisher-button branch (`Arena._tickLockup`, `just(ls.attacker, 'finisher')` -> hammerlock); the whip
  lead-in, `toRope` -> `ropeHit` -> `returning` run (`_doIrishWhipLeadIn`, `_tickRopeHit`); the `theszPressClip` flight
  (`_doTheszPress`, `_playFlight`); `Arena.startPin`; wear (PLAN_FALLS T3.13).
- Missing: a sequence that can't be interrupted; dragging him to center; a run timed to the rebound; a mounted pin that holds his
  wrists (`pinHold` today is a low cover, arms loose).

## Stage 1: the set piece, behind `?finisher=v1`, stop at G1

- **F1.1** Trigger and controller. In the tie-up, the finisher button with `theszPressFinisher` in the kit and
  `defender.wear >= FINISHER_WEAR` (start at 70: above the knockdown line 60, below exceptional 92) starts
  `Arena._beginFinisher(attacker, defender, 'theszPress')`. One controller owns both men for every phase (`state = 'finisher'` on both).
  It ignores input, AI, hits, rope breaks and the other man's state. A `phase` field logs `finisherPhase` events. At the end it
  hands over to the pin. If anything is cancelled underneath (a clip cancel, a scene reset), both men go to clean states (no stuck
  `finisher`). Pure timing and geometry go in `src/moves/finisher.js` with unit tests: the trigger at and below the threshold, it
  can't be interrupted, the cleanup.
- **F1.2** The drag to center. Lou keeps the collar-and-elbow grip and walks backward and sideways, hauling him to ring center (x and
  depth, `RING` center). The defender stumbles after him. Both use the gait at walk pace with planted feet, no sliding. If they're
  already within `CENTER_SKIP` of center, there's no drag (just a half-step to set). The ring decides which rope he goes to: the one
  with more room along x, so the run is long. A paired pose pair `finisherDrag` (Lou leans back, the defender bent forward, off
  balance). Report the step length, foot slide and the time it takes from the farthest start in the ring.
- **F1.3** The whip. The existing lead-in and run, forced. No reversal or answer window, no AI choice. The rope hit and rebound are the
  existing `_tickRopeHit`.
- **F1.4** The timed run. After the release, Lou backs up a step or two toward the other rope for a runway, then charges at run speed
  (or `FINISHER_RUN_SCALE` faster, start 1.15). Solve his start time from the rebound timing and both speeds so the press meets him
  `MEET_AFTER_BOUNCE` after he leaves the rope (start 300 ms, "not long after the bounce"). Report the meeting point, his speed at
  contact and the actual time after the bounce for 3 start spots.
- **F1.5** The press. Launch `theszPressClip` at the distance the solve gives, so the landing lands on the returning man. It always
  hits. He's taken back flat on the mat (falls back landing, forced heavy or exceptional tier). Camera shake as today's hit,
  `crowd.impact('mat', 1.0)`.
- **F1.6** Mount and hold the arms. A new paired pose `pressMount`: Lou straddles the chest, knees either side, and both hands pin the
  defender's wrists to the mat beside his head (defender supine, arms up by the head). Then `startPin` with this cover. The kickout
  chance falls with wear (`finisherKickout(wear)`: a fresh man can kick out at 2, at high wear nobody does). Unit-test the curve. If
  the rig can't show a wrist hold (hand art, forearm order), list the art Codex needs and use the closest pose; don't fake it with
  overlap.
- **F1.7** G1 page `research/animation/finishers-2026-11/g1/`: one normal-speed loop strip of the whole sequence per facing, Procreate
  Lou on `george-roster-v1`, from 3 starts (center, near a rope, by a corner). Misses first: total time, time after the bounce, speed
  at contact, foot slide in the drag, overlap in the mount, any frame-to-frame jump. Focused tests, flag-off pass. Commit locally,
  **STOP at G1**.

## Stage 2 (after G1): AI, soak, promotion

The AI calls it in a tie-up when the opponent's wear is past the line (with some odds, not every time). Soak run: stuck states, page
errors, how often and when it happens, kickouts. Derek decides promotion.

## Later: the roster's finishers (research 2026-11-15)

Each wrestler gets his real signature as a set piece on the same controller as Lou's. Researched on the web (sources below); 1950s records are thin, so "solid" means more than one source or match logs, "thin" means one source. Guido and the carnival giant are ours: a move we make up later (Derek). Reference footage comes first for each: what we have, and what to find.

| Wrestler | Finisher | Evidence | Builds on | Needs |
|---|---|---|---|---|
| Lou Thesz | **Thesz press** (flying body press into the pin); also backdrop suplex (called the "Reverse Death Trap" on a 1952 broadcast), airplane spin | solid: match logs 1950-57 | `theszPress`; Stage 12.10 backdrop suplex | footage: Thesz vs Gagne (Chicago 1952), Thesz vs Anaya (1950). Airplane spin: a spin on his shoulders in a side view needs a plan for the turn |
| Gorgeous George | **Flying hiplock** (headlock takeover with a twist), pin with a butterfly lock rolling back | thin: one 1951 match review; no named finisher anywhere; a heel who wins by cheating fits him | `headlock`; Stage 12.2 headlock takeover | footage: George vs Jesse James (1951), George vs Cyclone Anaya (1950) |
| Killer Kowalski | **The claw** (stomach claw, squeezing the gut) | solid: WWE and others | none: a standing hold | art: a claw hand (fingers spread, gripping). Also: knee drop off the top (the Yukon Eric ear incident, 1952), a match story beat more than a finisher |
| Bobo Brazil | **Coco Butt** (headbutt, "the hardest head in the sport") | solid for the name; how he threw it is not written down | `headbutt` | footage: any Bobo match, to see standing vs running, one hand on the head or not |
| Buddy Rogers | **Figure-four leglock** (credited with it in the 1950s) | solid | `figureFour` (built, parked) | the strut too: Rogers was the original "Nature Boy" strutter (George already has one) |
| Rikidozan | **Karate chop** (from sumo's open-hand slap, not real karate), thrown in a comeback flurry | solid | `chop` (Stage 11.1) | art: an open chop hand (the chop needs it anyway); a comeback flurry: several fast chops once worn down |
| Don Eagle | **Indian deathlock** | thin: Cagematch only | Stage 12.9 (give it to Don Eagle) | footage: Eagle vs George (Chicago 1950) |
| Yukon Eric | **Bear hug** (fans remember him submitting men with it); a database lists a shoulder backbreaker | mixed | none: a standing hold | pick one (bear hug is the better known); footage not found yet |
| Tor Johnson | not found | none: no source names a hold; no match footage online | | his only filmed ring work: *Alias the Champ* (1949). Fallback: a big man's bear hug or a crushing body slam; Derek picks |
| Guido | ours, later | | | |
| Carnival giant | ours, later | | | |

**What it adds up to:**
- **Footage to find:** Thesz vs Gagne 1952, George vs Jesse James 1951 and vs Anaya 1950, Eagle vs George 1950, any Bobo Brazil match, *Alias the Champ* 1949 for Tor. Export a hold's frames into a folder (move editor reference layer).
- **Art to order:** Kowalski's claw hand; an open chop hand for Rikidozan and the chop. New rigs for Bobo, Rogers, Rikidozan, Eagle, Yukon Eric, Tor and the giant come first (their base masters are approved in `Roster Base Masters/`; none is cut or rigged yet).
- **Already built, needs reassigning or polish:** `theszPress`, `figureFour`, `headbutt`, `chop`. New: claw, bear hug, Indian deathlock (Stage 12), headlock takeover (Stage 12), backdrop suplex (Stage 12), airplane spin.
- **Order (default):** Lou first (Stage 1 here), then the ones that reuse built moves (Bobo, Rogers, Rikidozan) as soon as their rigs exist; then the new holds (Kowalski, Yukon Eric, Eagle); George's last, after the Stage 12 headlock takeover.

Sources: [Kowalski](https://en.wikipedia.org/wiki/Killer_Kowalski), [the claw](https://www.wwe.com/shows/raw/2012-05-14/history-of-the-claw), [Thesz 1952 review](https://www.prowrestlingmusings.com/post/retro-review-lou-thesz-vs-verne-gagne), [Thesz match guide](https://www.prowrestlingmusings.com/amp/patrick-eire-retro-matchguide-the-1950s), [George vs Jesse James 1951](https://www.blogofdoom.com/2022/04/20/83972/), [George vs Anaya](https://www.prowrestlingmusings.com/post/retro-review-gorgeous-george-vs-cyclone-anaya), [Eagle vs George 1950](https://www.legacyofwrestling.com/EagleGeorge.html), [Bobo Brazil (WWE)](https://www.wwe.com/superstars/bobobrazil/), [Rogers and the figure-four](https://www.wwe.com/classics/sports-entertainment-maneuver-innovators), [Rikidozan](https://www.wikipedia.com/wiki/Rikid%C5%8Dzan), [Don Eagle (Cagematch)](https://www.cagematch.net/?id=2&nr=1396), [Yukon Eric (OWW)](https://onlineworldofwrestling.com/profile/yukon-eric), [Yukon Eric (Slam)](https://slamwrestling.net/?p=2295), [Tor Johnson](https://en.wikipedia.org/wiki/Tor_Johnson).

## Progress

(none yet)
