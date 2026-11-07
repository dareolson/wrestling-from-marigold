# For Opus: carnival first match and steelworker origin

2026-10-31 · Codex, recording Derek's new story direction and visual development.

Read [STORY_CARNIVAL_OPENING.md](../STORY_CARNIVAL_OPENING.md) before extending the old arrival script. Derek wants Guido as a striking steelworker rather than a bricklayer: overdue rent, landlord suggests crossing the line, girlfriend upset, a walk leads to a $100 carnival wrestling challenge. This is the **first playable match**, won by Guido. Carl notices him afterward, offers an opportunity, Guido refuses, Carl says he has money. The professional Marigold career follows.

The brief separates user direction from proposed dialogue, failure handling, technical approach and unresolved continuity. Particularly: the carnival champion is distinct from the later obnoxious heel; the carnival win does not trigger Lou punishment. Naming recommendation is to keep Guido through his first professional match, then use the established Kohler rename; Derek has not yet confirmed this exception to the old “first match only” wording.

Art candidates saved in [carnival-opening-2026-10-31](../research/art/carnival-opening-2026-10-31/manifest.json):

- [Ring concept](../research/art/carnival-opening-2026-10-31/carnival-ring-concept-v1.png): portable outdoor ring, small crowd, tents and bulbs, faded red apron, blank challenge sign. Flattened concept, not a playable layer set.
- [Champion profile v2](../research/art/carnival-opening-2026-10-31/carnival-champion-profile-v2.png): bald, handlebar moustache, barrel belly, mustard trunks/red boots. Derek found v1 tough-looking but too frontal and requested more profile like the roster. V2 addresses orientation; no final approval/rig certification presumed. Name remains open.

Use the existing Arena/Wrestler pipeline for a developer-selectable carnival prototype. Keep ring geometry stable initially, isolate venue rendering, prepare/certify new champion parts, then prove the victory/payout/Carl handoff. See brief for interruption-free result flow and replay safeguards. This is not a request to interrupt active grapple priorities or a completed gameplay implementation.

Updated current-opening notices at the top of both story documents. Existing illustrations and earlier decisions are retained as later professional-debut material where appropriate. Validation: `git diff --check`; no runtime code changes or test rerun for this art/docs pass.
