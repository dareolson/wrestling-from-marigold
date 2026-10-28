# Ideas parking lot

Derek's ideas that came up mid-plan, written down so they aren't lost and don't sidetrack the active plan.
Each becomes a PLAN_*.md only when Derek picks it up. Newest first.

## Top-light shading on the bodies (2026-10-27)

Derek: "is there anyway to create shadows on our art that mimic top lighting ... I purposefully didn't shade them because the
light would be changing, but if they were facing down ... they would be in shadow".
The art stays unshaded. The shading is computed at draw time from the pose, so it follows the light, not the painting.
Options, cheapest first:
- **Underside darkening by offset silhouette.** Copy the wrestler's silhouette, shift it a few px toward the light (up), and
  darken whatever part of the body the shifted copy doesn't cover: the lower edge of every part. Works in any pose (standing:
  under the chin, pecs and trunks; lying: the whole side against the mat). One filter per wrestler.
- **Per-part tone by facing.** Each part darkens a little by how far its painted "front" points away from the light (a lying
  wrestler face down is darker than face up; a raised forearm's underside is darker). Cheap tint per part per frame.
- **Contact shadows.** Soft dark where the body meets the mat or the other wrestler (the drop shadow already exists under feet).
- **Normal maps + Phaser 4 lights** (`ImageLight`, `NormalTools` filters). The most real, but every part needs a painted or
  generated normal map. Ties into the arena lighting experiment (ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md, round 4 not approved).
Start with the first on Lou, both facings, standing and lying, 3 strengths, Derek judges.

## Motion smears for fast moves (2026-10-27)

Derek: "should we try motion blur during quick movements ... some effects might sell it even more".
Three options for one move (jab or front kick first, no masks or grip art involved), side by side:
- Phaser 4 `Blur` filter on the fast part (risk: reads as video blur on ink art);
- **smear**: the fast part stretched along its motion for 1-2 frames (period cartoon technique; Opus's pick);
- afterimages: 2-4 fading copies of the fast part.
Only above a speed threshold, per move, behind a flag; Derek judges other work with it off.

## Bendable limbs (2026-10-27)

Derek: "will we ever be able to use a mesh or similar concept to make the limbs more forgiving".
- Phaser 4.1 has no Mesh object but has `Rope` (a texture bent along a list of points): one continuous painted leg bent at the
  knee, no seam. Costs: one-piece leg art per rig, muscle shapes stretch on the inner bend, the rig's anchors / variants /
  masks are built around separate Images. Pilot: one leg on Lou.
- Middle option with today's tools: Codex paints a bent-knee thigh/shin variant, swapped in past a flex threshold
  (the `partVariants` system George's grip uses).

## Punishable fatigue stall (2026-10-27)

PLAN_GETUPS D8 stall is look-only this round. Later: the opponent can punish it (a kick to the ribs, a front facelock).
