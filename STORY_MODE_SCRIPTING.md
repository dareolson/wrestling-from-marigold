# Wrestling from Marigold — Story Mode and Campaign Scripting

**Status:** Initial narrative design and scripting framework  
**Created:** 2026-10-07  
**Scope:** Single-player campaign first; local one-on-one remains available  
**Presentation:** Illustrated still-image cutscenes with text, supported later by image generation and artist cleanup

## Opening title and arrival storyboard

Detailed production timing, dialogue, motion, layer, sound, and artwork
requirements live in [INTRO_STORYBOARD.md](INTRO_STORYBOARD.md).
The reusable generation and modest-animation rules live in
[CINEMATIC_ART_STANDARD.md](CINEMATIC_ART_STANDARD.md).

Use one continuous visual idea for both the title screen and the beginning of a
new campaign. The game initially appears to open on a quiet illustrated view of
the Marigold exterior at night. Its marquee and entrance lights provide the
title composition:

```text
WRESTLING FROM MARIGOLD

NEW GAME
CONTINUE
EXHIBITION
```

Do not play Guy's complete arrival before the menu on every launch. The title
screen must remain useful, quick, and recognizable. Instead, selecting **New
Game** causes the existing image to continue into the story. What looked like
a title painting becomes the first shot.

### Visual purpose

The opening establishes the central scale relationship before explaining any
plot: the Marigold already has history, light, television, and famous names;
Guy is one young man arriving by bus with a small bag. He is not entering a
world built for him. He is asking to be admitted to one that was already in
progress.

### Title-screen loop

Keep the idle loop subtle enough that it can run indefinitely:

- the marquee lights hum or flicker imperfectly;
- an automobile passes across the foreground occasionally;
- distant figures enter beneath the canopy;
- a trace of elevated-train, traffic, or crowd sound sits beneath the menu;
- the title and menu are rendered by the game UI, never baked into generated
  background art.

The menu may sit within the marquee's visual space, but it should remain clean
and readable rather than pretending every option is physical lettering.

### Opening-night palette and mood

Render the exterior and story cutscenes in restrained color so they contrast
with the black-and-white televised matches. The opening should feel like
Chicago after working hours: large, dark, smoky, and still moving, with one
small wrestling hall throwing warmth onto the sidewalk.

Use this palette:

- blue-black and desaturated slate for sky, street, windows, and distant brick;
- dirty charcoal for traffic, alleys, utility poles, and the underside of the
  elevated city;
- faded blue-gray and tobacco brown in Guy's clothes;
- warm amber and cream from the Marigold's incandescent marquee bulbs;
- restrained wine red in painted sign details, handbills, and later Guy's
  wrestling identity;
- small areas of muted green or red commercial light only where motivated by a
  real sign or window.

Avoid modern cyan-and-magenta “neo-noir,” brilliant neon on every storefront,
pitch-black crushed shadows, and constant rain. If the opening occurs on the
established hot July date, use humid haze, exhaust, soft halos around bulbs,
open windows, and shirtsleeves—not rain-slick pavement. Weather should follow
the specific campaign date rather than mood alone.

The color should feel printed and slightly aged rather than digitally graded:
limited saturation, warm skin, visible ink contours, mild paper or film grain,
and enough shadow detail to read on a small screen.

### Color grammar for the game

```text
private life / story scenes     → restrained illustrated color
arena corridors and dressing   → color draining as showtime approaches
announcer and televised match  → black-and-white broadcast image
post-match private aftermath   → color returns
posters and newspapers         → limited period print colors
```

This division is thematic, not merely decorative. **Guido** arrives in color as
a private young man. The television camera turns him into **Guy Moretti** in
monochrome. Returning to color after a match restores the pain, doubt, and
consequences that the broadcast presentation cannot contain.

For the first match, make the transition explicit but restrained: Guy crosses
from the warm corridor into arena light; the image loses saturation as the
announcer begins; the bell rings in full black and white. Later matches can cut
directly into the established broadcast treatment.

### New-game sequence — `intro_arrival`

Target length: **35–50 seconds** before the player reaches the first meaningful
choice or tutorial interaction. Use still illustrations, close cuts, restrained
camera moves, and sound rather than full animation.

#### Shot 1 — The marquee

**Framing:** Exterior close-up, 16:10, matching the current 960 x 600 game
canvas. Warm bulbs, weathered sign, dark Chicago street beyond it.

**Action:** The title menu has just faded. The camera pushes slowly toward the
light while the muffled arena crowd becomes audible.

**Text:** None.

#### Shot 2 — The Ashland bus

**Framing:** Wide street view. A Route 9 bus brakes at Grace and Ashland.

**Action:** The doors open. Guy steps down carrying one modest canvas or leather
gym bag. He wears his charcoal trousers, faded blue-gray work shirt, dark wool
jacket if seasonally appropriate, and worn brown shoes.

**Continuity note:** The Marigold at 817 West Grace is east of Ashland. Guy
cannot literally step off the Ashland bus directly beneath its sign. Preserve
the geography and use the walk as part of the arrival.

#### Shot 3 — The walk east

**Framing:** Three short inserts rather than a long traveling shot.

1. Guy's shoes and bag passing through pools of storefront light.
2. His broad, work-roughened hand briefly visible as he changes hands on the
   bag; the trainer will apply the signature wrist tape inside.
3. A handbill or window card announcing Saturday wrestling at the Marigold.

**Sound:** Bus pulling away, ordinary street traffic, his steps, then the first
distant rise of the wrestling crowd.

#### Shot 4 — First sight

**Framing:** From behind Guy at the end of the block. The Marigold sign finally
appears ahead of him, smaller and more workmanlike than a palace but brilliantly
alive against the street.

**Action:** He stops. Do not have him grin broadly. He takes in the sign, tightens
his grip on the bag, and keeps walking.

**Text:** Optional location card only:

> Marigold Arena — Chicago

#### Shot 5 — Guido

**Framing:** Approved cinematic close-up. The marquee light moves softly across
his face.

**Action:** Nervousness, calculation, then a small decision in the eyes. This is
the private young man before the building begins calling him Guy.

**Text:** None. Do not introduce him with biography.

#### Shot 6 — The side entrance

**Framing:** Medium shot. Guy reaches an unglamorous performers' entrance beside
the public doors. Posters for established wrestlers occupy the wall; his face
is not among them.

**Action:** An older man—his future trainer—opens the door and looks from Guy to
the bag.

> **TRAINER:** You Moretti?
>
> **GUY:** Guido Moretti.
>
> **TRAINER:** In here, Guido.

The trainer turns before Guy can offer anything else. Guy follows him inside.
This is the first spoken use of **Guido**, keeping the later broadcast naming
distinction intact.

#### Shot 7 — Crossing the threshold

**Framing:** Interior service corridor. The bright exterior narrows behind Guy
as the door closes. Arena noise, pipes, lockers, and voices replace the street.

**Transition:** Cut to the trainer tutorial, dressing-room scene, or first
booking conversation.

### Continue-game behavior

Selecting **Continue** should not replay the arrival. The exterior dissolves
directly into a short campaign-specific recap image or the next scheduled
scene. The arrival belongs to the beginning of Guy's story and becomes less
powerful if treated as a general loading sequence.

## The premise

You arrive in a 1950s wrestling territory as an unknown wrestler with no name
value and no leverage. The promoter books you to lose because that is what an
unknown wrestler is for: make the established man look dangerous, give the
crowd one flash of hope, and take the finish.

You lose night after night. The first three matches are deliberately lopsided.
You can land a few moves and earn the crowd's attention, but the featured
opponent is stronger, more experienced, and expected to beat you.

Then the promoter calls you into his office.

> “Three nights, three losses. Tonight, I need to know whether there is anything
> underneath that robe. Go into business for yourself. Win—or don't come back.”

The opponent has not been given the same instruction. For the first time the
match is mechanically fair, but nothing gives the player the victory. The
player must earn it. Losing this match ends the run and returns the campaign to
the beginning of the chapter.

Winning creates a larger problem. The player has broken the natural order of
the territory, embarrassed an established wrestler, and made the crowd care.
Now the locker room has a target. A major heel is sent to expose the newcomer.
The player must defeat him twice. He is more dangerous in the rematch because
he has studied the player's habits, changed his strategy, and negotiated a
stipulation designed to remove the player's advantages.

This is the campaign's central promise:

> The booker decides what result he wants. The player still has to perform it,
> survive it, and live with what it does to their career.

## Why story mode matters

The wrestling simulation can produce excellent individual matches, but a
sequence of ordinary one-fall matches will eventually blur together. Story
mode gives every match a reason to exist before the bell rings and a consequence
after it ends.

Each opponent is treated as a **feud**, not a rung on a ladder. A feud changes
at least three things:

1. **Story stakes:** what winning, losing, obeying, or defying the booking means.
2. **Match objective:** the actual result or performance the promoter expects.
3. **Gameplay texture:** opponent behavior, rules, arena conditions, damage,
   time limit, number of falls, move restrictions, or another concrete twist.

A new opponent should never mean only a new portrait and a larger health bar.

## Player-character direction

The current strongest direction is a single authored protagonist, comparable to
the role Little Mac plays in *Mike Tyson's Punch-Out!!*: the player learns one
memorable hero deeply while every opponent supplies a new personality, puzzle,
and dramatic problem. This remains a design direction rather than a locked
production decision.

### Recommended first approach: a fictional unknown

A fictional or player-named wrestler provides the cleanest role-playing space.
The player can obey bookings, rebel, turn heel, lose reputation, or become
champion without contradicting a real person's career. Real historical
wrestlers can still anchor the territory and make advancement meaningful.

This also makes the central fantasy personal: the player is not reenacting a
known rise; the player is trying to force a place into wrestling history.

### Alternate approach: a real wrestler early in his career

This supplies immediate identity and historical texture, but it narrows player
agency and requires careful research. A real-person campaign should be clearly
presented as dramatized alternate history whenever match results, motives, or
private conversations are invented. It should not present fictional booking as
a recovered historical fact.

### Useful hybrid

The player is fictional, but the territory includes recognizable historical
figures. This preserves agency while allowing stars such as Gorgeous George or
Lou Thesz to feel like consequential encounters rather than selectable skins.

## Protagonist — Guido “Guy” Moretti

The protagonist is **Guido “Guy” Moretti**, a 21-year-old Italian-American
wrestler from New York City who now lives in Chicago's Taylor Street district.
He is 5'10" and 190 pounds: solid, quick, and legitimately tough, but not large
enough to dominate the established heavyweights physically. He looks like a
young man who could handle himself in a neighborhood fight, not a polished
champion or exaggerated bodybuilder.

The full name is deliberately specific. Family, childhood friends, and people
trying to reach the private young man call him **Guido**. The formal ring
introduction also uses **Guido Moretti**. Once the introduction ends, broadcast
commentary calls him **Guy** or **Moretti** almost exclusively. The commentator
should rarely say Guido again during a match and may never need to. Posters and
newspapers use **Guy Moretti** or the full billing according to available space.

The promoter did not invent a flamboyant gimmick; he simply shortened Guido
into a name that fits cleanly on a bill and in rapid commentary. That modest act
of repackaging is Guy's first lesson that the wrestling business can rename a
man before it has decided whether he matters.

Use the full billing selectively:

```text
GUIDO “GUY” MORETTI
New York City
5'10" — 190 lb
```

The formal introduction uses “Guido Moretti.” After the bell, use “Guy” for
immediacy and “Moretti” for traditional play-by-play cadence. The full quoted
billing belongs on title cards, major posters, press material, and scenes where
the contrast between his private and professional identities matters. His exact
New York neighborhood remains open until his family is written in greater
detail.

### Before the Marigold

Guy is not making his first living in the ring. His established history at the
start of the campaign is:

- He grew up in New York City and became a champion high-school wrestler. His
  exact school, championship, and New York neighborhood remain open pending
  research; the important truth is that his wrestling began as a legitimate
  competitive sport rather than a carnival act or professional gimmick.
- After school he followed construction work to Chicago and rented in the
  working-class Italian neighborhood around Taylor and Halsted Streets. The
  formal introduction can therefore truthfully bill him from New York City
  even though Chicago is now where he sleeps and works.
- He worked on a masonry crew for **Raffin Construction Company**, a real
  Chicago contractor founded by Italian immigrant and mason Louis Raffin. His
  employment is fictional: the game must never imply that a historical Raffin
  payroll or personnel record names Guy Moretti.
- He began as a mason's tender, carrying brick and mortar, and earned his way
  into laying common brick. “Bricklayer” is the honest short version used in
  dialogue. The work accounts for his grip, forearms, back, patience, and
  refusal to complain when tired; it does not make him superhuman.
- About one year before the campaign, Guy took a cash bet at a traveling
  carnival athletic show and defeated its sitting wrestling champion. The
  carnival and champion should be fictional unless later research identifies a
  suitable documented show. This kind of audience challenge was already an
  old-fashioned, fading attraction by the early 1950s, which makes the event
  feel like an unlikely doorway into the modern televised business.
- Word of the upset traveled because Guy did not merely outlast the attraction:
  he wrestled him. A Chicago promoter asked around, found his high-school
  record and local reputation for legitimate grappling, and invited him to
  train for professional work.
- Guy left full-time bricklaying and spent the following year working a few
  dozen small professional bouts. He therefore knows how to enter a ring, take
  instructions, protect an opponent, and finish a match. What he lacks is
  experience with important talent, television, locker-room politics, and a
  crowd large enough to alter a promoter's plans.
- On Saturday cards, he rides the Route 9 Ashland bus north from the Taylor
  Street area, gets off near Grace Street, and walks east to the Marigold at
  817 West Grace. Weekend buses began replacing Ashland streetcars in May
  1952, so this detail should only be used when the fictional match date makes
  it valid. A weekday scene set before full conversion should use the
  streetcar instead.

The campaign begins with Guy's first sustained opportunity at the Marigold,
not his professional debut. To the office and most of the audience, a year of
small bouts still makes him an unknown.

### Core character

- **Young and naive:** He understands fighting better than wrestling. He takes
  words literally, believes effort should determine position, and has not yet
  learned how much of the business happens outside the ring.
- **Tough rather than fearless:** He feels pain and recognizes danger, but he
  refuses to let another wrestler decide that he is small, weak, or disposable.
- **Proud:** He is deeply reluctant to do the job. Losing on command feels like
  admitting inferiority, even when he intellectually understands why newcomers
  are used that way.
- **Professional under protest:** He does the first jobs because this is his
  only entrance into the business. He tries to give the promoter what was
  requested, but every loss costs him something emotionally.
- **Impossible to bully quietly:** He can be ordered around by the office, but
  he cannot be shoved, hazed, or humiliated in the locker room without
  responding. This creates trouble before he has the status to survive it.
- **Earnest:** He is not yet skilled at promos, deception, or political
  maneuvering. His directness can be charming, funny, or dangerous depending on
  who is listening.

### Central inner conflict

At the start, he believes these statements mean the same thing:

```text
I agreed to lose.
I let him beat me.
He is better than me.
I am weak.
```

The campaign gradually separates them. He learns that doing the job can require
discipline, timing, courage, and generosity—but he also learns that “business”
is sometimes the word powerful people use when they want him to accept
humiliation. His maturity is not simple obedience. It is learning which losses
are part of the craft and which demands require him to stand up for himself.

This makes the Booker's ultimatum especially potent. “Go into business for
yourself” gives him permission to act on the impulse he has suppressed for
three matches, but doing it successfully requires all the wrestling knowledge
those losses taught him.

### Voice

He should sound 21, not like a veteran writer speaking through a young man.
Keep his dialogue direct, concrete, and occasionally too honest.

Good voice examples:

> “I know what you told me. I just don't know why he gets to laugh about it.”

> “I'll go down for him. He puts his hands on me back there, that's different.”

> “You want me to lose, I'll lose. You want me to look scared, find somebody
> else.”

> “Nobody told me winning would make them hate me more.”

Avoid constant wisecracks, modern therapy language, polished speeches, and
generic tough-guy threats. When he has something important to say, fewer words
will make him feel tougher.

### Visual identity brief

- 21 years old; youthful face that can still look dangerous when angry;
- use the youthful underdog energy associated with Danny LaRusso in *The
  Karate Kid* as a tonal reference: approachable, expressive, slightly out of
  his depth, and instantly defiant when someone tries to push him around;
- add only a trace of early-career Johnny Depp's visual energy: dark, watchful
  eyes, a slightly more angular and delicate face, and a quiet inward quality
  when Guy is not speaking;
- translate both tonal references into one original face rather than
  reproducing or blending Ralph Macchio's or Johnny Depp's exact likeness,
  features, hairstyle, costume, or film stills;
- 5'10", 190 pounds;
- compact, visibly muscular wrestler's build: broader shoulders, thicker chest
  and arms, sturdy neck, strong back and bricklayer's forearms, while retaining
  a believable natural 21-year-old physique rather than a bodybuilder shape;
- powerful enough to be credible, visibly smaller than true heavyweights;
- dark brown hair with a simple 1952 cut, a little movement or an unruly
  forelock, and a silhouette that remains recognizable from the corner view;
- clean-shaven at all times—**no mustache**, beard, or dark upper-lip shadow
  that reads as a mustache under dramatic lighting;
- expressive brows and eyes—the audience should see when he is confused,
  humiliated, defiant, or beginning to understand;
- a straight or slightly prominent nose and an open, youthful resting
  expression; avoid the square-jawed veteran prizefighter face until emotion
  hardens it during a scene;
- plain early-career trunks and boots, maintained carefully but without star
  ornamentation;
- one small repeatable visual signature to be chosen during concept art, such as
  a taped wrist, robe trim, boot stripe, or distinctive forelock;
- appearance may improve with status, but his body and face remain recognizable.

Do not lean on broad ethnic shorthand, comedy accents, hand gestures, food
imagery, mob associations, or costume stereotypes. His family and neighborhood
can give him specificity without making ancestry his entire personality.

In shorthand, the visual equation is: **young underdog warmth + dark-eyed
intensity + compact bricklayer strength + legitimate wrestler's neck and
forearms**. The LaRusso influence supplies openness and defiance; the slight
Depp influence supplies watchfulness and angularity. He should look like
someone a larger man might underestimate once, not like a miniature
heavyweight, a polished action hero, or an actor lookalike.

### Wardrobe

Guy dresses one rung more carefully than he can afford. His clothes are clean,
repaired, and fitted as well as possible, but he owns very few of them. His
core palette is **deep wine red, cream, charcoal, faded blue-gray, tobacco
brown, and black**.

#### Opening ring attire

- plain deep wine-red trunks with no lettering, stars, fringe, or side design;
- black calf-high lace-up wrestling boots with cream laces;
- one wrist wrapped in plain white athletic tape by his trainer;
- no knee pads, jewelry, logo, nickname, or personalized robe;
- a clean plain towel over his shoulders for the first job matches.

Wine red is Guy's signature color. The trunks remain recognizable while his
presentation grows around them. Current identity and cinematic donors with
black trunks are anatomical and facial references; recolor the trunks and boot
laces and add the single taped wrist during Procreate normalization.

#### Arena arrival and ordinary life

- high-waisted charcoal wool trousers with a period full leg;
- white or cream ribbed undershirt;
- faded blue-gray work shirt, open at the neck and often rolled neatly below
  the elbow;
- worn brown leather belt;
- brown work shoes or service boots;
- short dark wool jacket in cold weather.

Do not make a white T-shirt and motorcycle jacket his permanent uniform. A
leather utility jacket can appear, but the complete later “greaser” shorthand
would make him feel generically retro rather than specifically like Guy in
1952.

#### Masonry-yard clothes

- dusty olive or charcoal cotton-twill work trousers;
- heavy brown work boots;
- white sleeveless undershirt;
- faded chambray work shirt, removed or hanging open in the heat;
- canvas gloves tucked into a back pocket;
- old leather belt;
- brick dust on knees, forearms, and shoes.

The clothes should emphasize the contrast in “The Proposition”: Guy stands in
honest work dust while the gambling representative remains clean beside a
polished automobile.

#### His one suit

Guy owns one off-the-rack charcoal single-breasted suit with moderately broad
lapels and high-rise, full-cut trousers. He wears it with a white shirt, muted
burgundy tie, and carefully polished but worn black shoes. At first its
shoulders fit imperfectly and its sleeves are slightly short because his
wrestler's build has outgrown it.

Use the suit selectively for an important promoter meeting, press photograph,
funeral, or contract. A properly fitted replacement later in the campaign can
show that wrestling finally pays him without requiring dialogue.

#### Presentation progression

```text
unknown     → wine trunks, black boots, white wrist tape, plain towel
recognized  → simple wine-red satin robe with narrow cream piping
contender   → MORETTI added across the robe after the name begins drawing
star        → tailored robe and properly fitted charcoal suit
```

Do not make his later wardrobe gaudy. Better cloth, cleaner fit, and the earned
addition of his name communicate progress while flamboyance remains the visual
territory of established showmen.

## Guy's trainer

Guy needs one person in his corner before the territory has given the audience
any other reason to care about him. The trainer is not a glamorous manager and
does not speak for Guy. He is an older wrestling hand who prepares him, tells
him difficult truths, and recognizes that toughness without craft will get a
21-year-old hurt.

The trainer's name, age, ethnicity, and personal history remain open. His
dramatic function is defined:

- he is the first person to call the protagonist **Guido** naturally rather
  than as part of a formal introduction;
- he teaches Guy how wrestling differs from fighting;
- he explains bookings without pretending they are always fair;
- he gives opponent-specific advice in period-appropriate language;
- he tends bruises, tapes wrists, checks boots, and provides continuity between
  matches;
- he knows when Guy is being tested and when Guy is simply being used;
- he cannot win the match, reverse consequences, or protect Guy from every
  locker-room conflict;
- he has enough standing to get Guy into rooms, but not enough power to make
  the office value him.

He should not be an all-knowing mentor. He can misread the Booker, withhold
something because he believes Guy is not ready, or advise the professionally
safe choice when Guy's pride demands another. Their relationship gains weight
when the player realizes that the trainer is also risking his reputation by
standing beside an unknown.

### Trainer as a game system

The trainer can carry tutorial and scouting information without breaking the
period presentation:

- before a match, he names one opponent habit to watch;
- during the corner cutaway, he reminds Guy of the booking and immediate goal;
- between falls, he identifies what changed and recommends one adjustment;
- after a loss, he distinguishes a technical mistake from a booking mismatch;
- after an injury, he warns what movement or body region is compromised;
- as trust grows, his advice becomes more specific and mechanically valuable.

Advice should be short enough to remember after the bell. Examples:

> “Guido, don't fight him chest to chest. Make him turn first.”

> “He wants that left arm. Give him the wrist, then take the elbow.”

> “The office asked for eight minutes. Your pride can wait eight minutes.”

> “They booked you to win. They didn't promise he'd help.”

The trainer can also provide the campaign's natural move-learning interface.
New techniques are practiced with him between events, then become available in
the next match. This makes progression feel taught rather than purchased from a
menu.

## Pre-match broadcast ritual

Every story match begins with a short televised introduction. This is not only
decoration: it establishes the opponent as a character, communicates the
stipulation and stakes, shows Guy's condition, and creates anticipation before
control begins.

Target length is roughly 20–35 seconds on first viewing. Previously viewed
introductions become skippable. Important new rule/stipulation text must remain
available on a pause or match-card screen so skipping never hides gameplay
information.

### Standard sequence

1. **Arena establishing image.** Crowd, ring, location caption, night/date if
   relevant, and match stipulation.
2. **Announcer cutaway.** A period broadcast announcer addresses the camera and
   gives the immediate story: why the men are meeting and what is at stake.
3. **Opponent corner cutaway.** Show a behavior unique to the opponent—quiet
   focus, showboating, arguing with the referee, testing the ropes, receiving a
   final instruction, protecting an injured limb, or watching Guy across the
   ring.
4. **Guy's corner cutaway.** The trainer finishes taping, adjusts Guy's robe or
   mouthpiece, and gives one concise line of useful advice. Guy's expression and
   body language reflect his current confidence, damage, and relationship with
   the booking.
5. **Formal ring introductions.** The opponent receives his complete billing.
   Guy is introduced as **Guido Moretti**.
6. **Bell and control.** Commentary shifts immediately to **Guy** or **Moretti**.

### Guy's baseline introduction

> “And in this corner, from New York City, weighing one hundred ninety pounds—
> Guido Moretti!”

Do not insert “Guy” into the ordinary spoken introduction. The contrast is the
point: **Guido** is the young man standing nervously in the corner; **Guy** is
the wrestler the broadcast begins describing when the bell rings.

Major matches can expand the billing after he earns status:

> “From New York City, weighing one hundred ninety pounds—the young contender,
> Guido Moretti!”

Avoid adding grand nicknames too early. His name should acquire weight through
the player's memory of what he survived.

### Commentary naming rules

- First call after the bell: “Guy Moretti...” or “Moretti...”
- Ordinary action: mostly “Guy”; use “Moretti” for formal calls and major
  momentum shifts.
- “Guido” is reserved for an exceptionally personal moment, if used at all:
  trainer audio, family dialogue, or a commentator briefly dropping the public
  persona after a frightening injury.
- Opponents may deliberately call him Guido backstage to patronize him, but the
  script should use that sparingly so the distinction retains force.

### Biographical commentary

The announcer can reveal Guy's past in small, event-triggered pieces. Never
recite the whole biography before a match. A detail should explain what the
player is seeing now or change how it feels:

- mention the high-school championship after a clean reversal, escape, or
  surprisingly polished takedown;
- mention the masonry work when his grip holds, his forearms matter, or he
  continues working while exhausted;
- mention the carnival champion when Guy confronts a stronger favorite or
  produces an upset that the building did not expect;
- mention his few dozen preliminary bouts after a veteran exploits something
  that legitimate wrestling did not teach him;
- mention the bus ride only during an arrival image, a humble-purse story, or a
  contrast with a star's automobile—not every time he appears.

Early commentary treats these as colorful facts about an obscure young man.
Later commentary recalls them as the beginning of a known story. Repetition
should evolve rather than merely recur: first “the bricklayer,” later “the
young man who came here from the brick crew,” and eventually a reminder that
he no longer arrives unnoticed.

### Opponent introductions as gameplay foreshadowing

The opponent corner shot should reveal the match's mechanical idea before a
tooltip explains it:

- a powerhouse squeezes the top rope and rolls his shoulders before lockups;
- a technician watches Guy's taped elbow rather than his face;
- a heel keeps interrupting the referee and hiding something in his trunks;
- an exhausted rival struggles to rise from his stool before a later fall;
- a champion never looks toward Guy, communicating that the unknown has not yet
  earned attention.

As the campaign progresses, the same ritual changes. Early opponents ignore
Guy. Later opponents watch him carefully. Eventually a major star's trainer is
the one whispering urgent instructions while Guy waits calmly across the ring.
That reversal visually communicates his rise without requiring dialogue.

## Why one playable wrestler helps the game

A single protagonist converts roster limitations into authorship:

- every animation can be tailored to one evolving body and personality;
- move unlocks can visibly chart his education;
- injuries and costume changes persist naturally through cutscenes;
- opponents can be designed as readable bosses with specific counters;
- commentary can refer to a coherent personal history;
- the player recognizes growth in timing, posture, confidence, and repertoire;
- story scenes can preserve one face and silhouette instead of supporting every
  possible created character;
- image-generated cutscene references become much easier to keep consistent.

Story mode may restrict control to the protagonist while exhibition or local
multiplayer remains a separate mode. Whether defeated opponents eventually
become selectable outside story mode is a later product decision; it should not
weaken the authored campaign structure.

## Making the opening losses feel powerless but playable

The opening must genuinely feel like getting one's butt kicked. If the player
can casually win, the later rise has no weight. If the game simply ignores
input, the player will feel cheated rather than oppressed. The distinction is
**overmatched agency**: controls remain honest, but the opponent's strength,
experience, and permission to dominate are overwhelming.

### What the player can control

- movement and attempts to create space;
- blocking, evasion, rope awareness, and survival;
- which small openings to attack;
- whether required hope spots are convincing;
- stamina management;
- whether the assigned loss is professional or embarrassing;
- small improvements from one night to the next.

### What makes the opponent oppressive

- stronger lockup outcomes;
- shorter counter windows for the player and more reliable opponent counters;
- faster recovery from ordinary offense;
- superior stamina and damage conversion;
- intelligent targeting of a hurt body region;
- early access to moves the protagonist has not learned;
- aggressive cutoff behavior when the player begins a comeback;
- decisive finish hunting once the booking's required beats have occurred.

Avoid arbitrary input reversal, invisible forced movement, unexplained control
lockouts, or secretly changing a successful player action into failure. The
opponent should beat the player through exaggerated but legible wrestling
advantages.

### The three losses should show progress

| Match | Felt experience | Evidence of growth |
| --- | --- | --- |
| 1 | Survival; the opponent seems impossibly fast and strong | Player learns basic defense and recognizes the finish too late |
| 2 | Player creates a real opening before being cut off | First nearfall or escaped signature hold |
| 3 | Player can briefly control the match, but cannot sustain it | Longer comeback, better stamina use, crowd begins to believe |
| 4 | Same world, but the player finally has a fair chance | Knowledge from all three losses becomes a route to victory |

The loss sequences should be forceful and memorable: heavy offense, longer sell
animations, difficult recoveries, and a protected finish that feels terminal.
They should not be gratuitously long. The player needs enough time to feel the
imbalance and notice improvement, then the match should end decisively.

## Becoming a wrestler as mechanical progression

The difficulty curve should not merely turn enemy numbers down. The protagonist
acquires the craft the player has been learning.

Potential progression:

1. **Night 1 — a tough kid:** movement, block, one strike, basic lockup, escape.
2. **Night 2 — learns to sell and survive:** improved recovery choice, rope
   awareness, one reversal.
3. **Night 3 — learns match rhythm:** first comeback sequence, nearfall setup,
   stamina pacing.
4. **Ultimatum — proves he can finish:** balanced base tools and a newly trusted
   signature move.
5. **First feud — learns adaptation:** alternate setup when the heel counters
   the signature.
6. **Two-of-three-falls rematch — becomes a wrestler:** body-part strategy,
   conserving moves, changing plans between falls, closing under pressure.

Growth can be expressed through move access, recovery options, counter windows,
stamina efficiency, animation confidence, and the situations the AI allows—not
through a conventional screen of small percentage upgrades alone.

The visual performance should evolve too. Early idle posture can be guarded and
uncertain; early lockups look reactive; early victories surprise him. Later he
claims ring center, transitions deliberately, and expects opponents to react to
him. By the time the raw difficulty eases, the player should feel that it eased
because both the character and the person holding the controller learned how to
wrestle.

## Two layers of victory

Story mode separates the **match result** from the **professional assignment**.

### Match result

- pinfall;
- submission or stoppage;
- count-out;
- disqualification;
- time-limit draw;
- two-out-of-three-falls result;
- special stipulation result.

### Booking result

- win;
- lose;
- draw;
- protect an opponent while losing;
- make an opponent look dominant;
- give the crowd one convincing hope spot;
- survive to a minimum time;
- lose only to the named finish;
- avoid a forbidden move;
- generate a required heat/drama threshold;
- go into business for yourself and disregard the announced finish.

The player can therefore lose the match and still complete the mission. The
opening chapter teaches that wrestling success is not identical to the win/loss
record.

Conversely, the player can win a match and fail professionally. Pinning a star
on a night when the player was booked to lose may create a branch, a firing, a
locker-room attack, or an immediate rematch under punitive conditions.

## Booking is not an automatic result

Being booked to win does not make the opponent passive and does not trigger a
scripted victory. It changes the encounter's intended balance and objectives:

- the opponent is no longer given an overwhelming hidden advantage;
- the match permits the player a real route to victory;
- the AI still protects itself, counters, escapes, and attempts to win;
- the player must create an opening and execute the finish;
- a poor performance can still lose the match or damage reputation.

This preserves the wrestling game's integrity. The narrative explains why the
fight is possible; the player supplies the victory.

## Campaign unit: the feud

Every feud has a small dramatic arc:

```text
introduction → first match → consequence → changed rematch → resolution
```

Recommended length is two to four matches. Not every feud requires the player
to win every match. Some exist to establish a rival, injure a body part, turn
the crowd, introduce a stipulation, or force the player to choose between the
promoter and personal pride.

Each feud record should define:

| Field | Meaning |
| --- | --- |
| `id` | Stable internal name |
| `opponent` | Character/preset ID |
| `dramatic_question` | What this feud asks about the player |
| `relationship` | Stranger, gatekeeper, rival, ally, champion, etc. |
| `matches` | Ordered match scripts |
| `escalation` | How later matches change mechanically and emotionally |
| `resolution` | State changes after success/failure |
| `cutscenes` | Before/after/between-match scenes |
| `art_continuity` | Character, costume, arena, and lighting locks |

## Campaign length target

The first complete campaign targets **18 required wrestling matches** across
Guy and seven opponents, plus **two short playable street-fight interludes**.
This is long enough to feel like a wrestling season rather than an arcade
ladder, while keeping rematches purposeful and allowing the story to leave the
arena without pretending every conflict is another sanctioned bout.

| Campaign block | Required matches |
| --- | ---: |
| House Favorite: three jobs and the must-win upset | 4 |
| Featured Heel: first confrontation and changed rematch | 2 |
| Opponent 3 feud | 2 |
| Opponent 4 feud | 2 |
| Opponent 5 feud | 2 |
| Opponent 6 feud | 2 |
| Final opponent/champion feud | 3 |
| Returning-opponent story match | 1 |
| **Total** | **18** |

Expected first-completion length is approximately five to seven hours once
cutscenes, ordinary failures, the Chapter 1 restart, and between-match material
are included. A skilled replay may take roughly three to four hours. These are
design targets, not promises, and should be measured from real playtests.

Most opponents receive two matches: one that establishes the puzzle and one
that changes it. The House Favorite and final champion earn longer arcs because
they define Guy's position at the beginning and end of the campaign. Do not add
a third match merely to increase length.

The eighteenth match returns Guy to someone who dominated him earlier. Its
purpose is not nostalgia or filler. It demonstrates progression through a
changed power relationship: familiar attacks now look readable, old survival
objectives become offensive opportunities, and an opponent who once ignored
Guy must prepare specifically for him.

Optional branches, failed-booking consequences, exhibitions, and alternate
stipulations may add matches without increasing the required critical path.
Avoid expanding the mandatory campaign beyond roughly 20 matches until the
game has enough distinct rules, AI behaviors, and story consequences to prevent
repetition.

## Playable interludes: the brick-yard fights

Guy's growing reputation follows him outside the Marigold. Twice during the
campaign he is forced into a real fight with professional bruisers employed by
a fictional gambling outfit. These are short, authored confrontations—not a
second campaign of random street crime.

The outfit has money riding on Chicago wrestling and maintains several
prizefighters for unsanctioned contests, intimidation, and debt collection.
At first it wants to recruit Guy for private fights and learn whether the
carnival story is true. After he refuses and defeats its first man, the second
fighter is sent to punish him and damage him before an important booked match.

The initial approach occurs at an old masonry yard on the Near West Side. Guy
has returned to help former crewmates unload a delivery between bookings. This
keeps the brick-yard setting personal without quietly returning him to
full-time construction work.

The yard and criminal outfit must be fictional. **Do not stage criminal
activity at Raffin Construction or imply that the real company, its owners, or
its employees had any connection to organized crime.** Production may use a
plain fictional name such as `West Side Brick & Lime` until the location is
fully designed.

### Why these fights belong in the campaign

- They show that Guy's reputation now has value beyond the promoter's office.
- They test the legitimate grappling beneath his professional performance.
- They let the player feel how dangerous familiar wrestling actions become
  without ropes, a referee, or a cooperative opponent.
- They break the rhythm of arena matches while reusing the core movement,
  strike, clinch, stamina, and damage systems.
- Injuries sustained outside the ring can alter the next booked match, joining
  story and gameplay instead of functioning as a detached minigame.
- Guy wins attention but learns that being known also makes him reachable.

### Street Fight 1 — “The Proposition”

**Placement:** After Guy's first important upset, before the territory has
decided whether he is a novelty or a real attraction.

**Scene:** Morning at the fictional masonry yard. Guy is in work trousers and
an undershirt, helping two old crewmates with a delivery. A well-dressed
representative waits beside a parked automobile while his prizefighter offers
Guy cash for an unsanctioned fight. Guy recognizes that the offer is actually
an instruction. He refuses. The representative gives the fighter a small nod
and steps out of the dust.

**Opponent type:** A seasoned club boxer with fast, damaging hands, strong
head movement, and poor answers to a committed body lock or takedown.

**Gameplay lesson:** A wrestling clinch can smother a superior puncher, but
closing distance on hard ground is dangerous.

**Rules and finish:** No pinfall, ropes, referee, or crowd meter. Guy wins by
stunning the fighter, controlling him on the ground, and forcing him to
concede—or by creating a safe opening to leave. The story should not require
Guy to beat an unconscious man.

**Aftermath:** The representative is more interested than angry. He now knows
the carnival story was credible and tells Guy that refusing the first offer
has made the next one more expensive.

### Street Fight 2 — “The Collection”

**Placement:** Before a late-campaign feature match, after Guy's name has begun
to affect serious betting.

**Scene:** Guy finds the yard nearly empty near closing time. The second
fighter is already waiting between the brick stacks. This is no recruitment
test: the outfit wants Guy's ribs or right hand damaged before Saturday.

**Opponent type:** A heavier catch wrestler and experienced enforcer who can
counter Guy's obvious takedowns, attack fingers and joints, and use walls,
brick stacks, and the narrow space to deny movement. He should feel like a man
selected after studying what happened in the first fight.

**Gameplay twist:** The player must protect the body part needed for the next
match. Winning recklessly can still produce a worse starting injury than
surviving intelligently. A clean victory, an injured victory, and a narrow
escape can feed different trainer dialogue and next-match conditions.

**Aftermath:** Guy understands that the outfit is connected to someone around
the wrestling business, but not necessarily the Booker. The identity of that
connection can drive a later feud instead of being resolved by exposition.

### Street-fight presentation rules

- Target three to five minutes apiece on a first successful playthrough.
- Keep the camera closer and the sound drier than in the arena: shoes on grit,
  breath, cloth, a distant truck, and loose brick shifting under weight.
- Remove entrance music, formal health introductions, audience heat, referee
  counts, theatrical pauses, and pinfall poses.
- Retain readable game language. This is not an invitation to replace the
  wrestling controls with an unrelated brawler system.
- Brick piles, pallets, mortar sacks, a wheelbarrow, and a water barrel can
  shape space. Loose bricks are not collectible weapons; one strike with a
  brick would change the story into attempted murder.
- Neither opponent carries a gun or knife. The danger is career-ending injury
  and coercion, not an unexplained willingness to kill Guy in public.
- The gangsters are fictional individuals, not ethnic shorthand. Do not tie
  them to Guy's Italian identity or imply that his family or neighborhood is
  naturally connected to organized crime.
- The announcer does not possess omniscient knowledge of the encounters. He
  may notice Guy's bruising or cautiously repeat a circulating rumor only
  after the story gives that information a credible route into the locker
  room.

## First playable chapter: “The Wrong Finish”

This chapter should be the vertical slice for story mode. It uses a small cast,
reuses one arena, teaches the booking system, and provides a complete dramatic
turn without requiring the full campaign.

### Core cast

- **The Player:** unknown, replaceable, hungry, not yet aligned as face or heel.
- **Guy's Trainer:** the older wrestling hand in his corner; teacher, cut man,
  scout, and the only person with enough faith to use Guido's private name
  without diminishing him.
- **The Booker:** practical, unsentimental, and difficult to read. He may be
  testing the player, solving a business problem, or using the player against
  someone else.
- **The House Favorite:** the established wrestler who beats the player on the
  first three nights. He is not necessarily evil; this is his position in the
  territory and he intends to keep it.
- **The Featured Heel:** a recognized name sent after the player following the
  upset. He understands crowd control, cheats intelligently, and takes the
  newcomer's rise as a personal insult.
- **The Gambling Representative:** a composed outsider who treats violence as
  a business expense and becomes interested when Guy refuses to be owned.
- **The Outfit's Prizefighters:** two distinct professionals—first a boxer sent
  to test and recruit Guy, later a catch wrestler sent to injure him.

Names remain open until the initial roster and historical/fictional direction
are settled.

### Match 1 — “Make Him Look Good”

**Booking:** Lose to the House Favorite.  
**Mechanical balance:** Opponent has a major power, stamina, recovery, and AI
advantage.  
**Player lesson:** Defense, movement, surviving lockups, and recognizing a
finish setup.  
**Performance goals:**

- survive for a minimum duration;
- land two or three clean offensive moves;
- produce one crowd-response spike;
- take the designated finish in the ring rather than by count-out;
- do not use the player's future signature move.

**Success:** The player loses correctly and earns another booking.  
**Failure:** A quick squash or disobedient result earns no reputation and may
require replaying the night.

The point is not to disguise a tutorial as a fair contest. The hopelessness is
the story.

### Match 2 — “Give Them Hope”

**Booking:** Lose again, but create one believable nearfall.  
**Gameplay twist:** The opponent begins aggressively and targets one body
region. The player must build enough momentum for a prescribed comeback window
without accidentally exhausting the opponent too early.  
**Performance goals:**

- escape or reverse one signature hold;
- reach a heat threshold;
- score one two-count or near-submission;
- lose to the protected finish after the hope spot.

**Narrative effect:** The crowd begins chanting or reacting to the unknown.
The House Favorite notices.

### Match 3 — “Know Your Place”

**Booking:** Lose decisively.  
**Gameplay twist:** The opponent has learned the player's most-used move and
counters it. The player enters with partial damage from the prior match or a
reduced recovery rate.  
**Performance goals:**

- last longer than Match 1;
- avoid repeating one move beyond a stated limit;
- complete a visible comeback beat;
- preserve enough stamina to sell the final sequence convincingly.

**Post-match scene:** The crowd gives the defeated player the first meaningful
reaction. The Booker watches from the aisle without applauding.

### Cutscene — “The Office”

The player is summoned after the third loss. The Booker closes the door and
speaks quietly.

Suggested text:

> **BOOKER:** Three towns. Three losses.
>
> **PLAYER:** That's what you asked for.
>
> **BOOKER:** I asked you to make people remember you.
>
> **PLAYER:** They remembered me tonight.
>
> **BOOKER:** Then prove it wasn't pity. Tomorrow, go into business for
> yourself. Beat him.
>
> **PLAYER:** Does he know?
>
> **BOOKER:** He knows he has a match.
>
> **BOOKER:** You lose, don't come back.

The scene should not reveal whether the Booker is helping the player or setting
a trap.

### Match 4 — “Business for Yourself”

**Booking:** Win.  
**Mechanical balance:** Remove the House Favorite's artificial opening-chapter
advantages. The opponent remains a competent, motivated AI and may retain a
small experience advantage.  
**Failure condition:** Losing resets the chapter to Match 1. Previously viewed
cutscenes become skippable and tutorials become abbreviated on replay.  
**Gameplay twist:** Standard one-fall wrestling with no protective mission
objectives. For the first time, the only demand is victory.

The player should recognize familiar patterns from the first three matches:
the opponent's finish setup, favored counter, and vulnerable recovery window.
The earlier losses were also scouting sessions.

**Success:** The player wins a hard match. Do not script a free pin or reduce
the opponent to a dummy.  
**Post-match:** The crowd erupts, the House Favorite is stunned, and the Booker
does not come to the ring. Backstage, nobody congratulates the player.

### Match 5 — “The Territory Answers”

**Opponent:** Featured Heel.  
**Booking:** Win, or at minimum survive according to the chosen branch.  
**Gameplay twist:** The heel controls pace rather than merely having larger
stats. He stalls, uses ropes, draws the referee, attacks a previously damaged
body part, and tries to make the player impatient.  
**Story stake:** Prove that the upset was not one lucky night.

Recommended victory must come through wrestling rather than disqualification,
so chasing the heel into obvious traps is dangerous.

### Match 6 — “Now He Knows You”

**Booking:** Defeat the Featured Heel a second time.  
**Stipulation:** Two out of three falls.  
**Mechanical escalation:**

- the heel counters the player's most-used setup from Match 5;
- his AI becomes more finish-aware after taking the first fall;
- persistent limb damage carries between falls;
- between-fall recovery is limited;
- cheating becomes more likely when he is behind;
- the third fall, if reached, has higher crowd heat and more difficult kickouts.

Suggested dramatic structure:

1. Heel steals or dominates the first fall.
2. Player adapts and earns the second.
3. Final fall becomes the real feud resolution.

Do not force that exact sequence every time. The systems should support it, but
the player's performance can produce a straight-falls win, a collapse, or a
different order with corresponding commentary and post-match text.

**Chapter resolution:** The player is no longer anonymous. The victory unlocks
the next territory-level feud and establishes a reputation trait based on how
the chapter was completed.

## Reputation and consequence axes

Avoid a single morality meter. Track a few legible wrestling-specific values:

| Axis | Increases when | Changes |
| --- | --- | --- |
| `officeTrust` | Following the booking and protecting opponents | Quality of bookings, warnings, promoter dialogue |
| `crowdConnection` | Comebacks, courage, exciting losses, dramatic wins | Crowd support, momentum opportunities, scene tone |
| `lockerRoomRespect` | Wrestling cleanly, surviving, honoring finishes | Rival behavior, allies, rematch conditions |
| `notoriety` | Defying bookings, cheating, humiliating stars | Heel opportunities, retaliation, security around matches |
| `physicalWear` | Accumulated damage and short recovery | Starting health, movement, vulnerable body regions |

These values should create tensions rather than a universal good path. Obeying
the Booker can gain office trust while losing the crowd. Defiance can create a
star while making the locker room dangerous.

## Match-script structure

A story match should be data-driven rather than embedded as scattered scene
conditionals. Initial conceptual form:

```js
{
  id: 'chapter1_business_for_yourself',
  feud: 'the_wrong_finish',
  opponent: 'house-favorite',
  booking: {
    requestedResult: 'win',
    consequenceOnFailure: 'restart-chapter',
  },
  rules: {
    fallsRequired: 1,
    timeLimitSeconds: 600,
    disqualification: true,
    countOut: true,
  },
  playerState: {
    startingDamage: {},
    recoveryMultiplier: 1,
  },
  opponentProfile: {
    preset: 'house-favorite-even',
    adaptations: ['counter-player-most-used-move'],
  },
  performanceGoals: [
    { type: 'win-match', required: true },
  ],
  cutscenes: {
    before: 'c1_office_ultimatum',
    win: 'c1_wrong_finish_aftermath',
    loss: 'c1_fired',
  },
}
```

The final schema should reference existing character presets, AI profiles,
moves, heat, stamina, and match-ending events rather than duplicating them.

## AI difficulty as storytelling

Difficulty should express the relationship, not simply rise forever.

Potential controls:

- stamina and recovery advantage;
- grapple/counter windows;
- finish-hunting urgency;
- willingness to stall or leave the ring;
- target-body-part persistence;
- move-selection restrictions;
- knowledge of the player's repeated moves;
- aggression after losing a fall;
- rope awareness and referee exploitation;
- starting damage or fatigue;
- time-limit pressure;
- crowd response and comeback access.

The first three losses may use overt statistical inequality because oppression
is the intended experience. Later feuds should rely more on distinctive AI and
rules than on inflated numbers.

## Gameplay-twist library

Use these across feuds, always tied to story context:

- two out of three falls;
- short or long time limit;
- survive to the bell;
- win before a deadline;
- submission-only finish;
- pinfall-only finish;
- no count-out or no disqualification;
- injured limb carrying into the match;
- opponent targets a named body part;
- player forbidden from using a signature move;
- player required to unveil a new move;
- opponent counters the player's most-used move;
- hostile crowd or hometown crowd;
- referee biased, distracted, or slow to count;
- rope breaks limited or especially important;
- must generate a nearfall before the planned finish;
- must protect an opponent from an embarrassing result;
- consecutive matches with incomplete recovery;
- champion's advantage: title retained on draw or disqualification;
- rematch in which damage persists between falls.

Not every twist should alter formal rules. A strong behavioral difference can
carry a match if the opponent genuinely wrestles differently.

## Still-image cutscene format

Cutscenes should feel like illustrated pages from a lost wrestling magazine or
frames from an old televised serial. They can be emotionally strong without
full animation.

Recommended presentation:

- 16:10 composition consistent with the current 960 x 600 game canvas;
- restrained color for private narrative scenes and black-and-white for images
  explicitly presented as part of the television broadcast;
- one to four illustrated panels per scene;
- brief dialogue or caption blocks;
- subtle camera pan, push-in, parallax, film weave, or dissolve;
- persistent character and costume references;
- no generated text baked into the artwork—render dialogue in the game UI;
- optional crowd/arena ambience beneath the stills;
- scenes skippable after first viewing.

### Cutscene script template

```text
SCENE ID:
TITLE:
TRIGGER:
LOCATION / TIME:
PURPOSE:

CONTINUITY LOCKS:
- character appearance and costume
- injury state
- props and room geography
- lighting and period details

PANEL 1
Shot:
Action/expression:
Dialogue/caption:
Image-generation notes:

PANEL 2
Shot:
Action/expression:
Dialogue/caption:
Image-generation notes:

EXIT / TRANSITION:
STATE CHANGES:
ALTERNATE VERSION CONDITIONS:
```

### Image-generation production rule

When cutscene production begins, generate backgrounds and character reference
masters separately before composing final panels. Lock each character's face,
build, attire, palette, and era details. Use image generation for controlled
illustrated donors, then normalize continuity and lettering outside the model.

Every generated panel should record:

- scene and panel ID;
- prompt;
- input references and their roles;
- generation date/tool;
- continuity requirements;
- status: donor, Procreate, normalized, visual-approved, production;
- final file hash.

Do not ask the model to render final dialogue text. Keep lettering editable and
accessible in the game.

### Guido reference hierarchy

Build Guido's reusable reference package in this order:

1. **Full-body three-quarter identity master.** Establish the original face,
   age, hair, build, proportions, neutral gameplay stance, trunks, and boots.
   The pose must be readable for rig planning rather than a dramatic action
   illustration.
2. **Procreate normalization.** Correct anatomy, silhouette, facial decisions,
   linework, palette, and transparency before approving the identity. The
   generated image remains a donor until this pass is complete.
3. **High-resolution close-up master.** Derive a neutral head-and-shoulders
   image from the approved full-body identity. Add facial detail without
   redesigning the man. Normalize and approve it separately.
4. **Expression family.** Derive anger, pain, anxiety, defiance, relief, and
   exhaustion from the approved close-up. Expressions may move features but
   must not change their underlying shapes or spacing.
5. **Remaining body views and costumes.** Derive the views required by the rig
   and the approved street-clothes, robe, and injury variants without
   independently reinventing his face or physique.

For every later cutscene generation, use the approved close-up as the authority
for facial identity and the approved full-body master as the authority for
build and proportions. A costume reference and previous panel may be supplied
as secondary continuity inputs. Never use a previous generated panel as the
only Guido reference, and never use prose alone once the masters exist.

## Sample cutscene script: `c1_office_ultimatum`

**Title:** The Office  
**Trigger:** After successful completion of Match 3  
**Location/time:** Booker’s cramped arena office, late night  
**Purpose:** Change the player's understanding of the next match and establish
that the Booker may be testing or using them.

**Continuity locks:**

- Player still wears trunks beneath an open robe or towel; visible bruising
  reflects Match 3.
- Booker wears the same suit used in prior backstage scenes.
- Period desk, rotary telephone, paper booking ledger, smoke haze, one hard
  overhead light.
- No modern objects, logos, screens, or clothing.

**Panel 1**

- **Shot:** Wide doorway composition. Player stands just inside; Booker remains
  seated behind the desk, writing.
- **Text:** “Close the door.”
- **Image notes:** Player small in frame; office feels like a place where careers
  are decided cheaply.

**Panel 2**

- **Shot:** Medium two-shot across the desk. Booking ledger between them.
- **Text:**
  - BOOKER: “Three towns. Three losses.”
  - PLAYER: “That's what you asked for.”
- **Image notes:** Booker does not look up immediately.

**Panel 3**

- **Shot:** Close on Booker finally meeting the player's eyes.
- **Text:** “Tomorrow, go into business for yourself. Beat him.”
- **Image notes:** Expression unreadable, not melodramatically villainous.

**Panel 4**

- **Shot:** Close on player; swollen cheek, uncertain rather than triumphant.
- **Text:**
  - PLAYER: “Does he know?”
  - BOOKER, off-panel: “He knows he has a match.”
  - BOOKER, off-panel: “You lose, don't come back.”
- **Transition:** Hard cut to the next night's empty ring while the last sentence
  remains on screen.

## Failure and replay philosophy

The ultimatum restart is intentionally harsh, but it must respect the player's
time:

- previously seen scenes are skippable;
- tutorial text is abbreviated;
- match introductions shorten;
- learned opponent information remains visible to the player, even if formal
  character stats reset;
- the first three matches should be concise enough that replay creates pressure
  rather than exhaustion;
- difficulty tuning must ensure the fair fourth match is demanding but not a
  coin flip after the required replay investment.

Later chapters do not need to restart entirely on every failure. Use rematches,
branching bookings, reputation loss, injury, or a worse stipulation when those
create a better story.

## Questions to settle during the vertical slice

1. Is the protagonist fictional, player-created, or a real early-career
   wrestler?
2. Who is the House Favorite in Chapter 1?
3. Who is the Featured Heel, and is he historical or fictional?
4. Does winning a match while booked to lose create a supported branch, or is
   it treated as mission failure during the first release?
5. How visible are booking objectives during a match: explicit checklist,
   commentary hints, or pre-match instructions only?
6. Does the Booker genuinely support the player, use the player against the
   House Favorite, or remain ambiguous for several chapters?
7. What persists after the Match 4 chapter reset?
8. Which existing AI controls can produce the first three oppressive matches
   without creating impossible or visibly cheating behavior?
9. Can two-out-of-three-falls reuse the existing match state cleanly while
   preserving damage and resetting position between falls?
10. Which event-log signals already support performance goals such as nearfall,
    heat threshold, named finish, survival time, and move repetition?

## Initial implementation slice

Do not begin with a complete campaign engine. Prove this sequence:

1. one pre-match still scene;
2. one deliberately lopsided booked-loss match with performance goals;
3. one post-match result screen distinguishing match result from booking result;
4. the office ultimatum scene;
5. one mechanically fair must-win rematch;
6. chapter restart on loss with skippable scenes;
7. one aftermath scene on victory.

If that sequence is compelling, add the two-match Featured Heel feud and the
two-out-of-three-falls rematch. The campaign framework should grow from proven
story matches, just as the character-art inventory grows from moves that
actually need it.
