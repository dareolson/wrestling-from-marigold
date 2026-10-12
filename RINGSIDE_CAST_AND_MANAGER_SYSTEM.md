# Ringside Cast and Manager System

**Status:** Backburnered design proposal; not a current implementation priority
(Derek, 2026-08-04)  
**Purpose:** Allow managers and other named ringside characters to be selected,
positioned, mirrored, and eventually made wrestler-aware without hard-coding one
person into `Arena.create()`.

## Priority note

Manager switching was captured because it arose during arena ideation, not
because it should be implemented next. Do not schedule or bundle this system into
the active move work or the first arena-lighting experiment. Preserve this design
for a later focused session after the initial fixtures, mat light pool, and rope
shadows have been implemented, reviewed, and approved by Derek.

## Current state

Ed "Strangler" Lewis is currently defined as a unique named extra in
`src/scenes/Arena.js` and created unconditionally at approximately:

```text
x=850, display height=203, groundY=440, flip=false, depth=2.8
```

His eight frames and two intermittent animation cycles already use the generic
`_setupTwoAnimExtra()` / `_scheduleTwoAnimExtra()` machinery shared with the
announcer and bell-ringer. This is a useful rendering foundation, but manager
identity, allegiance, and placement are not yet data-driven.

## Goals

- Support no manager, a character's default manager, or an explicit override.
- Allow a manager on either side of the ring without generating duplicate art.
- Keep managers separate from the shuffled anonymous crowd.
- Preserve Ed Lewis's current approved appearance as the initial default for Lou.
- Make placement, scale, depth, and facing come from named ringside slots.
- Allow future managers to have different animation sets and reaction policies.
- Keep the first implementation cosmetic; gameplay interference is a later,
  separately designed feature.

## Non-goals for the first implementation

- Manager distractions, weapon passing, referee AI, or match-rule effects.
- Pathfinding around the ring.
- Managers entering the ring.
- A general cutscene or dialogue system.
- Replacing the existing crowd or ringside production characters.

## Manager manifest

Move manager identity and art behavior out of `Arena.create()` into a small
manifest. Illustrative shape:

```js
const MANAGERS = {
    stranglerLewis: {
        id: 'stranglerLewis',
        displayName: 'Ed "Strangler" Lewis',
        assetSlug: 'stranglerlewis',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        nativeFacing: 'left',
        animations: {
            call:  [1, 2, 3, 4],
            argue: [5, 6, 7, 8],
        },
        defaultScale: 1,
        reactions: {
            idle: ['call', 'argue'],
        },
    },
};
```

This example records the current Lewis behavior but should not require every
future manager to have exactly two four-frame animations. The runtime should be
able to accept named sequences of different lengths.

Manager art should retain one declared native facing. Placement decides whether
to mirror it. Do not create left/right copies of the same frames unless a real
asymmetrical prop or costume proves mirroring unacceptable.

## Character defaults and match overrides

A character may declare a default manager ID:

```js
thesz.defaultManager = 'stranglerLewis';
george.defaultManager = null;
```

The match configuration then resolves each corner independently:

```js
managerSelection: {
    p1: 'default',            // character default
    p2: null,                 // explicitly none
}
```

Supported values should eventually be:

- `'default'`: use the selected wrestler's default manager;
- a manager ID: explicit override, regardless of wrestler;
- `null`: no manager.

An initial debug seam can use query parameters before a selection UI exists:

```text
?p1Manager=default&p2Manager=none
?p1Manager=none&p2Manager=stranglerLewis
```

Unknown IDs should warn and fall back to no manager rather than crash match setup.

## Named ringside slots

Manager definitions should not contain screen coordinates. Put coordinates and
perspective behavior in named arena slots so the same manager can move around the
ring or appear in a future venue.

Suggested initial slots:

| Slot | Purpose | Starting treatment |
|---|---|---|
| `nearLeftManager` | manager beside the near-left corner | larger, faces right/inward |
| `nearRightManager` | manager beside the near-right corner | larger, faces left/inward; current Lewis neighborhood |
| `farLeftManager` | manager beyond the far-left corner | smaller, dimmer, behind far ropes |
| `farRightManager` | manager beyond the far-right corner | smaller, dimmer, behind far ropes |

Each arena slot owns:

```js
{
    x,
    groundY,
    displayHeight,
    depth,
    faceToward: 'ring',
    tint,
    lightZone,
}
```

`faceToward: 'ring'` should resolve `flipX` from the manager's declared native
facing and the slot's side. Step offsets and gesture direction must follow that
resolved facing rather than assuming positive screen X.

The current Lewis setup should become the first calibrated
`nearRightManager` slot, preserving its approved render before attempting a move.
The opposite near slot should be calibrated by mirrored screenshot comparison,
then adjusted only for genuine neighboring-character or ring-post collisions.

Far-side manager slots need their own smaller scale and depth; mirroring a near
slot's coordinates alone will not create correct perspective.

## Slot occupancy

Managers share ringside space with the photographer, policemen, announcer,
bell-ringer, posts, and foreground heads. Add a lightweight occupancy check when
building the ringside cast:

- production characters keep their authored slots;
- manager slots declare which production slots they conflict with;
- if the requested manager slot is occupied, use a defined fallback slot;
- if no valid fallback exists, omit the manager and log the reason;
- never silently stack two full-size named figures on top of one another.

This should be deterministic. It is a layout rule, not collision physics.

## Allegiance and reactions

Every manager instance binds to one wrestler role (`p1` or `p2`) and stores the
resolved wrestler reference. This lets future reactions distinguish:

- their wrestler attacking versus being attacked;
- their wrestler attempting or escaping a pin;
- their wrestler landing a signature move;
- their wrestler winning or losing;
- a neutral crowd-pop event that should not involve the manager.

The first implementation may preserve Lewis's current intermittent idle cycles.
The next presentation step can route selected existing match events into named
manager reactions. Do not make managers react identically to every general crowd
pop; their allegiance should be visible.

Animations need interruption and Scene-shutdown cleanup so switching matches or
restarting the Arena cannot leave a delayed frame callback targeting a removed
manager.

## Relationship to crowd shuffling

Managers are named cast, not anonymous seats:

- exclude them from the per-match crowd seed and design pool;
- keep their selected slot stable for the whole match;
- allow their idle-animation timing to use a separate deterministic presentation
  seed if exact replay is desired;
- shuffle anonymous audience members around them while respecting reserved space.

Changing the crowd seed must never change which manager was selected or move the
manager to another corner.

## Relationship to arena lighting

Each manager slot may declare a `lightZone` such as `nearLeftSpill`,
`nearRightSpill`, or `farCrowd`. This lets the lighting system apply appropriate
tint/exposure without putting character-specific lighting values in manager data.

A manager moved to the far side should naturally become smaller, softer, and
dimmer through the slot/arena treatment rather than requiring a second set of art.

## First implementation slice

1. Extract Lewis's definition into a manager manifest without changing pixels.
2. Create a ringside-slot manifest and encode the current Lewis placement as
   `nearRightManager`.
3. Add character default and match override resolution.
4. Support `default`, explicit manager ID, and `none` for both P1 and P2.
5. Add `nearLeftManager` and verify the same Lewis art on the opposite side.
6. Keep reactions cosmetic and preserve the current two intermittent cycles.
7. Add a debug query/config seam and screenshot grid for:
   - Lewis right;
   - Lewis left;
   - Lewis bound to P1;
   - Lewis bound to P2;
   - no manager;
   - two managers using distinct IDs once a second manager exists.
8. Preserve current behavior behind a default configuration until Derek approves
   both-side placement.

## Acceptance criteria

- Ed Lewis's default placement is pixel-equivalent before and after extraction.
- A manager can be selected independently for P1 and P2.
- `none` cleanly removes a manager without affecting other ringside cast.
- The same manager art faces into the ring from either side.
- Moving a manager does not require editing the manager definition.
- Named managers never enter the anonymous crowd shuffle.
- No manager overlaps a reserved production character or disappears behind the
  mat because of an invalid depth/position combination.
- Manager animations clean up on Scene shutdown and match reset.
- Invalid configuration fails safely and visibly in debug logs.
- The first implementation changes presentation only, not match outcomes.

## Later possibilities

- Wrestler-specific introductions with the manager visible.
- Manager reactions authored around signature moves and nearfalls.
- Heel/face behavior profiles.
- Manager selection in match setup.
- Venue-specific ringside slots.
- Carefully designed gameplay interactions, only after presentation behavior is
  stable and separately approved.
