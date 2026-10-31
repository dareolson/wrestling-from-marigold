# Grapples Stage 1c, G1c: legs through every phase and every exit

2026-10-31 · Claude (Sonnet 5.5, running T1.13-T1.14) · local commits only, nothing pushed. Plan: [PLAN_GRAPPLES.md](../PLAN_GRAPPLES.md).
Page: [g1c/index.html](../research/animation/grapples-2026-10/g1c/index.html) (frames local, `.git/info/exclude`). Derek judges every look; the numbers are proxies.

## Misses first
- **Lou's planted sole, 1.5-1.9 px off idle (limit 1.5).** Lou attacking: engage 1.53 (f11 far), drive 1.91 (f82 near); after a steal 1.61 and 1.87; in the stall 1.87. Lou defending after George steals: 1.8. George never misses it. Not tuned; the stance was accepted with it.
- **D12 body overlap (leg/pelvis, masked every third frame).** Engage: Lou attacking 15-17 px, George attacking 121 (G1b 82-169 and 286-368). Break: Lou attacking 34-54, George attacking 107-147 (G1b 21-139).
- **George-attacker collar hand 8.99 px, 2 frames** (G1b 7.2-9.3). D12 / D13 beat the contact.
- **The break trade I chose.** The torso now comes up over 0.22 s, the arms still go in 0.16 s. Worst hip step 0.171 -> 0.090 rad/frame. At 0.30 s the step is 0.04-0.06 but the break overlap reaches 211 px; at 0.16 s (same ramp, single-smoothed) it is 0.121 and the overlap 2-183. `LOCKUP.breakBendRelease` is the one number if Derek wants it the other way.
- **Trunks at break f102** (Lou defending a shove, george-lou): 12.27 points at G1b, 5.86 now. Limit 10. It passes, and it is the largest trunks value anywhere in G1c (worst elsewhere 5.61 in the steal's break). The G1c-a page left the G1b misses out; this page has a "G1b misses that now pass" list.
- Not checked: a move that starts inside the break's 220 ms settle. It now drops the shins (`_dropLockupShins` when the state leaves 'standing'), but no run starts a move in that window.

## Found and fixed
- **Leg layers (Derek, Lou).** The grapple's layer order listed arms, torsos and heads only, so the torso stack moved to the bottom of the band while the legs stayed in theirs: Lou's far thigh and shin drew in front of his own torso (24.0001 vs torso 24.00006), and George's legs sat over everything. Each body is now far leg, torso, head, near leg (Arena `_holdLockupGrips`); the near leg over the trunks is Derek's old rule. A rig with `pelvisMask` would now draw the near leg over it (neither rig has one). New `grapples_assert` check: far leg behind its torso, near leg in front, one body behind the other, both rigs, both facings.
- **Exits.** Headlock, whip and arm drag inherited the lockup's absolute `lShin`/`rShin` (-0.31 / -0.39 stayed on the pose for the whole move, both men, both rigs). Arena now drops them at the exit, and `exitBlendPose` eases a missing shin to the crouch-path shin (leg - .75 crouch), not to 0. 24 exit runs (every move, both rigs, both facings): none left at the exit frame or 6 frames later. A leftover at +120 on Lou's bodySlam and hipToss is the move's own clip.
- **Hip snap.** `releaseBend` (new) drives the torso on its own ramp; the shove's stumble lean had been double-smoothed and is now single.

## Measured (flag on; cases a, steal, stall and rope break, shove; both pairs, both facings)
Knee line, ankle stagger, knee stagger: 0 misses in any phase. Trunks max 5.86 points. Planted slide max 1.49 px/frame. Hip step max 0.090 (break); knee-line step <= 1.04. Ankle daylight 42.5-46.7. G1b leg measures exist for case a only (definitions unchanged since T1.11).

## Chosen values
`LOCKUP_POSES` shin keys as at G1c-a (lead -.20/-.25/-.15, leadShin -.10, rear .10/.05/.15, rearShin -.40), `legGain` 1.086 x thigh+shin, `breakRelease` .16, `breakBendRelease` .22.

## Open for Derek (from the run entry, asked again)
1. Is 1.4 s right? 2. Which hands fail as art (Stage 2 needs this list)? 3. Layering order: the legs are in the order now, so judge it again. 4. Far hand on the forearm: keep? 5. Stage 4 order for the rest. Also: 6. keep the 0.22 s torso release, or trade snap for overlap the other way?

## Gates at G1c
Focused: lockup 22/22. `grapples_assert` all passed (rendered leg, layer and exit checks added). Flag-off identical over 60 frames. Full suite 1060/1060, `npm run build`, `moves:coverage --check` (22 baselined gaps). Tools: `grapples_legs_phases.mjs`, `grapples_g1c_page.mjs`; `grapples_film.mjs` takes `WFM_COLS=new`.
