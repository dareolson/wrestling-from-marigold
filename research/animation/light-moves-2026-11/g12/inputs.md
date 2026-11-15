# T12.0 input audit (Stage 12, `?light=v1`)

Routes that exist before Stage 12 (from `tryAction`, `tryPower`, `tryFinisher`, `tickDown`, `Arena._tickLockup`, `Arena._tickHeadlock`, `g10_inputs.mjs`):

| Situation | Keys now |
|---|---|
| Standing, man standing | Action = tie-up; Power = jab / club blow; Up+Power = chop / knee lift; Back+Power = uppercut; Fwd+Power far = shoulder block; Down+Power = front kick; Down+Action = leg sweep; Finisher = sleeper / taunt |
| Standing, man staggered | Action = tie-up (fresh) or piledriver / slam (worn); Power = headbutt; Down+Power = axe handle to the back |
| Standing, runner returning | Action = clothesline / back body drop; Down+Action = back elbow; Power = hip toss / arm drag |
| Standing, man down | Action = pin; Down+Action = mounted punches (back) / body stomps (stomach); Power = elbow drop; Down+Power = knee drop / hand stomp; Finisher = first mat hold, Up = arm bar, Down = crab / ankle lock |
| Tie-up (attacker) | Finisher = hammerlock; Action = whip (Left/Right), headlock (Down), suplex (Up), slam; Fwd+Power = chop; Up/Down+Power = go-behind (waistlock=v1 only); Back+Power = snapmare; Power = hip toss / arm drag |
| Headlock (attacker) | nothing (the defender's Action escapes) |
| On his own back at the rise | nothing (Down held = possum) |

Slots taken for Stage 12 (the defaults in the plan are wishes; a taken one is logged as `DEFAULT TAKEN`):

| # | Move | Where | Keys | Kit | Note |
|---|---|---|---|---|---|
| 12.1 | Wristlock into arm wringer | tie-up | Back+Action | Lou, Guido | as written. Shadows "whip backward" (Back+Action) for those two; Fwd+Action still whips. |
| 12.2 | Headlock takeover | in the headlock | Power | Lou, George | free slot, as written. |
| 12.3 | Flying mare | tie-up | **Down+Power** | Guido, Lou | `DEFAULT TAKEN`: Back+Power is the snapmare for the same two kits. Down+Power was hip toss / arm drag; plain Power keeps them. Under `waistlock=v1` Down+Power is the go-behind, which wins for kits holding `goBehind` (Lou, George). |
| 12.4 | Test of strength | tie-up | **Up+Power** | Kowalski, Lou | `DEFAULT TAKEN`: Up+Action is the suplex for both kits. Same waistlock yield as 12.3. |
| 12.5 | Leapfrog | vs a returning runner | **Up+Power** | Guido, George | Power in the runner window is hip toss / arm drag; Up+Power picks the leapfrog ahead of them. |
| 12.6 | Backward roll | on his back, at the rise | **Back held** (away from the man) | George, Guido | free; fires in place of the normal rise when the down timer runs out. |
| 12.7 | Abdominal stretch | vs a staggered man | Back+Action | Kowalski, George | free (Action vs staggered has no direction check). Picked before the tie-up / slam grab. |
| 12.8 | Body scissors | next to a man on his back | Up+Action | Lou, Kowalski | free. |
| 12.9 | Indian deathlock | man on his back | **Back+Finisher** | George, Kowalski | `DEFAULT TAKEN`: Down+Power on a man down is the knee drop / hand stomp for every kit. Mat holds live on the Finisher key, Back is the one direction free there (Up arm bar, Down crab / ankle lock). |
| 12.10 | Backdrop suplex | man with his back turned | **Power** (from behind) | Lou, Kowalski | the waistlock-hold route is not wired (see Progress); without the flag it fires on a standing / staggered man facing away. Gated at the man's wear >= `KNOCKDOWN_WEAR` (60). |
