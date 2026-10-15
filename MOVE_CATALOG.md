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
| Chair shot | Bret 259–278 | swing and overhead; needs a chair prop |
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

## 3. To download next

The site blocks automated downloads, so save these in a browser into
`Sprite sheets/` (any filename) and they get sliced with
`tools/sprites/slice_sheet.py`.

**WWF Royal Rumble (SNES):** every wrestler shares the same base frames as
Bret (measured on Flair: 92% the same). Each adds **one finisher row**, so a
sheet is worth about one new signature move. The finisher listed is the one
he used at the time; confirm it on the sheet.

| Wrestler | Expected finisher | Page (download button / Save Image As) |
|---|---|---|
| The Undertaker | Tombstone piledriver | https://www.spriters-resource.com/snes/wwfroyal/asset/44461/ |
| Yokozuna | Banzai drop | https://www.spriters-resource.com/snes/wwfroyal/asset/44462/ |
| Razor Ramon | Razor's Edge | https://www.spriters-resource.com/snes/wwfroyal/asset/44460/ |
| Shawn Michaels | (his era's finisher) | https://www.spriters-resource.com/snes/wwfroyal/asset/44465/ |
| Mr. Perfect | Perfect-plex | https://www.spriters-resource.com/snes/wwfroyal/asset/44466/ |
| Tatanka | (his era's finisher) | https://www.spriters-resource.com/snes/wwfroyal/asset/44467/ |
| Ted DiBiase | Million Dollar Dream | https://www.spriters-resource.com/snes/wwfroyal/asset/44469/ |
| Crush | (his era's finisher) | https://www.spriters-resource.com/snes/wwfroyal/asset/44470/ |

**Saturday Night Slam Masters (SNES), Capcom:** a different game with bigger
sprites and its own throws per character, so each sheet should add several
moves rather than one.

| Wrestler | Page (download button / Save Image As) |
|---|---|
| Mike Haggar | https://www.spriters-resource.com/snes/saturdaynightslammasters/asset/27369/ |
| Biff Slamkovich | https://www.spriters-resource.com/snes/saturdaynightslammasters/asset/27251/ |
| Gunloc | https://www.spriters-resource.com/snes/saturdaynightslammasters/asset/27586/ |
| the rest of the roster | https://www.spriters-resource.com/snes/saturdaynightslammasters/ |

Each page has a download button for the sheet; right-click the sheet image
and Save Image As works too. If a page moves, the game pages list everyone:
https://www.spriters-resource.com/snes/wwfroyal/ and
https://www.spriters-resource.com/snes/saturdaynightslammasters/.
