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
| roster rigs (`*-roster-v1`) | not measured yet; the editor can't load them. Measure in T2.4 and add the rows here. | |

So with the baseline cast George-as-attacker (facing right) has lLeg = near, and
Procreate Lou-as-receiver (facing left) has lLeg = near too. With George as the
**receiver** (facing left) his lLeg is the **far** slot. That is why the crossing can't be
left to slot depth: it must be a declared chain.

## The four legs

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

## Contacts (critic spec, after T2.2)

`tol` is a fraction of the source actor's height. Windows are clip seconds.

| # | Kind | Source → target | Window | `tol` | In the T1.2 tableau? |
|---|---|---|---|---|---|
| 1 | purchase | attacker `lWrist` → defender `rAnkle` (S) | 0.95–1.30 | 0.06 | No. The hand has let go by the lock. Measured by clip `grips` (`to.joint: 'Ankle'`) in Stage 3. |
| 2 | trap | defender `lAnkle` (C's ankle) → `seg:lKnee-lAnkle` on attacker (T's shin) | 1.60–3.40 | 0.05 | Yes. |
| 3 | brace | attacker `rAnkle` (B) → `seg:rHip-rKnee` on defender (S's thigh) | 1.60–3.40 | 0.08 | Yes. |
| 4 | support | attacker hands/elbows on the mat | 1.60–3.40 | n/a | Floor, not a partner contact: judged by the floor metric and the picture. |
| 5 | self | defender `lAnkle` (C) behind S's knee: the 4's shape | 1.30–3.40 | n/a | The critic only measures cross-actor contacts. Enforce it in the constraints file, and judge by eye. |

Kinds are labels for reports only. Nothing here is a runtime constraint.

## Crossings (back → front chains, by beat)

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

## Hurt-leg link

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
