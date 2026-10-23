#!/usr/bin/env python3
"""Label the four legs of a figure-four tableau still (plan T2.4 / G1).

    label_tableau.py <still.png> <trace.json> <out.png> [--crop x0,y0,x1,y1] [--scale 3]

<still.png> is a sample.mjs --strip frame (zoom 0.62, overlays hidden) and
<trace.json> the sample.mjs trace taken at the same time. Legs are found by
pose channel through the trace's lSide, so the labels follow the same names as
research/animation/figure-four-tableau/LEDGER.md: S straight (hurt) and C
crossed on the receiver, T trapping and B bracing on George. Labels sit at the
shin midpoint; the trapped ankle gets a ring. The unlabelled still is the one
that answers "does it read": this copy only says which limb is which.
"""
import json, sys
from PIL import Image, ImageDraw, ImageFont

ZOOM = 0.62
ORIGIN = (430, 555)          # editor TABLEAU_ORIGIN
SIZE = (1090, 748)           # sample.mjs canvas screenshot

args = sys.argv[1:]
opt = lambda n, d=None: args[args.index(n) + 1] if n in args else d
still, trace_path, out = args[0], args[1], args[2]
scale = int(opt('--scale', 3))
crop = [int(v) for v in opt('--crop', '0,0,%d,%d' % SIZE).split(',')]

trace = json.load(open(trace_path))
frame = trace['frames'][0]['actors']
cx, cy = ORIGIN[0] - 20, ORIGIN[1] - 190 * 0.8 / ZOOM   # camera centre used by sample.mjs clean()

def to_px(p):
    return ((p['x'] - cx) * ZOOM + SIZE[0] / 2, (p['y'] - cy) * ZOOM + SIZE[1] / 2)

def leg(role, channel):
    a = frame[role]
    l = a.get('lSide', 'near')
    side = l if channel == 'l' else ('far' if l == 'near' else 'near')
    j = a['joints']
    return j[side + 'Knee'], j[side + 'Ankle']

LEGS = [
    ('defender', 'r', 'H  hurt leg (bent, far)', (30, 150, 60)),
    ('defender', 'l', 'N  near leg (straight)', (220, 130, 20)),
    ('attacker', 'l', 'T  George near leg, across H', (40, 110, 230)),
    ('attacker', 'r', 'B  George far leg, between', (150, 60, 200)),
]

im = Image.open(still).convert('RGB').crop(crop)
im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
d = ImageDraw.Draw(im)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 15 * scale // 2)
except OSError:
    font = ImageFont.load_default()

def at(p):
    x, y = to_px(p)
    return ((x - crop[0]) * scale, (y - crop[1]) * scale)

placed = []
for i, (role, ch, text, colour) in enumerate(LEGS):
    knee, ankle = leg(role, ch)
    k, a = at(knee), at(ankle)
    mid = ((k[0] + a[0]) / 2, (k[1] + a[1]) / 2)
    d.line([k, a], fill=colour, width=scale + 1)
    # four fixed slots so labels never collide: George's above the picture
    # (T left, B right), the receiver's below (S left, C right)
    up = role == 'attacker'
    ty = 8 * scale if up else im.height - 22 * scale
    tx = (0.04 if ch == ('l' if up else 'r') else 0.52) * im.width
    d.line([mid, (tx + 20 * scale, ty + (12 * scale if up else 0))], fill=colour, width=max(1, scale // 2))
    d.text((tx, ty), text, fill=colour, font=font, stroke_width=1, stroke_fill=(0, 0, 0))
# the trap: George's near ankle where it lands across the hurt leg
_, c_ankle = leg('attacker', 'l')
x, y = at(c_ankle)
r = 7 * scale
d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255), width=max(2, scale - 1))
d.text((x + r + 4, y - r - 4 * scale), 'trap', fill=(255, 255, 255), font=font, stroke_width=1, stroke_fill=(0, 0, 0))
im.save(out, optimize=True)
print(out, im.size)
