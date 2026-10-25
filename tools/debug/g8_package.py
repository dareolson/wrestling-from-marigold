"""G8 review package builder (PLAN_GEORGE_TRANSFER T9.1, Rev 3). g7_package.py for the around-path films, plus slowed close-ups.

Reads a spec (g8-rows.json) naming the Rev 3 film runs to show, downsizes each run's strip frames to small WebP, cuts a close-up
of the hand around the two moments Rev 3 changed (the hand going behind the body, the hand coming out), and writes
<out>/data.js (window.G8) for g8-viewer.html: frame times, hand-to-back curves, the depth-swap runs, the swap table, the hand-step
windows, the forearm-inside-torso counts, the events, per-run numbers (route_metrics.py). The G7 rows the viewer compares against
are NOT copied: the viewer loads g7/data.js and g7/ frames next to it. Re-runnable; wipes <out> first.

  python3 -I tools/debug/g8_package.py rows.json [--out research/animation/george-transfer-2026-10/g8]
                                     [--from-ms -500] [--max-w 400] [--quality 70] [--close-ms 700] [--cost cost.json]

rows.json = { "views": [ { "id", "title", "blurb", "g7": "<id of the G7 row to compare>", "rows": [rowId, ...] } ],
              "rows": [ { "id", "label", "kind": 1|2|3|null, "root": "<film root>", "scenario": "suplex", "note": "..." } ] }
`root` is the aftermath_film.mjs output root (on/<scenario>/manifest.json and strip/ full-size JPEGs). The sell kind is computed from the
manifest and must match the spec.

Close-ups: for each row, around its first swap in and its last swap out, the strip frames from -close-ms to +close-ms are cropped
around the near wrist (page px from the manifest's canvasBox and each frame's clip), CROP_W x CROP_H around it, scaled 3x, written as
WebP. The viewer plays them at 1x and at 0.25x, labelled.
"""
import importlib.util, json, os, shutil, sys
from PIL import Image

a = sys.argv[1:]
opts = {}
for k in ('--out', '--from-ms', '--max-w', '--quality', '--close-ms', '--cost'):
    if k in a:
        i = a.index(k)
        opts[k] = a[i + 1]
        del a[i:i + 2]
SPEC = json.load(open(a[0]))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = opts.get('--out', 'research/animation/george-transfer-2026-10/g8')
FROM_MS = float(opts.get('--from-ms', -500))
MAX_W = int(opts.get('--max-w', 400))
QUALITY = int(opts.get('--quality', 70))
CLOSE_MS = float(opts.get('--close-ms', 700))
CROP_W, CROP_H, SCALE = 150, 110, 3

spec = importlib.util.spec_from_file_location('route_metrics', os.path.join(HERE, 'route_metrics.py'))
rm = importlib.util.module_from_spec(spec); spec.loader.exec_module(rm)


def small(src, dst):
    im = Image.open(src).convert('RGB')
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=QUALITY, method=6)


def closeup_frames(m, src, out_dir, name, around_ms):
    """Cut the hand's surroundings out of the full-size strip frames from around_ms - CLOSE_MS to around_ms + CLOSE_MS."""
    box = m['canvasBox']
    sx, sy = box['w'] / box['gw'], box['h'] / box['gh']
    by_ms = {round(s['rel'], 1): s for s in m['samples']}
    t0 = m['events']['impact']['gameMs']
    frames = []
    os.makedirs(os.path.join(out_dir, name), exist_ok=True)
    for fr in m['frames']:
        rel = round(fr['gameMs'] - t0, 2)
        if not (around_ms - CLOSE_MS <= rel <= around_ms + CLOSE_MS):
            continue
        s = by_ms.get(round(rel, 1)) or min(m['samples'], key=lambda q: abs(q['rel'] - rel))
        w = s.get('nearWristW')
        if not w or not fr.get('clip'):
            continue
        cx = box['x'] + w['x'] * sx - fr['clip'][0]     # the wrist inside the strip frame, in its pixels
        cy = box['y'] + w['y'] * sy - fr['clip'][1]
        im = Image.open(os.path.join(src, fr['file'])).convert('RGB')
        left = max(0, min(im.width - CROP_W, round(cx - CROP_W / 2)))
        top = max(0, min(im.height - CROP_H, round(cy - CROP_H / 2)))
        c = im.crop((left, top, left + CROP_W, top + CROP_H)).resize((CROP_W * SCALE, CROP_H * SCALE), Image.LANCZOS)
        fn = os.path.basename(fr['file']).rsplit('.', 1)[0] + '.webp'
        c.save(os.path.join(out_dir, name, fn), 'WEBP', quality=QUALITY, method=6)
        frames.append([rel, f'{name}/{fn}'])
    return frames


shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
rows, total = {}, 0
for r in SPEC['rows']:
    sc = r['scenario']
    src = os.path.join(r['root'], 'on', sc)
    mp = os.path.join(src, 'manifest.json')
    m = json.load(open(mp))
    metrics = rm.analyse(mp)
    if r.get('kind') is not None and r['kind'] != metrics['kind']:
        sys.exit(f"{r['id']}: spec says sell kind {r['kind']}, the manifest says {metrics['kind']} ({metrics['sells']})")
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
    curve = [[round(s['rel'], 2), s['backDist']] for i, s in enumerate(S) if s['rel'] >= FROM_MS and s.get('backDist') is not None and i % 2 == 0]
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
    swaps = metrics['swaps']
    close = {}
    ins = [x for x in swaps if x['direction'] == 'in']
    outs = [x for x in swaps if x['direction'] == 'out']
    if ins:
        close['behind'] = dict(atMs=ins[0]['ms'], frames=closeup_frames(m, src, os.path.join(OUT, d), 'close-behind', ins[0]['ms']))
    if outs:
        close['out'] = dict(atMs=outs[-1]['ms'], frames=closeup_frames(m, src, os.path.join(OUT, d), 'close-out', outs[-1]['ms']))
    for c in close.values():
        c['frames'] = [[t, f'{d}/{p}'] for t, p in c['frames']]
        total += len(c['frames'])
    rows[d] = dict(id=d, label=r['label'], kind=metrics['kind'], sells=metrics['sells'], scenario=sc, note=r.get('note', ''), rig=m['receiver']['rig'], git=m['git'],
                   facing=m['receiverFacing'], lying=m['receiverLying'], frames=frames, curve=curve, under=runs('handUnder'), latch=runs('latch'),
                   metrics=metrics, close=close, events={k: round(v['relImpactMs'], 2) for k, v in m['events'].items()})

cost = None
if opts.get('--cost') and os.path.exists(opts['--cost']):
    cost = json.load(open(opts['--cost']))
with open(os.path.join(OUT, 'data.js'), 'w') as f:
    f.write('window.G8 = ' + json.dumps(dict(views=SPEC['views'], rows=rows, cost=cost, extra=SPEC.get('extra'), fromMs=FROM_MS, closeMs=CLOSE_MS), separators=(',', ':')) + ';\n')
size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
print(f'{len(rows)} rows, {total} frames, {OUT} = {size / 1e6:.2f} MB')
for k, v in rows.items():
    print(f"  {k}: kind {v['kind']} sells {v['sells']} frames {len(v['frames'])} facing {v['facing']} swaps {[(x['direction'], x['ms']) for x in v['metrics']['swaps']]} close {[(n, len(c['frames'])) for n, c in v['close'].items()]}")
