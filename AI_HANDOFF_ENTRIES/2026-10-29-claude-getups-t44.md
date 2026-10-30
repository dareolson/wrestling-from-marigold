# Get-ups T4.4: getups promoted to default

2026-10-29 · Claude (Sonnet, PLAN_GETUPS Rev 9 T4.4) · for Opus and Derek. Local commits, nothing pushed. Node 22.

## What changed

- `Wrestler.js`: `getUpsCandidate = () => defaultOnFlag('getups', 'v1')`. On in the game unless the URL says `?getups=off` (any value but `v1` turns it off, as for risefix); `&getup=<family>` still forces a family; Node without `location` stays off. Comment block above `defaultOnFlag` lists it. `grep` found no other reader of the `getups` URL parameter; the Skeleton follows through `setGetUps(getUpsCandidate())`, `sells.js` through `noRoll`.
- `tests/support/promotedFlags.js`: `getups` added to `onlyListed`, so the tests that mean one flag at a time (sells, back sell, lying hold, georgeClutchFlagOff, ...) keep their meaning. `riseSeparation` and one `getUps` case that meant "flag off" with a bare or `?getup=` search now say `?getups=off`. New test `T4.4: getups is on by default` (absent / `=v1` on; `=off`, `=1`, no location off).
- Same precedent as 82b71a8 (risefix) and b8b274b (sellart/aftermath). No capability record exists for get-ups, so nothing to change in `capabilities.json`; the promotion is in the plan Progress and the Status.

## Checks

- Full suite 1035/1035 (1023 + 12 new since T4.1). The flag-off fixtures `riseFixFlagOff` and `georgeClutchFlagOff` pass unchanged.
- `npm run build` ok; `npm run moves:coverage -- --check` passed (22 baselined gaps).
- Live: dev server, no query string (`?p1=thesz-procreate-v1&p2=george-roster-v1&arena=1`), one Lou vs George AI match, 72 s: 4 rises in `_getUpLog`, all chosen by `chooseGetUp` (Lou backKneeHurtStraight; George backKneeHurt, backTuck, backKneeHurt; reasons pick, onlyEligible, avoidedRepeat).

## Misses

None from T4.4. Left open elsewhere: the source of George's far-leg +0.35 rad past straight with no sell or hold (T4.3 entry), the authored knee data and the upright -0.10 limit, and Derek's straight-knee-or-slight-bend question. Tools and films that want the legacy rise now need `getups=off` in their query string (the `getups_*` film tools set `getups=v1` themselves, so they are unaffected).

My vite on 5175 is still running (5173 / 5174 are held elsewhere).
