#!/usr/bin/env python3
"""Rev 3 film metrics (PLAN_GEORGE_TRANSFER T8.5) from aftermath_film manifests.

  python3 tools/debug/route_metrics.py <film-root>/<config>/<scenario>/manifest.json [...] [--json out.json]

Per manifest: the depth swaps (ms, phase, direction, clearance of every hand sample at that frame, frames from the moment
the route weight crossed its via weight: reach weight 0.2 on the mat/in the rise, recovery hand weight 0.5 standing; negative =
the swap came before the hand reached the via point), the swaps that were wanted but waited or were dropped, the shortest gap
between swaps (flicker), the largest frame-to-frame move of the wrist relative to the back waist (body motion removed) outside
and at the facing turn, the elbow's distance outside the art, and the forearm-inside-torso pixel counts taken at the film's marks.
"""
import json, math, sys

VIA_W, STAND_W = 0.2, 0.5
FRAME = 1000 / 60


def kind_of(S):
    names = []
    for s in S:
        n = (s['sell'] or {}).get('name')
        if n and (not names or names[-1] != n):
            names.append(n)
    rise = next((s for s in S if s['state'] == 'gettingUp'), None)
    if rise and rise.get('lying') == 'prone':
        return 2, names
    return (1 if names and names[-1] == 'clutch' else 3), names


def analyse(path):
    m = json.load(open(path))
    S = [s for s in m['samples'] if s['rel'] >= 0]
    k, names = kind_of(S)
    out = dict(path=path, scenario=m['scenario'], kind=k, sells=names, receiver=m['receiver']['rig'], facing=m['receiverFacing'], lying=m['receiverLying'])
    # route weight per frame: reach weight while on the mat / rising, recovery hand weight standing
    def phase(s):
        return 'standing' if s['state'] == 'standing' else ('rise' if s['state'] == 'gettingUp' else 'mat')
    def route(s):
        return (s.get('handHw') or 0) if s['state'] == 'standing' else (s.get('reachW') or 0)
    def crossed(i, w_via, direction):
        # the nearest index at/before i where the route weight crossed w_via (in the direction of the swap), else None
        hit = lambda j: (direction == 'in' and route(S[j - 1]) < w_via <= route(S[j])) or (direction == 'out' and route(S[j - 1]) >= w_via > route(S[j]))
        for j in range(i, 0, -1):
            if hit(j): return j
        for j in range(i + 1, len(S)):       # the swap came before the hand reached the via point: the crossing is after it
            if hit(j): return j
        return None
    swaps = []
    for i in range(1, len(S)):
        a, b = S[i - 1], S[i]
        if a['handUnder'] is None or a['handUnder'] == b['handUnder']: continue
        d = 'in' if b['handUnder'] == 1 else 'out'
        c = b['clr']['d'] if b.get('clr') else None
        via = STAND_W if b['state'] == 'standing' else VIA_W
        j = crossed(i, via, d)
        swaps.append(dict(ms=round(b['rel'], 1), direction=d, state=b['state'], sell=(b['sell'] or {}).get('name'), clearancePx=c, minClearancePx=min(c.values()) if c else None,
                          routeWeight=round(route(b), 3), framesFromVia=(i - j) if j is not None else None, viaCrossedMs=round(S[j]['rel'], 1) if j is not None else None))
    out['swaps'] = swaps
    out['swapCount'] = len(swaps)
    out['minGapMs'] = round(min((y['ms'] - x['ms'] for x, y in zip(swaps, swaps[1:])), default=float('nan')), 1) if len(swaps) > 1 else None
    # wanted but not (yet) swapped: frames pending, the longest run, and the skips the Wrestler counted
    pend = [s.get('handPending') or 0 for s in S]
    runs, cur = [], 0
    for p in pend:
        if p: cur += 1
        elif cur: runs.append(cur); cur = 0
    if cur: runs.append(cur)
    out['pending'] = dict(frames=sum(pend), longestRunMs=round(max(runs, default=0) * FRAME, 1), runsMs=[round(r * FRAME, 1) for r in runs])
    out['skippedSwaps'] = max((s.get('handSkips') or 0) for s in S)
    # hand travel
    rel, world = [], []
    def window(b):
        # which part of the sell the step belongs to: the hand's own route (back clutch, hold, rise, standing) or another sell (kick, writhe, roll),
        # where the body itself moves and the step says nothing about the route
        if b['state'] == 'standing': return 'standing'
        if b['state'] == 'gettingUp': return 'rise'
        n = (b['sell'] or {}).get('name')
        return 'clutch' if n == 'clutch' else ('other sell (' + n + ')' if n else 'hold / wait')
    for a, b in zip(S, S[1:]):
        wa, wb = a.get('nearWristW'), b.get('nearWristW')
        ba, bb = a.get('backWaist'), b.get('backWaist')
        if not (wa and wb and ba and bb): continue
        r = math.hypot((wb['x'] - bb['x']) - (wa['x'] - ba['x']), (wb['y'] - bb['y']) - (wa['y'] - ba['y']))
        w = math.hypot(wb['x'] - wa['x'], wb['y'] - wa['y'])
        turn = a['facing'] != b['facing']
        rel.append((r, b['rel'], window(b), turn)); world.append((w, b['rel'], window(b), turn))
    ex = [x for x in rel if not x[3]]
    route = [x for x in ex if not x[2].startswith('other sell')]
    byWindow = {}
    for x in ex:
        if x[2] not in byWindow or x[0] > byWindow[x[2]]['px']: byWindow[x[2]] = dict(px=round(x[0], 2), atMs=x[1])
    out['handStepRelWaist'] = dict(maxExcludingFacingTurn=dict(px=round(max((x[0] for x in route), default=0), 2), atMs=max(route, key=lambda x: x[0])[1] if route else None, window=max(route, key=lambda x: x[0])[2] if route else None),
                                   byWindow=byWindow, atFacingTurn=[dict(px=round(x[0], 2), atMs=x[1]) for x in rel if x[3]])
    exw = [x for x in world if not x[3]]
    out['handStepWorld'] = dict(maxExcludingFacingTurn=round(max((x[0] for x in exw), default=0), 2), atFacingTurn=[round(x[0], 2) for x in world if x[3]])
    out['elbowOutsideArt'] = dict(min=min((s.get('elbowClr') for s in S if s['handUnder'] == 1 and s.get('elbowClr') is not None), default=None))
    out['forearmInsideAtMarks'] = {k: v['forearmInside'] for k, v in m['events'].items() if 'forearmInside' in v}
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    jout = None
    if '--json' in args:
        i = args.index('--json'); jout = args[i + 1]; del args[i:i + 2]
    res = [analyse(p) for p in args]
    for r in res:
        print(f"== {r['scenario']} kind {r['kind']} sells {r['sells']} receiver {r['receiver']} facing {r['facing']['atImpact']} -> {r['facing']['atRise']}")
        for s in r['swaps']:
            print(f"  swap {s['direction']:3s} @{s['ms']:8.1f} ms {s['state']:9s} sell {s['sell']}  route weight {s['routeWeight']}  clearance px {s['clearancePx']}  frames from via {s['framesFromVia']}")
        print(f"  swaps {r['swapCount']}  min gap {r['minGapMs']} ms  pending frames {r['pending']['frames']} (longest {r['pending']['longestRunMs']} ms)  skipped {r['skippedSwaps']}")
        print(f"  hand step rel. waist by window: {r['handStepRelWaist']['byWindow']}")
        print(f"  hand step rel. waist: max over the hand's own route (not other sells) {r['handStepRelWaist']['maxExcludingFacingTurn']}  at the facing turn {r['handStepRelWaist']['atFacingTurn']}  | world max {r['handStepWorld']['maxExcludingFacingTurn']} at the turn {r['handStepWorld']['atFacingTurn']}")
        print(f"  elbow outside the art while under: min {r['elbowOutsideArt']['min']} px")
        print(f"  forearm px inside the torso art at the marks: {json.dumps(r['forearmInsideAtMarks'])}")
    if jout:
        json.dump(res, open(jout, 'w'), indent=1)
