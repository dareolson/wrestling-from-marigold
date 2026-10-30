# Handoff to the next Opus: get-ups closed, grapples next

2026-10-29 · Claude (Opus) · Derek asked for a handoff to a fresh Opus chat.

## How Derek wants to work (keep this)

- **Opus leads, Derek relays.** Write each task self-contained in a PLAN file and give Derek a short paste prompt for a
  separate Sonnet chat. **Do not launch subagents** (they burned tokens on 2026-10-28). Review Sonnet's commits when
  Derek says "he's done": read the diff and the Progress line, check the claims, report misses first.
- **Quantity over granular** (Derek 2026-10-29): once a system works and a strip is approved, don't add re-film or
  re-check stages; small measured misses go on a polish list, not a plan stage.
- Don't push unless asked. Another session is editing `STORY_*.md` and `research/story/`: keep those out of commits.

## What closed tonight (PLAN_GETUPS.md)

- T4.2 19ab04f: the 35-63 px standing step was the separation snap with a busy opponent; eased for 250 ms (approved).
- T4.3 cc01585: grounded knee clamped at straight in `_applyGrounded` (Derek's "gumby legs"; approved, no bend).
- G3 passed without a re-film; T4.4 6bfb66c **promoted `getups` to default** (`?getups=off` = legacy). Suite 1035/1035,
  build, coverage 22. Stage 5 (George re-check) parked; George leftovers go on a polish list.
- Unpushed since `178d79b` (all reviewed). Derek hasn't asked to push yet.

## What's next: Derek wants grapples to read (who grabbed whom, who is dominant)

Derek: "a few things that bug me first, and one is the grappling system; might require new limbs from Codex; deep dive
into making the grapples look good; we need to know who grabbed who, who is dominant." He has not yet listed the other
things that bug him: ask.

### Findings (Opus, from code and one forced live frame)

- **Symmetric pose.** Both wrestlers tween to the same `lockup` pose (`src/Wrestler.js` ~278: arms 1.57 rad straight
  out, lean .26). Frame: [lockup-now.png](../research/animation/grapples-2026-10/lockup-now.png): arms horizontal,
  hands meet in the air, nobody touches a body. Reads as patty-cake, not collar-and-elbow.
- **Roles exist but nothing shows them.** `Arena.lockupState = { attacker, defender, timer }` (`src/scenes/Arena.js`
  ~3433). The defender's steal (`justDown('action')`, ~3701) swaps roles and re-tweens the **same** pose: no visible change.
  `_tickLockup` (~3668) holds the pair at a fixed 100·s gap around their midpoint: no drive, no ring travel.
- **Short.** Timeout 0.8 s; AI decides after 0.15-0.45 s (`AIHandler._lockupBeat`). Follow-ups from `_tickLockup`:
  headlock (down), suplex (up), whip (left/right), slam/piledriver, hip toss / arm drag (power), hammerlock (finisher).
- Entry is `Wrestler.tryAction` (~1398): standing or fresh-staggered opponent → both `state = 'lockup'`.
- Reproduce the frame: `research/animation/grapples-2026-10/lockup_shot.mjs <out.png>` with `WFM_URL`, `WFM_P1`,
  `WFM_QS=notitle=1` (it sleeps the loop, nulls `_p1AI/_p2AI`, forces the lockup and steps 18 frames).

### Proposal given to Derek (not yet approved; nothing written into a plan)

What should read, by payoff: (1) the grabber arrives first: attacker steps in, hands land a few frames before the
defender's; (2) hands on bodies: collar-and-elbow, one hand behind the neck, one on the elbow, via the existing reach
IK (`Skeleton.solveReachArm`, world hand targets from the get-ups) aimed at the opponent's `jointAttachmentPoints`;
(3) dominant is lower and driving, defender upright, chin up, giving ground; (4) **the pair travels toward the
defender's side** (likely the strongest read at distance); (5) a steal is a visible shove that flips the drive.

Proposed PLAN_GRAPPLES.md: Stage 1 attacker/defender poses + IK contacts + drive with travel, behind a flag, Lou
(`thesz-procreate-v1`) + George, both facings, existing art → **G1** loop strip (even / attacker driving / steal),
Derek names the hands that fail → then a precise Codex art request (likely: hand gripping the back of a neck,
partly hidden; hand cupping an elbow; Lou's sellart grip may cover some). Stage 2: Codex art + steal as shove.
Stage 3: lockup → headlock / whip / suplex entries start from the new pose.

### Open questions for Derek (asked, unanswered)

1. Make the lockup last longer so it reads (1.2-1.5 s with a visible struggle)? It changes how the game plays.
2. What are the other things that bug him, and in what order?
