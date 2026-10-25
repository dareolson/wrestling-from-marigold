"""Markdown cause table from rise_handoff_attribution.mjs output.

  python3 tools/debug/rise_handoff_table.py <attribution.json> [facing=-1] > table.md
"""
import json, sys

rows = json.load(open(sys.argv[1]))
facing = int(sys.argv[2]) if len(sys.argv) > 2 else -1
f = lambda c: ' / '.join(f'{c[k]:g}' for k in ('backWaist', 'farShoulder', 'farWrist', 'head')) + f" (max part {c['maxPart']:g})"
print(f'Facing {facing}. px at back waist (torso centre on rigs with no painted one) / far shoulder / far wrist / head (max part = largest part-corner step).')
print('"pose only" = the same step with the facing turn taken out; H1 = stale this.pose vs a fresh idle; H2+H3 = what is left between the rise end and an idle upright draw with no overlays; H4 = recovery copy + guard.\n')
print('| rig | rise | opponent | step as seen (turn included) | pose only | H1 stale pose | H2+H3 rise-end vs idle upright | H4 overlays | hip dy (px, +down) |')
print('|---|---|---|---|---|---|---|---|---|')
for r in rows:
    if r.get('error') or r['facing'] != facing: continue
    h4 = {k: max(r['H4recovery'][k] or 0, r['H4guard'][k] or 0) for k in ('backWaist', 'farShoulder', 'farWrist', 'head', 'maxPart')}
    h4['maxPart'] = max(r['H4guard']['maxPart'], r['H4recovery']['maxPart'])
    turn = 'behind (turns)' if r['turned'] else 'front'
    print(f"| {r['rig']} | {r['case']} | {turn} | {f(r['total'])} | {f(r['totalPoseOnly'])} | {f(r['H1stale'])} | {f(r['residual'])} | {f(h4)} | {r['totalPoseOnly']['hipD']['dy']} |")
