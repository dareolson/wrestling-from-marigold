#!/usr/bin/env python3
"""G10a page builder (PLAN_GEORGE_TRANSFER T10.3). Reads the legScale films, writes
<root>/data.js (window.G10A), <root>/sheets/<run>.webp (one sprite sheet per run: frames tiled in a grid, played by CSS).

  python3 -I tools/debug/g10a_package.py [root]      root = research/animation/george-transfer-2026-10/g10a

Runs: <root>/ls<scale>/on/{suplex,suplexFlip}/ (roll -> prone clutch -> hold) and <root>/ls<scale>-up/on/suplex/ (face-up clutch, no roll).
Frames are the films' strip JPEGs (1/30 s), from -200 ms to standing + 400 ms, scaled to W x H. Re-runnable.
"""
import json, os, re, sys
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'research/animation/george-transfer-2026-10/g10a'
SCALES = ['1', '0.7', '0.55', '0.4']
RUNS = [('roll-left', 'suplex', ''), ('roll-right', 'suplexFlip', ''), ('faceup', 'suplex', '-up')]
W, H, COLS, Q = 336, 204, 12, 62

def source(sample):
    s = sample.get('legs') or {}
    src = s.get('src', '')
    return 'roll' if src.startswith('sell:roll') else 'clutch' if src.startswith('sell:clutch') else 'kick/writhe' if src.startswith('sell:') else src

def plan(S):
    out = []
    for s in S:
        k = (s['sell']['name'] + ':' + (s['sell'].get('part') or '')) if s.get('sell') else ('hold' if s.get('holdActive') else s['state'])
        if s['state'] == 'down' and not s.get('sell') and not s.get('holdActive'): k = 'down'
        if not out or out[-1] != k: out.append(k)
    return out

def metrics(m):
    S = m['samples']; D = [s for s in S if s.get('legs') and s['legs'].get('flex')]
    peaks = {}
    for s in D:
        k = source(s); f = max(s['legs']['flex']['near'], s['legs']['flex']['far'])
        if k not in peaks or f > peaks[k]['flex']: peaks[k] = {'flex': f, 'atMs': round(s['rel'])}
    near = max(s['legs']['flex']['near'] for s in D); far = max(s['legs']['flex']['far'] for s in D)
    out = {'plan': plan(S), 'peakNear': round(near, 3), 'peakFar': round(far, 3), 'peakBySource': peaks}
    # swaps: supine -> prone, last down -> first gettingUp
    out['rollSwap'] = out['holdRise'] = None
    for i in range(1, len(S)):
        a, b = S[i-1], S[i]
        if out['rollSwap'] is None and a['state'] == b['state'] == 'down' and a['lying'] != b['lying']:
            out['rollSwap'] = {'atMs': round(b['rel']), 'step': b['pstep'], 'part': b['pstepPart'], 'legStep': b.get('legStep')}
        if out['holdRise'] is None and a['state'] == 'down' and b['state'] == 'gettingUp':
            out['holdRise'] = {'atMs': round(b['rel']), 'step': b['pstep'], 'part': b['pstepPart'], 'legStep': b.get('legStep')}
    # leg parts (thigh, shin, foot) only, frames on the mat (state down, after impact); the throw before it is not this task's motion
    legs = [s['legStep'] for s in S if s.get('legStep') is not None and s['state'] == 'down' and s['rel'] >= 0]
    out['maxLegStep'] = max(legs) if legs else None
    first = next(((s['rel'], s['backDist']) for s in S if s.get('latch') == 1), None)
    out['latch'] = {'firstOnMs': round(first[0]) if first else None, 'dist': first[1] if first else None,
                    'flips': sum(1 for i in range(1, len(S)) if S[i].get('latch') is not None and S[i-1].get('latch') is not None and S[i]['latch'] != S[i-1]['latch'])}
    return out

data = {'scales': SCALES, 'runs': {}, 'size': [W, H], 'cols': COLS}
os.makedirs(f'{ROOT}/sheets', exist_ok=True)
for rid, scn, suffix in RUNS:
    data['runs'][rid] = {}
    for ls in SCALES:
        d = f'{ROOT}/ls{ls}{suffix}/on/{scn}'
        if not os.path.exists(f'{d}/manifest.json'): continue
        m = json.load(open(d + '/manifest.json')); S = m['samples']
        end = m['events']['standing']['relImpactMs'] + 400
        fr = [f for f in m['frames'] if -200 <= f['relImpactMs'] <= end]
        sheet = Image.new('RGB', (COLS * W, ((len(fr) + COLS - 1) // COLS) * H))
        t, nf, ff, src = [], [], [], []
        for i, f in enumerate(fr):
            im = Image.open(f'{d}/{f["file"]}').convert('RGB').resize((W, H), Image.LANCZOS)
            sheet.paste(im, ((i % COLS) * W, (i // COLS) * H))
            s = S[f['step']]; lg = s.get('legs') or {}
            t.append(f['relImpactMs']); src.append(source(s) if lg else '')
            nf.append(lg.get('flex', {}).get('near')); ff.append(lg.get('flex', {}).get('far'))
        name = f'{rid}-{ls}.webp'
        sheet.save(f'{ROOT}/sheets/{name}', quality=Q, method=6)
        r = metrics(m)
        r.update({'sheet': f'sheets/{name}', 'n': len(fr), 't': t, 'flexNear': nf, 'flexFar': ff, 'src': src,
                  'facing': m['receiverFacing']['atImpact'], 'events': {k: round(v['relImpactMs']) for k, v in m['events'].items()},
                  'commit': m['git']['commit'], 'dirty': m['git']['dirty']})
        data['runs'][rid][ls] = r
        print(rid, ls, len(fr), 'frames', round(os.path.getsize(f'{ROOT}/sheets/{name}') / 1e6, 2), 'MB', r['plan'])
open(f'{ROOT}/data.js', 'w').write('window.G10A = ' + json.dumps(data) + ';\n')
