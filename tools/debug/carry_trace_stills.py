# PLAN_GRAPPLES T4c.4g: draws the defender's pelvis path through the lift on one still per facing. Reads <root>/film.json (carryTrace in game px, shot = the
# game-px to screenshot mapping) and writes <root>/trace-<facing>.png from the frame at the top of the lift.   python3 tools/debug/carry_trace_stills.py <root>
import json, sys
from PIL import Image, ImageDraw
root = sys.argv[1]
film = json.load(open(f'{root}/film.json'))
for run in film['runs']:
    if run['kind'] != 'drop': continue
    sh, tr = run['shot'], run['carryTrace']
    top = tr[-1]['i']
    im = Image.open(f"{root}/frames/{run['id']}/s{top:04d}.jpg").convert('RGB')
    d = ImageDraw.Draw(im)
    pts = [(sh['x0'] + p['x'] * sh['kx'], sh['y0'] + p['y'] * sh['ky']) for p in tr]
    d.line(pts, fill=(255, 210, 0), width=3)
    for k, (x, y) in enumerate(pts):
        r = 5 if k in (0, len(pts) - 1) else 2
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 80, 60) if k == 0 else (60, 220, 90) if k == len(pts) - 1 else (255, 210, 0))
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    im.save(f"{root}/trace-{'left' if run['facing'] < 0 else 'right'}.png")
    print(run['id'], 'trace', len(pts), 'points')
