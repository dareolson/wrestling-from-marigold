# Figure-four tableau ledger (plan T1.1)

2026-10-22 · Claude (Sonnet) · docs only. Source of truth for T1.2 (locked draft),
T2.4 (`layers`) and the T3 critic spec. Times are clip seconds of the live 4.1 s
`figureFour` (`AT` in `author_figurefour.mjs`): purchase 0.95, fall 1.30, locked
1.60–3.40 (squeezes at 2.0, 2.6, 3.2), release 3.40, sit-up 3.75, up 4.10.
The T1.2 tableau is the locked beat only, so its own clock is 0–1.0 s and maps to
1.60–3.40 here.

Decision 1 (Derek, 2026-10-22): classic Flair. **The leg George grabs at purchase is
the hurt leg**; the receiver protects it afterwards.

## Naming rule

Legs are named by **pose channel** (`lLeg`/`rLeg`), the same limb in every facing and
on every rig. The render slot (`near`/`far`) comes from `Skeleton.lChannelSide(facing)`.
George is the attacker, facing right, in the baseline cast; the receiver lies on
his back with his feet toward George and faces left.

### Slot table, measured on the art

Method: render one actor with only `lLeg` (then only `rLeg`) raised to 1.0 and see
which painted ankle moves (a throwaway editor probe using `renderActor`, 2026-10-22).
It agrees with `lChannelSide` in all six cases.

| Rig | facing right | facing left |
|---|---|---|
| `george` | lLeg = **near**, rLeg = far | lLeg = **far**, rLeg = near |
| `thesz-procreate-v1` | lLeg = near, rLeg = far | lLeg = **near**, rLeg = far |
| `george-roster-v1`, `thesz-roster-v1` (measured in T2.4) | lLeg = near, rLeg = far | lLeg = **near**, rLeg = far |

So with the baseline cast George-as-attacker (facing right) has lLeg = near, and
Procreate Lou-as-receiver (facing left) has lLeg = near too. Legacy George facing
left has lLeg on the **far** slot; the roster rigs, like Procreate, keep it near. That is why the crossing can't be
left to slot depth: it must be a declared chain. (Two rigs flip the slot with
facing, three don't, so a chain written by slot would be wrong on some cast.)

## The four legs — v1, SUPERSEDED by v2 below

| Name | Who | Channel | Role in the hold |
|---|---|---|---|
| **S**, straight leg | receiver | `rLeg` | Extended toward George. **The hurt leg.** Grabbed at purchase. |
| **C**, crossed leg | receiver | `lLeg` | Bent, ankle tucked across George's trapping shin: the bar of the "4". |
| **T**, trapping leg | George | `lLeg` | Threads between S and C and hooks C's ankle. |
| **B**, bracing leg | George | `rLeg` | Pins S's thigh and braces him. |

Check against the real art (existing 1.6 s locked frame, Procreate Lou receiver):
the receiver's `lLeg` is already the bent leg (knee 0.90, shin rising, ankle
(517, 459)) and `rLeg` the straighter one (knee 0.30, ankle (476, 476)). So S = `rLeg`
and C = `lLeg` match what the clip already poses. They also fit the slot depth: C is
the near slot and draws over S for Procreate Lou. George is the near slot for `lLeg`
(T) and far for `rLeg` (B).

**The live clip does not form the trap.** At 1.6 s George's ankles are at (581, 436)
and (589, 432) and the receiver's thighs run from his hips (614, 548) to his knees
(~525, 505): George's shins are ~95 px above the receiver's legs and his hips (503, 532)
sit past the receiver's ankles (476–517). Nothing touches; that is the audit's
finding 1, and it is what T1.2 has to fix with staging, not by bending limbs.

## Contacts (critic spec, after T2.2) — v1, SUPERSEDED by v2 below

`tol` is a fraction of the source actor's height. Windows are clip seconds.

| # | Kind | Source → target | Window | `tol` | In the T1.2 tableau? |
|---|---|---|---|---|---|
| 1 | purchase | attacker `lWrist` → defender `rAnkle` (S) | 0.95–1.30 | 0.06 | No. The hand has let go by the lock. Measured by clip `grips` (`to.joint: 'Ankle'`) in Stage 3. |
| 2 | trap | defender `lAnkle` (C's ankle) → `seg:lKnee-lAnkle` on attacker (T's shin) | 1.60–3.40 | 0.05 | Yes. |
| 3 | brace | attacker `rAnkle` (B) → `seg:rHip-rKnee` on defender (S's thigh) | 1.60–3.40 | 0.08 | Yes. |
| 4 | support | attacker hands/elbows on the mat | 1.60–3.40 | n/a | Floor, not a partner contact: judged by the floor metric and the picture. |
| 5 | self | defender `lAnkle` (C) behind S's knee: the 4's shape | 1.30–3.40 | n/a | The critic only measures cross-actor contacts. Enforce it in the constraints file, and judge by eye. |

Kinds are labels for reports only. Nothing here is a runtime constraint.

## Crossings (back → front chains, by beat) — v1, SUPERSEDED by v2 below

These become the clip's `layers` (D1). Limb names are anatomical; `attacker`/`defender`
are roles, so each chain holds in both slots and facings.

| Window | Chain, back → front | Why |
|---|---|---|
| 0.95–1.30 purchase | defender `rLeg` < attacker `lArm` | The grabbing hand draws over the ankle it holds. |
| 0.95–1.30 | defender `rLeg` < attacker `lLeg` | George steps over S. |
| 1.30–1.60 thread | defender `rLeg` < attacker `lLeg` < defender `lLeg` | T goes between S and C as C comes across. |
| **1.60–3.40 lock** | attacker `torso` < defender `rLeg` < attacker `rLeg` < attacker `lLeg` < defender `lLeg` | S at the back; B over S's thigh; T over B; C on top, its ankle across T's shin. George's pelvis sits behind S. |
| 3.40–3.75 unwind | defender `rLeg` < attacker `lLeg` < defender `lLeg` | B has let go; the rest unthreads. |
| 3.75–4.10 | none | Legs are apart. |

`layerTie: ['defender', 'attacker']` stays on so any exact tie that remains breaks
the same way whichever player slot George holds. Windows are discrete: a chain holds
from its `from` to just before the next, so the 1.60 and 3.40 changes are cuts, not
fades. If the cut shows as a pop in Stage 3, move the cut to a beat where the two limbs
don't overlap on screen.

## Hurt-leg link (still valid in v2: `rLeg`)

`figureFour.sell.limb = 'rLeg'` in `src/moves/registry.js` (S, the leg George grabbed).
It is anatomical, so it names the same limb whichever way the receiver faces.
Which slot it draws on when he is grounded is the `groundedSlot` question in D3,
still to be measured.

## Not settled

- That any of this **reads** is Derek's call at G1.
- C's ankle resting across T's shin, and B pinning S's thigh, are my reading of the
  classic hold; G1 will show whether the picture matches what Derek means by it.
- The two George rigs' lLeg depth order differs by facing, so Stage 3 has to
  re-measure each chain on each rig and in both slots.

## Results: locked tableau draft (T1.2, T2.4) — v1, SUPERSEDED by v2 below

2026-10-22 · `tools/move-editor/drafts/figurefour-tableau.json`, generated by
`author_figurefour_tableau.mjs` and staged by `figurefour_tableau.constraints.mjs`.
Draft only; nothing is exported to `src/`.

How the pose was found: the leg channels (and George's x, lift and tilt) were searched
for contacts 2 and 3, with penalties for joints outside `JOINT_LIMITS`, for arms in the
mat, and for leg ends closer than 55 px, then staged by the pelvis offset in the constraints
file. `bend` is not used and `lean` is absent. The locked pose has no free-arm acting.

Critic (`figureFourTableau` spec in `tools/move-critic/specs.mjs`), one frame, `tol` as
in the table above. Never widened.

| Still | Cast | Facing | Trap (tol 5%) | Brace (tol 8%) |
|---|---|---|---|---|
| 1 | George / Procreate Lou | right | 0.0% PASS | 0.0% PASS |
| 2 | George / Procreate Lou | left | **7.4% FAIL** | 2.3% PASS |
| 3 | George-roster / Lou-roster | right | **29.4% FAIL** | 2.0% PASS |
| 4 | George-roster / Lou-roster | left | **29.4% FAIL** | 2.0% PASS |
| | George / shipped Lou (not a G1 still) | right | **30.2% FAIL** | 1.2% PASS |

The pose was tuned on George vs Procreate Lou, facing right. Facing left, legacy
George's `lLeg` draws on the far slot, so the same channels land the trap 7.4% off.
The roster rigs have different leg proportions and miss it by ~29%. Fixing those is T3.3
work (per-rig staging data, not a George-only retune); no solver was built.

Joints: `tools/debug/joint_direction_draft.mjs` on George/Procreate Lou, George/shipped Lou
and the roster pair: every knee and elbow inside `JOINT_LIMITS`, no knee reversal.
Floor: George 0.0% below the mat; the receiver's near upper arm paints 11.5% of height
below the mat line on Procreate Lou (8.8% on the roster rig). The live clip has 18.7%
on the same part, so this is the lying-supine arm art, not something this pose adds.

What the numbers do not say: whether the trap **reads**. Observations from my own look at
stills 1-4, for Derek to overrule:

- Both of George's boots rise straight up side by side. In the unlabelled stills that
  can read as "two legs in the air" rather than a leg wrapped round the receiver's.
- One of the receiver's legs comes out from behind George's torso; the labelled copy shows
  it's the crossed leg C, but without labels it is hard to follow where it goes.
- The straight leg S is partly covered by George's trapping thigh.

The stop rule (D2) was **not** invoked: contacts hold and joints are valid on the baseline
cast, so I have not shown that the trap can't be made to read. Whether it can with this art is the G1 question.

---

# v2 (2026-10-23): Derek's choreography

Derek rejected v1 at G1 ("I don't think I can" point to the legs). He gave the sequence
for the hold; v2 is built on it. Same decision 1: the leg George grabs is the hurt leg.

> George grabs the opponent's legs and steps between them, then falls backward and
> bends the opponent's far leg southward. While falling back, his near leg raises to land
> above the opponent's back (far) leg. Then he sits up at about 45 degrees with his arms
> behind him to support his body. Four or five key steps.

This is the Stage 3 key-step list (not authored yet; the tableau is only its last step):
1. Grab both legs at the receiver's feet. 2. Step between the legs. 3. Fall backward,
folding the receiver's far leg (shin southward). 4. Near leg raises and lands across the
far leg. 5. Sit up to ~45 degrees, hands behind him on the mat (the tableau).

## v2 legs (by channel)

| Name | Who | Channel | Role |
|---|---|---|---|
| **H**, hurt leg | receiver | `rLeg` (his far leg on Procreate and the roster rigs) | Bent, shin pointing south. Grabbed at purchase. `sell.limb` stays `rLeg`. |
| **N**, near leg | receiver | `lLeg` | Straight, straddling George; drawn over George's lap. |
| **T**, trapping leg | George | `lLeg` | Near leg; raised, its ankle lands across H's shin. |
| **B**, bracing leg | George | `rLeg` | Far leg, stepped between the receiver's legs. |

## v2 contacts

| Kind | Source → target | Window (tableau clock) | `tol` |
|---|---|---|---|
| purchase | attacker `lWrist` → defender `rAnkle` (H) | step 1, not in the tableau | 0.06 |
| trap | attacker `lAnkle` (T) → `seg:rKnee-rAnkle` of defender (H's shin) | 0–1.0 | 0.05 |
| brace | attacker `rAnkle` (B) → `seg:lHip-lKnee` of defender (N's thigh) | 0–1.0 | 0.08 |
| support | George's hands on the mat behind him | 0–1.0 | floor + eye |

## v2 crossing chain (lock), back → front

defender `rLeg` (H) < attacker `torso` < attacker `rLeg` (B) < attacker `lLeg` (T) < defender `lLeg` (N).
He sits between the receiver's legs: the far leg H is behind him, the near leg N crosses in
front of his lap. Earlier windows (grab, step, fall) are for Stage 3.

## v2 results (tableau draft, searched then staged)

George sits at tilt -0.73 (about 42 degrees), arms back (lArm -0.09, rArm -0.51). The
receiver's H knee is 2.50, one hundredth under the knee limit. All knees and elbows are
inside `JOINT_LIMITS` on Procreate and the roster pair; no reversals.

| Still | Cast | Facing | Trap (5%) | Brace (8%) |
|---|---|---|---|---|
| 1 | George / Procreate Lou | right | 2.1% PASS | 0.0% PASS |
| 2 | George / Procreate Lou | left | **9.6% FAIL** | **8.9% FAIL** |
| 3 | roster pair | right | **23.3% FAIL** | 4.1% PASS |
| 4 | roster pair | left | **23.9% FAIL** | 4.2% PASS |

`tol` not widened, no per-rig retune. Floor: George 0.0%; the receiver's near upper arm
paints 19.0% below the mat line on Procreate Lou, which equals the live clip's 18.7% on the
same part, so that is the lying-arm art.

My own look (Derek to overrule; I am not claiming it reads): H bent with the shin down
and George's near leg rising across it are visible on still 1, and George sits up
propped. B is mostly hidden behind George's lap and N, so George's "stepped between"
leg is the hardest part to find without the label. The left-facing and roster stills
fail the trap contact, so the legs are visibly off on those.

## v3 (2026-10-23): honed against Flair's sprites

Compared with Flair 397 and 398 (SNES Royal Rumble, pose reference only), side by side in
`g1/5_vs_flair_397_398.png`. In the sprites Flair sits propped back on his near hand,
torso roughly 45-50 degrees, hips on the mat, both knees bent with the knee up and the
shin dropping forward to a low boot. v2 had George's near leg pointing up like a kick; v3
searched again with his knees bent (T knee 1.0, B knee 0.7) and his ankles no more than
70 px above his hip, tilt -0.74, arms back (rArm -0.75). The receiver's raised bent far leg
(Bret 307-310 has the victim's legs up in the air) is kept: H knee 2.50, N hip 0.80.

Critic after v3: George / Procreate Lou facing right: trap 4.3% PASS (tol 5%), brace 0.0% PASS.
Facing left: trap 6.9% FAIL, brace 9.4% FAIL. Roster pair: trap 26.9% / 27.7% FAIL, brace 0.2% PASS.
Joints inside limits on Procreate and roster; 756 tests green.

Still unlike Flair 397/398: his near knee is bent much sharper than George's T (1.0), and the
sprites show only one body, so the victim's leg positions are taken from Bret, not from a
true two-man reference. Whether it reads is for Derek.
