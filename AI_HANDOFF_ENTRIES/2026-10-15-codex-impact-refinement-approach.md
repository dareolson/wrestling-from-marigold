# Codex — audit of the refinement approach: impact and personality

2026-10-15. Derek wants the existing moves to hit hard and look cool. This is
an audit and revised refinement brief, not an implementation change. Reviewed
the current suplex v2, staging method, render path, gameplay aftermath and audio.
An isolated snapshot was used so Claude's working files remained untouched.

## Verdict

Keep the sparse paired-beat method. Suplex v2 is a meaningful improvement in
mechanics and readability. Now give the process a separate performance pass:
body acting, timing contrast, receiver selling, audible contact and aftermath.

Our current process can produce a correctly connected move that still feels
light, rigid and emotionally blank. Stronger impact will come from a readable
chain of effort and consequence, not from tightening grip coordinates alone.
Make rollout depend on an approved full-speed pilot rather than a fixed number
of revision rounds.

## Evidence that changes the next priorities

### 1. Authored lean does not currently render

The suplex generator describes Lou leaning into the load and back under the
weight, and writes `pose.lean` at those beats. Wrestler passes a calculated lean
to Skeleton, but `_updateUprightCore` does not use that argument to place the
body. Its torso remains vertical until the rigid whole-body tilt turns it.

I tested the actual editor rig at the .76s suplex pose: changing lean from 0
to .6 produced **identical final transforms for all 10 visible parts**. A .3rad
whole-body tilt changed the transforms, confirming the probe can see motion.
Evidence: `research/animation/impact-approach-2026-10-15/lean-probe.json`.

Some intended performance is therefore absent from the image regardless of
how carefully the generator authors that number. Fix the capability before
spending more time tuning it. The old screen-space shoulder/head offset was
removed because it detached the body; do not restore that shortcut.

Provide a small actual torso/chest rotation with shoulder and neck attachments
derived from the same transformed sockets, separate from whole-body tilt.
Preserve elbow/knee attachment and supporting feet. Introduce it explicitly on
the pilot first: blindly activating every historical lean value would change
many already-authored moves. A dedicated pose channel is a reasonable migration
option. Verify that a changed acting channel changes the expected rendered
shape, while attachment tests still pass in both facings.

### 2. There is no dedicated body-impact sound path

The current audio code provides crowd murmur, crowd pops and the timekeeper's
bell. The paired throw's impact handler drains the defender and shakes the
camera. I found no distinct strike-contact or body-on-mat cue in this path.

That leaves a large perceptual gap: a heavy landing needs a brief, well-timed
body/mat transient. Add restrained, filtered foley appropriate to the illustrated
vintage broadcast: exertion on the lift, body contact, low mat thump, short canvas
or ring resonance. Let the crowd response follow the moment rather than substitute
for the landing itself. Audition levels at normal gameplay scale and volume;
keep jab, submission and suplex acoustically distinct.

Dispatch this from a confirmed gameplay impact, once. A presentation helper can
consume move/contact type without owning damage or eligibility. Seeking or
scrubbing must stay silent, and a cancelled pre-impact move must not play a hit.

### 3. Our quality review ends too early

Suplex ends in `_layOnBack`, which clears tilt/lift and switches to a generic
grounded pose. The later get-up is another render path. Those transfers can
erase a carefully staged landing or introduce a visible pop. The filmed match
contains a visibly awkward rising pose after the move, even though the suplex
event passes its scenario check.

Review the whole action: approach → move → contact → settle → down/sell → get-up
or next move. Include the second or two after the final clip key. A clean editor
ending is insufficient if the first gameplay frame afterward changes the body
orientation, footprint, limb shape or effort abruptly.

The known wrist/posture handoff defects remain separate from repaired joints.
No new limb translation or increased test budget should conceal them.

### 4. Improved grip metrics are useful, but not a complete performance score

Re-measured current suplex v2 at 60Hz:

- Near-hand/neck maximum gap: 5.5% of first-frame body height.
- Far-hand/trunks maximum gap: 7.9% over the declared hook-to-drive interval.
- Attacker foot-slide proxy: 82px worst span; defender entry: 68.6px.
- Both torso landings align with the 1.30s event in the editor measurement.
- The normal-speed keyboard gameplay scenario logs the suplex successfully.

The torso overlap/floor/velocity measures remain diagnostic proxies. A fast
strike is not defective just because it exceeds a frame-displacement threshold,
and intended close grappling is not automatically invalid interpenetration.

The far-hand metric now covers .22–.58s, whereas the earlier critic checked
the hip much longer, including inversion. The choreography intentionally moves
the hand to the lower back. Therefore the old 38% versus new 7.9% figure is not
a like-for-like score over an unchanged target and interval. Add a measured
back-grip target for the inverted phase so the whole support path is visible
to the critic; do not let the important lift become ungraded.

The numerical spine-turn measure mostly records rigid body rotation. It does
not establish torso bend, twist, muscle effort or emotional expression.

## Give each existing pilot a performance intention

| Move | What the player should feel | Performance to author |
|---|---|---|
| Jab | A sudden, sharp interruption | Small shoulder lead, closed fist, decisive contact, head reaction beginning at contact, chest/guard following, quick recovery |
| Hammerlock | Control tightening into discomfort | Visible purchase, a braced crank, defender trying to straighten, shoulder/torso counter-turn, purposeful free-hand reach, pressure then partial relief |
| Suplex | Effort, a moment of suspense, a heavy crash | Clear load, committed leg drive, briefly balanced lift, accelerating fall, paired compression, delayed arms/legs settling and an exhausted release |
| Dropkick | Explosive horizontal contact with a cost to the attacker | Compact gather, leg snap, boot/chest contact at the right height, chest recoil through the receiver, attacker folding into a believable landing |

Lou should look economical and authoritative. George can resist and sell more
theatrically within the established characterization. Use distinct expressions
and purposeful asymmetry: maximal pain for an entire clip, identical flailing
arms, or a constant grimace gives the action no contrast.

## Revised production method

### Pass A — mechanics and silhouette

Continue the successful order: paired beats → body placement → support → hands.
At every important beat, make the load path readable: mat to supporting feet,
legs to hips, torso to grip, grip to the opponent. Give George an actual entry
step rather than freezing or translating both feet. Preserve the 3/4 art and
the approved proportions; the accepted George shin-length tradeoff is not
being reopened here.

Mark the three important silhouettes per move: loaded, committed, consequence.
They should read at the actual game scale with no handles or reference sprites.
Do not freeze all four feet throughout a maneuver. Declare which foot supports
weight, when a step happens, and when the body intentionally leaves the mat.

### Pass B — performance and rhythm

After actual torso acting works, exaggerate the readable shapes modestly. Use
hips/shoulders opposing each other, a tucked head, an effort face, a delayed
free arm and a controlled release. Keep the grip and support requirements active.

Tune motion across phases, not independent ease-in/ease-out stops at every key.
Preserve velocity through a continuous lift or fall, hold only where suspense
is intended, and give landing compression a shorter, sharper rhythm than recovery.
Keep the pose curves and IK branch continuous between the keys.

At contact, audition a short authored compression/hold lasting roughly 2–3
60Hz frames, followed by asymmetric settling. This is an audition range, not a
new universal move timing. Keep the gameplay impact marker aligned and applied
once. A runtime pause would require one coordinated clock for both bodies and
their travel; an authored pose beat is the smaller first experiment.

### Pass C — presentation

Add contact-specific foley and an appropriately delayed crowd response. Use a
small directional camera response for the heavy landing, and reserve the largest
response for the strongest existing moves. A submission squeeze should read
mainly through body tension, exertion and reaction rather than repeated global
screen shake.

A brief local mat-shadow compression or restrained ring response may support
the landing once its geometry and timing read. Avoid effects that obscure the
illustration or make every move equally loud.

### Pass D — targeted art

Generate/draw replacements only for approved poses that the existing pieces
cannot express: a closed fist or gripping forearm, effort/strain heads, arched
attacker torso, folded/inverted defender torso and landing compression donor.
Keep identity, scale, lighting and anchors registered. Match torso sockets and
pelvis layers explicitly when the silhouette changes.

A few painted extreme shapes with rigged in-betweens should restore volume
better than ever denser angular keys on a single upright torso. Preview donors
in the move itself before expanding the art batch. This is not a new full-body
generation or replacement-character campaign.

### Pass E — full gameplay approval

Watch a short before/after sequence at normal speed, muted first and then with
sound. Include entry, impact, full aftermath and the next action. Test both role
orders and facings and different ring scales. Check successful contact, a miss
where applicable and an interruption. Keep mechanical/coverage tests as gates.

Approval asks: can the player see who exerted force, where it went, which body
part contacted, and what that cost both wrestlers? Does the move have a memorable
rhythm and silhouette? Does the camera/audio confirm the same contact frame?
Numbers cannot answer those questions alone.

## Concrete next slice

Keep suplex v2 as the baseline. First prove actual torso acting without breaking
attachments. Then make one revised suplex with a visible load and back arch,
deliberate landing arms/compression, a matched grounded handoff and one body/mat
sound cue. Keep damage/eligibility separate from presentation. Compare it at
normal speed in both role orders before moving that method to the other pilots.

Jab's next small task remains named fist/face contact plus shoulder lead and
recoil, preserving its .083s damage beat. Dropkick's disputed reach can be
prototyped as a separate comparison without silently changing live balance.
Preserve Derek's hammerlock draft; any acting pass should be a separate candidate.

The shared code was not modified by this audit. Evidence is under
`research/animation/impact-approach-2026-10-15/`: source hashes, lean probe,
current suplex critic output, clean key poses and actual gameplay captures.
The gameplay scenario pass establishes that the move executes, not that all
the proposed visual/performance work is complete.
