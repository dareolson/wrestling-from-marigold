# Cinematic Art and Motion Standard

**Status:** Initial production standard  
**Applies to:** Opening titles, story cutscenes, between-match scenes, and
non-interactive illustrated sequences  
**Runtime:** Phaser 4, 960 x 600, 16:10

## The style in one sentence

Treat every scene as a **carefully staged illustrated rostrum panel**: strong
still composition, restrained camera movement, modest layered depth, precise
sound, and only the character motion that has been explicitly drawn.

The goal is not to approximate conventional animation cheaply. It is to make a
repeatable visual language in which stillness feels intentional.

## Fixed visual language

Every cinematic donor should share these properties:

- clean hand-inked sports-illustration linework;
- confident tapered exterior contours and lighter internal detail;
- restrained flat painted shading rather than photorealistic rendering;
- warm, natural skin without glossy superhero highlights;
- controlled desaturated color in private scenes;
- black-and-white treatment only for explicit television-broadcast imagery;
- readable silhouettes at 960 x 600;
- period-authentic clothing, architecture, props, vehicles, and signage;
- no baked dialogue, captions, menus, or other final text;
- no vignette, aura, generalized rim glow, dense halftone, regular hatching,
  lens flare, chromatic aberration, or modern cinematic teal-orange grading.

## Character-reference rule

Once a character has approved masters, prose is no longer the authority for
their appearance. Every generation must include the relevant masters and state
their roles explicitly.

For Guido:

```text
close-up shot  → approved close-up master controls the face
medium shot    → close-up master controls face; medium master controls body
full shot      → close-up master controls face; full master controls body
new costume    → identity masters plus one approved costume plate
next panel     → canonical masters remain primary; prior panel is secondary
```

Never use the previous generated panel as the only character reference. Never
return to actor names or inspiration language after the original identity is
approved. The pictured Guido—not Danny LaRusso, Johnny Depp, or a prose blend—is
the authority now.

Each character prompt must lock:

- facial identity and apparent age;
- hairline, haircut, and facial-hair state;
- height, build, and relative head/body scale;
- costume appropriate to the exact campaign state;
- current injury, tape, bruising, and fatigue;
- camera side and direction of gaze;
- whether hands and feet must be visible;
- emotional state without redesigning facial anatomy.

## Shot families

Use three repeatable shot families. This reduces perspective drift between
generations.

### Close-up

- head and shoulders or upper chest;
- eye-level or only slightly below eye-level;
- normal-to-portrait perspective, never wide-angle facial distortion;
- approved face occupies enough frame area for identity to survive;
- default three-quarter view unless the script requires profile or straight-on;
- no cropped hairline, chin, or speaking character's mouth.

### Medium

- waist-up or mid-thigh-up;
- both hands visible whenever their action or tension matters;
- neutral perspective with no hand enlarged toward camera;
- full relationship among face, neck, shoulders, forearms, waist, and props;
- medium master controls physique even when the close-up makes the torso appear
  larger.

### Full

- complete figure or environment-dominant composition;
- moderate perspective with no fisheye or extreme low angle;
- feet visibly grounded;
- full-body master controls stature and silhouette;
- environment may dominate, but the face must still agree with the close-up
  authority when visible.

Reserve Dutch angles, extreme close-ups, overhead views, and strong wide-angle
distortion for exceptional story moments. They are not part of the baseline
language.

## Generation sequence

1. Generate or paint the **complete final composition** first, using approved
   character, location, costume, and style references.
2. Approve identity, pose, geography, period detail, lighting, and composition.
3. Normalize the accepted donor in Procreate.
4. Separate that approved composition into depth planes. Do not independently
   generate foreground, character, and background and hope their perspective
   agrees.
5. Paint or reconstruct only the hidden background pixels that a modest
   parallax move will expose.
6. Export registered PNG planes on identical 16:10 canvases.
7. Assemble and time the shot in Phaser.
8. Review at runtime size in both color and the relevant black-and-white
   treatment.

This order keeps generation responsible for the illustration and deterministic
tools responsible for timing, registration, text, and playback.

## Location continuity

Recurring locations need their own approved masters just as characters do.
For each location, lock:

- facade and room geometry;
- door, window, ring, aisle, and furniture positions;
- sign design and exact editable wording;
- primary color palette and material treatment;
- practical light locations and normal light direction;
- time of day, season, weather, and campaign-date exceptions;
- camera map showing which directions have approved views.

For the opening, establish one Marigold exterior master before generating bus,
reveal, and entrance shots. Later images use crops or derived angles from that
same building design rather than inventing a new facade each time.

## Motion budget

Every shot receives at most:

- **one primary move:** pan, push, pull, foreground wipe, or discrete state
  change;
- **one low-amplitude atmosphere behavior:** haze, exhaust, bulb variation, or
  distant silhouette;
- **one optional authored character event:** blink, hand state, head state, or
  door/step pose, only when a second drawing exists.

Most shots should omit the optional character event. A shot with a bus wipe
does not also need a zoom, a rack focus, moving haze, blinking bulbs, and a
character blink.

Baseline limits:

| Technique | Normal limit |
| --- | ---: |
| Close-up push | 3–5% scale |
| Other push/pull | 3–6% scale |
| Pan across oversized art | 8–12% frame width |
| Active depth planes | 2–3 |
| Major movement ideas | 1 per shot |
| Character state changes | 0–1 |
| Natural blink | 0–1, close-ups only |
| Hold before/after a key line | at least 1 second |

Stop camera movement during important dialogue whenever possible. If a shot
feels lifeless, improve its framing, duration, or sound before adding motion.

## Parallax rules

- Two planes are the default: subject/foreground and environment.
- Three planes are the normal maximum: foreground occlusion, subject/midground,
  and background.
- Keep relative movement subtle. The foreground may travel roughly two to
  three times farther than the background, not ten times farther.
- Do not independently bob layers vertically.
- Preserve a common horizon and vanishing logic across all planes.
- Never expose unpainted holes around hair, hands, clothing, or props.
- Do not separate every object merely because it can be separated.
- During dialogue, parallax normally comes only from a very small camera push.

## Depth-of-field standard

Depth of field is allowed, but only in three named modes:

### `deep`

Everything remains readable and essentially sharp. Use for establishing shots,
location geography, handbills, and scenes where the environment carries story.

### `character-focus`

The speaking or observed character stays completely sharp. The background has
one mild, baked blur level. Edges and recognizable period details remain
legible; the background should not dissolve into abstract bokeh.

### `foreground-occlusion`

The character and story environment remain sharp or nearly sharp. One close
foreground object—door edge, passing patron, bus body, rope, or post—has a
stronger baked blur and may motivate a wipe or cut.

Rules:

- use `deep` by default;
- use no more than one noticeably blurred plane in an ordinary shot;
- never blur the approved character master to manufacture focus;
- no animated focus racks in the baseline style;
- no round digital bokeh particles, tilt-shift look, or miniature effect;
- blur must not hide incorrect art, bad mattes, or missing period detail;
- keep eyes and facial ink perfectly crisp in close and medium shots.

The current Phaser version exposes blur as a camera-wide effect rather than a
per-image filter. Therefore, depth-of-field blur should be baked
non-destructively into duplicate Procreate layers before PNG export. Keep the
sharp source layer in the PSD so the amount can be revised. Do not blur the
whole Phaser camera, because that also softens the character, text, and UI.

## Light and atmosphere budget

- One motivated key light per composition: marquee, corridor fixture, window,
  overhead arena lamp, or daylight.
- One restrained fill family to preserve readable faces and clothing.
- A practical light may create a localized halo in the air, but characters do
  not carry a generalized glow around their silhouettes.
- Haze, dust, smoke, or exhaust appears only when the location supports it.
- Atmosphere is a broad low-opacity plane, not a field of decorative particles.
- Skin highlights remain painted and stable; do not animate them independently.

## Prompt header for every cinematic image

```text
Use case: illustration-story
Asset type: Wrestling from Marigold cinematic donor
Scene / shot ID: <exact ID>
Shot family: <close-up | medium | full>
Identity references: <files and exact authority roles>
Location reference: <approved master and camera direction>
Campaign continuity: <date, costume, injury, tape, weather>
Composition: <framing and subject placement>
Focus mode: <deep | character-focus | foreground-occlusion>
Primary light: <one motivated source>
Motion preparation: <planes and maximum move>
Style lock: hand-inked sports illustration, restrained flat shading,
  desaturated story color, 16:10
Text: none baked into art
Constraints: <shot-specific invariants>
Avoid: identity drift, actor likeness, photorealism, modern objects, aura,
  excessive blur, excessive parallax, extra figures or props
```

## Shot manifest

Every produced shot records:

```text
sceneId
shotId
version
sourcePrompt
identityReferences[]
locationReference
costumeState
injuryState
dateAndWeather
shotFamily
focusMode
primaryLight
exportedPlanes[]
runtimeMove
audioCues[]
reviewStatus
finalHashes[]
```

Allowed review statuses:

```text
donor → normalized → identity-approved → motion-approved → production
```

## Consistency review gate

Before a shot becomes production art, verify:

- face matches the approved close-up at runtime size;
- body matches the correct medium or full master;
- age, hair, clean-shaven state, costume, and taped wrist are correct;
- no generated text or illegible pseudo-lettering remains;
- location geometry agrees with its master;
- date, transit, vehicle, weather, and clothing details are plausible;
- light comes from the documented source;
- focus mode is one of the three approved modes;
- parallax reveals no holes or edge fringes;
- motion stays within the shot budget;
- the image remains readable after the broadcast grayscale treatment when that
  treatment applies;
- dialogue and UI remain separate and accessible.

## Anti-excess rule

The sequence has gone too far if the viewer notices the parallax before the
character, the blur before the location, or the camera move before the line.
Stillness is the baseline. Movement earns attention only when it reveals,
conceals, separates, or transitions something meaningful.
