"""G4 review package builder (PLAN_SUPLEX_RISE T5.1).

Reads the film manifests written by tools/debug/aftermath_film.mjs (untracked strips + tracked
manifests), downsizes the strip frames and event close-ups to <= 480 px wide WebP (q80) under
research/animation/suplex-rise-2026-10/g4/, and writes g4/data.js for viewer.html (frame times,
events, hand-to-back curves, the measured numbers). Re-runnable; wipes g4/ first.

  python3 -I tools/debug/g4_package.py [root] [fromMs]

root defaults to research/animation/suplex-rise-2026-10, fromMs (impact-relative) to -500.
"""
import json, os, shutil, sys
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'research/animation/suplex-rise-2026-10'
FROM_MS = float(sys.argv[2]) if len(sys.argv) > 2 else -500.0
MAX_W = 480
CONFIGS = ['aft', 'on', 'off']
SCENARIOS = ['suplexReverse', 'suplexReverseFlip']  # Lou receives; facing -1 / +1
OUT = os.path.join(ROOT, 'g4')


def load(path):
    with open(path) as f:
        return json.load(f)


def small(src, dst):
    im = Image.open(src).convert('RGB')
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=80, method=6)


shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
runs, total_frames = {}, 0
for cfg in CONFIGS:
    for sc in SCENARIOS:
        src = os.path.join(ROOT, cfg, sc)
        m = load(os.path.join(src, 'manifest.json'))
        t0 = m['events']['impact']['gameMs']
        key = f'{cfg}/{sc}'
        d = f'{cfg}-{sc}'
        os.makedirs(os.path.join(OUT, d, 'closeups'))
        frames = []
        for fr in m['frames']:
            rel = round(fr['gameMs'] - t0, 2)
            if rel < FROM_MS:
                continue
            name = os.path.basename(fr['file']).rsplit('.', 1)[0] + '.webp'
            small(os.path.join(src, fr['file']), os.path.join(OUT, d, name))
            frames.append([rel, f'{d}/{name}'])
        total_frames += len(frames)
        closeups = {}
        for ev in m['events']:
            p = os.path.join(src, 'closeups', ev + '.png')
            if os.path.exists(p):
                small(p, os.path.join(OUT, d, 'closeups', ev + '.webp'))
                closeups[ev] = f'{d}/closeups/{ev}.webp'
        samples = m['samples']
        curve = [[round(s['rel'], 2), s['backDist']] for i, s in enumerate(samples)
                 if s['rel'] >= FROM_MS and s.get('backDist') is not None and i % 2 == 0]
        tex, last = [], None
        for s in samples:
            if s['rel'] < FROM_MS:
                continue
            if s['nearForearm'] != last:
                tex.append([round(s['rel'], 2), s['nearForearm']])
                last = s['nearForearm']
        runs[key] = dict(dir=d, config=cfg, scenario=sc, facing=m['receiverFacing']['atImpact'], git=m['git'],
                         urlFlags=m['urlFlags'], frames=frames, closeups=closeups, curve=curve, art=tex,
                         events={k: round(v['relImpactMs'], 2) for k, v in m['events'].items()})

numbers = {}
for tag, fname in (('t43', 'motif-curve-t43.json'), ('t47', 'motif-curve-t47.json')):
    p = os.path.join(ROOT, fname)
    if os.path.exists(p):
        numbers[tag] = {k: dict(windows=v['windows'], events=v['events'], handoffSpan=v.get('handoffSpan'),
                                git=v['git'], standingArrivalMs=v['standingArrivalMs'], holdMotion=v['holdMotion'])
                        for k, v in load(p)['runs'].items()}
p = os.path.join(ROOT, 'rise-end-arm.json')
if os.path.exists(p):
    numbers['riseEndArm'] = load(p)
p = os.path.join(ROOT, 'hand-art-check-aft-on.json')
if os.path.exists(p):
    numbers['r1'] = load(p)
with open(os.path.join(OUT, 'data.js'), 'w') as f:
    f.write('window.G4 = ' + json.dumps(dict(runs=runs, numbers=numbers, fromMs=FROM_MS, configs=CONFIGS,
                                              scenarios=SCENARIOS), separators=(',', ':')) + ';\n')
size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
print(f'{total_frames} frames, g4/ = {size / 1e6:.2f} MB')
