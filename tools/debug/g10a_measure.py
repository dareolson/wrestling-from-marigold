#!/usr/bin/env python3
"""T10.3 / A2 measures for the legScale candidates (PLAN_GEORGE_TRANSFER).

  python3 tools/debug/g10a_measure.py [root]   root = research/animation/george-transfer-2026-10/g10a

Reads <root>/ls<scale>/on/<scenario>/manifest.json (tools/debug/aftermath_film.mjs, WFM_LEGSCALE) and writes <root>/rows.json:
  plan        the receiver's sell sequence (name:part:lying, from the samples); must match across candidates (A2a)
  peakFlex    peak knee flex per leg and the source/time of the peak
  rollSwap    largest per-part drawn step at the supine -> prone swap, and the natural step either side (A2b, target <= 3 px)
  holdRise    largest per-part step at the last down frame -> first gettingUp frame, plus natural (A2c, target <= 3 px)
  latch       first engage distance and flip count (A1: reported, not tuned)
"""
import json, sys, os, glob

root = sys.argv[1] if len(sys.argv) > 1 else 'research/animation/george-transfer-2026-10/g10a'
SCALES = ['1', '0.7', '0.55', '0.4']; SCEN = ['suplex', 'suplexFlip']

def seq(S):
    out = []
    for s in S:
        k = (s['sell']['name'] + ':' + (s['sell'].get('part') or '')) if s.get('sell') else ('hold' if s.get('holdActive') else s['state'])
        k += ':' + str(s['lying']) if s['state'] == 'down' else ''
        if not out or out[-1] != k: out.append(k)
    return out

rows = {}
for sc in SCEN:
    for ls in SCALES:
        p = f'{root}/ls{ls}/on/{sc}/manifest.json'
        if not os.path.exists(p): continue
        m = json.load(open(p)); S = m['samples']
        D = [s for s in S if s.get('legs') and s['legs'].get('flex')]
        pk = max(D, key=lambda s: max(s['legs']['flex'].values()))
        peak = {'near': max(s['legs']['flex']['near'] for s in D), 'far': max(s['legs']['flex']['far'] for s in D),
                'atMs': pk['rel'], 'src': pk['legs']['src']}
        # supine -> prone swap: first down frame whose lying differs from the one before
        roll = None
        for i in range(1, len(S)):
            if S[i]['state'] == 'down' and S[i-1]['state'] == 'down' and S[i]['lying'] != S[i-1]['lying'] and S[i].get('pstep') is not None:
                nat = [x['pstep'] for x in S[max(0, i-6):i+7] if x.get('pstep') is not None and x is not S[i]]
                roll = {'atMs': S[i]['rel'], 'step': S[i]['pstep'], 'part': S[i]['pstepPart'], 'naturalMax': max(nat) if nat else None,
                        'from': S[i-1]['lying'], 'to': S[i]['lying']}
                break
        # last down frame -> first gettingUp frame
        hr = None
        for i in range(1, len(S)):
            if S[i]['state'] == 'gettingUp' and S[i-1]['state'] == 'down':
                nat = [x['pstep'] for x in S[max(0, i-8):i+9] if x.get('pstep') is not None and x is not S[i]]
                hr = {'atMs': S[i]['rel'], 'step': S[i]['pstep'], 'part': S[i]['pstepPart'], 'naturalMax': max(nat) if nat else None}
                break
        lat = [(s['rel'], s['backDist']) for s in S if s.get('latch') is not None]
        flips = sum(1 for a, b in zip(lat, lat[1:]) if True) and sum(1 for i in range(1, len(S)) if S[i].get('latch') is not None and S[i-1].get('latch') is not None and S[i]['latch'] != S[i-1]['latch'])
        first = next(((s['rel'], s['backDist']) for s in S if s.get('latch') == 1), None)
        rows[f'{sc}/{ls}'] = {'plan': seq(S), 'peakFlex': peak, 'rollSwap': roll, 'holdRise': hr,
                              'latch': {'firstOnMs': first[0] if first else None, 'distAtFirstOn': first[1] if first else None, 'flips': flips},
                              'receiverFacing': m['receiverFacing'], 'events': {k: v['relImpactMs'] for k, v in m['events'].items()}}
for sc in SCEN:
    base = rows.get(f'{sc}/1')
    for ls in SCALES:
        r = rows.get(f'{sc}/{ls}')
        if r and base: r['planMatchesToday'] = r['plan'] == base['plan']
json.dump(rows, open(f'{root}/rows.json', 'w'), indent=1)
for k, r in rows.items():
    print(k, 'plan==today' if r.get('planMatchesToday') else 'PLAN MISMATCH', '|', ' > '.join(r['plan']))
    print('   peak', r['peakFlex'], '\n   roll', r['rollSwap'], '\n   holdRise', r['holdRise'], '\n   latch', r['latch'])
