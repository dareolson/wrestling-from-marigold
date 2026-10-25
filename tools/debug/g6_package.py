"""G6 review package builder (PLAN_GEORGE_TRANSFER T4.1). Pattern of g4_package.py, but rows instead of config columns.

Reads a spec (rows.json) naming the film runs to show, downsizes each run's strip frames to small WebP, and writes
<out>/data.js (window.G6) for viewer.html: frame times, hand-to-back curves, near-forearm art runs, latch runs, events,
per-run numbers (from the motif_curve.mjs output next to each run), and the T3.5 summary. Re-runnable; wipes <out> first.

  python3 -I tools/debug/g6_package.py rows.json [--out research/animation/george-transfer-2026-10/g6]
                                     [--from-ms -500] [--max-w 400] [--quality 70] [--t35 path/to/motif-curves.json]

rows.json = { "views": [ { "id", "title", "blurb", "rows": [rowId, ...] } ],
              "rows": [ { "id", "label", "state": "before|after|lou", "kind": 1|2|3|null, "root": "<film root>",
                          "scenario": "suplex", "note": "..." } ] }
`root` is the aftermath_film.mjs output root (it holds on/<scenario>/manifest.json) and, when motif_curve.mjs was run on
it, motif-curve.json. The sell kind is computed here from the manifest (not trusted from the spec) and must match:
  1 last sell a back clutch, receiver stays supine   2 rolled onto his front first, prone rise   3 no back clutch last (writhe)
"""
import json, os, shutil, sys
from PIL import Image

a = sys.argv[1:]
opts = {}
for k in ('--out', '--from-ms', '--max-w', '--quality', '--t35'):
    if k in a:
        i = a.index(k)
        opts[k] = a[i + 1]
        del a[i:i + 2]
SPEC = json.load(open(a[0]))
OUT = opts.get('--out', 'research/animation/george-transfer-2026-10/g6')
FROM_MS = float(opts.get('--from-ms', -500))
MAX_W = int(opts.get('--max-w', 400))
QUALITY = int(opts.get('--quality', 70))
T35 = opts.get('--t35', 'research/animation/george-transfer-2026-10/t35/motif-curves.json')


def sell_kind(m):
    """1 supine + last sell a back clutch, 2 prone at the rise, 3 otherwise (no back clutch last)."""
    S = m['samples']
    names = []
    for s in S:
        n = (s['sell'] or {}).get('name')
        if n and (not names or names[-1] != n):
            names.append(n)
    rise = next((s for s in S if s['state'] == 'gettingUp'), None)
    if rise and rise.get('lying') == 'prone':
        return 2, names
    return (1 if names and names[-1] == 'clutch' else 3), names


def small(src, dst):
    im = Image.open(src).convert('RGB')
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=QUALITY, method=6)


shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
rows, total = {}, 0
for r in SPEC['rows']:
    sc = r['scenario']
    src = os.path.join(r['root'], 'on', sc)
    m = json.load(open(os.path.join(src, 'manifest.json')))
    kind, names = sell_kind(m)
    if r.get('kind') is not None and r['kind'] != kind:
        sys.exit(f"{r['id']}: spec says sell kind {r['kind']}, the manifest says {kind} ({names})")
    t0 = m['events']['impact']['gameMs']
    d = r['id']
    os.makedirs(os.path.join(OUT, d))
    frames = []
    for fr in m['frames']:
        rel = round(fr['gameMs'] - t0, 2)
        if rel < FROM_MS:
            continue
        name = os.path.basename(fr['file']).rsplit('.', 1)[0] + '.webp'
        small(os.path.join(src, fr['file']), os.path.join(OUT, d, name))
        frames.append([rel, f'{d}/{name}'])
    total += len(frames)
    S = m['samples']
    events_rise, events_stand = m['events']['riseStart']['relImpactMs'], m['events']['standing']['relImpactMs']
    curve = [[round(s['rel'], 2), s['backDist']] for i, s in enumerate(S)
             if s['rel'] >= FROM_MS and s.get('backDist') is not None and i % 2 == 0]
    def runs(field):
        out, last = [], object()
        for s in S:
            if s['rel'] < FROM_MS:
                continue
            v = s.get(field)
            if v != last:
                out.append([round(s['rel'], 2), v])
                last = v
        return out
    turn = next(([round(s['rel'], 1), p['facing'], s['facing']] for p, s in zip(S, S[1:])
                 if s['state'] == 'standing' and p['state'] == 'gettingUp' and p['facing'] != s['facing']), None)
    pain = next((s['pain'] for s in S if s['state'] == 'gettingUp' and s.get('pain')), None)
    # near-contact step per frame, apart from the swap frame itself (rise start -> standing + 500 ms)
    steps = [(s['rel'], ((s['nearContact']['x'] - q['nearContact']['x']) ** 2 + (s['nearContact']['y'] - q['nearContact']['y']) ** 2) ** 0.5)
             for q, s in zip(S, S[1:]) if q.get('nearContact') and s.get('nearContact') and r['state'] != 'x'
             and events_rise <= s['rel'] <= events_stand + 500]
    swap_t = events_stand
    off_swap = [d for t, d in steps if abs(t - swap_t) > 20]
    numbers = None
    mp = os.path.join(r['root'], 'motif-curve.json')
    if os.path.exists(mp):
        numbers = json.load(open(mp))['runs'].get(f'on/{sc}')
    rows[d] = dict(id=d, label=r['label'], state=r['state'], kind=kind, sells=names, scenario=sc, note=r.get('note', ''),
                   rig=m['receiver']['rig'], git=m['git'], facing=m['receiverFacing'], turnAtSwap=turn, pain=pain, stepOffSwapMax=round(max(off_swap), 2) if off_swap else None,
                   frames=frames, curve=curve, art=runs('nearForearm'), latch=runs('latch'),
                   events={k: round(v['relImpactMs'], 2) for k, v in m['events'].items()}, numbers=numbers)

t35 = json.load(open(T35)) if os.path.exists(T35) else None
with open(os.path.join(OUT, 'data.js'), 'w') as f:
    f.write('window.G6 = ' + json.dumps(dict(views=SPEC['views'], rows=rows, t35=t35, counts=SPEC.get('counts'), fromMs=FROM_MS), separators=(',', ':')) + ';\n')
size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
print(f'{len(rows)} rows, {total} frames, {OUT} = {size / 1e6:.2f} MB')
for k, v in rows.items():
    print(f"  {k}: kind {v['kind']} sells {v['sells']} frames {len(v['frames'])} facing {v['facing']} turn {v['turnAtSwap']}")
