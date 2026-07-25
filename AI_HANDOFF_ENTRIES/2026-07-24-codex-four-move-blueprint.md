# Four Input-Invoked Move Animation Blueprint

Author: Codex  
Date: 2026-07-24  
Status: Awaiting Derek's review; blueprint only, no gameplay code implemented

## Shared implementation contract

- These are human-input moves using the existing grapple (`action`), power,
  finisher, run, and direction inputs. No new physical button is required.
- Each move has exactly four attacker poses and exactly four `poseSeq` steps.
  Returning to the character's configured `idlePose` happens after the move
  completes and is not a fifth move pose.
- Every new pose below provides the full current `POSES` shape:
  `{ lLeg, rLeg, lArm, rArm, lean, crouch }`. Angles follow the existing
  convention: `0` points straight down and positive angles point toward the
  wrestler's facing direction.
- No new art, texture keys, rig parts, or bespoke two-body drawings. Defender
  reactions use existing poses/states only.
- Ranges are unscaled values and must be multiplied by the attacker's current
  perspective scale `s`, matching the existing move handlers.
- Suggested "defender drain" values belong in `STAMINA_DRAIN`; "attacker
  cost" is a one-time `this._drain(...)` on commitment; "heat" belongs in
  `Arena._heatForMove`.
- Directional overrides are evaluated before the non-directional move already
  occupying that context. If the required direction is not held, existing
  behavior remains unchanged.
- Implementation should add focused `debug:play` scenarios for all four human
  input paths. After implementation, run `npm test`, `npm run debug:play --
  all`, and `npm run build` under Node >=20.19.

## 1. Hammerlock (behind-the-back arm lock)

### Purpose and visual read

A standing hammerlock: the attacker catches the wrist, steps to the
defender's outside, folds the arm behind the defender, and leans back for one
clear crank. This is a control hold, not a knockdown. It gives the match an
era-appropriate technical beat and lets George work as a deliberate,
humiliating heel.

The current rigs cannot draw genuinely interlocked hands. Stage the wrestlers
in the same direction with the attacker slightly behind and outside the
defender, then reuse `armBarDefender`. The offset silhouette and opposed torso
leans should imply the lock without requiring the limbs to cross perfectly.
Do not add a bespoke entangled-body render path.

### Trigger and validity

- Trigger: `finisher` while the human player is the attacker in `lockup`.
- Valid target: the current lockup defender; no additional range test after
  lockup has been established.
- Collision: none. Finisher is currently unused inside `Arena._handleLockup`.
  Standing finisher remains sleeper/Thesz press/taunt outside lockup.
- Kits: `thesz`, `george`. Do not give it to `brawler`.

### Attacker poses

```js
hammerlockReach: {
    lLeg: 0.10, rLeg: -0.12, lArm: 0.78, rArm: 0.42,
    lean: 0.18, crouch: 0.10,
},
hammerlockTurn: {
    lLeg: -0.10, rLeg: 0.24, lArm: 1.32, rArm: 0.74,
    lean: 0.22, crouch: 0.16,
},
hammerlockSet: {
    lLeg: 0.20, rLeg: -0.16, lArm: 1.92, rArm: 0.68,
    lean: 0.30, crouch: 0.22,
},
hammerlockCrank: {
    lLeg: 0.28, rLeg: -0.22, lArm: 2.18, rArm: 0.46,
    lean: -0.06, crouch: 0.28,
},
```

### Move definition

```js
hammerlock: {
    poseSeq: [
        { p: 'hammerlockReach', dur: 120, e: 'Cubic.easeOut' },
        { p: 'hammerlockTurn',  dur: 180, e: 'Cubic.easeInOut' },
        { p: 'hammerlockSet',   dur: 200, e: 'Cubic.easeOut' },
        { p: 'hammerlockCrank', dur: 900, e: 'Linear' },
    ],
},
```

### Defender and spatial behavior

- On commitment: attacker state `holding`, defender state `holding`.
- Set defender facing equal to attacker facing.
- Over the first 300ms, tween the defender to approximately
  `attacker.x + attacker.facing * 30 * s`, with the attacker behind/outside
  at approximately `defender.x - attacker.facing * 24 * s`. Clamp both.
- Reuse `armBarDefender`, tweening into it over 260ms with
  `Cubic.easeOut`. No new defender pose.
- Apply the first drain when `hammerlockSet` begins at 300ms. Apply the release
  drain at 1400ms, return both to `standing`, and tween each to its configured
  idle pose over 220ms.
- Do not use the sleeper KO/escape loop. This is a fixed-duration working hold.

### Suggested tuning

- Defender drain: 10 on set + 4 on release.
- Attacker stamina cost: 3.
- Heat: 5.
- AI: Thesz may choose lockup-finisher roughly 25% of the time when opponent
  stamina is 35–75. George may choose it roughly 15% of the time above 45
  stamina; below that, he should continue hunting his bigger lockup offense.

## 2. Rising knee lift

### Purpose and visual read

A short, planted knee to the body: load on the rear foot, chamber the near
knee, drive it into the midsection, then set the foot down under control. It
is a compact close-range strike that creates stagger rather than an automatic
fall.

### Trigger and validity

- Trigger: hold `up` and press `power`.
- Valid target: defender state `standing`, distance <= `85 * s`.
- Collision: intentional directional override of the close-range jab. It does
  not override the headbutt because `staggered` is not a valid target state.
  Without `up`, normal jab/dropkick resolution is unchanged.
- Kits: `george`, `brawler`. Do not give it to `thesz`.

### Attacker poses

```js
kneeLiftLoad: {
    lLeg: -0.18, rLeg: 0.22, lArm: -0.15, rArm: 0.38,
    lean: -0.12, crouch: 0.30,
},
kneeLiftChamber: {
    lLeg: 1.15, rLeg: -0.10, lArm: 0.72, rArm: 0.40,
    lean: 0.10, crouch: 0.20,
},
kneeLiftImpact: {
    lLeg: 1.72, rLeg: -0.06, lArm: 0.90, rArm: 0.24,
    lean: 0.34, crouch: 0.10,
},
kneeLiftRecover: {
    lLeg: 0.24, rLeg: 0.06, lArm: 0.30, rArm: 0.18,
    lean: 0.12, crouch: 0.16,
},
```

### Move definition

```js
kneeLift: {
    poseSeq: [
        { p: 'kneeLiftLoad',    dur: 100, e: 'Cubic.easeOut' },
        { p: 'kneeLiftChamber', dur:  90, e: 'Cubic.easeIn' },
        { p: 'kneeLiftImpact',  dur:  70, e: 'Linear' },
        { p: 'kneeLiftRecover', dur: 180, e: 'Cubic.easeOut' },
    ],
},
```

### Defender and spatial behavior

- Face the target when the move commits; do not move either body's center
  except for the defender's existing sell behavior.
- Test contact at 190ms, when `kneeLiftImpact` begins. If the defender entered
  `evading`, log a dodge and do no damage.
- On hit, reuse `sellChest` for 140ms, then `startStagger()`. No new defender
  pose and no automatic knockdown.
- Attacker remains input-locked until the four-pose sequence completes.

### Suggested tuning

- Defender drain: 9.
- Attacker stamina cost: 3.
- Heat: 5.
- AI: George/brawler may substitute it for a close jab about 20% of the time
  against a standing opponent, but never repeat it twice consecutively.

## 3. Back body drop

### Purpose and visual read

A classic answer to the rope return: brace, dip under the runner, extend
through the hips, and throw the opponent over. It rewards reading the rebound
and gives every kit a period-correct defensive throw distinct from the
clothesline.

### Trigger and validity

- Trigger: hold `up` and press `grapple` while the opponent is a returning
  runner.
- Valid target: defender state `running`, `runPhase === 'returning'`,
  horizontal distance < `160 * s`, and the same forgiving "not more than
  `45 * s` past the attacker" check used by clothesline.
- Collision: intentional directional override of returning-runner
  clothesline. Without `up`, grapple still produces clothesline.
- Kits: `george`, `thesz`, `brawler`.

### Attacker poses

```js
backDropBrace: {
    lLeg: 0.34, rLeg: -0.26, lArm: 0.48, rArm: 0.38,
    lean: 0.36, crouch: 0.55,
},
backDropDip: {
    lLeg: 0.44, rLeg: -0.34, lArm: 0.82, rArm: 0.72,
    lean: 0.62, crouch: 0.82,
},
backDropLaunch: {
    lLeg: 0.18, rLeg: 0.08, lArm: 1.55, rArm: 1.35,
    lean: -0.12, crouch: 0.28,
},
backDropRecover: {
    lLeg: -0.12, rLeg: 0.24, lArm: 0.42, rArm: 0.32,
    lean: 0.18, crouch: 0.12,
},
```

### Move definition

```js
backBodyDrop: {
    poseSeq: [
        { p: 'backDropBrace',   dur: 110, e: 'Cubic.easeOut' },
        { p: 'backDropDip',     dur: 120, e: 'Cubic.easeIn' },
        { p: 'backDropLaunch',  dur: 100, e: 'Cubic.easeOut' },
        { p: 'backDropRecover', dur: 220, e: 'Cubic.easeOut' },
    ],
},
```

### Defender and spatial behavior

- On commitment, stop the defender's run and set the attacker to `slamming`.
- During the first 230ms, bring the defender to the attacker's centerline and
  slightly toward the camera (`y + 10 * s`) so the bodies remain readable.
- At 230ms, reuse the existing flipping/fall machinery used by
  clothesline/dropkick, but launch in the defender's incoming run direction
  with a higher vertical arc and about `90 * s` horizontal travel.
- The defender lands `down`; no new defender pose. The attacker's launch pose
  supplies the lift illusion, so do not set the defender to the body-slam
  `grabbed` drawing mode.
- If range/past-distance validity fails on the input frame, preserve the
  existing clothesline miss behavior rather than snapping bodies together.

### Suggested tuning

- Defender drain: 16.
- Attacker stamina cost: 4.
- Heat: 10.
- AI: leave disabled in the first implementation. It needs an explicit
  rebound-read choice so AI does not press `up` accidentally or choose the
  throw every time.

## 4. Knee drop

### Purpose and visual read

A measured knee drop onto a grounded opponent: set the distance, spring just
off the mat, tuck one knee, and land heavy. It is more deliberate than the
existing elbow drop and adds grounded offense without new art.

### Trigger and validity

- Trigger: hold `down` and press `power`.
- Valid target: defender state `down` or `possum`, distance <= `105 * s`.
- Collision: intentional directional override of elbow drop. Without `down`,
  power against a grounded opponent remains elbow drop.
- Kits: `george`, `thesz`, `brawler`.

### Attacker poses

```js
kneeDropSet: {
    lLeg: 0.18, rLeg: 0.10, lArm: 0.35, rArm: 0.20,
    lean: 0.16, crouch: 0.30,
},
kneeDropLeap: {
    lLeg: 0.72, rLeg: 0.18, lArm: -0.40, rArm: 0.52,
    lean: -0.08, crouch: 0.16,
},
kneeDropTuck: {
    lLeg: 1.38, rLeg: 0.50, lArm: 0.30, rArm: 0.65,
    lean: 0.28, crouch: 0.50,
},
kneeDropLand: {
    lLeg: 1.05, rLeg: 0.22, lArm: 0.18, rArm: 0.28,
    lean: 0.44, crouch: 0.68,
},
```

### Move definition

```js
kneeDrop: {
    poseSeq: [
        { p: 'kneeDropSet',  dur: 120, e: 'Cubic.easeOut' },
        { p: 'kneeDropLeap', dur: 140, e: 'Cubic.easeOut' },
        { p: 'kneeDropTuck', dur:  90, e: 'Cubic.easeIn' },
        { p: 'kneeDropLand', dur: 120, e: 'Linear' },
    ],
},
```

### Defender and spatial behavior

- Use a new attacker state such as `kneeDropping` only if the existing
  `elbowDropping` render path cannot accept a move subtype cleanly. Prefer
  sharing its body-arc plumbing with move-specific pose selection.
- Use a compact jump: approximately `38 * s` peak height, with the attacker
  settling beside rather than directly on top of the defender so both remain
  readable.
- Contact occurs at 350ms, when `kneeDropLand` begins. The defender stays in
  its existing grounded draw state; do not add a defender pose or restart the
  down timer.
- On completion, set attacker to `standing` beside the opponent and tween to
  configured idle over 220ms.

### Suggested tuning

- Defender drain: 12.
- Attacker stamina cost: 4.
- Heat: 7.
- AI: when elbow drop is available against a grounded opponent, choose knee
  drop about 30% of the time. George may use 40%; Thesz 20%; brawler 30%.

## Required handler ordering

To preserve every existing non-directional input:

1. In `tryPower`, before `resolvePowerMove`, test `up + standing + <=85*s`
   for `kneeLift`, then `down + down/possum + <=105*s` for `kneeDrop`.
2. In `tryAction`, inside the returning-runner branch and before clothesline,
   test `up` plus `backBodyDrop` availability.
3. In `Arena._handleLockup`, test attacker `finisher` for `hammerlock`
   independently of the existing action and power follow-up branches.
4. Add the move names only to the kits specified above. A handler must always
   check `moveSet.includes(...)` before consuming the input.

## Approval questions for Derek

1. Does the current-rig hammerlock approximation read clearly enough, or
   should it be renamed "standing arm wrench" if the behind-the-back hand
   placement is not convincing in motion?
2. Is `up + power` an acceptable intentional override for the close jab?
3. Is `down + power` an acceptable intentional override for the grounded
   elbow drop?
4. Should all three kits receive the back body drop and knee drop as proposed?

