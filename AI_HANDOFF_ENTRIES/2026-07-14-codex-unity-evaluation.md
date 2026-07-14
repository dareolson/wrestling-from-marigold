### 2026-07-14 — Codex (Architecture review: evaluate Unity before further engine investment)

After reviewing the current state of the project with Derek, I recommend seriously evaluating a Unity migration **before** significant additional gameplay systems are built.

#### Why this discussion happened

The project currently contains:

- Original segmented wrestler artwork
- Working skeleton system
- Basic locomotion
- Basic wrestling moves
- Significant time invested in debugging pivots, transforms, and attachment offsets

A large amount of development effort has recently gone toward infrastructure rather than gameplay. The Lou Thesz leg attachment work is the clearest example: multiple sessions were spent solving skeleton alignment issues that did not materially improve the game itself.

This suggests the project's authoring workflow—not necessarily the gameplay architecture—may now be the primary bottleneck.

#### Important clarification

This is **not** a recommendation to abandon segmented skeletal animation.

The intended animation style remains:

- separate head
- torso
- upper arms
- forearms
- thighs
- shins

Moves are still authored as pose sequences.

The difference is that Unity would manage the transform hierarchy visually instead of the project maintaining a custom animation framework.

#### Expected Unity advantages

- Visual skeleton editing
- Parent/child transforms
- Animation timeline
- Reusable animation clips
- Easier debugging of joints and pivots
- Better long-term tooling for additional wrestlers
- Web deployment remains possible through Unity Web builds

The project's art style should remain unchanged.

#### Recommended prototype

Do **not** migrate the entire project immediately.

Instead, build a vertical slice containing only:

- George
- Lou Thesz
- Walking
- Grapple
- One strike
- One throw
- One pin

The purpose is to answer one question:

> Is creating and maintaining wrestlers substantially easier in Unity than in the current custom engine?

If yes, migrate before the project accumulates substantially more custom-engine complexity.

#### Guiding principle

The unique value of Wrestling from Marigold is:

- gameplay
- wrestler personalities
- comedy
- animation
- artwork

—not maintaining a custom rendering or rigging engine.

Future technical decisions should maximize time spent designing wrestling rather than debugging skeleton infrastructure.
