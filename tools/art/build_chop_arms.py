"""Split Codex's whole-arm chop drawings (research/art/chop-far-arm-2026-11-15/) into Lou's two rig pieces.

Each drawing is cut at the elbow joint; the shoulder half becomes an upper_arm.png variant (143x330, shoulder cap at jointPivotFrac,
elbow on distalAnchorFrac), the hand half a forearm.png variant (117x351, elbow at jointPivotFrac). Each half is rotated so its bone
points down and scaled along and across its bone separately, so the rig's bone lengths and Lou's limb width hold. The halves overlap the
cut a little so the elbow stays closed.

    python3 tools/art/build_chop_arms.py <source dir> [out dir]
Points (shoulder, joint, tip) are read off the source drawings by eye; Derek judges in game.
"""
import sys, math
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/assets/wrestlers/thesz-procreate-v1'

# rig geometry (thesz_procreate_v1.js): canvas, pivot (x, y) px, and where the bone ends
UPPER = dict(size=(143, 330), top=5.0, x=0.538338 * 143, elbow=0.871414 * 330)   # top: the cap's back edge on the bone axis
FORE = dict(size=(117, 351), pivot=((0.5 - 0.012388) * 117, 0.116194 * 351), far=None, tip=345.0)

# name: (file, cap back edge on the bone axis, elbow joint, fingertip, upper width scale, forearm width scale)
ARMS = {
    'chopWindup': ('chop-windup-v1.png', (140, 225), (590, 650), (1555, 575), 0.29, 0.34),
    'chopContact': ('chop-contact-v1.png', (140, 215), (640, 600), (1665, 585), 0.29, 0.34),
    'chopFollow': ('chop-followthrough-v1.png', (110, 250), (700, 520), (1650, 400), 0.29, 0.34),
}

def unit(v):
    n = math.hypot(*v)
    return (v[0] / n, v[1] / n)


def place(img, keep, origin, axis, along, across, size, pivot):
    """Rotate/scale the kept pixels so `origin` lands on `pivot` and `axis` points down the canvas; premultiplied bicubic."""
    a = np.asarray(img, dtype=np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    a[..., 3] *= keep
    a[..., :3] *= keep[..., None]
    # canvas (x, y) -> source = origin + M @ ((x, y) - pivot); the canvas's +y is the bone axis, its +x the axis turned a quarter turn
    ax, ay = axis
    px, py = -ay, ax
    M = np.array([[px / across, ax / along], [py / across, ay / along]])
    t = np.array(origin) - M @ np.array(pivot)
    chans = []
    for c in range(4):
        im = Image.fromarray(a[..., c], mode='F')
        chans.append(np.asarray(im.transform(size, Image.AFFINE, (M[0, 0], M[0, 1], t[0], M[1, 0], M[1, 1], t[1]), Image.BICUBIC)))
    out = np.stack(chans, -1)
    al = np.clip(out[..., 3], 0, 1)
    rgb = np.where(al[..., None] > 1e-4, out[..., :3] / np.maximum(al[..., None], 1e-4), 0)
    res = np.concatenate([np.clip(rgb, 0, 1), al[..., None]], -1)
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')


def centred(img, keep, origin, axis, along, across, size, pivot, rows):
    # the drawn bone is not exactly on the axis read off by eye: slide the art across the bone until its width centres on the pivot
    for _ in range(3):
        out = place(img, keep, origin, axis, along, across, size, pivot)
        cols = np.where((np.asarray(out)[rows[0]:rows[1], :, 3] > 128).any(0))[0]
        if len(cols) == 0:
            break
        pivot = (pivot[0] + pivot_x_target(pivot, size) - (cols.min() + cols.max()) / 2, pivot[1])
    return place(img, keep, origin, axis, along, across, size, pivot)


def pivot_x_target(pivot, size):
    return UPPER['x'] if size == UPPER['size'] else FORE['pivot'][0]


for name, (f, S, J, T, cu, cf) in ARMS.items():
    img = Image.open(f'{SRC}/{f}').convert('RGBA')
    w, h = img.size
    u, fo = unit((J[0] - S[0], J[1] - S[1])), unit((T[0] - J[0], T[1] - J[1]))
    d = unit((u[0] + fo[0], u[1] + fo[1]))
    yy, xx = np.mgrid[0:h, 0:w]
    side = (xx - J[0]) * d[0] + (yy - J[1]) * d[1]
    lenU, lenF = math.hypot(J[0] - S[0], J[1] - S[1]), math.hypot(T[0] - J[0], T[1] - J[1])
    mU, mF = 0.12 * lenU, 0.14 * lenF
    up = centred(img, (side <= mU).astype(np.float32), S, u, (UPPER['elbow'] - UPPER['top']) / lenU, cu, UPPER['size'], (UPPER['x'], UPPER['top']), (100, 250))
    fa = centred(img, (side >= -mF).astype(np.float32), J, fo, (FORE['tip'] - FORE['pivot'][1]) / lenF, cf, FORE['size'], FORE['pivot'], (120, 260))
    up.save(f'{OUT}/upper_arm_{name}.png')
    fa.save(f'{OUT}/forearm_{name}.png')
    print(name, 'upper bbox', up.getbbox(), 'forearm bbox', fa.getbbox())
