#!/opt/homebrew/bin/python3
"""Deterministic internal-seam cleanup for Lou (2026-07-29), tasks 2 & 3.

Two hidden internal outlines were reading as bezels in the composite:

  * NECK COLLAR (torso.png): the torso paints a full dark outline around its
    neck stump, including the trapezius/clavicle dashes at the stump base. The
    head's neck (narrower, drawn in front) does not cover that base line, so it
    shows as a dark collar ring around the neck. The exterior neck contour is
    owned by the HEAD, so the torso's stump outline is purely internal.

  * SHOULDER PAD (upper_arm.png): the upper arm's proximal end is painted as a
    fully-outlined rounded dome. Drawn over the torso, that closed top arc reads
    as a circular shoulder pad with a doubled outline. The arm's real silhouette
    lower down (the free bicep) is kept; only the proximal dome outline is hidden.

The fix is removal-only in the OUTLINE channel: each targeted dark outline texel
is repainted with the nearest same-row SKIN texel (horizontal inpaint), so the
painted internal line disappears while every skin/overlap pixel and the alpha
mask stay intact. No silhouette-defining exterior edge is touched, no alpha is
cleared (no holes/gaps), no repaint of skin tone. Reads the pristine standardized
source and writes the shipped asset, so it is reproducible.

    /opt/homebrew/bin/python3 tools/debug/lou_seam_cleanup.py
"""
import os
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'Sprite sheets', 'AI Pilot', 'Lou',
                   'v2-layer-standardization', 'runtime-conformed', 'parts')
DST = os.path.join(ROOT, 'src/assets/wrestlers/thesz')

DARK = 95          # max(R,G,B) below this + opaque = an outline stroke texel
OPAQUE = 100       # alpha at/above this counts as solid ink


def is_dark(rgb):
    return rgb[..., :3].max(axis=-1) < DARK


def inpaint_row(px, y, x0, x1):
    """Repaint every dark-outline texel in cols [x0,x1) of row y with the
    nearest same-row opaque SKIN (non-dark) texel's RGB. Alpha untouched."""
    row = px[y]
    opaque = row[:, 3] >= OPAQUE
    dark = (row[:, :3].max(axis=1) < DARK) & opaque
    skin = opaque & ~dark
    skin_x = np.where(skin)[0]
    if len(skin_x) == 0:
        return 0
    n = 0
    for x in range(x0, min(x1, row.shape[0])):
        if not dark[x]:
            continue
        j = skin_x[np.argmin(np.abs(skin_x - x))]
        row[x, :3] = row[j, :3]
        n += 1
    return n


def clean(name, bands):
    """bands: list of (y0, y1, x0, x1) canvas windows to inpaint."""
    im = Image.open(os.path.join(SRC, f'{name}.png')).convert('RGBA')
    px = np.array(im)
    H, W = px.shape[:2]
    total = 0
    for (y0, y1, x0, x1) in bands:
        for y in range(y0, min(y1, H)):
            total += inpaint_row(px, y, x0, min(x1, W))
    Image.fromarray(px, 'RGBA').save(os.path.join(DST, f'{name}.png'))
    print(f'{name}: inpainted {total} outline texels over {len(bands)} band(s) -> {DST}/{name}.png')


# --- TORSO neck collar -------------------------------------------------------
# Neck stump + trapezius base. Cols 44..146 exclude the outer body silhouette
# (left/right shoulder edges), so only the internal stump/trap outline is hit.
clean('torso', [(0, 41, 44, 146)])


# --- TORSO neck nub: cut the top half (Derek, 2026-07-31) --------------------
# The torso paints a neck stump/nub that rises above the shoulders (rows 0..~17).
# Derek asked to cut half of it so the neck reads shorter (the visible effect is
# on the back of the neck; the front is covered by the head). Removal-only:
# zero the top ~9 rows, then round the new top edge (rows 9..11) into a dome so
# it is not a flat slice. Runs on the shipped torso.png (after the collar clean).
def cut_neck_nub():
    import math
    p = os.path.join(DST, 'torso.png')
    a = np.array(Image.open(p).convert('RGBA'))

    def ink(y):
        xs = np.where(a[y, :, 3] >= 32)[0]
        return (xs.min(), xs.max()) if len(xs) else None

    a[0:9, :, 3] = 0                       # cut the top half of the nub
    e = ink(11)
    if e:
        c = (e[0] + e[1]) / 2.0
        half = (e[1] - e[0]) / 2.0
        for y in range(9, 12):
            d = 11 - y
            allow = half * math.sqrt(max(0.0, 1 - ((d + 0.5) / 3.0) ** 2)) if d > 0 else half
            row = ink(y)
            if row:
                for x in range(row[0], row[1] + 1):
                    if a[y, x, 3] >= 32 and abs(x - c) > allow:
                        a[y, x, 3] = 0
    Image.fromarray(a, 'RGBA').save(p)
    print(f'torso: cut neck nub (rows 0-8), rounded 9-11 -> {p}')


cut_neck_nub()

# --- UPPER_ARM proximal dome -------------------------------------------------
# Rows 0..44 are the rounded proximal cap that tucks into the shoulder; wiping
# its outline lets the deltoid merge into the torso. The free-bicep silhouette
# below row 44 is left fully intact.
clean('upper_arm', [(0, 45, 0, 130)])
