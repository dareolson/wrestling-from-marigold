# Ideas parking lot

Derek's ideas that came up mid-plan, written down so they aren't lost and don't sidetrack the active plan.
Each becomes a PLAN_*.md only when Derek picks it up. Newest first.

## Sell button: selling is how you recover stamina (2026-10-31)

Derek: part of the match-escalation design (see MOVE_CATALOG.md 2b). Plan it, don't build it yet.
Today stamina recovers passively (`STAMINA_RECOVER`, 6/s while standing, `Wrestler.js`); the HUD already has stamina bars.
The idea: recovery has to be earned by selling.
- **A "sell" button.** Hold it while down after a knockdown and you stay on the mat with stamina rising fast.
  Not holding it means you get up on the normal get-up timing.
- **Optional rests on your feet:** lean against the ropes, or take a knee, to regain stamina (slower than selling down;
  leaves you open to a strike).
- Passive standing recovery then drops or goes away, so the opening spends stamina and only selling refills it.
Open questions for when it's picked up: how fast the hold recovers, what the opponent can do to a wrestler who stays
down (ties to "Punishable fatigue stall" below and the pin/kickout logic), whether the AI sells on its own, and the
rope-lean and take-a-knee poses (new art or rig poses). Touches `Wrestler.js` stamina, the get-up library
(PLAN_GETUPS) and `moveDecision.js`.

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

## PROGRESS.md: document how the game got made (2026-10-30)

Derek's idea, banked, not started. A simple timeline: date, what changed, a before/after clip, and his note on what was wrong.
- Rebuild the old versions from git (579 commits back to May) in a separate worktree; pick 8-12 milestones, recorded at the same
  camera and length. July onward should run; May-June may need fixes. Not test-run yet.
- Many captured frames are in `.git/info/exclude`, so they exist only on this Mac (G1 and G1b strips included). Copy keepers to an
  external drive before any disk cleanup.
- From now on, save one normal-speed clip at each approval.

## Front snapmare (Derek 2026-11-05)

A snapmare from the front can work, but needs its own entry: head/neck control, a turn or step into position, a planted base and a
forward pull before the flip. Don't run the rear-reversal clip from face-to-face spacing. See
[Codex's note](AI_HANDOFF_ENTRIES/2026-11-05-codex-snapmare-preview-correction.md).

## Wrestler personality through movement (Derek 2026-11-06, plan after the finisher G1)

- A personality sheet per wrestler: walk, idle, taunt, crowd play, hero pose, how he sells, one signature quirk. Lou and George
  first; Ricky Starr (ballet) when his rig exists.
- Sources: Mixamo (free, royalty-free) and CMU mocap for the bulk; Bandai Namco style dataset for study only (non-commercial);
  Muybridge plates (public domain, side views, wrestling); period footage (Kohler DuMont kinescopes, Pathé/AP newsreels, Starr's
  World of Sport clips) to watch; Derek acting signature bits on video.
- Tools (Codex): a BVH/FBX importer that projects mocap to the side view as move-editor keyposes, first; later video pose tracking
  (MediaPipe) with a skeleton overlay, which doubles as content footage.
- Shooting: tripod at hip height, Derek at Lou's three-quarter turn, movement across the frame, 60 fps (120-240 for fast moves), a
  second phone from the front for the far limbs.
- Rig limits to plan around: no wrist bend (hands are swapped art), no fingers, no head turn found, no face, no shoulder/hip twist,
  facing only flips (spins are faked), fixed feet, knees clamped. Signature bits that live there become narrow art requests (a
  pointing hand, an open ballet hand, a relevé foot). One art list per wrestler.
- Content series: "acting out every finisher", "the ballet wrestler", side-by-side of Derek / skeleton / game.
