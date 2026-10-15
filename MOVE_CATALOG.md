# Move Catalog

The pool new wrestlers draw from. A wrestler's moves are the `moveSet` list in
his character file (`src/characters/<name>.js`). Add a built move's id there to
give it to him; the move registry (`src/moves/registry.js`) rejects ids it
doesn't know. Controls and per-move behaviour are in `MOVES.md`.

Sprite sheets are **pose reference only**: they are commercial art, matched by
eye on our own rig and never shipped. Sliced sheets live in
`Sprite sheets/reference/<sheet>/` (git-ignored). Each has an `index.png` and
`rows/` to read frame numbers off.

## 1. Built — assign freely

"Clip" moves are posed in the move editor (most against sprite-sheet frames;
open their draft from the editor's draft list to tune them). "Pose sequence"
moves are older stance-to-stance animations on the same rig.

| Move id | Kind | How it's triggered | Animation | Who has it |
|---|---|---|---|---|
| `jab` | strike | Power, close to a standing opponent | clip | George, Lou |
| `headbutt` | strike | Power, close to a staggered opponent | pose sequence | George |
| `kneeLift` | strike | Hold up + Power at point blank | pose sequence | George |
| `clothesline` | strike | Grapple in range / vs a runner coming off the ropes | pose sequence | George, Lou |
| `dropkick` | strike | Power at medium range | clip (Bret 224–232) | George, Lou |
| `doubleAxeHandle` | strike | Running attack | pose sequence | George, Lou |
| `bodySlam` | throw | Grapple at grapple range (reads as a powerbomb; kept) | clip (Bret 120–121, 322–328) | Lou |
| `piledriver` | throw | Grapple at grapple range, preferred over the slam | clip (Bret 140–153) | George |
| `suplex` | throw | Lockup + Up | clip (Bret 357–374) | George, Lou |
| `armDrag` | throw | Lockup + Power | pose sequence | George, Lou |
| `backBodyDrop` | throw | Grapple vs a runner, with direction | pose sequence | George, Lou |
| `hammerlock` | hold | Finisher at grapple range in a lockup | clip (Derek's) | George, Lou |
| `sleeperHold` | hold | Finisher vs a standing opponent in reach | pose sequence | George, Lou |
| `headlock` | hold | Lockup + Down | pose sequence | George, Lou |
| `figureFour` | hold | Finisher next to a downed opponent | clip (Flair 386–403) | George |
| `armBar` | hold | Lockup + Right | pose sequence | **nobody yet** |
| `ankleLock` | hold | Lockup + Left | pose sequence | **nobody yet** |
| `elbowDrop` | aerial | Power next to a downed opponent | clip (Bret 165–168) | George, Lou |
| `kneeDrop` | aerial | Hold down + Power next to a downed opponent | clip | George, Lou |
| `theszPress` | aerial | Finisher at mid range vs a standing opponent | clip (Bret 210–213) | Lou |
| `irishWhip` | grapple | Lockup + Left/Right | pose sequence | George, Lou |
| `pin` | pin | Grapple next to a downed opponent | pose sequence | George, Lou |
| `divingElbow`, `topDive` | aerial | From the turnbuckle | clip (Bret 209–213) | everyone |
| `taunt`, `turnbuckleTaunt` | taunt | Finisher with nothing in range / on the turnbuckle | pose sequence | everyone |

Character traits, separate from moves (set in the character file):
`begsOff` (begs when hurt, Flair's "no, no") and `struts` (Flair's strut as the
taunt). Both George's.

## 2. Found in our sheets — ready to build

These are identified frame by frame and only need posing and wiring.

| Move | Frames | Notes |
|---|---|---|
| **Sharpshooter** (Bret's finisher) | Bret 383–398 | grab the legs, step through, turn him over, sit back |
| Chair shot | Bret 259–278 | **storyline only** — rare in the era; a one-off moment, not a regular move. Needs a chair prop |
| Front kick | Bret 171–175, 396 | |
| Shove | Bret 109–114 | |
| Backward roll (escape) | Bret 239–243 | |
| Mounted / kneeling punches | Bret 180–183 | on a downed opponent |
| Arm drag / hip toss (victim's flip) | Bret 350–356 | upgrade of the existing `armDrag` |
| Back body drop (victim's flip) | Bret 184–193 | upgrade of the existing `backBodyDrop` |
| Clothesline bump | Bret 54–59 | upgrade of the existing fall |
| Get up from the back / from the front | Bret 64–68 / 244–258 | upgrade of the get-ups |
| Kicking back sell | Flair 298–306 | George's sell when knocked down |
| Victory celebration | Bret 380–381 | arms up |

### Royal Rumble finishers (one row per wrestler, sliced 2026-10-15)

Every Royal Rumble sheet shares Bret's frames except a finisher row at the
end (measured: 67–75% same pose, 49% for Yokozuna's bigger body). Frame
numbers are on each wrestler's own sheet. Names are read off the frames by eye.

| Move | Sheet / frames | Notes |
|---|---|---|
| **Tombstone piledriver** | Undertaker 387–399 | holds him at the chest, drops to the knees |
| **Flying elbow** | Macho Man 378–387 | leap, flat in the air, elbow out |
| Sky-point taunt | Macho Man 356–377 | |
| **Banzai drop** | Yokozuna 401–410 | squat, stomp, sit |
| Sumo stance charge / arms-wide taunt | Yokozuna 411–417 / 397–399 | |
| **Razor's Edge** | Razor Ramon 387–395 | lift high, throw forward |
| "Hey yo" taunt | Razor Ramon 386 | |
| **Superkick** | Shawn Michaels 393 | (plus a lift at 387–391, probably his teardrop suplex) |
| **Perfect-plex** | Mr. Perfect 383–394 | lift, bridge back |
| **Head vice (claw)** | Crush 389–397 | |
| **Running forearm** + flexing poses | Lex Luger 397–399 / 400–404 | |
| Money toss taunt, reach and grab | Ted DiBiase 393–397 / 387–392 | |
| **Samoan drop** | Tatanka 386–396 | onto the shoulders, falls back sitting out |
| On-the-back kicking sell | every sheet but Bret's, 298–306 | the game's standard sell |

### Saturday Night Slam Masters (sliced 2026-10-15)

A different game: bigger sprites, sections labelled on the sheet itself
(Entrance, Idle, Tired, Walking, Running, Off Ropes, Jump, Turnbuckle,
Entering/Exiting Ring, **Strikes**, **Grapples**, Hit/Hurt/Down, Lose, Win).
Grapple frames show the attacker only; the victim side comes from any
sheet's Hit/Hurt/Down. Read frame numbers off `rows/` when building.

| Wrestler | Style | What his Strikes / Grapples add |
|---|---|---|
| Mike Haggar | brawler, power | running lariat, punches and kicks, flying body attack, overhead lifts, backbreaker; win poses |
| Titanic Tim | power | clubbing blows, big lifts and slams, splash |
| Jumbo Jack | heavyweight | belly bump, hip and butt attacks, rolling body press, hat-and-cane entrance |
| Biff Slamkovich | technical | dropkicks, spinning kicks, flying attacks, suplexes |
| The Great Oni | heel martial artist | kicks, cartwheel, flips, **poison mist** |
| The Scorpion | masked high-flyer | flying kicks, flips, flipping throws |
| Gunloc | military technical | spinning backfist, flash-kick style somersault, flips, flying cross-body, suplex-type grapples |
| Harry Hicks | **referee** (non-playable) | pin count (down on the mat slapping), pointing, signals, arms-crossed / wave-off — a referee character |

Every Slam Masters wrestler also brings his own walk, run, tired idle,
entrance, turnbuckle taunts and hit/hurt sells — useful for giving new
wrestlers distinct body language, not just moves.

### Mat wrestling — wanted, needs real-match reference

The 16-bit games are built around slams and are thin on 1950s mat work.
Real footage is the better reference: the Chicago Film Archives has 1950s
matches (Lou Thesz, Gorgeous George, Verne Gagne, Buddy Rogers) on
YouTube. Export a hold's frames into a folder; the move editor's reference
layer takes any images. Reference only, like the sprites.

| Family | Moves | Have |
|---|---|---|
| Arm | wristlock, arm wringer, hip toss | `hammerlock`, `armBar` (unassigned), `armDrag` |
| Headlock | headlock takeover, flying mare | `headlock` |
| Leg | step-over toehold, Indian deathlock, Boston crab | `figureFour`, `ankleLock` (unassigned) |
| Body | body scissors, abdominal stretch, cobra twist | |
| Signatures | Thesz's airplane spin and backdrop suplex; George's flying tackle (confirm in footage) | `theszPress` |

## 3. To download next

The site blocks automated downloads, so save these in a browser into
`Sprite sheets/` (any filename) and they get sliced with
`tools/sprites/slice_sheet.py`.

Everything listed so far is in and sliced (19 sheets). The Royal Rumble
referee is optional, since Slam Masters' Harry Hicks already covers a ref:
https://www.spriters-resource.com/snes/wwfroyal/asset/44748/

Each page has a download button for the sheet; right-click the sheet image
and Save Image As works too. If a page moves, the game pages list everyone:
https://www.spriters-resource.com/snes/wwfroyal/ and
https://www.spriters-resource.com/snes/saturdaynightslammasters/.
