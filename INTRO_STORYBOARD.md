# Opening Title and Arrival — Production Storyboard

**Scene ID:** `intro_arrival`  
**Status:** First production storyboard  
**Format:** 16:10 illustrated stills with restrained parallax, pans, pushes, and
discrete two-state movement  
**Target runtime:** 46–52 seconds after selecting **New Game**  
**Dialogue:** Three spoken lines  
**Setting:** Chicago, Saturday night, 1952

Global character, location, generation, parallax, focus, and motion rules are
defined in [CINEMATIC_ART_STANDARD.md](CINEMATIC_ART_STANDARD.md). This
storyboard may narrow those rules for a shot but should not silently override
them.

## Directing principle

The sequence should not pretend to be conventional animation. Its strength is
the held illustration: the player has time to read Guy's face, the building,
and the distance between them. Camera movement, light, atmosphere, and sound
make the stills feel alive.

Use a maximum of one primary movement idea per shot. Approximately two-thirds
of the sequence should contain no character movement at all. Never continuously
float every layer, and do not bend a static figure like a paper puppet to
simulate breathing.

Motion vocabulary:

- **Hold:** entirely still composition; ambience continues.
- **Push:** camera scale from roughly 100% to 103–106% over several seconds.
- **Pan:** travel across an oversized still by no more than roughly 8–12% of
  frame width unless the shot specifically follows the bus.
- **Parallax:** two or three depth planes moving at different rates; background
  motion should be smallest.
- **Discrete action:** crossfade or cut between two authored states, such as
  bus doors closed/open or service door shut/open.
- **Ambient loop:** bulb variation, exhaust, haze, or distant silhouettes;
  low-amplitude and independently timed.

Avoid constant zooming, looping character limbs, automatic mouth animation,
large multiplane drift, and modern motion-comic wobble.

## Color and image requirements

- Runtime frame: 960 x 600, matching the current Phaser game canvas.
- Master art: at least 1920 x 1200, 16:10, with additional overscan in the pan
  direction where a shot requires camera travel.
- Private world: restrained illustrated color.
- Chicago night: blue-black, slate, charcoal, tobacco brown, faded blue-gray.
- Marigold: warm amber and cream light with restrained wine-red accents.
- No modern cyan/magenta neon palette.
- For a hot July date, use humid haze and exhaust rather than rain.
- All title, menu, caption, and dialogue typography remains editable in the
  game UI and is not painted into generated art.

## Title-screen loop — `intro_00_title`

**Duration:** Indefinite until input.  
**Framing:** Wide exterior of the Marigold at night, viewed obliquely from
across the street. The building is not monumental; the light and waiting crowd
make it important.  
**UI:**

```text
WRESTLING FROM MARIGOLD

NEW GAME
CONTINUE
EXHIBITION
```

**Layers:**

1. foreground utility pole, curb edge, and occasional passing automobile;
2. midground Marigold facade, canopy, waiting patrons, and entrance;
3. background brick, upper windows, sky, haze, and distant street;
4. separate bulb and window-light overlays;
5. UI title and menu.

**Movement:** Mostly a hold. Marquee bulbs vary softly rather than chasing in a
perfect digital pattern. One automobile may cross the foreground every 12–20
seconds. Two distant patron silhouettes can change state on a long irregular
loop. No continuous camera drift while the player uses the menu.

**Sound:** Electrical bulb hum, distant traffic, a trace of crowd through brick,
and an occasional automobile. No score at first; a low musical phrase may enter
after several seconds of inactivity.

**Transition on New Game:** Menu options fade first, then the title. The
background does not cut. The same picture becomes Shot 1.

## Shot 1 — The picture continues

**ID:** `intro_01_marquee_push`  
**Time:** 0:00–0:04  
**Image:** Same exterior as the title screen.  
**Movement:** One slow 4% push toward the marquee and public doors. Foreground
pole moves slightly faster than the facade; background nearly holds.  
**Sound:** The menu ambience gains depth. Crowd sound rises briefly, then a bus
engine and brake noise approaches offscreen.  
**Dialogue:** None.  
**Purpose:** Reveal that the menu painting is a living story location.

## Shot 2 — Grace and Ashland

**ID:** `intro_02_bus_arrival`  
**Time:** 0:04–0:09  
**Image:** Wide view of the Route 9 bus pulling to the curb near Grace and
Ashland. The Marigold is not visible from this framing.  
**Movement:** Bus is a separate foreground/midground plate traveling laterally
into position. Once stopped, all movement ceases except a small exhaust layer.
Use two discrete door states rather than animating the folding mechanism.  
**Sound:** Engine, tire noise, brake release, door mechanism.  
**UI caption:**

> CHICAGO — SATURDAY NIGHT, 1952

Fade the caption in after the bus stops and out before the cut.  
**Dialogue:** None.

## Shot 3 — First view of Guido

**ID:** `intro_03_steps_down`  
**Time:** 0:09–0:14  
**Image:** Medium-low three-quarter composition at the bus door. Guy has just
stepped onto the pavement with one modest canvas or worn leather gym bag. He
wears high-waisted charcoal trousers, faded blue-gray work shirt, worn brown
shoes, and a seasonally appropriate dark wool jacket only if the date is cool.
For the established hot July card, use shirtsleeves and carry the jacket folded
over the bag, if present at all.  
**Movement:** Two authored states: foot on final step, then both feet on
pavement. Crossfade quickly or cut on the brake sound. Finish on a still hold.
Do not animate a full walking cycle.  
**Sound:** Sole on pavement, bag hardware, bus idling.  
**Dialogue:** None.  
**Purpose:** Introduce him by scale and possessions before showing his face in
detail.

## Shot 4 — The city leaves him there

**ID:** `intro_04_bus_departure`  
**Time:** 0:14–0:18  
**Image:** Guy stands in midground with his back and three-quarter profile to
camera. The bus occupies most of the foreground.  
**Movement:** Bus slides out of frame, acting as a moving wipe that reveals Guy
alone on the sidewalk. Guy remains completely still. A small exhaust plate
trails and dissipates after the bus exits.  
**Sound:** Engine rises and recedes. The street suddenly feels wider and
quieter.  
**Dialogue:** None.

## Shot 5 — East on Grace

**ID:** `intro_05_walk_insert`  
**Time:** 0:18–0:22  
**Image:** Close insert of Guy's worn shoes and lower trouser cuffs moving past
storefront light, with the gym bag entering the upper edge of frame.  
**Movement:** Use two foot-position stills and two cuts timed to footsteps. A
very small lateral background pan provides travel. Do not build a looping walk
cycle.  
**Sound:** Two or three deliberate footsteps, bag creak, distant automobile.  
**Dialogue:** None.

## Shot 6 — The handbill

**ID:** `intro_06_handbill`  
**Time:** 0:22–0:25  
**Image:** A wrestling handbill in a shop or tavern window. Guy's colored
reflection passes over the glass. The established stars receive prominent
placement; Guy is absent or appears only as small preliminary text if the
story establishes that the bill has already been printed.  
**Movement:** Hold the handbill. Slide only Guy's soft reflection across it.
One warm interior light may flicker slightly.  
**Sound:** Footsteps continue without stopping. Crowd noise becomes faintly
audible for the first time.  
**Text:** Render any legible handbill copy as a game overlay or composited
editable layer, not image-model lettering.  
**Dialogue:** None.

## Shot 7 — First sight of the Marigold

**ID:** `intro_07_reveal`  
**Time:** 0:25–0:31  
**Image:** Over Guy's shoulder from the end of the block. The Marigold sign and
entrance are visible ahead, warm against cold brick and sky. The building is
busy rather than grand.  
**Layers:** Guy foreground silhouette; parked cars and pedestrians midground;
facade and canopy background; bulb/haze overlays.  
**Movement:** Begin with Guy occupying more of the frame, then make a restrained
6% push past his shoulder toward the sign. Foreground Guy shifts slightly
faster than the distant building. He does not move.  
**Sound:** Crowd swell, marquee electricity, a muffled bell or public-address
voice from inside.  
**Optional UI caption:**

> MARIGOLD ARENA — 817 WEST GRACE STREET

Use either this caption or the earlier Chicago caption prominently, not both at
equal visual weight.  
**Dialogue:** None.

## Shot 8 — His decision

**ID:** `intro_08_guido_closeup`  
**Time:** 0:31–0:36  
**Image:** Guido's approved cinematic close-up, relit by cold street fill and
soft amber marquee light. Preserve the approved face exactly. He looks toward
the building.  
**Movement:** Hold for the first two seconds. Then use a nearly imperceptible 3%
push. If an alternate eyelid drawing exists, permit one natural blink near the
start; otherwise use no facial animation. End with the smallest tightening of
his grip heard offscreen rather than visibly deforming his face.  
**Sound:** Crowd and city fall slightly under a low musical phrase. Bag leather
or canvas tightens in his hand.  
**Dialogue:** None.  
**Purpose:** Nervousness becomes a decision without narration or a heroic grin.

## Shot 9 — The other door

**ID:** `intro_09_side_entrance`  
**Time:** 0:36–0:41  
**Image:** Medium-wide shot of the unglamorous performers' entrance beside the
public canopy. Posters of established wrestlers cover the brick. Patrons enter
through the bright doors elsewhere while Guy approaches the plain service
door.  
**Movement:** Slow lateral pan following Guy's implied path, but Guy himself is
an authored final-position still. A foreground patron crosses once to motivate
the cut.  
**Sound:** Public crowd to one side, service-door rattle, pipes or ventilation
from within.  
**Dialogue:** None.

## Shot 10 — “You Moretti?”

**ID:** `intro_10_door_exchange`  
**Time:** 0:41–0:48  
**Image A:** The shut service door with Guy waiting, bag at his side.  
**Image B:** Door open. Warm, worn corridor behind it. The trainer stands inside
and looks first at Guy, then at the bag.  
**Movement:** Discrete door states separated by a sound-led cut. Hold Image B
for the entire exchange. Do not animate mouths; change neither pose during the
lines. A small push may begin only after the trainer says “Guido.”  
**Dialogue:**

> **TRAINER:** You Moretti?
>
> **GUY:** Guido Moretti.
>
> **TRAINER:** In here, Guido.

**Performance:** The trainer is not warm or hostile. He has been told to expect
a body at the door and is deciding whether there is a wrestler inside it. Guy
answers with his full name because he has not yet learned that the building
will shorten him.

**Sound:** Dialogue close and dry; arena sound leaking through the corridor;
small door-hinge complaint. No score beneath the first two lines.

## Shot 11 — Crossing the threshold

**ID:** `intro_11_corridor`  
**Time:** 0:48–0:52  
**Image:** Interior service corridor viewed from behind Guy. The gym bag and his
shoulders dominate the near plane; trainer is already several steps ahead. The
bright rectangle of the street remains behind Guy.  
**Movement:** Three-plane push into the corridor. At the end, crossfade between
open-door and closed-door states; do not animate Guy walking. Exterior color
and traffic sound disappear as the door closes.  
**Sound:** Door latch, pipes, shoes in corridor, lockers, distant voices, a ring
bell, and arena crowd.  
**Dialogue:** None.  
**Transition:** Cut to the dressing-room tutorial, trainer scene, or first
booking conversation.

## Dialogue and caption list

This is the complete spoken opening script:

```text
TRAINER: You Moretti?
GUY: Guido Moretti.
TRAINER: In here, Guido.
```

Optional captions:

```text
CHICAGO — SATURDAY NIGHT, 1952
MARIGOLD ARENA — 817 WEST GRACE STREET
```

Prefer only the Chicago/date caption during the actual sequence. The address
can remain production metadata or appear later on a handbill. Sparse text lets
the audience discover the setting through images and sound.

## Parallax construction plan

Each final still should be delivered as a layered PSD or as registered PNG
planes with identical 16:10 registration dimensions:

```text
FG_OCCLUSION       poles, curb, passing body/car, door edge
CHARACTER_NEAR     Guy or trainer when nearest camera
MIDGROUND          bus, parked cars, patrons, sidewalk
BACKGROUND         facade, street, corridor architecture
ATMOSPHERE         haze, exhaust, dust; soft alpha only
LIGHTS             bulbs, windows, motivated glow; additive-capable
TEXT_SAFE          empty guide layer; no baked lettering
CAMERA_GUIDES      safe crop and maximum pan/push bounds
```

Not every shot requires every layer. Two strong planes are better than six
poorly separated cardboard slices. Hair, hands, and the outline of Guy's bag
need clean mattes wherever parallax can expose the pixels behind them.

## Modest-movement rules

- Never exceed roughly 106% camera scale on a held character close-up.
- Give a still at least one full second of rest before and after an important
  line or reveal.
- Do not pan and zoom simultaneously unless the combined move is extremely
  small.
- Stop camera motion during dialogue whenever possible.
- Let entrances and exits motivate cuts: bus wipe, passing patron, opening
  door, closing door.
- Character motion uses authored states, not bone warping of cinematic art.
- One blink is enough. Not every close-up needs one.
- Cloth, hair, and hands remain still unless a second drawing exists.
- Audio carries offscreen life so the image does not need to demonstrate every
  event visually.
- If a shot feels dead, improve composition or sound before adding idle motion.

## Skipping and replay

- First play: skippable after the bus arrives, with a short hold input to avoid
  accidental skips.
- Later campaigns: immediately skippable.
- **Continue** never replays the arrival; it transitions from the title exterior
  to a campaign-specific recap or the next required scene.
- Gallery/story replay may present the sequence without menu UI.

## Required artwork

1. Marigold exterior master with separated facade, foreground, patrons, cars,
   haze, and lights.
2. Bus arrival wide with closed/open door states.
3. Guy stepping down: two states.
4. Bus departure composition with isolated bus and Guy.
5. Walking shoe-and-bag insert: two foot states.
6. Handbill window with separate Guy reflection.
7. Over-shoulder Marigold reveal.
8. Guido close-up derived from the approved cinematic face master.
9. Side entrance wide.
10. Service door shut/open states with trainer.
11. Interior corridor with open/closed exterior door states.

All generated artwork begins as donor material. Identity, period detail,
perspective, layer mattes, color, and typography require normalization before
production approval.

## In-engine implementation

Assemble this sequence in Phaser rather than exporting it as a finished video.
The current project already uses Phaser 4 at 960 x 600 and has the required
camera, tween, timing, input, and Web Audio capabilities.

Recommended scene structure:

```text
TitleScene
  owns exterior layers, title/menu UI, idle ambience, New Game selection
  hands the same exterior layers or matched camera state into:

IntroArrivalScene
  runs the authored shot timeline, captions, dialogue, audio, and skip logic
  exits into the dressing-room/tutorial scene
```

A single scene with `title` and `arrival` states is also viable for the first
vertical slice and makes the seamless menu-to-story transition particularly
simple. Split the scenes only when loading or campaign-state complexity makes
that useful.

Implementation primitives:

- each parallax plane is an ordinary Phaser image with explicit depth;
- pans and pushes tween image position/scale or a dedicated scene camera;
- bulb, haze, and exhaust layers tween alpha slowly and irregularly;
- door and foot states swap textures or crossfade two registered images;
- captions, menu items, dialogue, and accessibility text use Phaser text/UI,
  never baked image lettering;
- a timeline/state machine schedules shots and owns cancellation on skip;
- the sound layer uses separate ambience, vehicle, footsteps, crowd, dialogue,
  and music channels so transitions can be mixed dynamically;
- selecting **Continue** branches before the arrival timeline;
- skip input kills active tweens/timers, fades audio safely, applies required
  story state, and enters the next scene without replaying intermediate events.

Do not export the opening as an MP4 for production. A video editor may be useful
for a disposable timing animatic or music experiment, but a rendered movie
would make the menu-to-story handoff, captions, controller input, skipping,
volume settings, localization, aspect handling, and later shot revisions more
fragile.
