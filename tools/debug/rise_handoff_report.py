"""Before -> after table from two rise_handoff_probe.mjs runs (PLAN_RISE_HANDOFF T2.2).

  python3 tools/debug/rise_handoff_report.py <before dir> <after dir> [limit=3] > table.md

Per rig x rise type (worst of both facings): the largest part step on the swap frame with the facing turn taken out
("pose only", the number the 3 px target is about), before -> after, for the flags on (default / risefix) and off
(sellart=off&aftermath=off / the same + risefix); then the same step as drawn when the receiver turns (opponent
behind), and Lou's carried-hand distance to the painted back waist on the last rising and first standing frame.
"""
import json, sys

before, after = sys.argv[1], sys.argv[2]
LIMIT = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
B = json.load(open(f'{before}/handoff.json'))['runs']
A = json.load(open(f'{after}/handoff.json'))['runs']
pairs = {'on': ('default', 'fix'), 'off': ('off', 'fixoff')}
mx = lambda d: max(d.values()) if d else None


def runs(rs, rig, flag):
    return next((r for r in rs if r['rig'] == rig and r['flagName'] == flag), None)


def worst(run, case, opp, key):
    cs = [c for c in run['cases'] if c['id'] == case and c['opp'] == opp and not c.get('error')]
    return max(mx(c[key]['parts']) for c in cs) if cs else None


cases = [c['id'] for c in B[0]['cases'] if c['opp'] == 'front' and c['facing'] == -1]
rigs = list(dict.fromkeys(r['rig'] for r in B))
print(f'Largest part-corner step on the swap frame, px, pose only (facing turn removed); worst of both facings. Target <= {LIMIT:g}.\n')
print('| rig | rise | flags on: before -> after | flags off: before -> after | opponent behind, as drawn (turn in): before -> after |')
print('|---|---|---|---|---|')
for rig in rigs:
    for case in cases:
        cells = []
        for which in ('on', 'off'):
            b = runs(B, rig, pairs[which][0]); a = runs(A, rig, pairs[which][1])
            x, y = worst(b, case, 'front', 'swap'), worst(a, case, 'front', 'swap')
            ok = '' if y is None or y <= LIMIT else ' **over**'
            cells.append(f'{x:g} -> {y:g}{ok}' if x is not None and y is not None else 'n/a')
        b = runs(B, rig, 'default'); a = runs(A, rig, 'fix')
        x, y = worst(b, case, 'behind', 'swap'), worst(a, case, 'behind', 'swap')
        cells.append(f'{x:g} -> {y:g}' if x is not None and y is not None else 'n/a')
        print(f'| {rig} | {case} | {cells[0]} | {cells[1]} | {cells[2]} |')

print('\nLou (thesz-procreate-v1), the carried hand (supine-pain, painted back waist): hand-to-backWaist px on the last rising and the first standing frame.\n')
print('| flags | facing | opponent | last rising | first standing | frames 2..10 standing, max |')
print('|---|---|---|---|---|---|')
for name, rs, fl in (('default', B, 'default'), ('risefix=1', A, 'fix'), ('sellart/aftermath off', B, 'off'), ('off + risefix=1', A, 'fixoff')):
    run = runs(rs, 'thesz-procreate-v1', fl)
    for c in run['cases']:
        if c['id'] != 'supine-pain' or c.get('error'): continue
        rest = [f['backDist'] for f in c['standing'][1:] if f.get('backDist') is not None]
        print(f"| {name} | {c['facing']} | {c['opp']} | {c['swap']['carriedDistLast']} | {c['swap']['carriedDistFirst']} | {max(rest) if rest else None} |")
